# Sunucu kurulumu

Bu kısa rehber, siteyi tek bir Linux sunucuda Docker Compose ile yayına almak içindir.
Ayrıntılı site notları `site/README.md` dosyasındadır.

## Gereksinimler

- Ubuntu 22.04/24.04 veya benzeri bir Linux sunucu (2 GB RAM yeterli).
- Alan adı ve DNS'te sunucu IP'sine giden bir **A** kaydı.
- 80 ve 443 portları açık; bu portlarda başka web sunucusu çalışmıyor.
- Docker Engine ve Compose eklentisi kurulu.

## 1. Kodu sunucuya al

```sh
git clone <depo-adresi> YouTubeFilter
cd YouTubeFilter
```

## 2. Ayarları doldur

```sh
cp site/.env.example site/.env
nano site/.env
```

Doldurulması gerekenler:

| Değişken | Değer |
|---|---|
| `SITE_DOMAIN` | Gerçek alan adı, örn. `filtre.ornek.com` |
| `SITE_ORIGIN` | `https://filtre.ornek.com` |
| `POSTGRES_PASSWORD` | En az 24 karakter, rastgele; yalnızca harf ve rakam |
| `IP_HASH_SECRET` | Uzun, rastgele bir anahtar; IP özetlerini ve ziyaretçi çerezi imzasını korur. Değiştirilirse eski IP özetleri ve ziyaretçi çerezleri geçersiz olur. |
| `ILK_ADMIN_EPOSTA` | İlk yönetici e-postası |
| `ILK_ADMIN_PAROLA` | İlk yönetici parolası (en az 12 karakter) |
| `YOUTUBE_API_KEY` | Varsa YouTube Data API anahtarı; yoksa boş bırakın |
| `OY_LIMITI_DAKIKA` | Opsiyonel; dakikadaki oy isteği sınırı (varsayılan `120`) |
| `OY_LIMITI_GUN` | Opsiyonel; günlük oy isteği sınırı (varsayılan `2000`) |
| `TALEP_LIMITI_SAAT` | Opsiyonel; saatlik içerik talebi sınırı (varsayılan `5`) |
| `GIRIS_LIMITI_15DK` | Opsiyonel; 15 dakikadaki giriş denemesi sınırı (varsayılan `10`) |
| `PANEL_YAZMA_LIMITI_DAKIKA` | Opsiyonel; dakikadaki panel yazma sınırı (varsayılan `120`) |

Hız limitleri pozitif tam sayı olmalıdır. Geçersiz değerler günlüğe uyarı yazıp
varsayılana döner; böylece hatalı bir değer limitleri devre dışı bırakamaz.

`site/.env` dosyasını kimseyle paylaşmayın ve git'e eklemeyin.

## 3. Siteyi başlat

```sh
docker compose -f site/docker-compose.yml --env-file site/.env up -d --build
```

Bu komut PostgreSQL'i, veritabanı geçişlerini, siteyi ve HTTPS için Caddy'yi başlatır.
Caddy sertifikayı ilk açılışta kendisi alır; birkaç dakika sürebilir.

Kontrol:

```sh
docker compose -f site/docker-compose.yml --env-file site/.env ps
curl https://filtre.ornek.com/api/saglik
```

Beklenen yanıt: `{"site":"ok","veritabani":"ok"}`

## 4. İlk admin hesabını oluştur

```sh
docker compose -f site/docker-compose.yml --env-file site/.env \
  run --rm migrate node scripts/ilk-admin.mjs
```

Komut yalnızca hiç hesap yokken çalışır. Parola ekrana yazılmaz.
Ardından `https://filtre.ornek.com/giris` adresinden giriş yapın; ilk girişte parola değişimi istenir.

## Güncelleme

```sh
git pull
docker compose -f site/docker-compose.yml --env-file site/.env up -d --build
```

Geçişler `migrate` servisi tarafından otomatik uygulanır.

## Yedek

```sh
bash site/deploy/yedekle.sh
```

Yedeği sunucu dışına da kopyalayın. Geri yükleme komutu betiğin sonunda yazılıdır.

## Sık kullanılanlar

```sh
# Logları izle
docker compose -f site/docker-compose.yml --env-file site/.env logs -f site

# Servisleri durdur / başlat
docker compose -f site/docker-compose.yml --env-file site/.env stop
docker compose -f site/docker-compose.yml --env-file site/.env start

# Bakım işlerini çalıştır (eski IP özetleri, süresi dolmuş oturum ve engeller)
docker compose -f site/docker-compose.yml --env-file site/.env \
  run --rm migrate node scripts/bakim.mjs
```

## Sorun giderme

- **Site açılmıyor:** `docker compose ... ps` ile `site` servisinin sağlıklı olduğuna bakın; `logs site` çıktısını inceleyin.
- **HTTPS sertifikası alınamıyor:** DNS A kaydının sunucuya baktığını ve 80/443 portlarının açık olduğunu doğrulayın.
- **Veritabanı hatası:** `site/.env` içindeki `POSTGRES_*` değerlerinin ilk kurulumdakiyle aynı olduğundan emin olun. Parolayı sonradan değiştirmek mevcut veritabanına bağlanmayı engeller.
- **İlk admin oluşturulamıyor:** Veritabanında zaten hesap varsa komut bilinçli olarak durur; hesapları admin panelinden yönetin.
