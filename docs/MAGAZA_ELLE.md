# Mağaza Yayını — Elle Yapılacaklar

> Bu belge yalnızca **hesap, gerçek tarayıcı ve ekran kaydı** gerektiren işleri sıraya koyar. Listeleme metinleri, izin gerekçeleri ve form cevapları `docs/MAGAZA_HAZIRLIK.md`; gizlilik metni `docs/GIZLILIK.md` dosyasındadır.
> Durum: 2026-10-21 · Sürüm: **2.0.0** · Tahmini süre: 2–3 saat (video ve mağaza incelemesi hariç).

## 0. Ön koşullar

- [ ] Node.js **20+** ve `npm install` tamam.
- [ ] Chrome/Edge ve Firefox'ta test için ayrı, temiz bir profil (mevcut veriler karışmasın).
- [ ] `store/` klasörü oluşturuldu (`.gitignore`'da; görseller repoya girmez).
- [ ] GitHub deposu **herkese açık** (gizlilik iletişimi GitHub Issues; repo özelse Issues bağlantısı çalışmaz).
- [ ] Chrome Web Store ve Firefox AMO geliştirici hesapları hazır.

## 1. Yerel doğrulama (yaklaşık 30–45 dk)

Önce otomatik kontroller:

```powershell
npm install
npm test
node scripts/build.js --check
```

Beklenen: **116 test yeşil** (104 saf + 12 smoke), `--check` çıktısı temiz. Ardından:

### 1.1 Chrome/Edge

1. `chrome://extensions` → Geliştirici modu → **Paketlenmemiş öğe yükle** → `chromium/` klasörü.
2. Eklenti kimliğini not et (URL'de `chrome-extension://<kimlik>/options.html`).
3. Aşağıdaki tabloyu gerçek tarayıcıda doldur.

### 1.2 Firefox

1. `about:debugging#/runtime/this-firefox` → **Geçici eklenti yükle** → `firefox/manifest.json`.
2. Firefox'ta veri toplama izin ekranı çıkmamalı; `data_collection_permissions.required = ["none"]` bunu sağlar.
3. Aşağıdaki tabloyu tekrar doldur.

| # | Test | Adım | Beklenen sonuç | Chrome | Firefox |
|---|---|---|---|---|---|
| 1 | PIN kurulumu | Temiz profilde eklentiyi aç | 4 haneli PIN belirleme kartı çıkar; `1234` gibi varsayılan yoktur | ☐ | ☐ |
| 2 | PIN kilidi | PIN belirle → kilitle → yanlış PIN → doğru PIN | Yanlış PIN reddedilir; doğru PIN açar; yeniden açılışta kilit korunur | ☐ | ☐ |
| 3 | Kanal ekleme | YouTube'da bir kanal sayfası aç → eklenti simgesi → **Her zaman izin ver** | Hızlı bant kanal adını gösterir; İstisnalar'da avatar + `Ad (@handle)` görünür | ☐ | ☐ |
| 4 | SPA gezinmesi | Ana sayfa → video → geri → başka video | Karar/banner sayfa değişince güncellenir; yenileme gerekmez | ☐ | ☐ |
| 5 | Liste dışa/içe aktarma | İstisnalar → tek liste/tüm listeler dışa aktar → içe aktar | JSON iner; içe aktarmada geçerli kayıtlar gelir, bozuk dosya listeyi bozmaz | ☐ | ☐ |
| 6 | `db.json` içe aktarma | Sistem → `docs/db.test-ornek.json` içe aktar → geri dön | Geçerli/geçersiz kayıt sayısı gösterilir; kararlar test verisine göre değişir | ☐ | ☐ |
| 7 | Tam yedek | Sistem → tam yedek indir → içe aktar | Ayar/listeler/PIN durumu korunur; `dbOverride` dışa aktarılmaz | ☐ | ☐ |
| 8 | Görünüm | Görünüm sekmesinde Shorts/yorum/önerilen anahtarlarını aç/kapat | YouTube sayfası yenilenince anahtarlar uygulanır | ☐ | ☐ |

> **Takılırsanız:** `DEVIR_NOTU.md` 6/#14 ve 6/#16'daki tanılama adımlarına bakın. Hata varsa ekran görüntüsü + konsol günlüğü (`YT Filter: …`) ile kaydedin; yayın öncesi düzeltilmelidir.

## 2. Ekran görüntüleri (1–5 kare, 1280×800)

Chrome Web Store en az **bir** 1280×800 PNG/JPEG ister; 5 kareye kadar yüklenebilir. Gerçek arayüz kullanılmalı, mockup olmamalıdır.

### 2.1 Çekim yöntemi

- **Seçenek A (önerilen):** `options.html` sayfasını normal sekmede aç (`chrome-extension://<kimlik>/options.html`), pencereyi 1280×800'e yakın boyutla, `Win+Shift+S` ile dikdörtgen seç veya `Alt+PrintScreen` ile aktif pencereyi yakala.
- **Seçenek B (popup):** Popup açıkken **5 saniye gecikmeli** ekran görüntüsü alın (Snipping Tool → Gecikme) veya `Win+PrintScreen` kullanın. Popup'a tıklamak popup'ı kapatabilir.
- Çıktıyı `store/ham/` içine koyun ve boyutu sabitleyin:

```powershell
# store/ham içindeki görselleri 1280x800 tuvale ortalar
powershell -ExecutionPolicy Bypass -File scripts/gorsel-1280x800.ps1
```

Çıktılar `store/ekran/` altına `*-1280x800.png` olarak yazılır. Koyu zemin (#0F0F0F) kullanılır; gerçek içerik kırpılmaz, oran korunur.

### 2.2 Beş karelik plan

| # | Sahne | Ne gösterilecek | Dosya önerisi |
|---|---|---|---|
| 1 | Filtre sekmesi | Mod (Serbest/Orta/Katı), konu ızgarası, etiket eylemleri | `01-filtre.png` |
| 2 | İstisnalar | Avatarlı kanal satırı, beyaz/kara liste rozetleri | `02-istisnalar.png` |
| 3 | Hızlı bant | YouTube'da "Şu an: ENGELLENİYOR — Konu: …" + iki düğme | `03-hizli-bant.png` |
| 4 | Engelli sayfa | Tam sayfa uyarı, sebep metni, "Beyaz listeye ekle" | `04-engel.png` |
| 5 | Bulanıklaştırma | Bulanık kart/oynatıcı ve neden rozeti | `05-bulanik.png` |

> Kişisel bilgi (e-posta, gerçek ad, izleme geçmişi) görünmesin. Örnek kanal/video adları kullanın.

## 3. YouTube tanıtım videosu

Chrome listeleme formu YouTube bağlantısı ister. Video **30–45 saniye**, 1080p, Türkçe altyazılı olabilir; telifli müzik kullanılmamalıdır.

| Süre | Sahne | Anlatım |
|---|---|---|
| 0–5 sn | YouTube ana sayfası, karışık öneriler | "YouTube'da ne göreceğinizi siz seçin." |
| 5–15 sn | Eklenti popup → Filtre sekmesi | Mod ve konu seçimi; "engelle / bulanıklaştır / uyarı" |
| 15–25 sn | Engellenen video banner'ı | Sebep görünür; "Geri dön" ve "Beyaz listeye ekle" |
| 25–35 sn | İstisnalar + hızlı bant | Kanal/video istisnası tek tıkla |
| 35–45 sn | Gizlilik ve kapanış | "Veriler yerelde kalır; sunucuya gönderilmez." |

- Kayıt: OBS Studio veya Xbox Game Bar (`Win+G`); mikrofon zorunlu değil, ekran yazıları yeterli.
- YouTube'a **Unlisted** yükle (özel değil; mağaza inceleyicisi bağlantıyı açabilmeli).
- Başlık: `YouTube Filtreleyici — tanıtım`; açıklamaya mağaza/gizlilik bağlantısını ekle.
- Bağlantıyı `docs/MAGAZA_HAZIRLIK.md` ve Chrome formuna işle.

## 4. Gizlilik politikası URL'i

Metin hazır: `docs/GIZLILIK.md`. İletişim kanalı **GitHub Issues**: `https://github.com/TalhaOzz/YouTubeFilter/issues`.

### GitHub Pages (depo herkese açıksa önerilen)

1. GitHub → **Settings → Pages**.
2. **Build and deployment → Source:** `Deploy from a branch`.
3. **Branch:** `main`, **Folder:** `/docs` → **Save**.
4. Birkaç dakika bekle; adres genellikle:
   `https://talhaozz.github.io/YouTubeFilter/GIZLILIK.html`
5. Gizli sekmede aç; sayfa yükleniyor mu, Issues bağlantısı çalışıyor mu kontrol et.
6. URL'i Chrome/Firefox mağaza formlarına ve `docs/MAGAZA_HAZIRLIK.md`'ye yaz.

> Depo özelese GitHub Pages ücretsiz planda yayınlanmaz ve Issues bağlantısı da çalışmaz. Bu durumda iletişim için e-posta, barındırma için Cloudflare Pages/Netlify kullanılmalı; karar değişirse `docs/GIZLILIK.md` güncellenir.

## 5. Paketleme ve yükleme

```powershell
npm test
npm run build
npm run store:gorsel

Compress-Archive -Path chromium\* -DestinationPath yt-filter-chromium-2.0.0.zip -Force
Compress-Archive -Path firefox\*  -DestinationPath yt-filter-firefox-2.0.0.zip  -Force
```

### Chrome Web Store

1. Developer Dashboard → **New item** → `yt-filter-chromium-2.0.0.zip`.
2. Formu `docs/MAGAZA_HAZIRLIK.md` bölüm 1–3'ten doldur:
   - ad, kısa/uzun açıklama, kategori (Verimlilik), dil (Türkçe);
   - 128×128 ikon, en az bir 1280×800 ekran görüntüsü, 440×280 karo;
   - YouTube tanıtım video bağlantısı;
   - gizlilik politikası URL'i;
   - tek amaç beyanı; veri toplama: **Hayır**; uzak kod: **Hayır**.
3. İncelemeye gönder. Yayınlanmadan önce mağaza panelindeki uyarıları kontrol et.

### Firefox AMO

1. Add-on Developer Hub → **Submit a New Add-on** → `yt-filter-firefox-2.0.0.zip`.
2. Kaynak kodu istenirse aynı `v2.0.0` etiketinin kaynak arşivini ekle; kaynakta derleme adımı yoktur.
3. Gizlilik URL'i ve veri beyanı (`none`) alanlarını kontrol et.
4. İncelemeye gönder.

## 6. Yayın sonrası

- [ ] Mağazadan temiz profile kur; PIN, filtre, kanal ekleme ve liste içe aktarma smoke testini yap.
- [ ] `CHANGELOG.md` içindeki `[Yayınlanmamış]` başlığını `[2.0.0] - YYYY-AA-GG` yap.
- [ ] `git tag v2.0.0` ve GitHub Release notlarını yayınla.
- [ ] Mağaza URL'lerini `README.md` ve `docs/MAGAZA_HAZIRLIK.md`'ye ekle.
- [ ] Sorun bildirimi için GitHub Issues şablonu aç (isteğe bağlı).

## 7. Durum takibi

| İş | Sorumlu | Durum | Tarih / not |
|---|---|---|---|
| Otomatik testler + build | Geliştirici | ☐ | |
| Chrome gerçek tarayıcı testi | Kullanıcı | ☐ | |
| Firefox gerçek tarayıcı testi | Kullanıcı | ☐ | |
| 5 ekran görüntüsü (1280×800) | Kullanıcı | ☐ | |
| Tanıtım videosu (YouTube) | Kullanıcı | ☐ | |
| Gizlilik URL'i (GitHub Pages) | Kullanıcı | ☐ | |
| Chrome mağaza yüklemesi | Kullanıcı | ☐ | |
| Firefox AMO yüklemesi | Kullanıcı | ☐ | |
| `v2.0.0` etiketi + Release | Geliştirici | ☐ | |
