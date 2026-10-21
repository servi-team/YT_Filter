#!/usr/bin/env node

/**
 * YouTube Filtreleyici - mağaza tanıtım görseli üretir.
 *
 * 440x280 küçük tanıtım karesini (Chrome Web Store) yerel Chrome/Edge ile
 * headless olarak render eder. Çıktı: store/promo-440x280.png
 *
 * Kullanım: node scripts/store-gorsel.js
 * Chrome yolu: CHROME_PATH ortam değişkeni veya standart kurulum yolları.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const KOK = path.join(__dirname, '..');
const STORE = path.join(KOK, 'store');
const IKON = path.join(KOK, 'src', 'icons', 'icon128.png');
const STORE_IKON = path.join(STORE, 'icon-128.png');
const HTML = path.join(STORE, 'promo.html');
const CIKTI = path.join(STORE, 'promo-440x280.png');

const CHROME_YOLLARI = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);

function tarayiciBul() {
    for (const yol of CHROME_YOLLARI) {
        if (fs.existsSync(yol)) return yol;
    }
    throw new Error('Chrome/Edge bulunamadı. CHROME_PATH ortam değişkenini ayarlayın.');
}

function dosyaUrl(yol) {
    return 'file:///' + yol.replace(/\\/g, '/').replace(/ /g, '%20');
}

const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 440px; height: 280px; overflow: hidden; }
  body {
    font-family: "Segoe UI", system-ui, sans-serif;
    background: linear-gradient(135deg, #4338ca 0%, #6366f1 60%, #818cf8 100%);
    color: #fff;
    display: flex;
    align-items: center;
    gap: 22px;
    padding: 28px 30px;
  }
  .ikon {
    width: 132px; height: 132px;
    filter: drop-shadow(0 12px 20px rgba(0,0,0,.32));
    flex: 0 0 auto;
  }
  h1 { margin: 0 0 6px; font-size: 27px; line-height: 1.12; letter-spacing: -.4px; }
  p { margin: 0; font-size: 13.5px; line-height: 1.35; color: rgba(255,255,255,.9); }
  .etiketler { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
  .etiket {
    font-size: 10.5px; font-weight: 600; padding: 4px 8px; border-radius: 999px;
    background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.22);
  }
  .alt { position: absolute; left: 30px; bottom: 18px; font-size: 10.5px; color: rgba(255,255,255,.72); }
</style>
</head>
<body>
  <img class="ikon" src="${dosyaUrl(IKON)}" alt="">
  <div>
    <h1>YouTube<br>Filtreleyici</h1>
    <p>Konu ve etiketlere göre filtrele.<br>İstisnalar sende kalsın.</p>
    <div class="etiketler">
      <span class="etiket">3 mod</span>
      <span class="etiket">Beyaz / kara liste</span>
      <span class="etiket">PIN kilidi</span>
    </div>
  </div>
  <div class="alt">youtube.com · Chromium + Firefox</div>
</body>
</html>`;

fs.mkdirSync(STORE, { recursive: true });
fs.writeFileSync(HTML, html, 'utf8');
// Mağaza ikonunu `npm run ikon` üretir (96x96 görsel + saydam çerçeve).
// Komut atlanmışsa tam taşlı ikonla devam et; yükleme öncesi `npm run ikon` çalıştırılmalı.
if (!fs.existsSync(STORE_IKON)) fs.copyFileSync(IKON, STORE_IKON);

const tarayici = tarayiciBul();
const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'ytf-store-'));

try {
    execFileSync(tarayici, [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        '--no-default-browser-check',
        `--user-data-dir=${profil}`,
        '--force-device-scale-factor=1',
        '--window-size=440,280',
        `--screenshot=${CIKTI}`,
        dosyaUrl(HTML)
    ], { stdio: 'ignore', timeout: 60000 });
} finally {
    fs.rmSync(profil, { recursive: true, force: true });
}

if (!fs.existsSync(CIKTI)) throw new Error('Görsel üretilemedi: ' + CIKTI);
const png = fs.readFileSync(CIKTI);
const genislik = png.readUInt32BE(16);
const yukseklik = png.readUInt32BE(20);
console.log(`✓ ${path.relative(KOK, CIKTI)} (${genislik}x${yukseklik})`);
console.log(`✓ ${path.relative(KOK, STORE_IKON)}`);
