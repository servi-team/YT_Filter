/**
 * /api/basliklar - konu ve etiket tanımları
 * Okuma tüm editörlere, değişiklik yalnızca yöneticiye açıktır.
 * Başlıklar silinmez, pasifleştirilir: pasif başlıklar oylanmaz ve dışa aktarılmaz.
 */

const express = require('express');
const { pool, islem } = require('../veritabani');
const { HttpHatasi } = require('../hatalar');
const { girisGerekli, adminGerekli } = require('../oturum');

const router = express.Router();

const TURLER = ['konu', 'etiket'];
const ANAHTAR_KURALI = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function basligiDisaAc(satir) {
    return {
        id: satir.id,
        tur: satir.tur,
        anahtar: satir.anahtar,
        ad: satir.ad,
        aciklama: satir.aciklama,
        sira: satir.sira,
        aktif: satir.aktif
    };
}

router.get('/', girisGerekli, async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM basliklar ORDER BY tur, sira, id');
    res.json(rows.map(basligiDisaAc));
});

router.post('/', adminGerekli, async (req, res) => {
    const tur = req.body.tur;
    const anahtar = String(req.body.anahtar || '').trim();
    const ad = String(req.body.ad || '').trim();
    const aciklama = String(req.body.aciklama || '').trim();

    if (!TURLER.includes(tur)) throw new HttpHatasi(400, 'Tür "konu" veya "etiket" olmalı');
    if (!ANAHTAR_KURALI.test(anahtar)) throw new HttpHatasi(400, 'Anahtar yalnızca küçük harf, rakam ve tire içerebilir (ör. "bilim-kurgu")');
    if (!ad) throw new HttpHatasi(400, 'Ad gerekli');

    try {
        const { rows } = await pool.query(
            `INSERT INTO basliklar (tur, anahtar, ad, aciklama, sira)
             VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(sira), 0) + 1 FROM basliklar WHERE tur = $1))
             RETURNING *`,
            [tur, anahtar, ad, aciklama]
        );
        res.status(201).json(basligiDisaAc(rows[0]));
    } catch (hata) {
        if (hata.code === '23505') throw new HttpHatasi(409, 'Bu anahtar zaten kullanılıyor');
        throw hata;
    }
});

router.patch('/:id', adminGerekli, async (req, res) => {
    const { ad, aciklama, aktif } = req.body;
    const alanlar = [];
    const degerler = [];
    if (ad !== undefined) {
        if (!String(ad).trim()) throw new HttpHatasi(400, 'Ad boş olamaz');
        degerler.push(String(ad).trim());
        alanlar.push(`ad = $${degerler.length}`);
    }
    if (aciklama !== undefined) {
        degerler.push(String(aciklama).trim());
        alanlar.push(`aciklama = $${degerler.length}`);
    }
    if (aktif !== undefined) {
        degerler.push(Boolean(aktif));
        alanlar.push(`aktif = $${degerler.length}`);
    }
    if (alanlar.length === 0) throw new HttpHatasi(400, 'Güncellenecek alan yok');

    degerler.push(Number(req.params.id));
    const { rows } = await pool.query(
        `UPDATE basliklar SET ${alanlar.join(', ')} WHERE id = $${degerler.length} RETURNING *`,
        degerler
    );
    if (rows.length === 0) throw new HttpHatasi(404, 'Başlık bulunamadı');
    res.json(basligiDisaAc(rows[0]));
});

// Aynı türdeki komşu başlıkla sırasını değiştirir
router.post('/:id/tasi', adminGerekli, async (req, res) => {
    const yukari = req.body.yon === 'yukari';
    await islem(async (istemci) => {
        const { rows } = await istemci.query('SELECT * FROM basliklar WHERE id = $1 FOR UPDATE', [Number(req.params.id)]);
        if (rows.length === 0) throw new HttpHatasi(404, 'Başlık bulunamadı');
        const baslik = rows[0];
        const komsu = await istemci.query(
            `SELECT * FROM basliklar WHERE tur = $1 AND ${yukari ? 'sira < $2 ORDER BY sira DESC' : 'sira > $2 ORDER BY sira ASC'} LIMIT 1 FOR UPDATE`,
            [baslik.tur, baslik.sira]
        );
        if (komsu.rows.length === 0) return;
        await istemci.query('UPDATE basliklar SET sira = $1 WHERE id = $2', [komsu.rows[0].sira, baslik.id]);
        await istemci.query('UPDATE basliklar SET sira = $1 WHERE id = $2', [baslik.sira, komsu.rows[0].id]);
    });
    res.status(204).end();
});

module.exports = router;
