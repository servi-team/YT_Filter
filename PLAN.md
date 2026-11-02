# YouTube Filtreleyici — Plan

> Canlı belge. Her PR bittiğinde "Durum" tablosu güncellenir; kararlar netleşince "Karar bekleyen konular"dan `DEVIR_NOTU.md` bölüm 5'e taşınır.
> Son güncelleme: 2026-10-27 (Site S1–S7 kodlandı ve devir belgeleri uzlaştırıldı; öncesi D4 yayın kararları, D3 site kararları, D2 mağaza engelleri, 8F mağaza hazırlığı)
> **Kural kaynağı:** `docs/SISTEM_TASARIMI.md`. Plan ile çelişirse o belge geçerlidir.

## 1. Hedef

Teknik bilgisi olmayan kullanıcıların kullanabileceği, **konu + etiket tabanlı** bir YouTube filtresi:

1. **Eklenti:** içeriği veritabanındaki konu/etiket kayıtlarına ve kullanıcının politikasına göre filtreler (tamamen yerelde).
2. **Düzenleme sitesi ("YouTube Filter Store"):** ziyaretçiler hesap açmadan kanal/video başına konu ve etiketi **oylar**; site sonucu hesaplar; ziyaretçi güncel JSON'u indirir ve kayıtsız link için ekleme talebi gönderir.
3. **Dağıtım:** veritabanı aylık güncellemelerle eklenti paketiyle gelir (Chrome Web Mağazası); Firefox desteği korunur.

## 2. Durum

| PR | Konu | Durum |
|---|---|---|
| 1 | Zemin: tek karar noktası, helper'a kanal ID'si, tanılama | ✅ tamam, doğrulandı |
| 2 | Çekirdek: taxonomy / decision / migrate + testler | ✅ tamam |
| 3 | Motoru eklentiye bağlama, `db.json` sözleşmesi, manifest | ✅ teslim edildi; **tarayıcıda davranış kontrolü bekliyor** |
| 4 | Arayüz: Filtre sekmesi, listeler, ilk açılış seçimi, kalıcı geçiş | ✅ tamam, doğrulandı |
| 5 | Çerçeve düzeltmesi + etiket başına eylem | ⚠️ **kısmen.** Etiket başına eylem ✅. **Eksik:** hızlı ekleme bandında karar+sebep, pop-up ↔ sayfa mesajlaşması, "İstisnalar" adlandırması, çok-istisna uyarısı (dosyalarda yok) → **PR 6C** |
| 6 | Engel sayfası (tam sayfa banner) | ⚠️ kodlandı (0b2272b). jsdom'da çalışıyor; **gerçek tarayıcıda doğrulanmadı** (aşağıdaki test listesi) |
| **6B** | **Lider dökümanına uyum:** video-yoksa-kanal, kanal kontrol ayarı, kararsız, konu/etiket başına eylem + Uyarı sayfası, kanal sayfası banner'ı, PIN seçimi, banner düzeltmeleri | ✅ **Node birim testleri yeşil (eski testler güncellendi); tarayıcıda denenmedi** |
| **6C** | **Hızlı ekleme bandı: karar + sebep, pop-up ↔ sayfa mesajlaşması, "İstisnalar" adlandırması, çok-istisna uyarısı** | ✅ kodlandı, `node --test` yeşil; **tarayıcıda denenmedi** |
| **7** | **İçe/dışa aktarma:** liste paketi (tek/tümü), çakışma diyaloğu (birleştir/üzerine yaz/yeniden adlandır), `db.json` içe aktarma + `dbOverride` | ✅ kodlandı, `node --test` yeşil (94 test); **tarayıcıda denenmedi** |
| **8A** | **Manifest sertleştirmesi:** açıklama düzeltildi, `google.com` izni kaldırıldı, Firefox ≥128 (D2: ≥140) / Chrome ≥111 | ✅ kodlandı, `node --test` yeşil (96 test); tarayıcıda yalnızca yükleme denemesi kaldı |
| **8B** | **jsdom smoke testleri repoda:** `tests/smoke/` (bugün options 7 + content 5), `jsdom ^27` devDependency | ✅ kodlandı, `node --test` yeşil (PR 8B'de 105 test; bugün 116) |
| **8C** | **PIN karma saklama:** `core/pin.js` (PBKDF2-SHA256, 120.000 iterasyon), arayüz akışları, eski düz metin yükseltme | ✅ kodlandı, `node --test` yeşil (109 test); tarayıcıda PIN akışı denenmeli |
| **8D** | **Yoklama azaltma:** `content.js` olay tabanlı sayfa kontrolü, `inject_helper.js` MutationObserver taraması | ✅ kodlandı, `node --test` yeşil (110 test); tarayıcıda gezinme/geri tuşu denenmeli |
| **8E** | **Listelerde kanal adı/avatarı:** `kanalBilgileri` deposu, sayfadan toplama, listede avatar + ad | ✅ kodlandı, `node --test` yeşil (112 test); tarayıcıda kanal ekleme denenmeli |
| **8F** | **Mağaza hazırlığı:** listeleme metinleri, gizlilik politikası, sürüm akışı, kontrol listesi, ikonlar/mağaza görselleri | ✅ kodlandı (`docs/MAGAZA_HAZIRLIK.md`, `docs/MAGAZA_ELLE.md`, `docs/GIZLILIK.md`, `README.md`), 116 test; **elle:** tarayıcı testleri, ekran görüntüleri, mağaza yüklemesi; video ertelendi, gizlilik URL'i GitHub Pages'te (build doğrulanacak) |
| 8 | Sağlamlaştırma ve mağaza hazırlığı (8A ✅, 8B ✅, 8C ✅, 8D ✅, 8E ✅, 8F ✅ kod tarafı) | ✅ tamam: kalan işler tarayıcı/mağaza hesabı gerektirir (aşağıdaki doğrulama listesi) |
| S | Düzenleme sitesi + oylama | ✅ **S1–S7 kodlandı (2026-10-27)**; site test/tip/build yeşil. Docker/PostgreSQL, gerçek tarayıcı QA'sı, ekran görüntüleri ve mağaza yüklemesi kullanıcıda. Ayrıntı: 4.4 ve `PLAN_SITE.md`; SISTEM #1/#2/#3/#18/#19 onaylı; #8/#10/#11 yalnızca eklenti davranışı için teyit bekliyor. |

### Önce yapılacak: mağaza öncesi gerçek tarayıcı doğrulaması
Adım adım kontrol listesi: **`docs/MAGAZA_ELLE.md` bölüm 1**. Aşağıdaki maddeler o listenin ayrıntılı tanılama notlarıdır.

**Hazırlık:** `node scripts/build.js`, `chrome://extensions` → eklentiyi yenile, YouTube'u F5 ile yenile, **eski `chromium/` klasörü yüklü kalmasın.** 8A sonrası manifest izinleri değişti; yükleme hatası olmadan açıldığını ve eklenti simgesinin çalıştığını doğrulayın. Konsolu açıp **"YT Filter"** ile filtreleyin. Beklenen: sayfa başına bir `YT Filter: hazır {…}` ve her sayfa için `YT Filter: sayfa kararı …` satırı. (`typeof YTF` konsolda anlamsız; içerik betiği izole dünyada.)

1. Kara listedeki **video** sayfası → tam sayfa banner (titremiyor).
2. Kara listedeki **kanal** sayfası (`/@kanal`) → tam sayfa banner; kanal vitrini videosu duruyor.
3. Banner'da sebep okunur yazıyor mu? ("Kara listede (video)", "Etiket: … (kanal)" vb.)
4. **Geri dön** tarayıcı geçmişine dönüyor mu?
5. **İstisna: Beyaz listeye ekle** → sayfa anında açılıyor mu?
6. Ana sayfada kara listedeki kanalın kartı: *Gizle / Bulanıklaştır / Uyarı sayfası* üç ayarda doğru görünüyor mu?
7. `docs/db.test-ornek-kararsiz.json`'u `src/data/db.json`'a koyup (derleyin) mod/kararsız/kanal kontrol ayarlarını deneyin (`DEVIR_NOTU` bölüm 7).
8. Pop-up 430 px'te taşmıyor mu? (konu menüleri, kanal kontrol anahtarı, kararsız seçimi)
9. PIN (8C): PIN kaydet → uygulamayı kapat/aç → kilidi doğru PIN açar, yanlış PIN açmaz. Depoda `pinKodu` `pbkdf2-sha256$` ile başlamalı (DevTools → Application → Storage). Eski düz metin kayıtlı bir profilde ilk girişten sonra depo karma'ya dönmeli.
10. Gezinme (8D): ana sayfa → video → geri tuşu; her adımda banner/kart kararı doğru mu, konsolda hata var mı? (Eski 1 sn yoklama kaldırıldı.)
11. Kanal adı/avatarı (8E): bir kanal sayfasında pop-up'tan "Her zaman engelle" → İstisnalar listesinde avatar + ad görünüyor mu? Depoda `kanalBilgileri` girdisi oluşuyor mu? (DevTools → Application → Storage)

## 3. Mantık çerçevesi: üç katman

**Sorun:** Hızlı ekleme düğmesi ve "Kanal/Video Ekle" alanı yalnızca beyaz/kara/özel liste sunuyor. Kullanıcı hep listeye ekleyerek ilerlerse konular ve etiketler hiç devreye girmiyor; sistemin asıl değeri (veritabanı) atlanıyor. Üstelik o tarihte veritabanı boştu ve site yoktu; kullanıcının konu/etiket atamasının hiçbir yolu yoktu. (Site S1–S7 ile 2026-10-27'de kodlandı.)

**Çözüm:** Listeler *asıl mekanizma değil, istisnadır*. Üç katman:

| Katman | Kim belirler | Ne için | Nerede |
|---|---|---|---|
| **1. Kural** | Kullanıcı | Genel politika: mod, hangi konulara izin, hangi etiket engellenecek **ve nasıl (Gizle/Bulanıklaştır/Uyarı sayfası)**, kanal kontrolü, kararsız/bilinmeyen seçimi | **Filtre** sekmesi |
| **2. Veri** | Editörler + topluluk oyları | Hangi içerik hangi konu/etiketle işaretli (ve hangisi kararsız) | `db.json` (kullanıcı değiştiremez) |
| **3. İstisna** | Kullanıcı | Tek tek kanal/video için "kuralı yok say" | **Listeler** sekmesi, hızlı ekleme |

**İlke:** *Önce kural çalışır. Liste, kuralın yanlış kaldığı yerde istisnadır; istisna her zaman kuralı geçer.*

### Arayüze etkisi (PR 6C'de yapıldı)
1. **Hızlı ekleme bandı önce kararı ve sebebini gösterir:** "Şu an: ENGELLENİYOR — Konu: Oyun (engelli)" / "Bilinmeyen içerik". Sonra istisna seçenekleri: **Her zaman izin ver / Her zaman engelle.** (Pop-up, sayfadaki kanal/video bilgisini içerik betiğinden mesajla ister; `content.js`'te `onMessage` dinleyicisi eklenecek.)
2. **Yanlış etiket olabilir mi?** → "Bildir" düğmesi (site hazır olana kadar pasif/gizli). Veritabanının düzelmesi istisnadan daha kalıcı bir çözümdür.
3. **Listeler sekmesi "İstisnalar"** diye adlandırılır; açıklaması "kuralları geçersiz kılar" der. Beyaz liste = "Her zaman izin ver", Kara liste = "Her zaman engelle". (Spec'teki adlar parantezle korunur.)
4. **Çok istisna uyarısı:** liste ~50 kaydı geçerse "Çok istisnanız var; kuralları gözden geçirin veya yanlış etiketleri bildirin."
5. Bilinmeyen içerikte kullanıcının elinde yalnızca istisna olduğu için orada beyaz liste doğal yoldur; bilgi metni bunu söyler.

### Açık nokta: özel listelerin anlamı
Lider dökümanı özel listeleri anmıyor. Şu an: beyaz/kara liste gücünde "istisna grubu" (eylem: engelle / izin ver).
Alternatif: özel liste = kullanıcının **kendi konusu** (ör. "Ders kanalları").
**Öneri:** şimdilik istisna grubu olarak kalsın; gerçek kullanım görülünce yeniden bakılır.

## 4. Karar bekleyen konular

### 4.1 Çözüldü
- **Etiket/konu başına eylem** — ✅ KARAR VERİLDİ (lider dökümanı 3/C, PR 6B): `konular[id]` ve `etiketler[id]` ∈ `izinli | kaldir | uyari | bulaniklastir`. En sert sebep kazanır: kaldir > uyari > bulaniklastir. Liste/bilinmeyen kaynaklı engeller genel `engelEylemi`'ni kullanır. (Eski "konulara eylem yok" kararı geçersiz.)
- **Orta modda incelenmemiş video** — ✅ lider: "video verisi yoksa kanala bak"; kanal ana konusunun da izinli olması ek şartı kalktı.
- **Video+kanal birlikte mi, video-yoksa-kanal mı** — ✅ video-yoksa-kanal.

### 4.2 SISTEM bölüm 6 yorumları

**2026-10-21'de onaylandı** (site uygulayacak; eklenti tarafında ek değişiklik gerekmiyor):

- **SISTEM #1 — Ana konu:** net puan esas alınır.
- **SISTEM #2 — Beraberlik:** önce net puan, eşitse **upvote sayısı fazla olan**, o da eşitse `taxonomy.KONULAR` sırasındaki ilk konu. *(2026-10-22: upvote adımı eklendi; 10-21'de yalnızca liste sırası onaylanmıştı.)*
- **SISTEM #3 — Kararsız:** net 0 **ve** en az bir oy; 0/0/0 kayda girmez.
- **SISTEM #18 — Asgari oy eşiği:** en az 3 oy. Eşik altındaki konu/etiket değerlendirilmez.
- **SISTEM #19 — Beyaz liste:** mutlak; etiket koruması/ebeveyn kilidi 2.0.0 dışında ayrı ayar olarak değerlendirilecek.

**Hâlâ teyit bekleyen** (mevcut kod davranışı korunuyor):

- **SISTEM #8 — Serbest + kararsız konu:** kararsız konu izinli sayılsın mı?
- **SISTEM #10 — Orta "Kararsızlar: Engelle":** kullanıcının engellediği kararsız kesinleşmiş gibi mi sayılsın?
- **SISTEM #11 — Katı'da kararsızlar:** aynı davranış uygulanmalı mı?

Ayrıntı ve öneriler: `docs/SITE_HAZIRLIK.md` bölüm 2.

### 4.3 Veri köprüsü — karar verildi

- **Karar (2026-10-21): A — site beklenecek.** B yerel köprü uygulanmayacak. Site hazır olana kadar `docs/db.test-ornek*.json` ile elle test.
- Seçeneklerin geçmişi: **A)** siteyi öne al; **B)** eklentiye aynı şemada yerel kayıt düzenleyicisi ekle. Ayrıntı: `docs/SITE_HAZIRLIK.md` bölüm 3.

### 4.4 Site kararları (2026-10-22/27)

Ayrıntı ve fazlar: `PLAN_SITE.md`; uygulama: `site/README.md`.

- **Yığın:** TypeScript (Node 22) + Next.js + PostgreSQL + Caddy, Docker Compose, aynı depoda `site/`. Node 22 + npm; PGlite yalnızca geliştirme/test sürücüsü, üretimde PostgreSQL. (Önceki aday C#/ASP.NET Core + SQLite bırakıldı.)
- **Roller:** Ziyaretçi (hesapsız; **oy verir**, `db.json` indirir, ekleme talebi gönderir), Editör (yeni kanal/video kaydı ekler + talep kuyruğu + moderasyon), Admin (editör + hesap/rol/aktiflik yönetimi + metadata düzeltme + arşiv/geri getirme + `db.json` yayını; taksonomi salt okunur). Hesap yalnızca Editör/Admin için.
- **Anonim oy:** HttpOnly çerez kimliği ile hedef + konu/etiket başına tek oy, serbest değiştirme; IP hız sınırı; düz IP saklanmaz, HMAC-SHA256 IP özeti oy kayıtlarında 30 gün (aktif engelde engel süresince) tutulur; captcha yok. Zayıf koruma bilinçli seçildi; güvence moderasyon + 3 oy eşiği.
- **Moderasyon:** oy geri alma (ziyaretçi geri alması geçici, moderasyon geri alması kalıcı), kayıt kilidi, çerez/ağ engeli; editör sonucu elle yazamaz, işlemler gerekçeli ve kayıtlıdır. Panelde yalnızca `çerez:xxxxxxxx` / `ağ:xxxxxxxx` takma etiketleri görünür. Kilitte `db.json`'a kilit anındaki sonuç yazılır.
- **Arşiv ve yayın:** İçerik silinmez, arşivlenir; arşivli kayıt kamusal listeden ve yeni `db.json`'dan çıkar, oyları/kilit/moderasyon geçmişi korunur. `db.json`'ı yalnızca admin yayınlar; geçmiş sürümler `?surum=N` ile sabit kalır.
- **Oy hedefi:** video linki yalnızca videoya, kanal linki yalnızca kanala. Video eklemek kanal satırı oluşturmaz; kanal bilgisi videoda taşınır.
- **Eşik ve beraberlik:** en az 3 toplam oy; ana konuda net puan → upvote → `KONULAR` sırası. Oy almamış kayıt `db.json`'a yazılmaz.
- **Gizlilik ve istemci:** Yerel fontlar; üçüncü taraf font/analitik/reklam yok. Site gizlilik metni `/gizlilik`, eklenti metni `docs/GIZLILIK.md`; iki metin ayrıdır. Site v1'de “Bildir” uç noktası/formu yoktur.
- **2026-10-27'de çözülenler:** `docs/SITE_HAZIRLIK.md` ve `docs/puan-sistemi-onerisi.md` uygulanan kurallarla hizalandı; metadata için YouTube Data API anahtarı opsiyonel, yoksa oEmbed/HTML fallback kullanılıyor; kilit/geri alma için admin onayı gerekmiyor (editör tek başına, gerekçeli ve kayıtlı); yayını yalnızca admin onaylıyor; oy IP özeti 30 gün (aktif engelde engel süresince) saklanıyor; site gizlilik metni `/gizlilik` taslağında. Çok admin ve son admin koruması, arşiv/geri getirme ve site içi rapor uç noktasının olmaması da bu tarihte netleşti.
- **Kullanıcıda kalanlar:** gerçek tarayıcı/ekran okuyucu QA'sı ve ekran görüntüleri, Docker/PostgreSQL/Caddy üretim denemesi, gerçek eklentiye `db.json` yükleme, mağaza yüklemesi ve hukuki inceleme.

## 5. Yol haritası

### PR 6B — ✅ tamam (2026-10-19)
`decision.js` yeniden yazıldı (kaynak seçimi, `kanalKontrol`, kararsız); şema: `konular/etiketler` eylem değerleri, `kanalKontrol`, `kararsiz`, `engelEylemi` ∋ `uyari`; `db.js`/`kayitDogrula` kararsız + ana konusuz kayıt; `engine.js` eylem çözümleme; `content.js` (kanal sayfası banner'ı, uyarı kapağı, yeniden çizim/yükleme/Firefox düzeltmeleri, günlük); arayüz (kanal kontrol, kararsız, konu/etiket menüsü, PIN kartı); `tests/karar-v2.test.js` (28). **Kabul:** `SISTEM_TASARIMI.md` bölüm 4 örnekleri testte geçiyor; eski kullanıcı verisi bozulmuyor. **Kalan:** gerçek tarayıcı doğrulaması (`DEVIR_NOTU` 6/#14). Eski testler 6B kurallarına uyduruldu.

### PR 6C — ✅ kodlandı (2026-10-19)
- `content.js`: üst çerçevede `runtime.onMessage` (`tur: 'sayfaDurumu'`) — kimlik + `kararOzeti`.
- Pop-up önce içerik betiğine sorar, olmazsa URL yedeği + yerel `icerikKarari`.
- Hızlı bant: "Şu an: ENGELLENİYOR/AÇIK" + sebep; düğmeler "Her zaman izin ver / Her zaman engelle"; "Bildir" gizli/pasif.
- Listeler sekmesi → **İstisnalar**; ~50 kayıtta uyarı; spec adları parantezde.
- Testler: `tests/pr6c.test.js` (sebep metni, özet, istisna sayısı). Mesajlaşma Node'da yok; tarayıcıda denenmedi.
- **Kalan:** gerçek pop-up'ta YouTube sekmesiyle doğrulama.

### PR 7 — ✅ kodlandı (2026-10-19)
- **`core/listeler.js` (yeni, saf):** `listePaketiOlustur(ayar, secim)` — `hepsi | beyaz | kara | ozel:<ad>`; `listePaketiCoz(json)` — paket + tam yedek biçimini kabul eder, üyeleri/liste adlarını doğrular, geçersizleri sayar; `listeleriBirlestir(mevcut, gelen, strateji)` — `birlestir | uzerine | yeniden`, mevcut nesneyi değiştirmez, bir anahtarın tek listede kalmasını sağlar.
- **Arayüz (İstisnalar sekmesi):** "Listeleri dışa / içe aktar" kartı; tek liste veya tümü indirilebilir; içe aktarmada özel liste adı çakışırsa **Birleştir (varsayılan) / Üzerine yaz / Yeniden adlandır** modalı; "yeniden adlandır" `Ad (2)` üretir.
- **Arayüz (Sistem sekmesi):** "Veritabanı (db.json)" kartı; `sema === 1` ve `veriSurumu` doğrulaması, `dbKur` ile geçerli/geçersiz kayıt sayısı, paketli veriden daha eski veya eşit sürüm uyarısı, `dbOverride` olarak saklama, "Paketli veritabanına dön".
- **Testler:** `tests/pr7.test.js` — 12 test (paket oluşturma/çözme, üç birleştirme stratejisi, liste taşıma, TR harf duyarlılığı, bozuk girdi). Toplam **94 test** yeşil.
- **Kabul:** aynı adlı özel liste ikiye çıkmıyor (çözüm+birleştirme adı TR-duyarsız benzersizleştirir); bozuk JSON/dosya hiçbir listeyi değiştirmiyor (parse/merge mevcutu klonlar). **Kalan:** gerçek tarayıcıda dosya seçici + modal doğrulaması.

### PR 8A — ✅ Manifest sertleştirmesi (2026-10-19)
- Mağaza açıklaması gerçek özellikleri anlatıyor ("otomatik senkronizasyon"/"video etiketleme" kaldırıldı); kullanılmayan `google.com`/`google.com.tr` host izni ve içerik betiği eşleşmeleri silindi.
- Firefox `strict_min_version` **128** (MAIN world; düzeltme turu 2'de veri beyanı için **140**), Chromium `minimum_chrome_version` **111**.
- `tests/manifest.test.js` (PR 8A'da 2 test; D2 ile 4 test) kararları koruyor. **Kalan:** tarayıcıda yükleme denemesi.

### PR 8F — ✅ Mağaza hazırlığı (2026-10-19)
- `docs/MAGAZA_HAZIRLIK.md`: listeleme metinleri (≤132 karakter kısa açıklama, uzun açıklama, kategori), izin gerekçeleri tablosu, veri güvenliği formu cevapları, 5 karelik ekran görüntüsü planı, sürüm akışı (test → version → build → zip → yükleme → etiket), yayın öncesi kontrol listesi.
- `docs/GIZLILIK.md`: yayınlanabilir gizlilik politikası (TR + kısa EN özet); GitHub Pages `main` / `/docs` için yapılandırıldı (push sonrası yayın).
- `tests/manifest.test.js` +1: sürüm/ad iki manifestte eşit ve `\d+(\.\d+){1,3}` biçiminde. PR 8F'de toplam **113 test** (101 saf + 12 smoke); düzeltme turuyla **116** (manifest testi 4).
- `.gitignore`: `store/`. Sürüm üç yerde **2.0.0**; **elle kalan:** ekran görüntüleri ve mağaza hesaplarına yükleme; gizlilik URL'i GitHub Pages'te (ilk build doğrulanacak).

### PR 8E — ✅ Listelerde kanal adı/avatarı (2026-10-19)
- Yeni depo anahtarı `kanalBilgileri` (`{ "@handle": { ad, avatar } }`, yalnızca görüntüleme; kuralları etkilemez). `background.js` kurulumda boş nesne yazar; tam yedek taşır, içe aktarmada `kanalBilgileriTemizle` ile doğrulanır.
- `core/taxonomy.js`: `kanalBilgileriTemizle` (ad ≤ 120; avatar yalnızca YouTube görsel alan adları). `content.js`: `sayfaKimligi` artık `kanalAdi`/`avatar` döner.
- `options.js`: hızlı bant ve manuel ekleme sayfa kimliğiyle eşleşince ad/avatar kaydeder; liste satırı avatar + `Ad (@handle)` gösterir (`options.css` `.item-avatar`).
- Testler: engine +1 (temizleme), smoke +1 (bant → depo → avatarlı satır). Toplam **112 test** (100 saf + 12 smoke). **Kalan:** tarayıcıda doğrulama; banner'daki "Beyaz listeye ekle" bu bilgiyi toplamaz (yalnızca pop-up yolları).

### PR 8D — ✅ Yoklama azaltma (2026-10-19)
- `content.js`: 1 sn'lik `setInterval` yerine `yt-navigate-finish` / `yt-page-data-updated` / `popstate` (200 ms birleştirme) + 5 sn yedek.
- `inject_helper.js`: 2 sn'lik `setInterval(scan)` yerine `MutationObserver` (childList, ~800 ms birleştirme) + `yt-navigate-finish` + birleştirilmiş kaydırma + 5 sn yedek; ilk tarama gövde hazır olur olmaz.
- Smoke: `history.pushState` + `yt-navigate-finish` ile SPA gezinme testi. Toplam **110 test** (99 saf + 11 smoke). **Kalan:** tarayıcıda gezinme/geri tuşu doğrulaması; #4 (helper öznitelik izleme) ve #5 (db önbelleği) hâlâ açık.

### PR 8C — ✅ PIN karma saklama (2026-10-19)
- `src/core/pin.js` (saf): `pinKarmala` (PBKDF2-SHA256, 120.000 iterasyon, 16 bayt rastgele tuz, `pbkdf2-sha256$...` biçimi), `pinKarmaliMi`, `pinDogrulaGirdi` (eski düz metin uyumu), `pinDuzMetinMi`.
- `options.js`: kurulum ve "PIN güncelle" karma üretir; giriş doğrulaması asenkron; başarılı girişte eski düz metin kayıt karma'ya yükseltilir. `options.html`'e `core/pin.js` eklendi (manifest'e girmez).
- `tests/pin.test.js` (3) + smoke: depoda düz metin yok, kilit/giriş, eski kayıt yükseltme. Toplam **109 test** (99 saf + 10 smoke).
- PIN hâlâ yalnızca arayüz kilididir. Yeni karma yedeği eski sürümde kilit açamaz (CHANGELOG uyumluluk notu).

### PR 8B — ✅ jsdom smoke testleri repoda (2026-10-19)
- `tests/smoke/ortak.js`: sahte `chrome.*` (storage/onChanged/runtime/tabs) + `bekle()`; `options.html` gerçek betik sırasıyla jsdom'da çalışır, `content.js` verilen sayfa HTML'i üzerinde.
- `tests/smoke/options.test.js` (bugün 7 test; PR 8B'de 5 idi): ilk açılış + db durumu, PIN kurulum/kilit/giriş + eski düz metin yükseltme (8C), liste ekle-sil, çakışma modalı (birleştir/yeniden/vazgeç), hızlı bant URL yedeği, kanal ekleme → avatarlı satır (8E).
- `tests/smoke/content.test.js` (bugün 5 test; PR 8B'de 4 idi): video banner + oynatıcı gizleme, beyaz listeye ekle, kart gizleme, bulanıklaştırma, SPA gezinme (8D).
- `jsdom ^27` devDependency + `npm test`; `.gitignore` eklendi. Smoke için `npm install` (Node >= 20). PR 8B'de toplam **105 test**; düzeltme turuyla **116** (104 saf + 12 smoke).

### PR 8 — Sağlamlaştırma ve yayın hazırlığı
- ~~Manifest açıklaması düzelt, izinleri daralt, Firefox `strict_min_version`/MAIN world testi.~~ ✅ 8A'da yapıldı; tarayıcıda yükleme denemesi kaldı.
- Performance: `yt-navigate-finish` ile yoklamanın azaltılması; veritabanı önbelleği (büyürse); helper özniteliklerinin izlenmesi. (PR 8D'de sayfa/kart taraması olay tabanlı oldu; önbellek ve öznitelik izleme hâlâ açık.)
- ~~Kanal adı/avatarını kullanıcı listelerinde göstermek (kullanıcı eklerken sayfadan toplama).~~ ✅ 8E'de yapıldı (pop-up ekleme yolları; banner'daki "Beyaz listeye ekle" kapsam dışı).
- ~~Arayüz ve içerik betiği smoke testlerinin repoya alınması (`tests/smoke/`, jsdom devDependency).~~ ✅ 8B'de yapıldı.
- ~~PIN: düz metin yerine karma saklama (hâlâ yalnızca arayüz kilidi olduğu belgelenir).~~ ✅ 8C'de yapıldı (PBKDF2-SHA256, eski kayıt yükseltme).
- ~~Mağaza: gizlilik metni, ekran görüntüleri, sürüm akışı.~~ ✅ 8F'de doküman tarafı yapıldı (`docs/MAGAZA_HAZIRLIK.md`, `docs/MAGAZA_ELLE.md`, `docs/GIZLILIK.md`); **elle kalan:** ekran görüntüleri ve mağaza yüklemesi; gizlilik URL'i GitHub Pages'te.

### Düzenleme sitesi ("YouTube Filter Store", S) — ✅ S1–S7 uygulandı (2026-10-27)
- **Site S1–S7 — ✅ kodlandı (2026-10-27):** Kamusal kabuk, anonim oy, link/metadata ve talepler, oturum/editör paneli, moderasyon, çok admin/arşiv/yayın, kamusal metinler, erişilebilirlik ve QA. Yerel `npm test` + `npm run tip` + `npm run build` yeşil. **Açık:** Docker/PostgreSQL üretim denemesi, gerçek tarayıcı QA'sı, ekran görüntüleri, gerçek eklentiye `db.json` yükleme ve mağaza yüklemesi. Ayrıntı: `PLAN_SITE.md`, `docs/SITE_QA.md`, `site/README.md`.
- **S0 — Prototip (✅ uygulandı):** link yapıştırınca kanal adı/avatar/ID'nin alınması. `site/lib/youtube-link.ts` + `site/lib/youtube-meta.ts`: YouTube Data API anahtarı varsa birincil yol, yoksa video için oEmbed ve kanal için HTML fallback. API anahtarı opsiyonel; gerçek 10+10 link kontrolü manuel QA'da.
- **S1 — Teknoloji ve barındırma: ✅ karar (2026-10-22), uygulandı (2026-10-27):** TypeScript (Node 22) + Next.js + PostgreSQL + Caddy, Docker Compose; aynı depoda `site/`. (Önceki aday C#/ASP.NET Core MVC + SQLite bırakıldı.) Ayrıntı: `PLAN_SITE.md`, `site/README.md`.
- **S2 — İskelet:** Editör/Admin giriş sistemi (ziyaretçi hesabı yok), Docker Compose, `site/` iskeleti.
- **S3 — Oylama ekranı:** adres çubuğuna link → kayıt bulunursa ID/başlık/kanal gösterilir → her konu ve etiket için **Upvote / Kararsız / Downvote** (lider dökümanı bölüm 5); mevcut oylar gösterilir. **Oy anonim** (çerez kimliği, IP hız sınırı, serbest değiştirme). Kayıt yoksa "ekleme talebi" gönderilir; yeni kaydı yalnızca Editör/Admin ekler.
- **S3b — Sonuç hesabı (saf fonksiyon + test):** geri alınan oylar hesaba girmez; toplam oy (up + kararsız + down) **< 3** ise konu/etiket değerlendirilmez (SISTEM #18); toplam = up − down (kararsız oylar hariç); >0 → ana/yan konu ya da etiket; =0 (ve eşik geçildi) → kararsız; <0 → yazılmaz; ana konu = en yüksek net puan, beraberlikte **upvote fazla olan, o da eşitse `KONULAR` sırası** (SISTEM #2); hiç pozitif konu yoksa `anaKonu` yok. Kilitli kayıtta kilit anındaki sonuç. Kurallar ve ❓ maddeler `SISTEM_TASARIMI.md`'de.
- **S4 — Dışa aktarma:** `docs/db-sema.md` sema 1 çıktısı (**`kararsizKonular`/`kararsizEtiketler` dahil**); `veriSurumu` otomatik artar; eklentiye `db.json` olarak girer.
- **S5 — Ziyaretçi ve moderasyon:** girişsiz `db.json` indirme; ekleme talebi kuyruğu; Editör paneli (kayıt ekleme, talep işleme); moderasyon (oyları geri alma, kayıt kilidi, çerez/IP engelleme).
- **S6 — Yayın:** Docker, yedekleme (`pg_dump` + sunucu dışı kopya), site gizlilik/kullanım metni (KVKK aydınlatma dahil), aylık yayın prosedürü (`PLAN_SITE.md` bölüm 13).

## 6. Riskler

| Risk | Etki | Önlem |
|---|---|---|
| YouTube kart yapısı değişir | Helper kanal/video ID'sini bulamaz | DOM link yedeği var; `__ytFilterDiag()`; derin arama |
| Veritabanı boş/küçük başlar | Çoğu içerik "bilinmeyen" | İlk açılışta seçim + bilgilendirme; hızlı istisna; rapor akışı; **veri köprüsü kararı (4.3)** |
| Çok istisna eklenir | Konu/etiket sistemi atlanır | Çerçeve (üç katman), uyarı (PR 6C), bildirim düğmesi |
| Şema değişikliği geç gelir | Kullanıcı verisi geçişi pahalı | Şema kararları erken kapatıldı; yeni alanlar isteğe bağlı eklendi (sema 1 korunur) |
| **Belge–kod uyuşmazlığı** | "Tamam" denen iş dosyada yok (PR 5 örneği) | Yüklenen dosyalar esastır; her PR sonunda ilgili davranışı jsdom/Node ile gösteren test; DEVIR_NOTU'nda "doğrulandı / doğrulanmadı" ayrımı |
| **Liderin belirsiz bıraktığı kurallar** | Yanlış yorumla kodlanan davranış | `SISTEM_TASARIMI.md` bölüm 6 (❓ maddeler) + her yorum için test; teyit gelince tek satır değişir |
| **Tek oyla etiket oluşması** | Yanlış/kötü niyetli oyla video engellenir | Asgari **3 oy** eşiği (SISTEM #18) site tarafında uygulanacak; moderasyon |
| **Anonim oy manipülasyonu** | Çerez silen/çok cihazlı biri aynı kaydı yönlendirebilir (hesap yok, captcha yok) | IP hız sınırı, 3 oy eşiği, Editör moderasyonu (oy geri alma, kilit); görülürse captcha |
| **Site gizliliği / KVKK** | Çerez kimliği ve IP özeti saklanır; eklentinin "veri toplamaz" politikasıyla karışabilir | Ayrı site gizlilik ve aydınlatma metni (`/gizlilik`); IP yalnızca HMAC-SHA256 özeti; oy IP özeti 30 gün, aktif engelde engel süresince; hukuki inceleme kullanıcıda |
| **Gerçek tarayıcı doğrulaması eksik** | jsdom'da geçen kod YouTube'da çalışmayabilir | Yukarıdaki test listesi; `YT Filter:` günlükleri |
| Tek geliştirici | Süreklilik | Bu belge, `DEVIR_NOTU.md`, `SISTEM_TASARIMI.md`, testler |

## 7. PLAN.md güncelleme düzeni
- Her PR teslim edilince 2. bölüm (Durum) güncellenir; **doğrulanan ile doğrulanmayan ayrı yazılır.**
- Bir karar verilince 4. bölümden çıkar, `DEVIR_NOTU.md` bölüm 5'e gerekçesiyle eklenir.
- Lider dökümanı değişirse önce `docs/SISTEM_TASARIMI.md`, sonra kod ve testler güncellenir.
- Yeni risk/iş çıkarsa 5. ve 6. bölüme eklenir.
