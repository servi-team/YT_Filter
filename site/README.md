# YouTube Filter Store (site)

Oylama sitesi: ziyaretçi oyları -> sonuç -> `db.json` (eklentiye aylık mağaza güncellemesiyle gider).
Kural kaynağı: `docs/PLAN_SITE.md` (bölüm 4-5) ve `docs/db-sema.md`.
Teknoloji: Next.js + PostgreSQL (Drizzle) + Caddy, Docker Compose ile.

## Durum
| Faz | İş | Durum |
|---|---|---|
| 1 | Next.js iskeleti, Docker Compose, Caddy, PostgreSQL | ✅ yazıldı (Docker henüz denenmedi) |
| 2 | Ortak çekirdek: taksonomi/doğrulayıcı `src/core` tek kaynaktan (`lib/ortak.ts`) | ✅ |
| 3 | Link ayrıştırma ✅ · kayıt ekleme, ad çekme, talepler | ⏳ |
| 4 | Oy hesabı ✅ · oy deposu ✅ (`lib/oy-deposu.ts`) · oy arayüzü/API, çerez kimliği, IP sınırı | ⏳ |
| 5 | `db.json` üretimi + çift doğrulama ✅ · indirme sayfası, yayın akışı | ⏳ |
| 6-7 | Hesaplar, editör/admin panelleri, moderasyon arayüzü, yayın | ⏳ |

Karar: avatar yok (kanal kaydında yalnızca kimlik, handle ve ad).

## Klasörler
- `lib/` saf kural kodu (oy hesabı, link çözme, `db.json` üretimi) ve oy deposu
- `db/schema.ts` şema, `db/gecisler/` üretilmiş SQL geçişleri (şemayı değiştirince `npm run db:uret`)
- `app/` Next.js sayfaları ve API (`/api/saglik`)
- `docker-compose.yml`, `Dockerfile`, `Caddyfile`, `.env.example`, `deploy/yedekle.sh`

## Testler
`npm test` (Node >= 22.18). Veritabanı testleri gerçek PostgreSQL motoruyla (pglite) çalışır, Docker gerekmez.

## Yerelde çalıştırma (Docker ile)
Depo kökünden:
```
cp site/.env.example site/.env        # POSTGRES_PASSWORD'ü doldur
docker compose -f site/docker-compose.yml --env-file site/.env up -d --build
```
Sonra `https://localhost` (tarayıcı kendinden imzalı sertifika uyarısı verir, yerel deneme için normal).
Kontrol: `https://localhost/api/saglik` -> `{"site":"ok","veritabani":"ok"}`.
Durdurma: `docker compose -f site/docker-compose.yml --env-file site/.env down` (veriler silinmez; `down -v` SİLER).

## Sunucuya alırken
1. Alan adının DNS A kaydı sunucunun IP'sine baksın, `.env` içinde `SITE_DOMAIN` o alan adı olsun.
2. Sunucuda yalnızca 80 ve 443 dışarıya açık olsun (güvenlik duvarı).
3. Yedek: `./site/deploy/yedekle.sh`. Yedeği sunucu dışına kopyala ve geri yüklemeyi BİR KEZ dene.
