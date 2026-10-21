# YouTube Filtreleyici

YouTube'u **konu ve etiketlere** göre filtreleyen, kullanıcıya kanal/video istisnaları ve isteğe bağlı PIN kilidi sunan Chromium + Firefox uzantısı.

> Durum: **2.0.0 geliştirme dalı.** Kod ve Node/jsdom testleri hazır; gerçek tarayıcı doğrulaması ile mağaza yüklemesi henüz yapılmadı. Ayrıntılı durum: [`DEVIR_NOTU.md`](DEVIR_NOTU.md) ve [`PLAN.md`](PLAN.md).

## Özellikler

- **Üç mod:** Serbest / Orta / Katı.
- **Konu ve etiket kuralları:** her konu/etiket için izin ver, gizle, bulanıklaştır veya uyarı sayfası göster.
- **İstisnalar:** beyaz liste, kara liste ve özel listeler; kanal/video bazında kuralı geçersiz kılma.
- **Hızlı istisna:** pop-up'ta geçerli sayfanın kararını ve sebebini görüp tek tıkla istisna ekleme.
- **Kanal bilgileri:** sayfadan eklenen kanalların adı ve avatarı listede gösterilir.
- **İçe/dışa aktarma:** liste paketleri, tam ayar yedeği ve isteğe bağlı `db.json` veritabanı.
- **PIN kilidi:** yalnızca arayüz kilididir; PIN düz metin değil, PBKDF2-SHA256 karması olarak saklanır.

## Kurulum (geliştirici)

Gereksinim: **Node.js 20 veya üzeri** (smoke testleri için).

```bash
npm install
npm run build
```

- **Chrome/Chromium:** `chrome://extensions` → Geliştirici modu → **Paketlenmemiş yükle** → `chromium/`
- **Firefox:** `about:debugging#/runtime/this-firefox` → **Geçici olarak yükle** → `firefox/manifest.json`

Kaynak her zaman `src/` altındadır. `chromium/` ve `firefox/` derleme çıktısıdır; doğrudan düzenlemeyin. Çıktılar repoda izlenir ve `npm test` içindeki derleme kontrolü sayesinde kaynakla güncel kalır. Her değişiklikten sonra `npm run build` çalıştırıp uzantıyı yeniden yükleyin.

## Test

```bash
npm test                 # tüm testler (saf + jsdom smoke + derleme güncellik kontrolü)
node --test tests/pin.test.js
npm run build:check      # chromium/ + firefox/ src ile uyumlu mu?
```

- Saf modüller Node'un yerleşik test koşucusuyla test edilir.
- Arayüz ve içerik betiği jsdom + sahte `chrome.*` ile test edilir (`tests/smoke/`).
- Smoke testleri gerçek tarayıcı doğrulamasının yerini **tutmaz**.

## Proje yapısı

```text
src/                 uzantı kaynakları (background, content, options, core/, data/, icons/)
manifests/           Chromium ve Firefox manifestleri
scripts/build.js     src/ + manifest -> chromium/ ve firefox/
scripts/ikon-uret.js uzantı ikonlarını üretir (npm run ikon)
scripts/gorsel-1280x800.ps1  mağaza ekran görüntülerini 1280x800'e ortalar
tests/               Node testleri + tests/smoke/ (jsdom)
docs/                sistem tasarımı, db şeması, mağaza ve gizlilik belgeleri
```

## Belgeler

- [`docs/SISTEM_TASARIMI.md`](docs/SISTEM_TASARIMI.md) — ürün kurallarının tek kaynağı.
- [`docs/db-sema.md`](docs/db-sema.md) — `db.json` sözleşmesi.
- [`docs/MAGAZA_HAZIRLIK.md`](docs/MAGAZA_HAZIRLIK.md) — mağaza metinleri, görseller, sürüm akışı.
- [`docs/MAGAZA_ELLE.md`](docs/MAGAZA_ELLE.md) — tarayıcı testi, ekran görüntüsü, video ve yükleme adımları.
- [`docs/SITE_HAZIRLIK.md`](docs/SITE_HAZIRLIK.md) — site rolleri, onaylanan kararlar, "Bildir" sözleşmesi.
- [`docs/puan-sistemi-onerisi.md`](docs/puan-sistemi-onerisi.md) — onaylı puan kurallarının uygulama notu.
- [`docs/GIZLILIK.md`](docs/GIZLILIK.md) — gizlilik politikası.
- [`CHANGELOG.md`](CHANGELOG.md) — sürüm geçmişi.
- [`DEVIR_NOTU.md`](DEVIR_NOTU.md) — mimari, bilinen sınırlar, devir notları.

## Gizlilik

Uzantı hiçbir kişisel veri toplamaz, sunucuya göndermez ve satmaz. Ayarlar, listeler, PIN karması, sayfadan toplanan kanal adı/avatarı ve isteğe bağlı `db.json` kopyası yalnızca tarayıcının yerel deposunda tutulur. Ayrıntılar: [`docs/GIZLILIK.md`](docs/GIZLILIK.md).

## Sürümleme

Sürüm numarası üç yerde eşit tutulur: `package.json`, `manifests/manifest.chromium.json`, `manifests/manifest.firefox.json`. `tests/manifest.test.js` bunu denetler. Yayın akışı için `docs/MAGAZA_HAZIRLIK.md` bölüm 5, elle yapılacaklar için `docs/MAGAZA_ELLE.md`.

## Lisans

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). Bu proje YouTube'un resmî bir ürünü değildir.
