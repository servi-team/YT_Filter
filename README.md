# YT Filter 🛡️ - Akıllı YouTube İçerik Denetleyici

**YT Filter**, YouTube deneyiminizi kişiselleştirmenize ve güvenli hale getirmenize yardımcı olan bir tarayıcı eklentisidir. Özellikle çocuklar ve yetişkinler için istenmeyen içeriklerden uzak durmayı, içeriği kontrol altına almayı hedefler.

> [!IMPORTANT]
> **Şu anda sadece Chrome tarayıcısı üzerinde denenmiştir.**

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

## 🚀 Kurulum ve Deneme

Eklenti henüz resmi mağazalarda yer almadığı için aşağıdaki adımları izleyerek geçici olarak tarayıcınıza yükleyebilirsiniz:

### Chrome için Adımlar:

1. Tarayıcınızın adres çubuğundan `chrome://extensions/` adresine gidin
2. Sağ üstten Geliştirici modunu açıp sol üstten "Paketlenmemiş öğe yükle" 'yi seçin.
3. İndirdiğiniz 7 dosyayı bir klasör olarak seçin.
4. **Hazır!** YouTube'a girerek eklentinin aktif olduğunu görebilirsiniz. Sağ üstteki eklenti ikonuna tıklayarak filtreleme ayarlarını yapabilirsiniz.

## 🛠️ Teknik Detaylar

- **Inject Logic:** İçerik betikleri (`content.js`), YouTube'un dinamik yapısına (Sürekli kaydırma/Infinite scroll) uyum sağlayacak şekilde optimize edilmiştir.

---
*Geliştiriciler ve içerik denetlemek isteyen ebeveynler için açık kaynaklı bir çözüm.*
