# Site Hazırlığı — YouTube Filter Store

> Durum: **karar/uygulama belgesi.** 2026-10-27 itibarıyla roller, anonim oy, saklama ve moderasyon kararları kapandı; site S1–S7 olarak kodlandı. Site tarafında açık kalanlar yalnızca gerçek tarayıcı QA'sı, alan adı, hukuki inceleme ve GitHub Releases işleridir. (#8/#10/#11 yalnızca eklenti davranışı için teyit bekliyor; site v1'ini etkilemez.)
> Son güncelleme: 2026-10-27. Ürün kurallarının tek kaynağı `docs/SISTEM_TASARIMI.md`'dir.

Bu belge, site kararlarını ve site–eklenti arasındaki sözleşmeleri tek yerde toplar. Uygulama ayrıntıları `site/README.md`, QA `docs/SITE_QA.md` içindedir.

---

## 1. Site rolleri (uygulandı)

Rol matrisi 2026-10-21'de onaylandı; 2026-10-27'de uygulanan siteyle hizalandı. Ürün kuralı için `docs/SISTEM_TASARIMI.md` bölüm 7 geçerlidir.

| Yetki | Admin | Editör | Ziyaretçi |
|---|---|---|---|
| Hesap | Var | Var (admin açar) | Yok; herkese açık kayıt yok |
| Kayıtlı içeriği görme | Evet | Evet | Evet |
| Anonim oy verme/değiştirme | Evet (eşit ağırlık) | Evet (eşit ağırlık) | Evet (çerez kimliği) |
| Güncel `db.json` indirme | Evet | Evet | Evet |
| Kayıtsız link için ekleme talebi | Evet | Evet | Evet |
| Yeni kanal/video kaydı ekleme | Evet | Evet | Hayır |
| Talep kuyruğunu işleme | Evet | Evet | Hayır |
| Moderasyon: oy geri alma, kilit, çerez/ağ engeli | Evet | Evet | Hayır |
| Hesap oluşturma, rol/aktiflik yönetimi | Evet | Hayır | Hayır |
| İçerik metadata düzeltme, arşivleme/geri getirme | Evet | Hayır | Hayır |
| `db.json` yayınlama | Evet | Hayır | Hayır |
| Taksonomi görüntüleme | Evet | Evet | Evet |
| Taksonomi yönetimi | Hayır (salt okunur) | Hayır | Hayır |
| Site içi “Bildir” formu | Yok | Yok | Yok |

### Çözülen sorular (2026-10-27)

1. **Admin sayısı:** Birden fazla admin olabilir. Son aktif admin pasifleştirilemez veya rolü düşürülemez; admin kendi hesabını pasifleştiremez ya da rolünü düşüremez. Kontrol sunucuda, rol değişimiyle aynı transaction içinde yapılır.
2. **Editör seçimi:** Admin, `/admin/hesaplar` üzerinden editör veya admin oluşturur. İlk girişte geçici parola değiştirilir. Başvuru formu ve e-posta doğrulama yoktur.
3. **Editörün kendi eklediği içeriğe oyu:** Verilebilir; editör ve admin oyları diğerleriyle eşit ağırlıktadır.
4. **Oy görünürlüğü:** Oylar anonimdir. Panelde tam çerez kimliği veya IP özeti değil, `çerez:xxxxxxxx` / `ağ:xxxxxxxx` takma etiketleri görünür.
5. **Günlük editör kotası:** Yoktur; yalnızca istek hız sınırı uygulanır.
6. **Hesap doğrulama:** Site v1'de ziyaretçi hesabı ve e-posta doğrulama yoktur. E-posta yalnızca editör/admin hesabında tutulur.
7. **İşlenen veriler ve saklama:** E-posta, parola özeti, anonim çerez kimliği, HMAC-SHA256 IP özeti ile oy/moderasyon kayıtları. Oy IP özeti 30 gün sonra temizlenir; aktif engel varsa engel süresince saklanır. Site gizlilik metni `/gizlilik` taslaktır; hukuki inceleme bekliyor.

---

## 2. Ürün kararları

Ayrıntı ve gerekçeler: `docs/SISTEM_TASARIMI.md` bölüm 6. 2026-10-21'de #1, #2, #3, #18 ve #19 onaylandı. #8, #10 ve #11 yalnızca eklenti davranışı için teyit bekliyor; site v1'i etkilemez.

| SISTEM # | Soru | Eklentide şu an | Karar | Durum |
|---|---|---|---|---|
| 1 | Ana konu: net puan mı, upvote sayısı mı? | Veri `anaKonu` alanıyla gelir; hesap sitede | **Net puan** | ✅ onaylandı |
| 2 | Beraberlikte hangi sıra? | Veri hazır gelir | **Net puan → upvote → `taxonomy.KONULAR` sırası** | ✅ onaylandı |
| 3 | Kararsız = toplam 0 **ve** en az bir oy mu? | `kararsiz*` alanları | **Evet** (0/0/0 kayda girmez) | ✅ onaylandı |
| 8 | Serbest modda kararsız konu izinli sayılsın mı? | **Evet** (izinli konu sayılır) | Mevcut davranış kalsın | ❓ teyit (eklenti) |
| 10 | Orta "Kararsızlar: Engelle" ne demek? | Kullanıcının engellediği kararsız engeller | Mevcut davranış kalsın | ❓ teyit (eklenti) |
| 11 | Katı modda kararsızlar? | Kullanıcı engelliyorsa engeller | Mevcut davranış kalsın | ❓ teyit (eklenti) |
| 18 | Asgari oy eşiği var mı? | **Yok**; tek oy etiket aktive edebilir | **En az 3 oy**; eşik altı değerlendirilmez | ✅ onaylandı |
| 19 | Beyaz liste etiket korumasını geçsin mi? | **Evet**, beyaz liste her şeyi açar | 2.0.0'da mutlak kalsın; "ebeveyn kilidi" ayrı ayar olsun | ✅ onaylandı |

**Karar durumu:** Onaylanan maddeler site uygulaması için bağlayıcıdır; eklenti tarafında değişiklik gerekmiyor. #8/#10/#11 için lider teyidi bekleniyor; cevap gelince ilgili testler ve `docs/SISTEM_TASARIMI.md` durum sütunu güncellenir.

---

## 3. Veri köprüsü A/B — karar verildi

**Karar (2026-10-21): A — site öne alındı.** B yerel köprü uygulanmadı. Site S0–S7 olarak uygulandı (2026-10-27); testler için `docs/db.test-ornek*.json` kullanılabilir.

- **A) Siteyi öne al:** En sadık yol; tek geliştiriciyle uzun sürer. O zamana kadar `docs/db.test-ornek*.json` ile elle test.
- **B) Yerel köprü:** Eklentiye küçük bir yerel düzenleyici ekle; kullanıcı kanal/videoya konu/etiket atar, kayıt `storage.local`'de aynı şemada tutulur ve `dbOverride` gibi davranır. Site gelince aynı şema kullanılır.

**Sonuç:** B için `engine.icerikKarari`'na yerel kayıt katmanı eklenmedi; `db-sema.md`'de "yerel kayıt" bölümü açılmadı. Site kodu `site/` altındadır; eklenti siteye bağlanmaz, veriyi `db.json` olarak alır.

---

## 4. "Bildir" akışı sözleşmesi (site v1'de yok)

**Karar (2026-10-27): Site v1'de “Bildir” uç noktası ve formu yoktur.** Eklentideki düğme pasif kalır; siteye bu amaçla ağ isteği eklenmez. Aşağıdaki sözleşme gelecek sürüm için saklanır.

**Tetikleyiciler:** hızlı banttaki "Bildir", engel uyarısındaki "Yanlış etiket mi?".

**Önerilen istek gövdesi (HTTPS POST, JSON):**

```json
{
  "surum": 1,
  "tur": "yanlis-etiket",
  "videoId": "dQw4w9WgXcQ",
  "kanalId": null,
  "handle": null,
  "konular": ["muzik"],
  "etiketler": ["argo"],
  "aciklama": "Küfür yok, sadece argo kelime var.",
  "kaynak": "hizli-bant",
  "eklentiSurumu": "2.0.0",
  "zaman": "2026-10-21T18:00:00Z"
}
```

- `tur`: `yanlis-etiket` | `yanlis-konu` | `eksik-etiket` | `diger`.
- `videoId`/`kanalId`/`handle`: en az biri zorunlu; geçerli YouTube kimliği sunucuda yeniden doğrulanır.
- `aciklama`: en fazla 500 karakter; HTML kabul edilmez.
- Kişisel veri (e-posta vb.) **gönderilmez**. Kullanıcı iletişim isterse site formu ayrıca sorar.
- Sunucu: kimlik doğrulaması istemez (ziyaretçi), IP bazlı hız sınırı + basit bot koruması uygular; `202 Accepted` döner.
- Başarısızlıkta eklenti kullanıcıya "şu an gönderilemedi" der; sessizce yutmaz. Kuyruğa alma 2.0 kapsamı dışıdır.

**Kabul ölçütleri (gelecek sürüm):** gerçek uç nokta yokken düğme görünmez; uç nokta eklenince gizlilik metni ve `host_permissions` güncellenir; sunucu tarafında şema doğrulaması ve hız sınırı test edilir.

---

## 5. Taksonomi uyumluluğu (uygulandı)

- Konu/etiket **kimlikleri kararlıdır**. Yeni kimlik eklemek `sema` numarasını artırmaz.
- Eski eklenti, tanımadığı kimlikleri **yok sayar** (`kayitBilinmeyenleriAyikla`), kaydı tamamen düşürmez; `sayac.yokSayilan` ve `uyarilar[]` ile raporlar. Ayrıntı: `docs/db-sema.md`.
- Site, yayınladığı `db.json`'da yalnızca güncel taksonomi kimliklerini kullanır; kimlik **yeniden adlandırılmaz** (yeni kimlik = yeni kayıt; eski kayıtlar eski kimlikle kalır).
- `sema` yalnızca alan yapısı/anlamı değişince artırılır. Site yeni bir alan ekleyecekse önce `db-sema.md` güncellenir.

---

## 6. Site teknolojisi ve barındırma (karar C — uygulandı)

| Seçenek | Artı | Eksi | Durum |
|---|---|---|---|
| **A. Statik site + BaaS** | Düşük maliyet, yönetilen auth/DB | Servis bağımlılığı, kota/limit | Tarihsel aday |
| **B. Next.js + Vercel + Postgres** | Olgun ekosistem, tek platform | Ücret/limit, soğuk başlangıç | Tarihsel aday |
| **C. Kendi sunucusu** (Node + PostgreSQL) | Tam kontrol | Bakım, yedekleme, güvenlik yükü | ✅ **seçildi** |

**Karar (2026-10-22, uygulandı 2026-10-27): C.** TypeScript (Node 22) + Next.js + PostgreSQL (Drizzle) + Caddy, Docker Compose; aynı depoda `site/`. PGlite yalnızca geliştirme/test sürücüsüdür; üretimde `DATABASE_URL` ve PostgreSQL zorunludur.

---

## 7. S0 prototipi (uygulandı)

Amaç: link → kanonik kimlik + başlık + kanal + avatar.

- Video linki: `youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…` → 11 karakter video ID.
- Kanal linki: `/@handle`, `/channel/UC…` → handle veya kanal ID.
- Uygulama: `site/lib/youtube-link.ts` linkleri çözer; `site/lib/youtube-meta.ts` metadata getirir. `YOUTUBE_API_KEY` **opsiyoneldir**; varsa YouTube Data API birincil yol, yoksa video için oEmbed ve kanal için sayfa HTML fallback'i kullanılır. Kota tüketimi `site/lib/youtube-kota.ts` ile izlenir.
- Testler: API, oEmbed ve HTML yolları mock `fetch` ile doğrulanır. Gerçek **10 video + 10 kanal** linkiyle kontrol, kullanıcıda kalan manuel QA kapsamındadır (`docs/SITE_QA.md`).
- S0 tamamlandı; S1–S7 uygulaması bu çözücüyü kullanır.

---

## 8. Puan sistemi ve uygulama notları

### 8.1 Puan sistemi

Bağlayıcı kaynak `docs/SISTEM_TASARIMI.md`'dir. 2026-10-21'de onaylanan kurallar:

- Ana konu **net puan**la belirlenir (SISTEM #1); beraberlikte sırasıyla upvote sayısı ve `taxonomy.KONULAR` sırası (#2).
- Kararsız = net **0** **ve** en az bir oy (#3); 0/0/0 kayda girmez.
- Değerlendirme eşiği **en az 3 oy**dur (#18); eşik altındaki konu/etiket yazılmaz.
- Beyaz liste mutlaktır (#19); etiket koruması/ebeveyn kilidi 2.0.0 dışında ayrı ayar olarak değerlendirilecek.

Puan dosyası bu kurallara göre güncellendi: "Kararsız" sütunu oy **sayısı**dır, negatif değer taşımaz; Argo 1 oyla eşik altında kaldığı için aktif etiket değildir.

### 8.2 Site uygulama notları

- **Anonim oy:** Hesap gerekmez; HttpOnly çerez kimliğiyle hedef + konu/etiket başına tek oy kullanılır, oy değiştirilebilir. Ham çerez kimliği panelde veya günlükte görünmez.
- **İki geri alma bayrağı:** `ziyaretciGeriAlindi` geçicidir (ziyaretçi yeniden oy verebilir); `moderasyonGeriAlindi` kalıcıdır ve gerekçeli moderasyon kaydıyla tutulur. İki durumda da oy silinmez, hesaba girmez.
- **Video/kanal ayrımı:** Video eklemek kanal satırı oluşturmaz. Video kaydı `kanal_id`, `kanal_adi`, `kanal_handle` ve `kanal_avatar` alanlarını taşır; kanal ayrıca eklenir. Avatar yoksa baş harf rozeti gösterilir.
- **Arşiv:** İçerik silinmez, arşivlenir. Arşivli kayıt kamusal listeden ve yeni `db.json`'dan çıkar; oyları, kilidi ve moderasyon kayıtları korunur. Aynı link yeniden eklenince arşivden geri getirilir.
- **IP özeti:** Ham IP saklanmaz; `x-forwarded-for` değerinin `IP_HASH_SECRET` ile HMAC-SHA256 özeti tutulur. Oy IP özeti 30 gün sonra `npm run bakim` ile temizlenir; aktif engel varsa engel süresince saklanır.
- **Yayın:** `db.json`'ı yalnızca admin yayınlar. `veriSurumu` otomatik artar; geçmiş sürümler `?surum=N` ile değişmeden indirilebilir.
- **Gizlilik metinleri:** Site metni `/gizlilik`; eklenti metni `docs/GIZLILIK.md`. İki metin ayrıdır ve birbirinin yerine kullanılmaz.
