#!/usr/bin/env node

/**
 * YouTube Filtreleyici - kalkan ikonlarını üretir.
 *
 * Bağımlılık yoktur: 4x süper örnekleme ile "Sinyal Kalkanı" işaretini çizip
 * PNG olarak yazar:
 *   src/icons/icon{16,32,48,128}.png   (manifest ikonları, tam taşlı)
 *   store/icon-128.png                 (96x96 görsel + 16 px saydam çerçeve)
 *   site/public/ikon{16,32,48,128}.png (site favicon'ları)
 *   site/app/icon.png                  (32 px Next.js ikonu)
 *   site/app/apple-icon.png            (180 px Apple dokunma ikonu)
 *   site/public/kalkan.svg             (aynı geometrinin SVG kaynağı)
 *
 * Tasarım dili: iki beyaz çeyrekli, ince koyu kenarlı kırmızı kalkan; zemin
 * tamamen saydamdır. 16 px'te kenar ve çeyrekler okunur kalacak biçimde
 * kenar kalınlığı küçük boyutlarda optik olarak artırılır.
 *
 * Kullanım: node scripts/ikon-uret.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const KOK = path.join(__dirname, '..');
const CIKTI_DIR = path.join(KOK, 'src', 'icons');
const BOYUTLAR = [16, 32, 48, 128];
const ORNEKLEME = 4;

const MAGAZA_DIR = path.join(KOK, 'store');
const MAGAZA_IKON = path.join(MAGAZA_DIR, 'icon-128.png');
const GORSEL_BOYUT = 96; // mağaza ikonundaki görsel kısım (128 - 2*16 boşluk)
const BOSLUK = 16;

const SITE_DIR = path.join(KOK, 'site');
const SITE_PUBLIC = path.join(SITE_DIR, 'public');
const SITE_APP = path.join(SITE_DIR, 'app');

// S1 paleti: gövde sinyal kırmızısı, kenar koyu sinyal, çeyrekler sıcak beyaz.
const RENK_GOVDE = [201, 52, 43];    // #C9342B
const RENK_KENAR = [152, 37, 31];    // #98251F
const RENK_CEYREK = [255, 253, 248]; // #FFFDF8

const GOVDE_D =
    'M64 6C84 14 104 19 120 22V58C120 91 99 112 64 124C29 112 8 91 8 58V22C24 19 44 14 64 6Z';
const SOL_UST_D = 'M8 22C24 19 44 14 64 6V64H8V22Z';
const SAG_ALT_D = 'M64 64H120V58C120 91 99 112 64 124V64Z';

// ---------- geometri yardımcıları ----------

const BEZIER_ORNEK = 32;

// Kübik Bezier örneklemesi -> polilinea noktaları.
function bezier(p0, c1, c2, p1, ornek = BEZIER_ORNEK) {
    const noktalar = [];
    for (let i = 0; i <= ornek; i++) {
        const t = i / ornek, u = 1 - t;
        const x = u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0];
        const y = u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1];
        noktalar.push([x, y]);
    }
    return noktalar;
}

function ayniNokta(a, b) {
    return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
}

function noktalariBirlestir(...parcalar) {
    const sonuc = [];
    for (const parca of parcalar) {
        for (const nokta of parca) {
            if (!sonuc.length || !ayniNokta(sonuc[sonuc.length - 1], nokta)) sonuc.push(nokta);
        }
    }
    return sonuc;
}

// Kapalı çokgende son nokta ilk noktayla aynıysa tekrarı kaldır.
function kapat(noktalar) {
    if (noktalar.length > 1 && ayniNokta(noktalar[0], noktalar[noktalar.length - 1])) {
        noktalar.pop();
    }
    return noktalar;
}

const GOVDE = kapat(noktalariBirlestir(
    [[64, 6]],
    bezier([64, 6], [84, 14], [104, 19], [120, 22]),
    [[120, 58]],
    bezier([120, 58], [120, 91], [99, 112], [64, 124]),
    bezier([64, 124], [29, 112], [8, 91], [8, 58]),
    [[8, 22]],
    bezier([8, 22], [24, 19], [44, 14], [64, 6])
));

const SOL_UST = kapat(noktalariBirlestir(
    [[8, 22]],
    bezier([8, 22], [24, 19], [44, 14], [64, 6]),
    [[64, 64]],
    [[8, 64]]
));

const SAG_ALT = kapat(noktalariBirlestir(
    [[64, 64]],
    [[120, 64]],
    [[120, 58]],
    bezier([120, 58], [120, 91], [99, 112], [64, 124]),
    [[64, 64]]
));

// Nokta -> çizgi parçası uzaklığı.
function cizgiUzaklik(px, py, ax, ay, bx, by) {
    const ex = bx - ax, ey = by - ay;
    const wx = px - ax, wy = py - ay;
    const dd = ex * ex + ey * ey;
    const t = dd > 0 ? Math.max(0, Math.min(1, (wx * ex + wy * ey) / dd)) : 0;
    const dx = wx - ex * t, dy = wy - ey * t;
    return Math.sqrt(dx * dx + dy * dy);
}

// Çokgene imzalı uzaklık: en yakın kenar + even-odd taraftalık.
function cokgenUzaklik(x, y, noktalar) {
    let d = Infinity;
    let icinde = false;
    for (let i = 0, j = noktalar.length - 1; i < noktalar.length; j = i++) {
        const [xi, yi] = noktalar[i], [xj, yj] = noktalar[j];
        d = Math.min(d, cizgiUzaklik(x, y, xi, yi, xj, yj));
        if ((yi > y) !== (yj > y)) {
            if (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) icinde = !icinde;
        }
    }
    return icinde ? -d : d;
}

function noktaPoligonda(x, y, noktalar) {
    let icinde = false;
    for (let i = 0, j = noktalar.length - 1; i < noktalar.length; j = i++) {
        const [xi, yi] = noktalar[i], [xj, yj] = noktalar[j];
        if ((yi > y) !== (yj > y)) {
            if (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) icinde = !icinde;
        }
    }
    return icinde;
}

// ---------- optik kenar kalınlığı ----------

// SVG birimleri 128'lik viewBox'ta; küçük boyutlarda kenarın kaybolmaması için
// birim kalınlık artırılır, 48 px ve üstünde ince marka çizgisi korunur.
function kenarKalinligi(boyut) {
    if (boyut <= 16) return 7.5;   // ~0.94 px
    if (boyut <= 32) return 5.6;   // ~1.40 px
    if (boyut <= 48) return 4.5;   // ~1.69 px
    if (boyut <= 96) return 3.3;   // ~2.48 px
    return 2.5;                    // 128'de 2.5 px, 180'de 3.5 px
}

// ---------- piksel tarayıcı: katman katman bileştirme ----------

// 128'lik viewBox'ta tek bir örnek noktasının RGBA'sı (doğrudan alfa, 0..1).
function ornekRGBA(x, y, kenar) {
    const yari = kenar / 2;

    // Gövdenin kaba sınırları dışındaki örnekleri erkenden ele.
    if (x < 8 - yari || x > 120 + yari || y < 6 - yari || y > 124 + yari) {
        return [0, 0, 0, 0];
    }

    const d = cokgenUzaklik(x, y, GOVDE);
    if (d > yari) return [0, 0, 0, 0];

    let r = 0, g = 0, b = 0, a = 0;
    const uyg = (cr, cg, cb, ca) => {
        r = cr * ca + r * (1 - ca);
        g = cg * ca + g * (1 - ca);
        b = cb * ca + b * (1 - ca);
        a = ca + a * (1 - ca);
    };

    if (d <= 0) {
        // 1) Gövde: düz sinyal kırmızısı.
        uyg(RENK_GOVDE[0], RENK_GOVDE[1], RENK_GOVDE[2], 1);

        // 2) İki beyaz çeyrek: sol üst ve sağ alt; gövdeyle kırpılır.
        const solUst = x <= 64 && y <= 64 && noktaPoligonda(x, y, SOL_UST);
        const sagAlt = x >= 64 && y >= 58 && noktaPoligonda(x, y, SAG_ALT);
        if (solUst || sagAlt) {
            uyg(RENK_CEYREK[0], RENK_CEYREK[1], RENK_CEYREK[2], 1);
        }
    }

    // 3) İnce koyu kenar: gövde sınırının iki yanına yarım kalınlık taşar.
    if (Math.abs(d) <= yari) {
        uyg(RENK_KENAR[0], RENK_KENAR[1], RENK_KENAR[2], 1);
    }

    return [r, g, b, a];
}

// Hedef boyutta pikseller (ORNEKLEME kat süper örnekleme + alfa küçültme).
function ikonPikselleri(boyut) {
    const kenar = kenarKalinligi(boyut);
    const S = boyut * ORNEKLEME;
    const olcek = 128 / S;
    const ham = new Float64Array(S * S * 4);

    for (let py = 0; py < S; py++) {
        for (let px = 0; px < S; px++) {
            const x = (px + 0.5) * olcek;
            const y = (py + 0.5) * olcek;
            const [r, g, b, alfa] = ornekRGBA(x, y, kenar);
            const i = (py * S + px) * 4;
            ham[i] = r; ham[i + 1] = g; ham[i + 2] = b; ham[i + 3] = alfa * 255;
        }
    }

    const cikti = new Uint8Array(boyut * boyut * 4);
    const ornekAdet = ORNEKLEME * ORNEKLEME;

    for (let y = 0; y < boyut; y++) {
        for (let x = 0; x < boyut; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let sy = 0; sy < ORNEKLEME; sy++) {
                for (let sx = 0; sx < ORNEKLEME; sx++) {
                    const i = (((y * ORNEKLEME + sy) * S) + (x * ORNEKLEME + sx)) * 4;
                    const A = ham[i + 3];
                    r += ham[i] * A; g += ham[i + 1] * A; b += ham[i + 2] * A; a += A;
                }
            }
            const j = (y * boyut + x) * 4;
            if (a > 0) {
                cikti[j] = Math.round(r / a);
                cikti[j + 1] = Math.round(g / a);
                cikti[j + 2] = Math.round(b / a);
                cikti[j + 3] = Math.round(a / ornekAdet);
            }
        }
    }
    return cikti;
}

// ---------- PNG yazıcı ----------

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

// ---------- mağaza çerçevesi ----------

// Chrome Web Store ikonu: 96x96 görsel + her kenarda 16 px saydam boşluk.
function magazaIkonPikselleri() {
    const ic = ikonPikselleri(GORSEL_BOYUT);
    const cikti = new Uint8Array(128 * 128 * 4);
    for (let y = 0; y < GORSEL_BOYUT; y++) {
        for (let x = 0; x < GORSEL_BOYUT; x++) {
            const kaynak = (y * GORSEL_BOYUT + x) * 4;
            const hedef = ((y + BOSLUK) * 128 + (x + BOSLUK)) * 4;
            cikti[hedef] = ic[kaynak];
            cikti[hedef + 1] = ic[kaynak + 1];
            cikti[hedef + 2] = ic[kaynak + 2];
            cikti[hedef + 3] = ic[kaynak + 3];
        }
    }
    return cikti;
}

// Dış 16 px halkasının her pikselinde alfa tam olarak 0 mı?
function cerceveDogrula(pikseller, boyut, cerceve) {
    for (let y = 0; y < boyut; y++) {
        for (let x = 0; x < boyut; x++) {
            const halkada = x < cerceve || x >= boyut - cerceve || y < cerceve || y >= boyut - cerceve;
            if (halkada && pikseller[(y * boyut + x) * 4 + 3] !== 0) {
                return `şeffaf olmayan piksel: (${x}, ${y})`;
            }
        }
    }
    return null;
}

// ---------- çıktılar ----------

const onbellek = new Map();
function pikseller(boyut) {
    if (!onbellek.has(boyut)) onbellek.set(boyut, ikonPikselleri(boyut));
    return onbellek.get(boyut);
}

function pngYaz(dosya, boyut) {
    fs.mkdirSync(path.dirname(dosya), { recursive: true });
    fs.writeFileSync(dosya, pngOlustur(boyut, pikseller(boyut)));
    console.log(`✓ ${path.relative(KOK, dosya)} (${boyut}x${boyut})`);
}

function svgYaz(dosya) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="YouTube Filter Store kalkanı" shape-rendering="geometricPrecision">
  <title>YouTube Filter Store</title>
  <defs>
    <clipPath id="kalkan-govde">
      <path d="${GOVDE_D}" />
    </clipPath>
  </defs>
  <path d="${GOVDE_D}" fill="#C9342B" />
  <g clip-path="url(#kalkan-govde)">
    <path d="${SOL_UST_D}" fill="#FFFDF8" />
    <path d="${SAG_ALT_D}" fill="#FFFDF8" />
  </g>
  <path d="${GOVDE_D}" fill="none" stroke="#98251F" stroke-width="5" stroke-linejoin="round" />
</svg>
`;
    fs.mkdirSync(path.dirname(dosya), { recursive: true });
    fs.writeFileSync(dosya, svg);
    console.log(`✓ ${path.relative(KOK, dosya)}`);
}

fs.mkdirSync(CIKTI_DIR, { recursive: true });
for (const boyut of BOYUTLAR) {
    pngYaz(path.join(CIKTI_DIR, `icon${boyut}.png`), boyut);
}

// Uzantı ikonlarıyla aynı tam taşlı işaret site favicon'larında da kullanılır.
for (const boyut of BOYUTLAR) {
    pngYaz(path.join(SITE_PUBLIC, `ikon${boyut}.png`), boyut);
}

pngYaz(path.join(SITE_APP, 'icon.png'), 32);
pngYaz(path.join(SITE_APP, 'apple-icon.png'), 180);
svgYaz(path.join(SITE_PUBLIC, 'kalkan.svg'));

const magaza = magazaIkonPikselleri();
const cerceveHatasi = cerceveDogrula(magaza, 128, BOSLUK);
if (cerceveHatasi) {
    process.exitCode = 1;
    throw new Error(`Mağaza ikonunun 16 px şeffaf çerçevesi ihlal edildi: ${cerceveHatasi}`);
}
fs.mkdirSync(MAGAZA_DIR, { recursive: true });
fs.writeFileSync(MAGAZA_IKON, pngOlustur(128, magaza));
console.log(`✓ ${path.relative(KOK, MAGAZA_IKON)} (128x128, 96x96 görsel + 16 px şeffaf çerçeve tamam)`);
