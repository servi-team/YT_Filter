/**
 * PIN karma testleri (saf modül: src/core/pin.js).
 * Karma biçimi, sabit tuzla belirlilik, eski düz metin uyumu ve güvenli varsayılanlar.
 */
const test = require('node:test');
const assert = require('node:assert');
const pin = require('../src/core/pin.js');

const DUZ_TUZ = 'AAAAAAAAAAAAAAAAAAAAAA=='; // 16 sıfır bayt (base64)

test('pin: karma biçimi, doğrulama ve sabit tuzla belirlilik', async () => {
    const karma = await pin.pinKarmala('2468', { tuz: DUZ_TUZ, iterasyon: 1000 });
    assert.match(karma, /^pbkdf2-sha256\$1000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    assert.ok(pin.pinKarmaliMi(karma));

    assert.strictEqual(await pin.pinDogrulaGirdi('2468', karma), true);
    assert.strictEqual(await pin.pinDogrulaGirdi('2469', karma), false);

    const tekrar = await pin.pinKarmala('2468', { tuz: DUZ_TUZ, iterasyon: 1000 });
    assert.strictEqual(tekrar, karma);

    const rastgele = await pin.pinKarmala('2468', { iterasyon: 1000 });
    assert.notStrictEqual(rastgele, karma); // rastgele tuz farklı çıktı üretir
});

test('pin: eski düz metin kayıt okunur ama karma sayılmaz', async () => {
    assert.strictEqual(pin.pinKarmaliMi('2468'), false);
    assert.strictEqual(pin.pinDuzMetinMi('2468'), true);
    assert.strictEqual(pin.pinDuzMetinMi(''), false);
    assert.strictEqual(pin.pinDuzMetinMi(null), false);
    assert.strictEqual(await pin.pinDogrulaGirdi('2468', '2468'), true);
    assert.strictEqual(await pin.pinDogrulaGirdi('1111', '2468'), false);
});

test('pin: kayıt yoksa kilit yok; bozuk kayıt güvenli tarafta kalır', async () => {
    assert.strictEqual(await pin.pinDogrulaGirdi('', null), true);
    assert.strictEqual(await pin.pinDogrulaGirdi('1234', ''), true); // '' -> kilit yok
    assert.strictEqual(pin.pinKarmaliMi('pbkdf2-sha256$bozuk'), false);
    assert.strictEqual(pin.pinKarmaliMi('pbkdf2-sha256$1000$AAAA$BBBB$extra'), false);
    assert.strictEqual(await pin.pinDogrulaGirdi('1234', 'sha1$deadbeef'), false); // bilinmeyen biçim doğrulanmaz
});
