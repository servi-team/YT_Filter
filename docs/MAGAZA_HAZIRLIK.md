# Mağaza Hazırlığı — YouTube Filtreleyici

> Son güncelleme: 2026-10-19 (PR 8F). Bu belge, eklentiyi Chrome Web Store ve Firefox Add-ons (AMO) mağazalarına yüklemek için gereken metinleri, form cevaplarını ve sürüm akışını toplar.
> Ekran görüntüleri ve gerçek mağaza hesapları tarayıcı/hesap gerektirir; bu belgedeki işaretli adımlar elle yapılır.

## 1. Mağaza listeleme metinleri

**Ad:** YouTube Filtreleyici

**Kısa açıklama (Chrome sınırı: 132 karakter — manifest `description` ile aynı olmalı):**
> YouTube'u konu ve etiketlere göre filtreler; kanal/video istisnaları, kararsız içerik seçimi ve PIN kilidi.

**Uzun açıklama:**

> YouTube Filtreleyici, YouTube'da karşılaştığınız videoları konu ve etiketlere göre süzer. Amaç, sizi rahatsız eden içerikten uzak durmanızı sağlarken karar yetkisini sizde bırakmaktır.
>
> **Nasıl çalışır?**
> - **Kural katmanı (Filtre sekmesi):** Modunuzu (Serbest / Orta / Katı), izin verdiğiniz konuları, engellediğiniz etiketleri ve her biri için eylemi (Gizle / Bulanıklaştır / Uyarı sayfası) seçersiniz.
> - **Veri katmanı:** İçeriklerin konu ve etiketleri eklentiyle gelen gömülü veritabanından okunur; Yedek sekmesinden kendi `db.json` dosyanızı içe aktarabilirsiniz.
> - **İstisna katmanı:** Tek tek kanalları veya videoları "Her zaman izin ver / Her zaman engelle" listelerine ekleyerek kuralı geçersiz kılabilirsiniz. Kanal eklerken adı ve avatarı sayfadan otomatik toplanır.
>
> **Öne çıkanlar**
> - Sayfa açılmadan önce devreye giren tam sayfa engel uyarısı ve geri dön bağlantısı
> - Kartları gizleme, bulanıklaştırma veya uyarı sayfasıyla açma
> - Pop-up'ta sayfa sayfa hızlı istisna ekleme bandı
> - Shorts, yorumlar ve önerilenler için bağımsız anahtarlar
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
- **Gizlilik politikası metni:** `docs/GIZLILIK.md`. Barındırma önerisi: GitHub Pages ile bu dosyayı yayınlayıp mağaza formuna URL verin (ör. `https://<kullanıcı>.github.io/<repo>/GIZLILIK.html`).

## 4. Ekran görüntüsü planı (elle çekilecek)

Boyut: 1280×800 (Chrome ve AMO ikisi de kabul eder). Öneri: 5 kare, `store/` klasörüne koyup **repoya eklemeyin** (`.gitignore`'da).

1. Pop-up → **Filtre** sekmesi: mod ve konu ızgarası görünür.
2. Pop-up → **İstisnalar** sekmesi: avatarlı kanal satırı ve "Her zaman izin ver/engelle" rozetleri.
3. YouTube'da **hızlı bant**: "Şu an: ENGELLENİYOR — Konu: …" ve iki hızlı düğme.
4. **Tam sayfa engel banner'ı** (kara listedeki video): sebep metni ve "Beyaz listeye ekle".
5. **Bulanıklaştırılmış kart** görünümü (kararsız/bulanıklaştır eylemi).

## 5. Sürüm akışı

**Sürümün kaynakları:** `manifests/manifest.chromium.json` ve `manifests/manifest.firefox.json` içindeki `version` (ikisi eşit olmalı; `tests/manifest.test.js` bunu denetler) + `CHANGELOG.md` girişi + git etiketi.

Yayın adımları:

```
1) node --test                          # tüm testler yeşil olmalı (112+)
2) manifests/manifest.*.json içinde version yükselt   # ör. 1.0 → 2.0 (mağaza yayını için önerilir)
3) CHANGELOG.md: "[Yayınlanmamış]" -> "[2.0] - YYYY-AA-GG"
4) node scripts/build.js                # chromium/ ve firefox/ güncellenir
5) Zip paketleri (PowerShell):
   Compress-Archive -Path chromium\* -DestinationPath yt-filter-chromium-2.0.zip -Force
   Compress-Archive -Path firefox\*  -DestinationPath yt-filter-firefox-2.0.zip  -Force
6) Yükleme:
   - Chrome Web Store -> Developer Dashboard -> New item -> chrome zip'i yükle
     (form: açıklama, ekran görüntüleri, gizlilik URL'i, tek amaç beyanı)
   - Firefox AMO -> Add-on Developer Hub -> Submit a New Add-on -> firefox zip'i yükle
     (AMO kaynak kodu isteyebilir: aynı git etiketinin kaynak zip'ini inceleme notuna ekleyin)
7) git tag v2.0; GitHub Release notlarını CHANGELOG'dan kopyala
```

Not: `version` alanı iki manifestte eşit tutulmazsa Chrome/Firefox farklı sürümlerle yayınlanır; test bunu yakalar.

## 6. Yayın öncesi kontrol listesi

- [ ] `node --test` yeşil; `node scripts/build.js` çalıştırıldı
- [ ] Gerçek tarayıcı doğrulaması (PLAN.md bölüm "Önce yapılacak" listesi)
- [ ] Ekran görüntüleri (5 kare) çekildi
- [ ] Gizlilik politikası URL'i yayında (`docs/GIZLILIK.md`)
- [ ] Destek iletişim adresi hazır (ör. e-posta)
- [ ] `CHANGELOG.md` sürüm bölümü ve git etiketi atıldı
- [ ] Chrome `minimum_chrome_version` (111) ve Firefox `strict_min_version` (128) mağaza formlarında görünür
