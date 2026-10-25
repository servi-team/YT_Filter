const test = require('node:test');
const assert = require('node:assert/strict');
const { kararVer, varsayilanFiltreAyarlari, eskiVeriyiTasi } = require('../src/filtre_motoru.js');

const vt = {
    konular: ['teknoloji', 'haber', 'muzik', 'eglence', 'spor', 'oyun'].map(id => ({ id, ad: id })),
    etiketler: ['kufur', 'argo', 'ai', 'siddet'].map(id => ({ id, ad: id })),
    videolar: {
        // Tasarım notlarındaki oylama örneğinin sonucu
        ornekVideo1: {
            anaKonu: 'teknoloji',
            yanKonular: ['oyun', 'haber'],
            kararsizKonular: ['eglence'],
            etiketler: ['ai', 'argo'],
            kararsizEtiketler: ['kufur']
        },
        kararsizSpor: { anaKonu: 'muzik', yanKonular: [], kararsizKonular: ['spor'], etiketler: ['ai'], kararsizEtiketler: [] },
        sadeceEtiket: { anaKonu: null, yanKonular: [], kararsizKonular: [], etiketler: ['ai'], kararsizEtiketler: [] },
        etiketsiz: { anaKonu: 'teknoloji', yanKonular: [], kararsizKonular: [], etiketler: [], kararsizEtiketler: [] }
    },
    kanallar: {
        '@sporkanali': { anaKonu: 'spor', yanKonular: [], kararsizKonular: [], etiketler: [], kararsizEtiketler: [] },
        '@siddetkanali': { anaKonu: 'oyun', yanKonular: [], kararsizKonular: [], etiketler: ['siddet'], kararsizEtiketler: [] }
    }
};

// Varsayılan ayarlar üzerinde değişiklik yaparak test ayarı üretir
function ayar(degisiklik = {}) {
    const f = varsayilanFiltreAyarlari(vt);
    Object.keys(f.etiketler).forEach(id => { f.etiketler[id].filtrele = false; });
    if (degisiklik.mod) f.mod = degisiklik.mod;
    if (degisiklik.kanalKontrol !== undefined) f.kanalKontrol = degisiklik.kanalKontrol;
    Object.assign(f.orta, degisiklik.orta || {});
    (degisiklik.engelliKonular || []).forEach(id => { f.konular[id].filtrele = true; });
    (degisiklik.engelliEtiketler || []).forEach(id => { f.etiketler[id].filtrele = true; });
    Object.entries(degisiklik.bicimler || {}).forEach(([id, bicim]) => {
        (f.konular[id] || f.etiketler[id]).bicim = bicim;
    });
    return f;
}

test('varsayılan ayarlar: orta mod, konular açık, etiketler filtrelenir', () => {
    const f = varsayilanFiltreAyarlari(vt);
    assert.equal(f.mod, 'orta');
    assert.equal(f.kanalKontrol, true);
    assert.equal(f.konular.teknoloji.filtrele, false);
    assert.equal(f.etiketler.kufur.filtrele, true);
});

test('beyaz liste her şeyden önce gelir, kara listeyle çakışınca kazanır', () => {
    const f = ayar({ engelliEtiketler: ['ai'] });
    const listeler = { beyaz: ['ornekvideo1'], kara: ['ornekvideo1'] };
    assert.equal(kararVer({ videoId: 'ornekVideo1' }, vt, f, listeler).sonuc, 'izin');
});

test('kara liste engeller, varsayılan biçimi kullanır', () => {
    const f = ayar();
    f.varsayilanBicim = 'uyari';
    const sonuc = kararVer({ videoId: 'x', kanal: '@SporKanali' }, vt, f, { kara: ['@sporkanali'] });
    assert.deepEqual([sonuc.sonuc, sonuc.bicim, sonuc.sebep], ['engel', 'uyari', 'kara-liste']);
});

test('her zaman kuralı: engellenen geçerli etiket her modda engeller', () => {
    for (const mod of ['serbest', 'orta', 'kati']) {
        const sonuc = kararVer({ videoId: 'ornekVideo1' }, vt, ayar({ mod, engelliEtiketler: ['argo'] }));
        assert.equal(sonuc.sonuc, 'engel', mod);
        assert.equal(sonuc.sebep, 'etiket', mod);
    }
});

test('serbest: kararsız küfür engelli olsa da video açılır', () => {
    const sonuc = kararVer({ videoId: 'ornekVideo1' }, vt, ayar({ mod: 'serbest', engelliEtiketler: ['kufur'] }));
    assert.equal(sonuc.sonuc, 'izin');
});

test('serbest: ana konu engelli ama kararsız spor izinliyse açılır', () => {
    const sonuc = kararVer({ videoId: 'kararsizSpor' }, vt, ayar({ mod: 'serbest', engelliKonular: ['muzik'] }));
    assert.equal(sonuc.sonuc, 'izin');
});

test('serbest: konuların hiçbiri izinli değilse engellenir', () => {
    const sonuc = kararVer({ videoId: 'kararsizSpor' }, vt, ayar({ mod: 'serbest', engelliKonular: ['muzik', 'spor'] }));
    assert.equal(sonuc.sonuc, 'engel');
});

test('serbest: konusu bilinmeyen içerik açılır', () => {
    const sonuc = kararVer({ videoId: 'yok' }, vt, ayar({ mod: 'serbest', engelliKonular: ['teknoloji'] }));
    assert.equal(sonuc.sonuc, 'izin');
});

test('orta: yalnızca ana konuya bakılır', () => {
    const f = ayar({ engelliKonular: ['oyun', 'haber'] });
    assert.equal(kararVer({ videoId: 'ornekVideo1' }, vt, f).sonuc, 'izin');
    f.konular.teknoloji.filtrele = true;
    const sonuc = kararVer({ videoId: 'ornekVideo1' }, vt, f);
    assert.deepEqual([sonuc.sonuc, sonuc.sebep], ['engel', 'ana-konu']);
});

test('orta: bilinmeyen konu ve etiket ayarları', () => {
    assert.equal(kararVer({ videoId: 'yok' }, vt, ayar()).sonuc, 'izin');
    assert.equal(kararVer({ videoId: 'yok' }, vt, ayar({ orta: { bilinmeyenKonu: 'engel' } })).sebep, 'bilinmeyen-konu');
    assert.equal(kararVer({ videoId: 'etiketsiz' }, vt, ayar({ orta: { bilinmeyenEtiket: 'engel' } })).sebep, 'bilinmeyen-etiket');
    assert.equal(kararVer({ videoId: 'sadeceEtiket' }, vt, ayar({ orta: { bilinmeyenEtiket: 'engel' } })).sonuc, 'izin');
});

test('orta: kararsız ayarları yalnızca engellenen başlıklar için devreye girer', () => {
    const kararsizEtiketEngel = ayar({ engelliEtiketler: ['kufur'], orta: { kararsizEtiket: 'engel' } });
    assert.equal(kararVer({ videoId: 'ornekVideo1' }, vt, kararsizEtiketEngel).sebep, 'kararsiz-etiket');
    assert.equal(kararVer({ videoId: 'ornekVideo1' }, vt, ayar({ orta: { kararsizEtiket: 'engel' } })).sonuc, 'izin');
    assert.equal(kararVer({ videoId: 'ornekVideo1' }, vt, ayar({ engelliEtiketler: ['kufur'] })).sonuc, 'izin');

    const kararsizKonuEngel = ayar({ engelliKonular: ['eglence'], orta: { kararsizKonu: 'engel' } });
    assert.equal(kararVer({ videoId: 'ornekVideo1' }, vt, kararsizKonuEngel).sebep, 'kararsiz-konu');
});

test('katı: herhangi bir konu engelliyse engellenir', () => {
    const sonuc = kararVer({ videoId: 'ornekVideo1' }, vt, ayar({ mod: 'kati', engelliKonular: ['eglence'] }));
    assert.deepEqual([sonuc.sonuc, sonuc.sebep], ['engel', 'konu']);
    assert.equal(kararVer({ videoId: 'ornekVideo1' }, vt, ayar({ mod: 'kati' })).sonuc, 'izin');
});

test('katı: kararsız etiket engelliyse engellenir', () => {
    const sonuc = kararVer({ videoId: 'ornekVideo1' }, vt, ayar({ mod: 'kati', engelliEtiketler: ['kufur'] }));
    assert.deepEqual([sonuc.sonuc, sonuc.sebep], ['engel', 'kararsiz-etiket']);
});

test('katı: bilinmeyen konu veya etiket engellenir', () => {
    assert.equal(kararVer({ videoId: 'yok' }, vt, ayar({ mod: 'kati' })).sebep, 'bilinmeyen-konu');
    assert.equal(kararVer({ videoId: 'etiketsiz' }, vt, ayar({ mod: 'kati' })).sebep, 'bilinmeyen-etiket');
});

test('video verisi yoksa kanala bakılır, video verisi varsa bakılmaz', () => {
    const f = ayar({ engelliKonular: ['spor'] });
    const kanaldan = kararVer({ videoId: 'yok', kanal: '@SporKanali' }, vt, f);
    assert.deepEqual([kanaldan.sonuc, kanaldan.kaynak], ['engel', 'kanal']);

    const videodan = kararVer({ videoId: 'ornekVideo1', kanal: '@sporkanali' }, vt, f);
    assert.deepEqual([videodan.sonuc, videodan.kaynak], ['izin', 'video']);
});

test('kanal kontrol kapalıysa kanala bakılmaz', () => {
    const f = ayar({ engelliEtiketler: ['siddet'], kanalKontrol: false });
    const sonuc = kararVer({ videoId: 'yok', kanal: '@siddetkanali' }, vt, f);
    assert.deepEqual([sonuc.sonuc, sonuc.kaynak], ['izin', null]);
});

test('birden fazla engelde en sert biçim uygulanır', () => {
    const f = ayar({
        engelliEtiketler: ['ai', 'argo'],
        bicimler: { ai: 'bulaniklastir', argo: 'uyari' }
    });
    assert.equal(kararVer({ videoId: 'ornekVideo1' }, vt, f).bicim, 'uyari');
    f.etiketler.ai.bicim = 'gizle';
    assert.equal(kararVer({ videoId: 'ornekVideo1' }, vt, f).bicim, 'gizle');
});

test('v1 verisi beyaz/kara listeye taşınır', () => {
    const f = varsayilanFiltreAyarlari(vt);
    const preferences = {
        safe: { enforcement: 'Allow Video' },
        violence: { enforcement: 'Remove Video Entirely' },
        profanity: { enforcement: 'Blur Thumbnail' },
        untagged: { enforcement: 'Remove Video Entirely' }
    };
    const customMapping = { '@guvenli': 'safe', '@kotu': 'violence', 'abcdefghijk': 'profanity', '@silinmis': 'yok' };
    const sonuc = eskiVeriyiTasi(customMapping, preferences, f);
    assert.deepEqual(sonuc.beyaz, ['@guvenli']);
    assert.deepEqual(sonuc.kara, ['@kotu', 'abcdefghijk', '@silinmis']);
    assert.equal(f.orta.bilinmeyenKonu, 'engel');
});
