# Veritabanı JSON Şeması (sema sürümü 1)

Store'un dışa aktardığı ve eklentinin `src/data/veritabani.json` olarak paketlediği dosyanın biçimi. Store ile eklenti arasındaki tek sözleşme budur; değişiklik yapılırsa `semaSurumu` artırılmalıdır.

```json
{
  "semaSurumu": 1,
  "surum": "2026.11.1",
  "olusturulma": "2026-11-01T12:00:00.000Z",
  "konular": [
    { "id": "teknoloji", "ad": "Teknoloji" }
  ],
  "etiketler": [
    { "id": "kufur", "ad": "Küfürlü içerik" }
  ],
  "videolar": {
    "dQw4w9WgXcQ": {
      "anaKonu": "teknoloji",
      "yanKonular": ["oyun", "haber"],
      "kararsizKonular": ["eglence"],
      "etiketler": ["ai", "argo"],
      "kararsizEtiketler": ["kufur"]
    }
  },
  "kanallar": {
    "@kanaladi": {
      "anaKonu": "oyun",
      "yanKonular": [],
      "kararsizKonular": [],
      "etiketler": [],
      "kararsizEtiketler": []
    }
  }
}
```

## Alanlar

| Alan | Tür | Açıklama |
|---|---|---|
| `semaSurumu` | tamsayı | Bu belgenin sürümü. Şu an `1`. |
| `surum` | metin | Veri sürümü, `YYYY.AA.N` biçiminde. Her dışa aktarımda artar. |
| `olusturulma` | ISO 8601 | Dışa aktarma zamanı. |
| `konular`, `etiketler` | dizi | Store'daki konu/etiket tanımları (`id`, `ad`), görüntüleme sırasıyla. |
| `videolar` | nesne | Anahtar: 11 karakterlik video ID'si (**büyük/küçük harf korunur**). |
| `kanallar` | nesne | Anahtar: `@` ile başlayan kanal handle'ı (**küçük harf**). |

## Kayıt alanları

| Alan | Tür | Açıklama |
|---|---|---|
| `anaKonu` | metin \| `null` | Ana konunun `id`'si. Pozitif puanlı konu yoksa `null` (konu bilinmeyen). |
| `yanKonular` | dizi | Pozitif puanlı diğer konular. |
| `kararsizKonular` | dizi | Net puanı 0 olan konular. `anaKonu` `null` ise boştur. |
| `etiketler` | dizi | Pozitif puanlı etiketler. |
| `kararsizEtiketler` | dizi | Net puanı 0 olan etiketler. |

## Kurallar

- Dizilerde yalnızca `konular`/`etiketler` listesinde tanımlı `id`'ler bulunur.
- `anaKonu` `null` **ve** `etiketler` ile `kararsizEtiketler` boş olan kayıt dosyaya yazılmaz (içerik bilinmeyen kalır).
- **Konu bilinmeyen**: `anaKonu === null`. **Etiket bilinmeyen**: `etiketler` ve `kararsizEtiketler` boş.
- `npm run db:import` dosyayı bu kurallara göre doğrular ve `surum` eskisinden büyük değilse reddeder.
