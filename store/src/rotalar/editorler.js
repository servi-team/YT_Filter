/**
 * /api/editorler - editör hesaplarının yönetimi (yalnızca yönetici)
 * Editörler silinmez, pasifleştirilir; böylece verdikleri oylar korunur.
 */

const express = require('express');
const { pool } = require('../veritabani');
const { HttpHatasi } = require('../hatalar');
const { adminGerekli, editoruDisaAc, sifreyiDogrula, sifreOzetiOlustur } = require('../oturum');

const router = express.Router();
router.use(adminGerekli);

const KULLANICI_ADI_KURALI = /^[a-z0-9._-]{3,32}$/;
const ROLLER = ['admin', 'editor'];

router.get('/', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM editorler ORDER BY aktif DESC, kullanici_adi');
    res.json(rows.map(editoruDisaAc));
});

router.post('/', async (req, res) => {
    const kullaniciAdi = String(req.body.kullaniciAdi || '').trim().toLowerCase();
    const ad = String(req.body.ad || '').trim();
    const rol = req.body.rol || 'editor';

    if (!KULLANICI_ADI_KURALI.test(kullaniciAdi)) {
        throw new HttpHatasi(400, 'Kullanıcı adı 3-32 karakter olmalı; yalnızca küçük harf, rakam, nokta, tire ve alt çizgi içerebilir');
    }
    if (!ad) throw new HttpHatasi(400, 'Ad gerekli');
    if (!ROLLER.includes(rol)) throw new HttpHatasi(400, 'Geçersiz rol');
    sifreyiDogrula(req.body.sifre);

    try {
        const { rows } = await pool.query(
            'INSERT INTO editorler (kullanici_adi, ad, sifre_ozeti, rol) VALUES ($1, $2, $3, $4) RETURNING *',
            [kullaniciAdi, ad, await sifreOzetiOlustur(req.body.sifre), rol]
        );
        res.status(201).json(editoruDisaAc(rows[0]));
    } catch (hata) {
        if (hata.code === '23505') throw new HttpHatasi(409, 'Bu kullanıcı adı zaten kullanılıyor');
        throw hata;
    }
});

router.patch('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { ad, rol, aktif, sifre } = req.body;
    const kendisi = id === req.editor.id;

    // Yönetici kendini kilitleyemesin
    if (kendisi && (aktif === false || (rol && rol !== 'admin'))) {
        throw new HttpHatasi(400, 'Kendi hesabınızı pasifleştiremez veya yetkinizi düşüremezsiniz');
    }

    const alanlar = [];
    const degerler = [];
    if (ad !== undefined) {
        if (!String(ad).trim()) throw new HttpHatasi(400, 'Ad boş olamaz');
        degerler.push(String(ad).trim());
        alanlar.push(`ad = $${degerler.length}`);
    }
    if (rol !== undefined) {
        if (!ROLLER.includes(rol)) throw new HttpHatasi(400, 'Geçersiz rol');
        degerler.push(rol);
        alanlar.push(`rol = $${degerler.length}`);
    }
    if (aktif !== undefined) {
        degerler.push(Boolean(aktif));
        alanlar.push(`aktif = $${degerler.length}`);
    }
    if (sifre !== undefined) {
        sifreyiDogrula(sifre);
        degerler.push(await sifreOzetiOlustur(sifre));
        alanlar.push(`sifre_ozeti = $${degerler.length}`);
    }
    if (alanlar.length === 0) throw new HttpHatasi(400, 'Güncellenecek alan yok');

    degerler.push(id);
    const { rows } = await pool.query(
        `UPDATE editorler SET ${alanlar.join(', ')} WHERE id = $${degerler.length} RETURNING *`,
        degerler
    );
    if (rows.length === 0) throw new HttpHatasi(404, 'Editör bulunamadı');
    res.json(editoruDisaAc(rows[0]));
});

module.exports = router;
