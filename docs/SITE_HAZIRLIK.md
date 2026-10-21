# Site Hazırlığı — YouTube Filter Store

> Durum: **karar/öneri belgesi.** Site (S aşaması) henüz yazılmadı. Buradaki roller, sözleşmeler ve teknoloji seçenekleri **onay bekleyen önerilerdir**; ürün kurallarının tek kaynağı `docs/SISTEM_TASARIMI.md`'dir.
> Son güncelleme: 2026-10-21.

Bu belge, siteye geçmeden önce kapanması gereken soruları ve site–eklenti arasındaki sözleşmeleri tek yerde toplar.

---

## 1. Site rolleri (öneri — lider onayı bekliyor)

`docs/SISTEM_TASARIMI.md` bölüm 5'te yalnızca "Editör Ali" örneği geçer; **Admin / Editör / Ziyaretçi rolleri ve yetkileri tanımlı değildir.** Aşağıdaki matris öneridir:

| Yetki | Admin | Editör | Ziyaretçi |
|---|---|---|---|
| Giriş | Evet | Evet | Hayır (girişsiz) |
| Video/kanal linki ekleme | Evet | Evet | Hayır |
| Konu/etiket oyu verme | Evet | Evet | Hayır (öneri: oy için hesap) |
| Kendi oyunu değiştirme | Evet | Evet (oy verilen kayıt kapanana kadar) | — |
| Yayınlanmış kaydı düzeltme | Evet | Öneri gönderme | Hayır |
| Kullanıcı/rol yönetimi | Evet | Hayır | Hayır |
| Taksonomi (konu/etiket) yönetimi | Evet | Hayır | Hayır |
| `db.json` yayınlama | Evet | Hayır | Hayır |
| Güncel `db.json` indirme | Evet | Evet | Evet |
| Rapor/"Bildir" gönderme | Evet | Evet | Evet |

**Açık sorular:**
1. Admin kim(ler)? Tek kişi mi, ekip mi?
2. Editörler nasıl seçilir/onaylanır? Başvuru formu mu, davet mi?
3. Editör kendi eklediği içeriğe oy verebilir mi? (Öneri: hayır.)
4. Oylar anonim mi görünür, kullanıcı adıyla mı?
5. Editör başına günlük kayıt/oy limiti ne olmalı?
6. Hesap doğrulama yalnızca e-posta mı, başka yöntem var mı?
7. KVKK/GDPR kapsamında hangi veriler işlenecek (e-posta, IP, oy geçmişi) ve ne kadar saklanacak?

Bu sorular cevaplanmadan kimlik doğrulama ve yetki kodu yazılmamalı.

---

## 2. Liderden teyit bekleyen ürün kararları

Ayrıntı ve gerekçeler: `docs/SISTEM_TASARIMI.md` bölüm 6. Aşağıdaki "öneri" sütunu karar değildir.

| SISTEM # | Soru | Eklentide şu an | Öneri | Etki |
|---|---|---|---|---|
| 1 | Ana konu: net puan mı, upvote sayısı mı? | Veri `anaKonu` alanıyla gelir; hesap sitede | **Net puan** (örnek net puanla tutarlı) | Site hesabı + örnek tablo |
| 2 | Beraberlikte hangi sıra? | Veri hazır gelir | **`taxonomy.KONULAR` sırası** (belirlenimci) | Site hesabı |
| 3 | Kararsız = toplam 0 **ve** en az bir oy mu? | `kararsiz*` alanları | **Evet** (0/0/0 kayda girmez) | Site hesabı + db.json |
| 8 | Serbest modda kararsız konu izinli sayılsın mı? | **Evet** (izinli konu sayılır) | Mevcut davranış kalsın | `decision.js` tek satır |
| 10 | Orta "Kararsızlar: Engelle" ne demek? | Kullanıcının engellediği kararsız engeller | Mevcut davranış kalsın | `decision.js` |
| 11 | Katı modda kararsızlar? | Kullanıcı engelliyorsa engeller | Mevcut davranış kalsın | `decision.js` |
| 18 | Asgari oy eşiği var mı? | **Yok**; tek oy etiket aktive edebilir | **En az 3 oy** (yapılandırılabilir) | Site hesabı + db.json |
| 19 | Beyaz liste etiket korumasını geçsin mi? | **Evet**, beyaz liste her şeyi açar | 2.0.0'da mutlak kalsın; "ebeveyn kilidi" ayrı ayar olsun | `decision.js` + arayüz |

**Karar sahibi:** ekip lideri. Cevaplar gelince ilgili testler ve `docs/SISTEM_TASARIMI.md` durum sütunu güncellenir.

---

## 3. Veri köprüsü A/B (Talha'nın kararı)

- **A) Siteyi öne al:** En sadık yol; tek geliştiriciyle uzun sürer. O zamana kadar `docs/db.test-ornek*.json` ile elle test.
- **B) Yerel köprü:** Eklentiye küçük bir yerel düzenleyici ekle; kullanıcı kanal/videoya konu/etiket atar, kayıt `storage.local`'de aynı şemada tutulur ve `dbOverride` gibi davranır. Site gelince aynı şema kullanılır.

**Durum:** karar yok. **Öneri:** site 2 aydan uzun sürecekse B; aksi halde A. B seçilirse `engine.icerikKarari`'na yerel kayıt katmanı eklenir ve `db-sema.md`'de "yerel kayıt" bölümü açılır.

---

## 4. "Bildir" akışı sözleşmesi (öneri)

Düğme şu an gizli/pasiftir. Site hazır olmadan **ağ isteği açılmamalıdır**; açılırsa gizlilik politikası ve mağaza veri beyanı güncellenmelidir.

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

**Kabul ölçütleri:** gerçek uç nokta yokken düğme görünmez; uç nokta eklenince gizlilik metni, mağaza veri formu ve `host_permissions` güncellenir; sunucu tarafında şema doğrulaması ve hız sınırı test edilir.

---

## 5. Taksonomi uyumluluğu (uygulandı)

- Konu/etiket **kimlikleri kararlıdır**. Yeni kimlik eklemek `sema` numarasını artırmaz.
- Eski eklenti, tanımadığı kimlikleri **yok sayar** (`kayitBilinmeyenleriAyikla`), kaydı tamamen düşürmez; `sayac.yokSayilan` ve `uyarilar[]` ile raporlar. Ayrıntı: `docs/db-sema.md`.
- Site, yayınladığı `db.json`'da yalnızca güncel taksonomi kimliklerini kullanmalı; kimlik **yeniden adlandırılmamalı** (yeni kimlik = yeni kayıt; eski kayıtlar eski kimlikle kalır).
- `sema` yalnızca alan yapısı/anlamı değişince artırılır. Site yeni bir alan ekleyecekse önce `db-sema.md` güncellenir.

---

## 6. Site teknolojisi ve barındırma (S1 — açık)

| Seçenek | Artı | Eksi |
|---|---|---|
| **A. Statik site + BaaS** (SvelteKit/Astro + Supabase veya Cloudflare D1/Workers) | Düşük maliyet, yönetilen auth/DB, kolay yayın | Servis bağımlılığı, kota/limit |
| **B. Next.js + Vercel + Postgres** | Olgun ekosistem, tek platform | Ücret/limit, soğuk başlangıç |
| **C. Kendi sunucusu** (Node + Postgres) | Tam kontrol | Bakım, yedekleme, güvenlik yükü |

**Öneri (onay bekliyor):** A. Statik site + Supabase (auth/DB) + günlük `db.json` dışa aktarımı; yayın `GitHub Pages` veya Cloudflare R2. Ölçütler: aylık maliyet, yedekleme, KVKK, moderasyon, eşzamanlı oy yükü.

**Karar verilmeden yapılmayacaklar:** veritabanı şeması, auth sağlayıcısı, dağıtım hattı.

---

## 7. S0 prototipi (yapılmadı)

Amaç: link → kanonik kimlik + başlık + kanal + avatar.

- Video linki: `youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…` → 11 karakter video ID.
- Kanal linki: `/@handle`, `/channel/UC…` → handle veya kanal ID.
- Başlık/kanal adı/avatar için YouTube oEmbed (`https://www.youtube.com/oembed?url=…&format=json`) anahtarsız çalışır; **kanal ID'si** oEmbed'de yoktur, sayfa HTML'i veya YouTube Data API gerekir.
- Prototip kabulü: 10 video + 10 kanal linkinde doğru kimlik/başlık/avatar; hatalı linkte anlaşılır hata; sonuç JSON olarak dışa aktarılabilir.

S0 tamamlanmadan S1/S2'ye geçilmemeli.

---

## 8. Puan sistemi notu

[`docs/puan-sistemi-onerisi.md`](puan-sistemi-onerisi.md) gayriresmî bir öneridir; `docs/SISTEM_TASARIMI.md` yerine geçmez. Uyum kontrolü:

- "Kararsız" sütununda **negatif değerler** var (ör. −3); kararsız oy 0 puan olmalı, sütun oy **sayısı** olarak okunmalı.
- Beraberlik kuralı "ilk kullanılan oy" diyor; SISTEM #2 ise `KONULAR` sırasını öneriyor. Tek kurala indirilmeli.
- "Toplam 0 = kararsız" kuralı SISTEM #3 ile uyumlu; ancak "en az bir oy" şartı açıkça yazılmalı.
- Asgari oy eşiği (SISTEM #18) belgede yok.

Karar verilince bu dosya `docs/` altına taşınıp tek kaynağa bağlanmalı; o zamana kadar bağlayıcı değildir.
