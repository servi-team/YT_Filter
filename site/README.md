# YouTube Filter Store (site)

Oylama sitesi: anonim ziyaretçi oyları -> sonuç -> `db.json` (eklentiye aylık mağaza güncellemesiyle gider).

**Kural kaynakları:**
- Ürün kuralları: [`docs/SISTEM_TASARIMI.md`](../docs/SISTEM_TASARIMI.md)
- Site kararları: [`docs/SITE_HAZIRLIK.md`](../docs/SITE_HAZIRLIK.md)
- QA: [`docs/SITE_QA.md`](../docs/SITE_QA.md)

Teknoloji: Next.js (App Router) + React + TypeScript, PostgreSQL/Drizzle, Docker Compose ve Caddy. PGlite yalnızca geliştirme ve test sürücüsüdür; üretimde kullanılmaz.

## Durum

| Dilim | Kapsam | Durum |
|---|---|---|
| S1 | Kamusal kabuk, ana sayfa, keşfet, tasarım sistemi ve kalkan ikonu | ✅ kodlandı |
| S2 | Anonim ziyaretçi kimliği, hız sınırı, oy servisi/API'leri ve içerik sayfası | ✅ kodlandı |
| S3 | YouTube metadata çözümleme, kayıtsız link ve ekleme talebi | ✅ kodlandı |
| S4 | Oturum, editör paneli, kayıt ekleme ve talep kuyruğu | ✅ kodlandı |
| S5 | Moderasyon, geri alma, kilit, çerez/ağ engeli ve bakım | ✅ kodlandı |
| S6 | Çok admin, arşiv/geri getirme, metadata düzeltme, `db.json` önizleme/yayın/indirme | ✅ kodlandı |
| S7 | Gizlilik/koşullar/iletişim, hata sayfaları, erişilebilirlik ve QA | ✅ kodlandı |

- `npm test`, `npm run tip` ve `npm run build` yerelde yeşil.
- Docker Compose + PostgreSQL + Caddy üretim yığını bu makinede **denenmedi**.
- Gerçek tarayıcı QA'sı, ekran görüntüleri, gerçek eklentiye `db.json` yükleme ve mağaza yüklemesi **kullanıcıda**.
- Bu makinede Docker bulunmadığı için doğrulama Node 22.23.4 + npm + PGlite ile yapıldı.

## Avatar

Kanal avatarı `kanallar.avatar` alanında, video kaydındaki kanal avatarı `videolar.kanal_avatar` alanında tutulur. Kayıt eklenirken YouTube metadata çözücüsünden alınır; yoksa arayüz kanal adının baş harflerinden rozet üretir. Video eklemek ayrı bir kanal satırı oluşturmaz.

## Yerelde hızlı başlangıç (PowerShell)

```powershell
cd site
npm install
Copy-Item .env.example .env
# .env içinde: SITE_DB=pglite, PGLITE_DIR=.pglite,
# SITE_ORIGIN=http://localhost:3000, IP_HASH_SECRET=<uzun rastgele değer>
npm run dev
```

- PGlite verisi `site/.pglite/` altında tutulur (git'e girmez).
- `npm run demo:veri` örnek kanal, video ve oy ekler; tablolarda kayıt varsa değişiklik yapmaz.
- İlk admin: `.env` içindeki `ILK_ADMIN_EPOSTA` ve `ILK_ADMIN_PAROLA` ile `npm run ilk-admin`.
- Node sürümü `.nvmrc` dosyasında: **22.23.4**. Test betiği destek dışı tek Node sürümlerinde (ör. 23/25) PGlite kilidi nedeniyle durur.

## Komutlar

| Komut | İş |
|---|---|
| `npm test` | Tüm site testleri (PGlite, Node test koşucusu) |
| `npm run tip` | TypeScript tip denetimi (`tsc --noEmit`) |
| `npm run build` | Üretim derlemesi (`standalone`) |
| `npm run qa:duman` | Çalışan siteye HTTP dumanı; `BASE_URL` varsayılan `http://localhost:3000` |
| `npm run bakim` | 30 günden eski IP özetlerini ve süresi dolmuş engelleri temizler |
| `npm run db:uret` | Şema değişikliğinden sonra Drizzle geçişi üretir |
| `npm run migrate` | `DATABASE_URL` üzerindeki PostgreSQL'e geçişleri uygular |
| `npm run demo:veri` | Geliştirme/test verisi ekler |
| `npm run ilk-admin` | İlk admin hesabını oluşturur |

## Üretim

Docker Compose + PostgreSQL + Caddy kullanılır. Üretimde `DATABASE_URL` zorunludur; PGlite üretim imajında bulunmaz. Geçişler `npm run migrate` (Compose'daki tek seferlik `migrate` servisi) ile uygulanır, yedek `site/deploy/yedekle.sh` ile alınır.

Sunucu kurulumu ve ilk admin adımları için kısa rehber: [`docs/SUNUCU_KURULUM.md`](../docs/SUNUCU_KURULUM.md).

```powershell
Copy-Item site\.env.example site\.env
# SITE_DOMAIN, POSTGRES_PASSWORD, SITE_ORIGIN ve IP_HASH_SECRET değerlerini doldur.
docker compose -f site/docker-compose.yml --env-file site/.env up -d --build
```

Sağlık kontrolü: `https://<alan-adı>/api/saglik` -> `{"site":"ok","veritabani":"ok"}`. Yedek `site/deploy/yedekle.sh` ile alınır; kurulum ve geri yükleme notları `docs/SUNUCU_KURULUM.md` içindedir.

## Gizlilik

Site gizlilik metni `/gizlilik` sayfasındadır ve yalnızca siteyi kapsar. Tarayıcı eklentisinin gizlilik metni ayrıdır: [`docs/GIZLILIK.md`](../docs/GIZLILIK.md). İki metin birbirine karıştırılmamalıdır.

## Bilinen sınırlar

- Docker/PostgreSQL/Caddy üretim denemesi ve gerçek tarayıcı/ekran okuyucu testi yapılmadı.
- Otomatik testler tarayıcı QA'sının, ekran görüntülerinin ve mağaza yüklemesinin yerini tutmaz.
- Site içi “Bildir” formu/uç noktası yoktur; iletişim GitHub Issues üzerindendir.
- E-posta gönderimi, analitik, reklam ve üçüncü taraf izleme yoktur.
- Push, kullanıcı incelemesinden sonra yapılacaktır.
