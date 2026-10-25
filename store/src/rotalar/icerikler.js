/**
 * /api/icerikler - oylanacak kanal ve videolar
 */

const express = require('express');
const { pool, islem } = require('../veritabani');
const { HttpHatasi } = require('../hatalar');
const { girisGerekli, adminGerekli } = require('../oturum');
const { linkiAyristir, videoBilgisiGetir } = require('../youtube');
const { aktifBasliklar, sonuclariHesapla, sonucDurumu } = require('../sonuclar');

const DURUMLAR = ['oysuz', 'kararsiz', 'sonuclu'];

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
    const durum = DURUMLAR.includes(req.query.durum) ? req.query.durum : null;
    const temelSorgu = `SELECT i.*, e.ad AS ekleyen_ad
         FROM icerikler i LEFT JOIN editorler e ON e.id = i.ekleyen_id
         ${nerede}
         ORDER BY i.eklenme DESC, i.id DESC`;

    let toplam;
    let satirlar;
    let sonuclar;
    if (durum) {
        // Durum oylardan hesaplandığı için filtre ve sayfalama hesaplamadan sonra yapılır
        const { rows } = await pool.query(temelSorgu, degerler);
        sonuclar = await sonuclariHesapla(rows.map(r => r.id));
        const eslesenler = rows.filter(r => sonucDurumu(sonuclar.get(r.id)) === durum);
        toplam = eslesenler.length;
        satirlar = eslesenler.slice((sayfa - 1) * SAYFA_BOYUTU, sayfa * SAYFA_BOYUTU);
    } else {
        toplam = (await pool.query(`SELECT COUNT(*)::int AS sayi FROM icerikler i ${nerede}`, degerler)).rows[0].sayi;
        satirlar = (await pool.query(`${temelSorgu} LIMIT ${SAYFA_BOYUTU} OFFSET ${(sayfa - 1) * SAYFA_BOYUTU}`, degerler)).rows;
        sonuclar = await sonuclariHesapla(satirlar.map(r => r.id));
    }

    const adlar = Object.fromEntries((await aktifBasliklar()).map(b => [b.anahtar, b.ad]));
    res.json({
        toplam,
        sayfa,
        sayfaBoyutu: SAYFA_BOYUTU,
        icerikler: satirlar.map(satir => {
            const puan = sonuclar.get(satir.id);
            return {
                ...icerigiDisaAc(satir),
                sonuc: {
                    durum: sonucDurumu(puan),
                    oySayisi: puan.oySayisi,
                    anaKonu: puan.sonuc.anaKonu ? adlar[puan.sonuc.anaKonu] : null,
                    etiketler: puan.sonuc.etiketler.map(e => adlar[e])
                }
            };
        })
    });
});

// Oylama ekranı verisi: başlıklar, sayımlar, editörün kendi oyları ve sonuç
async function oylamaVerisi(icerikId, editorId) {
    const basliklar = await aktifBasliklar();
    const puan = (await sonuclariHesapla([icerikId])).get(icerikId);
    const { rows } = await pool.query(
        'SELECT b.anahtar, o.oy FROM oylar o JOIN basliklar b ON b.id = o.baslik_id WHERE o.icerik_id = $1 AND o.editor_id = $2',
        [icerikId, editorId]
    );
    return {
        basliklar: basliklar.map(b => ({ anahtar: b.anahtar, ad: b.ad, tur: b.tur, aciklama: b.aciklama })),
        sayimlar: puan.sayimlar,
        benimOylarim: Object.fromEntries(rows.map(r => [r.anahtar, r.oy])),
        sonuc: puan.sonuc,
        disaAktarilir: puan.disaAktarilir,
        oySayisi: puan.oySayisi
    };
}

async function icerikVarMi(icerikId) {
    const { rows } = await pool.query('SELECT 1 FROM icerikler WHERE id = $1', [icerikId]);
    if (rows.length === 0) throw new HttpHatasi(404, 'İçerik bulunamadı');
}

router.get('/:id/oylama', async (req, res) => {
    const icerikId = Number(req.params.id);
    await icerikVarMi(icerikId);
    res.json(await oylamaVerisi(icerikId, req.editor.id));
});

// Oy ver, değiştir ya da (oy: null) geri al
router.put('/:id/oylar/:anahtar', async (req, res) => {
    const icerikId = Number(req.params.id);
    const oy = req.body.oy;
    if (![1, 0, -1, null].includes(oy)) throw new HttpHatasi(400, 'Oy 1, 0, -1 veya null olmalı');
    await icerikVarMi(icerikId);

    await islem(async (istemci) => {
        const baslik = await istemci.query('SELECT id FROM basliklar WHERE anahtar = $1 AND aktif', [req.params.anahtar]);
        if (baslik.rows.length === 0) throw new HttpHatasi(404, 'Konu veya etiket bulunamadı');
        const baslikId = baslik.rows[0].id;

        const mevcut = await istemci.query(
            'SELECT oy FROM oylar WHERE icerik_id = $1 AND baslik_id = $2 AND editor_id = $3 FOR UPDATE',
            [icerikId, baslikId, req.editor.id]
        );
        const onceki = mevcut.rows.length ? mevcut.rows[0].oy : null;
        if (onceki === oy) return;

        if (oy === null) {
            await istemci.query('DELETE FROM oylar WHERE icerik_id = $1 AND baslik_id = $2 AND editor_id = $3', [icerikId, baslikId, req.editor.id]);
        } else {
            await istemci.query(
                `INSERT INTO oylar (icerik_id, baslik_id, editor_id, oy) VALUES ($1, $2, $3, $4)
                 ON CONFLICT (icerik_id, baslik_id, editor_id) DO UPDATE SET oy = EXCLUDED.oy, guncellenme = now()`,
                [icerikId, baslikId, req.editor.id, oy]
            );
        }
        await istemci.query(
            'INSERT INTO oy_gecmisi (icerik_id, baslik_id, editor_id, oy) VALUES ($1, $2, $3, $4)',
            [icerikId, baslikId, req.editor.id, oy]
        );
    });

    res.json(await oylamaVerisi(icerikId, req.editor.id));
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
