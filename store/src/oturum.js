/**
 * YouTube Filter Store - Oturum ve yetki yardımcıları
 */

const session = require('express-session');
const PgOturumDeposu = require('connect-pg-simple')(session);
const bcrypt = require('bcryptjs');
const { pool } = require('./veritabani');
const { HttpHatasi } = require('./hatalar');

const SIFRE_MALIYETI = 12;
const EN_AZ_SIFRE_UZUNLUGU = 8;

function oturumAraciOlustur() {
    const gizliAnahtar = process.env.OTURUM_GIZLI_ANAHTAR;
    if (!gizliAnahtar || gizliAnahtar.length < 16) {
        throw new Error('OTURUM_GIZLI_ANAHTAR en az 16 karakter olmalı (.env dosyasına bakın).');
    }
    return session({
        name: 'store.sid',
        store: new PgOturumDeposu({ pool, tableName: 'oturumlar' }),
        secret: gizliAnahtar,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.GUVENLI_CEREZ === 'true',
            maxAge: 7 * 24 * 60 * 60 * 1000
        }
    });
}

// Veri değiştiren istekler JSON olmak zorunda: başka sitelerden gelen form gönderimlerini (CSRF) engeller
function jsonZorunlu(req, res, next) {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !req.is('application/json')) {
        return next(new HttpHatasi(415, 'İstek JSON olmalı'));
    }
    next();
}

function editoruDisaAc(satir) {
    return {
        id: satir.id,
        kullaniciAdi: satir.kullanici_adi,
        ad: satir.ad,
        rol: satir.rol,
        aktif: satir.aktif,
        olusturulma: satir.olusturulma
    };
}

async function girisGerekli(req, res, next) {
    const editorId = req.session && req.session.editorId;
    if (!editorId) return next(new HttpHatasi(401, 'Giriş yapmanız gerekiyor'));
    const { rows } = await pool.query('SELECT * FROM editorler WHERE id = $1 AND aktif', [editorId]);
    if (rows.length === 0) {
        req.session.destroy(() => {});
        return next(new HttpHatasi(401, 'Giriş yapmanız gerekiyor'));
    }
    req.editor = editoruDisaAc(rows[0]);
    next();
}

function adminGerekli(req, res, next) {
    girisGerekli(req, res, (hata) => {
        if (hata) return next(hata);
        if (req.editor.rol !== 'admin') return next(new HttpHatasi(403, 'Bu işlem için yönetici yetkisi gerekiyor'));
        next();
    }).catch(next);
}

function sifreyiDogrula(sifre) {
    if (typeof sifre !== 'string' || sifre.length < EN_AZ_SIFRE_UZUNLUGU) {
        throw new HttpHatasi(400, `Şifre en az ${EN_AZ_SIFRE_UZUNLUGU} karakter olmalı`);
    }
}

const sifreOzetiOlustur = sifre => bcrypt.hash(sifre, SIFRE_MALIYETI);
const sifreDogruMu = (sifre, ozet) => bcrypt.compare(sifre, ozet);

// Hiç editör yoksa .env'deki bilgilerle ilk yöneticiyi oluşturur
async function ilkAdminiOlustur() {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS sayi FROM editorler');
    if (rows[0].sayi > 0) return;

    const kullaniciAdi = (process.env.ILK_ADMIN_KULLANICI || 'admin').toLowerCase();
    const sifre = process.env.ILK_ADMIN_SIFRE || '';
    if (sifre.length < EN_AZ_SIFRE_UZUNLUGU) {
        console.warn(`⚠ Hiç editör yok. İlk yöneticiyi oluşturmak için ILK_ADMIN_SIFRE (en az ${EN_AZ_SIFRE_UZUNLUGU} karakter) tanımlayın.`);
        return;
    }
    await pool.query(
        "INSERT INTO editorler (kullanici_adi, ad, sifre_ozeti, rol) VALUES ($1, $2, $3, 'admin')",
        [kullaniciAdi, 'Yönetici', await sifreOzetiOlustur(sifre)]
    );
    console.log(`✓ İlk yönetici oluşturuldu: ${kullaniciAdi}`);
}

module.exports = {
    oturumAraciOlustur,
    jsonZorunlu,
    girisGerekli,
    adminGerekli,
    editoruDisaAc,
    sifreyiDogrula,
    sifreOzetiOlustur,
    sifreDogruMu,
    ilkAdminiOlustur
};
