const test = require('node:test');
const assert = require('node:assert');
const { migrate } = require('../src/core/migrate.js');

test('safe/educational -> beyaz liste, violence/profanity -> kara liste (eyleme göre)', () => {
    const yama = migrate({
        customMapping: { '@iyi': 'safe', 'vid11111111': 'educational', '@kotu': 'violence', '@argo': 'profanity' },
        preferences: {
            safe: { enforcement: 'Allow Video' }, educational: { enforcement: 'Allow Video' },
            violence: { enforcement: 'Remove Video Entirely' }, profanity: { enforcement: 'Blur Thumbnail' },
            untagged: { enforcement: 'Remove Video Entirely' }
        }
    });
    assert.strictEqual(yama.surum, 2);
    assert.deepStrictEqual(Object.keys(yama.ayar.listeler.beyaz).sort(), ['@iyi', 'vid11111111']);
    assert.deepStrictEqual(Object.keys(yama.ayar.listeler.kara).sort(), ['@argo', '@kotu']);
    assert.strictEqual(yama.ayar.etiketlenmemis, 'engelle');
    assert.strictEqual(yama.ayar.engelEylemi, 'kaldir');
});

test('izin verilen şiddet etiketi beyaz listeye gider', () => {
    const yama = migrate({ customMapping: { '@dovus': 'violence' }, preferences: { violence: { enforcement: 'Allow Video' }, untagged: { enforcement: 'Allow Video' } } });
    assert.ok(yama.ayar.listeler.beyaz['@dovus']);
    assert.strictEqual(yama.ayar.etiketlenmemis, 'ac');
});

test('özel kategori -> özel liste', () => {
    const yama = migrate({
        customMapping: { '@kanal1': 'ders kanalları' },
        preferences: { 'ders kanalları': { enforcement: 'Allow Video', adi: 'Ders Kanalları' }, untagged: { enforcement: 'Remove Video Entirely' } }
    });
    assert.strictEqual(yama.ayar.listeler.ozel.length, 1);
    assert.deepStrictEqual(yama.ayar.listeler.ozel[0], { ad: 'Ders Kanalları', eylem: 'izinver', uyeler: { '@kanal1': true } });
});

test('yalnızca bulanıklaştırma varsa engelEylemi bulaniklastir', () => {
    const yama = migrate({ customMapping: { '@x': 'violence' }, preferences: { violence: { enforcement: 'Blur Thumbnail' }, untagged: { enforcement: 'Blur Thumbnail' } } });
    assert.strictEqual(yama.ayar.engelEylemi, 'bulaniklastir');
});

test('eski veri yedeklenir, yeni modeldeyse null döner, boş veride çökmez', () => {
    const eski = { customMapping: { '@a': 'safe' }, preferences: {} };
    assert.deepStrictEqual(migrate(eski).eskiYedek.customMapping, { '@a': 'safe' });
    assert.strictEqual(migrate({ surum: 2 }), null);
    assert.doesNotThrow(() => migrate({}));
    assert.doesNotThrow(() => migrate(undefined));
});

test('rozet: hepsi "Hide Badge" ise rozetGoster false, biri bile Show ise true', () => {
    const gizli = migrate({ customMapping: { '@a': 'safe' }, preferences: { safe: { visibility: 'Hide Badge', enforcement: 'Allow Video' }, untagged: { visibility: 'Hide Badge', enforcement: 'Remove Video Entirely' } } });
    assert.strictEqual(gizli.ayar.rozetGoster, false);
    const karisik = migrate({ customMapping: { '@a': 'safe' }, preferences: { safe: { visibility: 'Show Badge', enforcement: 'Allow Video' }, untagged: { visibility: 'Hide Badge', enforcement: 'Remove Video Entirely' } } });
    assert.strictEqual(karisik.ayar.rozetGoster, true);
    assert.strictEqual(migrate({}).ayar.rozetGoster, true, 'tercih yoksa varsayılan gösterilir');
});
