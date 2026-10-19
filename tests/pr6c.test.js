const test = require('node:test');
const assert = require('node:assert');
const T = require('../src/core/taxonomy.js');
const { icerikKarari, sebepMetni, kararOzeti, istisnaSayisi, ISTISNA_UYARI_ESIGI } = require('../src/core/engine.js');
const { dbKur } = require('../src/core/db.js');

const BOS_DB = dbKur(null);

test('sebepMetni: konu, etiket, liste ve bilinmeyen okunur yazılır', () => {
    assert.strictEqual(sebepMetni({ tur: 'liste', liste: 'kara', kaynak: 'video' }), 'Kara listede (video)');
    assert.strictEqual(sebepMetni({ tur: 'etiket', id: 'kufur', kaynak: 'video' }), 'Etiket: Küfürlü içerik (video)');
    assert.strictEqual(sebepMetni({ tur: 'konu', id: 'oyun', kaynak: 'kanal' }), 'Engelli konu: Oyun (kanal)');
    assert.strictEqual(sebepMetni({ tur: 'etiketlenmemis' }), 'Bilinmeyen içerik (veritabanında kaydı yok)');
    assert.strictEqual(sebepMetni({ tur: 'kararsiz-etiket', id: 'siddet', kaynak: 'video' }), 'Etiket (kararsız): Şiddet (video)');
});

test('kararOzeti: engellenen ve açık sayfa metinleri', () => {
    const ayar = T.varsayilanAyar();
    ayar.listeler.kara['aaaaaaaaaaa'] = true;
    const engel = icerikKarari(ayar, BOS_DB, { videoId: 'aaaaaaaaaaa' });
    const ozet = kararOzeti(engel);
    assert.strictEqual(ozet.etiket, 'ENGELLENİYOR');
    assert.strictEqual(ozet.engelleniyor, true);
    assert.match(ozet.sebep, /Kara listede/);

    ayar.listeler.kara = {};
    ayar.listeler.beyaz['aaaaaaaaaaa'] = true;
    const ac = icerikKarari(ayar, BOS_DB, { videoId: 'aaaaaaaaaaa' });
    const acOzet = kararOzeti(ac);
    assert.strictEqual(acOzet.etiket, 'AÇIK');
    assert.strictEqual(acOzet.engelleniyor, false);
    assert.match(acOzet.sebep, /Beyaz listede/);
});

test('istisnaSayisi: eşik 50, özel listeler dahildir', () => {
    assert.strictEqual(ISTISNA_UYARI_ESIGI, 50);
    const ayar = T.varsayilanAyar();
    assert.strictEqual(istisnaSayisi(ayar), 0);
    ayar.listeler.beyaz['@a'] = true;
    ayar.listeler.kara['bbbbbbbbbbb'] = true;
    ayar.listeler.ozel.push({ ad: 'Okul', eylem: 'izinver', uyeler: { '@x': true, '@y': true } });
    assert.strictEqual(istisnaSayisi(ayar), 4);
    for (let i = 0; i < 50; i++) ayar.listeler.kara['v' + String(i).padStart(10, '0')] = true;
    assert.ok(istisnaSayisi(ayar) >= ISTISNA_UYARI_ESIGI);
});
