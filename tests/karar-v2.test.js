// Sistem tasarım dökümanındaki (docs/SISTEM_TASARIMI.md) kuralların testleri.
const test = require('node:test');
const assert = require('node:assert');
const T = require('../src/core/taxonomy.js');
const D = require('../src/core/decision.js');
const DB = require('../src/core/db.js');
const E = require('../src/core/engine.js');

const KID = 'UC' + 'a'.repeat(22), VID = 'AAAAAAAAAAA';

function kur({ mod = 'orta', video, kanal, ayar: duzelt, bilinmeyen = 'ac' } = {}) {
    const a = T.ayarTemizle(null);
    a.mod = mod; a.etiketlenmemis = bilinmeyen;
    if (duzelt) duzelt(a);
    const db = DB.dbKur({ sema: 1, veriSurumu: 1,
        kanallar: kanal ? [{ id: KID, handle: '@k', ...kanal }] : [],
        videolar: video ? [{ id: VID, ...video }] : [] });
    return E.icerikKarari(a, db, { videoId: VID, handle: '@k', channelId: KID });
}
const oyunEngelli = a => { a.konular.oyun = 'engelli'; };
const sporEngelli = a => { a.konular.spor = 'engelli'; };

test('KAYNAK: video verisi varsa kanal hiç değerlendirilmez (Serbest/Orta)', () => {
    for (const mod of ['serbest', 'orta']) {
        const s = kur({ mod, video: { anaKonu: 'oyun' }, kanal: { anaKonu: 'bilim' }, ayar: oyunEngelli });
        assert.strictEqual(s.karar, 'engelle', mod);
        assert.deepStrictEqual(s.sebepler.map(x => x.tur), ['izinli-konu-yok']);
        assert.strictEqual(s.sebepler[0].kaynak, 'video');
    }
});

test('KAYNAK: Katı modda video temizse kanaldaki engelli konu/etiket yok sayılır', () => {
    assert.strictEqual(kur({ mod: 'kati', video: { anaKonu: 'bilim' }, kanal: { anaKonu: 'spor' }, ayar: sporEngelli }).karar, 'ac');
    assert.strictEqual(kur({ mod: 'kati', video: { anaKonu: 'bilim' }, kanal: { anaKonu: 'bilim', etiketler: ['kufur'] } }).karar, 'ac');
});

test('KAYNAK: video verisi yoksa kanala bakılır (her modda)', () => {
    for (const mod of ['serbest', 'orta', 'kati']) {
        assert.strictEqual(kur({ mod, kanal: { anaKonu: 'spor' }, ayar: sporEngelli }).karar, 'engelle', mod);
        assert.strictEqual(kur({ mod, kanal: { anaKonu: 'bilim' } }).karar, 'ac', mod);
        const e = kur({ mod, kanal: { anaKonu: 'bilim', etiketler: ['kufur'] } });
        assert.strictEqual(e.karar, 'engelle', mod);
        assert.strictEqual(e.sebepler[0].kaynak, 'kanal');
    }
});

test('KANAL KONTROL: kapalıysa kanal verisi yok sayılır ve içerik bilinmeyen olur', () => {
    const kapat = a => { a.kanalKontrol = false; };
    const ac = kur({ kanal: { anaKonu: 'spor' }, ayar: a => { kapat(a); sporEngelli(a); }, bilinmeyen: 'ac' });
    assert.strictEqual(ac.karar, 'ac');
    assert.strictEqual(ac.sebepler[0].tur, 'etiketlenmemis');
    const eng = kur({ kanal: { anaKonu: 'bilim' }, ayar: kapat, bilinmeyen: 'engelle' });
    assert.strictEqual(eng.karar, 'engelle');
    assert.strictEqual(eng.sebepler[0].tur, 'etiketlenmemis');
});

test('KANAL KONTROL: kapalıyken video verisi yine kullanılır', () => {
    const s = kur({ video: { anaKonu: 'oyun' }, kanal: { anaKonu: 'bilim' }, ayar: a => { a.kanalKontrol = false; oyunEngelli(a); } });
    assert.strictEqual(s.karar, 'engelle');
});

test('ETİKET: engellenen kesin etiket her modda engeller, konu izinli olsa bile', () => {
    for (const mod of ['serbest', 'orta', 'kati']) {
        const s = kur({ mod, video: { anaKonu: 'bilim', etiketler: ['kufur'] } });
        assert.strictEqual(s.karar, 'engelle', mod);
        assert.strictEqual(s.sebepler[0].tur, 'etiket');
    }
});

test('ETİKET: izin verilen etiket engellemez', () => {
    assert.strictEqual(kur({ video: { anaKonu: 'bilim', etiketler: ['siddet'] }, ayar: a => { a.etiketler.siddet = 'izinli'; } }).karar, 'ac');
});

test('SERBEST: herhangi bir konu izinliyse açılır (yan konu dahil)', () => {
    assert.strictEqual(kur({ mod: 'serbest', video: { anaKonu: 'oyun', yanKonular: ['bilim'] }, ayar: oyunEngelli }).karar, 'ac');
});

test('ORTA: yalnızca ana konuya bakılır', () => {
    assert.strictEqual(kur({ mod: 'orta', video: { anaKonu: 'oyun', yanKonular: ['bilim'] }, ayar: oyunEngelli }).karar, 'engelle');
    assert.strictEqual(kur({ mod: 'orta', video: { anaKonu: 'bilim', yanKonular: ['oyun'] }, ayar: oyunEngelli }).karar, 'ac');
});

test('KATI: herhangi bir (ana veya yan) konu engelliyse engeller', () => {
    const s = kur({ mod: 'kati', video: { anaKonu: 'bilim', yanKonular: ['oyun'] }, ayar: oyunEngelli });
    assert.strictEqual(s.karar, 'engelle');
    assert.deepStrictEqual(s.sebepler.map(x => x.tur + ':' + x.id), ['konu:oyun']);
});

test('KARARSIZ / SERBEST: kararsız etiket engelli olsa da izin verilir (dökümandaki örnek 1)', () => {
    assert.strictEqual(kur({ mod: 'serbest', video: { anaKonu: 'bilim', kararsizEtiketler: ['kufur'] } }).karar, 'ac');
});

test('KARARSIZ / SERBEST: kararsız konu kullanıcı lehine izinli sayılır (örnek 2 ve ardından gelen kural)', () => {
    assert.strictEqual(kur({ mod: 'serbest', video: { anaKonu: 'bilim', kararsizKonular: ['spor'] }, ayar: sporEngelli }).karar, 'ac');
    // ana konu engelli + kararsız konu var -> Serbest'te lehine izin
    assert.strictEqual(kur({ mod: 'serbest', video: { anaKonu: 'oyun', kararsizKonular: ['spor'] }, ayar: oyunEngelli }).karar, 'ac');
});

test('KARARSIZ / ORTA: varsayılan izinver; engelle seçilirse kullanıcının engellediği kararsız etiket/konu engeller', () => {
    const v = { anaKonu: 'bilim', kararsizEtiketler: ['kufur'], kararsizKonular: ['spor'] };
    assert.strictEqual(kur({ mod: 'orta', video: v, ayar: sporEngelli }).karar, 'ac');
    const e = kur({ mod: 'orta', video: v, ayar: a => { a.kararsiz = 'engelle'; sporEngelli(a); } });
    assert.strictEqual(e.karar, 'engelle');
    assert.deepStrictEqual(e.sebepler.map(x => x.tur).sort(), ['kararsiz-etiket', 'kararsiz-konu']);
});

test('KARARSIZ / ORTA engelle: kullanıcının ENGELLEMEDİĞİ kararsız etiket engellemez', () => {
    const s = kur({ mod: 'orta', video: { anaKonu: 'bilim', kararsizEtiketler: ['ai'] }, ayar: a => { a.kararsiz = 'engelle'; a.etiketler.ai = 'izinli'; } });
    assert.strictEqual(s.karar, 'ac');
});

test('KARARSIZ / KATI: kullanıcının engellediği kararsız konu/etiket engeller', () => {
    assert.strictEqual(kur({ mod: 'kati', video: { anaKonu: 'bilim', kararsizEtiketler: ['kufur'] } }).karar, 'engelle');
    assert.strictEqual(kur({ mod: 'kati', video: { anaKonu: 'bilim', kararsizKonular: ['spor'] }, ayar: sporEngelli }).karar, 'engelle');
    assert.strictEqual(kur({ mod: 'kati', video: { anaKonu: 'bilim', kararsizKonular: ['spor'] } }).karar, 'ac');
});

test('KARARSIZ: yalnızca kararsız verisi olan video incelenmiş sayılır, kanala bakılmaz', () => {
    const s = kur({ mod: 'orta', video: { kararsizKonular: ['spor'] }, kanal: { anaKonu: 'oyun' }, ayar: oyunEngelli });
    assert.strictEqual(s.karar, 'ac');
});

test('ANA KONUSUZ KAYIT: yalnızca etiketi olan kayıt incelenmiş sayılır, kesin etiket engeller', () => {
    const s = kur({ mod: 'orta', video: { etiketler: ['kufur'] }, bilinmeyen: 'ac' });
    assert.strictEqual(s.karar, 'engelle');
    assert.strictEqual(s.sebepler[0].tur, 'etiket');
    assert.strictEqual(kur({ mod: 'orta', video: { etiketler: ['ai'] }, ayar: a => { a.etiketler.ai = 'izinli'; } }).karar, 'ac');
});

test('BİLİNMEYEN: kayıt yoksa etiketlenmemis ayarı; null ise engelle', () => {
    assert.strictEqual(kur({ bilinmeyen: 'ac' }).karar, 'ac');
    assert.strictEqual(kur({ bilinmeyen: 'engelle' }).karar, 'engelle');
    assert.strictEqual(kur({ bilinmeyen: null }).karar, 'engelle');
});

test('LİSTE: istisna her zaman konu/etiketi geçer; video düzeyi kanal düzeyini yener', () => {
    const s = kur({ mod: 'kati', video: { anaKonu: 'oyun', etiketler: ['kufur'] }, ayar: a => { oyunEngelli(a); a.listeler.beyaz[VID.toLowerCase()] = true; } });
    assert.strictEqual(s.karar, 'ac');
    const k = kur({ video: { anaKonu: 'bilim' }, ayar: a => { a.listeler.kara['@k'] = true; a.listeler.beyaz[VID.toLowerCase()] = true; } });
    assert.strictEqual(k.karar, 'ac');
});

// ---- Eylem çözümleme (engine) ----
test('EYLEM: konu başına eylem kullanılır; en sert sebep kazanır (kaldir > uyari > bulaniklastir)', () => {
    const s = kur({ mod: 'kati', video: { anaKonu: 'spor', etiketler: ['kufur'] }, ayar: a => { a.konular.spor = 'bulaniklastir'; a.etiketler.kufur = 'kaldir'; } });
    assert.strictEqual(s.engelEylemi, 'kaldir');
    const u = kur({ mod: 'kati', video: { anaKonu: 'spor', etiketler: ['kufur'] }, ayar: a => { a.konular.spor = 'bulaniklastir'; a.etiketler.kufur = 'uyari'; } });
    assert.strictEqual(u.engelEylemi, 'uyari');
    const b = kur({ mod: 'kati', video: { anaKonu: 'spor' }, ayar: a => { a.konular.spor = 'bulaniklastir'; } });
    assert.strictEqual(b.engelEylemi, 'bulaniklastir');
});

test('EYLEM: liste ve etiketlenmemiş engelleri genel engelEylemi\'ni kullanır', () => {
    const s = kur({ bilinmeyen: 'engelle', ayar: a => { a.engelEylemi = 'uyari'; } });
    assert.strictEqual(s.engelEylemi, 'uyari');
});

test('EYLEM: kararsız etiket kendi etiketinin eylemini kullanır', () => {
    const s = kur({ mod: 'kati', video: { anaKonu: 'bilim', kararsizEtiketler: ['kufur'] }, ayar: a => { a.etiketler.kufur = 'bulaniklastir'; } });
    assert.strictEqual(s.engelEylemi, 'bulaniklastir');
});

// ---- Ayar doğrulama / geçiş ----
test('AYAR: eski "engelli" konu/etiket değeri genel eyleme çevrilir', () => {
    const a = T.ayarTemizle({ engelEylemi: 'bulaniklastir', konular: { oyun: 'engelli', spor: 'izinli' }, etiketler: { kufur: 'engelli' } });
    assert.strictEqual(a.konular.oyun, 'bulaniklastir');
    assert.strictEqual(a.konular.spor, 'izinli');
    assert.strictEqual(a.etiketler.kufur, 'bulaniklastir');
});

test('AYAR: yeni alanlar varsayılanla gelir, bozuk değer atılır', () => {
    const v = T.ayarTemizle(null);
    assert.strictEqual(v.kanalKontrol, true);
    assert.strictEqual(v.kararsiz, 'izinver');
    const b = T.ayarTemizle({ kanalKontrol: 'hayır', kararsiz: 'belki', engelEylemi: 'patlat', konular: { oyun: 'x' } });
    assert.strictEqual(b.kanalKontrol, true);
    assert.strictEqual(b.kararsiz, 'izinver');
    assert.strictEqual(b.engelEylemi, 'kaldir');
    assert.strictEqual(b.konular.oyun, 'izinli');
    assert.strictEqual(T.ayarTemizle({ kanalKontrol: false, kararsiz: 'engelle', engelEylemi: 'uyari' }).engelEylemi, 'uyari');
});

test('AYAR: eski kullanıcının eski "engelli" ayarı yeni modelde aynı sonucu verir', () => {
    const ayar = T.ayarTemizle({ mod: 'kati', konular: { oyun: 'engelli' }, etiketlenmemis: 'ac' });
    const r = D.kararVer(ayar, { id: VID, kayit: { anaKonu: 'oyun' } }, {});
    assert.strictEqual(r.karar, 'engelle');
});

// ---- Kayıt doğrulama / veritabanı ----
test('KAYIT: ana konusuz ama etiketli ya da kararsızlı kayıt geçerli; boş kayıt, ana konusuz yan konu geçersiz', () => {
    assert.deepStrictEqual(T.kayitDogrula({ etiketler: ['kufur'] }), []);
    assert.deepStrictEqual(T.kayitDogrula({ kararsizKonular: ['spor'] }), []);
    assert.ok(T.kayitDogrula({}).length);
    assert.ok(T.kayitDogrula({ yanKonular: ['oyun'] }).length);
    assert.ok(T.kayitDogrula({ anaKonu: 'oyun', kararsizKonular: ['oyun'] }).length, 'hem kesin hem kararsız');
    assert.ok(T.kayitDogrula({ anaKonu: 'oyun', etiketler: ['kufur'], kararsizEtiketler: ['kufur'] }).length);
    assert.ok(T.kayitDogrula({ anaKonu: 'yok' }).length);
});

test('DB: kararsız alanları indekslenir; geçersiz kayıt atlanır', () => {
    const db = DB.dbKur({ sema: 1, veriSurumu: 3, videolar: [
        { id: VID, anaKonu: 'bilim', kararsizEtiketler: ['kufur'] },
        { id: 'BBBBBBBBBBB', yanKonular: ['oyun'] }
    ], kanallar: [] });
    assert.strictEqual(db.sayac.video, 1);
    assert.strictEqual(db.sayac.atlanan, 1);
    assert.deepStrictEqual(db.videoBul(VID).kararsizEtiketler, ['kufur']);
    assert.deepStrictEqual(db.videoBul(VID).kararsizKonular, []);
});

test('ROZET: kararsız sebepler okunur metin üretir', () => {
    const a = T.ayarTemizle(null);
    const r = E.rozetBilgisi({ sebepler: [{ tur: 'kararsiz-etiket', id: 'kufur' }] }, a);
    assert.match(r.metin, /kararsız/);
});
