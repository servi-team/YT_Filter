# YT Filter 🛡️ - Akıllı YouTube İçerik Denetleyici

**YT Filter**, YouTube deneyiminizi kişiselleştirmenize ve güvenli hale getirmenize yardımcı olan bir tarayıcı eklentisidir. Özellikle çocuklar ve yetişkinler için istenmeyen içeriklerden uzak durmayı, içeriği kontrol altına almayı hedefler.

## 🎯 Projenin Hedefi

İnternet dünyasının en büyük video platformu olan YouTube'da, algoritmaların karşımıza çıkardığı her içerik her zaman uygun olmayabiliyor. YT Filter'ın temel amaçları:

- **Çocuk Güvenliği:** Çocukların yaşına uygun olmayan, şiddet içeren veya rahatsız edici içerikleri otomatik olarak maskelemek veya gizlemek.
- **Yetişkin Kontrolü:** Yetişkin kullanıcıların odaklanmak istediği konular dışındaki (örneğin dikkat dağıtıcı magazin veya kalitesiz içerikler) videolardan kaçınmasını sağlamak.
- **Etiket Tabanlı Filtreleme:** Videoları "Eğitici", "Güvenli", "Küfürlü" veya "Şiddet İçerikli" gibi etiketlerle işaretleyerek, her etiket grubu için özel davranışlar (göster, bulanıklaştır, gizle) belirlemek.

## ✨ Özellikler

- **Dinamik Bulanıklaştırma:** İstemediğiniz kategorideki videoların küçük resimlerini (thumbnail) bulanıklaştırarak merak uyandırmasını engeller.
- **Özel Etiketler:** Video ID'si veya kanal adı üzerinden özel etiketleme yapabilme.
- **Kolay Ayarlar:** Eklenti ikonu üzerinden hangi etiketin nasıl davranacağını (Görüntüle / Bulanıklaştır / Gizle) anlık olarak değiştirebilme.
- **Kanal Bazlı Filtreleme:** Sadece tekil videoları değil, tüm kanalları tek seferde güvenli veya güvensiz olarak işaretleyebilme.

## 📁 Repo Yapısı

```
YT_Filter/
├── firefox/              # Firefox eklentisi (Manifest V3)
│   ├── manifest.json
│   ├── content.js
│   ├── inject.css
│   ├── inject_helper.js
│   ├── mapping.json
│   ├── popup.html
│   └── popup.js
├── chromium/             # Chrome/Chromium eklentisi
│   ├── manifest.json
│   ├── content.js
│   ├── inject.css
│   ├── inject_helper.js
│   ├── background.js
│   ├── options.html
│   └── options.js
├── LICENSE
└── README.md
```

## 🚀 Kurulum ve Deneme

Eklenti henüz resmi mağazalarda yer almadığı için aşağıdaki adımları izleyerek geçici olarak tarayıcınıza yükleyebilirsiniz:

### Firefox için Adımlar:

1. **Firefox'u Açın:** Tarayıcınızın adres çubuğuna `about:debugging` yazın ve Enter'a basın.
2. **Bu Firefox (This Firefox):** Sol menüden "Bu Firefox" seçeneğine tıklayın.
3. **Geçici Eklenti Yükle (Load Temporary Add-on):** Sağ üst taraftaki bu butona tıklayın.
4. **Dosyayı Seçin:** `firefox/` klasörüne gidin ve `manifest.json` dosyasını seçerek "Aç" deyin.
5. **Hazır!** YouTube'a girerek eklentinin aktif olduğunu görebilirsiniz.

### Chrome / Chromium için Adımlar:

1. **Chrome'u Açın:** Adres çubuğuna `chrome://extensions` yazın ve Enter'a basın.
2. **Geliştirici Modu:** Sağ üst köşeden "Geliştirici modu"nu açın.
3. **Paketlenmemiş Yükle (Load unpacked):** Sol üstteki butona tıklayın.
4. **Klasörü Seçin:** `chromium/` klasörünü seçin.
5. **Hazır!** YouTube'a girerek eklentinin aktif olduğunu görebilirsiniz.

## 🛠️ Teknik Detaylar

- **Mapping (Eşleştirme):** `firefox/mapping.json` dosyası, video ID'lerini ve kanal isimlerini etiketlerle eşleştirir. Kendi listelerinizi bu dosyayı düzenleyerek güncelleyebilirsiniz.
- **Inject Logic:** İçerik betikleri (`content.js`), YouTube'un dinamik yapısına (Sürekli kaydırma/Infinite scroll) uyum sağlayacak şekilde optimize edilmiştir.

---
*Geliştiriciler ve içerik denetlemek isteyen ebeveynler için açık kaynaklı bir çözüm.*
