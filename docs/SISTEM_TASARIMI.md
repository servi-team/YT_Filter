# YouTube Filtre & YouTube Filter Store — Sistem Tasarımı

> **Kaynak:** Ekip liderinin tasarım dökümanı (2026-10-18, el yazısı notlar + metin). Bu dosya onun düzenlenmiş hâlidir; **1–5. bölümler liderin kurallarıdır**, değiştirilmez.
> **6. bölüm** ise uygulama sırasında belirsiz kalan noktaların nasıl yorumlandığını ve hangilerinin liderden teyit beklediğini listeler.
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

### Çalışma mantığı
1. **Bağlantı girişi:** Arama çubuğuna kanal veya video bağlantısı yapıştırılır.
2. **Otomatik çekim:** Site video/kanal ID'sini otomatik çeker, başlık ve kanal bilgilerini gösterir (örn. "Açık Kaynaklı Oyunlara Büyük Güncelleme! — Yusuf İpek").
3. **Oylama:** Her konu ve etiket için üç buton: **Upvote** (yeşil, yukarı ok), **Kararsız** (sarı, eksi), **Downvote** (kırmızı, aşağı ok).

### Oylama hesaplaması
- **Toplam oy = Upvote − Downvote.** (Kararsız oyları toplama girmez.)
- **Ana konu:** Toplam oyu **pozitif** olanlar arasında en çok upvote (veya net puan) alan konu. *Önemli kural: en yüksek oyu alan 2 tane 1. varsa listedeki ilki hesaba katılır.*
- **Yan konular:** Pozitif oy almış diğer konular.
- **Kararsızlar:** Toplam oyu 0 olan (upvote ve downvote birbirini götüren, ancak etkileşim almış) konu ve etiketler. **Negatif oylular geçersiz sayılır.**

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

---

## 6. Uygulamada netleştirilen noktalar (lider dökümanında açık olmayanlar)

Aşağıdakiler **bizim yorumumuzdur**. ✅ = kodlandı ve testlendi, ❓ = liderden teyit bekliyor.

| # | Konu | Yorum / karar | Durum |
|---|---|---|---|
| 1 | **Ana konu ölçütü** | Parantezde "en çok upvote" yazıyor, ama örnekte Oyun 30 upvote alırken ana konu Teknoloji (25 upvote, +23 net). Örnek net puanla tutarlı; **net puan** esas alınır. Sitede "upvote" ibaresi silinmeli. | ❓ teyit |
| 2 | **Beraberlik** | "Listedeki ilki" = konu listesindeki (`taxonomy.KONULAR`) sıra. Sıra sabit olduğu için sonuç belirlidir. (Alternatif: önce upvote sayısı, sonra liste sırası.) | ❓ teyit |
| 3 | **Kararsız = toplam 0 *ve* en az bir oy** | Hiç oy almamış (0/0/0) konu kararsız sayılmaz, kayıtta hiç yer almaz. | ❓ teyit (site uygular) |
| 4 | **Kaynak seçimi** | Video verisi **varsa yalnızca video**, yoksa (ve kanal kontrol açıksa) yalnızca kanal değerlendirilir; ikisi asla birleştirilmez. Eski özet (`DEVIR_NOTU` 2.5, eski sürüm) "video veya kanal" diyordu; bu belgeyle değiştirildi. | ✅ |
| 5 | **Yalnızca kararsız verisi olan video** | "Bilgi girilmiş" sayılır → **bilinmeyen değildir**, kanala bakılmaz. | ✅ |
| 6 | **Ana konusuz kayıt** | Oylamada hiçbir konu pozitif çıkmazsa ana konu olmaz. Böyle kayıt geçerlidir (yalnızca etiket ve/veya kararsız bilgi taşıyabilir). Yan konu varsa ana konu zorunludur. Tamamen boş kayıt geçersizdir ("bilinmeyen"). Düzenleme sitesinde editör girişinde ana konu yine zorunlu kalır. | ✅ |
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
| 18 | **Asgari oy eşiği** | Örnekte Argo yalnızca +1 ile aktif etiket oluyor. "Her zaman engelle" kuralıyla tek bir oy videoyu engelletebilir. Eşik (örn. en az 3 oy) düşünülmeli; **şu an uygulanmıyor.** | ❓ teyit |

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
