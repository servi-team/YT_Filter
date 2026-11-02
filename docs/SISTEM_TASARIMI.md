# YouTube Filtre & YouTube Filter Store — Sistem Tasarımı

> **Kaynak:** Ekip liderinin tasarım dökümanı (2026-10-18, el yazısı notlar + metin). Bu dosya onun düzenlenmiş hâlidir; **1–5. bölümler liderin kurallarıdır, değiştirilmez.** (2026-10-22: bu bölümlere yalnızca açıklayıcı *Not* satırları eklendi, metin değiştirilmedi.)
> **6. bölüm** uygulama sırasında belirsiz kalan noktaların nasıl yorumlandığını ve hangilerinin liderden teyit beklediğini listeler.
> **7. bölüm** YouTube Filter Store'un rollerini, anonim oy kuralını ve moderasyonu tanımlar (2026-10-22 kararları).
> Kodda karşılığı: `src/core/decision.js` (algoritma), `src/core/taxonomy.js` (ayar şeması), `src/core/engine.js` (eylem çözümleme), `docs/db-sema.md` (veri sözleşmesi).

Bu belge, YouTube Filtre eklentisinin çalışma algoritmasını, filtreleme modlarını, kullanıcı ayarlarını ve topluluk tabanlı veri giriş sistemi olan YouTube Filter Store yapısını tanımlar.

---

## 1. Sözlük ve temel kavramlar

- **Konu:** Kanalın veya videonun genel kategorisi. Örnek: spor, teknoloji, haber, müzik, eğlence, oyun.
- **Etiket (flag):** Uyarı nitelikli işaretler. Örnek: şiddet, küfür, argo, zararlı, spam, olumsuz örnek, AI ile oluşturulmuş.
  *Kullanıcı bunları engellemek zorunda değildir; kendi tercihine göre izlemeyi seçebilir.*
- **Bilinmeyen (Unknown):** Videoya hiçbir şekilde etiket ve konu bilgisi girilmemiş olması.
  Bu durumda (kullanıcı ayarlarda kapatmadıysa) **kanala bakılır.** Kanal için de bilgi girilmemişse **veya** kullanıcı "kanal kontrol ayarı"nı kapatmışsa o video "bilinmeyen" kabul edilir.
- **Kararsız (Undecided):** Video veya kanal hakkında bilgi girilmiş, ancak topluluk oylamasında ("Bu video bu konuya/etikete mi ait?") net bir sonuç çıkmamış (toplam oyu 0 olan) konu ve etiketler.

## 2. Genel algoritma ve temel kurallar

### Kontrol sırası (her durumda)
1. Önce **videonun** konu ve etiketlerine bakılır.
2. Videoya dair **hiçbir veri girilmemişse** kanala bakılır (kanal kontrol ayarı açıksa).

### Her zaman geçerli kural (etiket önceliği)
**Engellenen bir etiket varsa her zaman engelle.** Kullanıcının engellediği bir etiket videoda bulunuyorsa seçili mod ne olursa olsun (Serbest, Orta, Katı fark etmez) video engellenir.
Örnek: kullanıcı "küfür" etiketini engelliyorsa, videonun konusu izinli olsa bile video engellenir.

## 3. Kullanıcı ayarları ve arayüz

### A. İlk kurulum (Hoş geldiniz ekranı)
- **PIN seçimi:** Ayarların güvenliği için 4 haneli PIN belirlenir (`_ _ _ _`).
- **Bilinmeyen videolar tercihi:** "Henüz yeni bir eklentiyiz, bilinmeyen çok sayıda video ve kanal var." uyarısıyla başlangıç tercihi alınır: **Bilinmeyenler: İzin ver / Engelle.**

### B. Kanal kontrol ayarı
Ayarlara "Kanalın konu ve etiketlerine bakmayı devre dışı bırak" seçeneği eklenir. Bu ayar kapatıldığında, videosunda veri olmayan içerikler için kanal verisine bakılmaz; doğrudan "bilinmeyen" muamelesi yapılır.

### C. Engelleme görünümü ve filtreleme biçimi
Kullanıcı, engellenen videoların **nasıl** filtreleneceğini **konuya veya etikete göre ayrı ayrı** seçebilir (arayüzde anahtar/toggle ve yanında dropdown menü):
- **Gizle** — videoyu tamamen sayfadan kaldırır.
- **Bulanıklaştır** — videoyu blurlar.
- **Üstünü bir uyarı sayfasıyla kapat.**

Örnek: *Spor (filtreleniyor) → Bulanıklaştır*; *Küfür (filtreleniyor) → Gizle*.

## 4. Filtreleme modları
> Tüm modlarda video için veri girilmediyse ve kanal kontrol ayarı açıksa kanalın verilerine bakılır.

### 🟢 Serbest mod
- **Temel kural:** Videonun konularından **herhangi biri** izin verilenler listesindeyse (ve engellenen bir etiketi yoksa) **izin ver.**
- **Kararsız durumlar:** Kararsız kalınan konu ve etiketlere kullanıcı lehine ("işine geldiği gibi") izin verilir.
  - Örnek 1: "Küfür" etiketi kullanıcıda engelli. Video "kararsız olarak küfür" diye işaretlenmiş → **izin ver.**
  - Örnek 2: "Spor" konusuna kullanıcıda izin veriliyor. Video "kararsız olarak spor" diye işaretlenmiş → **izin ver.**

### 🟡 Orta mod
- **Temel kural:** Videonun **ana konusu** izin verilenler listesindeyse (ve her zamanki gibi engellenen bir etiketi yoksa) **izin ver.**
- **Ek seçenekler** (Orta mod kullanıcıya 2 yeni özelleştirme sunar):
  - **Bilinmeyenler:** İzin ver / Engelle (açılış ekranında kullanıcıya sorulur).
  - **Kararsızlar:** İzin ver (varsayılan) / Engelle.

### 🔴 Katı mod
- **Temel kural:** Videonun konularından (ana veya yan konular) **herhangi biri engelliyse engelle** (+ engellenen bir etiket varsa engelle).

## 5. YouTube Filter Store (topluluk oylama sistemi)

Kullanıcıların veya editörlerin (örn. "Kullanıcı: Editör Ali") video ve kanalları etiketlediği platform.

> Not (2026-10-22): Kimlerin oy verebildiği, hesap türleri ve moderasyon için **bölüm 7**'ye bakınız.

### Çalışma mantığı
1. **Bağlantı girişi:** Arama çubuğuna kanal veya video bağlantısı yapıştırılır.
2. **Otomatik çekim:** Site video/kanal ID'sini otomatik çeker, başlık ve kanal bilgilerini gösterir (örn. "Açık Kaynaklı Oyunlara Büyük Güncelleme! — Yusuf İpek").
3. **Oylama:** Her konu ve etiket için üç buton: **Upvote** (yeşil, yukarı ok), **Kararsız** (sarı, eksi), **Downvote** (kırmızı, aşağı ok).

### Oylama hesaplaması
- **Toplam oy = Upvote − Downvote.** (Kararsız oyları toplama girmez.)
- **Ana konu:** Toplam oyu **pozitif** olanlar arasında en çok upvote (veya net puan) alan konu. *Önemli kural: en yüksek oyu alan 2 tane 1. varsa listedeki ilki hesaba katılır.*
- **Yan konular:** Pozitif oy almış diğer konular.
- **Kararsızlar:** Toplam oyu 0 olan (upvote ve downvote birbirini götüren, ancak etkileşim almış) konu ve etiketler. **Negatif oylular geçersiz sayılır.**

> Not (2026-10-22): "En çok upvote (veya net puan)" ibaresinin ve beraberlik kuralının uygulamadaki karşılığı **bölüm 6, #1 ve #2**'dedir (ana konu **net puana** göre seçilir; beraberlikte önce upvote sayısı, sonra liste sırası).

### Örnek — konu seçimi
| Konu | ↑ | − | ↓ | Toplam | Durum |
|---|---:|---:|---:|---:|---|
| Teknoloji | 25 | 3 | 2 | +23 | **Ana konu** |
| Oyun | 30 | 3 | 10 | +20 | Yan konu |
| Haber | 10 | 7 | 5 | +5 | Yan konu |
| Eğlence | 3 | 0 | 3 | 0 | Kararsız |
| Müzik | 0 | 0 | 30 | −30 | Geçersiz |
| Spor | 0 | 0 | 30 | −30 | Geçersiz |

**Sonuç:** Ana konu **Teknoloji** · Yan konular **Oyun, Haber** · Kararsız **Eğlence**

### Örnek — etiket seçimi
| Etiket | ↑ | − | ↓ | Toplam | Durum |
|---|---:|---:|---:|---:|---|
| AI ile oluşturulmuş | 10 | 7 | 5 | +5 | Aktif etiket |
| Argo | 1 | 0 | 0 | +1 | Aktif etiket |
| Küfür | 5 | 5 | 5 | 0 | Kararsız |
| Zararlı | 0 | 0 | 30 | −30 | Geçersiz |
| Spam | 0 | 0 | 30 | −30 | Geçersiz |
| Olumsuz örnek | 0 | 0 | 30 | −30 | Geçersiz |

**Sonuç:** Etiketler **AI ile oluşturulmuş, argo** · Kararsız **küfür**

> Not (2026-10-22): Bu örnek **3 oy asgari eşiğinden (bölüm 6, #18) önce** hazırlanmıştır. Eşikle birlikte **Argo (toplam 1 oy) değerlendirilmez**; güncel sonuç: Etiket **AI ile oluşturulmuş** · Kararsız **küfür**. Konu örneğindeki tüm satırlar ve diğer etiket satırları 3 oyun üzerindedir, sonuçları değişmez.

---

## 6. Uygulamada netleştirilen noktalar (lider dökümanında açık olmayanlar)

Aşağıdakiler **bizim yorumumuzdur**. ✅ = kodlandı/test edildi veya onaylandı (site uygulayacak), ❓ = hâlâ liderden teyit bekliyor.

| # | Konu | Yorum / karar | Durum |
|---|---|---|---|
| 1 | **Ana konu ölçütü** | Parantezde "en çok upvote" yazıyor, ama örnekte Oyun 30 upvote alırken ana konu Teknoloji (25 upvote, +23 net). Örnek net puanla tutarlı; **net puan** esas alınır. Sitede "upvote" ibaresi silinmeli. | ✅ onaylandı (2026-10-21) |
| 2 | **Beraberlik** | "Listedeki ilki" = konu listesindeki (`taxonomy.KONULAR`) sıra. **Sıralama: (1) net toplam, (2) upvote sayısı fazla olan, (3) hâlâ eşitse `taxonomy.KONULAR` sırasındaki ilk.** Kazanamayan eşit konu yan konu olur. Sıra sabit olduğu için sonuç belirlidir. | ✅ onaylandı (2026-10-22; upvote adımı eklendi, site uygular) |
| 3 | **Kararsız = toplam 0 *ve* en az bir oy** | Hiç oy almamış (0/0/0) konu kararsız sayılmaz, kayıtta hiç yer almaz. 3 oy eşiği (#18) ile birlikte: kararsız = net toplam 0 **ve** toplam oy en az 3. Sitenin arayüzünde oy almamış konunun nasıl adlandırılacağı (ör. "oy yok") Faz 0'da netleşecek; `db.json`'a hiçbir durumda yazılmaz. | ✅ onaylandı (2026-10-21; site uygular) |
| 4 | **Kaynak seçimi** | Video verisi **varsa yalnızca video**, yoksa (ve kanal kontrol açıksa) yalnızca kanal değerlendirilir; ikisi asla birleştirilmez. Eski özet (`DEVIR_NOTU` 2.5, eski sürüm) "video veya kanal" diyordu; bu belgeyle değiştirildi. | ✅ |
| 5 | **Yalnızca kararsız verisi olan video** | "Bilgi girilmiş" sayılır → **bilinmeyen değildir**, kanala bakılmaz. | ✅ |
| 6 | **Ana konusuz kayıt** | Oylamada hiçbir konu pozitif çıkmazsa (veya hiçbiri eşiği geçmezse) ana konu olmaz. Böyle kayıt geçerlidir (yalnızca etiket ve/veya kararsız bilgi taşıyabilir). Yan konu varsa ana konu zorunludur. Tamamen boş kayıt geçersizdir ("bilinmeyen"). Düzenleme sitesinde editör girişinde ana konu yine zorunlu kalır. | ✅ |
| 7 | **Ana konusuz kayıtta konu kuralı** | Kesin konu yoksa konu kuralı uygulanmaz; yalnızca etiketler ve kararsız politikası belirler. | ✅ |
| 8 | **Serbest + kararsız konu** | Kararsız bir konu "kullanıcı lehine" **izinli konu sayılır**: ana konusu engelli bir videoda kararsız bir konu varsa Serbest modda video açılır. | ❓ teyit |
| 9 | **Serbest + kararsız etiket** | Kararsız etiket hiçbir zaman engellemez. "Her zaman engelle" kuralı yalnızca **kesinleşmiş** etiketler için geçerlidir. | ✅ |
| 10 | **Orta + "Kararsızlar: Engelle"** | Kararsız bir konu/etiket, **kullanıcı onu zaten engelliyorsa** kesinleşmiş gibi sayılır ve engeller. Kullanıcının engellemediği kararsız şey engellemez. | ❓ teyit |
| 11 | **Katı + kararsız** | Dökümanda yok. Katı modda kararsızlar, **kullanıcı o konu/etiketi engelliyorsa** her zaman engeller (Orta + Engelle ile aynı). | ❓ teyit |
| 12 | **Bilinmeyen ayarı** | Her modda geçerli (hoş geldiniz ekranında ve Filtre sekmesinde). `null` (henüz seçilmedi) → engelle. | ✅ |
| 13 | **Listeler** | Dökümanda anılmaz; mevcut kural korunur: liste (video > kanal; beyaz > kara > özel) **her zaman** konu/etiketi geçer. | ✅ (önceki karar) |
| 14 | **"Uyarı sayfası" eylemi** | Kartlarda: kartın üstü sebebi yazan opak bir kapakla kapanır (tıklanamaz). İzleme/kanal sayfasında: tam sayfa engel banner'ı. "Gizle" izleme sayfasında da banner üretir (sayfayı gizlemek mümkün olmadığı için). | ✅ |
| 15 | **Eylem sertliği** | Birden çok sebepte en sert eylem kazanır: **Gizle > Uyarı sayfası > Bulanıklaştır.** | ✅ |
| 16 | **Konu/etiket dışı engellerin görünümü** | Liste, bilinmeyen ve "izinli konu yok" kaynaklı engeller tek bir **genel eylem** kullanır (Görünüm sekmesi → "Diğer Engeller"). | ✅ |
| 17 | **PIN** | Yeni kurulumda PIN önceden **atanmaz**; ilk açılışta tam 4 rakamlı PIN seçtirilir ("Şimdilik atla" mümkün). Mevcut kullanıcıların `1234` PIN'i ve değiştirme uyarısı aynen kalır. PIN hâlâ yalnızca arayüz kilididir. | ✅ |
| 18 | **Asgari oy eşiği** | **En az 3 oy** (2026-10-21 onaylandı, 2026-10-22 teyit edildi). Eşik **toplam oy** (upvote + kararsız + downvote) üzerinden uygulanır: 3'ün altındaki konu/etiket değerlendirilmez, ana konu adayı olamaz ve `db.json`'a yazılmaz. Kararsız oylar eşiğe sayılır, net toplama sayılmaz. Sonuç: yeni kayıtlar konu/etiketlerinde 3 oya ulaşana kadar eklentide "bilinmeyen" kalır. Eklenti veriyi hazır alır; eşiği site uygular. | ✅ onaylandı |
| 19 | **Beyaz liste ve etiket koruması** | Beyaz liste, veritabanındaki "kumar" etiketli kanalı bile açar (tasarım gereği "asla engellenmez"). Bu davranış **mutlak** kabul edildi; etiket-bazlı koruma ("ebeveyn kilidi") 2.0.0 kapsamı dışında, ileride ayrı ayar olarak değerlendirilecek. | ✅ onaylandı (2026-10-21) |

### Ayar şemasındaki karşılıkları (`ayar`)
| Döküman | Alan |
|---|---|
| Mod | `mod`: `serbest` \| `orta` \| `kati` |
| Bilinmeyenler: izin ver / engelle | `etiketlenmemis`: `ac` \| `engelle` \| `null` |
| Kanal kontrol ayarı | `kanalKontrol`: `true` (varsayılan) \| `false` |
| Kararsızlar (Orta) | `kararsiz`: `izinver` (varsayılan) \| `engelle` |
| Konu başına filtreleme biçimi | `konular[id]`: `izinli` \| `kaldir` (Gizle) \| `bulaniklastir` \| `uyari` |
| Etiket başına filtreleme biçimi | `etiketler[id]`: aynı değerler |
| Diğer engellerin biçimi | `engelEylemi`: `kaldir` \| `bulaniklastir` \| `uyari` |

---

## 7. YouTube Filter Store: roller, anonim oy ve moderasyon (2026-10-22/27 kararları)

> Bu bölüm **yalnızca siteyi** ilgilendirir. Eklenti bu bölümden etkilenmez; eklentiye yalnızca sonuç (`db.json`, bkz. `docs/db-sema.md`) gelir. Bölüm 5'teki "kullanıcılar veya editörler" ifadesinin uygulamadaki karşılığıdır.
> ✅ = onaylandı, ❓ = öneri, teyit bekliyor.

### 7.1 Roller

| Rol | Hesap | Yapabilecekleri | Durum |
|---|---|---|---|
| **Ziyaretçi** | Yok (kayıt yok) | Kayıtlı video/kanalı görme, **oy verme ve oyunu değiştirme**, güncel `db.json`'u indirme, kayıtsız link için ekleme talebi gönderme | ✅ |
| **Editör** | Var (admin açar) | Ziyaretçi yetkileri + **yeni kanal/video kaydı ekleme**, ekleme taleplerini kayda çevirme/reddetme, **moderasyon** (7.5) | ✅ |
| **Admin** | Var | Editör yetkileri + editör/admin hesabı oluşturma ve rol/aktiflik yönetimi (yalnızca admin), içerik metadata düzeltme, arşivleme/geri getirme, `db.json` yayınlama; taksonomi salt okunur | ✅ |

- Hesap türü yalnızca ikidir: Editör ve Admin. Herkese açık kayıt yoktur.
- Editör ve Admin oyları diğer oylarla **eşit ağırlıktadır**.

### 7.2 Anonim oy
- Siteye giren **herkes oy verebilir**, kayıt gerekmez. ✅
- Kimlik, tarayıcıdaki anonim bir çerezdir. Bir kimlik, bir kayıtta bir konu/etiket için **tek oy** kullanır ve oyunu **istediği zaman değiştirebilir**. ✅
- Koruma: **çerez + IP başına hız sınırı.** Captcha yoktur; kötüye kullanım görülürse eklenir. Koruma bilinçli olarak basit tutulmuştur (çerez silen kişi tekrar oy verebilir); asıl güvence 7.5'teki moderasyondur. ✅
- Asgari oy eşiği: bölüm 6 #18 (en az 3 oy). ✅
- Çerez kimliği ve HMAC-SHA256 IP özeti saklanır; düz IP saklanmaz. Oy kayıtlarındaki IP özeti **30 gün** sonra temizlenir; aktif bir engel varsa engel süresince saklanır. Site gizlilik metni `/gizlilik` sayfasındadır. ✅ (2026-10-27)

### 7.3 Oy hedefi
- Video linki **yalnızca o videoya**, kanal linki **yalnızca o kanala** yazılır. ✅
- Kanalın oyları videolarına otomatik yansımaz. Karar sırası eklentidedir: önce video kaydı, yoksa kanal kaydı (bölüm 6 #4). ✅

### 7.4 Yeni kayıt ekleme ve ekleme talebi
- Yeni kanal/video kaydını yalnızca **Editör ve Admin** ekler. Link yapıştırılınca site metadata kaynağından ad, handle ve avatarı alır ve kaydeder (tekrar sorulmaz). Kaynak: **YouTube Data API (anahtar varsa) veya oEmbed/HTML fallback**. ✅ (2026-10-27)
- **Video eklemek kanal satırı oluşturmaz.** Video kaydı kanal kimliği, adı, handle'ı ve `kanal_avatar` alanını taşır; kanal ayrıca eklenir. ✅ (2026-10-27)
- Zaten kayıtlı bir link yapıştırılırsa yeni kayıt oluşmaz, mevcut oylar gösterilir. ✅
- Ziyaretçi **kayıtsız** bir link yapıştırırsa "ekleme talebi" gönderir; aynı link için tekrar gelen talepler tek kayıtta birleşir. Editör talebi kayda çevirir veya reddeder. ✅

### 7.5 Moderasyon
Editör ve Admin'in moderasyon araçları vardır; **sonucu elle yazamazlar** (sonucu her zaman oylar belirler). ✅
- **Oyları geri alma:** Şüpheli oyları geri alır. Geri alınan oy hesaba girmez, sonuç yeniden hesaplanır. Oy silinmez, işaretlenir. İki ayrı bayrak vardır: **ziyaretçi geri alması geçicidir** (ziyaretçi yeniden oy verebilir), **moderasyon geri alması kalıcıdır** (gerekçeli kayıtla tutulur).
- **Kayıt kilidi:** Bir kaydı kilitler. Kilitliyken oylar kabul edilmeye devam eder ama **sonuç donar**; `db.json`'a kilit anındaki sonuç yazılır. Kilit açılınca sonuç güncel oylarla yeniden hesaplanır.
- **Çerez veya ağ engeli:** Şüpheli çerez kimliği ya da IP özeti engellenebilir. Panelde kimlikler yalnızca `çerez:xxxxxxxx` / `ağ:xxxxxxxx` takma etiketleriyle görünür; ham kimlik istemciye gönderilmez.
- Her işlem gerekçesiyle kayıt altına alınır.
- Editör kilit, geri alma ve engelleme işlemlerini **tek başına, gerekçeli ve kayıt altında** yapar; admin onayı beklenmez. ✅ (2026-10-27)

### 7.6 Dışa aktarma ve yayın
- Güncel `db.json` herkese açık indirilebilir (giriş gerekmez). Kuralları `docs/db-sema.md` belirler. ✅
- `db.json` eklentiyle birlikte **aylık mağaza güncellemesiyle** gelir; eklenti siteden veri çekmez. Kullanıcı isterse dosyayı elle indirip içe aktarır. ✅
- Yayın sürümünü **yalnızca Admin** onaylar ve yayınlar. Editör yayın uçlarına erişemez. ✅ (2026-10-27)

### 7.7 Site uygulama durumu (2026-10-27)

- Site S1–S7 olarak yerelde kodlandı: kamusal kabuk, anonim oy, link/metadata ve talepler, oturum/editör paneli, moderasyon, admin/arşiv/yayın, kamusal metinler ve QA.
- `npm test`, `npm run tip`, `npm run build` ve HTTP QA dumanı yeşil. Ayrıntı ve manuel kontrol listesi: `SITE_QA.md`.
- Docker Compose + PostgreSQL + Caddy üretim denemesi, gerçek tarayıcı/ekran okuyucu QA'sı, ekran görüntüleri, gerçek eklentiye `db.json` yükleme ve mağaza yüklemesi kullanıcıda.
- Bu bölümdeki 7.1–7.6 ürün kuralları değişmedi; site uygulaması bu kuralları izler. Uygulama belgeleri: `../site/README.md`, `PLAN_SITE.md`, `superpowers/specs/2026-10-27-site-tasarimi.md` ve `superpowers/plans/2026-10-27-site-uygulama.md`.
