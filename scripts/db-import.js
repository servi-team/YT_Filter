#!/usr/bin/env node

/**
 * YouTube Filtreleyici Veritabanı İçe Aktarma Betiği
 *
 * Store'dan dışa aktarılan JSON dosyasını doğrular ve eklentinin
 * paketlediği src/data/veritabani.json dosyasının yerine yazar.
 * Şema: docs/veritabani-semasi.md
 *
 * Kullanım:
 *   node scripts/db-import.js <dosya.json>           # Doğrula ve içe aktar
 *   node scripts/db-import.js <dosya.json> --zorla   # Sürüm kontrolünü atla
 */

const fs = require('fs');
const path = require('path');

const HEDEF_DOSYA = path.resolve(__dirname, '..', 'src', 'data', 'veritabani.json');
const SEMA_SURUMU = 1;
const KAYIT_ALANLARI = ['yanKonular', 'kararsizKonular', 'etiketler', 'kararsizEtiketler'];

// "2026.11.2" > "2026.11.1" karşılaştırması; a > b ise pozitif döner
function surumKarsilastir(a, b) {
    const pa = String(a).split('.').map(Number);
    const pb = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const fark = (pa[i] || 0) - (pb[i] || 0);
        if (fark !== 0) return fark;
    }
    return 0;
}

// Hataları dizi olarak döndürür; boş dizi geçerli demektir
function dogrula(vt) {
    const hatalar = [];
    if (!vt || typeof vt !== 'object') return ['Dosya bir JSON nesnesi değil.'];

    if (vt.semaSurumu !== SEMA_SURUMU) hatalar.push(`semaSurumu ${SEMA_SURUMU} olmalı (bulunan: ${vt.semaSurumu}).`);
    if (typeof vt.surum !== 'string' || !/^\d+(\.\d+)*$/.test(vt.surum)) hatalar.push('surum "YYYY.AA.N" biçiminde olmalı.');
    if (typeof vt.olusturulma !== 'string' || isNaN(Date.parse(vt.olusturulma))) hatalar.push('olusturulma geçerli bir tarih olmalı.');

    const idKumesi = (liste, ad) => {
        if (!Array.isArray(liste)) {
            hatalar.push(`${ad} bir dizi olmalı.`);
            return new Set();
        }
        const kume = new Set();
        liste.forEach((oge, i) => {
            if (!oge || typeof oge.id !== 'string' || typeof oge.ad !== 'string') hatalar.push(`${ad}[${i}] için id ve ad gerekli.`);
            else if (kume.has(oge.id)) hatalar.push(`${ad} içinde tekrarlanan id: ${oge.id}`);
            else kume.add(oge.id);
        });
        return kume;
    };
    const konular = idKumesi(vt.konular, 'konular');
    const etiketler = idKumesi(vt.etiketler, 'etiketler');

    const kayitlariDogrula = (kayitlar, ad, anahtarKurali, anahtarAciklamasi) => {
        if (!kayitlar || typeof kayitlar !== 'object' || Array.isArray(kayitlar)) {
            hatalar.push(`${ad} bir nesne olmalı.`);
            return;
        }
        for (const [anahtar, kayit] of Object.entries(kayitlar)) {
            const yer = `${ad}["${anahtar}"]`;
            if (!anahtarKurali.test(anahtar)) hatalar.push(`${yer}: anahtar ${anahtarAciklamasi}.`);
            if (!kayit || typeof kayit !== 'object') {
                hatalar.push(`${yer}: kayıt bir nesne olmalı.`);
                continue;
            }
            if (kayit.anaKonu !== null && !konular.has(kayit.anaKonu)) hatalar.push(`${yer}: bilinmeyen anaKonu "${kayit.anaKonu}".`);
            for (const alan of KAYIT_ALANLARI) {
                if (!Array.isArray(kayit[alan])) {
                    hatalar.push(`${yer}: ${alan} bir dizi olmalı.`);
                    continue;
                }
                const gecerliIdler = alan.endsWith('Konular') ? konular : etiketler;
                kayit[alan].filter(id => !gecerliIdler.has(id)).forEach(id => hatalar.push(`${yer}: ${alan} içinde tanımsız id "${id}".`));
            }
            if (kayit.anaKonu === null && Array.isArray(kayit.kararsizKonular) && kayit.kararsizKonular.length > 0) {
                hatalar.push(`${yer}: anaKonu yokken kararsizKonular boş olmalı.`);
            }
            if (kayit.anaKonu === null && kayit.etiketler?.length === 0 && kayit.kararsizEtiketler?.length === 0) {
                hatalar.push(`${yer}: ne konusu ne etiketi olan kayıt dışa aktarılmamalı.`);
            }
        }
    };
    kayitlariDogrula(vt.videolar, 'videolar', /^[a-zA-Z0-9_-]{11}$/, '11 karakterlik video ID olmalı');
    kayitlariDogrula(vt.kanallar, 'kanallar', /^@[a-z0-9._-]+$/, 'küçük harfli @handle olmalı');

    return hatalar;
}

function degisiklikOzeti(eski, yeni) {
    const say = (a, b) => {
        const eskiKayitlar = a || {};
        const yeniKayitlar = b || {};
        let eklenen = 0, degisen = 0, silinen = 0;
        for (const id of Object.keys(yeniKayitlar)) {
            if (!(id in eskiKayitlar)) eklenen++;
            else if (JSON.stringify(eskiKayitlar[id]) !== JSON.stringify(yeniKayitlar[id])) degisen++;
        }
        for (const id of Object.keys(eskiKayitlar)) {
            if (!(id in yeniKayitlar)) silinen++;
        }
        return { eklenen, degisen, silinen, toplam: Object.keys(yeniKayitlar).length };
    };
    return { videolar: say(eski?.videolar, yeni.videolar), kanallar: say(eski?.kanallar, yeni.kanallar) };
}

function iceAktar(kaynakDosya, { zorla = false, hedefDosya = HEDEF_DOSYA } = {}) {
    const yeni = JSON.parse(fs.readFileSync(kaynakDosya, 'utf8'));
    const hatalar = dogrula(yeni);
    if (hatalar.length > 0) {
        throw new Error(`Doğrulama başarısız:\n  - ${hatalar.join('\n  - ')}`);
    }

    const eski = fs.existsSync(hedefDosya) ? JSON.parse(fs.readFileSync(hedefDosya, 'utf8')) : null;
    if (eski && !zorla && surumKarsilastir(yeni.surum, eski.surum) <= 0) {
        throw new Error(`Yeni sürüm (${yeni.surum}) mevcut sürümden (${eski.surum}) büyük olmalı. Yine de yazmak için --zorla kullanın.`);
    }

    fs.writeFileSync(hedefDosya, JSON.stringify(yeni, null, 2) + '\n');
    return { eskiSurum: eski?.surum || null, yeniSurum: yeni.surum, ozet: degisiklikOzeti(eski, yeni) };
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const kaynak = args.find(a => !a.startsWith('--'));
    if (!kaynak) {
        console.error('Kullanım: npm run db:import -- <dosya.json> [--zorla]');
        process.exit(1);
    }
    try {
        const sonuc = iceAktar(path.resolve(kaynak), { zorla: args.includes('--zorla') });
        console.log(`✓ Veritabanı güncellendi: ${sonuc.eskiSurum || '(yok)'} → ${sonuc.yeniSurum}`);
        for (const [tur, o] of Object.entries(sonuc.ozet)) {
            console.log(`  ${tur}: ${o.toplam} kayıt (+${o.eklenen} eklenen, ~${o.degisen} değişen, -${o.silinen} silinen)`);
        }
        console.log('Eklentiye yansıtmak için: npm run build');
    } catch (hata) {
        console.error(`✗ ${hata.message}`);
        process.exit(1);
    }
}

module.exports = { dogrula, surumKarsilastir, iceAktar };
