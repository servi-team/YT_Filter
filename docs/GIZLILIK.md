# Gizlilik Politikası — YouTube Filtreleyici

> Bu metin Chrome Web Store ve Firefox Add-ons mağazalarına verilecek gizlilik politikası URL'i için hazırlanmıştır; olduğu gibi yayınlanabilir.
> Son güncelleme: 2026-10-19 · [İLETİŞİM E-POSTASI BURAYA]

## Özet

YouTube Filtreleyici hiçbir kişisel veri **toplamaz, saklamaz ve sunucuya göndermez**. Eklentinin çalışması için gereken tüm bilgiler yalnızca sizin tarayıcınızın yerel deposunda tutulur.

## 1. Hangi veriler işlenir?

Eklenti yalnızca youtube.com sayfalarında çalışır. Çalışırken şu bilgileri **yalnızca cihazınızda** işler:

- **Ayarlarınız:** filtre modu, konu/etiket tercihleri, eylem seçimleri.
- **İstisna listeleriniz:** eklediğiniz kanal ve videolar; kanal eklerken sayfada görünen **kanal adı ve avatarı** (liste içinde göstermek için saklanır).
- **PIN karması:** PIN kodunuz düz metin olarak değil, rastgele tuzlu PBKDF2-SHA256 karması olarak saklanır.
- **Oynatılan sayfaların filtre kararı:** video/kanal kimliği ve eşleşen konu/etiket bilgisi; bu bilgiler sayfada gösterilir, kaydedilmez (uçucudur).

## 2. Veriler nereye gider?

- Hiçbir veri tarayıcınızdan dışarı çıkmaz; eklentinin kendine ait bir sunucusu yoktur.
- Eklenti hiçbir analitik/izleme hizmeti kullanmaz.
- Avatar görselleri, sayfada görüntülenmeleri için doğrudan YouTube'un görsel alan adlarından (`yt3.ggpht.com`, `yt3.googleusercontent.com`, `lh3.googleusercontent.com`) tarayıcınız tarafından yüklenir; bu istekler eklenti tarafından yapılmaz.

## 3. Verilerin silinmesi

- Eklentiyi kaldırdığınızda tarayıcı, yerel deposunu da siler.
- Pop-up → **Yedek** sekmesinden "Sıfırla / temizle" işlemleriyle verileri kendiniz de silebilirsiniz.
- PIN kilitlidir yalnızca arayüz kilididir; kaldırmak için eklentiyi kaldırmanız veya tarayıcı depolamasını temizlemeniz yeterlidir.

## 4. İzinler

- `storage`: ayarlarınızı ve listelerinizi cihazınızda tutmak için.
- `*://*.youtube.com/*`: filtreleme yalnızca YouTube sayfalarında çalıştığı için.

## 5. Çocukların gizliliği

Eklenti kişisel veri toplamadığı için çocuklardan da veri toplamaz.

## 6. Değişiklikler

Bu politikada değişiklik olursa bu dosyanın "Son güncelleme" tarihi yenilenir ve değişiklik eklenti sürüm notlarında duyurulur.

## 7. İletişim

Sorularınız için: [İLETİŞİM E-POSTASI BURAYA]

---

### English summary

YouTube Filtreleyici does **not** collect, store, or transmit any personal data. All settings, lists, and the hashed PIN live in your browser's local storage. The extension runs only on youtube.com and performs no analytics. Avatar images are loaded directly from YouTube's image hosts by your browser. For questions, contact the address above.
