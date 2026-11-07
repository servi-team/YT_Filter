#!/usr/bin/env sh
# Veritabanı yedeği: ./site/deploy/yedekle.sh   (depo kökünden çalıştır)
# Çıktıyı SUNUCU DIŞINA da kopyala; aynı diskteki yedek disk bozulunca işe yaramaz.
set -eu
KLASOR="${YEDEK_KLASORU:-yedek}"
mkdir -p "$KLASOR"
DOSYA="$KLASOR/db-$(date +%Y-%m-%d_%H%M).sql.gz"
docker compose -f site/docker-compose.yml --env-file site/.env exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$DOSYA"
echo "Yedek alındı: $DOSYA ($(du -h "$DOSYA" | cut -f1))"
# Geri yükleme (BOŞ bir veritabanına):
#   gunzip -c yedek/db-....sql.gz | docker compose -f site/docker-compose.yml --env-file site/.env exec -T postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
