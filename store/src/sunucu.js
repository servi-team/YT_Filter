/**
 * YouTube Filter Store - HTTP sunucusu
 * Editörlerin konu/etiket oyladığı ortak çalışma sitesi.
 */

const path = require('path');
const express = require('express');
const { pool, gocleriCalistir } = require('./veritabani');
const { HttpHatasi } = require('./hatalar');
const { oturumAraciOlustur, jsonZorunlu, ilkAdminiOlustur } = require('./oturum');

const PORT = Number(process.env.PORT || 3000);

function uygulamaOlustur() {
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.use(express.json({ limit: '1mb' }));

    app.get('/saglik', async (req, res) => {
        try {
            await pool.query('SELECT 1');
            res.json({ durum: 'ok' });
        } catch (hata) {
            res.status(503).json({ durum: 'veritabani-erisilemiyor' });
        }
    });

    app.use(express.static(path.join(__dirname, '..', 'public')));

    // API rotaları
    app.use('/api', oturumAraciOlustur(), jsonZorunlu);
    app.use('/api/oturum', require('./rotalar/oturum'));
    app.use('/api/editorler', require('./rotalar/editorler'));
    app.use('/api/basliklar', require('./rotalar/basliklar'));
    app.use('/api/icerikler', require('./rotalar/icerikler').router);

    app.use('/api', (req, res) => {
        res.status(404).json({ hata: 'Bulunamadı' });
    });

    // eslint-disable-next-line no-unused-vars
    app.use((hata, req, res, next) => {
        if (hata instanceof HttpHatasi) {
            return res.status(hata.durum).json({ hata: hata.message });
        }
        if (hata.type === 'entity.parse.failed') {
            return res.status(400).json({ hata: 'Geçersiz JSON' });
        }
        console.error(hata);
        res.status(500).json({ hata: 'Sunucu hatası' });
    });

    return app;
}

async function baslat() {
    await gocleriCalistir();
    await ilkAdminiOlustur();
    uygulamaOlustur().listen(PORT, () => {
        console.log(`YouTube Filter Store çalışıyor: http://localhost:${PORT}`);
    });
}

if (require.main === module) {
    baslat().catch(hata => {
        console.error(hata);
        process.exit(1);
    });
}

module.exports = { uygulamaOlustur };
