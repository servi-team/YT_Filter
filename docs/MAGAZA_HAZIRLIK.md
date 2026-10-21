# Mağaza Hazırlığı — YouTube Filtreleyici

> Son güncelleme: 2026-10-21. Bu belge, eklentiyi Chrome Web Store ve Firefox Add-ons (AMO) mağazalarına yüklemek için gereken metinleri, görselleri, form cevaplarını ve sürüm akışını toplar.
> Ekran görüntüleri, video ve gerçek mağaza hesapları tarayıcı/hesap gerektirir; adım adım elle yapılacaklar için **`docs/MAGAZA_ELLE.md`** dosyasını kullanın.

## 1. Mağaza listeleme metinleri

**Ad:** YouTube Filtreleyici

**Kısa açıklama (Chrome sınırı: 132 karakter — manifest `description` ile aynı olmalı):**
> YouTube'u konu ve etiketlere göre filtreler; kanal/video istisnaları, kararsız içerik seçimi ve PIN kilidi.

**Uzun açıklama:**

> YouTube Filtreleyici, YouTube'da karşılaştığınız videoları konu ve etiketlere göre süzer. Amaç, sizi rahatsız eden içerikten uzak durmanızı sağlarken karar yetkisini sizde bırakmaktır.
>
> **Nasıl çalışır?**
> - **Kural katmanı (Filtre sekmesi):** Modunuzu (Serbest / Orta / Katı), izin verdiğiniz konuları, engellediğiniz etiketleri ve her biri için eylemi (Gizle / Bulanıklaştır / Uyarı sayfası) seçersiniz.
> - **Veri katmanı:** İçeriklerin konu ve etiketleri eklentiyle gelen gömülü veritabanından okunur; Sistem sekmesinden kendi `db.json` dosyanızı içe aktarabilirsiniz.
> - **İstisna katmanı:** Tek tek kanalları veya videoları "Her zaman izin ver / Her zaman engelle" listelerine ekleyerek kuralı geçersiz kılabilirsiniz. Kanal eklerken adı ve avatarı sayfadan otomatik toplanır.
>
> **Öne çıkanlar**
> - Engellenen video/kanal sayfasında sebebi ve geri dön bağlantısını gösteren tam sayfa uyarı
> - Kartları gizleme, bulanıklaştırma veya uyarı kapağıyla kapatma
> - Pop-up'ta geçerli sayfa için karar + sebep gösteren ve tek tıkla istisna ekleyen hızlı bant
> - Shorts, yorumlar ve önerilenler için bağımsız gizleme anahtarları
> - Liste ve ayar yedekleme / geri yükleme (JSON)
> - PIN kilidi (kilit yalnızca arayüzdedir; PIN, PBKDF2-SHA256 karması olarak saklanır)
>
> **Gizlilik:** Hiçbir veri toplanmaz, hiçbir sunucuya gönderilmez. Tüm ayarlar ve listeler yalnızca tarayıcınızın yerel depolamasında tutulur. Ayrıntılar: gizlilik politikası (bkz. `docs/GIZLILIK.md`).
>
> **Not:** Eklenti yalnızca youtube.com üzerinde çalışır ve YouTube'un resmî bir ürünü değildir.

**Kategori:** Chrome: Verimlilik (Productivity). Firefox: Privacy & Security.
**Dil:** Türkçe.

## 2. İzin gerekçeleri (mağaza incelemesi için)

| İzin | Neden |
|---|---|
| `storage` | Ayarlar, listeler, PIN karması ve sayfadan toplanan kanal adı/avatarı yalnızca yerel depolamada tutulur. |
| Host izni `*://*.youtube.com/*` | Filtreleme yalnızca YouTube sayfalarında çalışır; başka siteye erişilmez. |
| İçerik betiği `all_frames` | Gömülü (embed) oynatıcılar da filtrelensin diye. |
| `web_accessible_resources` (`inject_helper.js`, `inject.css`, `data/db.json`) | YouTube sayfasına enjekte edilen yardımcı betik/stil ve veritabanı dosyası. |
| `world: "MAIN"` (helper) | YouTube'un kart verisine (videoId/kanal) erişim; izole dünyadan mümkün değil. |

Uzak kod yoktur; tüm betikler paket içindedir.

## 3. Gizlilik ve veri güvenliği formu cevapları

- **Veri toplama:** Hayır. Hiçbir kişisel veri toplanmaz, sunucuya gönderilmez, satılmaz.
- **Ağ isteği:** Eklenti kendi sunucusuna istek atmaz. Avatar görselleri doğrudan YouTube'un görsel alan adlarından (`yt3.ggpht.com` vb.) tarayıcı tarafından yüklenir.
- **Yerel depolama:** ayarlar, istisna listeleri, PIN karması, sayfadan toplanan kanal adı/avatarı, isteğe bağlı `db.json` kopyası.
- **Tek amaç beyanı (single purpose):** YouTube içeriğini kullanıcının belirlediği konu/etiket kurallarına göre filtrelemek.
- **Gizlilik politikası metni:** `docs/GIZLILIK.md`. GitHub Pages **2026-10-21'de `main` / `/docs` için yapılandırıldı**. Yerel commit'ler `origin/main`e push edildikten sonra hedef URL: `https://talhaozz.github.io/YouTubeFilter/GIZLILIK.html` (yayın URL'sini mağaza formuna girin).

## 4. Mağaza görselleri

Chrome Web Store'un güncel gereksinimleri: **128×128 mağaza ikonu**, **en az bir 1280×800 ekran görüntüsü** (en fazla 5) ve **440×280 küçük tanıtım karesi**. 1400×560 marquee isteğe bağlıdır. Chrome listeleme formunda **YouTube tanıtım videosu** alanı vardır; **video 2026-10-21 itibarıyla ertelendi** (kullanıcı kararı). Form video alanını zorunlu tutarsa yükleme öncesi eklenmelidir. AMO 1280×800 ekran görüntülerini kabul eder.

| Görsel | Boyut | Durum |
|---|---|---|
| Uzantı ikonu | 16/32/48/128 PNG | ✅ `src/icons/icon{16,32,48,128}.png` (kırmızı-beyaz kalkan; `npm run ikon`) |
| Mağaza ikonu | 128×128 PNG (96×96 görsel + 16 px saydam çerçeve) | ✅ `store/icon-128.png` (`npm run ikon`; yerel, repoya girmez) |
| Ekran görüntüleri | 1280×800 PNG/JPEG, 1–5 | ⏳ gerçek tarayıcıda çekilecek (aşağıdaki plan) |
| Küçük tanıtım karesi | 440×280 PNG/JPEG | ✅ `store/promo-440x280.png` (`npm run store:gorsel`; yerel, repoya girmez) |
| Tanıtım videosu | YouTube bağlantısı | ⏸️ şimdilik ertelendi; Chrome formu zorunlu tutarsa eklenecek |
| Marquee | 1400×560 PNG/JPEG | isteğe bağlı |

`store/` klasörü `.gitignore`'dadır; üretilen görseller repoya eklenmez. Ekran görüntüleri gerçek arayüzü göstermelidir, mockup kullanılmamalıdır. Çekim ve 1280×800'e sabitleme adımları `docs/MAGAZA_ELLE.md` bölüm 2'dedir (`scripts/gorsel-1280x800.ps1`). Öneri: 5 kare

1. Pop-up → **Filtre** sekmesi: mod ve konu ızgarası görünür.
2. Pop-up → **İstisnalar** sekmesi: avatarlı kanal satırı ve "Her zaman izin ver/engelle" rozetleri.
3. YouTube'da **hızlı bant**: "Şu an: ENGELLENİYOR — Konu: …" ve iki hızlı düğme.
4. **Tam sayfa engel uyarısı** (kara listedeki video): sebep metni ve "Beyaz listeye ekle".
5. **Bulanıklaştırılmış kart** görünümü (kararsız/bulanıklaştır eylemi).

## 5. Sürüm akışı

**Sürümün kaynakları:** `package.json` içindeki `version`, iki manifestteki `version` (üçü **eşit** olmalı; `tests/manifest.test.js` denetler) + `CHANGELOG.md` girişi + git etiketi. Firefox manifestinde `browser_specific_settings.gecko.data_collection_permissions.required` = `["none"]` bulunmalıdır; AMO 3 Kasım 2025'ten beri yeni gönderilerde bunu zorunlu tutar.

Yayın adımları:

```text
1) npm install && npm test              # tüm testler + derleme güncellik kontrolü yeşil olmalı
2) npm run ikon                         # src/icons/ + store/icon-128.png (96 px + 16 px boşluk)
3) Sürümü üç yerde yükselt: package.json + manifests/manifest.chromium.json + manifests/manifest.firefox.json
4) CHANGELOG.md: "[Yayınlanmamış]" -> "[2.0.0] - YYYY-AA-GG"
5) npm run build                        # chromium/ ve firefox/ güncellenir
6) npm run store:gorsel                 # store/promo-440x280.png
7) Zip paketleri (PowerShell):
   Compress-Archive -Path chromium\* -DestinationPath yt-filter-chromium-2.0.0.zip -Force
   Compress-Archive -Path firefox\*  -DestinationPath yt-filter-firefox-2.0.0.zip  -Force
8) Yükleme:
   - Chrome Web Store -> Developer Dashboard -> New item -> chromium zip'i yükle
     (form: açıklama, en az bir 1280x800 ekran görüntüsü, 440x280 karo, store/icon-128.png,
      YouTube tanıtım videosu: şimdilik ertele, form zorunlu tutarsa ekle;
      gizlilik URL'i: https://talhaozz.github.io/YouTubeFilter/GIZLILIK.html,
      tek amaç beyanı, veri toplama: "veri toplamıyor")
   - Firefox AMO -> Add-on Developer Hub -> Submit a New Add-on -> firefox zip'i yükle
     (AMO kaynak kodu isteyebilir: aynı git etiketinin kaynak zip'ini inceleme notuna ekleyin)
9) git tag v2.0.0; GitHub Release notlarını CHANGELOG'dan kopyala
```

Not: `version` alanı üç yerde eşit tutulmazsa Chrome/Firefox farklı sürümlerle yayınlanır veya test kalır. `scripts/build.js` sürümü manifestten okur; ayrıca güncellemeyin.

## 6. Yayın öncesi kontrol listesi

- [ ] `npm test` yeşil; `npm run build` çalıştırıldı
- [ ] Sürüm `package.json` + iki manifestte eşit (`tests/manifest.test.js` yeşil)
- [ ] Firefox `data_collection_permissions.required = ["none"]` ve `strict_min_version` 140
- [ ] İkon tasarımı onaylandı; `src/icons/icon{16,32,48,128}.png` ve mağaza için `store/icon-128.png` (96 px görsel + 16 px boşluk) güncel
- [ ] Gerçek tarayıcı doğrulaması (`docs/MAGAZA_ELLE.md` bölüm 1)
- [ ] En az bir 1280×800 ekran görüntüsü (hedef: 5 kare) çekildi
- [ ] 440×280 küçük tanıtım karesi üretildi (`npm run store:gorsel`)
- [ ] YouTube tanıtım videosu: şimdilik ertelendi; Chrome formu zorunlu tutarsa ekle
- [ ] Gizlilik politikası URL'i yayında: `https://talhaozz.github.io/YouTubeFilter/GIZLILIK.html` (önce `origin/main`e push) ve iletişim adresi güncel
- [ ] `README.md` güncel
- [ ] `CHANGELOG.md` sürüm bölümü ve git etiketi atıldı
- [ ] Chrome `minimum_chrome_version` (111) ve Firefox `strict_min_version` (140) mağaza formlarında görünür
