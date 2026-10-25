# YouTube Filtreleyici 🛡️ (Cross-Browser: Chromium & Firefox)

YouTube içeriklerini filtrelemek, video ve kanal bazlı istisnalar tanımlamak, PIN koruması ile ayarları güvenceye almak ve dikkati dağıtan öğeleri (Shorts, yorumlar, önerilenler vb.) gizlemek için geliştirilmiş **çoklu tarayıcı (Chromium & Firefox)** eklentisidir.

---

## 📁 Proje Mimarisi ve Dizin Yapısı

Proje, **Tek Gerçek Kaynak (Single Source of Truth)** mimarisine göre yapılandırılmıştır. Tüm iş mantığı ve arayüz `src/` klasöründe geliştirilir; `scripts/build.js` betiği bu kodları tarayıcıya özel manifestlerle harmanlayarak doğrudan yüklenebilir `chromium/` ve `firefox/` klasörlerine senkronize eder.

```text
YT_Filter/
├── src/                          # Ortak Kaynak Kodlar (Tek Gerçek Kaynak)
│   ├── background.js             # Kurulum, veritabanı yükleme ve ayar taşıma servisi
│   ├── filtre_motoru.js          # Serbest/orta/katı karar algoritması (saf fonksiyonlar)
│   ├── content.js                # YouTube DOM denetleyicisi, filtreleme & rozetleme
│   ├── inject_helper.js          # YouTube dahili nesnelerine erişen MAIN world yardımcısı
│   ├── inject.css                # Filtre ve rozet CSS stilleri
│   ├── options.html/.js/.css     # Karşılama, filtre, liste, PIN ve sistem arayüzü
│   └── data/veritabani.json      # Store'dan dışa aktarılan konu/etiket veritabanı
│
├── manifests/                    # Tarayıcıya Özel Manifest V3 Tanımları
│   ├── manifest.chromium.json    # Chromium MV3 (Service Worker, Web Accessible Resources)
│   └── manifest.firefox.json     # Firefox MV3 (Gecko ID, Background Scripts)
│
├── chromium/                     # Chromium için doğrudan yüklenebilir eklenti klasörü
├── firefox/                      # Firefox için doğrudan yüklenebilir eklenti klasörü
│
├── scripts/
│   ├── build.js                  # Bağımsız, hızlı Node.js derleme ve senkronizasyon aracı
│   └── db-import.js              # Store dışa aktarımını doğrulayıp içe aktarır
│
├── tests/                        # node:test birim testleri
├── store/                        # Editör sitesi: YouTube Filter Store (Docker)
├── docs/
│   ├── SPESIFIKASYON.md          # Konu/etiket, modlar ve algoritma kuralları
│   └── veritabani-semasi.md      # Store ↔ eklenti JSON sözleşmesi
├── package.json                  # Proje ve derleme komutları
└── README.md
```

---

## 🚀 Kurulum ve Tarayıcıda Test Etme

### 1. Firefox'ta Test Etme (Mozilla Firefox / Developer Edition / Nightly)

1. Firefox tarayıcınızın adres çubuğuna `about:debugging#/runtime/this-firefox` yazın ve Enter'a basın.
2. Sağ üstte yer alan **"Geçici Eklenti Yükle..." (Load Temporary Add-on)** butonuna tıklayın.
3. Proje dizinindeki `firefox/manifest.json` dosyasını seçip açın.
4. Eklenti hemen aktif hale gelecektir. Araç çubuğundaki eklenti simgesine tıklayarak ayarları açabilirsiniz.

### 2. Chromium'da Test Etme (Google Chrome, Brave, Edge, Opera)

1. Tarayıcınızın adres çubuğuna `chrome://extensions` yazın ve Enter'a basın.
2. Sağ üst köşedeki **"Geliştirici Modu" (Developer Mode)** seçeneğini açın.
3. Sol üstteki **"Paketlenmemiş öğe yükle" (Load unpacked)** butonuna tıklayın.
4. Proje dizinindeki `chromium/` klasörünü seçin.
5. Eklenti yüklenecek ve YouTube sayfalarında anında çalışmaya başlayacaktır.

---

## 💻 Geliştirme ve Derleme Komutları

Geliştirme yaparken dosyaları **yalnızca `src/` veya `manifests/`** klasörlerinde düzenleyin. Yaptığınız değişiklikleri `chromium/` ve `firefox/` klasörlerine aktarmak için aşağıdaki komutları kullanabilirsiniz:

```bash
# Her iki tarayıcı sürümünü de anında derle ve senkronize et
npm run build

# Yalnızca Chromium klasörünü güncelle
npm run build:chromium

# Yalnızca Firefox klasörünü güncelle
npm run build:firefox

# Canlı izleme modu (src/ veya manifests/ değiştiğinde otomatik senkronize eder)
npm run watch

# Birim testleri (filtre motoru ve veritabanı içe aktarma)
npm test
```

### Veritabanı Güncelleme (Aylık)

Eklenti hiçbir sunucuya bağlanmaz. Konu/etiket verisi, editörlerin Store sitesinde (`store/`) birlikte oyladığı veritabanından gelir:

1. Store yönetim panelinden veritabanını **JSON olarak dışa aktarın**.
2. Dosyayı içe aktarın. Şema doğrulanır, eski sürüm reddedilir ve değişiklik özeti yazılır:
   ```bash
   npm run db:import -- indirilen-dosya.json
   ```
3. `npm run build` ile tarayıcı klasörlerini güncelleyip yeni eklenti sürümünü yayınlayın. Eklenti güncellendiğinde yeni veritabanı otomatik yüklenir.

> **Not:** Derleme betiği sıfır harici bağımlılık (`zero dependency`) ile saf Node.js kullanır. Herhangi bir ağır `node_modules` paketine ihtiyaç duymaz, milisaniyeler içinde tamamlanır.

---

## ✨ Temel Özellikler

- 🎚️ **Üç Filtreleme Modu:** Serbest, Orta ve Katı. Kurallar için [docs/SPESIFIKASYON.md](docs/SPESIFIKASYON.md).
- 🏷️ **Konu ve Etiket Filtresi:**
  - 15 varsayılan konu (Ders/Okul, Bilim, Oyun, Spor…) ve 8 etiket (Küfür, Şiddet, Kumar, AI ile üretilmiş…).
  - Her konu ve etiket için filtre düğmesi ve engelleme biçimi: **Gizle**, **Bulanıklaştır** veya **Uyarı sayfası**.
  - Engellenen bir etiket, mod ne olursa olsun içeriği engeller.
- ❔ **Bilinmeyen ve Kararsız İçerikler:** Orta modda bilinmeyen/kararsız konu ve etiketler için ayrı ayrı izin ver/engelle seçimi.
- 📺 **Kanal Kontrolü:** Video hakkında veri yoksa kanalın konu ve etiketlerine bakılır (kapatılabilir).
- ✅ **Beyaz ve Kara Liste:** Kanal handle'ı (`@kanaladi`), Video ID'si veya YouTube linki ile eklenir; filtre kurallarından önce uygulanır.
- 👋 **Karşılama Ekranı:** İlk kurulumda PIN seçimi ve bilinmeyen/kararsız içerik tercihleri.
- 🔒 **PIN Güvenlik Koruması:** Ayarlar ekranı PIN ile korunur. PIN değiştirilebilir veya istenirse koruma devre dışı bırakılabilir.
- 👁️ **Arayüz Temizleme Ayarları:**
  - YouTube Shorts videolarını ve sol menü butonunu gizleme.
  - Yorumlar bölümünü gizleme.
  - Yan paneldeki önerilen videoları gizleme.
  - Küçük resim (thumbnail) üstüne gelince otomatik önizleme oynatmasını engelleme.
- 🌓 **Koyu / Açık Tema Desteği:** Ayarlar panelinde anlık tema geçişi.
- 💾 **Yedekleme ve İçe/Dışa Aktarma:** Tüm ayarları ve özel eşleştirmeleri tek tıkla `JSON` formatında dışa aktarma ve geri yükleme.
- 🌐 **İçerik İçi ve Dış Arama Koruması:** YouTube ana sayfası, arama sonuçları, kanal sayfaları, video oynatma sayfası ve harici iframe/embed oynatıcılar üzerinde tam denetim.

---

## 📜 Lisans

Bu proje [Apache License 2.0](LICENSE) ile lisanslanmıştır.
