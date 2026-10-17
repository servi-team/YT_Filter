# db.json şema sözleşmesi (sema: 1)

Bu belge, **düzenleme sitesinin ürettiği** ve **eklentinin okuduğu** `db.json` dosyasının tek referansıdır.
Eklenti tarafı: `src/core/db.js` (okuma/doğrulama) · Dosya yeri: `src/data/db.json` (pakete girer).

## Genel yapı

```json
{
  "sema": 1,
  "veriSurumu": 12,
  "olusturma": "2026-11-01",
  "kanallar": [
    {
      "id": "UCfYNqluOf8EbQkL44otydMw",
      "handle": "@trtspor",
      "ad": "TRT Spor",
      "avatar": "https://yt3.googleusercontent.com/...",
      "anaKonu": "spor",
      "yanKonular": ["haber"],
      "etiketler": []
    }
  ],
  "videolar": [
    {
      "id": "Dj4Zn4HwnrM",
      "anaKonu": "oyun",
      "yanKonular": ["eglence"],
      "etiketler": ["kufur", "argo"]
    }
  ]
}
```

## Alanlar

| Alan | Zorunlu | Kural |
|---|---|---|
| `sema` | evet | Tam sayı `1`. Başka değerde eklenti dosyayı tamamen yok sayar (eski eklenti yeni şemayı yanlış okumasın diye). |
| `veriSurumu` | evet | Her dışa aktarımda artan tam sayı. Kullanıcı elle içe aktarma yaparsa, yalnızca paketteki sürümden **büyükse** geçerli olur. |
| `olusturma` | hayır | Bilgi amaçlı tarih (`YYYY-MM-DD`). Eklenti kullanmaz. |
| `kanallar[].id` | evet | `UC` + 22 karakter (`A-Za-z0-9_-`). Kanalın asıl kimliği. |
| `kanallar[].handle` | hayır | `@` ile başlar (`A-Za-z0-9._-`). Değişebilir; yalnızca yardımcı eşleştirme anahtarıdır. Büyük/küçük harf duyarsız aranır. |
| `kanallar[].ad`, `avatar` | hayır | Yalnızca eklenti arayüzünde gösterim için. Karar vermeyi etkilemez. |
| `videolar[].id` | evet | 11 karakter (`A-Za-z0-9_-`). Büyük/küçük harf **duyarlı**. |
| `anaKonu` | evet | Tam olarak **1** adet, aşağıdaki konu ID'lerinden biri. Yoksa kayıt geçersizdir. |
| `yanKonular` | hayır | Konu ID'leri listesi, sınırsız. `anaKonu` burada tekrar edemez. |
| `etiketler` | hayır | Etiket ID'leri listesi, sınırsız. Boş liste = "incelendi, zararlı bir bayrak yok". |

## Anlam kuralları (en önemli kısım)

- **Kaydı olan video/kanal = incelenmiş.** Kaydı olmayan = etiketlenmemiş. Bu yüzden her kayıtta `anaKonu` zorunludur.
- **Boş `etiketler` = zararsız.** Etiket listesi boşsa içerik incelenmiş ve hiçbir bayrak konmamış demektir.
- Bir video veya kanalın aynı ID ile iki kaydı olmamalı. Olursa eklenti **sonuncuyu** kullanır.
- Geçersiz kayıt (bozuk ID, bilinmeyen konu/etiket, ana konu yok) eklenti tarafından **tek tek atlanır**, dosyanın geri kalanı yüklenir.
- Kanal kaydında `handle` değişirse `id` aynı kalır. Site, kanalı daima `id` ile tanımalı.

## Konu ID'leri (`anaKonu`, `yanKonular`)

| ID | Ad | Kapsam |
|---|---|---|
| `ders-okul` | Ders / Okul | okul müfredatı, konu anlatımı, sınav hazırlığı, üniversite dersleri |
| `egitici` | Eğitici | belgesel, nasıl yapılır videoları, ders harici kurslar (dil dahil) |
| `bilim` | Bilim | akademik/araştırma içeriği, popüler bilim, uzay, doğa bilimleri |
| `teknoloji` | Teknoloji | yazılım, donanım, yapay zeka, inceleme kanalları |
| `haber` | Haber / Güncel olaylar | haber kanalları, siyasi yorum, gündem |
| `din` | Din / Maneviyat | dini sohbetler, vaazlar, manevi içerik |
| `eglence` | Eğlence / Mizah | komedi, skeç, meme, tepki videoları |
| `oyun` | Oyun | oyun oynanışı, oyun incelemeleri, espor |
| `spor` | Spor | futbol, basketbol, fitness, spor haberleri |
| `muzik` | Müzik | müzik videoları, cover, müzik analizi |
| `film-dizi-sanat` | Film / Dizi / Sanat | sinema, dizi, çizim, sanat |
| `yasam-vlog` | Yaşam / Vlog | günlük vlog, yemek, seyahat, yaşam tarzı |
| `finans` | Finans / Girişim | borsa, kripto, iş, ekonomi |
| `saglik-gelisim` | Sağlık / Kişisel gelişim | sağlık, psikoloji, motivasyon, kişisel gelişim |
| `cocuk` | Çocuk içerikleri | çocuklara yönelik animasyon/şarkı kanalları |

## Etiket ID'leri (`etiketler`)

| ID | Ad | Kapsam |
|---|---|---|
| `kufur` | Küfürlü içerik | küfür içeren videolar |
| `argo` | Argolu içerik | hakaret içeren (aptal, salak vb.) |
| `ai` | AI ile üretilmiş içerik | YZ ile yapılmış videolar (emin değilseniz eklemeyin) |
| `kumar` | Kumar / bahis | kumar ve bahis içeren içerikler |
| `siddet` | Şiddet | dövüş, savaş, gerçekçi öldürmeli oyunlar; arada kalırsanız buraya |
| `zararli` | Zararlı / uygunsuz içerik | sigara, alkol, uyuşturucu, cinsel içerik, kanun ihlali |
| `olumsuz-ornek` | Olumsuz örnek | zorbalama, taciz, dinî açıdan uygun olmayan davranışlar |
| `spam` | Spam / sahte içerik | gerçekmiş gibi duran aldatıcı içerikler, çoğu trading/coin videosu |

Konu ve etiket listesi **kodda** (`src/core/taxonomy.js`) tanımlıdır, `db.json` içinde yoktur. Yeni konu/etiket eklemek eklenti sürümü gerektirir; site ve eklenti aynı `taxonomy.js` ID'lerini kullanmalıdır.

## Sürümleme

- Alan eklemek geriye dönük uyumludur (eklenti bilmediği alanları yok sayar) ve `sema` aynı kalır.
- Alan anlamı değişir ya da silinirse `sema` artar. Eklenti desteklemediği `sema`'yı yüklemez.

## Boyut notu

Dosya her YouTube sayfasında bir kez okunur ve bellekte indekslenir. Binlerce kayıtta sorun olmaz. Kayıt sayısı onbinleri geçerse (yaklaşık 5-10 MB üstü) arka planda önbelleğe alma gerekir.
