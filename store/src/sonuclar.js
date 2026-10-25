/**
 * YouTube Filter Store - İçeriklerin oylama sonuçlarını veritabanından hesaplar
 */

const { pool } = require('./veritabani');
const { puanla } = require('./puanlama');

async function aktifBasliklar(sorgucu = pool) {
    const { rows } = await sorgucu.query('SELECT id, tur, anahtar, ad, aciklama FROM basliklar WHERE aktif ORDER BY tur, sira, id');
    return rows;
}

/**
 * Verilen içeriklerin (ya da idler null ise tümünün) sonuçlarını döndürür.
 * @returns {Promise<Map<number, ReturnType<typeof puanla> & {oySayisi: number}>>}
 */
async function sonuclariHesapla(icerikIdleri, sorgucu = pool) {
    const basliklar = await aktifBasliklar(sorgucu);
    const filtre = icerikIdleri ? 'WHERE g.icerik_id = ANY($1::int[])' : '';
    const { rows } = await sorgucu.query(
        `SELECT g.icerik_id, b.anahtar AS baslik, g.editor_id AS editor, g.oy, g.zaman
         FROM oy_gecmisi g JOIN basliklar b ON b.id = g.baslik_id
         ${filtre}
         ORDER BY g.icerik_id, g.zaman, g.id`,
        icerikIdleri ? [icerikIdleri] : []
    );

    const gruplar = new Map();
    (icerikIdleri || []).forEach(id => gruplar.set(id, []));
    rows.forEach(satir => {
        if (!gruplar.has(satir.icerik_id)) gruplar.set(satir.icerik_id, []);
        gruplar.get(satir.icerik_id).push(satir);
    });

    const sonuclar = new Map();
    for (const [icerikId, gecmis] of gruplar) {
        const puan = puanla(basliklar, gecmis);
        const oySayisi = Object.values(puan.sayimlar).reduce((t, s) => t + s.yukari + s.kararsiz + s.asagi, 0);
        sonuclar.set(icerikId, { ...puan, oySayisi });
    }
    return sonuclar;
}

// Liste ve filtreler için kısa durum: oysuz | kararsiz | sonuclu
function sonucDurumu(puan) {
    if (!puan || puan.oySayisi === 0) return 'oysuz';
    const s = puan.sonuc;
    if (!puan.disaAktarilir || s.kararsizKonular.length > 0 || s.kararsizEtiketler.length > 0) return 'kararsiz';
    return 'sonuclu';
}

module.exports = { aktifBasliklar, sonuclariHesapla, sonucDurumu };
