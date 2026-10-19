# YouTube Filtreleyici — Devir Notu

> Bu belge, projeye sıfırdan giren bir kişinin ya da yapay zekânın kaldığımız yerden devam edebilmesi için yazıldı.
> Son güncelleme: 2026-10-19 (PR 6C) · Kod tabanı: `TalhaOzz/YouTubeFilter` (fork) · Geliştirici: Talha (tek geliştirici, yapay zekâ desteğiyle)
> Yol haritası için `PLAN.md`, değişiklik özeti için `CHANGELOG.md`, **ürün kuralları için `docs/SISTEM_TASARIMI.md` (ekip liderinin dökümanı — kuralların tek kaynağı)**, `db.json` sözleşmesi için `docs/db-sema.md` dosyalarına bakın.

> **PR 6C özeti (2026-10-19):** PR 5'te eksik kalan parçalar tamamlandı: hızlı ekleme bandı artık **"Şu an: ENGELLENİYOR/AÇIK" + sebep** gösteriyor (karar pop-up'ta içerik betiğine sorulur, olmazsa URL'den hesaplanır); düğmeler **"Her zaman izin ver / Her zaman engelle"**; Listeler sekmesi **İstisnalar** oldu; ~50 kayıtta çok-istisna uyarısı çıkıyor; "Bildir" düğmesi site hazır olana kadar gizli/pasif. `node --test` yeşil (82 test). **Tarayıcıda denenmedi.**
>
> **2026-10-19 özeti (PR 6B):** Ekip lideri tasarım dökümanını gönderdi. Karar algoritması ona göre yeniden yazıldı (PR 6B): *önce video, video verisi yoksa kanal*; **kanal kontrol ayarı**; **kararsız** kavramı; konu ve etiket başına **Gizle / Bulanıklaştır / Uyarı sayfası**; ilk açılışta **PIN seçimi**. Bu değişiklikler Node birim testleriyle (28 yeni test) ve jsdom ile doğrulandı; **gerçek tarayıcıda henüz denenmedi.** Aşağıdaki 2.5, 3.3, 3.4, 5. ve 6. bölümler buna göre güncellendi; eski kararlardan geçersiz kalanlar işaretlendi.

---

## 1. Proje nedir?

YouTube'u filtreleyen bir tarayıcı eklentisi (Chromium + Firefox, Manifest V3). Hedef kitle **teknik bilgisi olmayan kullanıcılar** (ör. ebeveynler). Eklenti tamamen yerelde çalışır; sunucuya istek atmaz.

Eski sürümde her kanal/video elle bir "kategoriye" atanıyordu. Yeni sürümde iki bileşen var:

1. **Eklenti:** İçeriği, bir **veritabanındaki konu/etiket kayıtlarına** ve kullanıcının ayarlarına göre filtreler.
2. **Düzenleme sitesi — "YouTube Filter Store" (henüz yazılmadı):** Editörlerin ve topluluğun kanal/video başına konu ve etiketi **oylayarak** girdiği, ziyaretçilerin JSON indirip rapor gönderebildiği web sitesi. Çıktısı eklentinin okuduğu `db.json`.

Veritabanı aylık güncellemelerle eklenti paketiyle (Chrome Web Mağazası) gelir; eklenti ağdan veri çekmez. İsteyen kullanıcı siteden JSON indirip elle içe aktarabilir (bu kısım henüz yok).

> **Önemli (neden "konular işe yaramıyor?"):** Konu ve etiketleri **kullanıcı atamaz**; veriyi site üretir. `data/db.json` şu an boş ve site yok, bu yüzden her içerik "bilinmeyen" kalır ve kullanıcıya yalnızca listeler görünür. Bu bir kod hatası değil, **sıralama sorunu**: önce tüketen taraf (eklenti) yapıldı, üreten taraf (site) yapılmadı. Bkz. `PLAN.md` "Veri köprüsü" kararı.

---

## 2. Ürün kuralları

> **Kuralların asıl kaynağı `docs/SISTEM_TASARIMI.md`'dir.** Burada özetlenir; çelişki olursa o belge geçerlidir.

### 2.1 Kavramlar
- **Konu:** kanal/videonun kategorisi. **Etiket (flag):** uyarı bayrağı (küfür, şiddet vb.); kullanıcı bunları engellemek zorunda değildir.
- Editör girişinde **1 ana konu zorunlu** + sınırsız yan konu + sınırsız etiket. **Oylama çıktısında** ise hiçbir konu pozitif çıkmayabilir; bu yüzden `db.json`'da `anaKonu` isteğe bağlıdır (yan konu varsa zorunlu).
- **Bilinmeyen:** videoda hiç bilgi yok **ve** (kanal kontrolü kapalı ya da kanalda da bilgi yok). Eskiden "etiketlenmemiş" denirdi; kodda ayar adı hâlâ `etiketlenmemis`.
- **Kararsız:** bilgi girilmiş ama topluluk oylamasında sonuç çıkmamış (toplam oy 0) konu/etiket. **Bilinmeyen değildir.**
- **İncelenmiş:** kayıtta herhangi bir bilgi (ana konu, etiket veya yalnızca kararsız) varsa. Konu girilmiş ama etiket yoksa içerik zararsızdır ("incelendi, bayrak yok").

### 2.2 Varsayılan konular (15) — `src/core/taxonomy.js`
- `ders-okul` Ders / Okul · `egitici` Eğitici · `bilim` Bilim · `teknoloji` Teknoloji · `haber` Haber / Güncel olaylar
- `din` Din / Maneviyat · `eglence` Eğlence / Mizah · `oyun` Oyun · `spor` Spor · `muzik` Müzik
- `film-dizi-sanat` Film / Dizi / Sanat · `yasam-vlog` Yaşam / Vlog · `finans` Finans / Girişim
- `saglik-gelisim` Sağlık / Kişisel gelişim · `cocuk` Çocuk içerikleri

> Konu **sırası** önemlidir: oylamada beraberlikte "listedeki ilki" ana konu olur (bkz. `SISTEM_TASARIMI.md` 6/#2). Sırayı değiştirmeyin; yeni konu sona eklenir.

### 2.3 Varsayılan etiketler (8)
- `kufur` Küfürlü içerik · `argo` Argolu içerik (hakaret) · `ai` AI ile üretilmiş içerik · `kumar` Kumar / bahis
- `siddet` Şiddet · `zararli` Zararlı / uygunsuz içerik · `olumsuz-ornek` Olumsuz örnek · `spam` Spam / sahte içerik

### 2.4 Uygulama içi listeler (istisna katmanı)
- **Beyaz liste:** asla engellenmeyen kanal/videolar. **Kara liste:** her zaman engellenenler. **Özel listeler:** kullanıcı kendi listelerini oluşturur; ad benzersiz (Türkçe harf kurallarıyla karşılaştırılır).
- **Listeler konu/etiket kurallarını her zaman geçer** (istisna). Önce video düzeyi, sonra kanal düzeyi; aynı düzeyde beyaz > kara > özel.
- **Bilinmeyen içerik:** ilk açılışta kullanıcı seçer (aç/engelle) ve "veritabanı yeni bir proje, raporlarla gelişecek" diye bilgilendirilir. Seçilene kadar engellenir.
- Varsayılan konu/etiket tanımlarını kullanıcı değiştiremez.
- Dışarıdan içe aktarmada aynı liste adı çakışırsa "üzerine yaz / yeniden adlandır / birleştir" sorulmalı (**henüz yapılmadı**).
- Kanallar **ID ile** tanınmalı (handle değişebilir); arayüzde kanal adı ve avatar gösterilmesi istendi (ad: yalnızca DB'dekiler, avatar: yok).
- **Hızlı ekleme bandı (PR 6C):** aktif sayfanın kararını ve sebebini gösterir; istisna düğmeleri "Her zaman izin ver / Her zaman engelle". Listeler sekmesi bu çerçevede **İstisnalar** olarak adlandırıldı; kayıt sayısı ~50'yi geçince "çok istisna" uyarısı çıkar.

### 2.5 Engelleme algoritması (3 mod) — `core/decision.js`

**Kontrol sırası:**
1. **Listeler** (istisna) → karar verir.
2. **Kaynak seçimi:** *Önce video.* Videoda **hiç bilgi yoksa** ve `kanalKontrol` açıksa *kanal.* **İkisi asla birlikte değerlendirilmez.** İkisinde de yoksa (ya da `kanalKontrol` kapalıysa) → **bilinmeyen** → `ayar.etiketlenmemis`.
3. **Seçilen kaynak üzerinde:**
   - **Her modda:** kullanıcının engellediği **kesinleşmiş etiket** varsa engelle.
   - **Serbest:** herhangi bir konu izinliyse aç. Kararsızlara kullanıcı lehine izin: kararsız etiket engellemez; **kararsız konu izinli konu sayılır.**
   - **Orta:** yalnızca ana konuya bakılır. Kararsızlar `ayar.kararsiz`'a göre (`izinver` varsayılan; `engelle` ise kullanıcının engellediği kararsız konu/etiket engeller).
   - **Katı:** ana veya yan **herhangi bir konu engelliyse** engelle. Kararsız konu/etiket de (kullanıcı engelliyorsa) engeller.
   - Kayıtta **kesin konu yoksa** (yalnızca etiket/kararsız) konu kuralı uygulanmaz.

**Eski kuraldan farklar (önemli):** Eski özet ve eski kod, video **ve** kanalı birlikte değerlendiriyordu (Serbest/Orta: videonun konusu engelli ama kanalınki izinliyse açıyordu; Katı: video temiz olsa da kanaldaki engelli konu/etiket videoyu engelliyordu). **Artık video verisi varsa kanal hiç dikkate alınmaz.**

Belirsiz kalan noktaların yorumları ve liderden teyit bekleyenler: `SISTEM_TASARIMI.md` bölüm 6.

### 2.6 Engellenen sayfa deneyimi
- **Engelli video/kanal sayfası:** tam sayfa banner — sebep(ler) (liste adı, konu, etiket; "(video)"/"(kanal)" kaynağıyla), **Geri dön**, **İstisna: Beyaz listeye ekle**. Video izleme sayfasında ve **kanal sayfasında** (`/@handle`, `/channel/UC…`) çalışır (kanal sayfası PR 6B'de eklendi). Banner aynı sebep için yeniden çizilmez.
- **Kartlarda üç görünüm:** *Gizle* (kart kaybolur), *Bulanıklaştır*, *Uyarı sayfası* (kartın üstü sebebi yazan opak kapak; tıklanamaz; rozet gösterilmez).
- İzleme sayfasında *Gizle* ve *Uyarı sayfası* → banner; *Bulanıklaştır* → oynatıcı bulanık.
- Banner'daki **doğrulanmamış** nokta: gerçek YouTube'da tetiklenmesi (bkz. 6/#14).

### 2.7 Düzenleme sitesi (henüz yapılmadı)
3 rol: **Admin**, **Editör** (link yapıştırır → ID/başlık otomatik gelir → konu/etiket **oyları** girer), **Ziyaretçi** (girişsiz: güncel `db.json`'u indirir, rapor gönderir). Oylama ve sonuç hesabı: `SISTEM_TASARIMI.md` bölüm 5. Site, `db.json`'a **yalnızca sonucu** yazar (ham oylar sitede kalır).

---

## 3. Mimari

### 3.1 Dosya yapısı
```
src/
  background.js        kurulumda varsayılan veriyi yazar (PIN artık ATANMAZ; kullanıcı ilk açılışta seçer)
  content.js           YouTube sayfasında kartları işler, izleme/kanal sayfasını kontrol eder, banner,
                       pop-up'a sayfa durumunu döndürür (runtime.onMessage: 'sayfaDurumu')
  inject_helper.js     MAIN world'de çalışır; kart verisinden videoId/handle/kanalId'yi DOM'a yazar
  inject.css           rozet / bulanıklaştırma / gizleme / uyarı kapağı / banner stilleri
  options.html|css|js  pop-up arayüzü (430px genişlik, 5 sekme)
  core/
    taxonomy.js        konu/etiket tanımları, varsayilanAyar(), ayarTemizle(), kayitDogrula(), ENGEL_EYLEMLERI
    decision.js        kararVer(ayar, video, kanal)  — SAF fonksiyon, asıl algoritma
    migrate.js         eski modelden (customMapping+preferences) yeni modele çeviri — saf
    db.js              db.json doğrulama/indeksleme (dbKur, dbSec)
    engine.js          ayarCoz, icerikKarari (db araması+karar+eylem çözümleme), rozetBilgisi,
                       sebepMetni / kararOzeti (hızlı bant), istisnaSayisi + ISTISNA_UYARI_ESIGI
  data/db.json         paketle gelen veritabanı (şimdilik boş)
manifests/             manifest.chromium.json, manifest.firefox.json
scripts/build.js       src/ + manifest -> chromium/ ve firefox/ klasörleri (yükleme için bunlar kullanılır)
tests/                 decision/migrate/db/engine .test.js + karar-v2.test.js (Node'un yerleşik test koşucusu)
docs/                  SISTEM_TASARIMI.md (lider dökümanı), db-sema.md (sözleşme), db.test-ornek.json,
                       db.test-ornek-kararsiz.json, DEVIR_NOTU.md
```
**Önemli:** Tarayıcıya `chromium/` klasörü yüklenir; kaynak her zaman `src/`. `node scripts/build.js` ile derlenir, `--watch` ile izlenir. Doğrudan `chromium/` içini düzenlemeyin. **Eski bir `chromium/` klasörünün yüklü kalması, "değişiklik görünmüyor" şikâyetinin ilk sebebidir.**

### 3.2 Modül kuralları
- Bundler yok. `core/*.js` UMD biçimindedir: tarayıcıda `YTF` global nesnesine eklenir, Node'da `require` edilir. Yükleme sırası manifestlerde: `taxonomy → decision → migrate → db → engine → content`.
- `core/` içindeki dosyalar **DOM veya `chrome.*` kullanmaz** (test edilebilirlik için). DOM işi `content.js`/`options.js`'tedir.
- İçerik betiğinin global değişkenleri (`YTF` dahil) sayfa konsolunda **görünmez** (izole dünya). Konsolda `typeof YTF` denemesi anlamsızdır; bunun yerine `content.js`'in yazdığı `YT Filter: …` günlüklerine bakın (6/#14).
- Kod, yorum ve arayüz Türkçedir; tanımlayıcılar Türkçe (`kararVer`, `ayarCoz`).

### 3.3 Depolama (`chrome.storage.local`)
| Anahtar | İçerik |
|---|---|
| `surum` | `2` = yeni model |
| `ayar` | kullanıcı filtre ayarı (aşağıda) |
| `eskiYedek` | eski `customMapping`+`preferences` kopyası (geri dönüş için) |
| `customMapping`, `preferences` | eski anahtarlar, **silinmedi** |
| `ayarlar` | arayüz anahtarları: `shortsGizle, yorumGizle, onerilenGizle, otomatikOynatmaKapat, pinIptal, koyuTema` |
| `pinKodu`, `pinDegistirildi`, `ilkGirisYapildi`, `kurulumTarihi` | PIN ve kurulum bilgisi. **Yeni kurulumda `pinKodu` boştur** (PIN seçimi ilk açılışta) |
| `pinKurulumAtlandi` | kullanıcı "Şimdilik atla" dediyse `true` (PIN kartı bir daha çıkmaz) |
| `dbOverride` | (planlı) elle içe aktarılan veritabanı |

`ayar` şekli:
```json
{
  "mod": "orta",                         // serbest | orta | kati
  "konular":   { "oyun": "izinli" },     // izinli | kaldir | uyari | bulaniklastir  (izinli değilse engelli; değer = nasıl görüneceği)
  "etiketler": { "kufur": "kaldir" },    // izinli | kaldir | uyari | bulaniklastir
  "etiketlenmemis": null,                // "ac" | "engelle" | null (null = henüz seçilmedi, engelle gibi davranır)  = "bilinmeyen" ayarı
  "engelEylemi": "kaldir",               // kaldir | uyari | bulaniklastir — liste / bilinmeyen / izinli-konu-yok kaynaklı engellerin GENEL görünümü
  "kanalKontrol": true,                  // false = kanalın konu/etiketine bakma, video bilgisizse "bilinmeyen" say
  "kararsiz": "izinver",                 // izinver | engelle — yalnızca Orta modda geçerli (Serbest: hep izin, Katı: hep engelle)
  "rozetGoster": true,
  "listeler": { "beyaz": {"@kanal": true}, "kara": {}, "ozel": [ { "ad": "Okul", "eylem": "izinver|engelle", "uyeler": {"@x": true} } ] }
}
```
- Eski `konular[id] = "engelli"` değeri `ayarTemizle` ile **genel `engelEylemi`'ne çevrilir** (etiketler için PR 5'ten beri böyleydi). Karar fonksiyonu eski değeri de "engelli" sayar.
- Liste anahtarları **küçük harfe çevrilmiş** kanal `@handle`, kanal `UC…` ID'si veya video ID'sidir.

### 3.4 Karar akışı (`core/decision.js` + `core/engine.js`)
1. **Listeler.** (bkz. 2.4)
2. **Kaynak seçimi:** video → (yoksa ve `kanalKontrol` açıksa) kanal → (yoksa) bilinmeyen (`etiketlenmemis`).
3. **Mod kuralları** (bkz. 2.5). Bilinmeyen konu "izinli", durumu belirtilmemiş etiket "engelli" sayılır.
4. Sonuç: `{ karar: 'ac'|'engelle', sebepler: [...] }`. Sebep türleri: `liste`, `etiketlenmemis`, `konu`, `etiket`, `kararsiz-konu`, `kararsiz-etiket`, `izinli-konu-yok`. Her sebep `kaynak` (`video`/`kanal`) taşır.
5. **Eylem çözümleme (`engine.icerikKarari`):** her sebebin eylemi bulunur — konu/etiket (ve kararsız) sebepleri kendi `konular[id]` / `etiketler[id]` değerini, diğerleri genel `engelEylemi`'ni kullanır. Birden çok sebepte **en sert kazanır: kaldir > uyari > bulaniklastir.**

`engine.icerikKarari` veritabanından kayıtları bulur; DB'de kanal bulunursa eksik id/handle tamamlanır (liste ID ile, ekrandan gelen handle ise de eşleşsin diye).

### 3.5 Veri geçişi (eski → yeni)
- **PR 3'ten beri:** `engine.ayarCoz` eski depoyu **her seferinde bellekte** yeni modele çevirir (kalıcı yazmaz).
- **PR 4'ten beri:** pop-up ilk açıldığında bir kez kalıcı geçiş yapılır (`surum: 2`, `ayar`, `eskiYedek`).
- Kurallar: etiketin eylemi "İzin Ver" ise o etiketli kayıtlar → beyaz liste, aksi → kara liste (core etiketler); kullanıcının kendi kategorileri → özel liste; `untagged` tercihi → `etiketlenmemis`; herhangi biri "Tamamen Kaldır" ise `engelEylemi=kaldir`, yalnızca bulanıklaştırma varsa `bulaniklastir`; rozet: biri bile "Show Badge" ise `rozetGoster=true`.
- Dışarıdan gelen her ayar `ayarTemizle` ile doğrulanır (bozuk/bilinmeyen alan atılır, varsayılanla doldurulur). Yeni alanlar (`kanalKontrol`, `kararsiz`) eksikse varsayılan gelir; eski kullanıcı verisi bozulmaz.

### 3.6 `db.json` (sema 1)
Ayrıntı: `docs/db-sema.md`. Özet: `{sema:1, veriSurumu:int, kanallar:[{id:"UC…", handle?, ad?, avatar?, anaKonu?, yanKonular[], etiketler[], kararsizKonular[], kararsizEtiketler[]}], videolar:[{id:"11 karakter", …aynı alanlar}]}`. Yeni alanlar isteğe bağlıdır; şema numarası değişmedi. Geçersiz kayıtlar tek tek atlanır. `veriSurumu` büyük olan (paketli veya `dbOverride`) kazanır. Aynı id iki kez gelirse sonuncusu geçerli.

### 3.7 Kanal/video tanıma (kritik, kırılgan)
- `inject_helper.js` (MAIN world) kartların iç verisini (`el.data` vb.) okuyup `data-yt-exposed-id / -channel / -channel-id` özniteliklerini yazar. YouTube yapıyı değiştirdiği için sabit yollar yetmedi; **anahtar adına göre derin arama** kullanılır. Ölçüm (ana sayfa, 85 kart): video ID %100, handle ~%75, kanal ID ~%76.
- `content.js` DOM linklerinden (`/watch?v=`, `/@handle`) yedek okur; bu yüzden helper başarısız olsa bile filtre çalışır.
- Konsolda `__ytFilterDiag()` helper'ın o sayfada neyi bulduğunu gösterir. İçerik betiği de `YT Filter: hazır` ve `YT Filter: sayfa kararı …` günlüklerini yazar.
- Yardımcı betik yalnızca **üst çerçevede** yedek olarak enjekte edilir (embed iframe'lerinde `chrome-extension://` yüklemesi hata veriyordu).
- İzleme sayfasında kanal ID'si yok (yalnızca handle).

---

## 4. Yapılanlar (kronoloji)

| PR | Ne yapıldı | Durum |
|---|---|---|
| 0 | Mevcut kodun incelenmesi; hatalar listelendi (aşağıda) | tamam |
| 1 | `kararVer` tek noktası; helper'a kanal ID'si + derin arama; `__ytFilterDiag()`; kopya CSS kaldırıldı | kullanıcı çalıştırdı |
| 2 | `taxonomy/decision/migrate` + 24 test | kullanıcı testleri çalıştırdı, geçti |
| 3 | `db.js`, `engine.js`, `content.js`'in yeni motora bağlanması, manifest/WAR, `data/db.json`, `docs/db-sema.md`; 42 test | testler kullanıcıda geçti; **tarayıcıda davranış kontrolü bildirilmedi** |
| 4 | Arayüz: Filtre sekmesi, Listeler/özel listeler, Görünüm kartı, ilk açılış seçimi, kalıcı geçiş, `ayarTemizle` sertleştirmesi; 49 test + jsdom arayüz testi | ✅ doğrulandı |
| 5 | Etiket 3 durumlu; en sert sebep kazanır; 51 test | ⚠️ **kısmen:** etiket eylemi tamam. **Planlanan ama dosyalarda bulunmayan parçalar:** hızlı ekleme bandında karar+sebep, pop-up ↔ sayfa mesajlaşması, "İstisnalar" adlandırması, çok-istisna uyarısı → `PLAN.md` PR 6C |
| 6 | Tam sayfa engel banner'ı | ⚠️ kodlandı (commit 0b2272b). Gerçek tarayıcıda "tetiklenmiyor" bildirildi. Sonradan: jsdom'da çalıştığı doğrulandı; bulunan hatalar düzeltildi (aşağıda). **Gerçek YouTube'da hâlâ doğrulanmadı** |
| 6B | **Lider dökümanına uyum** (2026-10-19): video-yoksa-kanal kaynak seçimi, `kanalKontrol`, kararsız (şema+karar+arayüz), konu/etiket başına eylem + "Uyarı sayfası", kanal sayfası banner'ı, ilk açılışta PIN seçimi, banner/`content.js` düzeltmeleri; `tests/karar-v2.test.js` (28 test) + jsdom arayüz (26 kontrol) ve içerik betiği denemeleri | ✅ **Node/jsdom'da doğrulandı; tarayıcıda denenmedi.** Eski birim testleri yeni kurala uyduruldu (6/#15) |
| 6C | **Hızlı ekleme bandı + istisna çerçevesi** (2026-10-19): `content.js`'te `sayfaDurumu` mesajı; pop-up önce içerik betiğine sorar, olmazsa URL'den hesaplar; bantta karar+sebep; "Her zaman izin ver / Her zaman engelle"; Listeler → **İstisnalar**; ~50 kayıtta uyarı; "Bildir" gizli/pasif; `tests/pr6c.test.js` (3 test) | ✅ `node --test` yeşil (82 test); **gerçek pop-up'ta denenmedi** |

### PR 6B'de düzeltilen hatalar (`content.js`)
- Engel banner'ı **her saniye silinip yeniden çiziliyordu** (titreme, tıklama kaybı) → aynı sebep için tek çizim.
- **Kanal sayfasında banner yoktu** (yalnızca `/watch`, `/embed`, `/shorts`) → `/@handle` ve `/channel/UC…` eklendi; kanal vitrini videosu durdurulur.
- Yükleme bitmeden (`motorHazir`) karar verilmesi → önlendi.
- Banner'daki istisna butonu Firefox'ta sonsuza dek bekleyebiliyordu (`storage.set` callback'i) → ortak `setStorageData`.
- Embed iframe'lerinde `Unsafe attempt to load URL …inject_helper.js` hatası → yardımcı yalnızca üst çerçevede enjekte edilir.
- Banner sebep metinleri etiket/konu **adını** ve kaynağını (video/kanal) yazıyor.

### Başlangıçta bulunan hatalar (PR 0–4)
- Helper'da `@@` → düzeltildi. `extractChannelHandle` yedek yolu kanalın görünen adını döndürüyordu → kaldırıldı. `applyFilter` ve `checkWatchPage` aynı mantığı iki kez içeriyordu → tek fonksiyona indi. `background.js` ile `options.js`'in "etiketlenmemiş" varsayılanı tutarsızdı. Özel kategori adında boşluk seçiciyi bozuyordu. Arayüz kullanıcı metinlerini `innerHTML` ile basıyordu (XSS) → DOM ile basılıyor. Türkçe `I/ı` karşılaştırma hatası → `tr-TR`. Liste araması nesne özelliklerine takılabiliyordu → `hasOwnProperty`.

---

## 5. Verilen kararlar ve varsayımlar (gerekçeleriyle)

1. **Karar fonksiyonu saf ve ayrı dosyada.** Gerekçe: "ve/veya" hataları en kolay burada yapılır; Node'da test edilir.
2. **Bundler yok.** Gerekçe: proje küçük, build.js yalnızca kopyalıyor.
3. **Veritabanı pakette, depoda değil.** Gerekçe: `storage.local` kotası ve ağ isteğinin olmaması. Okuma: `fetch(runtime.getURL('data/db.json'))` (WAR gerekli).
4. **Öncelik:** beyaz > kara; video düzeyi > kanal düzeyi; **listeler konu/etiketi her zaman geçer.** (Liderin dökümanı listeleri anmıyor; bizim kararımız.)
5. ~~**Orta modda video incelenmemişse kanalın ana konusunun da izinli olması şart.**~~ **GEÇERSİZ (2026-10-19).** Lider dökümanı: video verisi yoksa kanala bakılır; artık Orta modda kanalın ana konusu izinliyse ve etiketi yoksa açılır. Test: `karar-v2.test.js`.
6. **`etiketlenmemis: null` iken engelle.** Güvenli taraf.
7. ~~**Engel eylemi şu an GENEL ayar.**~~ **GEÇERSİZ.** Eylem artık **konu ve etiket başına** seçilir (lider dökümanı 3/C); liste/bilinmeyen kaynaklı engeller genel `engelEylemi`'ni kullanır.
8. **Özel liste = beyaz/kara listeyle aynı güçte "istisna grubu"** (eylem: engelle/izinver). Liderin dökümanı özel listeleri anmıyor. **Yeniden düşünülüyor.**
9. **Bir kayıt tek listede bulunur;** başka listeye eklenince taşınır.
10. **Kalıcı geçiş ancak arayüzle birlikte** (PR 4).
11. ~~**Etiket başına eylem: `izinli | bulaniklastir | kaldir`; konulara eylem verilmedi.**~~ **KISMEN GEÇERSİZ.** Etiket eylemi korundu ve **"uyari" eklendi**; **konulara da eylem verildi** (`konular[id]`). Sertlik sırası: kaldir > uyari > bulaniklastir.
12. **Kaynak seçimi tekil:** video verisi varsa yalnızca video, yoksa yalnızca kanal. (Lider; eski "video veya kanal" özetinin yerine.)
13. **Kararsız = bilgi sayılır.** Yalnızca kararsız verisi olan video "bilinmeyen" değildir; kanala bakılmaz.
14. **Kararsız politikası mod başına:** Serbest hep izin (kararsız konu izinli konu sayılır), Orta `ayar.kararsiz`, Katı hep (kullanıcı engelliyorsa) engelle. "Engelle" = kullanıcının zaten engellediği kararsız konu/etiket kesinleşmiş gibi sayılır. *(Serbest konu yorumu, Orta/Katı yorumu liderden teyit bekliyor.)*
15. **`anaKonu` isteğe bağlı (şema düzeyinde).** Gerekçe: oylamada hiç pozitif konu çıkmayabilir; ana konusuz kaydı atmak, kesinleşmiş etiketi (ör. küfür) yok saymak olurdu. Editör girişinde ana konu yine zorunlu.
16. **`kanalKontrol` olumlu kutuda:** arayüzde "Kanalın konu ve etiketlerine de bak" (açık = bak). Liderin ifadesi tersiydi ("devre dışı bırak"); saklanan değer aynı anlamda: `false` = devre dışı.
17. **Şema numarası değişmedi.** Yeni alanlar isteğe bağlı ve geriye uyumlu. Eski eklenti ana konusuz kaydı atlar (kabul edilebilir).
18. **PIN:** yeni kurulumda önceden atanmaz; ilk açılışta tam 4 rakam seçtirilir, atlanabilir. Eski kullanıcı `1234` + değiştirme uyarısıyla devam eder.
19. **Veri köprüsü (açık):** konu/etiket atamasının tek kaynağı site; site yokken eklenti fiilen "iki listeli filtre". Seçenekler `PLAN.md` 4.2'de.

---

## 6. Bilinen sorunlar ve sınırlar

1. **Veritabanı boş ve site yok:** her içerik "bilinmeyen". Konu/etiket mantığı yalnızca `docs/db.test-ornek*.json` ile denenebilir.
2. 5 sekmenin 430 px'e sığması **doğrulanmadı.** Yeni kontroller (kanal kontrol anahtarı, kararsız seçimi, konu başına menü) arayüzü uzattı; konu ızgarasında menü satır yüksekliğini artırır — gerçek pop-up'ta bakılmalı. Taşarsa: `options.css` sonuna `.tab-btn svg{display:none}`.
3. İzleme sayfasında kanal ID'si yok; yalnızca handle ile eşleşir.
4. Helper'ın kart işlendikten **sonra** yazdığı öznitelikler izlenmiyor.
5. Veritabanı büyürse (~5–10 MB üstü) her sayfada okuma maliyeti artar; önbellek gerekir.
6. **PIN düz metin** saklanıyor ve yalnızca arayüz kilididir.
7. İçe aktarma üzerine yazar (çakışma diyaloğu yok); `dbOverride` içe aktarma arayüzü yok.
8. Yalnızca veritabanında kaydı olan kanalların adı listede görünür; avatar yok.
9. Manifest `description` hâlâ "otomatik senkronizasyon" diyor (yok). `google.com` host izni geniş.
10. Firefox `strict_min_version: 109` ile `world: "MAIN"` çakışıyor (~128'de geldi); yedek enjeksiyon test edilmedi.
11. `setInterval` ile yoklama (izleme sayfası 1 sn, helper 2 sn); `yt-navigate-finish` ile değiştirilebilir.
12. Arayüz (jsdom) smoke testleri repoda değil. PR 6B'de yazılan harness'ler (içerik betiği ve `options.html`) bu sohbette kullanıldı; `tests/smoke/` altına alınmalı (`PLAN.md` PR 8).
13. Rozet metinleri değişti ("GÜVENLİ/EĞİTİCİ" → "BEYAZ LİSTE" vb.).
14. **Banner/filtre gerçek tarayıcıda doğrulanmadı.** jsdom'da engelli video ve kanal sayfasında banner çıkıyor, istisna butonu çalışıyor, yeniden çizim yok. Tarayıcıda test için: derleyin, uzantıyı yenileyin, YouTube'u F5 ile yenileyin, konsolu açıp **"YT Filter" ile filtreleyin**: `YT Filter: hazır {mod, etiketlenmemis, beyaz, kara, dbKanal, dbVideo, dbHatalar}` ve her sayfa için `YT Filter: sayfa kararı …` satırı görünmeli. Satır yoksa betik çalışmıyordur (yükleme/derleme); satır var ama banner yoksa karar/CSS sorunudur.
15. **Eski testler:** PR 2–5 testleri 2026-10-19'da yeni kurala uyduruldu (video-yoksa-kanal, `kararsiz*` alanları, eski `"engelli"` → genel eylem). `node --test` bu düzeltmeyle birlikte yeşil.
16. **Hızlı ekleme bandı (PR 6C) Node'da test edildi, gerçek pop-up'ta denenmedi.** Mesajlaşma (`chrome.tabs.sendMessage`) ve YouTube sekmesiyle karar+sebep gösterimi tarayıcıda doğrulanmalı. İçerik betiği yoksa URL yedeği devreye girer; bu yolda karar yerel `icerikKarari` ile hesaplanır.
17. **Asgari oy eşiği** yok: tek upvote'lu etiket (Argo +1) "her zaman engelle" kuralıyla videoyu engelletebilir (site tarafı kararı).
18. İlk açılış PIN kartı yalnızca **kilit açıkken** görünür; `pinIptal` işaretliyse ya da PIN yoksa zaten açıktır, sorun yok. PIN, yedek içe aktarmadan gelirse kart çıkmaz.

---

## 7. Çalıştırma ve test

```
node scripts/build.js                       # chromium/ ve firefox/ üretir  (--target chromium | --watch)
node --test tests/karar-v2.test.js          # yeni kurallar (28 test)
node --test tests/pr6c.test.js              # hızlı bant sebep/özet/istisna sayısı (3 test)
node --test                                  # tüm birim testleri (Node 18+; klasör yolu vermeyin, Node 22'de hata verir)
```
Chrome: `chrome://extensions` → Geliştirici modu → "Paketlenmemiş yükle" → `chromium/`. Her değişiklikte uzantıyı yenile **ve** YouTube sekmesini F5 ile yenile.

Elle deneme ipuçları:
- İlk açılış seçimini yeniden görmek: pop-up konsolunda `chrome.storage.local.get('ayar', r => { r.ayar.etiketlenmemis = null; chrome.storage.local.set({ayar: r.ayar}) })`
- PIN kartını yeniden görmek: `chrome.storage.local.remove(['pinKodu','pinKurulumAtlandi','pinDegistirildi'])`, pop-up'ı yeniden açın.
- **Konu/etiket mantığını denemek:** `docs/db.test-ornek-kararsiz.json` içeriğini geçici olarak `src/data/db.json`'a koyup derleyin. İçinde: `@trtspor` (spor), `@oyuncukanal` (oyun + küfür etiketi + kararsız şiddet), video `AAAAAAAAAAA` (teknoloji+AI, kararsız küfür), `BBBBBBBBBBB` (yalnızca argo etiketi), `CCCCCCCCCCC` (yalnızca kararsız spor). Mod/kararsız/kanal kontrol ayarlarıyla farklı sonuçlar alınır.
- Helper tanılaması: YouTube konsolunda `__ytFilterDiag()`.

Test yaklaşımı: saf modüller Node'da test edilir. Arayüz ve içerik betiği, jsdom + sahte `chrome.*` API'siyle denendi (harness repoya alınmadı).

---

## 8. Çalışma biçimi hakkında (kime devrediliyorsa)

- Talha her adımda küçük, uygulanabilir parçalar ve **dürüst durum bildirimi** ister; doğrulanmayan şeyi "çalışıyor" diye yazmayın. Test çıktılarını yapıştırır, oradan karar verilir.
- Türkçe yazışın. Gereksiz soru sormayın; karar gerektiren yerde seçenekleri ve önerinizi söyleyin.
- **Belgeler ile kod çelişirse yüklenen güncel dosyalar esastır.** (Bu proje geçmişinde `PLAN.md` "PR 5 tamam" derken kodda parçalar eksikti.)
- Her PR davranışı kontrol edilebilir küçüklükte olmalı; kırıcı değişikliği (veri şeması) mümkün olduğunca erken yapın.
- Ürün kuralı tartışmasında kaynak `docs/SISTEM_TASARIMI.md`'dir; belirsiz yerler orada ❓ ile işaretlidir, kendi başınıza yorumlamak yerine liderden teyit isteyin.
