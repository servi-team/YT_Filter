# YouTube Filtreleyici — Plan

> Canlı belge. Her PR bittiğinde "Durum" tablosu güncellenir; kararlar netleşince "Karar bekleyen konular"dan `docs/DEVIR_NOTU.md` bölüm 5'e taşınır.
> Son güncelleme: 2026-10-17 (PR 5 teslim)

## 1. Hedef

Teknik bilgisi olmayan kullanıcıların kullanabileceği, **konu + etiket tabanlı** bir YouTube filtresi:

1. **Eklenti:** içeriği veritabanındaki konu/etiket kayıtlarına ve kullanıcının politikasına göre filtreler (tamamen yerelde).
2. **Düzenleme sitesi:** editörler kanal/video başına konu ve etiket girer; ziyaretçi güncel JSON'u indirir ve rapor gönderir.
3. **Dağıtım:** veritabanı aylık güncellemelerle eklenti paketiyle gelir (Chrome Web Mağazası); Firefox desteği korunur.

## 2. Durum

| PR | Konu | Durum |
|---|---|---|
| 1 | Zemin: tek karar noktası, helper'a kanal ID'si, tanılama | ✅ tamam, doğrulandı |
| 2 | Çekirdek: taxonomy / decision / migrate + testler | ✅ tamam, testler geçti |
| 3 | Motoru eklentiye bağlama, `db.json` sözleşmesi, manifest | ✅ teslim edildi; testler geçti; **tarayıcıda davranış kontrolü bekliyor** |
| 4 | Arayüz: Filtre sekmesi, listeler, ilk açılış seçimi, kalıcı geçiş | ✅ tamam, doğrulandı (turuncu kart, sekme 1-2) |
| 5 | Çerçeve düzetmesi + etiket başına eylem | ✅ tamam, doğrulandı |
| 6 | Engel sayfası (tam sayfa banner) | ⏳ |
| 7 | İçe/dışa aktarma: çakışma diyaloğu, veritabanı JSON'u içe aktarma | ⏳ |
| 8 | Sağlamlaştırma ve mağaza hazırlığı | ⏳ |
| S | Düzenleme sitesi | ⏳ (şema donduğu için paralel başlayabilir) |

### PR 6 elle test listesi (sonraki adımdan önce)
1. Engelli bir kanal/video sayfasına git — tam sayfa banner görünüyor mu?
2. Banner'da sebep doğru yazıyor mu? (liste adı, konu, etiket)
3. **Geri dön** butonu tarayıcı geçmişine dönüyor mu?
4. **İstisna olarak beyaz listeye ekle** butonu tıklanınca sayfa anında açılıyor mu?
5. Video izleme sayfasında da aynı banner çalışıyor mu?

## 3. Mantık çerçevesi: üç katman

**Sorun:** Hızlı ekleme düğmesi ve "Kanal/Video Ekle" alanı yalnızca beyaz/kara/özel liste sunuyor. Kullanıcı hep listeye ekleyerek ilerlerse konular ve etiketler hiç devreye girmiyor; sistemin asıl değeri (veritabanı) atlanıyor.

**Çözüm:** Listeler *asıl mekanizma değil, istisnadır*. Üç katman:

| Katman | Kim belirler | Ne için | Nerede |
|---|---|---|---|
| **1. Kural** | Kullanıcı | Genel politika: mod, hangi konulara izin, hangi etiket engellenecek (ve nasıl) | **Filtre** sekmesi |
| **2. Veri** | Editörler + raporlar | Hangi içerik hangi konu/etiketle işaretli | `db.json` (kullanıcı değiştiremez) |
| **3. İstisna** | Kullanıcı | Tek tek kanal/video için "kuralı yok say" | **Listeler** sekmesi, hızlı ekleme |

**İlke:** *Önce kural çalışır. Liste, kuralın yanlış kaldığı yerde istisnadır; istisna her zaman kuralı geçer.*

### Arayüze etkisi (PR 5)
1. **Hızlı ekleme bandı önce kararı ve sebebini gösterir:** "Şu an: ENGELLENİYOR — Konu: Oyun (engelli)" / "Etiketlenmemiş içerik". Sonra istisna seçenekleri: **Her zaman izin ver / Her zaman engelle**. Bu, konu ve etiketleri kullanıcının gözü önüne geri getirir. (Pop-up, sayfadaki kanal/video bilgisini içerik betiğinden mesajla ister.)
2. **Yanlış etiket olabilir mi?** → "Bildir" düğmesi (site hazır olana kadar pasif/gizli). Veritabanının düzelmesi istisnadan daha kalıcı bir çözümdür.
3. **Listeler sekmesi "İstisnalar"** diye adlandırılır; açıklaması "kuralları geçersiz kılar" der. Beyaz liste = "Her zaman izin ver", Kara liste = "Her zaman engelle". (Spec'teki adlar parantezle korunur.)
4. **Çok istisna uyarısı:** liste ~50 kaydı geçerse "Çok istisnanız var; kuralları gözden geçirin veya yanlış etiketleri bildirin."
5. Etiketlenmemiş içerikte kullanıcının elinde yalnızca istisna olduğu için orada beyaz liste doğal yoldur; bilgi metni bunu söyler.

### Açık nokta: özel listelerin anlamı
Spec özel listeler olduğunu ve adlarının benzersiz olması gerektiğini söylüyor; ne yaptıklarını söylemiyor. Şu an: beyaz/kara liste gücünde "istisna grubu" (eylem: engelle / izin ver).
Alternatif: özel liste = kullanıcının **kendi konusu** (ör. "Ders kanalları"); kanalları ona ekler ve mod kurallarına tabi izinli/engelli olur.
**Öneri:** şimdilik istisna grubu olarak kalsın (basit, anlaşılır, kural-katmanıyla çakışmaz); gerçek kullanım görülünce yeniden bakılır.

## 4. Karar bekleyen konular

### 4.1 Etiket başına eylem — ✅ KARAR VERİLDİ (PR 5)
`ayar.etiketler[id]` ∈ `izinli | bulaniklastir | kaldir`. Konular ikili kaldı. En sert sebep kazanır. Eski `engelli` → `engelEylemi`'ne çevrilir. Konulara eylem verilmedi (hayır kararı). Bkz. `DEVIR_NOTU.md` bölüm 5, madde 11.

### 4.2 Diğer
- Orta modda incelenmemiş video: kanalın ana konusunun da izinli olması şartı (bugünkü varsayım) kalsın mı, spec'i harfiyen mi izleyelim?
- Beyaz liste, veritabanındaki "kumar" etiketli kanalı bile açar (tasarım gereği "asla engellenmez"). Kabul mü, yoksa etiket-bazlı koruma ("ebeveyn kilidi") ayrı bir ayar mı olsun?

## 5. Yol haritası

### PR 5 — Çerçeve düzeltmesi + etiket başına eylem
- Şema: `etiketler` üç durumlu; `ayarTemizle` eski `engelli`'yi çevirir; `migrate` etkilenmez.
- `engine.icerikKarari`: nihai eylem = en sert sebep; `rozetBilgisi` buna uyar.
- `content.js`: kart/oynatıcı bazında kaldır ya da bulanıklaştır (izleme sayfasında bulanıklaştırma zaten var).
- Arayüz: etiket satırlarında 3'lü seçim; "İstisnalar" adlandırması; hızlı ekleme bandında karar+sebep; çok-istisna uyarısı.
- Pop-up ↔ içerik betiği mesajlaşması (aktif sayfanın video/kanal ID'si).
- Testler: en sert sebep kuralı, eski `engelli` uyumu, rozet metinleri, arayüz smoke.
- **Kabul:** "Şiddet = bulanık, Kumar = kaldır" ayarında karışık sayfada her kart doğru görünüyor; eski kullanıcı verisi bozulmuyor.

### PR 6 — Engel sayfası
- Engelli kanal/video açılınca tam sayfa banner: "Bu şu sebeplerle engellendi: …" (sebepler: liste adı, konu, etiket).
- Butonlar: **Geri dön**, **İstisna olarak beyaz listeye ekle** (içerik betiği doğrudan `storage`'a yazar).
- Videolar için aynısı (izleme sayfasında oynatıcı yerine).
- **Kabul:** kullanıcı her engelin sebebini görebiliyor; beyaz listeye ekleyince sayfa anında açılıyor.

### PR 7 — İçe/dışa aktarma
- Liste içe aktarırken ad çakışması: **üzerine yaz / yeniden adlandır / birleştir**.
- Siteden indirilen `db.json`'u içe aktarma (`dbOverride`, `veriSurumu` kontrolü, hatalı kayıt sayısı gösterimi).
- Liste dışa aktarma (tek liste / hepsi).
- **Kabul:** aynı adlı liste hiçbir yolla ikiye çıkmıyor; bozuk dosya veriyi bozmuyor.

### PR 8 — Sağlamlaştırma ve yayın hazırlığı
- Manifest açıklaması düzelt ("otomatik senkronizasyon" yok), izinleri daralt (`google.com` ihtiyacı gözden geçir), Firefox `strict_min_version`/MAIN world testi.
- Performans: `yt-navigate-finish` ile yoklamanın azaltılması; veritabanı önbelleği (büyürse); helper özniteliklerinin izlenmesi.
- Kanal adı/avatarını kullanıcı listelerinde göstermek (kullanıcı eklerken sayfadan toplama).
- Arayüz smoke testlerinin repoya alınması (`tests/smoke/`, jsdom devDependency).
- PIN: düz metin yerine karma saklama (hâlâ yalnızca arayüz kilidi olduğu belgelenir).
- Mağaza: gizlilik metni, ekran görüntüleri, sürüm akışı.

### Düzenleme sitesi (S) — `db.json` şeması dondu, paralel başlayabilir
- **S0 — Prototip (önce):** link yapıştırınca kanal adı/avatar/ID'nin API'siz alınması (video: `oembed`; kanal sayfası: HTML meta). Kırılganlık ölçülür.
- **S1 — Teknoloji ve barındırma kararı** (C#/ASP.NET Core MVC aday; SQLite; Docker). Karar: Talha.
- **S2 — İskelet:** admin/editör hesapları (admin elle ekler), giriş.
- **S3 — Editör ekranı:** adres çubuğuna link → varsa mevcut konu/etiketler seçili gelir → 1 ana konu (zorunlu), yan konular, etiketler; mevcut kaydı tekrar eklemez.
- **S4 — Dışa aktarma:** `docs/db-sema.md` sema 1 çıktısı; `veriSurumu` otomatik artar; eklentiye `db.json` olarak girer.
- **S5 — Ziyaretçi:** girişsiz JSON indirme; konu/etiket öneri-rapor formu.
- **S6 — Yayın:** Docker, yedekleme, rapor kuyruğu.

## 6. Riskler

| Risk | Etki | Önlem |
|---|---|---|
| YouTube kart yapısı değişir | Helper kanal/video ID'sini bulamaz | DOM link yedeği var; `__ytFilterDiag()`; derin arama |
| Veritabanı boş/küçük başlar | Çoğu içerik "etiketlenmemiş" | İlk açılışta seçim + bilgilendirme; hızlı istisna; rapor akışı |
| Çok istisna eklenir | Konu/etiket sistemi atlanır | Çerçeve (üç katman), uyarı, bildirim düğmesi |
| Şema değişikliği geç gelir | Kullanıcı verisi geçişi pahalı | Şema kararlarını (4.1) PR 5'in başında kapat |
| Tek geliştirici | Süreklilik | Bu belge, `DEVIR_NOTU.md`, testler |

## 7. Plan.md güncelleme düzeni
- Her PR teslim edilince 2. bölüm (Durum) güncellenir.
- Bir karar verilince 4. bölümden çıkar, `DEVIR_NOTU.md` bölüm 5'e gerekçesiyle eklenir.
- Yeni risk/iş çıkarsa 5. ve 6. bölüme eklenir.
