# YouTube Filter Store — Site Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Onaylı anonim oy modeliyle çalışan, editör/admin yönetimli, özgün “Sinyal Kalkanı” tasarımlı siteyi ve yeni kalkan ikonunu tamamlamak.

**Architecture:** Mevcut Next.js App Router + Drizzle/PostgreSQL çekirdeği korunur. Saf kurallar (`lib/oy-hesabi.ts`, `lib/db-uret.ts`) değişmez; veri erişimi ince servis dosyalarına, HTTP yüzeyi ince route handler’lara ayrılır. Arayüz CSS değişkenleri + CSS Modules ile yazılır; Tailwind/shadcn yoktur. Yerelde PGlite, üretimde PostgreSQL 17 kullanılır.

**Tech Stack:** Node ≥ 22.18, Next.js 16 (App Router, `output: standalone`), React 19, TypeScript, Drizzle ORM, PostgreSQL 17, PGlite (yalnızca dev/test), CSS Modules, `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-27-site-tasarimi.md` — çelişkide bu plan değil, spec ve `docs/SISTEM_TASARIMI.md` esastır.

## Global Constraints

- Dil ve ton: tüm kamusal ve panel metinleri Türkçe; sakin, açık, toplulukçu. `lang="tr"`.
- Tasarım: yalnızca `site/app/stil.css` değişkenleri + CSS Modules. Tailwind, shadcn, UI kit, CSS-in-JS yok.
- Renkler spec §4.2’deki değerlerdir; açık/koyu tema `prefers-color-scheme` ile otomatik. Elle tema anahtarı yok.
- Fontlar: `next/font/local`; Fraunces + Manrope, yerel `woff2`, OFL lisansları repoda. Çalışma anında üçüncü taraf font isteği yok.
- Erişilebilirlik: WCAG AA metin kontrastı, görünür `:focus-visible`, 44×44 px dokunma hedefi, anlamsal HTML, `aria-live="polite"`, `prefers-reduced-motion` desteği.
- Kimlikler: ziyaretçi çerezi `ytf_ziyaretci` (32 bayt rastgele, HttpOnly, SameSite=Lax, 1 yıl, üretimde Secure); oturum çerezi `ytf_oturum` (HttpOnly, SameSite=Lax, 7 gün kayan / 30 gün mutlak, üretimde Secure).
- Ham IP saklanmaz: `HMAC-SHA256(IP, IP_HASH_SECRET)`. Oy kayıtlarındaki IP özeti 30 gün sonra silinir; aktif engel kaydındaki özet engel süresince kalır.
- Panelde tam çerez kimliği, tam IP özeti ve ham IP yok. Yalnızca `çerez:xxxxxxxx` / `ağ:xxxxxxxx` etiketleri görünür. Moderasyon `oyId` üzerinden sunucuda çözülür.
- Oylar silinmez: ziyaretçi geri alması `ziyaretci_geri_alindi`, moderasyon geri alması `moderasyon_geri_alindi`. İkisinden biri `true` ise oy sayılmaz; moderasyon geri alması kalıcıdır.
- Engelli çerez/IP’nin oyları engel aktifken sayılmaz; engel kaldırılınca eski oylar geri sayılır. Engelin kendisi oyları silmez.
- İçerik silinmez, arşivlenir; arşivli kayıt kamusal listede, içerik URL’sinde ve `db.json`da yoktur. Oylar/kilit/moderasyon kayıtları korunur. Aynı linkle geri getirilebilir.
- Video eklemek `kanallar` satırı oluşturmaz; `videolar.kanal_id` FK’sız metindir, kanal adı/handle/avatar video satırında denormalizedir.
- Son aktif admin pasifleştirilemez, rolü düşürülemez; admin kendi hesabını pasifleştiremez veya rolünü düşüremez. Kontrol rol/aktiflik güncellemesiyle aynı transaction’da yapılır.
- Tüm yazma uçları origin kontrolü kullanır ve hız sınırına tabidir. **Kamusal** oy/talep uçları (`PUT /api/oylar`, `POST /api/oylar/geri-al`, `POST /api/talepler`) ziyaretçi çerezi + kamusal hız sınırına tabidir. **Panel/admin** yazma uçları (`/api/panel/*`, `/api/admin/*`) `panelKoruma` kullanır: oturum + rol doğrulaması ve hesap başına `PANEL_YAZMA_LIMITI_DAKIKA` (varsayılan 120/dk); kamusal oy/talep limitine tabi değildir. Gizlenen düğme yetki değildir; sunucu tarafı yetki esastır. Hata gövdesi `{ hata: string, kod?: string }`.
- Hız sınırları: oy IP+çerez başına dakikada 120 / günde 2000; talep IP başına saatte 5; giriş IP+e-posta başına 15 dakikada 10. Aşımda `429`.
- Her dilim sonunda `npm test` + `npm run build` yeşil, commit + `checkpoint-site-sN` etiketi. Push **yok**; push kullanıcı incelemesinden sonra.
- Commit’lerde `git add -A` kullanılmaz. Her commit yalnızca o görevin dosyalarını açar; eklenti tarafındaki mevcut değişiklikler (`src/content.js`, `src/inject_helper.js`, `chromium/*`, `firefox/*`) site commit’lerine karıştırılmaz.
- Bağımlılık sınırı: yeni çalışma zamanı bağımlılığı yok. Test/derleme için mevcut `drizzle-orm`, `pg`, `next`, `react`, `@electric-sql/pglite`, `node:test` yeterlidir.

## Review Focus

Spec’in sessiz kaldığı, kullanıcıyı en çok ısırabilecek beş girdi/koşul; her biri sahibi olan görevde teste bağlanır:

1. **Türkçe büyük/küçük harf ve arama:** `İ/ı/ş/ğ` içeren arama ve e-posta girişi yanlış eşleşmemeli. Test: Görev 6 `aramaAnahtari` + keşfet araması; Görev 16 e-posta büyük/küçük harf testi.
2. **Engel/arşiv sınırı:** Engel aktifken oy sayılmamalı, kaldırılınca geri gelmeli; arşivli kayıt kamusal ve `db.json` dışında kalırken oyları korunmalı. Test: Görev 10 engel geri dönüşü; Görev 25 arşiv oy koruma.
3. **Eşzamanlılık:** Aynı ziyaretçinin çift gönderimi tek satırda kalmalı; iki yayın aynı sürümü üretmemeli; iki admin aynı anda son admini düşürememeli. Test: Görev 10 upsert; Görev 24 `Promise.allSettled`; Görev 26 benzersiz sürüm.
4. **Origin/yetki:** Gizlenen düğme yetki değildir; doğrudan route çağrısı 401/403 almalı, pasifleştirilen hesabın oturumu anında düşmeli. Test: Görev 10 origin 403; Görev 22 panel route 401/403; Görev 24 admin 403 + pasifleştirilen oturum iptali.
5. **Kısmi metadata:** YouTube/oEmbed/HTML erişilemezken video kaydı kimlikle oluşturulabilmeli, başlık/avatar sonradan dolmalı; handle çözülemezse kullanıcıya anlaşılır hata verilmeli. Test: Görev 13 ağ hatası; Görev 14 handle hatası; Görev 18 başlıksız ekleme.

## File Structure

```
site/
├─ app/
│  ├─ layout.tsx, stil.css, fontlar.ts, icon.png, apple-icon.png
│  ├─ fontlar/                  # fraunces-variable.woff2, manrope-variable.woff2, OFL-*.txt
│  ├─ (kamusal)/                # page.tsx, kesfet/, icerik/[tur]/[id]/, link/, gizlilik/, kosullar/, iletisim/
│  ├─ (oturum)/                 # giris/, sifre-degistir/
│  ├─ panel/                    # layout, page, icerikler/, talepler/, moderasyon/, engeller/
│  ├─ admin/                    # layout, page, hesaplar/, icerikler/, yayinlar/, taksonomi/
│  ├─ api/                      # kamusal, oturum, panel, admin route handler'ları
│  └─ bilesenler/               # ortak React bileşenleri + *.module.css
├─ lib/
│  ├─ tipler.ts, hata.ts, istek.ts, ziyaretci.ts, hiz-limiti.ts
│  ├─ db.ts                     # PostgreSQL + PGlite dev/test sürücüsü
│  ├─ icerik-deposu.ts, icerik-yaz.ts, talep-deposu.ts
│  ├─ oy-hesabi.ts, oy-deposu.ts, oy-servisi.ts, engel-deposu.ts
│  ├─ parola.ts, oturum.ts, yetki.ts, hesap-deposu.ts, sunucu-oturum.ts
│  ├─ youtube-meta.ts, yayin-deposu.ts, arsiv-deposu.ts, moderasyon-deposu.ts, panel-deposu.ts
│  └─ ortak.ts, youtube-link.ts, db-uret.ts       # mevcut; imzaları korunur
├─ db/schema.ts, db/gecisler/
├─ tests/                       # node:test; yardim.ts ortak PGlite kurulumu
├─ scripts/                     # migrate.mjs, ilk-admin.mjs, demo-veri.mjs, bakim.mjs
├─ public/kalkan.svg, ikon-*.png
├─ .env.example, .gitignore, Dockerfile, next.config.ts, package.json
```

---

### Task 1: PGlite geliştirme sürücüsü ve komutlar

**Files:**
- Modify: `site/lib/db.ts`, `site/scripts/migrate.mjs`, `site/tests/db.test.ts`
- Modify: `site/next.config.ts`, `site/package.json`, `site/.env.example`, `site/.gitignore`, `site/Dockerfile`, `site/docker-compose.yml`
- Create: `site/tests/db-surucu.test.ts`

**Interfaces:**
- Produces: `export type Veritabani = PgDatabase<any, any, any>;`
- Produces: `export async function db(): Promise<Veritabani>`
- Produces: `export async function veritabaniKapat(): Promise<void>`

- [ ] **Step 1: Write the failing test**

```ts
// site/tests/db-surucu.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SITE_DB = 'pglite';
process.env.PGLITE_DIR = 'memory';
const { sql } = await import('drizzle-orm');
const { db, veritabaniKapat } = await import('../lib/db.ts');

test('PGlite sürücüsü geçişleri uygular ve sorgu çalıştırır', async () => {
  const v = await db();
  const r = await v.execute(sql`select 1 as x`);
  assert.equal((r.rows ?? r)[0].x, 1);
  await veritabaniKapat();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/db-surucu.test.ts`
Expected: FAIL — `db()` only supports `DATABASE_URL` / `SITE_DB` yok.

- [ ] **Step 3: Implement the driver**

`db()` sırası: `DATABASE_URL` varsa node-postgres (mevcut `pool()` davranışı); yoksa `SITE_DB=pglite` ise `@electric-sql/pglite` ile `PGLITE_DIR` (varsayılan `.pglite`, `memory` özel değeri bellekte) ve `drizzle-orm/pglite/migrator` ile `db/gecisler` uygula; ikisi de yoksa anlaşılır hata. Geçiş klasörünü **Windows dahil** `fileURLToPath(new URL('../db/gecisler', import.meta.url))` ile çöz; `new URL(...).pathname` kullanma. Aynı düzeltmeyi `site/scripts/migrate.mjs` ve mevcut `site/tests/db.test.ts` içinde de yap. PGlite modülünü değişkenli dinamik import ile yükle (`const m = '@electric-sql/pglite'; await import(m)`) ve `next.config.ts` içine `serverExternalPackages: ['@electric-sql/pglite']` ekle. Tekil bağlantıyı `globalThis` üzerinde tut; `veritabaniKapat()` pglite’ı kapatır, pg pool’unu `end()` eder.

`.env.example`’a ekle: `SITE_DB=pglite`, `PGLITE_DIR=.pglite`, `SITE_ORIGIN=http://localhost:3000` (üretimde `https://alan-adin`), `IP_HASH_SECRET=BURAYA_UZUN_RASTGELE_ANAHTAR`, `YOUTUBE_API_KEY=`, `ILK_ADMIN_EPOSTA=`, `ILK_ADMIN_PAROLA=`. `site/docker-compose.yml` içindeki `site` servisine `SITE_ORIGIN: ${SITE_ORIGIN:?SITE_ORIGIN .env içinde tanımlı olmalı}`, `IP_HASH_SECRET: ${IP_HASH_SECRET:?IP_HASH_SECRET .env içinde tanımlı olmalı}` ve `YOUTUBE_API_KEY: ${YOUTUBE_API_KEY:-}` ekle; böylece Caddy arkasında origin kontrolü doğru çalışır ve üretimde eksik yapılandırma sessizce yanlış davranmaz. `.gitignore`’a `.pglite/` ekle. `package.json`’a `"tip": "tsc --noEmit"` ekle. Dockerfile’da derleme sonrası `site/.next/standalone/site/node_modules/@electric-sql` dizinini kaldır; üretim imajında PGlite bulunmasın.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site; node --test tests/db-surucu.test.ts`
Expected: PASS.

- [ ] **Step 5: Build and commit**

Run: `cd site; npm run build`
Expected: `Compiled successfully`.
Commit: `git add site/lib/db.ts site/scripts/migrate.mjs site/tests/db.test.ts site/tests/db-surucu.test.ts site/next.config.ts site/package.json site/.env.example site/.gitignore site/Dockerfile site/docker-compose.yml` → `git commit -m "site: PGlite gelistirme surucusu ve temel komutlar"`

---

### Task 2: Oturum ve hız limiti şeması

**Files:**
- Modify: `site/db/schema.ts`
- Create: `site/db/gecisler/0001_*.sql` (drizzle-kit üretir)
- Create: `site/tests/sema-oturum.test.ts`

**Interfaces:**
- Produces tables: `oturumlar`, `hizLimitleri`
- Produces columns: `hesaplar.parolaDegistirmeli` (default `true`), `hesaplar.sonGiris`

- [ ] **Step 1: Write the failing test**

```ts
// site/tests/sema-oturum.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { oturumlar } from '../db/schema.ts';

let pg: PGlite; let db: ReturnType<typeof drizzle>;
before(async () => {
  pg = new PGlite(); db = drizzle(pg);
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../db/gecisler', import.meta.url)) });
});
after(async () => { await pg.close(); });

test('oturum ve hız limiti tabloları ile hesap alanları vardır', async () => {
  const kolonlar = await db.execute(sql`select table_name, column_name from information_schema.columns where table_name in ('oturumlar','hiz_limitleri','hesaplar')`);
  const c = (kolonlar.rows ?? kolonlar).map((r: any) => `${r.table_name}.${r.column_name}`);
  for (const ad of ['oturumlar.token_ozeti','oturumlar.son_kullanma','oturumlar.son_gorulme','hiz_limitleri.anahtar','hiz_limitleri.pencere','hiz_limitleri.sayac','hesaplar.parola_degistirmeli','hesaplar.son_giris']) assert.ok(c.includes(ad), ad);
});

test('oturum token özeti tekildir', async () => {
  await db.insert(oturumlar).values({ tokenOzeti: 'a', hesapId: (await db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('a@b.c','x','editor') returning id`)).rows[0].id, sonKullanma: new Date(Date.now() + 1e6) });
  await assert.rejects(db.insert(oturumlar).values({ tokenOzeti: 'a', hesapId: (await db.execute(sql`select id from hesaplar limit 1`)).rows[0].id, sonKullanma: new Date(Date.now() + 1e6) }), (e: any) => (e?.cause?.code ?? e?.code) === '23505');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/sema-oturum.test.ts`
Expected: FAIL — tablolar/alanlar yok.

- [ ] **Step 3: Implement schema and migration**

`hesaplar`’a `parolaDegistirmeli: boolean('parola_degistirmeli').notNull().default(true)` ve `sonGiris: timestamp('son_giris', { withTimezone: true })` ekle. `oturumlar`: `id uuid pk defaultRandom`, `tokenOzeti text unique notNull`, `hesapId uuid references hesaplar onDelete cascade`, `olusturma`, `sonKullanma notNull`, `sonGorulme notNull defaultNow`, `ipOzeti text`. `hizLimitleri`: `anahtar text`, `pencere timestamptz`, `sayac integer default 0`, `primaryKey({ columns: [anahtar, pencere] })`; `pencere` indeksle. Geçişi üret:

Run: `cd site; npm run db:uret -- --name oturum_hiz`
Expected: yeni `0001_*.sql`; içinde `CREATE TABLE "oturumlar"`, `"hiz_limitleri"`, `ALTER TABLE "hesaplar" ADD COLUMN "parola_degistirmeli"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site; node --test tests/sema-oturum.test.ts`
Expected: PASS.

- [ ] **Step 5: Build and commit**

Run: `cd site; npm run build`
Commit: `git add site/db/schema.ts site/db/gecisler site/tests/sema-oturum.test.ts` → `git commit -m "site: oturum ve hiz limiti semasi"`

---

### Task 3: İçerik, oy ve arşiv şeması

**Files:**
- Modify: `site/db/schema.ts`
- Create: `site/db/gecisler/0002_*.sql` (drizzle-kit üretir)
- Modify: `site/lib/oy-deposu.ts`, `site/lib/oy-hesabi.ts`
- Create: `site/lib/tipler.ts`
- Create: `site/tests/yardim.ts`, `site/tests/sema-icerik.test.ts`
- Modify: `site/tests/db.test.ts`, `site/tests/oy-hesabi.test.ts`

**Interfaces:**
- Produces: `HedefTuru`, `OgeTuru`, `Rol`, `Sayimlar` in `lib/tipler.ts`
- Changes: `oylar.moderasyonGeriAlindi`, `oylar.ziyaretciGeriAlindi`
- Changes: `videolar.kanalId` FK’sız metin; `kanalAdi`, `kanalHandle`, `kanalAvatar`

- [ ] **Step 1: Write the failing test**

```ts
// site/tests/sema-icerik.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';

let v: Awaited<ReturnType<typeof testDb>>;
before(async () => { v = await testDb(); });
after(async () => { await v.kapat(); });

test('oy geri alma alanları ve arşiv alanları vardır', async () => {
  const r = await v.db.execute(sql`select table_name, column_name from information_schema.columns where table_name in ('oylar','kanallar','videolar','ekleme_talepleri','yayin_surumleri')`);
  const c = (r.rows ?? r).map((x: any) => `${x.table_name}.${x.column_name}`);
  for (const ad of ['oylar.ziyaretci_geri_alindi','oylar.moderasyon_geri_alindi','oylar.geri_alan','oylar.geri_alma_gerekce','oylar.geri_alma_zamani','kanallar.avatar','kanallar.meta_guncelleme','kanallar.arsivlendi','kanallar.arsivleyen','videolar.kanal_adi','videolar.kanal_handle','videolar.kanal_avatar','videolar.meta_guncelleme','videolar.arsivlendi','videolar.arsivleyen','ekleme_talepleri.red_gerekce','yayin_surumleri.notlar']) assert.ok(c.includes(ad), ad);
  assert.ok(!c.includes('oylar.geri_alindi'));
});

test('videolar.kanal_id foreign key değildir', async () => {
  const r = await v.db.execute(sql`select count(*)::int as n from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey) where c.conrelid='videolar'::regclass and c.contype='f' and a.attname='kanal_id'`);
  assert.equal((r.rows ?? r)[0].n, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/sema-icerik.test.ts`
Expected: FAIL — `yardim.ts` yok / alanlar yok.

- [ ] **Step 3: Implement schema, types and test helper**

`lib/tipler.ts` içine `HedefTuru`, `OgeTuru`, `Rol`, `IcerikDurumu` ve `Sayimlar` (import type `Sayim`) koy; `oy-deposu.ts` bu tipleri buradan import etsin. `kanallar`’a `avatar`, `metaGuncelleme`, `arsivlendi default false`, `arsivleyen` ekle. `videolar`’da `kanalId` referanssız `text('kanal_id')` olsun; `kanalAdi`, `kanalHandle`, `kanalAvatar`, `metaGuncelleme`, `arsivlendi`, `arsivleyen` ekle. `oylar.geriAlindi` → `moderasyonGeriAlindi: boolean('moderasyon_geri_alindi').notNull().default(false)` (rename mevcut varsayılanı korur); `ziyaretciGeriAlindi: boolean('ziyaretci_geri_alindi').notNull().default(false)` ekle. `eklemeTalepleri.redGerekce`, `yayinSurumleri.notlar` ekle. Arşiv ve engel sorguları için indeks ekle.

Geçişi üret: `cd site; npm run db:uret -- --name icerik_arsiv`. Drizzle rename sorarsa **rename** seç; üretilen SQL’de `ALTER TABLE "oylar" RENAME COLUMN "geri_alindi" TO "moderasyon_geri_alindi"` olduğunu doğrula. Drop+add üretirse SQL’i elle rename’e çevir; mevcut oy verisi korunmalı.

`tests/yardim.ts`:
```ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import type { Veritabani } from '../lib/db.ts';

export async function testDb(): Promise<{ db: Veritabani; kapat: () => Promise<void> }> {
  const pg = new PGlite();
  const db = drizzle(pg) as Veritabani;
  await migrate(db as any, { migrationsFolder: fileURLToPath(new URL('../db/gecisler', import.meta.url)) });
  return { db, kapat: () => pg.close() };
}
```

`oy-hesabi.ts` `Oy` arayüzünü `{ deger; ziyaretciGeriAlindi?: boolean; moderasyonGeriAlindi?: boolean }` yap; `sayimYap` iki alandan biri `true` ise oyu atlar. `oy-deposu.ts` ve `tests/db.test.ts` alan adlarını güncelle; `tests/oy-hesabi.test.ts` geri alma testini yeni alanlarla yaz.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd site; node --test tests/sema-icerik.test.ts tests/db.test.ts tests/oy-hesabi.test.ts`
Expected: PASS.

- [ ] **Step 5: Build and commit**

Run: `cd site; npm run build`
Commit: `git add site/db/schema.ts site/db/gecisler site/lib/tipler.ts site/lib/oy-deposu.ts site/lib/oy-hesabi.ts site/tests/yardim.ts site/tests/sema-icerik.test.ts site/tests/db.test.ts site/tests/oy-hesabi.test.ts` → `git commit -m "site: icerik oy ve arsiv semasi"`

---

### Task 4: Tasarım tokenları, fontlar, kök düzen

**Files:**
- Modify: `site/app/stil.css`, `site/app/layout.tsx`
- Create: `site/app/fontlar.ts`, `site/app/fontlar/fraunces-variable.woff2`, `site/app/fontlar/manrope-variable.woff2`, `site/app/fontlar/OFL-Fraunces.txt`, `site/app/fontlar/OFL-Manrope.txt`
- Create: `site/app/bilesenler/kalkan.tsx`, `ust-bar.tsx`, `alt-bilgi.tsx`, `atla.tsx`, `kabuk.module.css`
- Create: `site/tests/tasarim-token.test.ts`, `site/tests/font.test.ts`

**Interfaces:**
- Produces: `fraunces`, `manrope` (`next/font/local`) in `app/fontlar.ts`
- Produces: `<Kalkan boyut={number} />`, `<UstBar kullanici={null} />`, `<AltBilgi veriSurumu={number|null} />`

- [ ] **Step 1: Write the failing tests**

```ts
// site/tests/tasarim-token.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../app/stil.css', import.meta.url), 'utf8');
const token = (ad: string) => css.match(new RegExp(`--${ad}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
function lum(hex: string) { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return .2126*c[0]+.7152*c[1]+.0722*c[2]; }
function oran(a: string, b: string) { const x = lum(a), y = lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
test('tokenlar spec ile aynı ve metin çiftleri WCAG AA', () => {
  const beklenen = { zemin:'#F7F3EB', yuzey:'#FFFDF8', murekkep:'#171A1C', ikincil:'#6B6861', cizgi:'#E3DCCF', sinyal:'#C9342B', 'sinyal-koyu':'#98251F', yesil:'#1E6B52', amber:'#A96416', kirmizi:'#B3261E', odak:'#2E6F95' };
  for (const [ad, deger] of Object.entries(beklenen)) assert.equal(token(ad), deger, ad);
  for (const [a,b] of [['murekkep','zemin'],['ikincil','zemin'],['sinyal','zemin'],['kirmizi','yuzey'],['yesil','yuzey'],['amber','yuzey'],['odak','zemin']]) assert.ok(oran(token(a)!, token(b)!) >= 4.5, `${a}/${b}`);
});
```

```ts
// site/tests/font.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
for (const ad of ['fraunces-variable.woff2', 'manrope-variable.woff2']) {
  test(`${ad} geçerli woff2`, () => {
    const b = readFileSync(new URL(`../app/fontlar/${ad}`, import.meta.url));
    assert.equal(b.subarray(0, 4).toString('ascii'), 'wOF2');
    assert.ok(b.length > 20_000);
  });
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd site; node --test tests/tasarim-token.test.ts tests/font.test.ts`
Expected: FAIL — dosyalar yok.

- [ ] **Step 3: Produce fonts and implement design shell**

Fontları Google Fonts deposundan indirip tek dosyaya subset et (çalışma anında istek yok). **Komutları depo kökünden çalıştır**; çıktı klasörü yoksa oluştur:
```powershell
New-Item -ItemType Directory -Force site/app/fontlar | Out-Null
curl.exe -L -o "$env:TEMP\Fraunces.ttf" "https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf"
curl.exe -L -o "$env:TEMP\Manrope.ttf" "https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/Manrope%5Bwght%5D.ttf"
python -m pip install --quiet --user fonttools brotli
python -m fontTools.subset "$env:TEMP\Fraunces.ttf" --unicodes="U+0000-024F,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2100-214F,U+2190-21FF" --layout-features='*' --flavor=woff2 --output-file=site/app/fontlar/fraunces-variable.woff2
python -m fontTools.subset "$env:TEMP\Manrope.ttf" --unicodes="U+0000-024F,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2100-214F,U+2190-21FF" --layout-features='*' --flavor=woff2 --output-file=site/app/fontlar/manrope-variable.woff2
curl.exe -L -o site/app/fontlar/OFL-Fraunces.txt "https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/OFL.txt"
curl.exe -L -o site/app/fontlar/OFL-Manrope.txt "https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt"
```
`app/fontlar.ts`:
```ts
import localFont from 'next/font/local';
export const fraunces = localFont({ src: './fontlar/fraunces-variable.woff2', variable: '--font-fraunces', weight: '100 900', display: 'swap' });
export const manrope = localFont({ src: './fontlar/manrope-variable.woff2', variable: '--font-manrope', weight: '200 800', display: 'swap' });
```
`stil.css`’te spec §4.2 tokenları, `:root`, koyu tema bloğu, reset, `body` fontu (`var(--font-manrope)`), başlık fontu (`var(--font-fraunces)`), `.kap { max-width: 1240px; margin-inline: auto; padding-inline: clamp(1rem, 4vw, 2rem); }`, `.okuma { max-width: 68ch; }`, `:focus-visible { outline: 3px solid var(--odak); outline-offset: 2px; }`, `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }`.

`layout.tsx` async olmasa da `fraunces.variable + manrope.variable` sınıflarını `<html>`e ekle; `<Atla />`, `<UstBar kullanici={null} />`, `<main id="icerik">`, `<AltBilgi veriSurumu={null} />` kur. Header: logo + Keşfet + Nasıl çalışır + db.json + Giriş. Footer: marka, gizlilik/koşullar/iletişim, GitHub, veri sürümü. `Kalkan` inline SVG; spec §14 geometrisi (şeffaf zemin, kırmızı gövde, koyu kenar, iki beyaz çeyrek) Task 8’de son haline getirilecek.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd site; node --test tests/tasarim-token.test.ts tests/font.test.ts`
Expected: PASS.

- [ ] **Step 5: Build and commit**

Run: `cd site; npm run build`
Commit: `git add site/app/stil.css site/app/layout.tsx site/app/fontlar.ts site/app/fontlar site/app/bilesenler site/tests/tasarim-token.test.ts site/tests/font.test.ts` → `git commit -m "site: tasarim tokenlari yerel fontlar ve kok duzen"`

---

### Task 5: Ortak arayüz bileşenleri

**Files:**
- Create: `site/app/bilesenler/dugme.tsx`, `rozet.tsx`, `oy-dugmesi.tsx`, `oy-tablosu.tsx`, `sonuc-paneli.tsx`, `icerik-karti.tsx`, `bildirim.tsx`, `onay-diyalogu.tsx`, `sayfa-basligi.tsx`, `bos-durum.tsx`, `iskelet.tsx`, `sekmeler.tsx`, `form-alani.tsx`, `hata-metni.tsx`
- Create: matching `*.module.css` files where styles are needed
- Modify: `site/app/bilesenler/kalkan.tsx` only if the shared logo needs a size prop

**Interfaces:**
- Produces: `<Dugme tur?: 'birincil'|'ikincil'|'tehlike'|'hayalet'; boyut?: 'normal'|'kucuk'; ...button props>`
- Produces: `<Rozet tur: 'konu'|'etiket'|'kararsiz'|'kilitli'|'yayinda'>`
- Produces: `<OyDugmesi deger sayi secili onSec engelli />`, `<OyTablosu satirlar sayimlar benimOylarim onOy />`, `<SonucPaneli sonuc sayimlar kilitli />`
- Produces: `<IcerikKarti kayit />`, `<OnayDiyalogu acik baslik onayla onIptal />`, `<Bildirim tur mesaj />`

- [ ] **Step 1: Build the primitives**

Her bileşen tek sorumluluk taşır; stiller aynı klasördeki CSS Module’de. `OyDugmesi` üçlü segmenttir: ok/soru/aşağı ok simgesi + sayı; `aria-pressed` ve `aria-label="<konu> için katılıyorum"` gibi erişilebilir ad. `OyTablosu` masaüstünde anlamsal `<table>`, mobilde aynı bilgiyi kart olarak gösterir; sekmeler `Konular` / `Etiketler`. `SonucPaneli` `aria-live="polite"`, ana konu/yan konular/etiketler/kararsızlar/eşik göstergesi. `OnayDiyalogu` native `<dialog>` + `showModal`, Escape ve odak tuzağı tarayıcıya bırakılır. `IcerikKarti` kapak/avatar `<img>` her zaman anlamlı `alt` taşır; `SayfaBasligi` tek `<h1>` üretir ve her sayfa onu kullanır. Tüm düğmeler en az 44 px yüksekliğinde.

- [ ] **Step 2: Build check**

Run: `cd site; npm run build`
Expected: `Compiled successfully`; TypeScript hataları yok.

- [ ] **Step 3: Manual smoke check**

`npm run dev` ile ana sayfayı aç; header/footer taşmıyor, klavye Tab sırası görünür odak halkası veriyor, koyu tema (`prefers-color-scheme`) okunuyor. Sonucu not et.

- [ ] **Step 4: Commit**

`git add site/app/bilesenler` → `git commit -m "site: ortak arayuz bilesenleri"`

---

### Task 6: İçerik okuma deposu ve Türkçe arama

**Files:**
- Create: `site/lib/icerik-deposu.ts`
- Create: `site/tests/icerik-deposu.test.ts`

**Interfaces:**
- Produces: `export function aramaAnahtari(metin: string): string`
- Produces: `export interface IcerikBasligi { tur; id; baslik; kanalId; kanalAdi; kanalHandle; avatar; olusturma; arsivlendi }`
- Produces: `export interface IcerikListeOgesi extends IcerikBasligi { sonuc: KayitSonucu; kilitli: boolean; oySayisi: number }`
- Produces: `export interface IcerikDetay { icerik; sayimlar; sonuc; kilitliSonuc; kilit }`
- Produces: `export async function icerikListele(db, girdi): Promise<{ kayitlar: IcerikListeOgesi[]; toplam: number; sayfa: number; sayfaBoyu: number }>`
- Produces: `export async function icerikGetir(db, tur, id, secenek?: { durum?: 'aktif'|'arsiv' }): Promise<IcerikDetay | null>`
- Produces: `export async function sonIcerikler(db, adet?: number): Promise<IcerikListeOgesi[]>`
- Produces: `export async function siteIstatistikleri(db): Promise<{ kayit: number; oy: number; yayinSurumu: number|null; sonYayin: Date|null }>`
- Produces: `export async function tumKayitlar(db, durum?: 'aktif'|'arsiv'): Promise<IcerikBasligi[]>`
- Produces: `export function videoKapak(id: string): string`

- [ ] **Step 1: Write the failing tests**

```ts
// site/tests/icerik-deposu.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { aramaAnahtari, icerikListele, icerikGetir, sonIcerikler, siteIstatistikleri, videoKapak } from '../lib/icerik-deposu.ts';

let v: Awaited<ReturnType<typeof testDb>>;
before(async () => {
  v = await testDb();
  await v.db.execute(sql`insert into kanallar (id, ad, handle, arsivlendi) values ('UC'||repeat('a',22), 'İnci Şölen', '@inci', false), ('UC'||repeat('b',22), 'Arşiv Kanal', '@arsiv', true)`);
  await v.db.execute(sql`insert into videolar (id, baslik, kanal_id, kanal_adi, arsivlendi) values ('dQw4w9WgXcQ', 'Örnek Video', 'UC'||repeat('a',22), 'İnci Şölen', false)`);
});
after(async () => { await v.kapat(); });

test('Türkçe arama katlaması İ/ı/ş/ğ duyarsızdır', () => {
  assert.equal(aramaAnahtari('İNCİ ŞÖLEN'), 'inci solen');
  assert.equal(aramaAnahtari('ığdır'), 'igdir');
});
test('liste arşivi dışlar, tür ve arama filtreler', async () => {
  const hepsi = await icerikListele(v.db, {});
  assert.equal(hepsi.toplam, 2);
  assert.ok(!hepsi.kayitlar.some(k => k.arsivlendi));
  const arama = await icerikListele(v.db, { arama: 'inci' });
  assert.deepEqual(arama.kayitlar.map(k => k.id).sort(), ['UC' + 'a'.repeat(22), 'dQw4w9WgXcQ'].sort());
  const video = await icerikListele(v.db, { tur: 'video' });
  assert.deepEqual(video.kayitlar.map(k => k.id), ['dQw4w9WgXcQ']);
});
test('detay arşivli kaydı gizler, arşiv modunda gösterir', async () => {
  assert.equal(await icerikGetir(v.db, 'kanal', 'UC' + 'b'.repeat(22)), null);
  assert.ok(await icerikGetir(v.db, 'kanal', 'UC' + 'b'.repeat(22), { durum: 'arsiv' }));
});
test('video kapağı YouTube adresidir', () => assert.equal(videoKapak('dQw4w9WgXcQ'), 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/icerik-deposu.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: Implement the read repository**

`aramaAnahtari`: `toLocaleLowerCase('tr-TR')`, sonra `ç→c, ğ→g, ı→i, İ→i, ö→o, ş→s, ü→u` ve combining dot temizliği. Listede önce `tumKayitlar` ile kanal/video satırlarını çek; kanalda `avatar`, videoda `kanalAvatar` alanını ortak `avatar` olarak eşle; arama varsa `aramaAnahtari` ile filtrele (kanalda `ad` + `handle`, videoda `baslik` + `kanalAdi` + `kanalHandle`); `olusturma` azalan, eşitlikte `id` artan sırala; sayfa boyu varsayılan 12; dilimle. Sayfa kayıtlarının oylarını hedef türü + `inArray` ile topluca çek, iki geri alma bayrağı `false` olanları `sonucHesapla` ile hesapla; aktif kilitleri topluca çek ve kilitli kayıtta `sonuc = kilit.sonuc`. `oySayisi` sayılan oyların toplamı. `icerikGetir` `sayimlariGetir` + `aktifKilit` kullanır; arşivli kayıt `durum:'arsiv'` verilmedikçe `null`. `siteIstatistikleri` aktif kayıt sayısı, iki bayrağı `false` oy sayısı, son `yayin_surumleri` satırı. Adsız video başlığı `Video {id}`, adsız kanal `Kanal {id}`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site; node --test tests/icerik-deposu.test.ts`
Expected: PASS.

- [ ] **Step 5: Build and commit**

Run: `cd site; npm run build`
Commit: `git add site/lib/icerik-deposu.ts site/tests/icerik-deposu.test.ts` → `git commit -m "site: icerik okuma deposu ve turkce arama"`

---

### Task 7: Ana sayfa, keşfet ve bağlantı alanı

**Files:**
- Create: `site/app/(kamusal)/page.tsx`, `site/app/(kamusal)/ana-sayfa.module.css`
- Create: `site/app/(kamusal)/kesfet/page.tsx`, `site/app/(kamusal)/kesfet/kesfet.module.css`
- Create: `site/app/bilesenler/link-formu.tsx`, `site/app/bilesenler/sayfalama.tsx`
- Delete after move: `site/app/page.tsx`, `site/app/adres-cubugu.tsx`

**Interfaces:**
- Consumes: `sonIcerikler`, `siteIstatistikleri`, `icerikListele`, `IcerikKarti`, `BosDurum`, `SayfaBasligi`, `linkCoz`
- Produces: URL sözleşmesi `/kesfet?arama=&tur=&sayfa=`

- [ ] **Step 1: Build the homepage**

Server component `export const dynamic = 'force-dynamic'`. Hero: H1 **“YouTube’un gürültüsünü birlikte süzüyoruz.”**, alt metin **“Video ve kanalların konusunu, uyarı etiketlerini topluluk oylarıyla belirliyoruz. Hesap gerekmez.”**, `LinkFormu`, sağda son kayıt varsa `IcerikKarti`, yoksa `BosDurum` (“Henüz kayıt yok. İlk kaydı editörler ekler.”). Altında üç istatistik (kayıt, oy, veri sürümü), son 6 kayıt, “Nasıl çalışır?” üç adımı (**Linki yapıştır → Konu ve etiketleri oyla → Sonuç eklentiye gider**) ve `db.json` indirme çağrısı. `id="nasil-calisir"` çapası.

`LinkFormu` client: input + **“Linki incele”**. Submit’te `linkCoz`; video/kanal ID ise `router.push('/icerik/{tur}/{id}')`; `@handle` ise `/kesfet?arama=...`; hata satır içi `role="alert"` + `aria-describedby`. Bu dilimde kayıtsız link talebi henüz yok; S3’te `/link` sayfasına yönlenecek.

- [ ] **Step 2: Build the explore page**

`searchParams: Promise<{ arama?: string; tur?: string; sayfa?: string }>` await edilir. `tur` yalnızca `video|kanal`; `sayfa` pozitif tam sayı, varsayılan 1. `icerikListele` ile 12’lik sayfa. Başlık **“Keşfet”**, arama formu (GET), tür bağlantıları **Tümü / Videolar / Kanallar**, sonuç sayısı, kart ızgarası, `Sayfalama`. Boş durum: **“Bu aramada kayıt bulunamadı.”** Mobilde tek sütun, 1280 px’te 3 sütun.

- [ ] **Step 3: Build and smoke check**

Run: `cd site; npm run build`
Expected: `Compiled successfully`.
Run: `cd site; npm run dev`; aç `/` ve `/kesfet?arama=inci`; 1280×800 ve 390×844’te yatay taşma yok; boş veride ana sayfa çökmeden boş durum gösteriyor.

- [ ] **Step 4: Commit**

`site/app/page.tsx` ve `site/app/adres-cubugu.tsx` dosyalarını sil (izlenmiyorsa yalnızca çalışma ağacından; izleniyorsa `git rm`). `git add "site/app/(kamusal)" site/app/bilesenler/link-formu.tsx site/app/bilesenler/sayfalama.tsx` → `git commit -m "site: ana sayfa ve kesfet"`

---

### Task 8: Kalkan ikonu, S1 doğrulaması ve checkpoint

**Files:**
- Modify: `scripts/ikon-uret.js`
- Create/Modify: `src/icons/icon{16,32,48,128}.png`, `chromium/icons/*`, `firefox/icons/*` (build çıktısı)
- Create: `site/public/kalkan.svg`, `site/public/ikon-{16,32,48,128}.png`, `site/app/icon.png`, `site/app/apple-icon.png`
- Create: `site/tests/ikon.test.ts`

**Interfaces:**
- Produces: 128×128 mağaza ikonunda 96×96 görsel + 16 px şeffaf çerçeve; 16/32/48/128 uzantı ikonları; site favicon ve header aynı işaret.

- [ ] **Step 1: Load the design skill and fix the geometry**

`canvas-design` becerisini yükle ve ikon üretim adımlarını onunla yürüt. Mevcut ikonun birebir kopyası değil, arıtılmış sürüm: şeffaf zemin; gövde `#C9342B`; ince kenar `#98251F`; iki beyaz çeyrek `#FFFDF8`; üst logaritmik sivrilen, omuzları kavisli kalkan. Tüm boyutlarda görsel alanın ortasında %12,5 boşluk bırak (128’de 16 px). 16 px’te kenar ve çeyrekler okunur kalmalı.

- [ ] **Step 2: Write the failing icon test**

```ts
// site/tests/ikon.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const boyut = (yol: string) => {
  const b = readFileSync(yol);
  assert.equal(b.subarray(1, 4).toString('ascii'), 'PNG');
  return b.readUInt32BE(16);
};

test('ikon üretimi beklenen boyutları ve şeffaf çerçeveyi üretir', () => {
  const kok = fileURLToPath(new URL('../../', import.meta.url));
  execFileSync('node', [`${kok}scripts/ikon-uret.js`], { cwd: kok, stdio: 'pipe' });
  for (const n of [16, 32, 48, 128]) assert.equal(boyut(`${kok}src/icons/icon${n}.png`), n);
  assert.equal(boyut(`${kok}site/app/icon.png`), 32);
  assert.equal(boyut(`${kok}site/app/apple-icon.png`), 180);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd site; node --test tests/ikon.test.ts`
Expected: FAIL — `site/app/icon.png` veya 180 üretimi yok.

- [ ] **Step 4: Implement icon outputs**

`scripts/ikon-uret.js` içinde paleti yeni tokenlara çevir, 4x süper örneklemeyi koru, 180 px üretimi ekle, `site/public/ikon-{16,32,48,128}.png`, `site/app/icon.png` (32) ve `site/app/apple-icon.png` (180) yaz. Piksel tamponunda 128 px çıktının dış 16 px halkasının tamamen `alpha=0` olduğunu doğrula; değilse betik hata versin. `site/public/kalkan.svg` aynı geometriyi `viewBox="0 0 128 128"` ile taşısın. Header’daki `Kalkan` bileşeni bu SVG’yi andırsın.

- [ ] **Step 5: Generate, verify, build**

Run: `node scripts/ikon-uret.js` → çıktıda “şeffaf çerçeve tamam”.
Run: `npm run build` (depo kökü; uzantı çıktılarını kopyalar) ve `npm run build:check` → `Tüm çıktılar güncel`.
Run: `cd site; node --test tests/ikon.test.ts` → PASS.
Run: `cd site; npm test` ve `cd site; npm run build` → yeşil.

- [ ] **Step 6: Commit and S1 checkpoint**

`git add scripts/ikon-uret.js src/icons chromium/icons firefox/icons site/public site/app/icon.png site/app/apple-icon.png site/tests/ikon.test.ts` → `git commit -m "site: kalkan ikonunu yenile ve S1 kapanisi"`
`git tag checkpoint-site-s1`

---

### Task 9: Ziyaretçi kimliği, istek yardımcıları ve hız sınırı

**Files:**
- Create: `site/lib/ziyaretci.ts`, `site/lib/hiz-limiti.ts`, `site/lib/hata.ts`, `site/lib/istek.ts`
- Create: `site/tests/altyapi.test.ts`

**Interfaces:**
- Produces: `ZIYARETCI_CEREZI`, `ziyaretciKimligi(req)`, `yeniZiyaretciKimligi()`, `ziyaretciCerezi(kimlik, guvenli)`, `kimlikEtiketi(tur, deger)`
- Produces: `limitAsildiMi(db, { anahtar, adet, pencereSaniye }, simdi?)`
- Produces: `sayacArtir(db, { anahtar, pencereSaniye }, simdi?, adet?)`, `sayacOku(db, { anahtar, pencereSaniye }, simdi?)`
- Produces: `class HttpHatasi extends Error { durum; kod; constructor(durum, kod, mesaj?) }`
- Produces: `ayniOriginMi(req)`, `ipOzeti(req)`, `jsonCevap(veri, durum?, basliklar?)`, `hataCevap(hata)`, `govdeOku<T>(req)`
- Constants: `OY_LIMITI_DAKIKA = Number(process.env.OY_LIMITI_DAKIKA ?? 120)`, `OY_LIMITI_GUN = Number(process.env.OY_LIMITI_GUN ?? 2000)`, `TALEP_LIMITI_SAAT = Number(process.env.TALEP_LIMITI_SAAT ?? 5)`, `GIRIS_LIMITI_15DK = Number(process.env.GIRIS_LIMITI_15DK ?? 10)`, `PANEL_YAZMA_LIMITI_DAKIKA = Number(process.env.PANEL_YAZMA_LIMITI_DAKIKA ?? 120)`

- [ ] **Step 1: Write the failing tests**

```ts
// site/tests/altyapi.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';

let v: Awaited<ReturnType<typeof testDb>>;
before(async () => { v = await testDb(); });
after(async () => { await v.kapat(); });

test('hız sınırı pencereyi sayar ve sıfırlar', async () => {
  const { limitAsildiMi } = await import('../lib/hiz-limiti.ts');
  const kural = { anahtar: 'test', adet: 2, pencereSaniye: 60 };
  const t = new Date('2026-10-27T10:00:00Z');
  assert.equal(await limitAsildiMi(v.db, kural, t), false);
  assert.equal(await limitAsildiMi(v.db, kural, t), false);
  assert.equal(await limitAsildiMi(v.db, kural, t), true);
  assert.equal(await limitAsildiMi(v.db, kural, new Date('2026-10-27T10:01:01Z')), false);
});

test('aynı origin ve IP özeti doğrulanır', async () => {
  process.env.IP_HASH_SECRET = 'test-anahtar';
  const { ayniOriginMi, ipOzeti } = await import('../lib/istek.ts');
  const iyi = new Request('http://localhost:3000/api/oylar', { method: 'PUT', headers: { origin: 'http://localhost:3000', 'x-forwarded-for': '203.0.113.5' } });
  assert.equal(ayniOriginMi(iyi), true);
  assert.equal(ayniOriginMi(new Request('http://localhost:3000/api/oylar', { method: 'PUT', headers: { origin: 'http://kotu.example' } })), false);
  process.env.SITE_ORIGIN = 'https://site.example';
  assert.equal(ayniOriginMi(new Request('http://site:3000/api/oylar', { method: 'PUT', headers: { origin: 'https://site.example' } })), true);
  assert.equal(ayniOriginMi(new Request('https://site.example/api/oylar', { method: 'PUT', headers: { origin: 'https://kotu.example' } })), false);
  delete process.env.SITE_ORIGIN;
  const h = ipOzeti(iyi)!;
  assert.match(h, /^[a-f0-9]{64}$/);
  assert.notEqual(h, '203.0.113.5');
});

test('ziyaretçi çerezi ve takma etiket ham kimliği sızdırmaz', async () => {
  const { yeniZiyaretciKimligi, ziyaretciCerezi, kimlikEtiketi } = await import('../lib/ziyaretci.ts');
  const k = yeniZiyaretciKimligi();
  assert.equal(k.length >= 40, true);
  const c = ziyaretciCerezi(k, false);
  for (const s of ['HttpOnly', 'SameSite=Lax', 'Max-Age=31536000', 'Path=/']) assert.ok(c.includes(s), s);
  assert.equal(c.includes('Secure'), false);
  assert.ok(ziyaretciCerezi(k, true).includes('Secure'));
  const e = kimlikEtiketi('cerez', k);
  assert.match(e, /^çerez:[a-f0-9]{8}$/);
  assert.equal(e.includes(k), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/altyapi.test.ts`
Expected: FAIL — modüller yok.

- [ ] **Step 3: Implement the helpers**

`ziyaretci.ts`: `randomBytes(32).toString('base64url')`; cookie parser `req.headers.get('cookie')`; `ziyaretciCerezi` üretimde `Secure` ekler. `kimlikEtiketi` değerin SHA-256 ilk 8 hex’i; `ağ` için de aynı. `hiz-limiti.ts`: pencere başlangıcı `Math.floor(simdi/window)*window`; `onConflictDoUpdate` ile `sayac + adet`; `sayacArtir` güncel sayacı döndürür, `sayacOku` yoksa `0` döndürür; `limitAsildiMi` = `sayacArtir(..., 1) > adet`. `istek.ts`: `ayniOriginMi` **önce `SITE_ORIGIN` ortam değişkenine** bakar (Caddy/proxy arkasında `req.url` iç origin’i gösterebilir); tanımlıysa `Origin` yalnızca bu değerle eşleşmeli, değilse `new URL(req.url).origin` ile karşılaştırılır. `Origin` yoksa veya eşleşmiyorsa `false`. IP `x-forwarded-for` ilk değer, HMAC `IP_HASH_SECRET` (yoksa `null`); `govdeOku` JSON parse hatasında `HttpHatasi(400,'gecersiz-govde')`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site; node --test tests/altyapi.test.ts`
Expected: PASS.

- [ ] **Step 5: Build and commit**

Run: `cd site; npm run build`
Commit: `git add site/lib/ziyaretci.ts site/lib/hiz-limiti.ts site/lib/hata.ts site/lib/istek.ts site/tests/altyapi.test.ts` → `git commit -m "site: ziyaretci kimligi hiz limiti ve istek yardimcilari"`

---

### Task 10: Oy servisi ve API’leri

**Files:**
- Modify: `site/lib/oy-deposu.ts`
- Create: `site/lib/oy-servisi.ts`, `site/lib/engel-deposu.ts`
- Create: `site/app/api/icerikler/route.ts`, `site/app/api/icerikler/[tur]/[id]/route.ts`
- Create: `site/app/api/oylar/route.ts`, `site/app/api/oylar/geri-al/route.ts`
- Create: `site/tests/oy-servisi.test.ts`, `site/tests/api-oy.test.ts`
- Modify: `site/tests/db.test.ts` (`benimOylarim` yeni alanları)

**Interfaces:**
- Produces: `export interface OySonucu { sayimlar: Sayimlar; sonuc: KayitSonucu; kilitliSonuc: KayitSonucu | null }`
- Produces: `oyKaydet(db, OyGirdisi): Promise<OySonucu>`
- Produces: `oyGeriAlZiyaretci(db, { hedefTuru, hedefId, ogeTuru, ogeId, tarayiciId }): Promise<OySonucu>`
- Produces: `benimOylarim(db, hedefTuru, hedefId, tarayiciId): Promise<{ ogeTuru; ogeId; deger; ziyaretciGeriAlindi; moderasyonGeriAlindi }[]>`
- Produces: `aktifEngelVarMi(db, { tarayiciId, ipOzeti }, simdi?): Promise<boolean>`
- API: `PUT /api/oylar`, `POST /api/oylar/geri-al`, `GET /api/icerikler`, `GET /api/icerikler/[tur]/[id]`

- [ ] **Step 1: Write the failing service tests**

```ts
// site/tests/oy-servisi.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { oyVer, sayimlariGetir, benimOylarim } from '../lib/oy-deposu.ts';
import { oyKaydet, oyGeriAlZiyaretci } from '../lib/oy-servisi.ts';
import { oylar, engeller } from '../db/schema.ts';

let v: Awaited<ReturnType<typeof testDb>>;
const H = { hedefTuru: 'kanal' as const, hedefId: 'UC' + 'c'.repeat(22) };
before(async () => { v = await testDb(); await v.db.execute((await import('drizzle-orm')).sql`insert into kanallar (id) values (${H.hedefId})`); });
after(async () => { await v.kapat(); });

test('ziyaretçi geri alması sayımdan düşer, yeniden oy verince temizlenir', async () => {
  await oyKaydet(v.db, { ...H, ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: 'z1' });
  const r = await oyGeriAlZiyaretci(v.db, { ...H, ogeTuru: 'konu', ogeId: 'spor', tarayiciId: 'z1' });
  assert.deepEqual(r.sayimlar.konular, {});
  assert.equal((await benimOylarim(v.db, 'kanal', H.hedefId, 'z1'))[0].ziyaretciGeriAlindi, true);
  await oyKaydet(v.db, { ...H, ogeTuru: 'konu', ogeId: 'spor', deger: 'down', tarayiciId: 'z1' });
  assert.equal((await benimOylarim(v.db, 'kanal', H.hedefId, 'z1'))[0].ziyaretciGeriAlindi, false);
  assert.deepEqual((await sayimlariGetir(v.db, 'kanal', H.hedefId)).konular.spor, { up: 0, kararsiz: 0, down: 1 });
});

test('moderasyon geri alması kalıcıdır; sahibi yeniden oy veremez', async () => {
  await oyKaydet(v.db, { ...H, ogeTuru: 'etiket', ogeId: 'ai', deger: 'up', tarayiciId: 'z2' });
  const [o] = await v.db.select().from(oylar).where(eq(oylar.tarayiciId, 'z2'));
  await v.db.update(oylar).set({ moderasyonGeriAlindi: true, geriAlmaGerekce: 'test' }).where(eq(oylar.id, o.id));
  await assert.rejects(oyKaydet(v.db, { ...H, ogeTuru: 'etiket', ogeId: 'ai', deger: 'up', tarayiciId: 'z2' }), /moderasyon/i);
});

test('engel aktifken oy sayılmaz, engel kalkınca geri gelir', async () => {
  await v.db.insert(engeller).values({ tur: 'tarayici', deger: 'z3' });
  await oyKaydet(v.db, { ...H, ogeTuru: 'konu', ogeId: 'muzik', deger: 'up', tarayiciId: 'z3' }).catch(() => null);
  assert.deepEqual((await sayimlariGetir(v.db, 'kanal', H.hedefId)).konular.muzik ?? {}, {});
  await v.db.delete(engeller).where(eq(engeller.deger, 'z3'));
  await oyVer(v.db, { ...H, ogeTuru: 'konu', ogeId: 'muzik', deger: 'up', tarayiciId: 'z3' });
  assert.deepEqual((await sayimlariGetir(v.db, 'kanal', H.hedefId)).konular.muzik, { up: 1, kararsiz: 0, down: 0 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/oy-servisi.test.ts`
Expected: FAIL — `oy-servisi.ts` yok.

- [ ] **Step 3: Implement service and routes**

`oyKaydet`: hedefin aktif kanal/video satırı var mı; yoksa `HttpHatasi(404,'icerik-yok')`. `aktifEngelVarMi` ise `403 'engelli'`. Mevcut satır `moderasyonGeriAlindi` ise `409 'moderasyon-geri-alindi'`. `oyVer` upsert’ında `ziyaretciGeriAlindi: false` yaz; moderasyon bayrağını **ezme**. Sonra `sayimlariGetir` + `aktifKilit`; `sonuc = kilit?.sonuc ?? sonucHesapla(...)`, `kilitliSonuc = kilit?.sonuc ?? null`. `oyGeriAlZiyaretci` yalnızca kendi satırını `ziyaretciGeriAlindi=true` yapar; moderasyon bayraklı satırda `409`.

`sayimlariGetir` iki bayrağı da dışlar ve aktif engelli çerez/IP oylarını `not exists` ile dışlar. `benimOylarim` iki bayrağı döndürür; `tests/db.test.ts` beklenenini güncelle.

Route’lar `export const dynamic = 'force-dynamic'`. `PUT` sırası **kesin olarak** şöyledir: (1) `ayniOriginMi` değilse `403 'origin'`; (2) `govdeOku` + alan doğrulaması, geçersizse `400` — bu adım hız limiti tüketmez; (3) mevcut `ytf_ziyaretci` çerezini ve `ipOzeti`’ni oku; (4) **hem çerez hem IP** sayaçlarını kontrol et: çerez varsa `cerez:{id}:dk` ve `cerez:{id}:gun`, IP varsa `ip:{hash}:dk` ve `ip:{hash}:gun`; herhangi biri `OY_LIMITI_DAKIKA`/`OY_LIMITI_GUN` aşılırsa `429`. Sayaçlar bu adımda artar; çerez yoksa önce yalnızca IP sayaçları kontrol edilir. (5) çerez yoksa `yeniZiyaretciKimligi()` üret ve `Set-Cookie`; ardından yeni çerezin `dk`/`gun` sayaçlarını da kaydet. (6) `oyKaydet`; `{ sayimlar, sonuc, kilitliSonuc }`. Böylece geçersiz gövde ve origin reddi hız limitini yemez; yeni ziyaretçi çerezi de IP limiti kontrolünden önce üretilmez. `POST geri-al`: origin → `govdeOku` → çerez yoksa `400 'ziyaretci-yok'` → çerez + IP hız limiti → servis; aynı gövde anahtarları. `GET /api/icerikler` query’yi `icerikListele`’ye verir. `GET /api/icerikler/[tur]/[id]` `params` await eder; arşivli/yok `404`; çerez varsa `benimOylarim` ekler. Hatalar `hataCevap` ile `{hata,kod}`.

- [ ] **Step 4: Write and run API tests**

```ts
// site/tests/api-oy.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.SITE_DB = 'pglite'; process.env.PGLITE_DIR = 'memory'; process.env.IP_HASH_SECRET = 't'; process.env.OY_LIMITI_DAKIKA = '2';
const { db, veritabaniKapat } = await import('../lib/db.ts');
const { PUT } = await import('../app/api/oylar/route.ts');
const { sql } = await import('drizzle-orm');
before(async () => { await (await db()).execute(sql`insert into kanallar (id) values ('UC'||repeat('d',22))`); });
after(async () => { await veritabaniKapat(); });

test('origin yoksa 403, geçersiz gövde 400, üçüncü istek 429', async () => {
  const govde = JSON.stringify({ hedefTuru: 'kanal', hedefId: 'UC' + 'd'.repeat(22), ogeTuru: 'konu', ogeId: 'spor', deger: 'up' });
  const istek = (origin?: string) => new Request('http://localhost:3000/api/oylar', { method: 'PUT', headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9', ...(origin ? { origin } : {}) }, body: govde });
  assert.equal((await PUT(istek())).status, 403);
  assert.equal((await PUT(new Request('http://localhost:3000/api/oylar', { method: 'PUT', headers: { origin: 'http://localhost:3000' }, body: '{' }))).status, 400);
  assert.equal((await PUT(istek('http://localhost:3000'))).status, 200);
  assert.equal((await PUT(istek('http://localhost:3000'))).status, 200);
  assert.equal((await PUT(istek('http://localhost:3000'))).status, 429);
});
```

Run: `cd site; node --test tests/oy-servisi.test.ts tests/api-oy.test.ts`
Expected: PASS.

- [ ] **Step 5: Build and commit**

Run: `cd site; npm test` ve `cd site; npm run build`
Commit: `git add site/lib/oy-deposu.ts site/lib/oy-servisi.ts site/lib/engel-deposu.ts site/app/api site/tests/oy-servisi.test.ts site/tests/api-oy.test.ts site/tests/db.test.ts` → `git commit -m "site: oy servisi ve anonim oy APIleri"`

---

### Task 11: İçerik sayfası ve oy arayüzü

**Files:**
- Create: `site/app/(kamusal)/icerik/[tur]/[id]/page.tsx`, `site/app/(kamusal)/icerik/[tur]/[id]/icerik.module.css`
- Create: `site/app/bilesenler/oy-alani.tsx`, `site/app/bilesenler/oy-alani.module.css`

**Interfaces:**
- Consumes: `icerikGetir`, `benimOylarim`, `sayimlariGetir`, `OyTablosu`, `SonucPaneli`, `Rozet`, `Bildirim`
- Produces: `generateMetadata({ params })`; arşivli/yok kayıt `notFound()`

- [ ] **Step 1: Build the server page**

`params: Promise<{ tur: string; id: string }>` await edilir; `tur` `kanal|video` değilse `notFound()`. `icerikGetir`; yoksa `notFound()`. Çerez varsa `benimOylarim`. Kapak: video `videoKapak(id)`, kanal avatarı veya baş harf rozeti. Başlık, kanal adı/handle, YouTube’da aç (dış bağlantı `target="_blank" rel="noreferrer"`), kilit bandı. Sağda yapışkan `SonucPaneli`, solda `OyAlani`. `generateMetadata` başlığı `<başlık> — YouTube Filter Store`.

- [ ] **Step 2: Build the client vote area**

`OyAlani` props: `hedef`, `baslangicSayimlar`, `baslangicSonuc`, `kilitliSonuc`, `benimOylarim`, `konular`, `etiketler`. Sekmeler **Konular / Etiketler**. Her satırda üç `OyDugmesi`; seçili oy dolu. Tıklamada iyimser güncelleme: seçim ve sayılar hemen değişir, `PUT /api/oylar`; başarıda sunucu yanıtıyla değiştir; hata/`429`/`409`’da önceki duruma dön ve `Bildirim` göster. **“Oyumu geri al”** yalnızca kendi aktif oyunda; `POST /api/oylar/geri-al`. `benimOylarim` satırında `moderasyonGeriAlindi` ise üç düğme kapalı ve **“Bu oy moderasyon tarafından geri alındı.”**; `ziyaretciGeriAlindi` ise seçim boş görünür ve yeniden oy verilebilir. Kilitliyse “Sonuç donduruldu; yeni oylar sayılır ama sonuç değişmez.” bandı; oylama yine açık. `aria-live="polite"` sonuç panelinde.

- [ ] **Step 3: Build and smoke check**

Run: `cd site; npm run build`
Run: `cd site; npm run dev`; bir kayıt sayfasında oy ver → sayı ve sonuç değişir; sayfa yenile → seçim korunur; geri al → sonuç düşer; 390 px’te sonuç paneli üstte özet, oy tabloları altta; klavyeyle üç düğme de seçilebilir.

- [ ] **Step 4: Commit**

`git add "site/app/(kamusal)/icerik" site/app/bilesenler/oy-alani.tsx site/app/bilesenler/oy-alani.module.css` → `git commit -m "site: icerik sayfasi ve oy arayuzu"`

---

### Task 12: Demo veri, S2 doğrulaması ve checkpoint

**Files:**
- Create: `site/scripts/demo-veri.mjs`
- Modify: `site/package.json` (`"demo:veri": "node scripts/demo-veri.mjs"`)

**Interfaces:**
- Produces: yalnızca geliştirme/test ortamında örnek kanal/video/oy; `NODE_ENV=production` iken çalışmayı reddeder.

- [ ] **Step 1: Implement demo data**

`db()` ile bağlan; `NODE_ENV === 'production'` ise hata. Tablo boş değilse “Demo veri zaten var” deyip çık. 2 kanal (`UC` + 22 karakter), 2 video, 6 tarayıcıdan spor/müzik/ai oyları ekle; `oyVer` kullan. Çıktı: eklenen kayıt/oy sayısı.

- [ ] **Step 2: Verify the slice**

Run: `cd site; npm test` → tüm testler PASS.
Run: `cd site; npm run build` → `Compiled successfully`.
Run: `cd site; npm run demo:veri`; `npm run dev`; `/`, `/kesfet`, bir video ve bir kanal sayfasını 1280×800 ve 390×844’te kontrol et. Oy ver/geri al; sayfa yenile.
Run: `git status --short` → yalnızca beklenen site dosyaları.

- [ ] **Step 3: Commit and checkpoint**

`git add site/scripts/demo-veri.mjs site/package.json` → `git commit -m "site: demo veri betigi ve S2 kapanisi"`
`git tag checkpoint-site-s2`

---

### Task 13: YouTube metadata çözücü

**Files:**
- Create: `site/lib/youtube-meta.ts`, `site/lib/youtube-kota.ts`
- Create: `site/tests/youtube-meta.test.ts`, `site/tests/youtube-kota.test.ts`

**Interfaces:**
- Produces: `export interface VideoMeta { tur:'video'; id; baslik: string | null; kanalId: string | null; kanalAdi: string | null; kanalHandle: string | null; kanalAvatar: string | null }`
- Produces: `export interface KanalMeta { tur:'kanal'; id; ad: string | null; handle: string | null; avatar: string | null }`
- Produces: `export type Meta = VideoMeta | KanalMeta`
- Produces: `export type MetaSonucu = Meta | { tur:'hata'; neden: string }`
- Produces: `export type MetaCozucu = (link: Exclude<LinkSonucu, { tur:'hata' }>) => Promise<MetaSonucu>`
- Produces: `metaCoz(link, secenek?: { fetch?: typeof fetch; apiKey?: string | null; kotaArtir?: (adet: number) => Promise<void> }): Promise<MetaSonucu>`
- Produces: `YOUTUBE_KOTA_GUNLUK = 10000`, `YOUTUBE_KOTA_UYARI = 8000`
- Produces: `kotaKullan(db, adet?, simdi?): Promise<{ kullanilan; kalan; uyari }>`, `kotaDurumu(db, simdi?): Promise<{ kullanilan; kalan; uyari }>`
- Produces: `kotaylaMetaCozucu(db, secenek?): MetaCozucu`

- [ ] **Step 1: Write the failing tests**

```ts
// site/tests/youtube-meta.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { metaCoz } from '../lib/youtube-meta.ts';

const yanit = (govde: unknown) => new Response(JSON.stringify(govde), { status: 200, headers: { 'content-type': 'application/json' } });

test('video oEmbed başlık ve kanal adı verir', async () => {
  const f = async (url: string) => { assert.match(url, /oembed/); return yanit({ title: 'Örnek Video', author_name: 'İnci Kanal', author_url: 'https://www.youtube.com/@inci' }); };
  const m = await metaCoz({ tur: 'video', id: 'dQw4w9WgXcQ' }, { fetch: f as typeof fetch, apiKey: null });
  assert.equal(m.tur, 'video'); if (m.tur === 'video') { assert.equal(m.baslik, 'Örnek Video'); assert.equal(m.kanalAdi, 'İnci Kanal'); assert.equal(m.kanalHandle, '@inci'); }
});

test('handle HTML fallback UC kimliğini bulur', async () => {
  const html = '<meta property="og:title" content="İnci Kanal"><meta property="og:image" content="https://yt3.ggpht.com/a"><link rel="canonical" href="https://www.youtube.com/@inci"><script>"channelId":"UC' + 'e'.repeat(22) + '"</script>';
  const f = async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
  const m = await metaCoz({ tur: 'kanal', handle: '@inci' }, { fetch: f as typeof fetch, apiKey: null });
  assert.equal(m.tur, 'kanal'); if (m.tur === 'kanal') { assert.equal(m.id, 'UC' + 'e'.repeat(22)); assert.equal(m.ad, 'İnci Kanal'); }
});

test('ağ hatasında video kimlikle döner, handle hata verir', async () => {
  const f = async () => { throw new Error('ağ yok'); };
  const v = await metaCoz({ tur: 'video', id: 'dQw4w9WgXcQ' }, { fetch: f as typeof fetch, apiKey: null });
  assert.equal(v.tur, 'video'); if (v.tur === 'video') assert.equal(v.id, 'dQw4w9WgXcQ');
  const k = await metaCoz({ tur: 'kanal', handle: '@yok' }, { fetch: f as typeof fetch, apiKey: null });
  assert.equal(k.tur, 'hata');
});
```

```ts
// site/tests/youtube-kota.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { testDb } from './yardim.ts';
import { kotaKullan, kotaDurumu } from '../lib/youtube-kota.ts';

test('günlük kota sayacı birikir, kalanı ve uyarıyı döndürür', async () => {
  const v = await testDb();
  try {
    const t = new Date('2026-10-27T10:00:00Z');
    const a = await kotaKullan(v.db, 1, t);
    assert.equal(a.kullanilan, 1); assert.equal(a.uyari, false);
    const b = await kotaKullan(v.db, 8000, t);
    assert.equal(b.kullanilan, 8001); assert.equal(b.uyari, true);
    const c = await kotaDurumu(v.db, t);
    assert.equal(c.kullanilan, 8001); assert.equal(c.kalan, 1999);
  } finally { await v.kapat(); }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd site; node --test tests/youtube-meta.test.ts tests/youtube-kota.test.ts`
Expected: FAIL — modüller yok.

- [ ] **Step 3: Implement resolver and quota**

Video: önce Data API (`videos?part=snippet&id=`) varsa; yoksa oEmbed `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={id}&format=json`. API varsa `channels?part=snippet&id=` ile avatar/handle. Kanal UC: Data API `channels?part=snippet&id=` veya HTML `og:title`, `og:image`, `"channelId":"UC…"`. Handle: Data API `channels?part=snippet&forHandle=@x` veya HTML `https://www.youtube.com/@x`. Zaman aşımı `AbortSignal.timeout(5000)`. HTML regex’leri `og:title`, `og:image`, `canonical`, `channelId`. Video ağ hatasında `{tur:'video', id, baslik:null, kanalId:null, ...}` döner; handle çözülemezse `{tur:'hata', neden:'Kanal kimliği bulunamadı.'}`. API anahtarı yoksa API çağrısı yapılmaz.

`youtube-kota.ts`: `kotaKullan` `sayacArtir(db, { anahtar:'youtube-kota', pencereSaniye:86400 }, simdi, adet)` kullanır; `kalan = max(0, YOUTUBE_KOTA_GUNLUK - kullanilan)`; `uyari = kullanilan >= YOUTUBE_KOTA_UYARI`. `kotaDurumu` aynı anahtarla `sayacOku` kullanır. `kotaylaMetaCozucu(db, secenek?)` `metaCoz`’u `apiKey = secenek?.apiKey || process.env.YOUTUBE_API_KEY || null` ve `kotaArtir: async (n) => { await kotaKullan(db, n); }` ile sarar. `metaCoz` Data API’ye istek attığı her seferde (yanıt başarılı ya da başarısız) `kotaArtir(1)` çağırır; kota kaydı hatası metadata sonucunu bozmaz (`catch` ile yutulur). Kota penceresi UTC günüdür; spec §11’deki günlük sayaç gereksinimini karşılar.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd site; node --test tests/youtube-meta.test.ts tests/youtube-kota.test.ts`
Expected: PASS.

- [ ] **Step 5: Build and commit**

Run: `cd site; npm run build`
Commit: `git add site/lib/youtube-meta.ts site/lib/youtube-kota.ts site/tests/youtube-meta.test.ts site/tests/youtube-kota.test.ts` → `git commit -m "site: youtube metadata cozucu ve gunluk kota sayaci"`

---

### Task 14: Link çözümleme, ekleme talebi ve `/link`

**Files:**
- Modify: `site/lib/icerik-deposu.ts` (`linkIleKayitBul`), `site/app/bilesenler/link-formu.tsx`
- Create: `site/lib/talep-deposu.ts`
- Create: `site/app/api/link/route.ts`, `site/app/api/talepler/route.ts`
- Create: `site/app/(kamusal)/link/page.tsx`, `site/app/(kamusal)/link/link.module.css`
- Create: `site/app/bilesenler/talep-formu.tsx`
- Create: `site/tests/talep-deposu.test.ts`

**Interfaces:**
- Produces: `linkIleKayitBul(db, link): Promise<{ kayit: IcerikBasligi; arsivli: boolean } | null>`
- Produces: `talepOlustur(db, { link, cozulen, metaCozucu?, tarayiciId, ipOzeti }): Promise<{ durum:'kayitli'; tur; id } | { durum:'talep'; talepId: string; yeni: boolean }>`
- API: `GET /api/link?url=`, `POST /api/talepler`
- Page: `/link?url=`

- [ ] **Step 1: Write the failing tests**

```ts
// site/tests/talep-deposu.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { talepOlustur } from '../lib/talep-deposu.ts';
import { eklemeTalepleri } from '../db/schema.ts';

let v: Awaited<ReturnType<typeof testDb>>;
before(async () => { v = await testDb(); });
after(async () => { await v.kapat(); });

test('aynı link tek talepte birleşir', async () => {
  const p = { link: 'https://youtu.be/dQw4w9WgXcQ', cozulen: { tur: 'video' as const, id: 'dQw4w9WgXcQ' }, tarayiciId: 'z', ipOzeti: null };
  const a = await talepOlustur(v.db, p);
  const b = await talepOlustur(v.db, p);
  assert.equal(a.durum, 'talep'); assert.equal(b.durum, 'talep');
  if (a.durum === 'talep' && b.durum === 'talep') { assert.equal(a.yeni, true); assert.equal(b.yeni, false); assert.equal(a.talepId, b.talepId); }
  assert.equal((await v.db.select().from(eklemeTalepleri)).length, 1);
  assert.equal((await v.db.select().from(eklemeTalepleri))[0].talepSayisi, 2);
});

test('handle metadata ile UC kimliğine çözülür; çözülemezse hata', async () => {
  const meta = async () => ({ tur: 'kanal' as const, id: 'UC' + 'f'.repeat(22), ad: 'Kanal', handle: '@k', avatar: null });
  const r = await talepOlustur(v.db, { link: 'https://youtube.com/@k', cozulen: { tur: 'kanal', handle: '@k' }, metaCozucu: meta, tarayiciId: 'z2', ipOzeti: null });
  assert.equal(r.durum, 'talep');
  const kayitlar = await v.db.select().from(eklemeTalepleri);
  assert.equal(kayitlar.some(k => k.anahtar === 'UC' + 'f'.repeat(22)), true);
  await assert.rejects(talepOlustur(v.db, { link: 'https://youtube.com/@yok', cozulen: { tur: 'kanal', handle: '@yok' }, metaCozucu: async () => ({ tur: 'hata', neden: 'yok' }), tarayiciId: 'z3', ipOzeti: null }), /Kanal kimliği/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/talep-deposu.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: Implement service and routes**

`linkIleKayitBul`: video ID → `videolar`; kanal UC → `kanallar`; handle → `lower(handle)` eşleşmesi. Arşivli kayıt da döner, `arsivli` alanıyla. `talepOlustur`: aktif kayıt varsa `{durum:'kayitli'}`; arşivli kayıt talebe düşer. Handle ise `metaCozucu` çağır; dönen `tur:'kanal'` ve `UC…` kimliği değilse `HttpHatasi(422,'kanal-cozulemedi','Kanal kimliği bulunamadı.')`; `anahtar` çözülen UC kimliğidir (handle değil), böylece `@k` ile `UC…` aynı talepte birleşir. `eklemeTalepleri` upsert (`hedefTuru`,`anahtar`): `talepSayisi + 1`, `sonTalep=now()`, `link`, `durum='bekliyor'`, `redGerekce=null`; red edilmiş talep yeniden açılır. `yeni` önceden satır yoksa `true`.

`GET /api/link`: `url` yok/geçersiz `400`; `linkIleKayitBul`; aktif `{durum:'kayitli',tur,id}`, arşivli `{durum:'arsiv',tur,id}`, yok `{durum:'kayitsiz',tur}`. `POST /api/talepler`: origin + 5/saat IP limiti; gövde `{url}`; `linkCoz`; `talepOlustur`’a `metaCozucu: kotaylaMetaCozucu(db)` ver; çerez yoksa üret ve `Set-Cookie`; `202` + `{durum:'talep', talepId}` veya `{durum:'kayitli',...}`.

`LinkFormu`’nu güncelle: geçerli linkte `GET /api/link?url=...`; `durum='kayitli'` ise `/icerik/{tur}/{id}`, `durum='arsiv'` veya `'kayitsiz'` ise `/link?url=...`; `@handle` dahil tüm geçerli linkler bu kontrolü kullanır; `linkCoz` hatası satır içi kalır. Böylece Task 7’deki S1 davranışı S3’te kayıt durumuna göre yönlendirmeye dönüşür.

`/link` server page: `url` yoksa açıklama; hata varsa `HataMetni`; kayıt aktifse `redirect`; arşivliyse **“Bu içerik arşivde; talep göndererek geri getirilmesini isteyebilirsiniz.”**; kayıtsızsa **“Bu içerik henüz kayıtlı değil.”** + `TalepFormu`. Form başarıda **“Talebiniz alındı. Editörler inceleyecek.”** gösterir.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site; node --test tests/talep-deposu.test.ts`
Expected: PASS.

- [ ] **Step 5: Build and commit**

Run: `cd site; npm test` ve `cd site; npm run build`
Commit: `git add site/lib/icerik-deposu.ts site/lib/talep-deposu.ts site/app/api/link site/app/api/talepler "site/app/(kamusal)/link" site/app/bilesenler/talep-formu.tsx site/app/bilesenler/link-formu.tsx site/tests/talep-deposu.test.ts` → `git commit -m "site: link cozumleme ve ekleme talebi"`

---

### Task 15: S3 doğrulaması ve checkpoint

- [ ] **Step 1: Verify**

Run: `cd site; npm test` → PASS.
Run: `cd site; npm run build` → `Compiled successfully`.
Run: `cd site; npm run dev`; `/` link alanı → kayıtlı link içerik sayfasına, kayıtsız link `/link` ekranına gider; talep gönder; aynı linki tekrar gönder → talep sayısı artar, yeni satır açılmaz.

- [ ] **Step 2: Checkpoint**

Run: `git status --short` → yalnızca beklenen dosyalar.
`git tag checkpoint-site-s3`

---

### Task 16: Parola, oturum ve yetki çekirdeği

**Files:**
- Create: `site/lib/parola.ts`, `site/lib/oturum.ts`, `site/lib/yetki.ts`
- Create: `site/tests/oturum.test.ts`

**Interfaces:**
- Produces: `parolaOzetle(parola)`, `parolaDogrula(parola, ozet)`, `parolaGecerliMi(parola)`
- Produces: `OTURUM_CEREZI`, `OturumKullanicisi`, `girisYap(db, { eposta, parola, ipOzeti, simdi? })`
- Produces: `oturumOku(db, token, simdi?)`, `oturumKapat(db, token)`, `hesapOturumlariniIptalEt(db, hesapId, haricToken?)`
- Produces: `parolaDegistir(db, { hesapId, mevcutParola, yeniParola, token, simdi? })`
- Produces: `oturumCerezi(token, sonKullanma)`, `kullaniciGerekli(db, req)`, `rolGerekli(db, req, roller)`, `panelKoruma(db, req, roller, secenek?: { adet?: number; simdi?: Date })`

- [ ] **Step 1: Write the failing tests**

```ts
// site/tests/oturum.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { parolaOzetle, parolaDogrula, parolaGecerliMi } from '../lib/parola.ts';
import { girisYap, oturumOku, oturumKapat, oturumCerezi, OTURUM_CEREZI } from '../lib/oturum.ts';
import { kullaniciGerekli, rolGerekli, panelKoruma } from '../lib/yetki.ts';
import { HttpHatasi } from '../lib/hata.ts';

let v: Awaited<ReturnType<typeof testDb>>; let hesapId: string;
before(async () => {
  v = await testDb();
  const ozet = await parolaOzetle('DogruParola123');
  const r = await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('Admin@Ornek.com', ${ozet}, 'admin') returning id`);
  hesapId = r.rows[0].id;
});
after(async () => { await v.kapat(); });

test('scrypt özeti doğrular, yanlış parolayı reddeder', async () => {
  assert.equal(parolaGecerliMi('kisa'), false);
  assert.equal(await parolaDogrula('DogruParola123', await parolaOzetle('DogruParola123')), true);
  assert.equal(await parolaDogrula('yanlis', await parolaOzetle('DogruParola123')), false);
});
test('giriş tokenı yalnızca özet olarak saklanır, süre ve rol kontrol edilir', async () => {
  const g = await girisYap(v.db, { eposta: 'admin@ornek.com', parola: 'DogruParola123', ipOzeti: null, simdi: new Date('2026-10-27T10:00:00Z') });
  const satir = await v.db.execute(sql`select token_ozeti from oturumlar where hesap_id = ${hesapId}`);
  assert.notEqual(satir.rows[0].token_ozeti, g.token);
  assert.equal((await oturumOku(v.db, g.token, new Date('2026-10-27T10:01:00Z')))?.rol, 'admin');
  assert.equal(await oturumOku(v.db, g.token, new Date('2026-12-01T10:00:00Z')), null);
  const c = oturumCerezi(g.token, g.sonKullanma);
  assert.ok(c.includes('HttpOnly') && c.includes('SameSite=Lax'));
  const req = new Request('http://localhost:3000/panel', { headers: { cookie: `${OTURUM_CEREZI}=${g.token}` } });
  assert.equal((await rolGerekli(v.db, req, ['admin'])).id, hesapId);
  await assert.rejects(rolGerekli(v.db, req, ['editor']), (e: any) => e instanceof HttpHatasi && e.durum === 403);
  const panelSimdi = new Date('2026-10-27T10:01:00Z');
  assert.equal((await panelKoruma(v.db, req, ['admin'], { adet: 1, simdi: panelSimdi })).id, hesapId);
  await assert.rejects(panelKoruma(v.db, req, ['admin'], { adet: 1, simdi: panelSimdi }), (e: any) => e instanceof HttpHatasi && e.durum === 429);
  await oturumKapat(v.db, g.token);
  assert.equal(await oturumOku(v.db, g.token, new Date('2026-10-27T10:02:00Z')), null); // çıkış/iptal sonrası
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/oturum.test.ts`
Expected: FAIL — modüller yok.

- [ ] **Step 3: Implement auth core**

`parola.ts`: `scrypt` N=32768, r=8, p=1, 16 bayt salt, 64 bayt anahtar, `maxmem: 64*1024*1024`; biçim `scrypt$N$r$p$salt$hash`; `timingSafeEqual`; min 12 karakter. `oturum.ts`: 32 bayt token base64url, SHA-256 hex özeti DB’de; `sonKullanma` = min(now+7g, olusturma+30g), okuma sırasında 5 dakikadan eski `sonGorulme` ise kaydı sürdür; pasif hesap reddedilir. `girisYap` e-postayı **`trim().toLocaleLowerCase('tr-TR')`** ile normalize edip öyle arar; kayıt sırasında da aynı normalizasyon kullanılır. `yetki.ts`: request cookie’sinden `ytf_oturum`; yoksa `HttpHatasi(401,'oturum-yok')`; rol yoksa `403 'yetki-yok'`. `panelKoruma`: `rolGerekli` sonrası `limitAsildiMi(db, { anahtar: 'panel:' + kullanici.id, adet: secenek.adet ?? PANEL_YAZMA_LIMITI_DAKIKA, pencereSaniye: 60 }, secenek.simdi)`; aşılırsa `HttpHatasi(429,'hiz-limiti')`. `parolaDegistir`: mevcut parola doğrula, yeni parola 12+, `parolaDegistirmeli=false`, aynı hesabın diğer oturumlarını sil (mevcut token hariç).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site; node --test tests/oturum.test.ts`
Expected: PASS.

- [ ] **Step 5: Build and commit**

Run: `cd site; npm run build`
Commit: `git add site/lib/parola.ts site/lib/oturum.ts site/lib/yetki.ts site/tests/oturum.test.ts` → `git commit -m "site: parola oturum ve yetki cekirdegi"`

---

### Task 17: Giriş/çıkış API’leri, ilk admin ve oturum sayfaları

**Files:**
- Create: `site/lib/hesap-deposu.ts`, `site/lib/sunucu-oturum.ts`
- Create: `site/app/api/oturum/route.ts`, `site/app/api/oturum/ben/route.ts`, `site/app/api/oturum/parola/route.ts`
- Create: `site/app/(oturum)/giris/page.tsx`, `site/app/(oturum)/giris/giris.module.css`
- Create: `site/app/(oturum)/sifre-degistir/page.tsx`
- Create: `site/app/bilesenler/giris-formu.tsx`, `cikis-dugmesi.tsx`, `parola-formu.tsx`
- Create: `site/scripts/ilk-admin.mjs`
- Modify: `site/app/layout.tsx`, `site/app/bilesenler/ust-bar.tsx`, `site/package.json` (`"ilk-admin": "node scripts/ilk-admin.mjs"`)
- Create: `site/tests/hesap-giris.test.ts`

**Interfaces:**
- Produces: `ilkAdminOlustur(db, { eposta, parola }): Promise<{ id; eposta; rol }>`
- Produces: `siteKullanici(): Promise<OturumKullanicisi | null>`; `sunucuRolGerekli(roller): Promise<OturumKullanicisi>`
- API: `POST/DELETE /api/oturum`, `GET /api/oturum/ben`, `POST /api/oturum/parola`

- [ ] **Step 1: Write the failing tests**

```ts
// site/tests/hesap-giris.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { testDb } from './yardim.ts';
import { ilkAdminOlustur } from '../lib/hesap-deposu.ts';
import { girisYap, parolaDegistir } from '../lib/oturum.ts';

let v: Awaited<ReturnType<typeof testDb>>;
before(async () => { v = await testDb(); });
after(async () => { await v.kapat(); });

test('ilk admin yalnızca hiç hesap yokken oluşturulur ve ilk girişte parola değiştirmelidir', async () => {
  const a = await ilkAdminOlustur(v.db, { eposta: 'Admin@Ornek.com', parola: 'GeciciParola123' });
  assert.equal(a.rol, 'admin');
  await assert.rejects(ilkAdminOlustur(v.db, { eposta: 'b@ornek.com', parola: 'GeciciParola123' }), /zaten/i);
  const g = await girisYap(v.db, { eposta: 'admin@ornek.com', parola: 'GeciciParola123', ipOzeti: null });
  assert.equal(g.kullanici.parolaDegistirmeli, true);
  await parolaDegistir(v.db, { hesapId: g.kullanici.id, mevcutParola: 'GeciciParola123', yeniParola: 'YeniParola1234', token: g.token });
  const g2 = await girisYap(v.db, { eposta: 'admin@ornek.com', parola: 'YeniParola1234', ipOzeti: null });
  assert.equal(g2.kullanici.parolaDegistirmeli, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/hesap-giris.test.ts`
Expected: FAIL — `hesap-deposu.ts` yok.

- [ ] **Step 3: Implement accounts, pages and routes**

`ilkAdminOlustur`: e-postayı **`trim().toLocaleLowerCase('tr-TR')`** ile normalize et; `select count(*)`; sıfır değilse `HttpHatasi(409,'hesap-var','Zaten bir hesap var.')`; parola özeti + rol admin + `parolaDegistirmeli=true`. `scripts/ilk-admin.mjs`: `ILK_ADMIN_EPOSTA`/`ILK_ADMIN_PAROLA` zorunlu; `await db()`; çağır; sonuç yaz.

`/api/oturum` POST: origin; giriş limiti `giris:{ipOzeti(req) ?? 'ip-yok'}:{sha256(trim().toLocaleLowerCase('tr-TR'))}` 10/15 dk; `girisYap`; `Set-Cookie` `ytf_oturum`; `{kullanici}`. Hatalı giriş **“E-posta veya parola hatalı.”** (hesap varlığını sızdırmaz). DELETE: cookie tokenı `oturumKapat`, cookie sil. `/api/oturum/ben`: token yoksa 401; varsa kullanıcı. `/api/oturum/parola`: oturum + origin; `parolaDegistir`; `200`.

`app/layout.tsx` async: `const kullanici = await siteKullanici()`; `UstBar kullanici={kullanici}`; oturum varsa **Panel** + **Çıkış**, yoksa **Giriş**. `CikisDugmesi` client `DELETE /api/oturum` → `/`. `/giris` formu e-posta/parola; başarıda `parolaDegistirmeli ? '/sifre-degistir' : '/panel'`. `/sifre-degistir` oturum ister; yeni parola iki kez; başarıda `/panel`.

- [ ] **Step 4: Run tests and build**

Run: `cd site; node --test tests/hesap-giris.test.ts`
Run: `cd site; npm test` ve `cd site; npm run build`
Expected: PASS / `Compiled successfully`.

- [ ] **Step 5: Commit**

`git add site/lib/hesap-deposu.ts site/lib/sunucu-oturum.ts site/app/api/oturum "site/app/(oturum)" site/app/bilesenler/giris-formu.tsx site/app/bilesenler/cikis-dugmesi.tsx site/app/bilesenler/parola-formu.tsx site/scripts/ilk-admin.mjs site/app/layout.tsx site/app/bilesenler/ust-bar.tsx site/package.json site/tests/hesap-giris.test.ts` → `git commit -m "site: giris cikis ilk admin ve oturum sayfalari"`

---

### Task 18: Editör paneli iskeleti, özet ve kayıt ekleme

**Files:**
- Create: `site/app/panel/layout.tsx`, `site/app/panel/page.tsx`, `site/app/panel/panel.module.css`
- Create: `site/app/panel/icerikler/page.tsx`
- Create: `site/app/api/panel/icerikler/route.ts`
- Create: `site/lib/icerik-yaz.ts`, `site/lib/panel-deposu.ts`
- Create: `site/app/bilesenler/icerik-ekle-formu.tsx`
- Create: `site/tests/icerik-yaz.test.ts`

**Interfaces:**
- Produces: `icerikEkle(db, { cozulen, meta, ekleyen }): Promise<{ durum:'eklendi'|'vardi'|'arsivden'; tur; id }>`
- Produces: `panelOzeti(db): Promise<{ bekleyenTalep; toplamOy; kilitli; sonModerasyon: ...[]; kota: { kullanilan; kalan; uyari } }>`
- API: `POST /api/panel/icerikler`

- [ ] **Step 1: Write the failing tests**

```ts
// site/tests/icerik-yaz.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { icerikEkle } from '../lib/icerik-yaz.ts';
import { kanallar, videolar, oylar } from '../db/schema.ts';

let v: Awaited<ReturnType<typeof testDb>>; let editor: string;
before(async () => { v = await testDb(); editor = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('e@x','x','editor') returning id`)).rows[0].id; });
after(async () => { await v.kapat(); });

test('video eklemek kanal satırı oluşturmaz; kanal bilgisi videoda durur', async () => {
  const r = await icerikEkle(v.db, { cozulen: { tur: 'video', id: 'dQw4w9WgXcQ' }, meta: { tur: 'video', id: 'dQw4w9WgXcQ', baslik: 'V', kanalId: 'UC' + 'g'.repeat(22), kanalAdi: 'K', kanalHandle: '@k', kanalAvatar: null }, ekleyen: editor });
  assert.equal(r.durum, 'eklendi');
  assert.equal((await v.db.select().from(kanallar)).length, 0);
  assert.equal((await v.db.select().from(videolar))[0].kanalAdi, 'K');
});

test('metadata boşken video yalnızca kimlikle eklenir, alanlar null kalır', async () => {
  const r = await icerikEkle(v.db, { cozulen: { tur: 'video', id: 'aaaaaaaaaaa' }, meta: { tur: 'video', id: 'aaaaaaaaaaa', baslik: null, kanalId: null, kanalAdi: null, kanalHandle: null, kanalAvatar: null }, ekleyen: editor });
  assert.equal(r.durum, 'eklendi');
  const s = (await v.db.select().from(videolar)).find(x => x.id === 'aaaaaaaaaaa')!;
  assert.equal(s.baslik, null);
  assert.equal(s.kanalId, null);
  assert.equal(s.kanalAdi, null);
});

test('arşivli kayıt aynı linkle geri gelir, oylar korunur', async () => {
  const id = 'UC' + 'h'.repeat(22);
  await v.db.execute(sql`insert into kanallar (id, ad, arsivlendi) values (${id}, 'Eski', true)`);
  await v.db.execute(sql`insert into oylar (hedef_turu, hedef_id, oge_turu, oge_id, deger, tarayici_id) values ('kanal', ${id}, 'konu', 'spor', 'up', 'z')`);
  const r = await icerikEkle(v.db, { cozulen: { tur: 'kanal', id }, meta: { tur: 'kanal', id, ad: 'Yeni', handle: '@y', avatar: null }, ekleyen: editor });
  assert.equal(r.durum, 'arsivden');
  const k = (await v.db.select().from(kanallar)).find(x => x.id === id)!;
  assert.equal(k.arsivlendi, false); assert.equal(k.ad, 'Yeni');
  assert.equal((await v.db.select().from(oylar)).length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/icerik-yaz.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: Implement write service and panel**

`icerikEkle`: kanalda `id` ile ara; varsa aktifse `vardi`, arşivliyse metadata güncelle + `metaGuncelleme=now()` + `arsivlendi=false` + `arsivleyen=null` + moderasyon `geri-getir`; yoksa ekle. Videoda aynı; kanal satırı **oluşturma**; `kanalId` FK’sız yaz. Metadata boşsa `baslik=null`, `ad=null`; görünüm fallback’i `icerik-deposu` tarafında.

`/api/panel/icerikler` POST: `panelKoruma(db, req, ['editor','admin'])`, origin, gövde `{url}`, `linkCoz`, `kotaylaMetaCozucu(db)`, `icerikEkle`; `201`/`200`; `422` metadata hatası. `panelOzeti` ayrıca `kotaDurumu(db)` ekler. `panel/layout.tsx`: `sunucuRolGerekli(['editor','admin'])`; sol menü **Özet, İçerikler, Talepler, Moderasyon, Engeller**; mobilde yatay. `/panel`: bekleyen talep, toplam oy, kilitli kayıt, son moderasyon; `kota.uyari` ise **“YouTube API kotası yaklaşıyor: {kullanilan}/{YOUTUBE_KOTA_GUNLUK}. HTML/oEmbed fallback kullanılabilir.”** uyarısı. `/panel/icerikler`: arama + yeni link formu + liste. Form başarıda sayfayı yeniler; hata `HataMetni`.

- [ ] **Step 4: Run tests and build**

Run: `cd site; node --test tests/icerik-yaz.test.ts`
Run: `cd site; npm test` ve `cd site; npm run build`

- [ ] **Step 5: Commit**

`git add site/app/panel site/app/api/panel/icerikler site/lib/icerik-yaz.ts site/lib/panel-deposu.ts site/app/bilesenler/icerik-ekle-formu.tsx site/tests/icerik-yaz.test.ts` → `git commit -m "site: editor paneli ve kayit ekleme"`

---

### Task 19: Talep kuyruğu

**Files:**
- Modify: `site/lib/talep-deposu.ts`
- Create: `site/app/api/panel/talepler/[id]/route.ts`
- Create: `site/app/panel/talepler/page.tsx`, `site/app/bilesenler/talep-islem.tsx`
- Create: `site/tests/talep-isle.test.ts`

**Interfaces:**
- Produces: `talepleriListele(db, { durum? }): Promise<TalepSatiri[]>`
- Produces: `talepIsle(db, { talepId, karar, gerekce?, yapan, metaCozucu? }): Promise<{ durum:'kabul'|'red'; hedef?: { tur; id } }>`

- [ ] **Step 1: Write the failing test**

```ts
// site/tests/talep-isle.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { talepOlustur, talepIsle } from '../lib/talep-deposu.ts';

let v: Awaited<ReturnType<typeof testDb>>; let editor: string;
before(async () => { v = await testDb(); editor = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('e@x','x','editor') returning id`)).rows[0].id; });
after(async () => { await v.kapat(); });

test('kabul video kaydı oluşturur, kanal satırı açmaz; red gerekçe ister', async () => {
  const t = await talepOlustur(v.db, { link: 'https://youtu.be/dQw4w9WgXcQ', cozulen: { tur: 'video', id: 'dQw4w9WgXcQ' }, tarayiciId: 'z', ipOzeti: null });
  if (t.durum !== 'talep') throw new Error('talep bekleniyordu');
  const meta = async () => ({ tur: 'video' as const, id: 'dQw4w9WgXcQ', baslik: 'V', kanalId: 'UC' + 'i'.repeat(22), kanalAdi: 'K', kanalHandle: null, kanalAvatar: null });
  const r = await talepIsle(v.db, { talepId: t.talepId, karar: 'kabul', yapan: editor, metaCozucu: meta });
  assert.equal(r.durum, 'kabul');
  assert.equal((await v.db.execute(sql`select count(*)::int as n from kanallar`)).rows[0].n, 0);
  await assert.rejects(talepIsle(v.db, { talepId: t.talepId, karar: 'red', yapan: editor }), (e: any) => e?.durum === 409 && e?.kod === 'islenmis');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/talep-isle.test.ts`
Expected: FAIL — `talepIsle` yok.

- [ ] **Step 3: Implement queue**

`talepIsle`: talebi `bekliyor` değilse `409 'islenmis'`; `kabul` ise `linkCoz` + `metaCozucu` + `icerikEkle(..., ekleyen: yapan)`; hedefi talebe yaz (`durum='kabul'`, `isleyen`, `redGerekce=null`); moderasyon `talep-kabul` (ayrıntıda talepId/hedef). `red` ise gerekçe zorunlu, `durum='red'`, `redGerekce`, moderasyon `talep-red`. `/api/panel/talepler/[id]` route’u `panelKoruma(['editor','admin'])` + origin kullanır ve `metaCozucu: kotaylaMetaCozucu(db)` geçirir. UI: `/panel/talepler` bekleyenler; **Kabul** / **Reddet** (gerekçe dialogu); işlenmişler sekmesi.

- [ ] **Step 4: Run tests and build**

Run: `cd site; node --test tests/talep-isle.test.ts`; `cd site; npm test`; `cd site; npm run build`

- [ ] **Step 5: Commit**

`git add site/lib/talep-deposu.ts site/app/api/panel/talepler site/app/panel/talepler site/app/bilesenler/talep-islem.tsx site/tests/talep-isle.test.ts` → `git commit -m "site: ekleme talebi kuyrugu"`

---

### Task 20: S4 doğrulaması ve checkpoint

- [ ] **Step 1: Verify**

Run: `cd site; npm test` → PASS.
Run: `cd site; npm run build` → `Compiled successfully`.
Run: `cd site; npm run ilk-admin` (geçici parola ile) → giriş → parola değiştir → `/panel`.
Run: editörle yeni video ekle, talebi kabul et; kanal satırı oluşmadığını panelde doğrula.

- [ ] **Step 2: Checkpoint**

`git status --short` → yalnızca beklenen dosyalar. `git tag checkpoint-site-s4`

---

### Task 21: Moderasyon servisi — geri alma, kilit, engel

**Files:**
- Create: `site/lib/moderasyon-deposu.ts`
- Create: `site/lib/bakim.ts`, `site/scripts/bakim.mjs`
- Modify: `site/lib/engel-deposu.ts` (aktif engel sorgusu süre kontrolüyle)
- Modify: `site/lib/oy-deposu.ts` (yalnızca `sayimlariGetir` engel filtresi gerekiyorsa)
- Modify: `site/package.json` (`"bakim": "node scripts/bakim.mjs"`)
- Create: `site/tests/moderasyon.test.ts`, `site/tests/bakim.test.ts`

**Interfaces:**
- Produces: `type GeriAlmaKapsami = 'tek' | 'cerez-kayit' | 'cerez-site'`
- Produces: `type EngelKapsami = 'cerez' | 'ag'`
- Produces: `interface OySatiri { id; ogeTuru; ogeId; deger; etiket; ipEtiketi: string | null; durum: 'aktif' | 'ziyaretci-geri-alindi' | 'moderasyon-geri-alindi' | 'engelli'; olusturma; guncelleme }`
- Produces: `interface EngelSatiri { id; tur: 'tarayici' | 'ip'; etiket; sebep; yapanEposta; olusturma; bitis }`
- Produces: `interface ModerasyonSatiri { id; islem; yapanEposta; hedefTuru; hedefId; gerekce; ayrinti; zaman }`
- Produces: `oySatirlari(db, hedefTuru, hedefId, simdi?): Promise<OySatiri[]>`
- Produces: `oyGeriAlModerasyon(db, { oyId, kapsam, yapan, gerekce }): Promise<{ adet: number; etiket: string }>`
- Produces: `kayitKilitle(db, { hedefTuru, hedefId, yapan, gerekce }): Promise<void>`
- Produces: `kayitKilidiniAc(db, { hedefTuru, hedefId, yapan, gerekce }): Promise<boolean>`
- Produces: `engelle(db, { oyId, kapsam, yapan, gerekce, bitis? }): Promise<{ id: string; etiket: string }>`
- Produces: `engelleriListele(db, simdi?): Promise<EngelSatiri[]>`
- Produces: `engelKaldir(db, { engelId, yapan, gerekce }): Promise<void>`
- Produces: `moderasyonGecmisi(db, { limit? }?): Promise<ModerasyonSatiri[]>`
- Produces: `interface BakimSonucu { ipOzeti: number; oturum: number; engel: number; hizLimiti: number }`
- Produces: `bakimYap(db, { simdi?, ipGun? }?): Promise<BakimSonucu>`

- [ ] **Step 1: Write the failing tests**

```ts
// site/tests/moderasyon.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { oylar, kanallar } from '../db/schema.ts';
import { oyVer, sayimlariGetir, aktifKilit } from '../lib/oy-deposu.ts';
import { oyKaydet } from '../lib/oy-servisi.ts';
import {
  oySatirlari, oyGeriAlModerasyon, kayitKilitle, kayitKilidiniAc,
  engelle, engelleriListele, engelKaldir, moderasyonGecmisi,
} from '../lib/moderasyon-deposu.ts';

const A = 'UC' + 'm'.repeat(22);
const B = 'UC' + 'n'.repeat(22);
const C = 'UC' + 'o'.repeat(22);
const D = 'UC' + 'p'.repeat(22);
const E = 'UC' + 'q'.repeat(22);
let v: Awaited<ReturnType<typeof testDb>>; let admin: string;

before(async () => {
  v = await testDb();
  admin = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('m@x','x','admin') returning id`)).rows[0].id;
  await v.db.execute(sql`insert into kanallar (id) values (${A}), (${B}), (${C}), (${D}), (${E})`);
});
after(async () => { await v.kapat(); });

async function oy(hedefId: string, cookie: string, ogeTuru: 'konu' | 'etiket', ogeId: string, ipOzeti: string | null = null) {
  await oyVer(v.db, { hedefTuru: 'kanal', hedefId, ogeTuru, ogeId, deger: 'up', tarayiciId: cookie, ipOzeti });
}

test('panel oy satırları yalnızca kısa etiket ve durum döndürür', async () => {
  await oy(A, 's1', 'konu', 'spor', 'hash-s1');
  await oy(A, 's1', 'etiket', 'ai');
  const satirlar = await oySatirlari(v.db, 'kanal', A);
  assert.equal(satirlar.length, 2);
  assert.ok(satirlar.every(s => s.etiket.startsWith('çerez:')));
  assert.ok(satirlar.some(s => s.ipEtiketi?.startsWith('ağ:')));
  assert.equal(JSON.stringify(satirlar).includes('s1'), false);
  assert.equal(JSON.stringify(satirlar).includes('hash-s1'), false);
  assert.equal(satirlar.every(s => s.durum === 'aktif'), true);
});

test('tek oy geri alma yalnızca seçili satırı kapatır', async () => {
  const [spor] = await v.db.select().from(oylar).where(and(eq(oylar.tarayiciId, 's1'), eq(oylar.hedefId, A), eq(oylar.ogeId, 'spor')));
  const r = await oyGeriAlModerasyon(v.db, { oyId: spor.id, kapsam: 'tek', yapan: admin, gerekce: 'tek test' });
  assert.equal(r.adet, 1);
  const sonra = await oySatirlari(v.db, 'kanal', A);
  assert.equal(sonra.filter(s => s.durum === 'moderasyon-geri-alindi').length, 1);
  assert.equal(sonra.filter(s => s.ogeId === 'ai' && s.durum === 'aktif').length, 1);
  await assert.rejects(
    oyGeriAlModerasyon(v.db, { oyId: spor.id, kapsam: 'tek', yapan: admin, gerekce: 'tekrar' }),
    (e: any) => e.durum === 409,
  );
});

test('çerezin kayıttaki ve tüm sitedeki oyları ayrı kapsamlarla geri alınır', async () => {
  await oy(A, 's2', 'konu', 'spor'); await oy(A, 's2', 'etiket', 'ai'); await oy(B, 's2', 'konu', 'muzik');
  const [aSatir] = await v.db.select().from(oylar).where(and(eq(oylar.tarayiciId, 's2'), eq(oylar.hedefId, A)));
  const kayit = await oyGeriAlModerasyon(v.db, { oyId: aSatir.id, kapsam: 'cerez-kayit', yapan: admin, gerekce: 'kayıt' });
  assert.equal(kayit.adet, 2);
  assert.equal((await v.db.select().from(oylar).where(and(eq(oylar.tarayiciId, 's2'), eq(oylar.hedefId, B))))[0].moderasyonGeriAlindi, false);

  await oy(A, 's3', 'konu', 'spor'); await oy(A, 's3', 'etiket', 'ai'); await oy(B, 's3', 'konu', 'muzik');
  const [bSatir] = await v.db.select().from(oylar).where(and(eq(oylar.tarayiciId, 's3'), eq(oylar.hedefId, B)));
  const site = await oyGeriAlModerasyon(v.db, { oyId: bSatir.id, kapsam: 'cerez-site', yapan: admin, gerekce: 'site' });
  assert.equal(site.adet, 3);
  const kayitlar = await moderasyonGecmisi(v.db);
  assert.equal(JSON.stringify(kayitlar).includes('s2'), false);
  assert.equal(JSON.stringify(kayitlar).includes('s3'), false);
  await assert.rejects(
    oyGeriAlModerasyon(v.db, { oyId: bSatir.id, kapsam: 'tek', yapan: admin, gerekce: ' ' }),
    (e: any) => e.durum === 422,
  );
});

test('kilit anındaki sonuç donar, açılınca güncel oylar kullanılır', async () => {
  await oy(C, 'k1', 'konu', 'muzik'); await oy(C, 'k2', 'konu', 'muzik'); await oy(C, 'k3', 'konu', 'muzik');
  await kayitKilitle(v.db, { hedefTuru: 'kanal', hedefId: C, yapan: admin, gerekce: 'kilit testi' });
  const kilit = await aktifKilit(v.db, 'kanal', C);
  assert.equal(kilit?.sonuc.anaKonu, 'muzik');
  await oy(C, 'k4', 'konu', 'muzik');
  assert.equal((await aktifKilit(v.db, 'kanal', C))?.sonuc.anaKonu, 'muzik');
  await kayitKilidiniAc(v.db, { hedefTuru: 'kanal', hedefId: C, yapan: admin, gerekce: 'aç' });
  assert.equal(await aktifKilit(v.db, 'kanal', C), null);
});

test('çerez engeli oyları gizler, kaldırınca geri getirir; ağ etiketi ipucu vermez', async () => {
  await oy(D, 'b1', 'konu', 'spor', 'hash-b1');
  const [satir] = await v.db.select().from(oylar).where(and(eq(oylar.tarayiciId, 'b1'), eq(oylar.hedefId, D)));
  const engel = await engelle(v.db, { oyId: satir.id, kapsam: 'cerez', yapan: admin, gerekce: 'engel testi' });
  assert.match(engel.etiket, /^çerez:/);
  assert.equal((await sayimlariGetir(v.db, 'kanal', D)).konular.spor?.up ?? 0, 0);
  await assert.rejects(
    oyKaydet(v.db, { hedefTuru: 'kanal', hedefId: D, ogeTuru: 'konu', ogeId: 'spor', deger: 'down', tarayiciId: 'b1' }),
    (e: any) => e.durum === 403,
  );
  const liste = await engelleriListele(v.db);
  assert.equal(JSON.stringify(liste).includes('hash-b1'), false);
  assert.equal(JSON.stringify(liste).includes('"deger"'), false);
  await engelKaldir(v.db, { engelId: engel.id, yapan: admin, gerekce: 'kaldır' });
  assert.equal((await sayimlariGetir(v.db, 'kanal', D)).konular.spor.up, 1);
  assert.equal((await engelleriListele(v.db)).length, 0);
});

test('ağ engeli IP özetiyle çalışır; IP özeti yoksa reddedilir', async () => {
  await oy(E, 'b2', 'konu', 'spor', 'hash-b2');
  const [satir] = await v.db.select().from(oylar).where(and(eq(oylar.tarayiciId, 'b2'), eq(oylar.hedefId, E)));
  const ag = await engelle(v.db, { oyId: satir.id, kapsam: 'ag', yapan: admin, gerekce: 'ağ testi' });
  assert.match(ag.etiket, /^ağ:/);
  assert.equal((await sayimlariGetir(v.db, 'kanal', E)).konular.spor?.up ?? 0, 0);
  await engelKaldir(v.db, { engelId: ag.id, yapan: admin, gerekce: 'ağ kaldır' });
  assert.equal((await sayimlariGetir(v.db, 'kanal', E)).konular.spor.up, 1);

  await oy(E, 'b3', 'konu', 'spor');
  const [ipYok] = await v.db.select().from(oylar).where(and(eq(oylar.tarayiciId, 'b3'), eq(oylar.hedefId, E)));
  await assert.rejects(
    engelle(v.db, { oyId: ipYok.id, kapsam: 'ag', yapan: admin, gerekce: 'ip yok' }),
    (e: any) => e.durum === 409,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/moderasyon.test.ts`
Expected: FAIL — `moderasyon-deposu.ts` yok.

- [ ] **Step 3: Implement the moderation service**

`oySatirlari` satırları `guncelleme` azalan sırada okur; döndürmeden önce `tarayiciId` ve `ipOzeti` alanlarını **atar**. Etiketler `kimlikEtiketi('cerez', tarayiciId)` ve `kimlikEtiketi('ağ', ipOzeti)` ile üretilir. Aktif engeller `bitis is null or bitis > simdi` koşuluyla bir kez okunur; durum önceliği **moderasyon geri aldı → ziyaretçi geri aldı → engelli → aktif**tir. Dönen nesnede tam kimlik, tam IP özeti ve ham IP bulunmaz.

`oyGeriAlModerasyon`: önce `oyId` ile oy satırını çöz; yoksa `HttpHatasi(404,'oy-yok')`; **gerekçe boşsa `HttpHatasi(422,'gerekce')`**; `moderasyonGeriAlindi` zaten `true` ise `HttpHatasi(409,'zaten-geri-alindi')`. Kapsam koşulu: `tek` → yalnızca `oyId`; `cerez-kayit` → aynı `tarayiciId` + `hedefTuru` + `hedefId`; `cerez-site` → aynı `tarayiciId`, tüm hedefler. Tek transaction’da `moderasyon_geri_alindi = false` olan satırları güncelle (`geri_alan`, `geri_alma_gerekce`, `geri_alma_zamani`), `adet` döndür ve `moderasyon_kayitlari`na `islem='oy-geri-al'`, `gerekce`, `ayrinti={ kapsam, oyId, etiket, adet }` yaz. `ayrinti` içinde çerez kimliği yoktur.

`kayitKilitle`: **önce gerekçe boşsa `HttpHatasi(422,'gerekce')`**; `icerikGetir` ile aktif kaydı doğrula (yoksa 404); `aktifKilit` varsa 409 `'zaten-kilitli'`; `sayimlariGetir` + `sonucHesapla` ile o anki sonucu hesapla ve mevcut `kilitle()` fonksiyonunu çağır. Tekil indeks yarışında 409’a çevir. `kayitKilidiniAc`: **önce gerekçe boşsa 422**; `kilidiAc` false dönerse 409 `'kilit-yok'`.

`engelle`: **önce gerekçe boşsa 422**; oy satırını çöz (yoksa 404 `'oy-yok'`); `kapsam='ag'` ve `ipOzeti` yoksa 409 `'ip-yok'`. `bitis` verilmişse geçmiş tarih 422. `engeller` tablosuna `(tur, deger)` çakışmasında güncelleme yap (`sebep`, `yapan`, `bitis`, `olusturma=now()`); `tur` eşlemesi `cerez→tarayici`, `ag→ip`. Dönen etiket kısa etikettir. Moderasyon kaydı `islem='engelle'`, `ayrinti={ kapsam, etiket, bitis }`. `engelleriListele` süresi dolmuşları göstermez, tam `deger` döndürmez. `engelKaldir`: **önce gerekçe boşsa 422**; engel yoksa 404 `'engel-yok'`; satırı siler ve `islem='engel-kaldir'` kaydına kısa etiketi, eski sebebi ve gerekçeyi yazar. `moderasyonGecmisi` son 100 kaydı `hesaplar` ile birleştirip `yapanEposta` ile döndürür.

`sayimlariGetir` engel filtresi `bitis is null or bitis > now()` içermiyorsa bu görevde düzelt; aksi halde süresi dolmuş engel sonsuza kadar oy gizler.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site; node --test tests/moderasyon.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing maintenance test**

```ts
// site/tests/bakim.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { bakimYap } from '../lib/bakim.ts';

const K = 'UC' + 'y'.repeat(22);

test('bakım 30 günlük IP özetini siler, süresi dolmuş oturum/engel/hız penceresini temizler', async () => {
  const v = await testDb();
  try {
    const hesap = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('bakim@x','x','admin') returning id`)).rows[0].id;
    await v.db.execute(sql`insert into kanallar (id) values (${K})`);
    await v.db.execute(sql`
      insert into oylar (hedef_turu, hedef_id, oge_turu, oge_id, deger, tarayici_id, ip_ozeti, olusturma, guncelleme) values
        ('kanal', ${K}, 'konu', 'spor', 'up', 'eski', 'eski-hash', now() - interval '31 days', now() - interval '31 days'),
        ('kanal', ${K}, 'konu', 'muzik', 'up', 'yeni', 'yeni-hash', now(), now())
    `);
    await v.db.execute(sql`
      insert into oturumlar (token_ozeti, hesap_id, son_kullanma, son_gorulme) values
        ('eski-token', ${hesap}, now() - interval '1 day', now() - interval '2 days'),
        ('yeni-token', ${hesap}, now() + interval '1 day', now())
    `);
    await v.db.execute(sql`
      insert into engeller (tur, deger, bitis) values
        ('tarayici', 'eski-engel', now() - interval '1 hour'),
        ('tarayici', 'suresiz-engel', null)
    `);
    await v.db.execute(sql`
      insert into hiz_limitleri (anahtar, pencere, sayac) values
        ('eski-pencere', now() - interval '3 days', 1),
        ('yeni-pencere', now(), 1)
    `);

    const sonuc = await bakimYap(v.db);
    assert.deepEqual(sonuc, { ipOzeti: 1, oturum: 1, engel: 1, hizLimiti: 1 });

    const oylar = (await v.db.execute(sql`select tarayici_id, ip_ozeti from oylar order by tarayici_id`)).rows as any[];
    assert.equal(oylar.find(o => o.tarayici_id === 'eski').ip_ozeti, null);
    assert.equal(oylar.find(o => o.tarayici_id === 'yeni').ip_ozeti, 'yeni-hash');
    assert.equal((await v.db.execute(sql`select count(*)::int as n from oturumlar where token_ozeti = 'eski-token'`)).rows[0].n, 0);
    assert.equal((await v.db.execute(sql`select count(*)::int as n from oturumlar where token_ozeti = 'yeni-token'`)).rows[0].n, 1);
    assert.equal((await v.db.execute(sql`select count(*)::int as n from engeller where deger = 'eski-engel'`)).rows[0].n, 0);
    assert.equal((await v.db.execute(sql`select count(*)::int as n from engeller where deger = 'suresiz-engel'`)).rows[0].n, 1);
    assert.equal((await v.db.execute(sql`select count(*)::int as n from hiz_limitleri where anahtar = 'eski-pencere'`)).rows[0].n, 0);
    assert.equal((await v.db.execute(sql`select count(*)::int as n from hiz_limitleri where anahtar = 'yeni-pencere'`)).rows[0].n, 1);

    assert.deepEqual(await bakimYap(v.db), { ipOzeti: 0, oturum: 0, engel: 0, hizLimiti: 0 });
  } finally { await v.kapat(); }
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd site; node --test tests/bakim.test.ts`
Expected: FAIL — `bakim.ts` yok.

- [ ] **Step 7: Implement maintenance and its command**

`site/lib/bakim.ts`: `Db` tipini `oy-deposu.ts`’den `import type` ile al. `GUN = 86_400_000`. `bakimYap(db, { simdi = new Date(), ipGun = 30 } = {})` tek transaction’da:

1. `update oylar set ip_ozeti = null where ip_ozeti is not null and guncelleme < simdi - ipGun gün returning id` — satır silinmez, yalnızca güvenlik özeti temizlenir.
2. `delete from oturumlar where son_kullanma <= simdi returning id`.
3. `delete from engeller where bitis is not null and bitis <= simdi returning id` — süresiz engel ve engelin `deger` özeti korunur; süresi dolan engelin kaydı moderasyon geçmişinde kalır.
4. `delete from hiz_limitleri where pencere < simdi - 2 gün returning anahtar`.
5. `{ ipOzeti, oturum, engel, hizLimiti }` sayıları `returning` satır sayısından döner.

`site/scripts/bakim.mjs`: `await db()` + `bakimYap`, sonucu tek satır Türkçe özet olarak yaz; hata varsa `process.exitCode = 1`, `finally` içinde `veritabaniKapat()`. `package.json`’a `"bakim": "node scripts/bakim.mjs"` ekle.

- [ ] **Step 8: Run tests, build and commit**

Run: `cd site; node --test tests/moderasyon.test.ts tests/bakim.test.ts` → PASS.
Run: `cd site; npm test` ve `cd site; npm run build` → yeşil.
Commit: `git add site/lib/moderasyon-deposu.ts site/lib/bakim.ts site/scripts/bakim.mjs site/lib/engel-deposu.ts site/lib/oy-deposu.ts site/package.json site/tests/moderasyon.test.ts site/tests/bakim.test.ts` → `git commit -m "site: moderasyon servisi, geri alma, kilit, engel ve bakim"`

---

### Task 22: Moderasyon paneli, oy satırları ve engel listesi

**Files:**
- Create: `site/app/api/panel/moderasyon/oy-geri-al/route.ts`
- Create: `site/app/api/panel/moderasyon/kilitle/route.ts`, `site/app/api/panel/moderasyon/kilit-ac/route.ts`
- Create: `site/app/api/panel/moderasyon/engelle/route.ts`
- Create: `site/app/api/panel/engeller/route.ts`, `site/app/api/panel/engeller/[id]/route.ts`
- Create: `site/app/panel/icerikler/[tur]/[id]/page.tsx`, `site/app/panel/icerikler/[tur]/[id]/moderasyon.module.css`
- Create: `site/app/panel/moderasyon/page.tsx`, `site/app/panel/engeller/page.tsx`
- Create: `site/app/bilesenler/moderasyon-araclari.tsx`, `site/app/bilesenler/gerekce-dialogu.tsx`, `site/app/bilesenler/engel-listesi.tsx`
- Create: `site/tests/api-moderasyon.test.ts`

**Interfaces:**
- API: `POST /api/panel/moderasyon/oy-geri-al` gövde `{ oyId, kapsam, gerekce }` → `{ adet, etiket }` (200)
- API: `POST /api/panel/moderasyon/kilitle` gövde `{ hedefTuru, hedefId, gerekce }` → 201; `kilit-ac` aynı gövde → 200
- API: `POST /api/panel/moderasyon/engelle` gövde `{ oyId, kapsam, gerekce, bitis? }` → `{ id, etiket }` (201)
- API: `GET /api/panel/engeller` → `{ engeller }` (200); `DELETE /api/panel/engeller/[id]` gövde `{ gerekce }` → `204`
- Consumes: `oySatirlari`, `oyGeriAlModerasyon`, `kayitKilitle`, `kayitKilidiniAc`, `engelle`, `engelleriListele`, `engelKaldir`, `moderasyonGecmisi`, `icerikGetir`, `aktifKilit`

- [ ] **Step 1: Write the failing API test**

```ts
// site/tests/api-moderasyon.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.SITE_DB = 'pglite'; process.env.PGLITE_DIR = 'memory'; process.env.IP_HASH_SECRET = 't';
const { sql } = await import('drizzle-orm');
const { db, veritabaniKapat } = await import('../lib/db.ts');
const { POST: geriAl } = await import('../app/api/panel/moderasyon/oy-geri-al/route.ts');
const { POST: kilitle } = await import('../app/api/panel/moderasyon/kilitle/route.ts');
const { POST: kilitAc } = await import('../app/api/panel/moderasyon/kilit-ac/route.ts');
const { POST: engelle } = await import('../app/api/panel/moderasyon/engelle/route.ts');
const { GET: engellerGetir } = await import('../app/api/panel/engeller/route.ts');
const { DELETE: engelSil } = await import('../app/api/panel/engeller/[id]/route.ts');
const { parolaOzetle } = await import('../lib/parola.ts');
const { girisYap, OTURUM_CEREZI } = await import('../lib/oturum.ts');
const { oyVer } = await import('../lib/oy-deposu.ts');

const HEDEF = 'UC' + 'r'.repeat(22);
let v: Awaited<ReturnType<typeof db>>; let cookie: string; let oyId: string;

before(async () => {
  v = await db();
  await v.execute(sql`insert into kanallar (id) values (${HEDEF})`);
  const ozet = await parolaOzetle('Parola123456');
  await v.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('e@x', ${ozet}, 'editor')`);
  await oyVer(v, { hedefTuru: 'kanal', hedefId: HEDEF, ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: 'gizli-cerez' });
  oyId = (await v.execute(sql`select id from oylar limit 1`)).rows[0].id as string;
  const g = await girisYap(v, { eposta: 'e@x', parola: 'Parola123456', ipOzeti: null });
  cookie = `${OTURUM_CEREZI}=${g.token}`;
});
after(async () => { await veritabaniKapat(); });

function istek(yol: string, govde?: unknown, yontem = 'POST', oturum = cookie) {
  return new Request('http://localhost:3000' + yol, {
    method: yontem,
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', cookie: oturum },
    body: govde === undefined ? undefined : JSON.stringify(govde),
  });
}

test('moderasyon uçları yetki, origin ve gerekçe ister; ham kimlik sızdırmaz', async () => {
  assert.equal((await geriAl(istek('/api/panel/moderasyon/oy-geri-al', { oyId, kapsam: 'tek', gerekce: 'x' }, 'POST', ''))).status, 401);
  assert.equal((await geriAl(new Request('http://localhost:3000/api/panel/moderasyon/oy-geri-al', { method: 'POST', headers: { cookie }, body: '{}' }))).status, 403);
  assert.equal((await geriAl(istek('/api/panel/moderasyon/oy-geri-al', { oyId, kapsam: 'tek' }))).status, 422);
  const ok = await geriAl(istek('/api/panel/moderasyon/oy-geri-al', { oyId, kapsam: 'tek', gerekce: 'test' }));
  assert.equal(ok.status, 200);
  const metin = await ok.text();
  assert.equal(metin.includes('gizli-cerez'), false);
  assert.match(metin, /çerez:/);
});

test('kilit aç/kapa ve engel listesi akışı çalışır', async () => {
  const k = await kilitle(istek('/api/panel/moderasyon/kilitle', { hedefTuru: 'kanal', hedefId: HEDEF, gerekce: 'kilit' }));
  assert.equal(k.status, 201);
  assert.equal((await kilitle(istek('/api/panel/moderasyon/kilitle', { hedefTuru: 'kanal', hedefId: HEDEF, gerekce: 'tekrar' }))).status, 409);
  assert.equal((await kilitAc(istek('/api/panel/moderasyon/kilit-ac', { hedefTuru: 'kanal', hedefId: HEDEF, gerekce: 'aç' }))).status, 200);

  const e = await engelle(istek('/api/panel/moderasyon/engelle', { oyId, kapsam: 'cerez', gerekce: 'engel' }));
  assert.equal(e.status, 201);
  const liste = await (await engellerGetir(istek('/api/panel/engeller', undefined, 'GET'))).json() as any;
  assert.equal(liste.engeller.length, 1);
  assert.match(liste.engeller[0].etiket, /^çerez:/);
  assert.equal(JSON.stringify(liste).includes('gizli-cerez'), false);
  assert.equal((await engelSil(istek(`/api/panel/engeller/${liste.engeller[0].id}`, { gerekce: 'kaldır' }, 'DELETE'), { params: Promise.resolve({ id: liste.engeller[0].id }) })).status, 204);
  assert.equal((await (await engellerGetir(istek('/api/panel/engeller', undefined, 'GET'))).json() as any).engeller.length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/api-moderasyon.test.ts`
Expected: FAIL — route dosyaları yok.

- [ ] **Step 3: Implement routes and panel UI**

Tüm route’lar `export const dynamic = 'force-dynamic'`. Yazma route’ları sırayla `panelKoruma(db, req, ['editor','admin'])`, `ayniOriginMi(req)`, `govdeOku`, servis çağrısı; `GET /api/panel/engeller` yalnızca `rolGerekli(db, req, ['editor','admin'])` kullanır (okuma `panelKoruma` ile hız limitine tabi değildir). Hatalar `hataCevap`. Başarı durumları: `oy-geri-al` 200, `kilitle` 201, `kilit-ac` 200, `engelle` 201, `DELETE` 204 ve boş gövde.

`/panel/icerikler/[tur]/[id]`: `params` await edilir; `icerikGetir` (arşivliyse `notFound()`), `oySatirlari`, `aktifKilit`, `moderasyonGecmisi` filtrelenmiş. Üstte kilit bandı: kilitliyse gerekçe/tarih + **“Kilidi aç”**, değilse **“Kilitle”**; ikisi de gerekçe dialogu açar. Oylar tablosunda **takma etiket**, konu/etiket, değer, zaman ve durum gösterilir. Satır eylemleri: **“Bu oyu geri al”** (`tek`), **“Bu çerezin bu kayıttaki oyları”** (`cerez-kayit`), **“Bu çerezin tüm site oyları”** (`cerez-site`; ek onay ve “Bu işlem kalıcıdır” uyarısı), **“Bu çerezi engelle”** (`cerez`), **“Bu ağı engelle”** (`ag`; yalnızca `ipEtiketi` varsa; “Paylaşımlı ağları etkileyebilir” uyarısı). Her işlem gerekçe ister; dialog onaylanmadan istek gönderilmez. Başarıda `router.refresh()`.

`/panel/moderasyon`: son 100 kayıt; işlem, hedef, gerekçe, tarih, yapan; hedef varsa içerik sayfasına bağlantı. `/panel/engeller`: `engelleriListele`; tür, kısa etiket, sebep, başlangıç/bitiş, yapan; **“Engeli kaldır”** gerekçe dialogu. İki sayfa da `sunucuRolGerekli(['editor','admin'])`; 390 px’te tablolar kart satırlarına döner.

- [ ] **Step 4: Run tests and build**

Run: `cd site; node --test tests/api-moderasyon.test.ts`
Run: `cd site; npm test` ve `cd site; npm run build`
Expected: PASS / `Compiled successfully`.

- [ ] **Step 5: Commit**

`git add site/app/api/panel/moderasyon site/app/api/panel/engeller "site/app/panel/icerikler/[tur]/[id]" site/app/panel/moderasyon site/app/panel/engeller site/app/bilesenler/moderasyon-araclari.tsx site/app/bilesenler/gerekce-dialogu.tsx site/app/bilesenler/engel-listesi.tsx site/tests/api-moderasyon.test.ts` → `git commit -m "site: moderasyon paneli ve engel listesi"`

---

### Task 23: S5 doğrulaması ve checkpoint

- [ ] **Step 1: Verify the moderation flows**

Run: `cd site; npm test` → PASS.
Run: `cd site; npm run build` → `Compiled successfully`.

`npm run dev` ile:
1. Bir kayda 3 upvote ver; **Kilitle** (gerekçeli) → oy vermeye devam et, sonuç paneli değişmiyor.
2. **Kilidi aç** (gerekçeli) → sonuç güncel oylara dönüyor.
3. Bir oyu **tek** geri al → sonuç düşüyor; aynı çerezle yeniden oy verince `409` ve “moderasyonla geri alındı” mesajı görünüyor.
4. Aynı çerezle iki konu oyu varken **bu kayıttaki oylar** → iki satır kapanıyor; başka kayıttaki oyu duruyor.
5. Aynı çerezle iki farklı kayıtta oy varken **tüm site oyları** → hepsi kapanıyor; onay ve gerekçe olmadan işlem yapılamıyor.
6. **Çerezi engelle** → oylar sayılmıyor; yeni oy `403`; engeli kaldır → eski oylar geri sayılıyor.
7. **Ağı engelle** → paylaşımlı ağ uyarısı ve gerekçe görünüyor; engeli kaldır → oylar geri geliyor.
8. `/panel/engeller` süresi dolmuş engeli göstermiyor; kaldırılan engel listeden düşüyor.
9. DevTools → Network: moderasyon yanıtlarında ve panel HTML’inde tam çerez kimliği, tam IP özeti ve ham IP yok; yalnızca `çerez:xxxxxxxx` / `ağ:xxxxxxxx`.
10. `/panel/moderasyon` son işlemleri gerekçesiyle ve yapan hesabıyla gösteriyor.

- [ ] **Step 2: Checkpoint**

`git status --short` → yalnızca beklenen dosyalar. Push **yok**.
`git tag checkpoint-site-s5`

---

### Task 24: Admin iskeleti, çok admin yönetimi ve taksonomi

**Files:**
- Modify: `site/lib/hesap-deposu.ts`
- Create: `site/lib/admin-deposu.ts`
- Create: `site/app/api/admin/hesaplar/route.ts`, `site/app/api/admin/hesaplar/[id]/route.ts`
- Create: `site/app/admin/layout.tsx`, `site/app/admin/page.tsx`, `site/app/admin/admin.module.css`
- Create: `site/app/admin/hesaplar/page.tsx`, `site/app/admin/taksonomi/page.tsx`
- Create: `site/app/bilesenler/hesap-formu.tsx`, `site/app/bilesenler/hesap-tablosu.tsx`
- Create: `site/tests/admin-hesap.test.ts`, `site/tests/api-admin.test.ts`

**Interfaces:**
- Produces: `interface HesapSatiri { id; eposta; rol; aktif; parolaDegistirmeli; sonGiris; olusturma }` (parola özeti yok)
- Produces: `hesaplariListele(db): Promise<HesapSatiri[]>`
- Produces: `hesapOlustur(db, { eposta, parola, rol, yapan }): Promise<{ hesap: HesapSatiri; geciciParola: string }>`
- Produces: `hesapGuncelle(db, { hesapId, rol?, aktif?, geciciParola?, yapan, kendiId }): Promise<{ hesap: HesapSatiri; geciciParola?: string }>`
- Produces: `adminOzeti(db): Promise<{ hesaplar; aktifAdmin; bekleyenTalep; kilitli; sonYayin; uyarilar: string[] }>`
- API: `GET/POST /api/admin/hesaplar`; `PATCH /api/admin/hesaplar/[id]`
- Kural: son aktif admin pasifleştirilemez/rolü düşürülemez; admin kendi hesabını pasifleştiremez/rolünü düşüremez. İkisi de `409`.

- [ ] **Step 1: Write the failing service tests**

```ts
// site/tests/admin-hesap.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { ilkAdminOlustur, hesapOlustur, hesapGuncelle, hesaplariListele } from '../lib/hesap-deposu.ts';
import { moderasyonKayitlari } from '../db/schema.ts';
import { girisYap, oturumOku } from '../lib/oturum.ts';

let v: Awaited<ReturnType<typeof testDb>>; let a: any; let b: any;
before(async () => {
  v = await testDb();
  a = await ilkAdminOlustur(v.db, { eposta: 'Admin1@Ornek.com', parola: 'Parola123456' });
  b = (await hesapOlustur(v.db, { eposta: 'admin2@ornek.com', parola: 'Parola123456', rol: 'admin', yapan: a.id })).hesap;
});
after(async () => { await v.kapat(); });

test('hesap listesi parola özeti döndürmez; e-posta büyük/küçük harf tekildir', async () => {
  assert.equal((await hesaplariListele(v.db)).length, 2);
  assert.equal('parolaOzeti' in (await hesaplariListele(v.db))[0], false);
  await assert.rejects(
    hesapOlustur(v.db, { eposta: 'ADMIN1@ornek.com', parola: 'Parola123456', rol: 'editor', yapan: b.id }),
    (e: any) => e.durum === 409,
  );
});

test('kendi rolünü düşürme ve kendi hesabını pasifleştirme reddedilir', async () => {
  await assert.rejects(
    hesapGuncelle(v.db, { hesapId: a.id, rol: 'editor', yapan: a.id, kendiId: a.id }),
    (e: any) => e.durum === 409,
  );
  await assert.rejects(
    hesapGuncelle(v.db, { hesapId: a.id, aktif: false, yapan: a.id, kendiId: a.id }),
    (e: any) => e.durum === 409,
  );
});

test('son aktif admin korunur; pasifleştirme oturumu anında iptal eder', async () => {
  const ga = await girisYap(v.db, { eposta: 'admin1@ornek.com', parola: 'Parola123456', ipOzeti: null });
  await hesapGuncelle(v.db, { hesapId: a.id, aktif: false, yapan: b.id, kendiId: b.id });
  assert.equal(await oturumOku(v.db, ga.token), null);
  await assert.rejects(
    hesapGuncelle(v.db, { hesapId: b.id, aktif: false, yapan: a.id, kendiId: a.id }),
    (e: any) => e.durum === 409,
  );
});

test('geçici parola döndürülür, zorunlu değişim işaretlenir ve günlüğe yazılmaz', async () => {
  const r = await hesapGuncelle(v.db, { hesapId: b.id, geciciParola: 'YeniParola1234', yapan: a.id, kendiId: a.id });
  assert.equal(r.geciciParola, 'YeniParola1234');
  assert.equal(r.hesap.parolaDegistirmeli, true);
  const g = await girisYap(v.db, { eposta: 'admin2@ornek.com', parola: 'YeniParola1234', ipOzeti: null });
  assert.equal(g.kullanici.parolaDegistirmeli, true);
  const kayitlar = await v.db.select().from(moderasyonKayitlari).where(eq(moderasyonKayitlari.islem, 'parola-sifirla'));
  assert.equal(kayitlar.length, 1);
  assert.equal(JSON.stringify(kayitlar).includes('YeniParola1234'), false);
});

test('eşzamanlı iki rol düşürme son aktif admini sıfırlayamaz', async () => {
  const t = await testDb();
  try {
    const x = await ilkAdminOlustur(t.db, { eposta: 'x@ornek.com', parola: 'Parola123456' });
    const y = (await hesapOlustur(t.db, { eposta: 'y@ornek.com', parola: 'Parola123456', rol: 'admin', yapan: x.id })).hesap;
    const sonuc = await Promise.allSettled([
      hesapGuncelle(t.db, { hesapId: x.id, rol: 'editor', yapan: y.id, kendiId: y.id }),
      hesapGuncelle(t.db, { hesapId: y.id, rol: 'editor', yapan: x.id, kendiId: x.id }),
    ]);
    assert.equal(sonuc.filter(s => s.status === 'fulfilled').length, 1);
    assert.equal((await hesaplariListele(t.db)).filter(h => h.rol === 'admin' && h.aktif).length, 1);
  } finally { await t.kapat(); }
});
```

- [ ] **Step 2: Write the failing route test**

```ts
// site/tests/api-admin.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.SITE_DB = 'pglite'; process.env.PGLITE_DIR = 'memory';
const { sql } = await import('drizzle-orm');
const { db, veritabaniKapat } = await import('../lib/db.ts');
const { GET } = await import('../app/api/admin/hesaplar/route.ts');
const { parolaOzetle } = await import('../lib/parola.ts');
const { girisYap, OTURUM_CEREZI } = await import('../lib/oturum.ts');

let v: Awaited<ReturnType<typeof db>>; let editorCookie: string; let adminCookie: string;
before(async () => {
  v = await db();
  const ozet = await parolaOzetle('Parola123456');
  await v.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('e@x', ${ozet}, 'editor'), ('a@x', ${ozet}, 'admin')`);
  editorCookie = `${OTURUM_CEREZI}=${(await girisYap(v, { eposta: 'e@x', parola: 'Parola123456', ipOzeti: null })).token}`;
  adminCookie = `${OTURUM_CEREZI}=${(await girisYap(v, { eposta: 'a@x', parola: 'Parola123456', ipOzeti: null })).token}`;
});
after(async () => { await veritabaniKapat(); });
const istek = (cookie: string) => new Request('http://localhost:3000/api/admin/hesaplar', { headers: { cookie } });

test('editör admin uçlarına 403 alır, admin 200 alır', async () => {
  assert.equal((await GET(istek(editorCookie))).status, 403);
  assert.equal((await GET(istek(adminCookie))).status, 200);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd site; node --test tests/admin-hesap.test.ts tests/api-admin.test.ts`
Expected: FAIL — fonksiyonlar/route yok.

- [ ] **Step 4: Implement account management and admin UI**

`hesapOlustur` e-postayı `trim().toLocaleLowerCase('tr-TR')` ile normalleştirir; `parolaGecerliMi` 12+; e-posta benzersizliği veritabanına bırakılır ve `23505` → `HttpHatasi(409,'eposta-var')`; `parolaDegistirmeli=true`; `moderasyon_kayitlari` `hesap-olustur` (ayrıntıda hesap id + rol, parola yok). `hesapGuncelle` **tek transaction** içinde `SELECT ... ORDER BY id FOR UPDATE` ile tüm hesapları kilitler; hedefi bulur; `kendiId === hesapId` ve (`rol` değişiyor veya `aktif=false`) ise 409 `'kendi-hesap'`; hedef son aktif adminse ve rol düşürülüyor/pasifleştiriliyorsa 409 `'son-admin'`. Değişiklikte rol/aktiflik/parola alanlarını yazar; geçici parola verildiğinde `parolaDegistirmeli=true` olur; pasifleştirme, rol değişimi veya geçici parolada hedefin **tüm oturumlarını siler**; `parola-sifirla`, `rol-degistir`, `aktiflik` günlüklerini yazar. Dönen nesnede parola özeti yoktur. `hesaplariListele` `parolaOzeti` seçmez. `adminOzeti` hesap sayıları, bekleyen talep, kilitli kayıt, son yayın ve uyarı listesini döndürür.

`GET /api/admin/hesaplar`: `rolGerekli(db, req, ['admin'])`. `POST /api/admin/hesaplar` ve `PATCH /api/admin/hesaplar/[id]`: `panelKoruma(db, req, ['admin'])`, origin, `govdeOku`; `POST` 201, `PATCH` 200; geçici parola yalnızca yanıtta bir kez döner. `PATCH` gövdesi `{rol?, aktif?, geciciParola?}`.

`/admin/layout.tsx`: `sunucuRolGerekli(['admin'])`; yan menü **Özet, Hesaplar, İçerikler, Yayınlar, Taksonomi**; mobilde yatay kaydırma. `/admin`: kartlar (aktif admin, bekleyen talep, kilitli kayıt, son yayın) + uyarılar. `/admin/hesaplar`: yeni hesap formu (e-posta, rol, geçici parola), tablo (e-posta, rol, durum, son giriş, oluşturma), rol seçimi, aktif/pasif anahtarı, **“Geçici parola ver”**; kendi satırında rol/aktiflik kontrolleri kapalı ve nedeni yazılı. Geçici parola bir kez gösterilen modalda; sayfa yenilenince kaybolur. `/admin/taksonomi`: `taksonomi.KONULAR` ve `ETIKETLER` sıra numarasıyla salt okunur; “Yeni kimlik yalnızca eklenti sürümüyle gelir” notu.

- [ ] **Step 5: Run tests and build**

Run: `cd site; node --test tests/admin-hesap.test.ts tests/api-admin.test.ts`
Run: `cd site; npm test` ve `cd site; npm run build`
Expected: PASS / `Compiled successfully`.

- [ ] **Step 6: Commit**

`git add site/lib/hesap-deposu.ts site/lib/admin-deposu.ts site/app/api/admin/hesaplar site/app/admin site/app/bilesenler/hesap-formu.tsx site/app/bilesenler/hesap-tablosu.tsx site/tests/admin-hesap.test.ts site/tests/api-admin.test.ts` → `git commit -m "site: cok admin yonetimi ve admin iskeleti"`

---

### Task 25: Arşivleme, geri getirme ve metadata düzeltme

**Files:**
- Create: `site/lib/arsiv-deposu.ts`
- Create: `site/app/api/admin/icerikler/route.ts`
- Create: `site/app/api/admin/icerikler/[tur]/[id]/route.ts` (`PATCH` metadata)
- Create: `site/app/api/admin/icerikler/[tur]/[id]/arsivle/route.ts`, `.../geri-getir/route.ts`
- Create: `site/app/admin/icerikler/page.tsx`, `site/app/admin/icerikler/[tur]/[id]/page.tsx`, `site/app/admin/icerikler/admin-icerik.module.css`
- Create: `site/app/bilesenler/arsiv-dialogu.tsx`, `site/app/bilesenler/metadata-formu.tsx`
- Create: `site/tests/arsiv.test.ts`

**Interfaces:**
- Produces: `interface AdminIcerikSatiri extends IcerikBasligi { oySayisi; kilitli; sonuc }`
- Produces: `adminIcerikListele(db, { durum?: 'aktif' | 'arsiv'; arama? }): Promise<AdminIcerikSatiri[]>`
- Produces: `icerikArsivle(db, { tur, id, yapan, gerekce }): Promise<void>`
- Produces: `icerikGeriGetir(db, { tur, id, yapan, gerekce }): Promise<void>`
- Produces: `metadataGuncelle(db, { tur, id, ad?, handle?, avatar?, baslik?, kanalAdi?, kanalHandle?, kanalAvatar?, yapan }): Promise<void>`
- API: `GET /api/admin/icerikler?durum=aktif|arsiv&arama=`; `PATCH /api/admin/icerikler/[tur]/[id]`; `POST .../arsivle`; `POST .../geri-getir`

- [ ] **Step 1: Write the failing tests**

```ts
// site/tests/arsiv.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { oyVer } from '../lib/oy-deposu.ts';
import { kayitKilitle } from '../lib/moderasyon-deposu.ts';
import { icerikGetir, icerikListele } from '../lib/icerik-deposu.ts';
import { adminIcerikListele, icerikArsivle, icerikGeriGetir, metadataGuncelle } from '../lib/arsiv-deposu.ts';

const K = 'UC' + 's'.repeat(22);

test('arşiv kamusal listeden çıkarır, oy ve kilidi korur; geri getirir', async () => {
  const v = await testDb();
  try {
    const admin = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('a@x','x','admin') returning id`)).rows[0].id;
    await v.db.execute(sql`insert into kanallar (id, ad) values (${K}, 'Arşiv Kanal')`);
    for (const c of ['a1', 'a2', 'a3']) await oyVer(v.db, { hedefTuru: 'kanal', hedefId: K, ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: c });
    await kayitKilitle(v.db, { hedefTuru: 'kanal', hedefId: K, yapan: admin, gerekce: 'test kilidi' });
    await v.db.execute(sql`insert into yayin_surumleri (veri_surumu, kanal_sayisi, video_sayisi, icerik) values (1, 1, 0, '{"sema":1,"veriSurumu":1,"kanallar":[],"videolar":[]}'::jsonb)`);

    await icerikArsivle(v.db, { tur: 'kanal', id: K, yapan: admin, gerekce: 'arsiv testi' });
    assert.equal(await icerikGetir(v.db, 'kanal', K), null);
    assert.equal((await icerikListele(v.db, { arama: 'arsiv' })).toplam, 0);
    const arsiv = await adminIcerikListele(v.db, { durum: 'arsiv', arama: 'arsiv' });
    assert.equal(arsiv.length, 1);
    assert.equal(arsiv[0].oySayisi, 3);
    assert.equal(arsiv[0].kilitli, true);
    const oy = (await v.db.execute(sql`select count(*)::int as n from oylar where hedef_id = ${K}`)).rows[0].n;
    assert.equal(oy, 3);
    const yayin = (await v.db.execute(sql`select icerik from yayin_surumleri where veri_surumu = 1`)).rows[0].icerik;
    assert.deepEqual(yayin, { sema: 1, veriSurumu: 1, kanallar: [], videolar: [] });
    await assert.rejects(icerikArsivle(v.db, { tur: 'kanal', id: K, yapan: admin, gerekce: 'tekrar' }), (e: any) => e.durum === 409);
    await assert.rejects(icerikArsivle(v.db, { tur: 'kanal', id: K, yapan: admin, gerekce: ' ' }), (e: any) => e.durum === 422);

    await icerikGeriGetir(v.db, { tur: 'kanal', id: K, yapan: admin, gerekce: 'geri getir' });
    const aktif = await icerikGetir(v.db, 'kanal', K);
    assert.ok(aktif);
    assert.equal((await adminIcerikListele(v.db, { durum: 'aktif', arama: 'arsiv' }))[0].oySayisi, 3);
    await assert.rejects(icerikGeriGetir(v.db, { tur: 'kanal', id: K, yapan: admin, gerekce: 'tekrar' }), (e: any) => e.durum === 409);
  } finally { await v.kapat(); }
});

test('metadata düzeltme video için kanal satırı açmaz', async () => {
  const v = await testDb();
  try {
    const admin = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('a@x','x','admin') returning id`)).rows[0].id;
    await v.db.execute(sql`insert into videolar (id, baslik, kanal_id) values ('dQw4w9WgXcQ', 'Eski', ${'UC' + 't'.repeat(22)})`);
    await metadataGuncelle(v.db, {
      tur: 'video', id: 'dQw4w9WgXcQ', baslik: 'Yeni Video',
      kanalAdi: 'Kanal', kanalHandle: '@kanal', kanalAvatar: 'https://yt3.ggpht.com/a', yapan: admin,
    });
    const video = (await v.db.execute(sql`select baslik, kanal_adi, kanal_handle, kanal_avatar, meta_guncelleme from videolar where id = 'dQw4w9WgXcQ'`)).rows[0];
    assert.equal(video.baslik, 'Yeni Video');
    assert.equal(video.kanal_adi, 'Kanal');
    assert.ok(video.meta_guncelleme);
    assert.equal((await v.db.execute(sql`select count(*)::int as n from kanallar`)).rows[0].n, 0);
  } finally { await v.kapat(); }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/arsiv.test.ts`
Expected: FAIL — `arsiv-deposu.ts` yok.

- [ ] **Step 3: Implement archive service and admin pages**

`adminIcerikListele`: `durum` varsayılan `aktif`; kanal ve video satırlarını `arsivlendi` koşuluyla çeker; `arama` varsa `aramaAnahtari` ile başlık/ad/handle/kanal adı üzerinde filtreler; her satır için `sayimlariGetir` + `aktifKilit` + `sonucHesapla`; `oySayisi` iki geri alma bayrağı `false` olan oy sayısıdır (engelli oylar sayılmaz). `AdminIcerikSatiri` `IcerikBasligi` alanlarını taşır.

`icerikArsivle` / `icerikGeriGetir`: **önce gerekçe boşsa `HttpHatasi(422,'gerekce')`**; sonra hedef yoksa 404; zaten istenen durumdaysa 409. Transaction’da `arsivlendi`/`arsivleyen` güncellenir; `moderasyon_kayitlari`na `islem='arsivle'|'geri-getir'`, `hedefTuru`, `hedefId`, `gerekce`, `ayrinti={tur,id}` yazılır. Oylar, kilitler ve eski `yayin_surumleri` satırlarına **dokunulmaz**. Kanal arşivlemek videoları etkilemez.

`metadataGuncelle`: alanları `trim()` ile yazar; boş string `null`; `avatar` yalnızca `https://` veya `null`; handle `@` ile başlamalı; `metaGuncelleme=now()`; işlem günlüğü `metadata-duzelt` (ayrıntıda değişen alan adları, değerler değil). Video güncellemesi `kanallar` satırı **oluşturmaz**.

`GET /api/admin/icerikler` `rolGerekli(['admin'])`; `PATCH` metadata ve iki `POST` arşiv/geri getirme `panelKoruma(['admin'])` + origin. UI: `/admin/icerikler` **Aktif / Arşiv** sekmeleri, arama, tablo (başlık, tür, oy, kilit, oluşturma, işlem); arşivde **Geri getir**, aktifte **Arşivle** (gerekçe dialogu). `/admin/icerikler/[tur]/[id]` metadata formu ve kayıt özeti; arşivli kayıt formu “Arşivde” bandıyla gösterilir. 390 px’te tablo kartlara döner.

- [ ] **Step 4: Run tests and build**

Run: `cd site; node --test tests/arsiv.test.ts`
Run: `cd site; npm test` ve `cd site; npm run build`
Expected: PASS / `Compiled successfully`.

- [ ] **Step 5: Commit**

`git add site/lib/arsiv-deposu.ts site/app/api/admin/icerikler site/app/admin/icerikler site/app/bilesenler/arsiv-dialogu.tsx site/app/bilesenler/metadata-formu.tsx site/tests/arsiv.test.ts` → `git commit -m "site: arsivleme geri getirme ve metadata duzeltme"`

---

### Task 26: `db.json` önizleme, yayınlama ve indirme

**Files:**
- Create: `site/lib/yayin-deposu.ts`
- Create: `site/app/api/admin/yayinlar/onizle/route.ts`, `site/app/api/admin/yayinlar/route.ts`
- Create: `site/app/db.json/route.ts`
- Create: `site/app/admin/yayinlar/page.tsx`, `site/app/bilesenler/yayin-onizleme.tsx`
- Create: `site/tests/yayin.test.ts`, `site/tests/db-json-rota.test.ts`

**Interfaces:**
- Produces: `interface YayinAdayi { veriSurumu; icerik; ozet; hatalar; uyarilar; gecerli }`
- Produces: `interface YayinSatiri { veriSurumu; olusturma; kanalSayisi; videoSayisi; onaylayan; notlar; icerik }`
- Produces: `yayinAdayiUret(db, secenek?: { veriSurumu?: number }): Promise<YayinAdayi>`
- Produces: `yayinla(db, { notlar?, onaylayan }): Promise<{ veriSurumu; icerik; ozet; indirmeAdi }>`
- Produces: `sonYayin(db): Promise<YayinSatiri | null>`
- Produces: `yayinGetir(db, veriSurumu): Promise<YayinSatiri | null>`
- Produces: `yayinGecmisi(db, limit?): Promise<Omit<YayinSatiri, 'icerik'>[]>`
- API: `POST /api/admin/yayinlar/onizle`, `GET/POST /api/admin/yayinlar`
- Route: `GET /db.json` (son sürüm), `GET /db.json?surum=N` (yayınlanmış eski sürüm)

- [ ] **Step 1: Write the failing publication tests**

```ts
// site/tests/yayin.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { oyVer } from '../lib/oy-deposu.ts';
import { kayitKilitle } from '../lib/moderasyon-deposu.ts';
import { icerikArsivle } from '../lib/arsiv-deposu.ts';
import { yayinAdayiUret, yayinla, sonYayin, yayinGetir, yayinGecmisi } from '../lib/yayin-deposu.ts';

const K = 'UC' + 'u'.repeat(22);
const K2 = 'UC' + 'v'.repeat(22);
const A = 'UC' + 'w'.repeat(22);

test('önizleme yalnızca aktif kaydı alır, kilidi kullanır ve geçersiz taksonomiyi reddeder', async () => {
  const v = await testDb();
  try {
    const admin = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('a@x','x','admin') returning id`)).rows[0].id;
    await v.db.execute(sql`insert into kanallar (id, ad, arsivlendi) values (${K}, 'Aktif', false), (${A}, 'Arşiv', true)`);
    for (const c of ['p1', 'p2', 'p3']) await oyVer(v.db, { hedefTuru: 'kanal', hedefId: K, ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: c });
    await v.db.execute(sql`insert into videolar (id) values ('dQw4w9WgXcQ')`);
    await oyVer(v.db, { hedefTuru: 'video', hedefId: 'dQw4w9WgXcQ', ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: 'v1' });
    await oyVer(v.db, { hedefTuru: 'video', hedefId: 'dQw4w9WgXcQ', ogeTuru: 'konu', ogeId: 'muzik', deger: 'up', tarayiciId: 'v2' });
    await kayitKilitle(v.db, { hedefTuru: 'kanal', hedefId: K, yapan: admin, gerekce: 'kilit' });
    for (const c of ['p4', 'p5', 'p6']) await oyVer(v.db, { hedefTuru: 'kanal', hedefId: K, ogeTuru: 'konu', ogeId: 'muzik', deger: 'down', tarayiciId: c });

    const aday = await yayinAdayiUret(v.db);
    assert.equal(aday.gecerli, true);
    assert.equal(aday.veriSurumu, 1);
    assert.equal(aday.ozet.kanal, 1);
    assert.equal(aday.ozet.video, 0);
    assert.equal(aday.ozet.yazilmayan, 1);
    const kanal = (aday.icerik.kanallar as any[])[0];
    assert.equal(kanal.id, K);
    assert.equal(kanal.anaKonu, 'spor');
    assert.equal((aday.icerik.kanallar as any[]).some(k => k.id === A), false);

    await v.db.execute(sql`insert into kanallar (id) values (${K2})`);
    // Bilinmeyen taksonomi kimliğini oyVer doğrulamada reddeder; bozuk veriyi taklit etmek için ham SQL kullan.
    for (const c of ['b1', 'b2', 'b3']) await v.db.execute(sql`insert into oylar (hedef_turu, hedef_id, oge_turu, oge_id, deger, tarayici_id) values ('kanal', ${K2}, 'konu', 'bilinmeyen', 'up', ${c})`);
    const bozuk = await yayinAdayiUret(v.db);
    assert.equal(bozuk.gecerli, false);
    assert.ok(bozuk.hatalar.length > 0);
    await assert.rejects(yayinla(v.db, { onaylayan: admin }), (e: any) => e.durum === 422);
  } finally { await v.kapat(); }
});

test('yayın sürümü artar, eski sürüm değişmez, arşiv yeni sürümden çıkar', async () => {
  const v = await testDb();
  try {
    const admin = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('a@x','x','admin') returning id`)).rows[0].id;
    await v.db.execute(sql`insert into kanallar (id) values (${K})`);
    for (const c of ['y1', 'y2', 'y3']) await oyVer(v.db, { hedefTuru: 'kanal', hedefId: K, ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: c });
    const bir = await yayinla(v.db, { notlar: 'ilk', onaylayan: admin });
    assert.equal(bir.veriSurumu, 1);
    assert.equal(bir.indirmeAdi, 'yt-filter-db-v1.json');
    assert.equal((await sonYayin(v.db))?.veriSurumu, 1);

    await icerikArsivle(v.db, { tur: 'kanal', id: K, yapan: admin, gerekce: 'yayın testi' });
    const iki = await yayinla(v.db, { notlar: 'ikinci', onaylayan: admin });
    assert.equal(iki.veriSurumu, 2);
    assert.equal((iki.icerik as any).veriSurumu, 2);
    assert.equal((iki.icerik.kanallar as any[]).length, 0);
    assert.equal((await yayinGetir(v.db, 1))?.icerik.kanallar.length, 1);
    assert.equal((await yayinGetir(v.db, 1))?.icerik.veriSurumu, 1);
    assert.equal((await yayinGecmisi(v.db)).length, 2);
  } finally { await v.kapat(); }
});

test('eşzamanlı iki yayın aynı sürüm numarasını üretmez', async () => {
  const v = await testDb();
  try {
    const admin = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('a@x','x','admin') returning id`)).rows[0].id;
    await v.db.execute(sql`insert into kanallar (id) values (${K})`);
    for (const c of ['z1', 'z2', 'z3']) await oyVer(v.db, { hedefTuru: 'kanal', hedefId: K, ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: c });
    const sonuc = await Promise.allSettled([yayinla(v.db, { onaylayan: admin }), yayinla(v.db, { onaylayan: admin })]);
    const basarili = sonuc.filter((s): s is PromiseFulfilledResult<any> => s.status === 'fulfilled').map(s => s.value.veriSurumu);
    assert.ok(basarili.length >= 1);
    assert.equal(new Set(basarili).size, basarili.length);
    const satirlar = await v.db.execute(sql`select veri_surumu, icerik from yayin_surumleri order by veri_surumu`);
    assert.equal(new Set(satirlar.rows.map((r: any) => r.veri_surumu)).size, satirlar.rows.length);
    for (const r of satirlar.rows as any[]) assert.equal(r.icerik.veriSurumu, r.veri_surumu);
  } finally { await v.kapat(); }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/yayin.test.ts`
Expected: FAIL — `yayin-deposu.ts` yok.

- [ ] **Step 3: Write the failing route test**

```ts
// site/tests/db-json-rota.test.ts
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.SITE_DB = 'pglite'; process.env.PGLITE_DIR = 'memory';
const { sql } = await import('drizzle-orm');
const { db, veritabaniKapat } = await import('../lib/db.ts');
const { GET } = await import('../app/db.json/route.ts');
const { oyVer } = await import('../lib/oy-deposu.ts');
const { yayinla } = await import('../lib/yayin-deposu.ts');

const K = 'UC' + 'x'.repeat(22);
let v: Awaited<ReturnType<typeof db>>; let admin: string;
before(async () => {
  v = await db();
  admin = (await v.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('a@x','x','admin') returning id`)).rows[0].id as string;
  await v.execute(sql`insert into kanallar (id) values (${K})`);
  for (const c of ['r1', 'r2', 'r3']) await oyVer(v, { hedefTuru: 'kanal', hedefId: K, ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: c });
});
after(async () => { await veritabaniKapat(); });

test('yayın yokken 404, yayından sonra indirilebilir; eski sürüm ayrı iner', async () => {
  const bos = await GET(new Request('http://localhost:3000/db.json'));
  assert.equal(bos.status, 404);
  const y = await yayinla(v, { onaylayan: admin });
  const r = await GET(new Request('http://localhost:3000/db.json'));
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-disposition') ?? '', new RegExp(`yt-filter-db-v${y.veriSurumu}\\.json`));
  const json = await r.json() as any;
  assert.equal(json.sema, 1);
  assert.equal(json.veriSurumu, y.veriSurumu);
  assert.equal((await GET(new Request('http://localhost:3000/db.json?surum=1'))).status, 200);
  assert.equal((await GET(new Request('http://localhost:3000/db.json?surum=99'))).status, 404);
});
```

- [ ] **Step 4: Implement publication service and routes**

`yayinAdayiUret`: önce `yayin_surumleri` en büyük `veriSurumu`nu okur; `secenek.veriSurumu` verilmişse onu, yoksa max + 1’i aday sürüm olarak kullanır. `kanallar` ve `videolar` tablolarından `arsivlendi=false` satırları çeker; her kayıt için `sayimlariGetir` (Task 10’daki engel/geri alma filtresiyle) ve `aktifKilit`; `HedefGirdi` oluşturur (`kilitliSonuc = kilit?.sonuc`). `dbUret({ kayitlar, veriSurumu: aday, oncekiSurum: max || undefined, olusturma: YYYY-MM-DD })` çağırır. Hata fırlarsa `gecerli=false`, `hatalar=[mesaj]`; başarıda `gecerli=true`, `icerik`, `ozet`. Ek uyarılar: `yazilmayan > 0` → “{n} kayıt eşik altında olduğu için dosyaya yazılmadı.”; hiç kayıt yoksa “Hiç aktif kayıt yok.”.

`yayinla`: her denemede önce en büyük sürümü okur, `sonraki = max + 1`; adayı **o sürüm numarasıyla** (`yayinAdayiUret(db, { veriSurumu: sonraki })`) yeniden üretir (önizleme bayat olabilir). Geçersizse `HttpHatasi(422,'gecersiz-icerik',ilkHata)`. Transaction içinde `sonraki` ile `yayin_surumleri` satırını yazar; `dbUret` çıktısındaki `veriSurumu` bu numarayla eşleşmelidir. `23505` çakışmasında en fazla iki kez yeniden dener; her denemede sürüm numarasını ve adayı yeniden üretir; yine olursa `HttpHatasi(409,'surum-cakismasi')`. Dönen `indirmeAdi = yt-filter-db-v{surum}.json`. `notlar` 500 karaktere kırpılır; boşsa `null`. `onaylayan` zorunlu. Eski satırlar hiç güncellenmez.

`sonYayin` `veriSurumu desc limit 1`, `yayinGetir` sürümle, `yayinGecmisi` `icerik` hariç son 50 satır.

`/db.json/route.ts`: `export const dynamic = 'force-dynamic'`; `?surum` varsa pozitif tam sayı değilse 400; `yayinGetir`; yoksa `404` JSON `{hata:'Yayın bulunamadı.',kod:'yayin-yok'}`. Bulunursa `new Response(JSON.stringify(sonuc.icerik), { headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${indirmeAdi}"`, 'cache-control': 'public, max-age=60, stale-while-revalidate=300', 'x-content-type-options': 'nosniff' } })`. Yayın yokken aynı 404 gövdesi.

`/api/admin/yayinlar/onizle` `panelKoruma(['admin'])` + origin; `yayinAdayiUret` döndürür. `POST /api/admin/yayinlar` `panelKoruma(['admin'])` + origin; `{notlar?}`; `yayinla`; `201`. `GET` geçmiş `rolGerekli(['admin'])`. `/admin/yayinlar`: önizleme paneli (sürüm, kanal/video/yazılmayan, hatalar/uyarılar, JSON’un ilk 4 KB’ı), not alanı, **Önizle** ve **Yayınla**; geçersizse yayın düğmesi kapalı; geçmiş tablosunda sürüm, tarih, sayılar, onaylayan ve `/db.json?surum=N` bağlantısı.

- [ ] **Step 5: Run tests and build**

Run: `cd site; node --test tests/yayin.test.ts tests/db-json-rota.test.ts`
Run: `cd site; npm test` ve `cd site; npm run build`
Expected: PASS / `Compiled successfully`.

- [ ] **Step 6: Commit**

`git add site/lib/yayin-deposu.ts site/app/api/admin/yayinlar site/app/db.json site/app/admin/yayinlar site/app/bilesenler/yayin-onizleme.tsx site/tests/yayin.test.ts site/tests/db-json-rota.test.ts` → `git commit -m "site: db.json onizleme yayinlama ve indirme"`

---

### Task 27: S6 doğrulaması ve checkpoint

- [ ] **Step 1: Verify admin, archive and publication flows**

Run: `cd site; npm test` → PASS.
Run: `cd site; npm run build` → `Compiled successfully`.

`npm run dev` ile:
1. `/admin/hesaplar`: yeni bir editör hesabı aç; geçici parola bir kez görünüyor; editörle giriş → parola değiştir → `/panel`.
2. İkinci admin aç; adminlerden birini rol düşür/pasifleştir → kalan admin korunuyor; kendi hesabını düşürme/pasifleştirme kapalı ve sunucu `409` veriyor.
3. Pasifleştirilen hesabın açık oturumu bir sonraki istekte düşüyor; `/admin` editörde `403`.
4. `/admin/icerikler`: bir kaydı gerekçeyle arşivle → `/kesfet`, içerik URL’si ve `/db.json` dışında; oylar panelde duruyor. Geri getir → eski oylar ve kilit yerinde.
5. `/admin/yayinlar`: önizle → sürüm, kanal/video/yazılmayan sayıları, hata/uyarılar; **Yayınla** → `/db.json` iner; dosyada `sema: 1`, `veriSurumu` ve arşivli kayıt yok.
6. İkinci yayın → sürüm artıyor; `/db.json?surum=1` eski dosyayı değiştirmeden veriyor.
7. `/admin/taksonomi` salt okunur; yeni kimlik ekleme düğmesi yok.
8. `db.json` dosyasını gerçek eklentiye elle yükleme kullanıcı doğrulamasına bırakılır; bu görevde `dbKur` doğrulaması testlerle yeşildir.

- [ ] **Step 2: Checkpoint**

`git status --short` → yalnızca beklenen dosyalar. Push **yok**.
`git tag checkpoint-site-s6`

---

### Task 28: Site gizlilik, koşullar, iletişim ve hata sayfaları

**Files:**
- Create: `site/app/(kamusal)/gizlilik/page.tsx`, `site/app/(kamusal)/kosullar/page.tsx`, `site/app/(kamusal)/iletisim/page.tsx`
- Create: `site/app/(kamusal)/metin.module.css`
- Create: `site/app/not-found.tsx`, `site/app/error.tsx`
- Modify: `site/app/(kamusal)/page.tsx` (yayın yoksa `db.json` çağrısını “Henüz yayın yok” durumuna getir)
- Create: `site/tests/kamusal-metin.test.ts`

**Interfaces:**
- `/gizlilik`: yalnızca siteyi kapsayan, eklenti metninden ayrı gizlilik metni.
- `/kosullar`: taslak kullanım koşulları; sorumluluk reddi, moderasyon ve değişiklik maddeleri.
- `/iletisim`: GitHub Issues bağlantısı; form yok.
- `not-found.tsx`: Türkçe 404, ana sayfa ve keşfet bağlantısı.
- `error.tsx`: `'use client'`, tekrar dene düğmesi.

- [ ] **Step 1: Write the failing text test**

```ts
// site/tests/kamusal-metin.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const oku = (yol: string) => readFileSync(new URL(yol, import.meta.url), 'utf8');

test('site gizlilik metni gerekli açıklamaları içerir ve eklenti metninden ayrıdır', () => {
  const s = oku('../app/(kamusal)/gizlilik/page.tsx');
  for (const metin of ['1 yıl', '30 gün', 'IP', 'çerez', 'takma etiket', 'arşiv', 'GitHub Issues', 'analitik', 'reklam', 'üçüncü taraf', 'eklenti']) {
    assert.ok(s.includes(metin), `eksik: ${metin}`);
  }
  assert.match(s, /yalnızca.*site.*kapsar/i);
  assert.equal(s.includes('GIZLILIK.md'), false);
});

test('koşullar ve iletişim sayfaları taslak metni ve gerçek issue bağlantısını taşır', () => {
  const k = oku('../app/(kamusal)/kosullar/page.tsx');
  for (const metin of ['Kullanım Koşulları', 'sorumluluk', 'moderasyon', 'değişiklik', 'YouTube']) assert.ok(k.includes(metin), metin);
  const i = oku('../app/(kamusal)/iletisim/page.tsx');
  assert.match(i, /github\.com\/TalhaOzz\/YouTubeFilter\/issues/);
  assert.equal(i.includes('<form'), false);
});

test('404 ve hata sayfaları Türkçe ve erişilebilir', () => {
  const n = oku('../app/not-found.tsx');
  assert.match(n, /Sayfa bulunamadı/);
  assert.match(n, /href="\/"/);
  const e = oku('../app/error.tsx');
  assert.match(e, /'use client'/);
  assert.match(e, /Tekrar dene/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/kamusal-metin.test.ts`
Expected: FAIL — sayfalar yok.

- [ ] **Step 3: Write the public texts**

Gizlilik sayfası (taslak hukuki dil değil, açık Türkçe; `<time dateTime="2026-10-27">27 Ekim 2026</time>`):
- “Bu sayfa yalnızca YouTube Filter Store sitesini kapsar. Tarayıcı eklentisinin gizlilik metni ayrıdır.”
- Hesap açmadan oy verilebilir; tarayıcıya **1 yıl** ömürlü rastgele bir kimlik çerezi konur.
- Oy sayıları herkese açıktır; tekil oy sahibinin kimliği yayınlanmaz.
- IP’nin düz metni saklanmaz; oy kayıtlarındaki güvenlik özeti **30 gün**, aktif engel kaydındaki özet engel süresince tutulur.
- Engeller için çerez kimliği veya IP özeti sunucuda tutulur; panelde yalnızca `çerez:xxxxxxxx` / `ağ:xxxxxxxx` gibi kısa **takma etiket** görünür.
- Moderatörler tam çerez kimliğini, tam IP özetini ve ham IP’yi görmez.
Kayıtlar **arşiv**lenir; arşivlenen kayıtların oyları silinmez; yalnızca kamusal yayından çıkarılır.
- Editör/admin hesaplarında e-posta ve parola özeti tutulur.
- YouTube’dan alınan başlık/avatar/kapak görselleri gösterilir; görseller YouTube sunucularından yüklenir.
- **Analitik**, **reklam** ve **üçüncü taraf** izleme yoktur.
- Veri silme talebi ve iletişim: **GitHub Issues**.
- Metin sonunda “Bu metin yalnızca siteyi kapsar; eklentinin gizlilik metni ayrıdır.” tekrar edilir.

Koşullar: sitenin topluluk oylama aracı olduğu, YouTube ile bağlantılı olmadığı, kullanıcıların hesap güvenliğinden sorumlu olduğu, moderasyonun gerekçeli yapıldığı, **sorumluluk** sınırı, metnin değişebileceği ve değişiklik tarihi. İletişim: yalnızca `https://github.com/TalhaOzz/YouTubeFilter/issues` bağlantısı; e-posta formu yok.

`metin.module.css`: `max-width: 68ch`, başlık aralıkları, `ul`/`li` okunabilirliği, 390 px’te tek sütun. `not-found.tsx` ve `error.tsx` aynı tasarım dilini kullanır; `error.tsx` client component’tir ve `reset()` çağırır. Ana sayfada `siteIstatistikleri().yayinSurumu === null` ise indirme çağrısı **“Henüz yayınlanmış veri yok. İlk yayın admin onayından sonra burada görünecek.”** metnine döner; aksi halde `/db.json` bağlantısı kalır.

- [ ] **Step 4: Run tests and build**

Run: `cd site; node --test tests/kamusal-metin.test.ts`
Run: `cd site; npm test` ve `cd site; npm run build`
Expected: PASS / `Compiled successfully`.

- [ ] **Step 5: Commit**

`git add "site/app/(kamusal)/gizlilik" "site/app/(kamusal)/kosullar" "site/app/(kamusal)/iletisim" "site/app/(kamusal)/metin.module.css" "site/app/(kamusal)/page.tsx" site/app/not-found.tsx site/app/error.tsx site/tests/kamusal-metin.test.ts` → `git commit -m "site: gizlilik kosullar iletisim ve hata sayfalari"`

---

### Task 29: Erişilebilirlik testleri, QA dumanı ve tarayıcı kontrol listesi

**Files:**
- Create: `site/tests/erisilebilirlik.test.ts`
- Create: `site/scripts/qa-duman.mjs`
- Create: `docs/SITE_QA.md`
- Modify: `site/package.json` (`"qa:duman": "node scripts/qa-duman.mjs"`)

**Interfaces:**
- Produces: statik erişilebilirlik kontrolü (`npm test` içinde).
- Produces: `npm run qa:duman`; `BASE_URL` (varsayılan `http://localhost:3000`) ile çalışan siteye HTTP dumanı.
- Produces: `docs/SITE_QA.md` içinde 1280×800 / 390×844, klavye, ekran okuyucu, kontrast, hareket azaltma ve uçtan uca akış listesi.

- [ ] **Step 1: Write the failing accessibility test**

```ts
// site/tests/erisilebilirlik.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = fileURLToPath(new URL('../app/', import.meta.url));
const oku = (yol: string) => readFileSync(join(app, yol), 'utf8');

function* tsxler(dir: string): Generator<string> {
  for (const ad of readdirSync(dir)) {
    const tam = join(dir, ad);
    if (statSync(tam).isDirectory()) yield* tsxler(tam);
    else if (tam.endsWith('.tsx')) yield tam;
  }
}

test('kök dil, atlama bağlantısı ve ana bölge var', () => {
  const l = oku('layout.tsx');
  assert.match(l, /<html[^>]*lang="tr"/);
  assert.match(l, /<Atla\s*\/>/);
  assert.match(l, /<main[^>]*id="icerik"/);
  const a = oku('bilesenler/atla.tsx');
  assert.match(a, /href="#icerik"/);
  assert.match(a, /İçeriğe atla/);
});

test('odak, hareket azaltma ve yerel font kuralları korunur', () => {
  const css = oku('stil.css');
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.equal(/fonts\.googleapis|fonts\.gstatic/.test(css), false);
  const fontlar = oku('fontlar.ts');
  assert.match(fontlar, /next\/font\/local/);
  assert.equal(/https?:/.test(fontlar), false);
});

test('görsellerde alt, oy düğmelerinde erişilebilir ad ve sonuçta canlı bölge var', () => {
  for (const dosya of tsxler(app)) {
    const s = readFileSync(dosya, 'utf8');
    for (const etiket of s.match(/<(?:img|Image)\b[^>]*>/g) ?? []) {
      assert.match(etiket, /\balt=/, `${dosya}: ${etiket}`);
    }
  }
  const oy = oku('bilesenler/oy-dugmesi.tsx');
  assert.match(oy, /aria-pressed/);
  assert.match(oy, /aria-label/);
  assert.match(oku('bilesenler/sonuc-paneli.tsx'), /aria-live="polite"/);
  assert.match(oku('bilesenler/onay-diyalogu.tsx'), /<dialog/);
});

test('her sayfada ana başlık var; pozitif tabindex yok', () => {
  for (const dosya of tsxler(app)) {
    const s = readFileSync(dosya, 'utf8');
    assert.equal(/tabIndex=\{?["']?[1-9]/.test(s), false, dosya);
    if (/[\\/]page\.tsx$/.test(dosya)) {
      const baslik = (s.match(/<h1\b/g) ?? []).length + (s.match(/<SayfaBasligi\b/g) ?? []).length;
      assert.ok(baslik >= 1, dosya);
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site; node --test tests/erisilebilirlik.test.ts`
Expected: FAIL — dosyalar/`qa-duman.mjs` yok veya eksik işaretleme.

- [ ] **Step 3: Write the HTTP smoke script**

```js
// site/scripts/qa-duman.mjs
// Çalışan siteye HTTP istekleri atar. Gerçek tarayıcı/ekran okuyucu testinin yerini TUTMAZ.
const taban = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const hatalar = [];
const sayfalar = [
  ['/', ['YouTube Filter Store', 'Nasıl çalışır']],
  ['/kesfet', ['Keşfet']],
  ['/giris', ['Giriş']],
  ['/gizlilik', ['30 gün', '1 yıl', 'eklenti']],
  ['/kosullar', ['Kullanım Koşulları']],
  ['/iletisim', ['GitHub Issues']],
];

for (const [yol, metinler] of sayfalar) {
  let r;
  try { r = await fetch(taban + yol); }
  catch { hatalar.push(`${yol}: bağlantı yok (sunucu çalışıyor mu?)`); continue; }
  const html = await r.text();
  if (r.status !== 200) hatalar.push(`${yol}: HTTP ${r.status}`);
  if (!/<html[^>]*lang="tr"/.test(html)) hatalar.push(`${yol}: lang="tr" yok`);
  if (!/href="#icerik"/.test(html)) hatalar.push(`${yol}: atlama bağlantısı yok`);
  if (!/<main[^>]*id="icerik"/.test(html)) hatalar.push(`${yol}: main#icerik yok`);
  if ((html.match(/<h1\b/g) ?? []).length !== 1) hatalar.push(`${yol}: tek h1 yok`);
  for (const metin of metinler) if (!html.includes(metin)) hatalar.push(`${yol}: "${metin}" yok`);
  if (/fonts\.googleapis|fonts\.gstatic/.test(html)) hatalar.push(`${yol}: üçüncü taraf font isteği`);
  if (/tarayici_id|ip_ozeti|gizli-cerez/.test(html)) hatalar.push(`${yol}: ham kimlik alanı sızdı`);
}

let db;
try { db = await fetch(taban + '/db.json'); }
catch { hatalar.push('/db.json: bağlantı yok'); }
if (db) {
  if (db.status === 404) console.log('Bilgi: /db.json henüz yayınlanmamış (404).');
  else if (db.status !== 200) hatalar.push(`/db.json: HTTP ${db.status}`);
  else {
    const json = await db.json().catch(() => null);
    if (!json || json.sema !== 1 || !Array.isArray(json.kanallar) || !Array.isArray(json.videolar)) {
      hatalar.push('/db.json: sema 1 / kanallar / videolar geçersiz');
    }
  }
}

if (hatalar.length) {
  console.error('QA dumanı BAŞARISIZ:');
  for (const hata of hatalar) console.error(`- ${hata}`);
  process.exitCode = 1;
} else {
  console.log(`QA dumanı geçti: ${sayfalar.length} sayfa + /db.json (${taban}).`);
}
```

- [ ] **Step 4: Write the manual QA checklist**

`docs/SITE_QA.md` şu bölümleri içerir; hiçbir manuel satır önceden işaretlenmez:

1. **Kapsam ve sınır:** otomatik testlerin kapsadıkları; gerçek tarayıcı, ekran okuyucu, mağaza yüklemesi ve ekran görüntülerinin kullanıcıda olduğu.
2. **Komutlar:** `cd site; npm test`, `npm run build`, `npm run tip`, ayrı terminalde `npm run dev`, `npm run qa:duman`; farklı adres için PowerShell’de `$env:BASE_URL='http://localhost:3000'; npm run qa:duman`. Çıktı beklentileri.
3. **1280×800 tablosu:** `/`, `/kesfet`, bir kanal ve bir video sayfası, `/giris`, `/panel`, `/panel/icerikler`, `/panel/moderasyon`, `/panel/engeller`, `/admin`, `/admin/hesaplar`, `/admin/icerikler`, `/admin/yayinlar`, `/gizlilik`, `/kosullar`, `/iletisim`, 404. Her satırda “yatay taşma yok / başlık ve odak doğru / boş durum anlaşılır” kutuları.
4. **390×844 tablosu:** aynı sayfalar; tabloların karta dönüşmesi, sonuç panelinin üstte özetlenmesi, menülerin yatay kaydırılması, 44 px dokunma hedefi.
5. **Klavye:** ilk Tab’da “İçeriğe atla”; görünür odak halkası; dialogda Escape; oy düğmelerinde `aria-pressed`; sekme sırası görsel sırayla; klavye tuzağı yok.
6. **Ekran okuyucu:** tek `h1`, landmark’lar, form etiketleri, hata metinlerinin `aria-live` ile duyurulması, görselin `alt` metni, ikon düğmelerin adı.
7. **Kontrast ve hareket:** DevTools kontrast denetimi; `prefers-reduced-motion: reduce` ile animasyon/geçişlerin durması; koyu tema.
8. **Uçtan uca akışlar:** oy ver/değiştir/geri al/yeniden oy; kayıtsız link → talep → editör kabul; kilit; ziyaretçi ve moderasyon geri alması; çerez/ağ engeli ve kaldırma; arşiv/geri getirme; çok admin ve son admin; `db.json` önizleme/yayın/indirme; `db.json`’u gerçek eklentiye yükleme (kullanıcı).
9. **Gizlilik/ağ:** DevTools → Network’te üçüncü taraf font/analitik/reklam isteği yok; panel HTML ve yanıtlarında tam çerez kimliği, tam IP özeti, ham IP yok; yalnızca `çerez:xxxxxxxx` / `ağ:xxxxxxxx`.
10. **Ekran görüntüsü tablosu:** `docs/qa/2026-10-27/1280x800-*.png` ve `390x844-*.png` adları; “alındı” kutusu; ekran görüntülerinin repoya eklenmesi kullanıcı kararı.
11. **Kapanış:** otomatik sonuç, manuel sonuç, açık riskler ve imza/tarih alanı. Task 30 yalnızca otomatik satırları doldurur; manuel satırlar boş kalır.

- [ ] **Step 5: Run tests, build and smoke**

Run: `cd site; node --test tests/erisilebilirlik.test.ts` → PASS.
Run: `cd site; npm test` ve `cd site; npm run build` → yeşil.
Run: `cd site; npm run dev` (ayrı terminal) → `cd site; npm run qa:duman` → `QA dumanı geçti`.
Not: `/db.json` yayını yoksa 404 bilgisi hata sayılmaz.

- [ ] **Step 6: Commit**

`git add site/tests/erisilebilirlik.test.ts site/scripts/qa-duman.mjs site/package.json docs/SITE_QA.md` → `git commit -m "site: erisilebilirlik testleri ve tarayici QA listesi"`

---

### Task 30: Doküman uzlaştırması, final doğrulama ve S7 kapanışı

**Files:**
- Modify: `site/README.md`
- Modify: `docs/PLAN_SITE.md`
- Modify: `docs/SITE_HAZIRLIK.md`
- Modify: `docs/SISTEM_TASARIMI.md`
- Modify: `docs/puan-sistemi-onerisi.md`
- Modify: `CHANGELOG.md`, `DEVIR_NOTU.md`, `PLAN.md`
- Modify: `docs/SITE_QA.md` (yalnızca otomatik sonuç satırları)
- Add (untracked → commit): `docs/superpowers/specs/2026-10-27-site-tasarimi.md`, `docs/superpowers/plans/2026-10-27-site-uygulama.md`

**Interfaces:**
- Docs must agree with code: anonymous visitor vote; editor/admin accounts; 3-vote threshold; two undo flags; lock; cookie/network block pseudonyms; archive; video does not create a channel row; admin-only publish; 30-day IP hash; no report endpoint; local fonts; separate site/extension privacy texts.
- Manual QA/store items stay unchecked and are assigned to the user.

- [ ] **Step 1: Update `site/README.md`**

- “Kural kaynağı” satırını yeni belgelere çevir: `docs/superpowers/specs/2026-10-27-site-tasarimi.md`, `docs/SISTEM_TASARIMI.md`; uygulama için `docs/superpowers/plans/2026-10-27-site-uygulama.md`.
- Durum tablosunu gerçek duruma getir: S1–S7 kodlandı; `npm test` + `npm run build` yeşil; Docker/PostgreSQL yerelde denenmedi; gerçek tarayıcı QA, ekran görüntüleri ve mağaza yüklemesi kullanıcıda.
- “Karar: avatar yok” satırını kaldır; avatarın `kanallar.avatar` ve video satırındaki `kanal_avatar` ile geldiğini, yoksa baş harf fallback’i olduğunu yaz.
- Yerel hızlı başlangıç (PowerShell):
  ```powershell
  cd site
  npm install
  Copy-Item .env.example .env
  # .env: SITE_DB=pglite, PGLITE_DIR=.pglite, SITE_ORIGIN=http://localhost:3000, IP_HASH_SECRET=...
  npm run dev
  ```
  PGlite verisi `.pglite/` altında; `npm run demo:veri` örnek kayıt ekler; `ILK_ADMIN_EPOSTA`/`ILK_ADMIN_PAROLA` ile `npm run ilk-admin`.
- Komutlar: `npm test`, `npm run tip`, `npm run build`, `npm run qa:duman`, `npm run bakim`, `npm run db:uret`, `npm run migrate`.
- Üretim: Docker Compose + PostgreSQL + Caddy; `DATABASE_URL` zorunlu; PGlite üretim imajında yok; geçişler `npm run migrate`; yedek `deploy/yedekle.sh`.
- Gizlilik: site metni `/gizlilik`; eklenti metni `docs/GIZLILIK.md`; iki metin ayrı.
- Bilinen sınırlar: Docker/Bun bu makinede yok; gerçek tarayıcı/ekran okuyucu testi yapılmadı; e-posta gönderimi, analitik, reklam, site içi “Bildir” formu yok; push kullanıcı incelemesinden sonra.

- [ ] **Step 2: Rewrite `docs/PLAN_SITE.md` as the current summary**

Uzun tarihsel planı, güncel kararlarla çelişmeyen kısa bir belgeyle değiştir:
- Başlık ve durum: “2026-10-27 itibarıyla site S1–S7 kodlandı (yerel); gerçek tarayıcı QA ve yayın kullanıcıda.”
- Bağlayıcı kaynaklar: `docs/SISTEM_TASARIMI.md` (ürün kuralları), `docs/superpowers/specs/2026-10-27-site-tasarimi.md` (site tasarımı), `docs/superpowers/plans/2026-10-27-site-uygulama.md` (uygulama), `docs/SITE_QA.md` (QA).
- Özet: Next.js + PostgreSQL/Drizzle + Docker Compose + Caddy; PGlite yalnızca dev/test; anonim çerez oyu; editör/admin hesapları; 3 oy eşiği; iki geri alma bayrağı; kilit; çerez/ağ engeli (takma etiket); arşiv; admin-only `db.json` yayını; yerel fontlar; site/eklenti gizlilik metinleri ayrı.
- “Eski ayrıntılı plan tarihseldir; yerini yukarıdaki belgelere bıraktı” notu. Eski çelişkili satırları (avatarsız kanal, ziyaretçi hesabı, tek admin, hesap gerekli oy, site içi rapor) taşıma.

- [ ] **Step 3: Reconcile `docs/SITE_HAZIRLIK.md`**

- Üst durum: “2026-10-27: roller, anonim oy, saklama ve moderasyon kararları kapandı; site kodlandı. Açık kalanlar yalnızca gerçek tarayıcı QA, alan adı, hukuki inceleme ve mağaza işleri.”
- Bölüm 1 matrisi:
  - Ziyaretçi: hesapsız; kayıtlı içeriği görür, **oy verir/değiştirir**, `db.json` indirir, kayıtsız link için talep gönderir.
  - Editör: ziyaretçi yetkileri + kayıt ekleme, talep kuyruğu, moderasyon (geri alma, kilit, çerez/ağ engeli); oyları diğerleriyle eşit ağırlıkta.
  - Admin: editör yetkileri + hesapları yönetme, metadata düzeltme, arşiv/geri getirme, `db.json` yayınlama; taksonomi **salt okunur**.
  - “Oy için hesap gerekir” ve “taksonomi yönetimi” satırlarını düzelt.
- Açık soruları çözüm durumlarıyla değiştir: çok admin + son admin koruması; editörler admin tarafından geçici parolayla açılır; editör kendi eklediği içeriğe de oy verebilir (eşit ağırlık); oylar takma etiketli/anonymous; günlük editör kotası yok, yalnızca hız sınırı; e-posta doğrulama yok (kayıt yok); veriler e-posta, parola özeti, çerez kimliği, 30 günlük IP özeti, oy/moderasyon kaydı; gizlilik metni taslak, hukuki inceleme bekliyor.
- Bölüm 4: “Bildir” uç noktası site v1’de **yok**; düğme pasif kalır; sözleşme gelecek sürüm için saklanır; siteye ağ isteği eklenmez.
- Bölüm 6: teknoloji kararı **C** (Next.js + PostgreSQL, Docker Compose/Caddy; PGlite dev/test); A/B seçenekleri tarihsel.
- Bölüm 7: S0’ın site içinde `youtube-meta.ts` ile uygulandığını, API anahtarı opsiyonel olduğunu, oEmbed/HTML fallback ve mock testlerinin olduğunu; gerçek 10+10 link kontrolünün QA listesinde olduğunu yaz. “S0 tamamlanmadan S1/S2’ye geçilmemeli” cümlesini güncel duruma çevir.
- Bölüm 8: anonim oy, video-kanal ayrımı, arşiv ve 30 günlük IP özeti notlarını ekle.

- [ ] **Step 4: Reconcile `docs/SISTEM_TASARIMI.md`**

- 7.1 Admin satırındaki “tüm listeleri düzenleme (sistem yöneticisi)” ifadesini gerçek yetkilerle değiştir: içerik metadata düzeltme, arşivleme/geri getirme, **yalnızca admin** tarafından editör/admin hesabı oluşturma ve rol/aktiflik yönetimi, yayın; taksonomi salt okunur. Aynı sınırı site tasarım belgesi §9.4’te de doğrula (hesap listeleme/oluşturma yalnızca admin).
- 7.2 son madde: IP özeti saklama süresini `✅` yap — oy kayıtlarında **30 gün**, aktif engel kaydında engel süresince; gizlilik metni `/gizlilik`.
- 7.4: metadata kaynağını “YouTube Data API (anahtar varsa) veya oEmbed/HTML fallback” yap; video eklemenin kanal satırı oluşturmadığını ekle.
- 7.5: editörün kilit/geri almayı **tek başına, gerekçeli ve kayıt altında** yaptığını `✅` yap; iki geri alma durumunu (ziyaretçi geçici, moderasyon kalıcı) ve çerez/ağ engelini ekle.
- 7.6: yayın onayının **yalnızca Admin** olduğunu `✅` yap.
- Yeni 7.7: “Site uygulama durumu (2026-10-27)” — S1–S7 yerel olarak tamam; test/build yeşil; Docker ve gerçek tarayıcı QA kullanıcıda; bağlayıcı kurallar değişmedi; belge bağlantıları.

- [ ] **Step 5: Reconcile `docs/puan-sistemi-onerisi.md`**

- Üst notu 2026-10-27 ile güncelle: uygulama notu; kod `site/lib/oy-hesabi.ts`; anonim oy (çerez başına hedef/konu/etiket başına tek oy), 3 oy eşiği, iki geri alma bayrağı, arşivli kayıtların yayına girmediği.
- “Toplam Puan”ın **net puan** olduğunu, “toplam oy”un up+kararsız+down olduğunu netleştir; eşik altı ve negatiflerin yazılmadığını koru.
- Site tasarımı/QA belgelerine bağlantı ver; bağlayıcı kaynağın `SISTEM_TASARIMI.md` olduğunu tekrar et.

- [ ] **Step 6: Update `CHANGELOG.md`, `DEVIR_NOTU.md`, `PLAN.md`**

- `CHANGELOG.md` “Yayınlanmamış” altına **“Site — YouTube Filter Store S1–S7 (2026-10-27)”** başlığı ekle: anonim oy ve çerez; iki geri alma; 3 oy eşiği; kilit; çerez/ağ engeli + takma etiket; editör paneli ve talep kuyruğu; çok admin + son admin; arşiv; `db.json` önizleme/yayın/indirme; yerel fontlar; gizlilik/koşullar/iletişim; erişilebilirlik/QA; bakım betiği. Test/build yeşil; Docker, gerçek tarayıcı QA, ekran görüntüleri ve mağaza yüklemesinin açık olduğunu; push yapılmadığını yaz.
- `DEVIR_NOTU.md` 2.7’yi “Site uygulandı (2026-10-27)” olarak güncelle; eski “henüz yapılmadı” ve “hâlâ açık” listesini kaldır. Yeni `## 9. Site devri (2026-10-27)` bölümü ekle: hızlı başlangıç, roller, güvenlik/gizlilik, test komutları, belge bağlantıları, kullanıcıda kalan manuel işler.
- `PLAN.md` 4.4’teki “Hâlâ açık” listesini “2026-10-27’de çözülenler” ile değiştir; site yol haritasına **“Site S1–S7 — ✅ kodlandı (2026-10-27)”** maddesi ekle; gerçek tarayıcı QA, Docker ve mağaza yüklemesinin açık olduğunu belirt.

- [ ] **Step 7: Final verification**

Run: `cd site; npm test` → tüm testler PASS.
Run: `cd site; npm run tip` → hata yok.
Run: `cd site; npm run build` → `Compiled successfully`.
Run: `cd site; npm run dev` (ayrı terminal) ve `cd site; npm run qa:duman` → `QA dumanı geçti`.
Run (depo kökü): `npm test` → eklenti testleri PASS.
Run (depo kökü): `npm run build:check` → `Tüm çıktılar güncel`.
`docs/SITE_QA.md` içinde yalnızca otomatik satırları (tarih, komut, sonuç) doldur; manuel/mağaza satırlarını **boş bırak**.

- [ ] **Step 8: Commit, tag, stop**

`git status --short` → yalnızca bu görevin belgeleri; `.pglite/`, ekran görüntüleri ve eklenti tarafındaki mevcut değişiklikler (`src/content.js`, `src/inject_helper.js`, `chromium/*`, `firefox/*`) **eklenmez**.
`git add site/README.md docs/PLAN_SITE.md docs/SITE_HAZIRLIK.md docs/SISTEM_TASARIMI.md docs/puan-sistemi-onerisi.md docs/SITE_QA.md CHANGELOG.md DEVIR_NOTU.md PLAN.md docs/superpowers/specs/2026-10-27-site-tasarimi.md docs/superpowers/plans/2026-10-27-site-uygulama.md` → `git commit -m "docs: site uygulama ve devir belgelerini uzlastir"`
`git tag checkpoint-site-s7`
Push **yok**. Kullanıcıya özet: ne tamamlandı, hangi komutlar yeşil, hangi manuel/mağaza işleri kullanıcıda, hangi commit/tag’ler incelenmeyi bekliyor.

---
