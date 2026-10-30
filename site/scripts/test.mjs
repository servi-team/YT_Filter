/**
 * Test dosyalarını kendi Node süreçlerinde çalıştırır. Her dosya kendi geçici
 * PGlite veritabanını kurduğu için dosyalar birbirinden bağımsızdır; bu yüzden
 * varsayılan olarak 4 eşzamanlı işçi kullanılır. Dosyalar doğrudan çalıştırılır;
 * araya `node --test` üst süreci girmez. stdin kapalıdır ve her dosyanın
 * zaman aşımı vardır, böylece tek bir takılma paketi kilitlemez.
 *
 * TEST_ESZAMANLILIK=1 ile seri çalıştırılabilir.
 */
import { readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

// PGlite (WASM) Windows'ta Node 23/25 gibi destek dışı tek sürümlerde
// başlatma sırasında kilitlenebiliyor. Yalnızca LTS çift sürümleri kabul et.
const [anaSurum, altSurum] = process.versions.node.split('.').map(Number);
const ltsSurum = anaSurum >= 22 && anaSurum % 2 === 0
  && (anaSurum > 22 || altSurum >= 18);
if (!ltsSurum) {
  console.error(
    `Desteklenmeyen Node sürümü: v${process.versions.node}.\n`
    + 'Testler PGlite (WASM) kullanır; Node 23/25 gibi destek dışı tek sürümlerde\n'
    + 'Windows\'ta başlatma kilitlenebiliyor. Node 22 LTS (22.18+) veya 24 LTS kullanın.\n'
    + 'Proje sürümü: .nvmrc (22.23.4)',
  );
  process.exit(1);
}

const testKlasoru = path.resolve('tests');
const dosyalar = readdirSync(testKlasoru)
  .filter((dosya) => dosya.endsWith('.test.ts'))
  .sort();

if (dosyalar.length === 0) {
  console.error('Test dosyası bulunamadı.');
  process.exit(1);
}

const zamanAsimiMs = Number(process.env.TEST_ZAMAN_ASIMI_MS ?? 60_000);
const istenenEsZamanlilik = Number(process.env.TEST_ESZAMANLILIK ?? 4);
const esZamanlilik = Math.max(1, Math.min(istenenEsZamanlilik, dosyalar.length));
const baslangic = Date.now();
const sonuclar = new Array(dosyalar.length);
let sonraki = 0;

function calistir(dosya) {
  return new Promise((cozum) => {
    const yol = path.join('tests', dosya);
    const alt = spawn(process.execPath, [yol], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    const bas = Date.now();
    let cikti = '';
    let zamanAsimi = false;
    let kapandi = false;

    alt.stdout.setEncoding('utf8');
    alt.stderr.setEncoding('utf8');
    alt.stdout.on('data', (parca) => { cikti += parca; });
    alt.stderr.on('data', (parca) => { cikti += parca; });

    const bitir = (kod, hata) => {
      if (kapandi) return;
      kapandi = true;
      cozum({ dosya, kod, cikti, hata, zamanAsimi, sure: (Date.now() - bas) / 1000 });
    };

    const zamanlayici = setTimeout(() => {
      zamanAsimi = true;
      alt.kill('SIGKILL');
    }, zamanAsimiMs);

    alt.on('error', (hata) => {
      clearTimeout(zamanlayici);
      bitir(null, hata.message);
    });
    alt.on('close', (kod) => {
      clearTimeout(zamanlayici);
      bitir(kod);
    });
  });
}

async function isci() {
  while (true) {
    const sira = sonraki;
    sonraki += 1;
    if (sira >= dosyalar.length) return;

    const sonuc = await calistir(dosyalar[sira]);
    sonuclar[sira] = sonuc;

    const basarili = sonuc.kod === 0 && !sonuc.zamanAsimi;
    const etiket = sonuc.zamanAsimi
      ? '✖ zaman aşımı'
      : basarili ? '✔' : `✖ çıkış ${sonuc.kod ?? 'bilinmiyor'}`;
    console.log(`${etiket} ${sonuc.dosya} (${sonuc.sure.toFixed(1)} sn)`);

    if (!basarili) {
      const detay = [sonuc.cikti.trimEnd(), sonuc.hata].filter(Boolean).join('\n');
      if (detay) console.log(detay);
    }
  }
}

await Promise.all(Array.from({ length: esZamanlilik }, isci));

const testSayisi = { gecen: 0, kalan: 0 };
for (const sonuc of sonuclar) {
  for (const eslesme of sonuc.cikti.matchAll(/^# pass (\d+)$/gm)) {
    testSayisi.gecen += Number(eslesme[1]);
  }
  for (const eslesme of sonuc.cikti.matchAll(/^# fail (\d+)$/gm)) {
    testSayisi.kalan += Number(eslesme[1]);
  }
}

const basarisizDosya = sonuclar.filter((sonuc) => !sonuc
  || sonuc.zamanAsimi || sonuc.kod !== 0).length;
const sure = ((Date.now() - baslangic) / 1000).toFixed(1);

if (basarisizDosya > 0) {
  console.error(
    `\n${basarisizDosya}/${dosyalar.length} test dosyası başarısız, `
    + `${testSayisi.gecen} test geçti, ${testSayisi.kalan} test kaldı (${sure} sn).`,
  );
  process.exit(1);
}

console.log(
  `\n${dosyalar.length}/${dosyalar.length} test dosyası geçti, `
  + `${testSayisi.gecen} test (${sure} sn, ${esZamanlilik} eşzamanlı).`,
);
