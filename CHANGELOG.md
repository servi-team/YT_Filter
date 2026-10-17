# Değişiklik Günlüğü

Bu belge [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) düzenini izler. Henüz sürüm numarası verilmemiş çalışmalar "Yayınlanmamış" altında toplanır.

## [Yayınlanmamış] — 2.0 geliştirme dalı

Eski "her kanal/video elle bir kategoriye atanır" modelinden, **konu + etiket + veritabanı** modeline geçiş.
PR 1–5 tamamlanıp doğrulandı, **PR 6 (engel banner) kodlandı; tarayıcıda tetiklenme teşhisi sürüyor**.

### Kullanıcıya görünen değişiklikler
- **Yeni "Filtre" sekmesi (ilk sekme).**
  - Serbest / Orta / Katı mod kaydırıcısı, seçilen modun kısa açıklamasıyla.
  - 15 konu için izin/engel anahtarı ("tümüne izin ver", "tümünü engelle" kısayollarıyla).
  - 8 etiket için 3 durumlu segment kontrolü (`izinli / bulanıklaştır / kaldır` — PR 5). Birden çok sebepte en sert eylem kazanır.
- **İlk açılışta "Etiketlenmemiş içerik" seçimi** (açılsın / engellensin) ve "veritabanı yeni bir proje, raporlarınızla gelişecek" bilgilendirmesi. Sıfırdan kurulumda kart vurgulanır; seçilene kadar etiketlenmemiş içerik engellenir. Mevcut kullanıcıların önceki tercihi korunur.
- **Listeler sekmesi ("İstisnalar"):** içerik artık **Beyaz liste**, **Kara liste** veya kullanıcının **özel listelerinden** birine eklenir. Kuralları geçersiz kılan istisna mantığı vurgulandı. Çipler ve arama listelere göre çalışır. Veritabanında kaydı olan kanalların adı listede görünür.
- **"Kategori Eylem Kuralları" kaldırıldı;** yerine **Özel Listeler** geldi (oluştur, eylemi değiştir [engelle / izin ver], sil). Liste adları benzersiz olmak zorunda; "Beyaz liste" ve "Kara liste" adları ayrılmış.
- **Görünüm sekmesine "Engellenen İçerik" kartı:** engellenen videoları kaldır / bulanıklaştır, rozetleri göster/gizle.
- **Tam sayfa engel banner'ı (PR 6 — teşhis aşamasında):** Engellenen video/kanal açıldığında tam sayfa karanlık kart, engellenme sebebi (konu/etiket/liste), "Geri dön" ve "Beyaz listeye ekle" butonları.
- **Adlandırma:** hızlı ekleme düğmeleri "Güvenli / Engelle" yerine **"Beyaz liste / Kara liste"**. Rozet metinleri de buna göre değişti ("GÜVENLİ", "EĞİTİCİ" → "BEYAZ LİSTE"; engelli kayıtlar → "KARA LİSTE").
- **Yedek içe aktarma** hem yeni hem eski biçimli dosyaları kabul eder (üzerine yazar, onay sorar).

### Davranış farkları (dikkat)
- **Etiket başına eylem ve rozet ayarı tekleşti.** Eski modelde her kategori için ayrı "kaldır / bulanıklaştır / izin ver" ve ayrı rozet ayarı vardı. Şimdi engellenenler için tek genel eylem ve tek genel rozet anahtarı var. (Etiket başına eylem yeniden ele alınıyor: bkz. `Plan.md` 4.1.)
- **Eski veri taşınırken:** "İzin Ver" etiketli kayıtlar beyaz listeye, diğerleri kara listeye gider; kullanıcının kendi kategorileri özel liste olur. Eski veri silinmez, `eskiYedek` altında ve eski anahtarlarda durur.
- **Bir kayıt tek listede bulunur;** başka listeye eklenince eskisinden taşınır (eski modeldeki "bir ID = bir etiket" davranışıyla aynı).
- Eski sürümlerde işe yarayan "etiketlenmemiş" varsayılanı, `background.js` ile `options.js` arasında tutarsızdı; artık tek kaynaktan gelir.

### Eklendi (geliştiriciler için)
- **`src/core/`:** `taxonomy.js` (konu/etiket tanımları, varsayılan ayar, doğrulama), `decision.js` (saf karar fonksiyonu), `migrate.js` (eski→yeni veri), `db.js` (veritabanı doğrulama/indeksleme), `engine.js` (ayar çözümleme, veritabanı araması, rozet metni). DOM ve `chrome.*` kullanmazlar; tarayıcıda `YTF` global nesnesine eklenir, Node'da `require` edilir.
- **`src/data/db.json`** (şimdilik boş) ve **`docs/db-sema.md`** (editör sitesi ile eklenti arasındaki tek sözleşme, sema 1).
- **Karar algoritması:** listeler (video > kanal; aynı düzeyde beyaz > kara) → etiketlenmemiş → mod kuralları (serbest/orta/katı). Her sonuç sebep listesi taşır (engel sayfası için).
- **Kanal ID desteği:** `inject_helper.js` artık kart verisinden kanal `UC…` ID'sini de okur (`data-yt-exposed-channel-id`). Veritabanı kanalı hem ID hem handle ile indeksler.
- **Tanılama:** YouTube konsolunda `__ytFilterDiag()` helper'ın o sayfada kaç kartta video ID/handle/kanal ID bulduğunu gösterir.
- **Testler:** `tests/` altında 49 birim testi (`node --test`). Özetteki A/B/C örnek videoları üç modda test edilir.
- **Manifestler:** `content_scripts` listesine `core/*.js` eklendi; `web_accessible_resources`'a `data/db.json` eklendi; Firefox `background.scripts` listesine `core/taxonomy.js` eklendi.

### Değişti
- `content.js`: karar mantığı tek noktaya (`icerikKarari`) toplandı; liste kartları ve izleme sayfası aynı fonksiyonu kullanıyor. Rozet ve engel görünümü motorun sebep listesinden üretiliyor.
- `options.js`/`options.html`/`options.css`: yeni model üzerine yeniden yazıldı; 5 sekmeli gezinme. PIN, tema ve kilit mantığı aynen korundu.
- `background.js`: yeni kurulumda yeni modeli yazar; çekirdek yüklenemezse eski varsayılanlara döner.
- Veri artık `storage.local` içinde `{surum: 2, ayar: {...}}`. Pop-up ilk açıldığında eski veri **bir kez** taşınır; öncesinde (PR 3) `ayarCoz` eski depoyu her seferinde bellekte çevirir.

### Düzeltildi
- **`inject_helper.js`:** regex ile yakalanan `@` iki kez ekleniyordu (`@@ad`).
- **`inject_helper.js`:** sabit veri yolları güncel YouTube kart yapısında hiçbir kartı bulamıyordu (ana sayfada 160 kartta 0 sonuç). **Anahtar adına göre derin arama** eklendi; ölçüm: 85 kartta video ID %100, handle ~%75, kanal ID ~%76.
- **`content.js`:** kanal bulunamayınca kanalın *görünen adı* handle yerine kullanılıyordu; kaldırıldı.
- **`content.js`:** aynı CSS kuralları hem `inject.css`'te hem betik içinde tekrarlanıyordu; tekilleştirildi.
- **Kategori adında boşluk:** özel kategori adı boşluk içerince arayüz seçicisi bozuluyordu; ID'li model ile ortadan kalktı.
- **Türkçe büyük/küçük harf:** "ders KANALLARI" ile "Ders kanalları" farklı liste adı sayılıyordu; "KARA LİSTE" ayrılmış ad denetimini geçebiliyordu. Liste adları artık `tr-TR` kurallarıyla karşılaştırılıyor.

### Güvenlik
- **XSS:** arayüz, kanal/kategori adlarını `innerHTML` ile basıyordu; siteden/yedekten gelen kötü niyetli bir ad sayfada kod çalıştırabilirdi. Tüm kullanıcı metinleri artık düz metin olarak basılıyor (testle doğrulandı).
- **İçe aktarılan ayar doğrulaması:** `ayarTemizle` bilinmeyen alanları atar, geçersiz değerleri varsayılana çevirir, liste adlarını kırpar ve yinelenen/ayrılmış adları eler, anahtar uzunluğunu sınırlar.
- **Nesne özellikleri:** liste araması `Object.prototype` özelliklerine (`constructor`, `__proto__`) takılmıyor (`hasOwnProperty`).

### Bilinen sınırlar (henüz yapılmadı / çözülüyor)
- PR 6 tam sayfa engel banner'ı kodlandı ancak tarayıcıda filtrenin ve banner'ın tetiklenmeme sorunu inceleniyor.
- İçe aktarmada ad çakışması diyaloğu (üzerine yaz / yeniden adlandır / birleştir) ve siteden indirilen `db.json`'u içe aktarma.
- Düzenleme sitesi.
- İzleme sayfasında kanal ID'si yok (yalnızca handle ile eşleşir).
- Beyaz/kara/özel listelerde yalnızca veritabanında kayıtlı kanalların adı görünür; avatar yok.
- PIN düz metin saklanır ve yalnızca arayüz kilididir.
- Manifest açıklaması hâlâ "otomatik senkronizasyon" diyor (böyle bir özellik yok); `google.com` host izni geniş.
- 5 sekmenin 430 px içinde sığması gerçek tarayıcıda henüz doğrulanmadı.

### Geliştirici notları
- **Derleme:** `node scripts/build.js` → `chromium/` ve `firefox/`. Tarayıcıya bu klasörler yüklenir; kaynak `src/`'dir.
- **Test:** `node --test` (Node 18+). Arayüz ve içerik betiği jsdom + sahte `chrome.*` ile denendi; bu harness henüz repoda değil.
- **Uyumluluk:** eski yedek dosyaları yeni sürümde içe aktarılabilir; yeni yedekler eski sürümde **çalışmaz**.
- **Katkıda bulunanlar için:** `core/` içine DOM/`chrome.*` bağımlılığı eklemeyin; yeni davranış için önce test yazın. Ayrıntılar: `docs/DEVIR_NOTU.md`, plan: `Plan.md`.
