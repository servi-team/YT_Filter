# YouTube Filter Store — Site Tasarımı

> Tarih: 2026-10-27 · Durum: **onay bekliyor**
> Kullanıcı kararları: site modeli **onaylı model** (ziyaretçi anonim oy verir; editör/admin yönetir), teknik yaklaşım **A** (mevcut Next.js + PostgreSQL çekirdeğini koru, özel tasarım sistemiyle tamamla).
> Bu belge uygulama kodudur değil, uygulanacak işin tasarımıdır. Onaylanmadan ürün kodu yazılmaz. `docs/PLAN_SITE.md` ile çelişirse bu belge esas alınır.

---

## 1. Amaç

YouTube Filter Store, eklentinin kullandığı konu/etiket verisini topluluk oylarıyla üretir. Ziyaretçi hesap açmadan oy verir; editörler kayıt ekler ve moderasyon yapar; admin hesapları ve yayın sürecini yönetir. Site sonucu `db.json` olarak dışa aktarır. Eklenti siteye bağlanmaz; veri aylık mağaza güncellemesiyle gelir.

Amaç yalnızca çalışan bir oylama aracı değil, **güven veren ve anlaşılır bir kamusal arayüz** kurmaktır:

- Bir ziyaretçi 10 saniye içinde ne yapacağını anlar.
- Bir oyuncu verdiği oyun sonuca nasıl yansıdığını görür.
- Bir editör kaydı ve moderasyonu tek yerden yönetir.
- Bir admin yayının eklentiye uygun olduğunu görmeden yayınlayamaz.

## 2. Onaylanan çerçeve

Aşağıdakiler bağlayıcıdır; bu belge onları değiştirmez:

- Roller: Ziyaretçi (hesapsız), Editör, Admin. Herkese açık kayıt yok.
- Anonim oy: çerez kimliği, her hedef + konu/etiket satırı için tek oy, oyunu değiştirme ve kendi oyunu geri alma hakkı.
- En az **3 toplam oy** eşiği.
- Net puan = upvote − downvote; kararsız oylar nete girmez, eşiğe girer.
- Ana konu: en yüksek net; eşitlikte upvote; hâlâ eşitse `taxonomy.KONULAR` sırası.
- Kararsız: net 0 ve toplam oy en az 3.
- Kilitli kayıt: yeni oy alır ama sonuç donar; `db.json`'a kilit anındaki sonuç yazılır.
- Geri alınan oy silinmez, işaretlenir; sonuç yeniden hesaplanır.
- `db.json` yayınlanmadan önce eklentinin kendi doğrulayıcısından geçer.
- Eklenti siteye veri göndermez; iki gizlilik metni ayrıdır.

## 3. Yaklaşım kararı

| Yaklaşım | Sonuç |
|---|---|
| **A. Mevcut çekirdeği koru + özel tasarım sistemi** | **Seçildi.** Next.js, Drizzle, mevcut saf kural testleri ve Docker/Caddy altyapısı korunur. Tasarım bağımlılığı yok, görünüm özgün, kurallarla uyum yüksek. |
| B. Tailwind + shadcn/ui | Reddedildi. Hızlı bileşen montajı sağlar; ancak mevcut CSS yeniden yazılır, standart şablon görünümü riski artar, özelleştirme maliyeti A’ya yaklaşır. |
| C. Arkadaşın Express + statik ön yüzü | Reddedildi. Hazır yönetim ekranları var; fakat anonim oy, 3 oy eşiği ve bizim yetki modeli yeniden yazılır, mevcut testler ve SSR/SEO avantajı kaybolur. |

**Tasarım kararı:** Bileşenler kendi tasarım sistemimizle, CSS değişkenleri + CSS Modules kullanılarak yazılır. Erişilebilirlik için anlamsal HTML, klavye odağı ve `aria` nitelikleri elle uygulanır.

## 4. Tasarım yönü: “Sinyal Kalkanı”

### 4.1 Karakter

Sıcak, editöryel ve teknolojik bir arayüz. Kağıt dokusunu andıran açık zemin, koyu mürekkep metin, sinyal kırmızısı vurgu. “Güvenilir bir yayın kütüphanesi” hissi; oyunlaştırılmış, neon bir panel değil.

- **Marka:** kalkan; filtreleme, güvenlik ve seçim.
- **Ton:** sakin, açık, toplulukçu; resmî ama soğuk değil.
- **Görsel imza:** ince kırmızı çizgi, kalkan silueti, büyük serif başlık, sayısal veride monospace kimlikler.
- **Kaçınılanlar:** mor-mavi SaaS gradyanları, cam efektli kartlar, aşırı yuvarlak “AI ürünü” görünümü, stok insan fotoğrafları.

### 4.2 Renk tokenları

| Token | Açık tema | Koyu tema | Kullanım |
|---|---|---|---|
| `--zemin` | `#F7F3EB` | `#111315` | Sayfa zemini |
| `--yuzey` | `#FFFDF8` | `#1A1D20` | Kart, panel |
| `--murekkep` | `#171A1C` | `#F3EFE7` | Ana metin |
| `--ikincil` | `#6B6861` | `#A7A39B` | İkincil metin |
| `--cizgi` | `#E3DCCF` | `#2C3034` | Kenarlık |
| `--sinyal` | `#C9342B` | `#F2635A` | Ana eylem, vurgu |
| `--sinyal-koyu` | `#98251F` | `#C9342B` | Hover/basılı |
| `--yesil` | `#1E6B52` | `#63C9A8` | Upvote, olumlu |
| `--amber` | `#A96416` | `#E9B45C` | Kararsız |
| `--kirmizi` | `#B3261E` | `#F08A82` | Downvote, hata |
| `--odak` | `#2E6F95` | `#8CC8E8` | Klavye odağı |

Renk tek başına anlam taşımaz; upvote/kararsız/downvote için ok, soru işareti ve aşağı ok simgeleri de kullanılır. Metin kontrastı WCAG AA hedefler. Tema, `prefers-color-scheme` ile otomatik uygulanır; ilk sürümde elle tema anahtarı yoktur.

### 4.3 Tipografi

- Başlıklar: **Fraunces** (variable, latin-ext) — editöryel, güçlü, fazla süslemesiz.
- Arayüz/metin: **Manrope** (variable, latin-ext) — temiz, Türkçe karakter desteği iyi.
- Kimlikler ve sayılar: sistem monospace (`ui-monospace`, `Consolas`).
- Fontlar `next/font/local` ile repoda tutulan Fraunces/Manrope `woff2` dosyalarından yüklenir; lisans dosyaları `site/app/fontlar/` altında saklanır. Çalışma anında üçüncü taraf isteği yoktur; dosya yüklenemezse sistem font yığınına düşer.

### 4.4 Düzen

- Maksimum içerik genişliği `1240px`; okuma metinleri `68ch`.
- 12 sütunlu grid; mobilde tek sütun.
- Header: yapışkan değil, ince ve sakin. Logo + “Keşfet” + “Nasıl çalışır?” + “db.json” + giriş bağlantısı; oturum açıksa “Panel” ve “Çıkış”.
- Footer: kısa marka açıklaması, gizlilik/koşullar/iletişim bağlantıları, GitHub ve son veri sürümü.
- Ana sayfa: solda büyük başlık ve link alanı; sağda “sonuç kartı” önizlemesi. Mobilde alt alta.
- İçerik sayfası: solda oy tabloları, sağda yapışkan sonuç paneli. Mobilde sonuç paneli üstte özet, altta oy tabloları.
- Panel: solda ince yan menü, sağda içerik. Mobilde üstte yatay menü.
- Köşe yarıçapı: kartlarda `14px`, düğmelerde `10px`, rozetlerde tam yuvarlak.
- Gölge: yalnızca yükselen kartlarda çok hafif; genel görünüm çizgi ağırlıklı.

### 4.5 Bileşenler

- `Dugme`: birincil (kırmızı), ikincil (çizgili), tehlike, küçük, ikonlu.
- `Rozet`: konu, etiket, kararsız, kilitli, yayında.
- `OyDugmesi`: üçlü segment; seçili durum, sayı, erişilebilir etiket.
- `OyTablosu`: konu ve etiket sekmeleri/başlıkları; satır bazlı oy; mobil kart görünümü.
- `SonucPaneli`: ana konu, yan konular, etiketler, kararsızlar, eşik ilerlemesi, yayın durumu.
- `IcerikKarti`: küçük kapak, başlık, kanal, sonuç çipleri.
- `Kalkan`: SVG logo; header, favicon, boş durum, hata sayfası.
- `Bildirim`: sağ altta canlı bölge; hata/başarı.
- `OnayDiyalogu`: kilit, geri alma ve arşivleme için.
- `SayfaBasligi`, `BosDurum`, `Iskelet`, `Sekmeler`, `FormAlani`, `HataMetni`.

### 4.6 Hareket

- Geçişler 150–220 ms; yalnızca opaklık, transform ve renk.
- Oy verince sayılar yumuşak güncellenir; sonuç paneli “canlı” hissi verir.
- `prefers-reduced-motion: reduce` tüm animasyonları kapatır.
- Otomatik oynayan video, parallax veya scroll animasyonu yok.

### 4.7 Erişilebilirlik

- Her sayfada “İçeriğe geç” bağlantısı.
- Klavye ile tüm oy ve form akışları; görünür odak halkası.
- Oy tabloları anlamsal `table`; mobil kart görünümünde aynı bilgi.
- `aria-live="polite"` ile sonuç güncellemeleri duyurulur.
- Hata mesajları alanla ilişkilendirilir; renk + metin + simge.
- Dokunma hedefleri en az 44×44 px.
- Sayfa dili `tr`; başlıklar hiyerarşik.

## 5. Bilgi mimarisi ve sayfalar

### 5.1 Kamusal sayfalar

| Yol | İçerik | Not |
|---|---|---|
| `/` | Hero, link yapıştırma, son kayıtlar, istatistikler, “nasıl çalışır”, `db.json` indirme | Ana giriş |
| `/kesfet` | Kayıt arama, tür/durum filtresi, sayfalama | Kamusal kütüphane |
| `/icerik/[tur]/[id]` | Kapak/avatar, başlık, kanal, oy tabloları, sonuç paneli | `tur`: `video` veya `kanal` |
| `/link` | Yapıştırılan linkin sonucu: kayıt varsa yönlendirme; yoksa “ekleme talebi” | İnce sonuç sayfası |
| `/giris` | Editör/admin girişi | Genel kayıt yok |
| `/sifre-degistir` | İlk giriş/parola yenileme | Oturum gerekir |
| `/gizlilik` | Site gizlilik politikası | Eklenti metninden ayrı |
| `/kosullar` | Kullanım koşulları | Taslak |
| `/iletisim` | GitHub Issues ve site sorumlusu | Form yok |
| `/db.json` | Son onaylı veri dosyası | Yayın yoksa 404 + açıklama |

### 5.2 Editör paneli

| Yol | İçerik |
|---|---|
| `/panel` | Özet: bekleyen talepler, son moderasyon, toplam oy, kilitli kayıtlar |
| `/panel/icerikler` | Kayıt listesi, arama, yeni link ekleme |
| `/panel/icerikler/[tur]/[id]` | Kayıt detayı, oy dağılımı, takma adlı oy satırları, moderasyon araçları |
| `/panel/talepler` | Ekleme talepleri; kabul/red, gerekçe |
| `/panel/moderasyon` | Son işlemler ve gerekçeler |
| `/panel/engeller` | Aktif çerez/ağ engelleri; gerekçe ve kaldırma |

### 5.3 Admin paneli

| Yol | İçerik |
|---|---|
| `/admin` | Site özeti, yayın durumu, uyarılar |
| `/admin/hesaplar` | Editör/admin oluştur, rol değiştir, aktif/pasif yap, geçici parola ver |
| `/admin/icerikler` | Tüm kayıtlar; metadata düzeltme, arşivleme/geri getirme |
| `/admin/yayinlar` | `db.json` önizleme, doğrulama, yayınlama, geçmiş |
| `/admin/taksonomi` | Salt okunur taksonomi ve sıra; eklenti sürümü notu |

### 5.4 Kamusal akışlar

**Kayıtlı link:**
1. Ziyaretçi ana sayfadaki alana link yapıştırır.
2. Sunucu linki çözer; kayıt varsa içerik sayfasına yönlendirir.
3. Ziyaretçi konu ve etiket satırlarında up/kararsız/down seçer.
4. Her oyda sunucu sayımı ve sonucu döndürür; sayfa optimistic güncellenir, hata olursa geri alınır.
5. Aynı tarayıcı aynı satırda oyunu değiştirebilir; “oyu geri al” seçeneği de vardır.

**Kayıtsız link:**
1. Link çözülür, kayıt bulunamaz.
2. “Bu içerik henüz kayıtlı değil” ekranı ve “Ekleme talebi gönder” düğmesi görünür.
3. Talep, aynı link için tek kayıtta birleşir; kullanıcıya “talebiniz alındı” denir.
4. Editör kuyruğunda kabul veya gerekçeli red.

**Yayın indirme:**
- Kamusal `/db.json` yalnızca adminin yayınladığı son sürümü verir.
- Dosya adı `yt-filter-db-v{veriSurumu}.json`.
- Sayfada sürüm, tarih ve kayıt sayıları görünür.

### 5.5 Moderasyon görünürlüğü ve kapsamı

Editör, `/panel/icerikler/[tur]/[id]` sayfasında oyları **takma adlı satırlar** olarak görür:

- `çerez:3f9a2c1b` — çerez kimliğinin SHA-256 özetinin ilk 8 karakteri.
- `ağ:7d4e1a02` — IP özetinin ilk 8 karakteri.
- Oyun değeri, konu/etiket, zaman ve durum (aktif / ziyaretçi geri aldı / moderasyon geri aldı / engel nedeniyle sayılmıyor).

Tam çerez kimliği, tam IP özeti ve ham IP hiçbir panel ekranında gösterilmez. Engelleme ve geri alma işlemleri `oyId` üzerinden sunucuda çözülür; tam kimlik istemciye gönderilmez.

**Geri alma kapsamı:**

| İşlem | Kapsam | Kalıcılık |
|---|---|---|
| Ziyaretçi “oyu geri al” | Yalnızca kendi tek oyu | Geçici; yeniden oy verilebilir |
| Editör “oyu geri al” | Seçili tek oy | Kalıcı; o çerez o satırda bir daha oy veremez |
| Editör “çerezin bu kayıttaki oyları” | Aynı çerezin bu hedefteki tüm konu/etiket oyları | Kalıcı |
| Editör “çerezin tüm site oyları” | Aynı çerezin tüm hedeflerdeki oyları | Kalıcı; onay ve gerekçe zorunlu |

“Çerezin tüm site oyları” yalnızca mevcut oyları kapsar; gelecekteki oyları durdurmak için çerez engeli kullanılır. Moderasyon kaydında tam kimlik yerine `oyId` ve kısa etiket tutulur.

IP özeti 30 gün sonra silindiği için eski oy satırlarında ağ etiketi ve ağ engeli seçeneği görünmez; yalnızca çerez engeli kullanılabilir.

**Engelleme:**

- **Çerez engeli:** O çerezin tüm sitedeki oyları engel aktif olduğu sürece sayılmaz; yeni oy ve talepleri reddedilir.
- **Ağ (IP özeti) engeli:** Aynı IP özetinden gelen oylar engel aktifken sayılmaz. Paylaşımlı ağları (NAT, okul, ofis) etkileyebileceği için onay ekranında uyarı gösterilir; önce çerez engeli önerilir.
- Engelin kaldırılması eski oyları yeniden sayıma sokar. Kalıcı temizlik için “çerezin tüm site oyları” işlemi ayrıca kullanılır.
- `/panel/engeller` aktif engelleri, gerekçeyi, başlangıç/bitişi ve işlemi yapanı listeler; yetkili kişi engeli kaldırabilir. Kaldırılan veya süresi dolan engelin satırı silinir; gerekçe ve tarih `moderasyon_kayitlari`nda kalır.

## 6. Roller ve yetkiler

| Yetki | Ziyaretçi | Editör | Admin |
|---|---|---|---|
| Kayıtlı içeriği görme | ✅ | ✅ | ✅ |
| Oy verme / değiştirme / kendi oyunu geri alma | ✅ | ✅ | ✅ |
| `db.json` indirme | ✅ | ✅ | ✅ |
| Kayıtsız link için talep | ✅ | ✅ | ✅ |
| Yeni kayıt ekleme | ❌ | ✅ | ✅ |
| Talebi kabul/red | ❌ | ✅ | ✅ |
| Oyları geri alma (tek / çerez-kayıt / çerez-site) | ❌ | ✅ | ✅ |
| Kaydı kilitleme/açma | ❌ | ✅ | ✅ |
| Çerez/IP engelleme ve engel kaldırma | ❌ | ✅ | ✅ |
| İçerik metadata düzeltme, arşivleme/geri getirme | ❌ | ❌ | ✅ |
| Hesap oluşturma, rol/aktiflik yönetimi | ❌ | ❌ | ✅ |
| `db.json` yayınlama | ❌ | ❌ | ✅ |
| Taksonomi görüntüleme | ✅ | ✅ | ✅ |

**Karar:** Editör kilit, geri alma ve engelleme işlemlerini tek başına, gerekçe zorunlu ve moderasyon kaydıyla yapar. Admin onayı beklenmez; bu, moderasyonu hızlandırır ve her işlem geri izlenebilir.

**Karar (2026-10-27):** Birden fazla admin olabilir. Admin `/admin/hesaplar` üzerinden editör veya admin oluşturur; son aktif admin pasifleştirilemez veya rolü düşürülemez, admin kendi hesabını pasifleştiremez veya rolünü düşüremez. Bu kurallar sunucu tarafında, rol değişimiyle aynı transaction içinde doğrulanır.

**Karar (2026-10-27):** İçerik silinmez, arşivlenir. Arşivlenen kayıt kamusal listeden ve `db.json`dan çıkar; oyları, kilidi ve moderasyon kayıtları korunur. Aynı link yeniden eklendiğinde arşivden geri getirilir.

**Karar:** Taksonomi ilk sürümde salt okunurdur. Yeni konu/etiket kimliği eklenti sürümüyle gelir; site tek başına yeni kimlik uydurmaz. Admin paneli mevcut listeyi ve sırayı gösterir, yeni kimlik için sürüm notu yayınlar. Bu, eklentinin `dbKur` doğrulayıcısıyla uyumu korur.

## 7. Veri modeli

Mevcut şema korunur; aşağıdaki alanlar/tablolar eklenir veya dar kapsamlı geçişlerle değiştirilir.

### 7.1 Mevcut tablolar

- `hesaplar`: editör/admin; e-posta, parola özeti, rol, aktif, son giriş.
- `kanallar`: UC kimliği, handle, ad, avatar, ekleyen, arşiv bilgisi.
- `videolar`: video kimliği, başlık, kanal ID'si (FK'sız), kanal adı/handle/avatar, ekleyen, arşiv bilgisi.
- `oylar`: hedef, konu/etiket, değer, tarayıcı kimliği, IP özeti, ziyaretçi geri alma, moderasyon geri alma.
- `ekleme_talepleri`: link, hedef, durum, talep sayısı, red gerekçesi.
- `kilitler`, `moderasyon_kayitlari`, `engeller`, `yayin_surumleri`.

### 7.2 Eklenecekler

| Tablo/alan | Amaç |
|---|---|
| `oturumlar` | Oturum kimliği özeti, hesap, son kullanma, son görülme, IP özeti |
| `hiz_limitleri` | IP/çerez bazlı pencere sayacı; çok örnekli dağıtımda da çalışır |
| `hesaplar.parola_degistirmeli` | İlk girişte parola değiştirme zorunluluğu |
| `hesaplar.son_giris` | Admin görünürlüğü |
| `oylar.ziyaretci_geri_alindi` | Ziyaretçinin kendi oyunu geri alması; yeniden oy verince temizlenir |
| `oylar.moderasyon_geri_alindi`, `oylar.geri_alan`, `oylar.geri_alma_gerekce`, `oylar.geri_alma_zamani` | Moderasyon (editör/admin) geri alması; kalıcı, ziyaretçi tarafından ezilemez |
| `kanallar.arsivlendi`, `kanallar.arsivleyen` | Arşivleme; kamusal liste ve `db.json` dışında tutulur |
| `videolar.arsivlendi`, `videolar.arsivleyen` | Arşivleme; kamusal liste ve `db.json` dışında tutulur |
| `videolar.kanal_id` (FK'sız metin) | Video eklemek kanal kaydı açmaz; YouTube UC kimliği videoda saklanır |
| `kanallar.avatar`, `kanallar.meta_guncelleme` | Görsel ve metadata önbelleği |
| `videolar.kanal_adi`, `videolar.kanal_handle`, `videolar.kanal_avatar`, `videolar.meta_guncelleme` | Kanal kaydı olmasa da başlık/avatar gösterimi |
| `ekleme_talepleri.red_gerekce` | Gerekçeli red |
| `yayin_surumleri.notlar` | Yayın notu |
| `engeller` (`tur`: `tarayici`/`ip`, `deger`, `bitis`) | Mevcut tablo; çerez ve IP özeti engeli, `bitis` ile süreli engel |
| `moderasyon_kayitlari.islem` yeni değerleri | `engel-kaldir`, `arsivle`, `geri-getir`, `hesap-olustur`, `rol-degistir`, `aktiflik` |

**Geri alma alanları:** Mevcut `oylar.geri_alindi` alanı `moderasyon_geri_alindi` olarak yeniden adlandırılır; `geri_alan`, `geri_alma_gerekce`, `geri_alma_zamani` yalnızca moderasyon geri almasında dolar. Yeni `ziyaretci_geri_alindi` alanı ziyaretçinin kendi geri almasını tutar ve yeniden oy verildiğinde `false` yapılır. Sayımda iki alandan biri `true` ise oy dışlanır; moderasyon geri alması varken `oyVer` `409` döner.

**Kimlik kuralı:** Kanal `id` her zaman `UC…`; video `id` her zaman 11 karakter. `@handle` yalnızca görüntüleme/arama alanıdır, birincil anahtar değildir. Bu, `db.json` sözleşmesiyle uyumludur.

**Video-kanal ayrımı:** Video eklemek `kanallar` satırı oluşturmaz. `videolar.kanal_id` YouTube UC kimliğini düz metin olarak taşır; `kanal_adi`, `kanal_handle` ve `kanal_avatar` video satırında denormalize edilir. Kanal kaydı yalnızca kanal linki ayrıca eklendiğinde oluşur. Bu, `SISTEM_TASARIMI` bölüm 6 #4 (“video varsa yalnızca video”) ve `db.json` şemasındaki ayrı `kanallar`/`videolar` listeleriyle uyumludur. Mevcut şemadaki `videolar.kanal_id` foreign key’i kaldırılır; geçişte mevcut kanal ID’leri korunur, varsa kanal adı/handle/avatar video satırına kopyalanır.

**Arşivleme:** Admin bir kaydı arşivler; kayıt kamusal arama, keşfet ve `db.json`dan çıkar. Oylar, kilit ve moderasyon kayıtları silinmez. Aynı link yeniden eklendiğinde, talebi kabul edildiğinde veya admin `/admin/icerikler` üzerinden geri getirdiğinde arşivdeki kayıt geri getirilir; oylar ve varsa kilit durumu korunur. Ekleme akışı önce arşivde arar ve bulursa “arşivden geri getirilecek” onayı gösterir; `/link` arşivli kaydı aktif kayıt gibi göstermez, talep akışına düşürür. Arşivli kayıtlar yalnızca `/admin/icerikler?durum=arsiv` altında görünür; doğrudan içerik URL’si 404 döner. Kanal arşivlemek videoları etkilemez; `videolar.kanal_id`, `kanal_adi`, `kanal_handle` ve `kanal_avatar` korunur. Yayınlanmış eski `db.json` sürümleri değişmez.

**Avatar notu:** Bu tasarım, mevcut `site/README.md` ve `site/db/schema.ts` içindeki “avatar yok” notunu değiştirir. `kanallar.avatar` opsiyoneldir; yoksa baş harf rozeti gösterilir. Uygulama sırasında README ve şema yorumları bu tasarımla uyumlu hale getirilir.

**Avatar/başlık:** YouTube Data API anahtarı varsa kanal avatarı ve video başlığı oradan; yoksa video için oEmbed, kanal için HTML meta/fallback kullanılır. Avatar yoksa baş harf rozeti gösterilir. Video kapağı her zaman `i.ytimg.com/vi/{id}/hqdefault.jpg`.

## 8. Teknik mimari

```
İnternet → Caddy (HTTPS) → Next.js App Router → PostgreSQL
                                  │
                                  ├─ YouTube Data API / oEmbed / HTML (yalnızca kayıt ekleme)
                                  └─ db.json üretimi (saf lib + eklenti doğrulayıcısı)
```

| Katman | Karar |
|---|---|
| Çatı | Next.js App Router, TypeScript, `output: standalone` |
| Veritabanı | PostgreSQL 17 (üretim), Drizzle ORM + SQL geçişleri |
| Yerel geliştirme | Docker yoksa **PGlite** ile aynı PostgreSQL lehçesi; üretimde kullanılmaz |
| Oturum | HttpOnly çerez + veritabanında token özeti; ek kütüphane yok |
| Parola | Node `scrypt`; düz parola saklanmaz |
| Stil | CSS değişkenleri + CSS Modules; Tailwind yok |
| Font | `next/font/local`; repoda `woff2` + lisans, çalışma anında üçüncü taraf isteği yok |
| Dağıtım | `site`, `postgres`, `caddy` Docker Compose; Caddy TLS |
| Test | `node:test` + PGlite entegrasyon testleri; tarayıcıda Playwright/elle QA |
| Ortak çekirdek | `site/lib/ortak.ts` → `src/core/taxonomy.js`, `src/core/db.js` |

### 8.1 Klasör düzeni (hedef)

```
site/
├─ app/
│  ├─ (kamusal)/            # ana sayfa, keşfet, içerik, gizlilik...
│  ├─ (oturum)/             # giriş, parola değiştir
│  ├─ panel/                # editör
│  ├─ admin/                # admin
│  ├─ api/                  # route handler'lar
│  ├─ bilesenler/           # ortak React bileşenleri
│  ├─ fontlar/              # Fraunces/Manrope woff2 + lisans
│  └─ stil.css              # token + reset
├─ lib/
│  ├─ ortak.ts              # eklenti çekirdeği
│  ├─ oy-hesabi.ts          # saf kurallar
│  ├─ oy-deposu.ts          # DB oy işlemleri
│  ├─ db-uret.ts            # db.json üretimi
│  ├─ oturum.ts             # auth/session
│  ├─ hiz-limiti.ts         # rate limit
│  ├─ youtube-link.ts       # link çözme
│  ├─ youtube-meta.ts       # metadata resolver
│  └─ yetki.ts              # rol kontrolleri
├─ db/schema.ts, db/gecisler/
├─ tests/
└─ scripts/                 # migrate, seed, bakım
```

### 8.2 Yerel geliştirme

Docker bu makinede yok. Bu nedenle:

- Varsayılan üretim yolu değişmez: PostgreSQL + Docker Compose.
- `SITE_DB=pglite` ile `next dev` aynı şemayı PGlite üzerinde açar; geçişler otomatik uygulanır.
- `npm run demo:veri` ile yalnızca geliştirme ortamına örnek kayıt/oy eklenir.
- PGlite yalnızca devDependency’dir; üretim imajına girmez.
- Docker dosyaları korunur; gerçek dağıtımda `docker compose` ile doğrulanır.

## 9. API yüzeyi

Tüm yazma işlemleri JSON, aynı origin kontrolü ve hız sınırı kullanır. Hata gövdesi `{ hata: string, kod?: string }`.

### 9.1 Kamusal

| Yöntem | Yol | İş |
|---|---|---|
| GET | `/api/icerikler?arama=&tur=&sayfa=` | Liste + sonuç özeti |
| GET | `/api/icerikler/[tur]/[id]` | Detay + sayımlar + kendi oyu |
| GET | `/api/link?url=` | Link çöz, kayıt var mı |
| PUT | `/api/oylar` | Oy ver/değiştir |
| POST | `/api/oylar/geri-al` | Ziyaretçi kendi oyunu geri alır |
| POST | `/api/talepler` | Kayıtsız link için talep |
| GET | `/db.json` | Son onaylı dosya |

Kamusal liste ve detay uç noktaları arşivli kayıtları döndürmez.

### 9.2 Oturum

| Yöntem | Yol | İş |
|---|---|---|
| POST | `/api/oturum` | Giriş |
| DELETE | `/api/oturum` | Çıkış |
| GET | `/api/oturum/ben` | Mevcut kullanıcı |
| POST | `/api/oturum/parola` | Parola değiştir |

### 9.3 Editör

| Yöntem | Yol | İş |
|---|---|---|
| POST | `/api/panel/icerikler` | Linkten kayıt ekle |
| POST | `/api/panel/talepler/[id]` | Kabul/red |
| POST | `/api/panel/moderasyon/oy-geri-al` | Tek oy, çerezin bu kayıttaki oyları veya çerezin tüm site oyları; gerekçe zorunlu |
| POST | `/api/panel/moderasyon/kilitle` | Kilitle |
| POST | `/api/panel/moderasyon/kilit-ac` | Kilidi aç |
| POST | `/api/panel/moderasyon/engelle` | Seçili oyun çerezini veya IP özetini engelle; gerekçe zorunlu |
| GET | `/api/panel/engeller` | Aktif engelleri listele |
| DELETE | `/api/panel/engeller/[id]` | Engeli kaldır; satırı sil, moderasyon kaydı oluştur |

Moderasyon uç noktaları gövdede `oyId` ve `kapsam` alır; çerez/IP kimliğini sunucu oy satırından çözer. İstemci tam kimlik göndermez veya görmez.

### 9.4 Admin

| Yöntem | Yol | İş |
|---|---|---|
| GET/POST | `/api/admin/hesaplar` | Hesapları listele/oluştur (yalnızca admin) |
| PATCH | `/api/admin/hesaplar/[id]` | Rol, aktiflik, geçici parola |
| GET | `/api/admin/icerikler?durum=aktif\|arsiv` | Tüm kayıtları listele |
| POST | `/api/admin/icerikler/[tur]/[id]/arsivle` | Arşivle; gerekçe zorunlu |
| POST | `/api/admin/icerikler/[tur]/[id]/geri-getir` | Arşivden geri getir |
| POST | `/api/admin/yayinlar/onizle` | Doğrulanmış aday üret |
| POST | `/api/admin/yayinlar` | Yayınla |
| GET | `/api/admin/yayinlar` | Geçmiş |

Son aktif adminin pasifleştirilmesi veya rolünün düşürülmesi `409` ile reddedilir.

## 10. Güvenlik ve gizlilik

### 10.1 Anonim oy

- `ytf_ziyaretci` çerezi: 32 bayt rastgele, HttpOnly, SameSite=Lax, 1 yıl, üretimde Secure.
- Çerez yoksa ilk oy/talepte üretilir.
- Bir hedef + konu/etiket + çerez için tek satır; veritabanı benzersizlik indeksi zorlar.
- Ham IP saklanmaz; `HMAC-SHA256(IP, IP_HASH_SECRET)` saklanır.
- Oy kayıtlarındaki IP özeti **30 gün** sonra temizlenir; oy kaydı anonim/pseudonymous kalır. Aktif engel kaydındaki IP özeti, engel kaldırılana kadar saklanır. Bakım betiği `npm run bakim` ile çalışır.
- Süresi dolmuş veya kaldırılmış engellerin satırı silinir; gerekçe ve tarih `moderasyon_kayitlari`nda denetim için kalır. Aynı kimlik için yeni engel, varsa eski satırı günceller.
- Panelde tam çerez kimliği ve tam IP özeti gösterilmez; yalnızca 8 karakterlik takma etiketler (`çerez:…`, `ağ:…`) görünür. Moderasyon işlemleri `oyId` üzerinden sunucuda çözülür.
- Çerez/ağ engeli aktifken o kimliğin oyları sayılmaz; engel kaldırılınca eski oylar yeniden sayılır. Moderasyon geri alması kalıcıdır ve engelden bağımsızdır.
- Ağ engeli paylaşımlı IP’leri etkileyebilir; onay ekranında uyarı gösterilir ve gerekçe zorunludur.
- Hız sınırı: oy için IP+çerez başına dakikada 120, günde 2000; talep için saatte 5; giriş için 15 dakikada 10. Aşılırsa `429`.
- Captcha yok; moderasyon ve 3 oy eşiği ana güvence.

### 10.2 Oturum ve parola

- Oturum tokenı 32 bayt rastgele; yalnızca SHA-256 özeti veritabanında.
- Çerez `ytf_oturum`, HttpOnly, SameSite=Lax, 7 gün kayan / 30 gün mutlak.
- Parola `scrypt` (N=32768, r=8, p=1) + 16 bayt tuz; sabit zamanlı karşılaştırma.
- Minimum 12 karakter. Admin geçici parola verir; ilk girişte değiştirme zorunlu.
- İlk admin: `ILK_ADMIN_EPOSTA`, `ILK_ADMIN_PAROLA` ortam değişkenleriyle, yalnızca hiç hesap yokken oluşturulur. İlk girişte parola değiştirme zorunlu.
- Birden fazla admin olabilir. Yeni admin, mevcut admin tarafından `/admin/hesaplar` üzerinden oluşturulur.
- Son aktif admin pasifleştirilemez, rolü editöre düşürülemez; admin kendi hesabını pasifleştiremez veya rolünü düşüremez. Kontrol, rol/aktiflik güncellemesiyle aynı transaction içinde ve admin satırları sabit sırayla (`ORDER BY id`) kilitlenerek yapılır.
- Giriş denemeleri IP+e-posta bazlı sınırlanır; hata mesajı hesabın varlığını sızdırmaz.
- Çıkışta oturum satırı iptal edilir.

### 10.3 Yetki ve CSRF

- Her panel/admin route’u sunucu tarafında rol kontrolü yapar; yalnızca arayüz gizleme yetmez.
- Tüm yazma isteklerinde `Origin`/`Host` aynı origin kontrolü.
- Admin bir hesabı pasifleştirdiğinde veya rolünü değiştirdiğinde o hesabın mevcut oturumları iptal edilir.
- Arşivlenen içerik kamusal uçlardan ve `db.json`dan gizlenir; arşivleme/geri getirme gerekçesi `moderasyon_kayitlari`na yazılır.
- Moderasyon işlemleri gerekçesiz yapılamaz; `moderasyon_kayitlari`’na yazılır.

### 10.4 Gizlilik metni

Site gizlilik sayfası şunları açıkça yazar:

- Hesap açmadan oy verilebilir; tarayıcıya 1 yıl ömürlü rastgele kimlik çerezi konur.
- Oy sayıları herkese açık; tekil oy sahibi kimliği yayınlanmaz.
- IP’nin düz metni saklanmaz; oy kayıtlarındaki güvenlik özeti 30 gün, aktif engel kaydındaki özet engel süresince tutulur.
- Engel kayıtları, engelin uygulanması için çerez kimliği veya IP özetini sunucuda tutar; panelde yalnızca kısa etiket görünür.
- Moderatörler oy satırlarında yalnızca kısa takma etiketleri görür; tam çerez kimliği, tam IP özeti ve ham IP gösterilmez.
- Arşivlenen kayıtların oyları silinmez; yalnızca kamusal yayından çıkarılır.
- Editör/admin hesaplarında e-posta ve parola özeti tutulur.
- YouTube’dan alınan başlık/avatar/kapak görselleri gösterilir; görseller YouTube sunucularından yüklenir.
- Analitik, reklam ve üçüncü taraf izleme yoktur.
- Veri silme talebi ve iletişim: GitHub Issues.

Eklentinin `docs/GIZLILIK.md` metni ayrı kalır ve “bu metin yalnızca eklentiyi kapsar” notunu taşır; site gizlilik metni ayrı bir sayfadır.

## 11. YouTube metadata çözümleme

| Girdi | Yöntem | Çıktı |
|---|---|---|
| Video linki | oEmbed (`youtube.com/oembed`) | başlık, kanal adı, kanal handle, kapak |
| Video (API varsa) | Data API `videos` | kanal ID, kanal adı, handle, avatar |
| Kanal `@handle` | Data API `channels?forHandle` | UC kimliği, ad, avatar |
| Kanal `@handle` (API yok) | Kanal sayfası HTML `channelId` + meta | UC kimliği, ad, avatar |
| Kanal `/channel/UC…` | Data API veya HTML meta | ad, avatar |

- API anahtarı **opsiyonel**: `YOUTUBE_API_KEY`. Varsa birincil; yoksa HTML/oEmbed fallback.
- Kanal linki `kanallar`, video linki `videolar` tablosuna yazılır. Video kanal bilgisi video satırında denormalize edilir; video eklemek `kanallar` satırı oluşturmaz.
- Sonuçlar önbelleklenir; her gösterimde tekrar istenmez.
- Günlük kota sayacı `hiz_limitleri` veya ayrı sayaçta tutulur; limit yaklaşınca editöre uyarı.
- Ağ hatasında kayıt yine oluşturulabilir (başlık/avatar sonradan tamamlanır); kullanıcıya “bilgiler sonra tamamlanacak” denir.
- HTML fallback kırılırsa editör `/channel/UC…` linkiyle ekleyebilir; arayüz bunu açıklar.

## 12. `db.json` yayın akışı

1. Admin `/admin/yayinlar` sayfasında “Önizle” der.
2. Sunucu tüm **aktif** kayıtların güncel sayımlarını/kilitlerini toplar.
3. `dbUret` çalışır; katı doğrulama + eklenti `dbKur` doğrulaması yapılır.
4. Önizleme: sürüm, tarih, kanal/video sayısı, yazılmayan kayıt sayısı, ilk 5 hata/uyarı.
5. Admin not yazar ve “Yayınla” der; `yayin_surumleri` kaydı oluşur, `veriSurumu` bir öncekinden büyük olur.
6. `/db.json` yeni sürümü verir; eski sürümler geçmişte indirilebilir.
7. Doğrulama başarısızsa yayın düğmesi kapalıdır; hata listesi gösterilir.

**Kilit kuralı:** Kilitli kayıtta sonuç, kilit anındaki `sonuc` alanından gelir. Kilit açılınca güncel oylar kullanılır.

**Arşiv kuralı:** Arşivlenmiş kayıtlar `db.json`a girmez; yayınlanmış eski sürümler değişmez.

**Kanal bağımsızlığı:** Video kaydı için kanal kaydı gerekmez; `db.json`daki `kanallar` ve `videolar` listeleri bağımsızdır.

## 13. Test ve doğrulama

### Birim/entegrasyon (otomatik)

- Oy hesabı: kabul örneği, eşik, kararsız, beraberlik (net → upvote → taksonomi), sıfır oy.
- `db.json`: deterministik sıra, kilit, boş kayıt, bilinmeyen kimlik hatası, eklenti `dbKur` kabulü.
- Link çözme: tüm YouTube biçimleri, hatalı linkler.
- PGlite: geçişler, tek oy, oy değiştirme, ziyaretçi geri alma/yeniden oy, moderasyon geri alma (kalıcı), kilit, tekil indeksler, oturum.
- Moderasyon: tek oy / çerezin kayıt oyları / çerezin site oyları; çerez ve ağ engeli; engel kaldırınca oyların geri sayılması; engel listesi; gerekçe zorunluluğu.
- Admin: çok admin, son admin koruması, kendi kendini pasifleştirme reddi, eşzamanlı rol değişimi.
- Arşiv: kamusal/`db.json` dışı, oyların korunması, aynı linkle geri getirme, eski yayınların değişmemesi.
- Video/kanal: video eklemenin kanal satırı oluşturmaması; kanalın ayrı eklenmesi; `kanal_id` foreign key’inin kaldırılması.
- Yetki: her rol için izinli/yasak işlem.
- Hız sınırı: pencere aşımı, pencere sıfırlanması.
- Metadata resolver: mock fetch ile API/oEmbed/HTML yolları.
- API: aynı origin, geçersiz gövde, 401/403/409/429.
- Moderasyon görünürlüğü: panel yanıtlarında tam çerez/IP yok, yalnızca kısa takma etiketler var.

### Tarayıcı QA

- 1280×800 ve 390×844 ekranlarda ana sayfa, keşfet, içerik, giriş, panel, admin.
- Oy ver → sayı ve sonuç güncellenir; sayfa yenilenince oy seçili kalır.
- Kayıtsız link → talep; editör kabul; içerik oylanabilir.
- Kilit → oy sayısı artar, sonuç değişmez; kilit açılınca değişir.
- Ziyaretçi geri al → sonuç düşer, aynı satırda yeniden oy verilebilir.
- Editör geri al → sonuç düşer, o çerez aynı satırda bir daha oy veremez.
- Çerez engeli → oylar sayılmaz; engel kaldırılınca geri gelir.
- Arşivle → kayıt keşfette ve `/db.json`da yok; geri getir → eski oylarla döner.
- Admin hesap oluştur/rol değiştir; son admin koruması.
- `db.json` indir → eklentiye elle yükle → doğrulanır.
- Klavye ile tüm akış; görünür odak; ekran okuyucu etiketleri.
- Renk kontrastı ve `prefers-reduced-motion`.

### Mağaza/eklenti

- Site `db.json` çıktısı gerçek eklentiye yüklenir.
- Eklentinin gizlilik metni site metninden ayrı kalır.
- Site yayını mağaza yüklemesini engellemez; site ayrı iş parçasıdır.

## 14. İkon ve marka

- Yön: kırmızı-beyaz kalkan; üstü kavisli/logaritmik sivrilen; çapraz iki beyaz çeyrek; şeffaf zemin; büyük kalkan; açık kırmızı gövde; ince koyu kırmızı kenar.
- 128×128 mağaza ikonunda 96×96 görsel + 16 px şeffaf çerçeve korunur.
- Uzantı ikonları 16/32/48/128; site favicon ve header aynı işareti kullanır.
- Üretim: `scripts/ikon-uret.js` ile 4x süper örnekleme; ayrıca SVG kaynak (`site/public/kalkan.svg`) tutulur.
- Kontrol: 16 px’te okunurluk, şeffaf zeminde kirli kenar olmaması, mağaza formunda doğru görünüm.
- İkon çalışması **canvas-design** becerisiyle, site tasarımıyla aynı palet kullanılarak yapılır; mevcut ikonun birebir kopyası değil, arıtılmış sürümü olur.

## 15. Uygulama sırası (öneri)

1. **S1 — Tasarım sistemi + kamusal iskelet:** tokenlar, fontlar, header/footer, ana sayfa, keşfet, boş durumlar, ikon.
2. **S2 — İçerik + oy:** içerik sayfası, oy tablosu, sonuç paneli, oy API’si, anonim çerez, hız sınırı, ziyaretçi geri alma.
3. **S3 — Link/talep:** link çözme, metadata resolver, kayıtsız link, talep API’si.
4. **S4 — Oturum + editör:** giriş, oturum, panel, kayıt ekleme, talep kuyruğu.
5. **S5 — Moderasyon:** iki ayrı geri alma durumu, kilit, çerez/ağ engelleme, engel listesi, gerekçe, kayıtlar.
6. **S6 — Admin + yayın:** çok admin ve son admin koruması, arşivleme/geri getirme, içerik düzenleme, `db.json` önizleme/yayın, indirme.
7. **S7 — Gizlilik, QA, dokümantasyon:** metinler, erişilebilirlik, tarayıcı testleri, README/PLAN/DEVIR/CHANGELOG.

Her dilim: testler yeşil → `npm run build` → commit → checkpoint etiketi. Push, kullanıcı incelemesinden sonra.

## 16. Kapsam dışı

- Herkese açık ziyaretçi hesabı, e-posta doğrulama, kendi kendine parola sıfırlama.
- Eklentiden siteye otomatik veri gönderme veya “Bildir” uç noktası.
- Yapay zekâ ile otomatik etiketleme.
- Analitik, reklam, üçüncü taraf izleme.
- Mobil uygulama.
- Taksonomiye site üzerinden yeni kimlik ekleme (eklenti sürümü gerekir).
- İçeriği kalıcı silme (arşivleme kullanılır).
- Video eklenince otomatik kanal kaydı oluşturma.
- Ham IP veya tam çerez kimliğinin panelde gösterilmesi.
- E-posta gönderimi (davetler admin tarafından elle iletilir).

## 17. Kabul ölçütleri

- [ ] Ana sayfa, keşfet, içerik, giriş, panel, admin sayfaları çalışır; mobil ve masaüstünde taşma yok.
- [ ] Anonim oy: tek oy, değiştirme, ziyaretçi geri alma/yeniden oy, 3 oy eşiği, beraberlik ve kararsız kuralları doğru.
- [ ] Moderasyon geri alması kalıcı; tek oy / çerezin kayıt oyları / çerezin site oyları çalışır.
- [ ] Çerez/ağ engeli aktifken oylar sayılmaz; engel kaldırılınca geri gelir; `/panel/engeller` çalışır.
- [ ] Kayıtsız link talebi oluşturulur; editör kabul/red eder.
- [ ] Editör kayıt ekler; metadata (başlık/avatar) gelir veya zarif fallback gösterir.
- [ ] Editör oy geri alır, kilitler/açar, çerez/ağ engeller; gerekçe zorunlu; moderasyon kaydı oluşur.
- [ ] Admin hesap oluşturur/rol yönetir; son admin korunur; admin kendi hesabını pasifleştiremez veya rolünü düşüremez.
- [ ] Admin içeriği arşivler/geri getirir; arşivli kayıt kamusal ve `db.json` dışında kalır, oylar korunur.
- [ ] Video eklemek kanal kaydı oluşturmaz; kanal ayrıca eklenir.
- [ ] Admin `db.json` önizler, doğrular, yayınlar.
- [ ] Yayınlanan `db.json` eklentinin `dbKur` doğrulayıcısından geçer.
- [ ] Oturum/CSRF/yetki kontrolleri; ham IP, tam IP özeti ve tam çerez kimliği kamusal veya panel yanıtlarında yok; yalnızca kısa takma etiketler var.
- [ ] Gizlilik ve koşullar sayfaları yayında; eklenti gizlilik metni ayrı.
- [ ] Klavye, odak, kontrast ve `prefers-reduced-motion` kontrolleri geçer.
- [ ] Fontlar yerel dosyalardan yüklenir; çalışma anında üçüncü taraf font isteği yok.
- [ ] 1280×800 ekran görüntüleri alınır; gerçek tarayıcı QA tamamlanır.
- [ ] İkon 16 px’te okunur; 128×128 mağaza dosyası şeffaf çerçeveli.
- [ ] Tüm testler ve `npm run build` yeşil; her dilim commit + checkpoint.

## 18. Açık noktalar ve varsayımlar

**Kapatılan kararlar (2026-10-27):** Moderasyon görünürlüğü takma adlı satırlar; ziyaretçi ve moderasyon geri alması ayrı; çok admin + son admin koruması; içerik arşivleme; video eklemenin kanal kaydı oluşturmaması. Bu beş karar kullanıcı tarafından seçildi.

Aşağıdakiler kullanıcı onayı gerektirmeyen, belge içinde **öneri** olarak işaretlenmiş kararlardır; itiraz gelirse değişir:

- **Alan adı:** `SITE_DOMAIN` ortam değişkeni; varsayılan `localhost`. Gerçek alan adı kullanıcı tarafından belirlenecek.
- **YouTube API anahtarı:** opsiyonel; yoksa HTML/oEmbed fallback. Kota uyarısı gösterilir.
- **IP özeti saklama:** Oy kayıtlarında 30 gün; aktif engel kaydında engel süresince. Hukuki metin uzman incelemesinden geçmeli; bu belge hukuki görüş değildir.
- **Editör daveti:** admin geçici parola oluşturur, güvenli kanaldan iletir; ilk girişte değiştirilir.
- **Taksonomi:** salt okunur; yeni kimlik eklenti sürümüyle gelir.
- **Yayın onayı:** yalnızca admin.
- **E-posta gönderimi:** yok; iletişim GitHub Issues.
- **Rapor/Bildir:** site içi ayrı form bu sürümde yok; iletişim sayfası ve moderasyon notu var. Eklenti “Bildir” akışı ayrı ve pasif kalır.
- **Demo veri:** yalnızca geliştirme/test ortamında; üretimde otomatik seed yok.

## 19. Onay sorusu

2026-10-27 builder-check soruları yanıtlandı ve beş karar belgeye işlendi:

1. Moderasyon ekranında yalnızca kısa takma etiketler görünür; tam çerez/IP kimliği yok.
2. Ziyaretçi geri alması geçici ve yeniden oylanabilir; editör geri alması kalıcı.
3. Birden fazla admin olabilir; son aktif admin korunur.
4. İçerik kalıcı silinmez, arşivlenir; oylar korunur.
5. Video eklemek kanal kaydı oluşturmaz; kanal ayrıca eklenir.

Bu tasarım uygulanmaya hazır mı? Onaylarsan sıradaki adım, uygulama planını yazmak ve S1 diliminden başlamak olacak.
