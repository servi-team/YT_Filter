const test = require('node:test');
const assert = require('node:assert');
const kilit = require('../src/core/kilit.js');
const pin = require('../src/core/pin.js');

test('kilit: PIN yoksa veya iptal edilmişse kilit gerekmez', () => {
  assert.equal(kilit.kilitGerekli({}), false);
  assert.equal(kilit.kilitGerekli({ pinKodu: '' }), false);
  assert.equal(kilit.kilitGerekli({ pinKodu: 'x' }), true);
  assert.equal(kilit.kilitGerekli({ pinKodu: 'x', ayarlar: { pinIptal: true } }), false);
});

test('kilit: oturum süresi ve bitiş zamanı', () => {
  assert.equal(kilit.KILIT_SURESI_MS, 600000);
  assert.equal(kilit.kilitBitisZamani(1000), 601000);
  assert.equal(kilit.kilitBitisZamani(1000, 500), 1500);
  assert.equal(kilit.kilitAcik({ pinKilitBitis: 1001 }, 1000), true);
  assert.equal(kilit.kilitAcik({ pinKilitBitis: 1000 }, 1000), false);
  assert.equal(kilit.kilitAcik({}, 1000), true);
});

test('kilit: beşinci hatada 30 saniye bekleme başlar', () => {
  let veri = {};
  for (let i = 1; i <= 4; i++) {
    veri = kilit.hataKaydet(veri, 1000);
    assert.equal(veri.pinHataSayisi, i);
    assert.equal(veri.pinHataBitis, 0);
  }
  veri = kilit.hataKaydet(veri, 1000);
  assert.equal(veri.pinHataSayisi, 0);
  assert.equal(veri.pinHataBitis, 31000);
  assert.equal(kilit.hataBeklemesi(veri, 1000), 30000);
  assert.equal(kilit.hataBeklemesi(veri, 31000), 0);
});

test('kilit: pinDogrula düz metin ve karma kaydı doğrular', async () => {
  assert.equal(await kilit.pinDogrula('2468', { pinKodu: '2468' }), true);
  assert.equal(await kilit.pinDogrula('0000', { pinKodu: '2468' }), false);
  const karma = await pin.pinKarmala('2468', { iterasyon: 1000 });
  assert.equal(await kilit.pinDogrula('2468', { pinKodu: karma }), true);
  assert.equal(await kilit.pinDogrula('0000', { pinKodu: karma }), false);
});
