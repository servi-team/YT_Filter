# YouTube Filter Store 🗳️

Editörlerin YouTube kanal ve videolarına birlikte **konu** ve **etiket** oyu verdiği ortak çalışma sitesi. Oylamanın sonucu JSON olarak dışa aktarılır ve eklentinin kaynak koduna eklenir. **Eklenti bu siteye hiçbir zaman bağlanmaz.**

Kurallar: [../docs/SPESIFIKASYON.md](../docs/SPESIFIKASYON.md) · JSON sözleşmesi: [../docs/veritabani-semasi.md](../docs/veritabani-semasi.md)

## Mimari

Tüm bileşenler Docker'da çalışır:

| Servis | İmaj | Görevi |
|---|---|---|
| `db` | `postgres:16-alpine` | Editörler, içerikler, oylar, oy geçmişi, dışa aktarımlar (kalıcı volume: `db_verisi`) |
| `app` | `node:24-alpine` (Dockerfile) | Express API + statik ön yüz (`public/`), açılışta şema göçlerini uygular |

```text
store/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── src/
│   ├── sunucu.js          # Express uygulaması
│   ├── veritabani.js      # PostgreSQL bağlantısı ve şema göçleri
│   ├── migrations/        # Sıralı .sql göç dosyaları
│   └── rotalar/           # API uç noktaları
├── public/                # Saf HTML/JS/CSS ön yüz (sayfalar/ altında her sayfa)
└── tests/                 # node:test birim testleri
```

## Çalıştırma

```bash
cp .env.example .env      # şifreleri ve gizli anahtarı değiştirin
docker compose up -d --build
```

Site: <http://localhost:3000>. İlk açılışta, hiç editör yoksa `.env` içindeki `ILK_ADMIN_KULLANICI` / `ILK_ADMIN_SIFRE` ile bir yönetici hesabı oluşturulur.

```bash
docker compose logs -f app            # günlükler
docker compose run --rm app npm test  # birim testleri
docker compose down                   # durdur (veriler volume'da kalır)
```
