# syntax=docker/dockerfile:1
# Derleme bağlamı DEPO KÖKÜDÜR (site, eklentinin src/core dosyalarını paylaşır):
#   docker compose -f site/docker-compose.yml build
FROM node:22-alpine AS temel
WORKDIR /uygulama

# 1) Bağımlılıklar (önbellek: yalnızca package*.json değişince yeniden kurulur)
FROM temel AS bagimliliklar
COPY site/package.json site/package-lock.json ./site/
RUN cd site && npm ci

# 2) Derleme
FROM bagimliliklar AS derleme
ENV NEXT_TELEMETRY_DISABLED=1
COPY src/core ./src/core
COPY site ./site
RUN cd site && npm run build
# PGlite yalnızca geliştirme/test sürücüsüdür; üretim imajında taşınmasın.
RUN rm -rf /uygulama/site/.next/standalone/site/node_modules/@electric-sql

# 3) Veritabanı geçişi (tek seferlik iş: `migrate` servisi)
FROM temel AS gecis
COPY --from=bagimliliklar /uygulama/site/node_modules ./site/node_modules
COPY site/package.json ./site/
COPY site/db ./site/db
COPY site/lib ./site/lib
COPY site/scripts ./site/scripts
WORKDIR /uygulama/site
CMD ["node", "scripts/migrate.mjs"]

# 4) Çalışma görüntüsü (küçük, root olmayan kullanıcı)
FROM temel AS calisma
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S uyg && adduser -S uyg -G uyg
COPY --from=derleme --chown=uyg:uyg /uygulama/site/.next/standalone ./
COPY --from=derleme --chown=uyg:uyg /uygulama/site/.next/static ./site/.next/static
USER uyg
EXPOSE 3000
CMD ["node", "site/server.js"]
