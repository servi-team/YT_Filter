/**
 * /api/disa-aktarimlar - eklenti veritabanını JSON olarak dışa aktarma (yalnızca yönetici)
 */

const express = require('express');
const { pool, islem } = require('../veritabani');
const { HttpHatasi } = require('../hatalar');
const { adminGerekli } = require('../oturum');
const { aktifBasliklar, sonuclariHesapla } = require('../sonuclar');
const { sonrakiSurum, veritabaniJsonuOlustur } = require('../disa_aktarma');

const router = express.Router();
router.use(adminGerekli);

async function guncelVeritabani(surum, sorgucu = pool) {
    const basliklar = await aktifBasliklar(sorgucu);
    const { rows } = await sorgucu.query('SELECT id, tur, youtube_id FROM icerikler');
    const icerikler = rows.map(r => ({ id: r.id, tur: r.tur, youtubeId: r.youtube_id }));
    const sonuclar = await sonuclariHesapla(icerikler.map(i => i.id), sorgucu);
    return {
        json: veritabaniJsonuOlustur({ basliklar, icerikler, sonuclar, surum, olusturulma: new Date() }),
        toplamIcerik: icerikler.length
    };
}

async function mevcutSurumler(sorgucu = pool) {
    const { rows } = await sorgucu.query('SELECT surum FROM disa_aktarimlar');
    return rows.map(r => r.surum);
}

router.get('/', async (req, res) => {
    const { rows } = await pool.query(
        `SELECT d.surum, d.olusturulma, d.video_sayisi, d.kanal_sayisi, e.ad AS editor
         FROM disa_aktarimlar d LEFT JOIN editorler e ON e.id = d.editor_id
         ORDER BY d.olusturulma DESC, d.id DESC`
    );
    res.json(rows.map(r => ({
        surum: r.surum,
        olusturulma: r.olusturulma,
        videoSayisi: r.video_sayisi,
        kanalSayisi: r.kanal_sayisi,
        editor: r.editor
    })));
});

// Şu an dışa aktarılsa ne gireceğini gösterir
router.get('/onizleme', async (req, res) => {
    const surum = sonrakiSurum(await mevcutSurumler());
    const { json, toplamIcerik } = await guncelVeritabani(surum);
    res.json({
        sonrakiSurum: surum,
        toplamIcerik,
        videoSayisi: Object.keys(json.videolar).length,
        kanalSayisi: Object.keys(json.kanallar).length,
        konuSayisi: json.konular.length,
        etiketSayisi: json.etiketler.length
    });
});

router.post('/', async (req, res) => {
    const kayit = await islem(async (istemci) => {
        // Aynı anda iki dışa aktarım aynı sürüm numarasını almasın
        await istemci.query('LOCK TABLE disa_aktarimlar IN EXCLUSIVE MODE');
        const surum = sonrakiSurum(await mevcutSurumler(istemci));
        const { json } = await guncelVeritabani(surum, istemci);
        const videoSayisi = Object.keys(json.videolar).length;
        const kanalSayisi = Object.keys(json.kanallar).length;
        await istemci.query(
            'INSERT INTO disa_aktarimlar (surum, editor_id, video_sayisi, kanal_sayisi, icerik) VALUES ($1, $2, $3, $4, $5)',
            [surum, req.editor.id, videoSayisi, kanalSayisi, JSON.stringify(json)]
        );
        return { surum, videoSayisi, kanalSayisi };
    });
    res.status(201).json(kayit);
});

router.get('/:surum/dosya', async (req, res) => {
    const { rows } = await pool.query('SELECT icerik FROM disa_aktarimlar WHERE surum = $1', [req.params.surum]);
    if (rows.length === 0) throw new HttpHatasi(404, 'Sürüm bulunamadı');
    res.attachment(`veritabani-${req.params.surum}.json`);
    res.type('application/json');
    res.send(JSON.stringify(rows[0].icerik, null, 2) + '\n');
});

module.exports = router;
