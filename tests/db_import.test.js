const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { dogrula, surumKarsilastir, iceAktar } = require('../scripts/db-import.js');

function ornekVeritabani(surum = '2026.11.1') {
    return {
        semaSurumu: 1,
        surum,
        olusturulma: '2026-11-01T12:00:00.000Z',
        konular: [{ id: 'teknoloji', ad: 'Teknoloji' }, { id: 'oyun', ad: 'Oyun' }],
        etiketler: [{ id: 'kufur', ad: 'Küfürlü içerik' }],
        videolar: {
            dQw4w9WgXcQ: { anaKonu: 'teknoloji', yanKonular: ['oyun'], kararsizKonular: [], etiketler: [], kararsizEtiketler: ['kufur'] }
        },
        kanallar: {
            '@kanal': { anaKonu: null, yanKonular: [], kararsizKonular: [], etiketler: ['kufur'], kararsizEtiketler: [] }
        }
    };
}

test('geçerli veritabanı hatasız doğrulanır', () => {
    assert.deepEqual(dogrula(ornekVeritabani()), []);
    assert.deepEqual(dogrula(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'veritabani.json'), 'utf8'))), []);
});

test('tanımsız id, hatalı anahtar ve boş kayıt yakalanır', () => {
    const vt = ornekVeritabani();
    vt.videolar.dQw4w9WgXcQ.yanKonular.push('yok');
    vt.kanallar['@Buyuk'] = vt.kanallar['@kanal'];
    vt.videolar.abcdefghijk = { anaKonu: null, yanKonular: [], kararsizKonular: [], etiketler: [], kararsizEtiketler: [] };
    const hatalar = dogrula(vt);
    assert.equal(hatalar.length, 3);
    assert.match(hatalar.join('\n'), /tanımsız id "yok"/);
    assert.match(hatalar.join('\n'), /küçük harfli @handle/);
    assert.match(hatalar.join('\n'), /ne konusu ne etiketi/);
});

test('sürüm karşılaştırma', () => {
    assert.ok(surumKarsilastir('2026.11.2', '2026.11.1') > 0);
    assert.ok(surumKarsilastir('2026.12.0', '2026.11.9') > 0);
    assert.equal(surumKarsilastir('2026.11.1', '2026.11.1'), 0);
});

test('içe aktarma eski sürümü reddeder, yenisini yazar ve özetler', () => {
    const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'ytf-'));
    const hedef = path.join(klasor, 'veritabani.json');
    const kaynak = path.join(klasor, 'disa_aktarim.json');

    fs.writeFileSync(hedef, JSON.stringify(ornekVeritabani('2026.11.1')));
    fs.writeFileSync(kaynak, JSON.stringify(ornekVeritabani('2026.11.1')));
    assert.throws(() => iceAktar(kaynak, { hedefDosya: hedef }), /büyük olmalı/);

    const yeni = ornekVeritabani('2026.11.2');
    yeni.videolar.dQw4w9WgXcQ.yanKonular = [];
    yeni.videolar.zzzzzzzzzzz = { anaKonu: 'oyun', yanKonular: [], kararsizKonular: [], etiketler: [], kararsizEtiketler: [] };
    delete yeni.kanallar['@kanal'];
    fs.writeFileSync(kaynak, JSON.stringify(yeni));

    const sonuc = iceAktar(kaynak, { hedefDosya: hedef });
    assert.equal(sonuc.yeniSurum, '2026.11.2');
    assert.deepEqual(sonuc.ozet.videolar, { eklenen: 1, degisen: 1, silinen: 0, toplam: 2 });
    assert.deepEqual(sonuc.ozet.kanallar, { eklenen: 0, degisen: 0, silinen: 1, toplam: 0 });
    assert.equal(JSON.parse(fs.readFileSync(hedef, 'utf8')).surum, '2026.11.2');
    fs.rmSync(klasor, { recursive: true });
});
