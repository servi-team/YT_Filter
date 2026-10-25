/**
 * /api/icerikler - oylanacak kanal ve videolar
 */

const express = require('express');
const { pool } = require('../veritabani');
const { HttpHatasi } = require('../hatalar');
const { girisGerekli, adminGerekli } = require('../oturum');
const { linkiAyristir, videoBilgisiGetir } = require('../youtube');

const router = express.Router();
router.use(girisGerekli);

const SAYFA_BOYUTU = 50;

function icerigiDisaAc(satir) {
    return {
        id: satir.id,
        tur: satir.tur,
        youtubeId: satir.youtube_id,
        baslik: satir.baslik,
        kanalAdi: satir.kanal_adi,
        kanalHandle: satir.kanal_handle,
        kapakUrl: satir.kapak_url,
        ekleyen: satir.ekleyen_ad || null,
        eklenme: satir.eklenme,
        youtubeUrl: satir.tur === 'video'
            ? `https://www.youtube.com/watch?v=${satir.youtube_id}`
            : `https://www.youtube.com/${satir.youtube_id}`
    };
}

router.get('/', async (req, res) => {
    const kosullar = [];
    const degerler = [];
    const arama = String(req.query.arama || '').trim();
    if (arama) {
        degerler.push(`%${arama.toLocaleLowerCase('tr-TR')}%`);
        const p = `$${degerler.length}`;
        kosullar.push(`(lower(i.youtube_id) LIKE ${p} OR lower(coalesce(i.baslik, '')) LIKE ${p} OR lower(coalesce(i.kanal_adi, '')) LIKE ${p} OR lower(coalesce(i.kanal_handle, '')) LIKE ${p})`);
    }
    if (req.query.tur === 'video' || req.query.tur === 'kanal') {
        degerler.push(req.query.tur);
        kosullar.push(`i.tur = $${degerler.length}`);
    }
    const nerede = kosullar.length ? `WHERE ${kosullar.join(' AND ')}` : '';
    const sayfa = Math.max(1, Number(req.query.sayfa) || 1);

    const toplam = await pool.query(`SELECT COUNT(*)::int AS sayi FROM icerikler i ${nerede}`, degerler);
    const { rows } = await pool.query(
        `SELECT i.*, e.ad AS ekleyen_ad
         FROM icerikler i LEFT JOIN editorler e ON e.id = i.ekleyen_id
         ${nerede}
         ORDER BY i.eklenme DESC, i.id DESC
         LIMIT ${SAYFA_BOYUTU} OFFSET ${(sayfa - 1) * SAYFA_BOYUTU}`,
        degerler
    );
    res.json({ toplam: toplam.rows[0].sayi, sayfa, sayfaBoyutu: SAYFA_BOYUTU, icerikler: rows.map(icerigiDisaAc) });
});

router.post('/', async (req, res) => {
    const { tur, youtubeId } = linkiAyristir(req.body.link);

    const mevcut = await pool.query('SELECT id FROM icerikler WHERE tur = $1 AND youtube_id = $2', [tur, youtubeId]);
    if (mevcut.rows.length > 0) {
        return res.status(409).json({ hata: 'Bu içerik zaten eklenmiş', id: mevcut.rows[0].id });
    }

    let bilgi = { baslik: youtubeId, kanalAdi: null, kanalHandle: youtubeId, kapakUrl: null };
    if (tur === 'video') bilgi = await videoBilgisiGetir(youtubeId);

    try {
        const { rows } = await pool.query(
            `INSERT INTO icerikler (tur, youtube_id, baslik, kanal_adi, kanal_handle, kapak_url, ekleyen_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [tur, youtubeId, bilgi.baslik, bilgi.kanalAdi, bilgi.kanalHandle, bilgi.kapakUrl, req.editor.id]
        );
        res.status(201).json(icerigiDisaAc({ ...rows[0], ekleyen_ad: req.editor.ad }));
    } catch (hata) {
        if (hata.code === '23505') throw new HttpHatasi(409, 'Bu içerik zaten eklenmiş');
        throw hata;
    }
});

router.get('/:id', async (req, res) => {
    const { rows } = await pool.query(
        `SELECT i.*, e.ad AS ekleyen_ad FROM icerikler i LEFT JOIN editorler e ON e.id = i.ekleyen_id WHERE i.id = $1`,
        [Number(req.params.id)]
    );
    if (rows.length === 0) throw new HttpHatasi(404, 'İçerik bulunamadı');
    res.json(icerigiDisaAc(rows[0]));
});

router.delete('/:id', adminGerekli, async (req, res) => {
    const { rowCount } = await pool.query('DELETE FROM icerikler WHERE id = $1', [Number(req.params.id)]);
    if (rowCount === 0) throw new HttpHatasi(404, 'İçerik bulunamadı');
    res.status(204).end();
});

module.exports = { router, icerigiDisaAc };
