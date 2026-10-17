# YouTube Filtreleyici — Devir Notu

> Bu belge, projeye sıfırdan giren bir kişinin ya da yapay zekânın kaldığımız yerden devam edebilmesi için yazıldı.
> Son güncelleme: 2026-10-17 · Kod tabanı: `TalhaOzz/YouTubeFilter` (fork) · Geliştirici: Talha (tek geliştirici, yapay zekâ desteğiyle)
> Yol haritası için `Plan.md`, değişiklik özeti için `CHANGELOG.md`, `db.json` sözleşmesi için `docs/db-sema.md` dosyalarına bakın.

---

## 1. Proje nedir?

YouTube'u filtreleyen bir tarayıcı eklentisi (Chromium + Firefox, Manifest V3). Hedef kitle **teknik bilgisi olmayan kullanıcılar** (ör. ebeveynler). Eklenti tamamen yerelde çalışır; sunucuya istek atmaz.

Eski sürümde her kanal/video elle bir "kategoriye" atanıyordu. Yeni sürümde iki bileşen var:

1. **Eklenti:** İçeriği, bir **veritabanındaki konu/etiket kayıtlarına** ve kullanıcının ayarlarına göre filtreler.
2. **Düzenleme sitesi (henüz yazılmadı):** Editörlerin kanal/video başına konu ve etiket girdiği, ziyaretçilerin JSON indirip rapor gönderebildiği web sitesi. Çıktısı eklentinin okuduğu `db.json`.

Veritabanı aylık güncellemelerle eklenti paketiyle (Chrome Web Mağazası) gelir; eklenti ağdan veri çekmez. İsteyen kullanıcı siteden JSON indirip elle içe aktarabilir (bu kısım henüz yok).

---

## 2. Ürün kuralları (orijinal "Final Özet"in derlenmiş hâli)

### 2.1 Kavramlar
- **Konu:** kanal/videonun kategorisi. **Etiket (flag):** uyarı bayrağı (küfür, şiddet vb.).
- Her kanal/video için **tam 1 ana konu (zorunlu)** + sınırsız yan konu + sınırsız etiket.
- **Kaydı olan video/kanal = incelenmiş.** Kaydı olmayan = **etiketlenmemiş**. Ana konu zorunlu olduğu için "konusu yok = denetlenmemiş".
- **Konu girilmiş ama etiket yoksa içerik zararsızdır.** Boş etiket listesi "incelendi, bayrak yok" demektir.

### 2.2 Varsayılan konular (15) — `src/core/taxonomy.js`
- `ders-okul` Ders / Okul · `egitici` Eğitici · `bilim` Bilim · `teknoloji` Teknoloji · `haber` Haber / Güncel olaylar
- `din` Din / Maneviyat · `eglence` Eğlence / Mizah · `oyun` Oyun · `spor` Spor · `muzik` Müzik
- `film-dizi-sanat` Film / Dizi / Sanat · `yasam-vlog` Yaşam / Vlog · `finans` Finans / Girişim
- `saglik-gelisim` Sağlık / Kişisel gelişim · `cocuk` Çocuk içerikleri

### 2.3 Varsayılan etiketler (8)
- `kufur` Küfürlü içerik — küfür içeren videolar
- `argo` Argolu içerik — hakaret içeren (aptal, salak vb.)
- `ai` AI ile üretilmiş içerik — YZ ile yapılmış videolar (emin değilseniz eklemeyin)
- `kumar` Kumar / bahis
- `siddet` Şiddet — dövüş, savaş, gerçekçi öldürmeli oyunlar; arada kalırsanız buraya
- `zararli` Zararlı / uygunsuz içerik — sigara, alkol, uyuşturucu, cinsel içerik, kanun ihlali
- `olumsuz-ornek` Olumsuz örnek — zorbalama, taciz, dinî açıdan uygun olmayan davranışlar
- `spam` Spam / sahte içerik — gerçekmiş gibi duran aldatıcı içerikler, çoğu trading/coin videosu

### 2.4 Uygulama içi listeler
- **Beyaz liste:** asla engellenmeyen kanal/videolar. **Kara liste:** her zaman engellenenler.
- **Etiketlenmemiş:** kaydı olmayan içerik. İlk açılışta kullanıcı seçer (aç/engelle) ve "veritabanı yeni bir proje, raporlarla gelişecek" diye bilgilendirilir.
- **Özel listeler:** kullanıcı kendi listelerini oluşturabilir; liste adı benzersiz. Dışarıdan içe aktarmada aynı ad varsa "üzerine yaz / yeniden adlandır / birleştir" sorulur (**henüz yapılmadı**).
- Varsayılan listeleri (konu/etiket içeriklerini) kullanıcı değiştiremez; yalnızca kendi listelerini ve beyaz/kara listeyi düzenler.
- Kanallar **ID ile** tanınmalı (handle değişebilir); arayüzde kanal adı, kullanıcı adı ve avatar gösterilmesi istendi.

### 2.5 Engelleme algoritması (3 mod)
Önce videonun, sonra kanalın konu ve etiketlerine bakılır. **"ve / veya" ve "konu / etiket" ayrımına dikkat.**
- **Serbest:** video veya kanalın *herhangi bir konusu* izinliyse **ve** (video incelenmişse) videoda engelli etiket yoksa açılır. Video incelenmemişse kanalın etiketlerine bakılır.
- **Orta:** yalnızca *ana konuya* bakılır; video incelenmişse kanal etiketleri yok sayılır. Video incelenmemişse kanala bakılır.
- **Katı:** video/kanalın *herhangi bir konusu engelliyse* **veya** video/kanaldan *herhangi birinde engelli etiket varsa* engellenir.
- Kullanıcı bazı etiketlere izin verebilir (ör. "şiddet"e izin verip diğerlerini engelleyebilir).

### 2.6 Engellenen sayfa deneyimi (henüz yapılmadı)
Engelli kanal/video açılınca tam sayfa banner: "Bu kanal şu listelerden dolayı engellendi: …", **Geri dön** ve **İstisna olarak beyaz listeye ekle** butonları. Aynısı videolar için de.

### 2.7 Düzenleme sitesi (henüz yapılmadı)
3 rol: **Admin** (editör yönetimi, her şey), **Editör** (link yapıştırır → varsa mevcut konu/etiketler seçili gelir → ana/yan konu ve etiket girer; eklenmiş kaydı tekrar ekleyemez), **Ziyaretçi** (girişsiz: güncel `db.json`'u indirir; konu/etiket önerisi/raporu gönderebilir).

---

## 3. Mimari

### 3.1 Dosya yapısı
```
src/
  background.js        kurulumda varsayılan veriyi yazar (çekirdek yüklenirse yeni model)
  content.js           YouTube sayfasında kartları işler, izleme sayfasını kontrol eder
  inject_helper.js     MAIN world'de çalışır; kart verisinden videoId/handle/kanalId'yi DOM'a yazar
  inject.css           rozet/bulanıklaştırma/gizleme stilleri
  options.html|css|js  pop-up arayüzü (430px genişlik, 5 sekme)
  core/
    taxonomy.js        konu/etiket tanımları, varsayilanAyar(), ayarTemizle(), kayitDogrula()
    decision.js        kararVer(ayar, video, kanal)  — SAF fonksiyon, asıl algoritma
    migrate.js         eski modelden (customMapping+preferences) yeni modele çeviri — saf
    db.js              db.json doğrulama/indeksleme (dbKur, dbSec)
    engine.js          ayarCoz, icerikKarari (db araması+karar), rozetBilgisi
  data/db.json         paketle gelen veritabanı (şimdilik boş)
manifests/             manifest.chromium.json, manifest.firefox.json
scripts/build.js       src/ + manifest -> chromium/ ve firefox/ klasörleri (yükleme için bunlar kullanılır)
tests/                 decision/migrate/db/engine .test.js (Node'un yerleşik test koşucusu)
docs/                  db-sema.md (sözleşme), db.test-ornek.json, DEVIR_NOTU.md
```
**Önemli:** Tarayıcıya `chromium/` klasörü yüklenir; kaynak her zaman `src/`. `node scripts/build.js` ile derlenir, `--watch` ile izlenir. Doğrudan `chromium/` içini düzenlemeyin.

### 3.2 Modül kuralları
- Bundler yok. `core/*.js` UMD biçimindedir: tarayıcıda `YTF` global nesnesine eklenir, Node'da `require` edilir. Yükleme sırası manifestlerde: `taxonomy → decision → migrate → db → engine → content`.
- `core/` içindeki dosyalar **DOM veya `chrome.*` kullanmaz** (test edilebilirlik için). DOM işi `content.js`/`options.js`'tedir.
- Kod, yorum ve arayüz Türkçedir; tanımlayıcılar Türkçe (`kararVer`, `ayarCoz`).

### 3.3 Depolama (`chrome.storage.local`)
| Anahtar | İçerik |
|---|---|
| `surum` | `2` = yeni model |
| `ayar` | kullanıcı filtre ayarı (aşağıda) |
| `eskiYedek` | eski `customMapping`+`preferences` kopyası (geri dönüş için) |
| `customMapping`, `preferences` | eski anahtarlar, **silinmedi** |
| `ayarlar` | arayüz anahtarları: `shortsGizle, yorumGizle, onerilenGizle, otomatikOynatmaKapat, pinIptal, koyuTema` |
| `pinKodu`, `pinDegistirildi`, `ilkGirisYapildi`, `kurulumTarihi` | PIN ve kurulum bilgisi |
| `dbOverride` | (planlı) elle içe aktarılan veritabanı |

`ayar` şekli:
```json
{
  "mod": "orta",                       // serbest | orta | kati
  "konular":   { "oyun": "izinli" },   // her konu: izinli | engelli
  "etiketler": { "kufur": "engelli" }, // her etiket: engelli | izinli
  "etiketlenmemis": null,              // "ac" | "engelle" | null (null = henüz seçilmedi, engelle gibi davranır)
  "engelEylemi": "kaldir",             // kaldir | bulaniklastir  (engellenen kartın görünümü, GENEL)
  "rozetGoster": true,
  "listeler": { "beyaz": {"@kanal": true}, "kara": {}, "ozel": [ { "ad": "Okul", "eylem": "izinver|engelle", "uyeler": {"@x": true} } ] }
}
```
Liste anahtarları **küçük harfe çevrilmiş** kanal `@handle`, kanal `UC…` ID'si veya video ID'sidir.

### 3.4 Karar akışı (`core/decision.js`)
1. **Listeler.** Önce video düzeyi, sonra kanal düzeyi. Her düzeyde sıra: beyaz → kara → özel listeler. Video düzeyi kanal düzeyini yener; aynı düzeyde beyaz kara listeyi yener.
2. **Ne video ne kanal incelenmişse:** `ayar.etiketlenmemis` (`null` ise engelle).
3. **Mod kuralları** (bkz. 2.5). Bilinmeyen konu "izinli", durumu belirtilmemiş etiket "engelli" sayılır.
4. Sonuç: `{ karar: 'ac'|'engelle', sebepler: [...] }`. Sebep türleri: `liste`, `etiketlenmemis`, `konu`, `etiket`, `izinli-konu-yok`.

`core/engine.js → icerikKarari` veritabanından kayıtları bulup bu fonksiyonu çağırır; DB'de kanal bulunursa eksik id/handle bilgisini tamamlar (liste ID ile, ekrandan gelen handle ise de eşleşsin diye).

### 3.5 Veri geçişi (eski → yeni)
- **PR 3'ten beri:** `engine.ayarCoz` eski depoyu **her seferinde bellekte** yeni modele çevirir (kalıcı yazmaz).
- **PR 4'ten beri:** pop-up ilk açıldığında bir kez kalıcı geçiş yapılır (`surum: 2`, `ayar`, `eskiYedek`).
- Kurallar: etiketin eylemi "İzin Ver" ise o etiketli kayıtlar → beyaz liste, aksi → kara liste (core etiketler); kullanıcının kendi kategorileri → özel liste (eylem izinver/engelle); `untagged` tercihi → `etiketlenmemis`; herhangi biri "Tamamen Kaldır" ise `engelEylemi=kaldir`, yalnızca bulanıklaştırma varsa `bulaniklastir`; rozet: biri bile "Show Badge" ise `rozetGoster=true`.
- Dışarıdan gelen her ayar `ayarTemizle` ile doğrulanır (bozuk/bilinmeyen alan atılır, varsayılanla doldurulur).

### 3.6 `db.json` (sema 1)
Ayrıntı: `docs/db-sema.md`. Özet: `{sema:1, veriSurumu:int, kanallar:[{id:"UC…", handle?, ad?, avatar?, anaKonu, yanKonular[], etiketler[]}], videolar:[{id:"11 karakter", anaKonu, yanKonular[], etiketler[]}]}`. Geçersiz kayıtlar tek tek atlanır. `veriSurumu` büyük olan (paketli veya `dbOverride`) kazanır. Aynı id iki kez gelirse sonuncusu geçerli.

### 3.7 Kanal/video tanıma (kritik, kırılgan)
- `inject_helper.js` (MAIN world) kartların iç verisini (`el.data` vb.) okuyup `data-yt-exposed-id / -channel / -channel-id` özniteliklerini yazar. YouTube yapıyı değiştirdiği için sabit yollar yetmedi; **anahtar adına göre derin arama** (`videoId`/`contentId`, `browseId`=UC…, `canonicalBaseUrl`=/@…) kullanılır. Ölçüm (ana sayfa, 85 kart): video ID %100, handle ~%75, kanal ID ~%76.
- `content.js` DOM linklerinden (`/watch?v=`, `/@handle`) yedek okur; bu yüzden helper başarısız olsa bile filtre çalışır.
- Konsolda `__ytFilterDiag()` helper'ın o sayfada neyi bulduğunu gösterir (tanılama aracı).
- İzleme sayfasında kanal ID'si yok (yalnızca handle).

---

## 4. Yapılanlar (kronoloji)

| PR | Ne yapıldı | Durum |
|---|---|---|
| 0 | Mevcut kodun incelenmesi; hatalar listelendi (aşağıda) | tamam |
| 1 | `kararVer` tek noktası; helper'a kanal ID'si + derin arama; `__ytFilterDiag()`; kopya CSS kaldırıldı | **kullanıcı çalıştırdı** (tanılama çıktısı alındı) |
| 2 | `taxonomy/decision/migrate` + 24 test | **kullanıcı testleri çalıştırdı, geçti** |
| 3 | `db.js`, `engine.js`, `content.js`'in yeni motora bağlanması, manifest/WAR güncellemesi, `data/db.json`, `docs/db-sema.md`; toplam 42 test; jsdom smoke testi | testler kullanıcıda geçti; **tarayıcıda davranış kontrolü bildirilmedi** |
| 4 | Arayüz: Filtre sekmesi, Listeler/özel listeler, Görünüm kartı, ilk açılış seçimi, kalıcı geçiş, `ayarTemizle` sertleştirmesi, Türkçe harf düzeltmesi; 49 test + jsdom arayüz testi (55 kontrol) | **teslim edildi, kullanıcı henüz uygulamadı/test etmedi** |

### Başlangıçta bulunan hatalar
- Helper'da `@@` (regex zaten `@ad` yakalıyor, bir `@` daha ekleniyordu) → düzeltildi.
- `extractChannelHandle` yedek yolu kanalın **görünen adını** döndürüyordu → kaldırıldı.
- `applyFilter` ve `checkWatchPage` aynı mantığı iki kez içeriyordu → tek fonksiyona indi.
- `background.js` ile `options.js`'in "etiketlenmemiş" varsayılanı tutarsızdı.
- Özel kategori adında boşluk olunca `#${tag}-visibility` seçicisi bozuluyordu → ID'li yeni modelle ortadan kalktı.
- Arayüz kullanıcı metinlerini `innerHTML` ile basıyordu (içe aktarılan JSON ile XSS) → DOM ile basılıyor.
- Türkçe `I/ı` yüzünden "ders KANALLARI" ≠ "Ders kanalları" sayılıyordu → `toLocaleLowerCase('tr-TR')`.
- Liste araması `constructor` gibi nesne özelliklerine takılabiliyordu → `hasOwnProperty`.

---

## 5. Verilen kararlar ve varsayımlar (gerekçeleriyle)

1. **Karar fonksiyonu saf ve ayrı dosyada.** Gerekçe: "ve/veya" hataları en kolay burada yapılır; Node'da test edilir.
2. **Bundler yok.** Gerekçe: proje küçük, build.js yalnızca kopyalıyor.
3. **Veritabanı pakette, depoda değil.** Gerekçe: `storage.local` kotası ve ağ isteğinin olmaması. Okuma: `fetch(runtime.getURL('data/db.json'))` (WAR gerekli).
4. **Öncelik:** beyaz > kara; video düzeyi > kanal düzeyi. (Özet açık söylemiyordu; bizim varsayımımız.)
5. **Orta modda video incelenmemişse** kanalın *ana konusunun da izinli olması* şart koşuldu (özet yalnızca "kanal etiketi yoksa açılır" diyor). Test: "ORTA: video incelenmemişse kanalın ana konusu da izinli olmalı (varsayım)". Harfiyen okumak isteyen tek satır değiştirir.
6. **`etiketlenmemis: null` iken engelle.** Güvenli taraf.
7. **Engel eylemi (kaldır/bulanıklaştır) şu an GENEL ayar.** Eski modeldeki etiket başına eylem kayboldu. **Yeniden düşünülüyor** (bkz. `Plan.md`, "Karar bekleyen konular").
8. **Özel liste = beyaz/kara listeyle aynı güçte "istisna grubu"** (eylem: engelle/izinver). Spec özel listelerin anlamını tanımlamıyordu. **Yeniden düşünülüyor.**
9. **Bir kayıt tek listede bulunur;** başka listeye eklenince taşınır (eski modeldeki "bir ID = bir etiket" davranışı).
10. **Kalıcı geçiş ancak arayüzle birlikte** (PR 4). Gerekçe: eski arayüz eski veriyi yazarken motoru yeni modele bağlarsak değişiklikler yansımazdı.

---

## 6. Bilinen sorunlar ve sınırlar

1. **Mantık boşluğu (açık):** Hızlı ekleme ve "Kanal/Video Ekle" yalnızca beyaz/kara/özel liste sunuyor; konu ve etiketler bu akışta hiç görünmüyor. Çerçeve önerisi `Plan.md`'de ("Üç katman").
2. 5 sekme 430 px'e sığıyor mu **doğrulanmadı** (jsdom yerleşimi ölçmez). Taşarsa: `options.css` sonuna `.tab-btn svg{display:none}`.
3. İzleme sayfasında kanal ID'si yok; yalnızca handle ile eşleşir.
4. Helper'ın kart işlendikten **sonra** yazdığı öznitelikler izlenmiyor (MutationObserver yalnızca eklenen düğümlere bakıyor).
5. Veritabanı büyürse (~5–10 MB üstü) her sayfada okuma maliyeti artar; arka planda önbellek gerekir.
6. **PIN düz metin** saklanıyor ve yalnızca arayüz kilididir; gerçek güvenlik sağlamaz.
7. İçe aktarma şu an üzerine yazar (çakışma diyaloğu yok); `dbOverride` içe aktarma arayüzü yok.
8. Yalnızca veritabanında kaydı olan kanalların adı listede görünür; avatar yok; kullanıcının eklediği kanalların adı toplanmıyor.
9. Manifest `description` hâlâ "otomatik senkronizasyon" diyor (yok). `google.com` host izni geniş (mağaza incelemesinde sorulabilir).
10. Firefox `strict_min_version: 109` ile `world: "MAIN"` çakışıyor (MAIN world ~128'de geldi); `content.js` yedek enjeksiyonla çalışıyor ama test edilmedi.
11. `setInterval` ile yoklama (izleme sayfası 1 sn, helper 2 sn); `yt-navigate-finish` ile değiştirilebilir.
12. Arayüz (jsdom) smoke testleri repoda değil; yalnızca birim testleri `tests/`'te.
13. Rozet metinleri değişti ("GÜVENLİ/EĞİTİCİ" → "BEYAZ LİSTE" vb.).

---

## 7. Çalıştırma ve test

```
node scripts/build.js            # chromium/ ve firefox/ üretir  (--target chromium | --watch)
node --test                      # birim testleri (Node 18+), tests/ altındakileri otomatik bulur
```
Chrome: `chrome://extensions` → Geliştirici modu → "Paketlenmemiş yükle" → `chromium/`. Her değişiklikte uzantıyı yenile **ve** YouTube sekmesini F5 ile yenile.

Elle deneme ipuçları:
- İlk açılış seçimini yeniden görmek: pop-up konsolunda `chrome.storage.local.get('ayar', r => { r.ayar.etiketlenmemis = null; chrome.storage.local.set({ayar: r.ayar}) })`
- Veritabanı yolunu denemek: `docs/db.test-ornek.json` içeriğini geçici olarak `src/data/db.json`'a koyun (yalnızca `@trtspor` kanalı, konu `spor`), katı mod + `spor` engelli yapın.
- Helper tanılaması: YouTube konsolunda `__ytFilterDiag()`.

Test yaklaşımı: saf modüller Node'da test edilir. Arayüz ve içerik betiği, jsdom + sahte `chrome.*` API'siyle denendi (bu harness repoya henüz alınmadı).

---

## 8. Çalışma biçimi hakkında (kime devrediliyorsa)

- Talha her adımda küçük, uygulanabilir parçalar ve **dürüst durum bildirimi** ister; doğrulanmayan şeyi "çalışıyor" diye yazmayın. Test çıktılarını bana yapıştırır, oradan karar verilir.
- Türkçe yazışın. Gereksiz soru sormayın; karar gerektiren yerde seçenekleri ve önerinizi söyleyin.
- Her PR davranışı kontrol edilebilir küçüklükte olmalı; kırıcı değişikliği (veri şeması) mümkün olduğunca erken yapın.
