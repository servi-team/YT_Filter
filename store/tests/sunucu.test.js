const test = require('node:test');
const assert = require('node:assert/strict');

// Erişilemeyen bir veritabanı adresi: sağlık kontrolü 503 dönmeli
process.env.DATABASE_URL = 'postgres://kullanici:sifre@127.0.0.1:1/yok';
process.env.OTURUM_GIZLI_ANAHTAR = 'test-icin-yeterince-uzun-anahtar';
const { uygulamaOlustur } = require('../src/sunucu.js');

test('sunucu statik sayfayı sunar, veritabanı yoksa sağlık 503 döner', async (t) => {
    const sunucu = uygulamaOlustur().listen(0);
    t.after(() => sunucu.close());
    const kok = `http://127.0.0.1:${sunucu.address().port}`;

    const anaSayfa = await fetch(kok + '/');
    assert.equal(anaSayfa.status, 200);
    assert.match(await anaSayfa.text(), /YouTube Filter Store/);

    const saglik = await fetch(kok + '/saglik');
    assert.equal(saglik.status, 503);

    const bilinmeyen = await fetch(kok + '/api/yok');
    assert.equal(bilinmeyen.status, 404);
});

test('JSON olmayan veri değiştirme istekleri reddedilir (CSRF koruması)', async (t) => {
    const sunucu = uygulamaOlustur().listen(0);
    t.after(() => sunucu.close());
    const yanit = await fetch(`http://127.0.0.1:${sunucu.address().port}/api/oturum/giris`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'kullaniciAdi=admin&sifre=x'
    });
    assert.equal(yanit.status, 415);
});
