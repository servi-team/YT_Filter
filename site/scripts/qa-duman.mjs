// Çalışan siteye HTTP istekleri atar. Gerçek tarayıcı/ekran okuyucu testinin yerini TUTMAZ.
const taban = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const hatalar = [];
const sayfalar = [
  ['/', ['YouTube Filter Store', 'Nasıl çalışır']],
  ['/kesfet', ['Keşfet']],
  ['/giris', ['Giriş']],
  ['/gizlilik', ['30 gün', '1 yıl', 'eklenti']],
  ['/kosullar', ['Kullanım Koşulları']],
  ['/iletisim', ['GitHub Issues']],
];

for (const [yol, metinler] of sayfalar) {
  let r;
  try {
    r = await fetch(taban + yol);
  } catch {
    hatalar.push(`${yol}: bağlantı yok (sunucu çalışıyor mu?)`);
    continue;
  }
  const html = await r.text();
  if (r.status !== 200) hatalar.push(`${yol}: HTTP ${r.status}`);
  if (!/<html[^>]*lang="tr"/.test(html)) hatalar.push(`${yol}: lang="tr" yok`);
  if (!/href="#icerik"/.test(html)) hatalar.push(`${yol}: atlama bağlantısı yok`);
  if (!/<main[^>]*id="icerik"/.test(html)) hatalar.push(`${yol}: main#icerik yok`);
  if ((html.match(/<h1\b/g) ?? []).length !== 1) hatalar.push(`${yol}: tek h1 yok`);
  for (const metin of metinler) if (!html.includes(metin)) hatalar.push(`${yol}: "${metin}" yok`);
  if (/fonts\.googleapis|fonts\.gstatic/.test(html)) hatalar.push(`${yol}: üçüncü taraf font isteği`);
  if (/tarayici_id|ip_ozeti|gizli-cerez/.test(html)) hatalar.push(`${yol}: ham kimlik alanı sızdı`);
}

let db;
try {
  db = await fetch(taban + '/db.json');
} catch {
  hatalar.push('/db.json: bağlantı yok');
}
if (db) {
  if (db.status === 404) console.log('Bilgi: /db.json henüz yayınlanmamış (404).');
  else if (db.status !== 200) hatalar.push(`/db.json: HTTP ${db.status}`);
  else {
    const json = await db.json().catch(() => null);
    if (!json || json.sema !== 1 || !Array.isArray(json.kanallar) || !Array.isArray(json.videolar)) {
      hatalar.push('/db.json: sema 1 / kanallar / videolar geçersiz');
    }
  }
}

if (hatalar.length) {
  console.error('QA dumanı BAŞARISIZ:');
  for (const hata of hatalar) console.error(`- ${hata}`);
  process.exitCode = 1;
} else {
  console.log(`QA dumanı geçti: ${sayfalar.length} sayfa + /db.json (${taban}).`);
}
