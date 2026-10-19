const test = require('node:test');
const assert = require('node:assert');
const T = require('../src/core/taxonomy.js');
const { ayarCoz, icerikKarari, rozetBilgisi } = require('../src/core/engine.js');
const { dbKur } = require('../src/core/db.js');

const BOS_DB = dbKur(null);
const KID = 'UC' + 'a'.repeat(22);

// --- Eski veri modeli ile uyumluluk (arayüz henüz eski veriyi yazıyor) ---
const ESKI = {
    customMapping: {
        'vid_violence1': 'violence',
        '@guvenli': 'safe',
        '@egitim': 'educational',
        '@argo': 'profanity',
        '@okulkanali': 'okul kanalları',
        'vid_okul0001': 'okul kanalları'
    },
    preferences: {
        safe: { visibility: 'Show Badge', enforcement: 'Allow Video' },
        educational: { visibility: 'Show Badge', enforcement: 'Allow Video' },
        violence: { visibility: 'Show Badge', enforcement: 'Remove Video Entirely' },
        profanity: { visibility: 'Show Badge', enforcement: 'Blur Thumbnail' },
        untagged: { visibility: 'Show Badge', enforcement: 'Remove Video Entirely' },
        'okul kanalları': { visibility: 'Show Badge', enforcement: 'Allow Video', adi: 'Okul Kanalları' }
    }
};

function eskiyle(videoId, handle) {
    const ayar = ayarCoz(ESKI);
    return icerikKarari(ayar, BOS_DB, { videoId, handle });
}

test('uyumluluk: eski depo -> eskisiyle aynı kararlar', () => {
    assert.strictEqual(eskiyle('vid_violence1', '@baska').karar, 'engelle', 'engelli etiketli video');
    assert.strictEqual(eskiyle('rastgele001', '@guvenli').karar, 'ac', 'güvenli kanal');
    assert.strictEqual(eskiyle('rastgele001', '@egitim').karar, 'ac', 'eğitici kanal');
    assert.strictEqual(eskiyle('rastgele001', '@argo').karar, 'engelle', 'argo kanal');
    assert.strictEqual(eskiyle('rastgele001', '@bilinmeyen').karar, 'engelle', 'etiketlenmemiş -> Tamamen Kaldır');
    assert.strictEqual(eskiyle('rastgele001', '@okulkanali').karar, 'ac', 'özel kategori izin');
});

test('uyumluluk: video etiketi kanal etiketini yener (eskisi gibi)', () => {
    assert.strictEqual(eskiyle('vid_violence1', '@guvenli').karar, 'engelle', 'video violence, kanal safe');
    assert.strictEqual(eskiyle('vid_okul0001', '@argo').karar, 'ac', 'video okul (izin), kanal argo');
});

test('uyumluluk: etiketlenmemiş "İzin Ver" ise bilinmeyenler açılır; rozet adları', () => {
    const eski = JSON.parse(JSON.stringify(ESKI));
    eski.preferences.untagged.enforcement = 'Allow Video';
    const ayar = ayarCoz(eski);
    const r = icerikKarari(ayar, BOS_DB, { videoId: 'x1234567890', handle: '@bilinmeyen' });
    assert.strictEqual(r.karar, 'ac');
    assert.deepStrictEqual(rozetBilgisi(r, ayar), { metin: 'Etiketlenmemiş', sinif: 'untagged' });
    const g = icerikKarari(ayar, BOS_DB, { videoId: 'x1234567890', handle: '@guvenli' });
    assert.deepStrictEqual(rozetBilgisi(g, ayar), { metin: 'Beyaz liste', sinif: 'safe' });
    const o = icerikKarari(ayar, BOS_DB, { videoId: 'x1234567890', handle: '@okulkanali' });
    assert.deepStrictEqual(rozetBilgisi(o, ayar), { metin: 'Okul Kanalları', renkAnahtari: 'Okul Kanalları' });
    const k = icerikKarari(ayar, BOS_DB, { videoId: 'vid_violence1', handle: null });
    assert.deepStrictEqual(rozetBilgisi(k, ayar), { metin: 'Kara liste', sinif: 'warning' });
});

test('uyumluluk: boş depo (ilk kurulum öncesi) çökmez, bilinmeyen içerik engellenir', () => {
    assert.strictEqual(icerikKarari(ayarCoz({}), BOS_DB, { videoId: 'x1234567890', handle: '@a' }).karar, 'engelle');
    assert.strictEqual(icerikKarari(ayarCoz(undefined), BOS_DB, {}).karar, 'engelle');
});

test('engelEylemi: yalnızca bulanıklaştırma varsa bulaniklastir döner', () => {
    const eski = { customMapping: { '@x': 'profanity' }, preferences: { profanity: { enforcement: 'Blur Thumbnail' }, untagged: { enforcement: 'Blur Thumbnail' } } };
    const r = icerikKarari(ayarCoz(eski), BOS_DB, { videoId: 'x1234567890', handle: '@x' });
    assert.strictEqual(r.karar, 'engelle');
    assert.strictEqual(r.engelEylemi, 'bulaniklastir');
});

test('rozet: tüm etiketlerde "Hide Badge" ise rozet kapanır', () => {
    const eski = JSON.parse(JSON.stringify(ESKI));
    Object.values(eski.preferences).forEach(p => { p.visibility = 'Hide Badge'; });
    const ayar = ayarCoz(eski);
    const r = icerikKarari(ayar, BOS_DB, { videoId: 'x1234567890', handle: '@guvenli' });
    assert.strictEqual(rozetBilgisi(r, ayar), null);
});

// --- Yeni model + veritabanı ---
const DB = dbKur({
    sema: 1, veriSurumu: 1,
    kanallar: [
        { id: KID, handle: '@trtspor', ad: 'TRT Spor', anaKonu: 'spor', yanKonular: [], etiketler: [] },
        { id: 'UC' + 'b'.repeat(22), handle: '@kumarkanal', anaKonu: 'finans', yanKonular: [], etiketler: ['kumar'] }
    ],
    videolar: [{ id: 'vidoyun0001', anaKonu: 'oyun', yanKonular: ['eglence'], etiketler: ['kufur'] }]
});

function yeni(ayarKismi) {
    return ayarCoz({ surum: 2, ayar: ayarKismi });
}

test('yeni model: eksik alanlar varsayılanla dolar', () => {
    const a = yeni({ mod: 'kati', konular: { spor: 'engelli' } });
    assert.strictEqual(a.mod, 'kati');
    assert.strictEqual(a.konular.spor, 'kaldir', 'eski "engelli" genel eyleme (kaldir) çevrilir');
    assert.strictEqual(a.konular.oyun, 'izinli');
    // PR 5: varsayılan etiket değeri artık 'kaldir' (eski: 'engelli')
    assert.strictEqual(a.etiketler.kufur, 'kaldir');
    assert.deepStrictEqual(a.listeler, { beyaz: {}, kara: {}, ozel: [] });
    assert.strictEqual(a.rozetGoster, true);
});

test('PR5: etiket 3 durumlu — bulaniklastir ve kaldir desteklenir', () => {
    const { ayarTemizle } = require('../src/core/taxonomy.js');
    const a = ayarTemizle({ mod: 'orta', etiketler: { kufur: 'bulaniklastir', siddet: 'kaldir', argo: 'izinli' } });
    assert.strictEqual(a.etiketler.kufur, 'bulaniklastir');
    assert.strictEqual(a.etiketler.siddet, 'kaldir');
    assert.strictEqual(a.etiketler.argo, 'izinli');
    // Belirtilmeyenler varsayılan 'kaldir'
    assert.strictEqual(a.etiketler.kumar, 'kaldir');
});

test('PR5: eski "engelli" değeri genel engelEylemi\'ne göre çevrilir', () => {
    const { ayarTemizle } = require('../src/core/taxonomy.js');
    // engelEylemi='kaldir' iken 'engelli' → 'kaldir'
    const a1 = ayarTemizle({ engelEylemi: 'kaldir', etiketler: { kufur: 'engelli' } });
    assert.strictEqual(a1.etiketler.kufur, 'kaldir');
    // engelEylemi='bulaniklastir' iken 'engelli' → 'bulaniklastir'
    const a2 = ayarTemizle({ engelEylemi: 'bulaniklastir', etiketler: { kufur: 'engelli' } });
    assert.strictEqual(a2.etiketler.kufur, 'bulaniklastir');
});

test('veritabanı: kayıtlı kanalın konusu engelliyse (katı) kanalın videoları engellenir, rozet konuyu söyler', () => {
    const a = yeni({ mod: 'kati', konular: { spor: 'engelli' }, etiketlenmemis: 'ac' });
    const r = icerikKarari(a, DB, { videoId: 'rastgele001', handle: '@trtspor' });
    assert.strictEqual(r.karar, 'engelle');
    assert.deepStrictEqual(rozetBilgisi(r, a), { metin: 'Spor', sinif: 'warning' });
});

test('veritabanı: kanal ID ile eşleşir (handle yokken), ID anahtarlı beyaz liste handle ile gelen karta uygulanır', () => {
    const a = yeni({ mod: 'kati', konular: { spor: 'engelli' }, listeler: { beyaz: { [KID.toLowerCase()]: true }, kara: {}, ozel: [] } });
    // Ekrandan yalnızca handle geldi; veritabanı handle -> ID eşlemesini tamamlar
    assert.strictEqual(icerikKarari(a, DB, { videoId: 'rastgele001', handle: '@trtspor' }).karar, 'ac');
    // Ekrandan yalnızca ID geldi
    assert.strictEqual(icerikKarari(a, DB, { videoId: 'rastgele001', channelId: KID }).karar, 'ac');
});

test('veritabanı: incelenmiş izinli içerikte rozet ana konuyu gösterir', () => {
    const a = yeni({ mod: 'orta', etiketler: { kufur: 'izinli' } });
    const r = icerikKarari(a, DB, { videoId: 'vidoyun0001', handle: '@bilinmeyen' });
    assert.strictEqual(r.karar, 'ac');
    assert.deepStrictEqual(rozetBilgisi(r, a), { metin: 'Oyun', sinif: 'educational' });
});

test('veritabanı: incelenmiş videoda engelli etiket -> engelle, rozet etiket adını söyler', () => {
    const a = yeni({ mod: 'serbest' });
    const r = icerikKarari(a, DB, { videoId: 'vidoyun0001', handle: '@trtspor' });
    assert.strictEqual(r.karar, 'engelle');
    assert.deepStrictEqual(rozetBilgisi(r, a), { metin: 'Küfürlü içerik', sinif: 'profanity' });
});

test('veritabanı: video incelenmemiş, kanal etiketi engelli -> serbest modda engelle', () => {
    const a = yeni({ mod: 'serbest' });
    assert.strictEqual(icerikKarari(a, DB, { videoId: 'rastgele001', handle: '@kumarkanal' }).karar, 'engelle');
});

// --- ayarTemizle (içe aktarılan / depodan gelen ayarın doğrulanması) ---
test('ayarTemizle: bozuk girdide bile geçerli varsayılan ayar döner', () => {
    [null, undefined, 5, 'x', [], { mod: 'sacma', konular: 7, etiketler: [], listeler: 'x' }].forEach(g => {
        const a = T.ayarTemizle(g);
        assert.strictEqual(a.mod, 'orta');
        assert.strictEqual(a.etiketlenmemis, null);
        assert.strictEqual(Object.keys(a.konular).length, T.KONULAR.length);
        assert.deepStrictEqual(a.listeler, { beyaz: {}, kara: {}, ozel: [] });
    });
});

test('ayarTemizle: bilinmeyen konu/etiket ve geçersiz değerler atılır, anahtarlar küçük harfe çevrilir', () => {
    const a = T.ayarTemizle({
        mod: 'kati', etiketlenmemis: 'ac', engelEylemi: 'bulaniklastir', rozetGoster: false,
        konular: { spor: 'engelli', yok: 'engelli', oyun: 'belki' },
        etiketler: { kufur: 'izinli', uydurma: 'izinli' },
        listeler: { beyaz: { '@IYI': true, '@kotu': 'evet' }, kara: { abc: true }, ozel: [] }
    });
    assert.strictEqual(a.mod, 'kati');
    assert.strictEqual(a.konular.spor, 'bulaniklastir', 'eski "engelli" genel eyleme çevrilir');
    assert.strictEqual(a.konular.oyun, 'izinli', 'geçersiz değer varsayılana döner');
    assert.ok(!('yok' in a.konular));
    assert.strictEqual(a.etiketler.kufur, 'izinli');
    assert.ok(!('uydurma' in a.etiketler));
    assert.deepStrictEqual(a.listeler.beyaz, { '@iyi': true });
    assert.deepStrictEqual(a.listeler.kara, { abc: true });
    assert.strictEqual(a.rozetGoster, false);
    assert.strictEqual(a.engelEylemi, 'bulaniklastir');
});

test('ayarTemizle: özel listeler — rezerve ve yinelenen adlar elenir, ad kırpılır, eylem doğrulanır', () => {
    const a = T.ayarTemizle({ listeler: { ozel: [
        { ad: ' Okul ', eylem: 'izinver', uyeler: { '@A': true } },
        { ad: 'okul', eylem: 'engelle', uyeler: {} },          // yinelenen ad (büyük/küçük harf duyarsız)
        { ad: 'Beyaz Liste', eylem: 'izinver', uyeler: {} },   // rezerve ad
        { ad: 'x'.repeat(80), eylem: 'garip', uyeler: null },
        { ad: 5 }, null
    ] } });
    assert.strictEqual(a.listeler.ozel.length, 2);
    assert.deepStrictEqual(a.listeler.ozel[0], { ad: 'Okul', eylem: 'izinver', uyeler: { '@a': true } });
    assert.strictEqual(a.listeler.ozel[1].ad.length, 40);
    assert.strictEqual(a.listeler.ozel[1].eylem, 'engelle', 'bilinmeyen eylem güvenli tarafa (engelle) döner');
});

test('ayarTemizle: __proto__ anahtarı nesneyi kirletmez', () => {
    const kotu = JSON.parse('{"listeler":{"beyaz":{"__proto__":true,"constructor":true}}}');
    const a = T.ayarTemizle(kotu);
    assert.strictEqual({}.polluted, undefined);
    assert.strictEqual(icerikKarari(a, BOS_DB, { videoId: 'x1234567890', handle: '@a' }).karar, 'engelle', 'etiketlenmemis null -> engelle');
});

test('db.anahtarBul: küçük harfli liste anahtarından kanal adı bulunur', () => {
    assert.strictEqual(DB.anahtarBul(KID.toLowerCase()).ad, 'TRT Spor');
    assert.strictEqual(DB.anahtarBul('@TRTSPOR').ad, 'TRT Spor');
    assert.strictEqual(DB.anahtarBul('@yok'), null);
    assert.strictEqual(DB.anahtarBul(null), null);
});

test('ayarTemizle: liste adı karşılaştırması Türkçe büyük/küçük harfe duyarlı (I/ı, İ/i)', () => {
    const a = T.ayarTemizle({ listeler: { ozel: [
        { ad: 'Ders kanalları', eylem: 'izinver', uyeler: {} },
        { ad: 'DERS KANALLARI', eylem: 'engelle', uyeler: {} },   // aynı ad: yinelenen
        { ad: 'KARA LİSTE', eylem: 'engelle', uyeler: {} },       // rezerve ad
        { ad: 'Beyaz LISTE'.replace('LISTE', 'Liste'), eylem: 'engelle', uyeler: {} }
    ] } });
    assert.deepStrictEqual(a.listeler.ozel.map(l => l.ad), ['Ders kanalları']);
});
