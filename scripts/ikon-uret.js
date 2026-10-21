#!/usr/bin/env node

/**
 * YouTube Filtreleyici - uzantı ve mağaza ikonlarını üretir.
 *
 * Bağımlılık yoktur: 4x süper örnekleme ile kırmızı-beyaz kalkan ikonu
 * çizip PNG olarak yazar (src/icons/icon{16,32,48,128}.png + store/icon-128.png).
 *
 * Kullanım: node scripts/ikon-uret.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CIKTI_DIR = path.join(__dirname, '..', 'src', 'icons');
const BOYUTLAR = [16, 32, 48, 128];
const ORNEKLEME = 4;

const KALKAN_KENAR = [153, 27, 27];     // #991B1B
const KALKAN_BEYAZ = [255, 255, 255];
const KALKAN_KIRMIZI = [239, 68, 68];   // #EF4444 (açık kırmızı)

// Üstü logaritmik sivrilen, omuzları kavisli büyük kalkan (0..1 koordinatları).
function kalkanNoktalari() {
    const tepeY = 0.04;
    const omuzY = 0.28;
    const omuzX = 0.90;
    const logK = 8;
    const adim = 24;
    const noktalar = [[0.50, tepeY]];

    // Merkez tepe -> sağ omuz: logaritmik genişleme.
    for (let i = 1; i <= adim; i++) {
        const t = i / adim;
        const y = tepeY + (omuzY - tepeY) * (Math.log1p(logK * t) / Math.log1p(logK));
        const x = 0.50 + t * (omuzX - 0.50);
        noktalar.push([x, y]);
    }

    // Sağ kenar ve alt uç.
    noktalar.push(
        [0.90, 0.52],
        [0.80, 0.70],
        [0.64, 0.84],
        [0.50, 0.96],
        [0.36, 0.84],
        [0.20, 0.70],
        [0.10, 0.52],
        [0.10, 0.28]
    );

    // Sol omuz -> merkez tepe (aynı logaritmik eğrinin aynası).
    for (let i = adim; i >= 1; i--) {
        const t = i / adim;
        const y = tepeY + (omuzY - tepeY) * (Math.log1p(logK * t) / Math.log1p(logK));
        const x = 0.50 - t * (omuzX - 0.50);
        noktalar.push([x, y]);
    }

    return noktalar;
}

const KALKAN_NOKTALARI = kalkanNoktalari();
const KALKAN_IC_ORANI = 0.93;
const KALKAN_IC_NOKTALARI = KALKAN_NOKTALARI.map(([x, y]) => [
    0.5 + (x - 0.5) * KALKAN_IC_ORANI,
    0.5 + (y - 0.5) * KALKAN_IC_ORANI
]);

function noktaPoligonda(x, y, noktalar) {
    let icinde = false;
    for (let i = 0, j = noktalar.length - 1; i < noktalar.length; j = i++) {
        const [xi, yi] = noktalar[i];
        const [xj, yj] = noktalar[j];
        const kesisiyor = (yi > y) !== (yj > y) &&
            x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (kesisiyor) icinde = !icinde;
    }
    return icinde;
}

function ikonPikselleri(boyut) {
    const S = boyut * ORNEKLEME;
    const ham = new Uint8Array(S * S * 4);

    for (let py = 0; py < S; py++) {
        for (let px = 0; px < S; px++) {
            const x = (px + 0.5) / S;
            const y = (py + 0.5) / S;
            const i = (py * S + px) * 4;

            if (!noktaPoligonda(x, y, KALKAN_NOKTALARI)) {
                ham[i + 3] = 0;
                continue;
            }

            // Dış kenar koyu kırmızı, içi çapraz dama (açık kırmızı + beyaz).
            let renk = KALKAN_KENAR;
            if (noktaPoligonda(x, y, KALKAN_IC_NOKTALARI)) {
                const solUst = x < 0.5 && y < 0.5;
                const sagAlt = x >= 0.5 && y >= 0.5;
                renk = (solUst || sagAlt) ? KALKAN_BEYAZ : KALKAN_KIRMIZI;
            }

            ham[i] = renk[0];
            ham[i + 1] = renk[1];
            ham[i + 2] = renk[2];
            ham[i + 3] = 255;
        }
    }

    // 4x süper örneklemeden hedef boyuta indir (alfa ağırlıklı ortalama)
    const cikti = new Uint8Array(boyut * boyut * 4);
    const ornek = ORNEKLEME * ORNEKLEME;

    for (let y = 0; y < boyut; y++) {
        for (let x = 0; x < boyut; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let sy = 0; sy < ORNEKLEME; sy++) {
                for (let sx = 0; sx < ORNEKLEME; sx++) {
                    const i = (((y * ORNEKLEME + sy) * S) + (x * ORNEKLEME + sx)) * 4;
                    const alfa = ham[i + 3];
                    r += ham[i] * alfa;
                    g += ham[i + 1] * alfa;
                    b += ham[i + 2] * alfa;
                    a += alfa;
                }
            }
            const j = (y * boyut + x) * 4;
            if (a > 0) {
                cikti[j] = Math.round(r / a);
                cikti[j + 1] = Math.round(g / a);
                cikti[j + 2] = Math.round(b / a);
                cikti[j + 3] = Math.round(a / ornek);
            }
        }
    }
    return cikti;
}

const CRC_TABLOSU = (() => {
    const tablo = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        tablo[n] = c >>> 0;
    }
    return tablo;
})();

function crc32(veri) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < veri.length; i++) c = CRC_TABLOSU[(c ^ veri[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

function parca(tur, veri) {
    const uzunluk = Buffer.alloc(4);
    uzunluk.writeUInt32BE(veri.length, 0);
    const govde = Buffer.concat([Buffer.from(tur, 'ascii'), veri]);
    const kontrol = Buffer.alloc(4);
    kontrol.writeUInt32BE(crc32(govde), 0);
    return Buffer.concat([uzunluk, govde, kontrol]);
}

function pngOlustur(boyut, pikseller) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(boyut, 0);
    ihdr.writeUInt32BE(boyut, 4);
    ihdr[8] = 8;   // bit derinliği
    ihdr[9] = 6;   // RGBA
    ihdr[10] = 0;  // deflate
    ihdr[11] = 0;  // adaptif filtre
    ihdr[12] = 0;  // interlace yok

    const satir = boyut * 4;
    const ham = Buffer.alloc((satir + 1) * boyut);
    for (let y = 0; y < boyut; y++) {
        ham[y * (satir + 1)] = 0; // filtre türü: none
        Buffer.from(pikseller.buffer, pikseller.byteOffset + y * satir, satir)
            .copy(ham, y * (satir + 1) + 1);
    }

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        parca('IHDR', ihdr),
        parca('IDAT', zlib.deflateSync(ham, { level: 9 })),
        parca('IEND', Buffer.alloc(0))
    ]);
}

fs.mkdirSync(CIKTI_DIR, { recursive: true });
for (const boyut of BOYUTLAR) {
    const dosya = path.join(CIKTI_DIR, `icon${boyut}.png`);
    fs.writeFileSync(dosya, pngOlustur(boyut, ikonPikselleri(boyut)));
    console.log(`✓ ${path.relative(path.join(__dirname, '..'), dosya)} (${boyut}x${boyut})`);
}

// Chrome Web Store ikonu: 96x96 görsel + her kenarda 16 px saydam boşluk.
// Manifest ikonu tam taşlı kalır; mağazaya bu dosya yüklenir.
const STORE_DIR = path.join(__dirname, '..', 'store');
const STORE_IKON = path.join(STORE_DIR, 'icon-128.png');
const IC_BOYUT = 96;
const BOSLUK = 16;

function storeIkonPikselleri() {
    const ic = ikonPikselleri(IC_BOYUT);
    const cikti = new Uint8Array(128 * 128 * 4);
    for (let y = 0; y < IC_BOYUT; y++) {
        for (let x = 0; x < IC_BOYUT; x++) {
            const kaynak = (y * IC_BOYUT + x) * 4;
            const hedef = ((y + BOSLUK) * 128 + (x + BOSLUK)) * 4;
            cikti[hedef] = ic[kaynak];
            cikti[hedef + 1] = ic[kaynak + 1];
            cikti[hedef + 2] = ic[kaynak + 2];
            cikti[hedef + 3] = ic[kaynak + 3];
        }
    }
    return cikti;
}

fs.mkdirSync(STORE_DIR, { recursive: true });
fs.writeFileSync(STORE_IKON, pngOlustur(128, storeIkonPikselleri()));
console.log(`✓ ${path.relative(path.join(__dirname, '..'), STORE_IKON)} (128x128, 96x96 görsel + 16 px boşluk)`);
