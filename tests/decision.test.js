const test = require('node:test');
const assert = require('node:assert');
const T = require('../src/core/taxonomy.js');
const { kararVer } = require('../src/core/decision.js');

// Yardımcılar
function ayarOlustur(mod, { konular = {}, etiketler = {}, etiketlenmemis = 'engelle', listeler } = {}) {
    const a = T.varsayilanAyar();
    a.mod = mod;
    a.etiketlenmemis = etiketlenmemis;
    Object.assign(a.konular, konular);
    Object.assign(a.etiketler, etiketler);
    if (listeler) Object.assign(a.listeler, listeler);
    return a;
}
const kayit = (anaKonu, yanKonular = [], etiketler = []) => ({ anaKonu, yanKonular, etiketler });
const video = (id, k) => ({ id, kayit: k || null });
const kanal = (id, handle, k) => ({ id, handle, kayit: k || null });
const sonuc = (ayar, v, k) => kararVer(ayar, v, k).karar;

// Özetteki örnek videolar
const A = video('aaaaaaaaaaa', kayit('teknoloji', ['egitici', 'eglence', 'oyun'], []));
const B = video('bbbbbbbbbbb', kayit('din', [], []));
const C = video('ccccccccccc', kayit('oyun', ['eglence'], ['kufur', 'argo', 'olumsuz-ornek']));
const BOS_KANAL = kanal('UC' + 'x'.repeat(22), '@bos', null);

test('kayıt doğrulama: ana konu zorunlu, tek, bilinen konu', () => {
    assert.deepStrictEqual(T.kayitDogrula(kayit('teknoloji', ['egitici'], [])), []);
    assert.ok(T.kayitDogrula({ yanKonular: ['egitici'] }).length > 0, 'ana konu yoksa hata');
    assert.ok(T.kayitDogrula(kayit('yok-boyle-konu')).length > 0, 'bilinmeyen konu');
    assert.ok(T.kayitDogrula(kayit('oyun', ['oyun'])).length > 0, 'ana konu yan konuda tekrar');
    assert.ok(T.kayitDogrula(kayit('oyun', [], ['yok'])).length > 0, 'bilinmeyen etiket');
});

test('KATI: engelli konu veya engelli etiket varsa engeller', () => {
    const a = ayarOlustur('kati', { konular: { teknoloji: 'engelli' } });
    assert.strictEqual(sonuc(a, A, BOS_KANAL), 'engelle', 'A: ana konu engelli');
    assert.strictEqual(sonuc(a, B, BOS_KANAL), 'ac', 'B: din izinli, etiket yok');
    assert.strictEqual(sonuc(a, C, BOS_KANAL), 'engelle', 'C: küfür/argo/olumsuz etiketleri engelli');
});

test('KATI: yan konu engelliyse de engeller', () => {
    const a = ayarOlustur('kati', { konular: { oyun: 'engelli' } });
    assert.strictEqual(sonuc(a, A, BOS_KANAL), 'engelle', 'A: yan konu oyun engelli');
});

test('KATI: kanalın etiketi videoyu engeller', () => {
    const a = ayarOlustur('kati');
    const k = kanal('UC' + 'y'.repeat(22), '@bahis', kayit('spor', [], ['kumar']));
    assert.strictEqual(sonuc(a, B, k), 'engelle');
});

test('SERBEST: herhangi bir konu izinliyse açar, engelli etiket varsa engeller', () => {
    // teknoloji engelli ama A'nın başka izinli konuları var
    const a = ayarOlustur('serbest', { konular: { teknoloji: 'engelli' } });
    assert.strictEqual(sonuc(a, A, BOS_KANAL), 'ac');
    // C: konular izinli ama etiketler engelli
    assert.strictEqual(sonuc(a, C, BOS_KANAL), 'engelle');
    // kullanıcı bu etiketlere izin verirse açılır
    const b = ayarOlustur('serbest', { etiketler: { kufur: 'izinli', argo: 'izinli', 'olumsuz-ornek': 'izinli' } });
    assert.strictEqual(sonuc(b, C, BOS_KANAL), 'ac');
});

test('SERBEST: hiçbir konusu izinli değilse açmaz', () => {
    const konular = {};
    T.KONULAR.forEach(k => { konular[k.id] = 'engelli'; });
    const a = ayarOlustur('serbest', { konular });
    assert.strictEqual(sonuc(a, B, BOS_KANAL), 'engelle');
});

test('SERBEST: video incelenmemişse kanal etiketlerine bakılır', () => {
    const a = ayarOlustur('serbest');
    const kotuKanal = kanal('UC' + 'k'.repeat(22), '@kotu', kayit('eglence', [], ['siddet']));
    const iyiKanal = kanal('UC' + 'i'.repeat(22), '@iyi', kayit('eglence', [], []));
    const incelenmemisVideo = video('ddddddddddd', null);
    assert.strictEqual(sonuc(a, incelenmemisVideo, kotuKanal), 'engelle');
    assert.strictEqual(sonuc(a, incelenmemisVideo, iyiKanal), 'ac');
});

test('SERBEST: kullanıcı şiddete izin veriyorsa şiddet etiketli kanal engellenmez', () => {
    const a = ayarOlustur('serbest', { etiketler: { siddet: 'izinli' } });
    const k = kanal('UC' + 'k'.repeat(22), '@dovus', kayit('spor', [], ['siddet']));
    assert.strictEqual(sonuc(a, video('eeeeeeeeeee', null), k), 'ac');
});

test('ORTA: yalnızca ana konuya bakar', () => {
    // A'nın ana konusu teknoloji engelli; yan konular izinli olsa da orta mod engeller
    const a = ayarOlustur('orta', { konular: { teknoloji: 'engelli' } });
    assert.strictEqual(sonuc(a, A, BOS_KANAL), 'engelle');
    // aynı ayarla serbest modda açılırdı (fark bu)
    assert.strictEqual(sonuc({ ...a, mod: 'serbest' }, A, BOS_KANAL), 'ac');
});

test('ORTA: kanal ana konusu izinliyse ve video etiketi yoksa açar; kanal etiketleri yok sayılır', () => {
    const a = ayarOlustur('orta', { konular: { teknoloji: 'engelli' } });
    const k = kanal('UC' + 'z'.repeat(22), '@iyi', kayit('bilim', [], ['kumar'])); // kanal etiketi engelli ama video incelenmiş
    assert.strictEqual(sonuc(a, A, k), 'ac');
});

test('ORTA: video incelenmemişse kanal etiketi engelliyse engeller', () => {
    const a = ayarOlustur('orta');
    const k = kanal('UC' + 'z'.repeat(22), '@kotu', kayit('bilim', [], ['kumar']));
    assert.strictEqual(sonuc(a, video('fffffffffff', null), k), 'engelle');
});

test('ORTA: video incelenmemişse kanalın ana konusu da izinli olmalı (varsayım)', () => {
    const a = ayarOlustur('orta', { konular: { oyun: 'engelli' } });
    const k = kanal('UC' + 'z'.repeat(22), '@oyun', kayit('oyun', [], []));
    assert.strictEqual(sonuc(a, video('fffffffffff', null), k), 'engelle');
});

test('ETİKETLENMEMİŞ: ne video ne kanal incelenmişse ayara göre', () => {
    const v = video('ggggggggggg', null);
    assert.strictEqual(sonuc(ayarOlustur('orta', { etiketlenmemis: 'ac' }), v, BOS_KANAL), 'ac');
    assert.strictEqual(sonuc(ayarOlustur('orta', { etiketlenmemis: 'engelle' }), v, BOS_KANAL), 'engelle');
    assert.strictEqual(sonuc(ayarOlustur('orta', { etiketlenmemis: null }), v, BOS_KANAL), 'engelle', 'seçilmemişse engelle');
});

test('LİSTELER: beyaz liste her şeyi geçer, kara liste her şeyi engeller', () => {
    const beyaz = ayarOlustur('kati', { listeler: { beyaz: { '@bos': true }, kara: {}, ozel: [] } });
    assert.strictEqual(sonuc(beyaz, C, BOS_KANAL), 'ac', 'beyaz listedeki kanal, engelli etiketli videoyu açar');
    const kara = ayarOlustur('serbest', { listeler: { beyaz: {}, kara: { [A.id]: true }, ozel: [] } });
    assert.strictEqual(sonuc(kara, A, BOS_KANAL), 'engelle', 'kara listedeki video modu geçersiz kılar');
});

test('LİSTELER: video düzeyi kanal düzeyini yener; aynı düzeyde beyaz kazanır', () => {
    // Kanal beyaz, video kara -> engelle
    const a = ayarOlustur('serbest', { listeler: { beyaz: { '@bos': true }, kara: { [A.id]: true }, ozel: [] } });
    assert.strictEqual(sonuc(a, A, BOS_KANAL), 'engelle');
    // Kanal kara, video beyaz -> aç
    const b = ayarOlustur('serbest', { listeler: { beyaz: { [A.id]: true }, kara: { '@bos': true }, ozel: [] } });
    assert.strictEqual(sonuc(b, A, BOS_KANAL), 'ac');
    // Aynı kanal hem beyaz hem kara -> beyaz
    const c = ayarOlustur('serbest', { listeler: { beyaz: { '@bos': true }, kara: { '@bos': true }, ozel: [] } });
    assert.strictEqual(sonuc(c, A, BOS_KANAL), 'ac');
});

test('LİSTELER: anahtarlar büyük/küçük harf duyarsız, kanal ID ile de eşleşir', () => {
    const k = kanal('UCabcdefghijklmnopqrstuv', '@Mixed.Case', null);
    const a = ayarOlustur('orta', { listeler: { beyaz: {}, kara: { '@mixed.case': true }, ozel: [] } });
    assert.strictEqual(sonuc(a, B, k), 'engelle');
    const b = ayarOlustur('orta', { listeler: { beyaz: {}, kara: { 'ucabcdefghijklmnopqrstuv': true }, ozel: [] } });
    assert.strictEqual(sonuc(b, B, k), 'engelle', 'handle yok olsa da ID ile eşleşir');
});

test('LİSTELER: özel liste engelle/izinver eylemi', () => {
    const ozel = [{ ad: 'Okul listesi', eylem: 'izinver', uyeler: { '@bos': true } }, { ad: 'Dikkat dağıtıcı', eylem: 'engelle', uyeler: { [B.id]: true } }];
    const a = ayarOlustur('kati', { listeler: { beyaz: {}, kara: {}, ozel } });
    assert.strictEqual(sonuc(a, C, BOS_KANAL), 'ac', 'izinver listesindeki kanal');
    assert.strictEqual(sonuc(a, B, kanal('UC' + 'q'.repeat(22), '@baska', null)), 'engelle', 'engelle listesindeki video');
});

test('SEBEPLER: banner için sebep listesi döner', () => {
    const a = ayarOlustur('kati', { konular: { oyun: 'engelli' } });
    const r = kararVer(a, C, BOS_KANAL);
    assert.strictEqual(r.karar, 'engelle');
    assert.ok(r.sebepler.some(s => s.tur === 'konu' && s.id === 'oyun'));
    assert.ok(r.sebepler.some(s => s.tur === 'etiket' && s.id === 'kufur'));
    const l = kararVer(ayarOlustur('orta', { listeler: { beyaz: {}, kara: { '@bos': true }, ozel: [] } }), B, BOS_KANAL);
    assert.deepStrictEqual(l.sebepler, [{ tur: 'liste', liste: 'kara', kaynak: 'kanal' }]);
});

test('Eksik ayar/kayıt alanlarında çökmez', () => {
    assert.doesNotThrow(() => kararVer({}, {}, {}));
    assert.doesNotThrow(() => kararVer(undefined, undefined, undefined));
    assert.strictEqual(kararVer({}, {}, {}).karar, 'engelle');
});

test('liste araması nesnenin yerleşik özelliklerine takılmaz (constructor, __proto__)', () => {
    const a = ayarOlustur('serbest');
    const sahte = video('constructor', kayit('oyun', [], []));   // 11 harf: geçerli bir video id biçimi
    assert.strictEqual(sonuc(a, sahte, BOS_KANAL), 'ac', 'listede olmayan id beyaz/kara sayılmamalı');
    const k = kanal('UC' + 'p'.repeat(22), '@toString', kayit('oyun', [], []));
    assert.strictEqual(sonuc(a, B, k), 'ac');
});
