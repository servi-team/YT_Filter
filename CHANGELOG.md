# Değişiklik Günlüğü

Bu belge [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) düzenini izler. Henüz sürüm numarası verilmemiş çalışmalar "Yayınlanmamış" altında toplanır.

## [Yayınlanmamış] — 2.0 geliştirme dalı

Eski "her kanal/video elle bir kategoriye atanır" modelinden, **konu + etiket + veritabanı** modeline geçiş.
PR 1–5 tamamlandı (PR 5'in eksik parçaları PR 6C'de kapatıldı), **PR 6 (engel banner)**, **PR 6B (ekip liderinin tasarım dökümanına uyum)**, **PR 6C (hızlı ekleme bandı + istisna çerçevesi)**, **PR 7 (içe/dışa aktarma)**, **PR 8A (manifest sertleştirmesi)** ve **PR 8B (jsdom smoke testleri repoda, 2026-10-19)** kodlandı.
PR 6, 6B, 6C, 7, 8A ve 8B **Node testleriyle doğrulandı** (arayüz ve içerik betiği artık repodaki jsdom harness'iyle); **gerçek tarayıcıda henüz denenmedi.**

### PR 8B — jsdom smoke testleri repoda (2026-10-19)

#### Eklendi (geliştiriciler için)
- **`tests/smoke/ortak.js`:** jsdom + sahte `chrome.*` (`storage.local`/`onChanged`, `runtime`, `tabs`) ve `bekle()` yardımcıları; `options.html` gerçek betik sırasıyla, `content.js` verilen sayfa HTML'i üzerinde çalıştırılır.
- **`tests/smoke/options.test.js` (5 test):** ilk açılış + veritabanı durumu, PIN kurulumu/kilitleme/yanlış-doğru giriş, içerik ekle/listele/sil, çakışma modalının üç stratejisi, hızlı bandın URL yedeğiyle dolması.
- **`tests/smoke/content.test.js` (4 test):** kara listedeki video banner'ı + oynatıcı gizleme, "Beyaz listeye ekle" ile depo güncelleme, kara listedeki kanalın kartını gizleme, "Bulanıklaştır" eylemi.
- **`package.json`:** `jsdom ^27` devDependency + `npm test` betiği; `.gitignore` (node_modules). Smoke testleri için `npm install` gerekir (Node >= 20; saf testler Node 18+ ile çalışır).
- Toplam **105 test** yeşil (96 saf + 9 smoke).

### PR 8A — Manifest sertleştirmesi (2026-10-19)

#### Kullanıcıya görünen değişiklikler
- **Mağaza açıklaması** gerçek özellikleri anlatıyor; "video etiketleme" ve olmayan "otomatik senkronizasyon" ifadeleri kaldırıldı.
- **Gereksiz izinler kaldırıldı:** `google.com` / `google.com.tr` host izni ve içerik betiği eşleşmeleri silindi (kod hiç kullanmıyordu). Eklenti artık yalnızca YouTube'da çalışır.
- **Sürüm uyumu:** Firefox en düşük sürüm **128** (MAIN world desteği), Chromium en düşük sürüm **111**.

#### Eklendi (geliştiriciler için)
- **`tests/manifest.test.js`:** 2 test — açıklama/izin kontrolü ve sürüm/içerik betiği sırası kontrolü. Toplam **96 test** yeşil.

### PR 7 — İçe/dışa aktarma (2026-10-19)

#### Kullanıcıya görünen değişiklikler
- **Liste dışa aktarma:** İstisnalar sekmesinde "Listeleri dışa / içe aktar" kartı. Açılır listeden **tüm listeler**, beyaz liste, kara liste veya tek bir özel liste seçilip JSON olarak indirilir (`yt_filter_listeler.json` / listeye özel dosya adı).
- **Liste içe aktarma:** Paket mevcut listelerle birleştirilir. Aynı adlı özel liste varsa üç seçenekli modal çıkar: **Birleştir (varsayılan) / Üzerine yaz / Yeniden adlandır**. Yeniden adlandırma TR-duyarsız benzersiz ad üretir (`Okul (2)`). Beyaz/kara listelerde üyeler birleşir; bir anahtar her zaman tek listede kalır (sonraki liste taşır).
- **`db.json` içe aktarma:** Yedek sekmesinde "Veritabanı (db.json)" kartı. `sema 1` ve `veriSurumu` doğrulanır; kaç kanal/video alınacağı ve kaç geçersiz kaydın atlanacağı onaydan önce gösterilir. Paketli veriden daha eski veya eşit sürüm için uyarı verilir (saklanır ama eşitlikte paketli veri kullanılır). "Paketli veritabanına dön" ile içe aktarılan veritabanı silinir.
- **Veritabanı durumu** kartta özetlenir: paketli sürüm, içe aktarılan sürüm (aktif/pasif), kanal/video sayısı, atlanan kayıt sayısı.

#### Eklendi (geliştiriciler için)
- **`src/core/listeler.js` (yeni, saf):** `listePaketiOlustur(ayar, secim)`, `listePaketiCoz(json)` (liste paketi + tam yedek biçimi; üye/liste adı doğrulaması, TR-duyarsız yinelenen ad birleştirme), `listeleriBirlestir(mevcut, gelen, strateji)` (`birlestir | uzerine | yeniden`; mevcut nesneyi değiştirmez, anahtarın tek listede kalmasını sağlar).
- **`options.js`:** dosya indirme yardımcısı `jsonIndir`, `removeStorageData`; liste paketi dışa/içe aktarma, çakışma modalı; `dbOverride` içe aktarma/sıfırlama ve `renderDbDurumu`; `veriTabaniniYukle` artık paketli + override seçimini raporluyor.
- **`tests/pr7.test.js`:** 12 test (paket oluşturma, temizleme, bozuk girdi, tam yedek, üç birleştirme stratejisi, liste taşıma, TR-duyarsız benzersiz ad). PR 7 sonunda toplam 94 test yeşildi (PR 8A ile 96).

### PR 6C — Hızlı ekleme bandı ve istisna çerçevesi (2026-10-19)
PR 5'te planlanıp dosyalarda bulunmayan dört parça tamamlandı.

#### Kullanıcıya görünen değişiklikler
- **Hızlı ekleme bandı artık kararı ve sebebini gösteriyor:** "Şu an: ENGELLENİYOR" / "Şu an: AÇIK" ve altında okunur sebep ("Kara listede (video)", "Etiket: Küfürlü içerik (kanal)" vb.). Karar, açık YouTube sekmesindeki içerik betiğine sorulur; betik yoksa URL'den hesaplanır.
- **Hızlı ekleme düğmeleri anlam kazandı:** "Beyaz liste / Kara liste" → **"Her zaman izin ver / Her zaman engelle"** (istisna olduğu vurgulanır).
- **Listeler sekmesi → "İstisnalar".** Kart başlıkları ve açıklamaları "kuralı geçersiz kılar" çerçevesine göre yenilendi. Spec adları parantezde korunur ("Her zaman izin ver (Beyaz liste)").
- **Çok-istisna uyarısı:** beyaz + kara + özel listelerdeki toplam kayıt ~50'yi geçince "Çok istisnanız var; kuralları gözden geçirin veya yanlış etiketleri bildirin" uyarısı görünür.
- **"Bildir" düğmesi** eklendi; site hazır olana kadar gizli ve pasif.
- **Bilinmeyen içerikte bilgi notu:** "Elinizde yalnızca istisna vardır; 'Her zaman izin ver' doğru yoldur."

#### Eklendi (geliştiriciler için)
- `core/engine.js`: `sebepMetni(sebep)` (banner ve pop-up ortak metin), `kararOzeti(sonuc)` (`{etiket, sebep, engelleniyor}`), `istisnaSayisi(ayar)`, `ISTISNA_UYARI_ESIGI = 50`.
- `content.js`: üst çerçevede `runtime.onMessage` dinleyicisi; `tur: 'sayfaDurumu'` isteğine sayfa kimliği + karar + sebepler + özet döner. Banner sebep metni artık `YTF.sebepMetni` kullanır.
- `options.js`: `sekmeyeSor` (Firefox promise / Chrome callback), `urlKimligi` yedeği, `hizliBandiDoldur`; istisna eklendikten sonra bant anında yeniden hesaplanır.
- `tests/pr6c.test.js`: 3 test (sebep metinleri, karar özeti, istisna sayısı/eşiği). Toplam **82 test** yeşil.

### PR 6B — Ekip liderinin tasarım dökümanına uyum (2026-10-19)
Kural kaynağı: `docs/SISTEM_TASARIMI.md`. Karşılaştırma sonucunda kodun dökümandan saptığı beş yer bulundu ve giderildi.

#### Kullanıcıya görünen değişiklikler
- **Video yoksa kanala bak.** Eskiden video ve kanal birlikte değerlendiriliyordu. Şimdi videoda bilgi varsa **yalnızca video**, yoksa kanal değerlendirilir. Gözlemlenebilir fark:
  - Serbest/Orta: videonun konusu engelli, kanalınki izinliyse eskiden **açılırdı**, artık **engellenir.**
  - Katı: video temiz, kanalda engelli konu/etiket varsa eskiden **engellenirdi**, artık **açılır.**
- **Yeni ayar: "Kanalın konu ve etiketlerine de bak"** (Filtre sekmesi, mod kartında; varsayılan açık). Kapatılırsa videosunda kaydı olmayan içerik doğrudan "bilinmeyen" sayılır.
- **Yeni kavram: Kararsız.** Topluluk oylamasında sonuç çıkmamış konu/etiket. Filtre sekmesinde **"Kararsızlar: İzin ver / Engelle"** seçimi (yalnızca Orta modda etkin; Serbest'te hep izin, Katı'da hep engel — kullanıcının engellediği konu/etiketler için; kartta açıklanır).
- **Konu başına engelleme biçimi.** Konu kapatılınca yanında menü çıkar: **Gizle / Bulanıklaştır / Uyarı sayfası.** Etiketlerde menü: **İzin ver / Gizle / Bulanıklaştır / Uyarı sayfası** (3'lü segment yerine açılır menü).
- **Yeni eylem: "Uyarı sayfası".** Kartlarda kartın üstü, sebebi yazan opak bir kapakla kapanır (tıklanamaz). İzleme/kanal sayfasında tam sayfa banner çıkar.
- **Kanal sayfasında engel banner'ı.** `/@kanal` ve `/channel/UC…` sayfaları engelliyse banner çıkar; kanal vitrinindeki video durdurulur. (Eskiden yalnızca video sayfasında vardı.)
- **Görünüm sekmesi:** "Engellenen Videolar" → **"Diğer Engeller"**; 3 seçenek (Gizle / Bulanıklaştır / Uyarı sayfası). Konu ve etiket dışındaki (liste, bilinmeyen) engellerin biçimini belirler.
- **Banner sebep metinleri** artık etiket/konu adını ve kaynağını yazıyor ("Etiket: Küfürlü içerik (video)", "Kara listede (kanal)").
- **İlk açılışta PIN seçimi.** Yeni kurulumda `1234` atanmaz; "Hoş geldiniz! Bir PIN seçin" kartı çıkar (tam 4 rakam, "Şimdilik atla" mümkün). Mevcut kullanıcıların PIN'i ve değiştirme uyarısı aynen kalır.
- **Mod açıklamaları** yeni kurallara göre yenilendi.

#### Davranış farkları (dikkat)
- **Eski kullanıcı verisi korunur.** Eski `konular[id] = "engelli"` değeri yüklenirken **genel engelleme biçimine** çevrilir; konu kapalı kalır, menü genel biçimi gösterir.
- **"Tümünü engelle"** konuları genel engelleme biçimiyle kapatır (her konu sonra kendi biçimini seçebilir).
- Orta modda "video incelenmemişse kanalın ana konusu da izinli olmalı" varsayımı (eski karar #5) **kalktı**; döküman "video yoksa kanala bak" diyor.
- Yalnızca kararsız verisi olan video **"bilinmeyen" sayılmaz**; kanala bakılmaz.
- **Sertlik sırası:** birden çok sebepte en sert eylem kazanır: **Gizle > Uyarı sayfası > Bulanıklaştır.**
- Eski sürümlerde "etiket başına eylem yok, tek genel eylem var" (PR 4) notu artık geçerli değil: hem konu hem etiket kendi eylemini taşır.

#### Eklendi (geliştiriciler için)
- **`core/decision.js` baştan yazıldı:** tekil kaynak seçimi (`video` → `kanal` → bilinmeyen), `kanalKontrol`, kararsız politikası, ana konusuz kayıt desteği. Sebepler `kaynak` taşır; yeni sebep türleri: `kararsiz-konu`, `kararsiz-etiket`.
- **`core/taxonomy.js`:** `ENGEL_EYLEMLERI`, `KARARSIZ_SECENEKLERI`; ayar alanları `kanalKontrol`, `kararsiz`; `konular[id]`/`etiketler[id]` değerleri `izinli | kaldir | uyari | bulaniklastir`; `engelEylemi` artık `uyari` da olabilir; `ayarTemizle` eski `engelli` değerini çevirir; `kayitDogrula` yeni kurallar.
- **`core/db.js`:** kayıtlarda `kararsizKonular`, `kararsizEtiketler`.
- **`core/engine.js`:** eylem çözümleme konu/etiket başına; `kaldir > uyari > bulaniklastir`; rozet metinleri kararsız sebepleri de yazıyor.
- **`db.json` şeması (sema 1) genişletildi,** numara değişmedi: yeni alanlar isteğe bağlı; **`anaKonu` artık isteğe bağlı** (yan konu varsa zorunlu; kayıt tamamen boşsa geçersiz). Bkz. `docs/db-sema.md`.
- **Yeni belge:** `docs/SISTEM_TASARIMI.md` (liderin kuralları + netleştirilen noktalar ve liderden teyit bekleyenler), `docs/db.test-ornek-kararsiz.json`.
- **Testler:** `tests/karar-v2.test.js` — 28 test (kaynak seçimi, kanal kontrol, her modda kararsız, ana konusuz kayıt, eylem sertliği, ayar geçişi, kayıt doğrulama, veritabanı). PR 2–5 birim testleri yeni kurala uyduruldu (`node --test` yeşil). jsdom ile `options.html` (26 kontrol) ve `content.js` (banner/kart) denendi; bu harness'ler repoda değil.

#### Düzeltildi (`content.js`)
- **Banner her saniye silinip yeniden çiziliyordu** (titreme, tıklama kaybı olasılığı). Aynı sebep için artık tek çizim.
- **Kanal sayfasında hiç banner yoktu.** Eklendi.
- **Yükleme bitmeden karar veriliyordu** (varsayılan ayarla geçici engel/banner olasılığı): `motorHazir` kapısı.
- **Firefox'ta banner'ın istisna butonu takılabiliyordu** (`storage.set` callback'i Firefox'ta promise'i çözmez): ortak `setStorageData`.
- **`inject_helper.js` enjeksiyonu iframe'lerde `Unsafe attempt to load URL chrome-extension://…` hatası veriyordu:** yardımcı yalnızca üst çerçevede enjekte edilir.
- **Tanılama günlüğü:** `YT Filter: hazır {...}` ve `YT Filter: sayfa kararı …`.

### PR 5 notu — dosyalarla belge uyuşmazlığı
`PLAN.md` PR 5'i tamam gösteriyordu; yüklenen güncel dosyalarda şu parçalar **yoktu**: hızlı ekleme bandında karar+sebep gösterimi, pop-up ↔ içerik betiği mesajlaşması (`onMessage`), Listeler sekmesinin "İstisnalar" adlandırması, çok-istisna uyarısı. Bu iş PR 6C'de tamamlandı (bkz. yukarı).

### Kullanıcıya görünen değişiklikler (önceki PR'lardan, hâlâ geçerli)
- **Yeni "Filtre" sekmesi (ilk sekme).**
  - Serbest / Orta / Katı mod kaydırıcısı, seçilen modun kısa açıklamasıyla.
  - 15 konu için izin/engel anahtarı ("tümüne izin ver", "tümünü engelle" kısayollarıyla). *(PR 6B: engelleme biçimi menüsü eklendi.)*
  - 8 etiket için eylem seçimi. Birden çok sebepte en sert eylem kazanır.
- **İlk açılışta "Etiketlenmemiş içerik" seçimi** (açılsın / engellensin) ve "veritabanı yeni bir proje, raporlarınızla gelişecek" bilgilendirmesi. Sıfırdan kurulumda kart vurgulanır; seçilene kadar etiketlenmemiş içerik engellenir. Mevcut kullanıcıların önceki tercihi korunur. *(Dökümanda bu seçeneğin adı "Bilinmeyenler".)*
- **Listeler sekmesi:** içerik **Beyaz liste**, **Kara liste** veya kullanıcının **özel listelerinden** birine eklenir. Kuralları geçersiz kılan istisna mantığı vurgulandı. Çipler ve arama listelere göre çalışır. Veritabanında kaydı olan kanalların adı listede görünür.
- **"Kategori Eylem Kuralları" kaldırıldı;** yerine **Özel Listeler** geldi (oluştur, eylemi değiştir [engelle / izin ver], sil). Liste adları benzersiz; "Beyaz liste" ve "Kara liste" adları ayrılmış.
- **Görünüm sekmesine "Engellenen İçerik" kartı:** engellenen videoları kaldır / bulanıklaştır, rozetleri göster/gizle.
- **Tam sayfa engel banner'ı (PR 6):** engellenme sebebi (konu/etiket/liste), "Geri dön" ve "Beyaz listeye ekle" butonları. *(PR 6B: kanal sayfası, yeniden çizim ve sebep metni düzeltmeleri.)*
- **Adlandırma:** hızlı ekleme düğmeleri **"Beyaz liste / Kara liste"**. Rozet metinleri buna göre değişti ("GÜVENLİ", "EĞİTİCİ" → "BEYAZ LİSTE"; engelli kayıtlar → "KARA LİSTE").
- **Yedek içe aktarma** hem yeni hem eski biçimli dosyaları kabul eder (üzerine yazar, onay sorar).

### Davranış farkları (önceki PR'lardan)
- Eski modelde her kategori için ayrı "kaldır / bulanıklaştır / izin ver" ve rozet ayarı vardı; şimdi rozet tek genel anahtar. Eylem artık konu/etiket başına (PR 6B).
- **Eski veri taşınırken:** "İzin Ver" etiketli kayıtlar beyaz listeye, diğerleri kara listeye gider; kullanıcının kendi kategorileri özel liste olur. Eski veri silinmez, `eskiYedek` altında ve eski anahtarlarda durur.
- **Bir kayıt tek listede bulunur;** başka listeye eklenince eskisinden taşınır.
- Eski sürümlerde "etiketlenmemiş" varsayılanı `background.js` ile `options.js` arasında tutarsızdı; artık tek kaynaktan gelir.

### Eklendi (önceki PR'lardan, geliştiriciler için)
- **`src/core/`:** `taxonomy.js`, `decision.js`, `migrate.js`, `db.js`, `engine.js`. DOM ve `chrome.*` kullanmazlar; tarayıcıda `YTF` global nesnesine eklenir, Node'da `require` edilir.
- **`src/data/db.json`** (şimdilik boş) ve **`docs/db-sema.md`** (editör sitesi ile eklenti arasındaki tek sözleşme).
- **Karar algoritması** (PR 6B'de güncellendi; bkz. yukarı ve `docs/SISTEM_TASARIMI.md`). Her sonuç sebep listesi taşır (engel sayfası için).
- **Kanal ID desteği:** `inject_helper.js` kart verisinden kanal `UC…` ID'sini de okur (`data-yt-exposed-channel-id`). Veritabanı kanalı hem ID hem handle ile indeksler.
- **Tanılama:** YouTube konsolunda `__ytFilterDiag()`.
- **Testler:** `tests/` altında 49 (sonra 51) birim testi (`node --test`).
- **Manifestler:** `content_scripts` listesine `core/*.js` eklendi; `web_accessible_resources`'a `data/db.json` eklendi; Firefox `background.scripts` listesine `core/taxonomy.js` eklendi.

### Değişti
- `content.js`: karar mantığı tek noktaya (`icerikKarari`) toplandı; liste kartları ve izleme sayfası aynı fonksiyonu kullanıyor.
- `options.js`/`options.html`/`options.css`: yeni model üzerine yeniden yazıldı; 5 sekmeli gezinme. PIN, tema ve kilit mantığı korundu.
- `background.js`: yeni kurulumda yeni modeli yazar; çekirdek yüklenemezse eski varsayılanlara döner. **PR 6B:** `pinKodu` artık boş başlar.
- Veri artık `storage.local` içinde `{surum: 2, ayar: {...}}`. Pop-up ilk açıldığında eski veri **bir kez** taşınır.

### Düzeltildi (önceki PR'lardan)
- `inject_helper.js`: `@@ad` hatası; sabit veri yolları güncel YouTube kart yapısında hiçbir kartı bulamıyordu → anahtar adına göre derin arama (ölçüm: 85 kartta video ID %100, handle ~%75, kanal ID ~%76).
- `content.js`: kanal bulunamayınca kanalın *görünen adı* handle yerine kullanılıyordu; aynı CSS kuralları hem `inject.css`'te hem betik içinde tekrarlanıyordu.
- Kategori adında boşluk arayüz seçicisini bozuyordu (ID'li modelle ortadan kalktı).
- Türkçe büyük/küçük harf: liste adları `tr-TR` kurallarıyla karşılaştırılıyor.

### Güvenlik
- **XSS:** arayüz kanal/kategori adlarını `innerHTML` ile basıyordu; tüm kullanıcı metinleri artık düz metin (testle doğrulandı).
- **İçe aktarılan ayar doğrulaması:** `ayarTemizle` bilinmeyen alanları atar, geçersiz değerleri varsayılana çevirir, liste adlarını kırpar, yinelenen/ayrılmış adları eler, anahtar uzunluğunu sınırlar. *(PR 6B: yeni alanlar da doğrulanır.)*
- **Nesne özellikleri:** liste araması `Object.prototype` özelliklerine takılmıyor (`hasOwnProperty`).
- **PIN:** yeni kurulumda herkesçe bilinen varsayılan PIN (`1234`) artık atanmıyor. PIN hâlâ düz metin saklanır ve yalnızca arayüz kilididir. *(PR 8C'de karma saklamaya geçilecek.)*

### Bilinen sınırlar (henüz yapılmadı / çözülüyor)
- **Veritabanı neredeyse boş ve düzenleme sitesi yok:** çoğu içerik "bilinmeyen" kalıyor; konu/etiket kuralları test verisi veya PR 7'deki `db.json` içe aktarma ile görülebilir.
- **PR 6, 6B, 6C, 7, 8A ve 8B gerçek tarayıcıda doğrulanmadı.** Tarayıcıda test ve tanılama adımları: `docs/DEVIR_NOTU.md` 6/#14; hızlı bant için 6/#16; liste/db aktarma için PR 7 bölümü; 8A için yalnızca yeniden yükleme denemesi. 8B yalnızca test altyapısıdır (davranış değişikliği yok).
- **Testler** `node --test` ile yeşil (**105 test**: 96 saf + 9 jsdom smoke).
- **Hızlı ekleme bandının mesajlaşması** gerçek pop-up'ta denenmedi; içerik betiği yoksa URL yedeği kullanılır.
- **Lider onayı bekleyen yorumlar:** ana konu ölçütü (net puan mı upvote mu), beraberlikte sıra, Serbest'te kararsız konu, Orta/Katı'da kararsız "engelle" anlamı, asgari oy eşiği — `docs/SISTEM_TASARIMI.md` bölüm 6.
- **Tam yedek içe aktarma** hâlâ mevcut ayarların üzerine yazar (onay sorar); liste içe aktarma ise birleştirir/çakışma sorar.
- Düzenleme sitesi ve oylama sistemi.
- İzleme sayfasında kanal ID'si yok (yalnızca handle ile eşleşir).
- Listelerde yalnızca veritabanında kayıtlı kanalların adı görünür; avatar yok.
- 5 sekmenin 430 px içinde sığması (yeni kontroller sonrası dahil) gerçek tarayıcıda doğrulanmadı.

### Geliştirici notları
- **Derleme:** `node scripts/build.js` → `chromium/` ve `firefox/`. Tarayıcıya bu klasörler yüklenir; kaynak `src/`'dir. **Her değişiklikten sonra yeniden derleyin.**
- **Test:** `node --test` — 105 test (96 saf + 9 smoke). **Smoke testleri için önce `npm install`** (jsdom devDependency; Node >= 20). Yeni: `tests/karar-v2.test.js`, `tests/pr6c.test.js`, `tests/pr7.test.js`, `tests/manifest.test.js`, `tests/smoke/ortak.js` + `options.test.js` + `content.test.js`.
- **Uyumluluk:** eski yedek dosyaları yeni sürümde içe aktarılabilir; yeni yedekler eski sürümde **çalışmaz.** Yeni `db.json` alanları isteğe bağlıdır; ancak ana konusuz kayıtları eski eklenti sürümleri atlar.
- **Katkıda bulunanlar için:** `core/` içine DOM/`chrome.*` bağımlılığı eklemeyin; yeni davranış için önce test yazın. Kuralların kaynağı: `docs/SISTEM_TASARIMI.md`. Ayrıntılar: `docs/DEVIR_NOTU.md`, plan: `PLAN.md`.
