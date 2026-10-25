/**
 * YouTube Filter Store - Eklenti veritabanı JSON'unu oluşturan saf fonksiyonlar
 * Biçim: docs/veritabani-semasi.md (sema sürümü 1)
 */

const SEMA_SURUMU = 1;

/**
 * Bu ay için bir sonraki sürüm: "YYYY.AA.N" (N, aynı aydaki en büyük N + 1)
 * @param {string[]} mevcutSurumler
 * @param {Date} tarih
 */
function sonrakiSurum(mevcutSurumler, tarih = new Date()) {
    const onEk = `${tarih.getUTCFullYear()}.${String(tarih.getUTCMonth() + 1).padStart(2, '0')}`;
    const enBuyuk = mevcutSurumler
        .filter(s => s.startsWith(onEk + '.'))
        .map(s => Number(s.slice(onEk.length + 1)))
        .filter(Number.isInteger)
        .reduce((a, b) => Math.max(a, b), 0);
    return `${onEk}.${enBuyuk + 1}`;
}

/**
 * @param {object} girdi
 * @param {Array<{anahtar: string, ad: string, tur: 'konu'|'etiket'}>} girdi.basliklar  aktif başlıklar, sıralı
 * @param {Array<{id: number, tur: 'video'|'kanal', youtubeId: string}>} girdi.icerikler
 * @param {Map<number, {sonuc: object, disaAktarilir: boolean}>} girdi.sonuclar  puanla() çıktıları
 * @param {string} girdi.surum
 * @param {Date} girdi.olusturulma
 */
function veritabaniJsonuOlustur({ basliklar, icerikler, sonuclar, surum, olusturulma }) {
    const kayitlar = { videolar: {}, kanallar: {} };

    icerikler
        .slice()
        .sort((a, b) => a.youtubeId.localeCompare(b.youtubeId))
        .forEach(icerik => {
            const puan = sonuclar.get(icerik.id);
            if (!puan || !puan.disaAktarilir) return;
            const s = puan.sonuc;
            kayitlar[icerik.tur === 'video' ? 'videolar' : 'kanallar'][icerik.youtubeId] = {
                anaKonu: s.anaKonu,
                yanKonular: s.yanKonular,
                kararsizKonular: s.kararsizKonular,
                etiketler: s.etiketler,
                kararsizEtiketler: s.kararsizEtiketler
            };
        });

    const tanimlar = tur => basliklar.filter(b => b.tur === tur).map(b => ({ id: b.anahtar, ad: b.ad }));
    return {
        semaSurumu: SEMA_SURUMU,
        surum,
        olusturulma: olusturulma.toISOString(),
        konular: tanimlar('konu'),
        etiketler: tanimlar('etiket'),
        videolar: kayitlar.videolar,
        kanallar: kayitlar.kanallar
    };
}

module.exports = { SEMA_SURUMU, sonrakiSurum, veritabaniJsonuOlustur };
