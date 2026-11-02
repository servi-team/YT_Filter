# Site QA — YouTube Filter Store

Tarih: 2026-10-27
Kapsam: Site v1 (anonim oy, keşfet, içerik, editör paneli, admin, arşiv, `db.json` yayını, gizlilik/koşullar/iletişim, hata sayfaları).
Not: Bu dosyadaki manuel satırlar **önceden işaretlenmez**. Task 30 yalnızca otomatik sonuç satırlarını doldurur.

## 1. Kapsam ve sınır

Otomatik testler şunları kapsar:

- `npm test` ile anonim oy, tek oy sahibi, geri alma, kilit, engel, arşiv, yayın, `db.json` rotası, oturum/yetki ve API sözleşmeleri.
- `tests/erisilebilirlik.test.ts` ile `lang="tr"`, atlama bağlantısı, `main#icerik`, `:focus-visible`, `prefers-reduced-motion`, yerel font, görsel `alt`, oy düğmesi `aria-pressed`/`aria-label`, sonuç paneli `aria-live`, onay dialogu, tek `h1` ve pozitif `tabIndex` yokluğu.
- `npm run qa:duman` ile çalışan sunucuda altı kamusal sayfanın HTTP durumu, dili, atlama bağlantısı, ana bölgesi, tek `h1` ve beklenen metinleri; `/db.json` varsa şema kontrolü.

Otomatik testlerin kapsamadığı, bu dosyada manuel kontrol edilecek alanlar:

- Gerçek tarayıcıda 1280×800 ve 390×844 görsel/etkileşim kontrolü.
- Ekran okuyucu (NVDA/VoiceOver) ile okuma sırası ve duyuru kontrolü.
- Renk kontrastının DevTools ile ölçülmesi, koyu tema ve hareket azaltma.
- Uçtan uca iş akışlarının gerçek oturumlarla denenmesi.
- Docker/PostgreSQL üretim denemesi, gerçek eklentiye `db.json` yükleme ve mağaza yüklemesi.
- Ekran görüntülerinin alınması ve repoya eklenip eklenmeyeceği kararı.

Bu sayılan manuel işler kullanıcıya aittir; otomatik testlerin yeşil olması bunların yerini tutmaz.

## 2. Komutlar

Site dizininde:

```powershell
cd site
npm test
npm run tip
npm run build
```

Ayrı bir terminalde geliştirme sunucusu:

```powershell
cd site
npm run dev
```

Başka bir terminalde HTTP dumanı:

```powershell
cd site
npm run qa:duman
```

Farklı bir adres veya port için PowerShell:

```powershell
cd site
$env:BASE_URL = 'http://localhost:3000'
npm run qa:duman
```

Beklenen çıktılar:

- `npm test` → `tüm test dosyaları geçti` ve test sayısı; FAIL yok.
- `npm run tip` → çıktı yok, çıkış kodu 0.
- `npm run build` → `Compiled successfully`; rotalar listelenir.
- `npm run qa:duman` → `QA dumanı geçti: 6 sayfa + /db.json (...)`.
- Yayın yoksa `/db.json` için `Bilgi: /db.json henüz yayınlanmamış (404).` yazar; bu bir hata değildir.

### 2.1 Otomatik sonuçlar (2026-11-02)

| Tarih | Komut | Sonuç |
|---|---|---|
| 2026-11-02 | `cd site; npm test` | 31/31 test dosyası, 96 test geçti (41,0 sn) |
| 2026-11-02 | `cd site; npm run tip` | Hata yok (çıkış 0) |
| 2026-11-02 | `cd site; npm run build` | Başarılı; rotalar listelendi (çıkış 0) |
| 2026-11-02 | `cd site; npm run qa:duman` | Geçti: 6 sayfa + `/db.json` (`http://localhost:3107`); `/db.json` 404 bilgi |
| 2026-11-02 | Depo kökü `npm test` | 121/121 test geçti (eklenti testleri; `tests/**/*.test.js`) |
| 2026-11-02 | Depo kökü `npm run build:check` | Chromium ve Firefox güncel; “Tüm çıktılar güncel” |

## 3. 1280×800 masaüstü kontrolü

Her satır için üç kutu da manuel doldurulur. Yönetici sayfaları admin oturumuyla açılır.

| Sayfa | Yatay taşma yok | Başlık ve odak doğru | Boş durum anlaşılır |
|---|---|---|---|
| `/` | [ ] | [ ] | [ ] |
| `/kesfet` | [ ] | [ ] | [ ] |
| Bir kanal sayfası `/icerik/kanal/...` | [ ] | [ ] | [ ] |
| Bir video sayfası `/icerik/video/...` | [ ] | [ ] | [ ] |
| `/giris` | [ ] | [ ] | [ ] |
| `/panel` | [ ] | [ ] | [ ] |
| `/panel/icerikler` | [ ] | [ ] | [ ] |
| `/panel/moderasyon` | [ ] | [ ] | [ ] |
| `/panel/engeller` | [ ] | [ ] | [ ] |
| `/admin` | [ ] | [ ] | [ ] |
| `/admin/hesaplar` | [ ] | [ ] | [ ] |
| `/admin/icerikler` | [ ] | [ ] | [ ] |
| `/admin/yayinlar` | [ ] | [ ] | [ ] |
| `/gizlilik` | [ ] | [ ] | [ ] |
| `/kosullar` | [ ] | [ ] | [ ] |
| `/iletisim` | [ ] | [ ] | [ ] |
| 404 (olmayan bir adres) | [ ] | [ ] | [ ] |

Ek kontroller:

- [ ] Uzun başlık ve uzun `db.json` JSON önizlemesi tabloyu yatay taşırmıyor.
- [ ] Tablolar, formlar ve düğmeler görsel hiyerarşiyle hizalı.
- [ ] Klavye odağı görünür ve beklenen öğeye gidiyor.

## 4. 390×844 mobil kontrolü

Aynı sayfalar mobil genişlikte açılır. Yönetici sayfaları admin oturumuyla denenir.

| Sayfa | Yatay taşma yok | Kart/menü düzeni doğru | 44 px dokunma hedefi |
|---|---|---|---|
| `/` | [ ] | [ ] | [ ] |
| `/kesfet` | [ ] | [ ] | [ ] |
| Bir kanal sayfası `/icerik/kanal/...` | [ ] | [ ] | [ ] |
| Bir video sayfası `/icerik/video/...` | [ ] | [ ] | [ ] |
| `/giris` | [ ] | [ ] | [ ] |
| `/panel` | [ ] | [ ] | [ ] |
| `/panel/icerikler` | [ ] | [ ] | [ ] |
| `/panel/moderasyon` | [ ] | [ ] | [ ] |
| `/panel/engeller` | [ ] | [ ] | [ ] |
| `/admin` | [ ] | [ ] | [ ] |
| `/admin/hesaplar` | [ ] | [ ] | [ ] |
| `/admin/icerikler` | [ ] | [ ] | [ ] |
| `/admin/yayinlar` | [ ] | [ ] | [ ] |
| `/gizlilik` | [ ] | [ ] | [ ] |
| `/kosullar` | [ ] | [ ] | [ ] |
| `/iletisim` | [ ] | [ ] | [ ] |
| 404 (olmayan bir adres) | [ ] | [ ] | [ ] |

Ek kontroller:

- [ ] Panel ve admin tabloları dar ekranda kart satırlarına dönüşüyor; yatay kaydırma yalnızca gereken yerde.
- [ ] Panel ve admin menüleri yatay kaydırılabiliyor; aktif bağlantı görünür.
- [ ] Oy sonucu paneli mobilde içeriğin üstünde özetleniyor.
- [ ] Düğmeler, bağlantılar ve form alanları en az 44 px dokunma hedefi sunuyor.
- [ ] Uzun e-posta, başlık ve URL metinleri taşmadan kırılıyor.

## 5. Klavye

- [ ] İlk `Tab` basışında “İçeriğe geç” bağlantısı görünür ve `Enter` doğrudan `main#icerik` bölgesine gider.
- [ ] Tüm etkileşimli öğelerde `:focus-visible` halkası görünür; odak kaybolmaz.
- [ ] Sekme sırası görsel okuma sırasıyla uyumlu.
- [ ] Dialog açıldığında odak dialog içine girer; `Escape` dialogu kapatır ve odak tetikleyiciye döner.
- [ ] `OnayDiyalogu` dışında klavye tuzağı yok.
- [ ] Oy düğmeleri `aria-pressed` durumunu klavyeyle değiştirir.
- [ ] Form gönderimleri `Enter` ile çalışır; yalnızca fareye bağlı eylem yok.

## 6. Ekran okuyucu

- [ ] Her sayfada tek `h1` var; başlık sayfanın amacını söylüyor.
- [ ] `header`, `nav`, `main`, `footer` landmark’ları anlamlı ve tekil.
- [ ] Form alanlarının görünür etiketi ve erişilebilir adı var; ipucu/hata ilişkisi doğru.
- [ ] Hata ve başarı bildirimleri `aria-live` ile duyuruluyor; ani odak çalınmıyor.
- [ ] İçerik görsellerinde anlamlı `alt`; dekoratif görsellerde boş `alt`.
- [ ] İkon düğmelerin erişilebilir adı var; yalnızca ikon okunmuyor.
- [ ] Tablo başlıkları `th` ve kapsamları doğru; okuma sırası mantıklı.
- [ ] “İçeriğe geç” bağlantısı ekran okuyucuda ilk öğe olarak duyuluyor.

## 7. Kontrast ve hareket

- [ ] DevTools kontrast denetiminde normal metin en az 4.5:1, büyük metin en az 3:1.
- [ ] Düğme, bağlantı, odak halkası ve hata metni arka plandan ayırt edilebilir.
- [ ] Açık ve koyu temada (`prefers-color-scheme`) renkler okunabilir; kaybolan kenarlık yok.
- [ ] `prefers-reduced-motion: reduce` açıkken animasyon ve geçişler duruyor.
- [ ] Otomatik oynayan, parlayan veya sürekli hareket eden öğe yok.
- [ ] Sayfa 200% yakınlaştırmada yatay kaydırma gerektirmeden okunuyor.

## 8. Uçtan uca akışlar

- [ ] Anonim oy ver → oyu değiştir → geri al → aynı çerezle yeniden oy ver.
- [ ] Oy vermeden önce ve sonra sonuç paneli doğru güncelleniyor; eşik altı metni doğru.
- [ ] Kayıtsız video/kanal linki → talep oluştur → aynı link için ikinci talep sayacı artırıyor.
- [ ] Editör talebi kabul ediyor → kayıt keşfette görünüyor; reddedilen talep yeniden işlenemiyor.
- [ ] Editör gerekçeyle kilitliyor → sonuç donuyor; kilit açılınca güncel oylara dönüyor.
- [ ] Ziyaretçi geri alması geçici; moderasyon geri alması kalıcı ve panelde görünüyor.
- [ ] Çerez engeli ve ağ engeli oy sayımını düşürüyor, yeni oyu reddediyor; kaldırınca eski oy geri geliyor.
- [ ] Admin kaydı gerekçeyle arşivliyor → keşfet, içerik URL’si ve yeni `db.json` dışında; oylar/kilit korunuyor; geri getirme eski durumu döndürüyor.
- [ ] İkinci admin açılıyor; kendi hesabını düşürme/pasifleştirme 409; son aktif admin korunuyor.
- [ ] `/admin/yayinlar` önizleme → yayınla → `/db.json` iniyor; eski sürüm `?surum=N` ile değişmeden iniyor.
- [ ] İndirilen `db.json` gerçek eklentiye yükleniyor ve eklenti veriyi okuyor (kullanıcı doğrulaması).
- [ ] Mağaza paketleme/yükleme akışı deneniyor (kullanıcı doğrulaması).

## 9. Gizlilik ve ağ

- [ ] DevTools → Network’te üçüncü taraf font, analitik, reklam veya izleme isteği yok.
- [ ] Sayfa kaynağında ve ağ yanıtlarında `tarayici_id`, `ip_ozeti` veya `gizli-cerez` gibi ham kimlik alanı yok.
- [ ] Panel ve admin HTML’inde tam çerez kimliği, tam IP özeti veya ham IP yok; yalnızca `çerez:xxxxxxxx` / `ağ:xxxxxxxx` takma etiketleri var.
- [ ] Çerezler `HttpOnly`/`SameSite`/`Secure` ayarları üretim ortamına uygun; oturum çerezi yalnızca oturum açan kullanıcıda.
- [ ] `/gizlilik` metni yalnızca siteyi kapsıyor; eklenti gizlilik metni ayrı belgede.
- [ ] Hata sayfaları ve loglar parola, çerez değeri veya ham IP yazdırmıyor.

## 10. Ekran görüntüleri

Dosya adları `docs/qa/2026-10-27/` altında tutulur. Ekran görüntülerini repoya eklemek kullanıcı kararıdır.

| Sayfa | 1280×800 dosyası | Alındı | 390×844 dosyası | Alındı |
|---|---|---|---|---|
| Ana sayfa | `1280x800-ana.png` | [ ] | `390x844-ana.png` | [ ] |
| Keşfet | `1280x800-kesfet.png` | [ ] | `390x844-kesfet.png` | [ ] |
| Kanal | `1280x800-kanal.png` | [ ] | `390x844-kanal.png` | [ ] |
| Video | `1280x800-video.png` | [ ] | `390x844-video.png` | [ ] |
| Giriş | `1280x800-giris.png` | [ ] | `390x844-giris.png` | [ ] |
| Panel | `1280x800-panel.png` | [ ] | `390x844-panel.png` | [ ] |
| Panel içerikler | `1280x800-panel-icerikler.png` | [ ] | `390x844-panel-icerikler.png` | [ ] |
| Panel moderasyon | `1280x800-panel-moderasyon.png` | [ ] | `390x844-panel-moderasyon.png` | [ ] |
| Panel engeller | `1280x800-panel-engeller.png` | [ ] | `390x844-panel-engeller.png` | [ ] |
| Admin | `1280x800-admin.png` | [ ] | `390x844-admin.png` | [ ] |
| Admin hesaplar | `1280x800-admin-hesaplar.png` | [ ] | `390x844-admin-hesaplar.png` | [ ] |
| Admin içerikler | `1280x800-admin-icerikler.png` | [ ] | `390x844-admin-icerikler.png` | [ ] |
| Admin yayınlar | `1280x800-admin-yayinlar.png` | [ ] | `390x844-admin-yayinlar.png` | [ ] |
| Gizlilik | `1280x800-gizlilik.png` | [ ] | `390x844-gizlilik.png` | [ ] |
| Koşullar | `1280x800-kosullar.png` | [ ] | `390x844-kosullar.png` | [ ] |
| İletişim | `1280x800-iletisim.png` | [ ] | `390x844-iletisim.png` | [ ] |
| 404 | `1280x800-404.png` | [ ] | `390x844-404.png` | [ ] |

## 11. Kapanış

Otomatik sonuç: 2026-11-02 — Site 31/31 dosya / 96 test, tip, build ve QA dumanı geçti; depo kökü 121/121 test ve build:check geçti.

Manuel sonuç: _____________________________________________________________

Açık riskler:

- Docker/PostgreSQL üretim ortamı ve Caddy yapılandırması denenmedi.
- Gerçek eklentiye `db.json` yükleme ve mağaza yüklemesi denenmedi.
- Ekran okuyucu ve gerçek tarayıcı kontrolleri bu oturumda yapılmadı.

İmza / tarih: ____________________________________________________________
