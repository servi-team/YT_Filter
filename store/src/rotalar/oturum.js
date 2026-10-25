/**
 * /api/oturum - giriş, çıkış, oturumdaki editör ve şifre değiştirme
 */

const express = require('express');
const { pool } = require('../veritabani');
const { HttpHatasi } = require('../hatalar');
const { girisGerekli, editoruDisaAc, sifreyiDogrula, sifreOzetiOlustur, sifreDogruMu } = require('../oturum');

const router = express.Router();

// Kaba kuvvet denemelerine karşı: 15 dakikada 5 hatalı giriş
const HATALI_GIRIS_SINIRI = 5;
const KILIT_SURESI_MS = 15 * 60 * 1000;
const hataliGirisler = new Map();

function kilitliMi(anahtar) {
    const kayit = hataliGirisler.get(anahtar);
    if (!kayit) return false;
    if (Date.now() - kayit.ilk > KILIT_SURESI_MS) {
        hataliGirisler.delete(anahtar);
        return false;
    }
    return kayit.sayi >= HATALI_GIRIS_SINIRI;
}

function hataliGirisKaydet(anahtar) {
    const kayit = hataliGirisler.get(anahtar) || { sayi: 0, ilk: Date.now() };
    kayit.sayi++;
    hataliGirisler.set(anahtar, kayit);
}

router.post('/giris', async (req, res) => {
    const kullaniciAdi = String(req.body.kullaniciAdi || '').trim().toLowerCase();
    const sifre = String(req.body.sifre || '');
    const anahtar = `${req.ip}|${kullaniciAdi}`;

    if (kilitliMi(anahtar)) {
        throw new HttpHatasi(429, 'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.');
    }

    const { rows } = await pool.query('SELECT * FROM editorler WHERE kullanici_adi = $1 AND aktif', [kullaniciAdi]);
    if (rows.length === 0 || !(await sifreDogruMu(sifre, rows[0].sifre_ozeti))) {
        hataliGirisKaydet(anahtar);
        throw new HttpHatasi(401, 'Kullanıcı adı veya şifre hatalı');
    }
    hataliGirisler.delete(anahtar);

    // Oturum sabitleme saldırısına karşı yeni oturum kimliği
    await new Promise((coz, reddet) => req.session.regenerate(h => (h ? reddet(h) : coz())));
    req.session.editorId = rows[0].id;
    res.json(editoruDisaAc(rows[0]));
});

router.post('/cikis', (req, res, next) => {
    req.session.destroy(hata => {
        if (hata) return next(hata);
        res.clearCookie('store.sid');
        res.status(204).end();
    });
});

router.get('/ben', girisGerekli, (req, res) => {
    res.json(req.editor);
});

router.post('/sifre', girisGerekli, async (req, res) => {
    const { mevcutSifre, yeniSifre } = req.body;
    sifreyiDogrula(yeniSifre);
    const { rows } = await pool.query('SELECT sifre_ozeti FROM editorler WHERE id = $1', [req.editor.id]);
    if (!(await sifreDogruMu(String(mevcutSifre || ''), rows[0].sifre_ozeti))) {
        throw new HttpHatasi(400, 'Mevcut şifre hatalı');
    }
    await pool.query('UPDATE editorler SET sifre_ozeti = $1 WHERE id = $2', [await sifreOzetiOlustur(yeniSifre), req.editor.id]);
    res.status(204).end();
});

module.exports = router;
