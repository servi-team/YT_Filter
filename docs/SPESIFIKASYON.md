# YouTube Filtreleyici v2 — Spesifikasyon

Bu belge; ilk proje metni ("Eski Prompt"), tasarım notları (iPad çizimleri) ve yetkili ekip üyesinin 25.10.2026 tarihli kararlarının birleştirilmiş hâlidir. Çelişkili noktalarda tasarım notları esas alınmıştır.

Sistem iki parçadan oluşur:

| Parça | Konum | Görevi |
|---|---|---|
| **YouTube Filtre** (tarayıcı eklentisi) | `src/` → `chromium/`, `firefox/` | Kullanıcının tarayıcısında videoları filtreler. **İnternete veri göndermez, siteye bağlanmaz.** |
| **YouTube Filter Store** (editör sitesi) | `store/` (tamamı Docker) | Editörlerin birlikte konu/etiket oyladığı site. Veritabanını JSON olarak dışa aktarır. |

Veri akışı: Store'da oylama → JSON dışa aktarma → `npm run db:import <dosya>` → `src/data/veritabani.json` → eklenti sürümü ile kullanıcılara dağıtım (aylık).

---

## 1. Sözlük

- **Konu**: Kanalın/videonun konusu (kategorisi). Ör. spor, teknoloji, haber. Metinlerde "kategori" geçiyorsa konu kastedilir.
- **Etiket**: Uyarı niteliğinde işaret (İng. *flag*). Ör. şiddet, küfür, argo. Kullanıcı etiketleri engellemek zorunda değildir.
- **Ana konu / yan konu**: Her kanal/video için 1 ana konu ve sınırsız yan konu belirlenir. Etiket sayısı da sınırsızdır.
- **Bilinmeyen**: Hiçbir editörün veri eklemediği durum. **Konu ve etiket için ayrı ayrı** değerlendirilir (konusu bilinen ama etiketi bilinmeyen bir video olabilir, tersi de).
- **Kararsız**: Veri eklenmiş ama oylama sonucu (net puan) **0** çıkmış konu veya etiket.

## 2. Varsayılan konular

| id | Ad | Kapsam |
|---|---|---|
| `ders-okul` | Ders / Okul | Okul müfredatı, konu anlatımı, sınav hazırlığı, üniversite dersleri |
| `egitici` | Eğitici | Belgesel, nasıl yapılır videoları, ders harici kurslar (dil dahil) |
| `bilim` | Bilim | Akademik/araştırma içeriği, popüler bilim, uzay, doğa bilimleri |
| `teknoloji` | Teknoloji | Yazılım, donanım, yapay zekâ, inceleme kanalları |
| `haber` | Haber / Güncel olaylar | Haber kanalları, siyasi yorum, gündem |
| `din` | Din / Maneviyat | Dini sohbetler, vaazlar, manevi içerik |
| `eglence` | Eğlence / Mizah | Komedi, skeç, meme, tepki videoları |
| `oyun` | Oyun | Oyun oynanışı, oyun incelemeleri, espor |
| `spor` | Spor | Futbol, basketbol, fitness, spor haberleri |
| `muzik` | Müzik | Müzik videoları, cover, müzik analizi |
| `film-sanat` | Film / Dizi / Sanat | Sinema, dizi, çizim, sanat |
| `yasam` | Yaşam / Vlog | Günlük vlog, yemek, seyahat, yaşam tarzı |
| `finans` | Finans / Girişim | Borsa, kripto, iş, ekonomi |
| `saglik` | Sağlık / Kişisel gelişim | Sağlık, psikoloji, motivasyon, kişisel gelişim |
| `cocuk` | Çocuk içerikleri | Çocuklara yönelik animasyon/şarkı kanalları |

## 3. Varsayılan etiketler

| id | Ad |
|---|---|
| `kufur` | Küfürlü içerik |
| `argo` | Argolu içerik |
| `ai` | AI ile üretilmiş içerik |
| `kumar` | Kumar / bahis |
| `siddet` | Şiddet |
| `zararli` | Zararlı / uygunsuz içerik |
| `olumsuz-ornek` | Olumsuz örnek |
| `spam` | Spam / sahte içerik |

## 4. Uygulama içi listeler

- **Beyaz liste**: Asla engellenmeyen kanal ve videolar.
- **Kara liste**: Her zaman engellenen kanal ve videolar.
- Bu iki liste **algoritmadan önce** uygulanır. Bir içerik ikisinde birden varsa beyaz liste kazanır.

---

## 5. Store: oylama ve sonuç

- Editör bir kanal veya video linki yapıştırır; site ID'yi otomatik çıkarır. Videolarda başlık, kanal adı ve kapak görseli gösterilir.
- Her editör, her konu ve etiket için **upvote / kararsız / downvote** oyu verebilir (editör başına tek oy, değiştirilebilir).
- **Net puan = upvote − downvote.** Kararsız oylar puanı etkilemez.

| Net puan | Sonuç |
|---|---|
| > 0 | **Geçerli** (konu ya da etiket atanır) |
| = 0 ve en az bir oy var | **Kararsız** |
| < 0 | Atanmaz |
| hiç oy yok | Bilinmeyen |

- **Ana konu**: En yüksek net puanlı konu. Eşitlikte **o puana ilk ulaşan** konu ana konu olur (oy geçmişine göre).
- **Yan konular**: Puanı pozitif olan diğer konular.
- Hiçbir konunun puanı pozitif değilse **ana konu seçilmez**, konu **bilinmeyen** kalır (kararsız konular da yazılmaz).
- Ne konusu ne de etiketi (geçerli veya kararsız) olan içerik dışa aktarılan veritabanına **hiç girmez**.

Örnek (tasarım notlarından):

| Konu | ↑ | Kararsız | ↓ | Net | Sonuç |
|---|---|---|---|---|---|
| Teknoloji | 25 | 3 | 2 | +23 | **Ana konu** |
| Haber | 10 | 7 | 5 | +5 | Yan konu |
| Müzik | 0 | 0 | 30 | −30 | — |
| Eğlence | 3 | 0 | 3 | 0 | Kararsız |
| Spor | 0 | 0 | 30 | −30 | — |
| Oyun | 30 | 3 | 10 | +20 | Yan konu |

| Etiket | ↑ | Kararsız | ↓ | Net | Sonuç |
|---|---|---|---|---|---|
| Zararlı | 0 | 0 | 30 | −30 | — |
| Spam | 0 | 0 | 30 | −30 | — |
| Olumsuz örnek | 0 | 0 | 30 | −30 | — |
| AI ile oluşturulmuş | 10 | 7 | 5 | +5 | Etiket |
| Argo | 1 | 0 | 0 | +1 | Etiket |
| Küfür | 5 | 5 | 5 | 0 | Kararsız |

---

## 6. Eklenti: engelleme algoritması

Kullanıcı her konu ve etiket için **filtreleme** düğmesini açıp kapatır. Filtrelenen (engellenen) bir konu/etiketin **engelleme biçimini** de ayrıca seçer:

- **Gizle**: içerik listeden kaldırılır / oynatıcı kapatılır.
- **Bulanıklaştır**: küçük resim / oynatıcı bulanıklaştırılır, ses kapatılır.
- **Uyarı sayfası**: içeriğin üstü bir uyarı katmanıyla kapatılır.

Filtrelenmeyen konu **izinli** konudur.

### 6.1 Karar adımları

1. **Beyaz liste** (video ID'si veya kanal) → izin ver. **Kara liste** → engelle.
2. **Kaynak seçimi**: Önce videonun kaydına bakılır. Video kaydı **yoksa** ve **kanal kontrol** ayarı açıksa kanalın kaydı kullanılır. İkisi de yoksa içerik tamamen bilinmeyendir. Video kaydı varsa (eksik alanları olsa bile) kanala bakılmaz.
3. **Her zaman kuralı**: Kaynakta **engellenen geçerli bir etiket** varsa içerik **her modda** engellenir.
4. **Mod kuralı** (aşağıda).
5. **Biçim**: İçeriği engelleyen konu/etiketlerin biçimlerinden en serti uygulanır: **Gizle > Uyarı sayfası > Bulanıklaştır**. Liste veya bilinmeyen/kararsız kaynaklı engellerde **varsayılan biçim** ayarı kullanılır (varsayılanı Gizle).

### 6.2 Modlar

Kullanıcıya gösterge şeklinde 3 konumlu bir sürgü sunulur: **Serbest — Orta — Katı**.

**Serbest mod**
- Konulardan (ana, yan veya kararsız) **herhangi biri izinliyse** izin verilir; hiçbiri izinli değilse engellenir.
- Kararsızlar kullanıcının lehine yorumlanır: Küfür engelli olsa bile "kararsız küfür" etiketli video açılır; Spor izinliyse "kararsız spor" konulu video açılır.
- Konusu bilinmeyen içeriğe izin verilir.

**Orta mod**
- **Ana konu izinliyse** izin verilir, değilse engellenir.
- Kanal etiketlerine, video kaydı varken bakılmaz (6.1/2).
- Dört ek ayar (ilk açılışta sorulur, yalnızca orta modda kullanılır):

| Ayar | Seçenekler |
|---|---|
| Bilinmeyen konular | İzin ver / Engelle |
| Bilinmeyen etiketler | İzin ver / Engelle |
| Kararsız konular | İzin ver / Engelle |
| Kararsız etiketler | İzin ver / Engelle |

- "Kararsız konular: Engelle" → kararsız konulardan biri engellenen bir konuysa içerik engellenir. "Kararsız etiketler: Engelle" için de aynısı geçerlidir.

**Katı mod**
- Konulardan (ana, yan veya kararsız) **herhangi biri engelliyse** engellenir.
- Etiketlerden (geçerli veya kararsız) **herhangi biri engelliyse** engellenir.
- Konusu veya etiketi bilinmeyen içerik engellenir.

### 6.3 Diğer ayarlar

- **Kanal kontrol**: Video verisi yokken kanalın konu ve etiketlerine bakılıp bakılmayacağı (varsayılan: açık).
- **Varsayılan engelleme biçimi**: Liste ve bilinmeyen/kararsız kaynaklı engellerde kullanılır.

## 7. Karşılama ekranı (ilk kurulum)

1. "Hoş geldiniz!"
2. PIN seçimi (ayarları korur).
3. Bilgilendirme: "Henüz yeni bir eklentiyiz. Bilinmeyen çok sayıda video ve kanal var; veritabanı sizden gelen bildirimlerle gelişiyor."
4. Bilinmeyen ve kararsız içerikler için 4 seçim (orta mod ayarları).

## 8. Varsayılan listelerin güncellenmesi

Konu/etiket verileri editörler tarafından Store'da ortaklaşa düzenlenir ve aylık güncellemelerle eklentiyle birlikte kullanıcıya sunulur. Eklenti güncellendiğinde paketteki veritabanı otomatik yüklenir. Kullanıcı bildirim (report) sayfası ileride eklenecektir.

## 9. Varsayımlar

Aşağıdakiler kaynaklarda açıkça belirtilmemiş, makul varsayım olarak uygulanmıştır:

- Serbest modda bilinmeyen içerik izin alır; katı modda bilinmeyen konu/etiket engeller.
- Kanal yedeği tüm kayıt için işler (alan bazında değil).
- Beyaz ve kara liste çakışırsa beyaz liste kazanır.
- Etiketi olup ana konusu olmayan içerik dışa aktarılır (konu bilinmeyen olarak).
