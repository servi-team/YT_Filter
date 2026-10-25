/**
 * YouTube Filter Store - PostgreSQL bağlantısı ve şema göçleri
 * migrations/ altındaki .sql dosyaları ad sırasıyla, her biri bir kez çalıştırılır.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const GOC_KLASORU = path.join(__dirname, 'migrations');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10
});

const bekle = ms => new Promise(coz => setTimeout(coz, ms));

// Veritabanı konteyneri henüz hazır değilse birkaç kez dener
async function baglantiyiBekle(deneme = 20) {
    for (let i = 1; i <= deneme; i++) {
        try {
            await pool.query('SELECT 1');
            return;
        } catch (hata) {
            if (i === deneme) throw hata;
            console.log(`Veritabanı bekleniyor (${i}/${deneme})...`);
            await bekle(1500);
        }
    }
}

function gocDosyalari() {
    if (!fs.existsSync(GOC_KLASORU)) return [];
    return fs.readdirSync(GOC_KLASORU).filter(ad => ad.endsWith('.sql')).sort();
}

async function gocleriCalistir() {
    await baglantiyiBekle();
    const istemci = await pool.connect();
    try {
        // Aynı anda birden fazla uygulama örneği açılırsa göçler bir kez çalışsın
        await istemci.query('SELECT pg_advisory_lock(424242)');
        await istemci.query(`CREATE TABLE IF NOT EXISTS sema_gocleri (
            ad TEXT PRIMARY KEY,
            uygulanma TIMESTAMPTZ NOT NULL DEFAULT now()
        )`);
        const { rows } = await istemci.query('SELECT ad FROM sema_gocleri');
        const uygulananlar = new Set(rows.map(r => r.ad));

        for (const ad of gocDosyalari()) {
            if (uygulananlar.has(ad)) continue;
            const sql = fs.readFileSync(path.join(GOC_KLASORU, ad), 'utf8');
            await istemci.query('BEGIN');
            try {
                await istemci.query(sql);
                await istemci.query('INSERT INTO sema_gocleri (ad) VALUES ($1)', [ad]);
                await istemci.query('COMMIT');
                console.log(`✓ Şema göçü uygulandı: ${ad}`);
            } catch (hata) {
                await istemci.query('ROLLBACK');
                throw new Error(`Şema göçü başarısız (${ad}): ${hata.message}`);
            }
        }
    } finally {
        await istemci.query('SELECT pg_advisory_unlock(424242)').catch(() => {});
        istemci.release();
    }
}

// Birden fazla sorguyu tek işlemde çalıştırır
async function islem(fn) {
    const istemci = await pool.connect();
    try {
        await istemci.query('BEGIN');
        const sonuc = await fn(istemci);
        await istemci.query('COMMIT');
        return sonuc;
    } catch (hata) {
        await istemci.query('ROLLBACK');
        throw hata;
    } finally {
        istemci.release();
    }
}

module.exports = { pool, gocleriCalistir, islem };
