/**
 * Veritabanı şeması (PostgreSQL, Drizzle). Kavramsal model: docs/PLAN_SITE.md bölüm 7.
 *
 * Önemli kurallar veritabanında ZORLANIR (uygulama hatası olsa bile bozulmaz):
 *  - Bir (hedef, konu/etiket, tarayıcı kimliği) için tek oy satırı  -> oylar_tekil
 *  - Bir hedefte aynı anda tek aktif kilit                           -> kilitler_aktif_tekil
 *  - Hedef kimliği her zaman YouTube kimliğidir (ad/avatar değişse de kimlik değişmez)
 * Ham oylar silinmez: geri alınan oy `geri_alindi` ile işaretlenir.
 */
import { sql } from 'drizzle-orm';
import {
  pgTable, pgEnum, text, uuid, boolean, integer, timestamp, jsonb, uniqueIndex, index, primaryKey,
} from 'drizzle-orm/pg-core';

export const rolEnum = pgEnum('rol', ['editor', 'admin']);
export const hedefTuruEnum = pgEnum('hedef_turu', ['kanal', 'video']);
export const ogeTuruEnum = pgEnum('oge_turu', ['konu', 'etiket']);
export const oyDegeriEnum = pgEnum('oy_degeri', ['up', 'kararsiz', 'down']);
export const talepDurumuEnum = pgEnum('talep_durumu', ['bekliyor', 'kabul', 'red']);

const simdi = () => timestamp('olusturma', { withTimezone: true }).notNull().defaultNow();

/** Yalnızca Editör ve Admin hesabı vardır. Ziyaretçinin hesabı yoktur. */
export const hesaplar = pgTable('hesaplar', {
  id: uuid('id').primaryKey().defaultRandom(),
  eposta: text('eposta').notNull(),
  parolaOzeti: text('parola_ozeti').notNull(),
  rol: rolEnum('rol').notNull(),
  aktif: boolean('aktif').notNull().default(true),
  parolaDegistirmeli: boolean('parola_degistirmeli').notNull().default(true),
  sonGiris: timestamp('son_giris', { withTimezone: true }),
  olusturma: simdi(),
}, (t) => [uniqueIndex('hesaplar_eposta_tekil').on(sql`lower(${t.eposta})`)]);

/** Editör/admin oturumları. Ham token saklanmaz; yalnızca SHA-256 özeti tutulur. */
export const oturumlar = pgTable('oturumlar', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenOzeti: text('token_ozeti').notNull().unique(),
  hesapId: uuid('hesap_id').notNull().references(() => hesaplar.id, { onDelete: 'cascade' }),
  olusturma: simdi(),
  sonKullanma: timestamp('son_kullanma', { withTimezone: true }).notNull(),
  sonGorulme: timestamp('son_gorulme', { withTimezone: true }).notNull().defaultNow(),
  ipOzeti: text('ip_ozeti'),
}, (t) => [index('oturumlar_hesap').on(t.hesapId)]);

/** Sabit pencereli hız sayacı. Anahtar + pencere tekildir; eski pencereler bakımda silinir. */
export const hizLimitleri = pgTable('hiz_limitleri', {
  anahtar: text('anahtar').notNull(),
  pencere: timestamp('pencere', { withTimezone: true }).notNull(),
  sayac: integer('sayac').notNull().default(0),
}, (t) => [
  primaryKey({ columns: [t.anahtar, t.pencere] }),
  index('hiz_limitleri_pencere').on(t.pencere),
]);

/** Kanal kaydı. Avatar yok (karar: avatarsız çalışıyoruz). */
export const kanallar = pgTable('kanallar', {
  id: text('id').primaryKey(),                // UC… (24 karakter)
  handle: text('handle'),                     // @handle (isteğe bağlı)
  ad: text('ad'),
  ekleyen: uuid('ekleyen').references(() => hesaplar.id, { onDelete: 'set null' }),
  olusturma: simdi(),
}, (t) => [uniqueIndex('kanallar_handle_tekil').on(sql`lower(${t.handle})`).where(sql`${t.handle} is not null`)]);

export const videolar = pgTable('videolar', {
  id: text('id').primaryKey(),                // 11 karakter
  baslik: text('baslik'),
  kanalId: text('kanal_id').references(() => kanallar.id, { onDelete: 'set null' }),
  ekleyen: uuid('ekleyen').references(() => hesaplar.id, { onDelete: 'set null' }),
  olusturma: simdi(),
});

/** Ham oy. Kanal oyları videolara yansımaz: hedef (tür, kimlik) çiftiyle bağlanır. */
export const oylar = pgTable('oylar', {
  id: uuid('id').primaryKey().defaultRandom(),
  hedefTuru: hedefTuruEnum('hedef_turu').notNull(),
  hedefId: text('hedef_id').notNull(),
  ogeTuru: ogeTuruEnum('oge_turu').notNull(),
  ogeId: text('oge_id').notNull(),            // taksonomi kimliği (uygulama katmanında doğrulanır)
  deger: oyDegeriEnum('deger').notNull(),
  tarayiciId: text('tarayici_id').notNull(),  // anonim çerez kimliği
  ipOzeti: text('ip_ozeti'),                  // düz IP saklanmaz, özet (hash)
  geriAlindi: boolean('geri_alindi').notNull().default(false),
  geriAlan: uuid('geri_alan').references(() => hesaplar.id, { onDelete: 'set null' }),
  geriAlmaGerekce: text('geri_alma_gerekce'),
  geriAlmaZamani: timestamp('geri_alma_zamani', { withTimezone: true }),
  olusturma: simdi(),
  guncelleme: timestamp('guncelleme', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('oylar_tekil').on(t.hedefTuru, t.hedefId, t.ogeTuru, t.ogeId, t.tarayiciId),
  index('oylar_hedef').on(t.hedefTuru, t.hedefId),
  index('oylar_ip_zaman').on(t.ipOzeti, t.guncelleme),
]);

/** Ziyaretçinin "ekleme talebi". Aynı link tekrar gelirse tek satırda birleşir (talep_sayisi artar). */
export const eklemeTalepleri = pgTable('ekleme_talepleri', {
  id: uuid('id').primaryKey().defaultRandom(),
  hedefTuru: hedefTuruEnum('hedef_turu').notNull(),
  anahtar: text('anahtar').notNull(),         // video/kanal kimliği ya da küçük harfli @handle
  link: text('link').notNull(),
  durum: talepDurumuEnum('durum').notNull().default('bekliyor'),
  talepSayisi: integer('talep_sayisi').notNull().default(1),
  ilkTalep: timestamp('ilk_talep', { withTimezone: true }).notNull().defaultNow(),
  sonTalep: timestamp('son_talep', { withTimezone: true }).notNull().defaultNow(),
  isleyen: uuid('isleyen').references(() => hesaplar.id, { onDelete: 'set null' }),
}, (t) => [uniqueIndex('talepler_tekil').on(t.hedefTuru, t.anahtar)]);

/** Kayıt kilidi: kilitliyken oy gelir ama sonuç donar; db.json'a kilit anındaki sonuç yazılır. */
export const kilitler = pgTable('kilitler', {
  id: uuid('id').primaryKey().defaultRandom(),
  hedefTuru: hedefTuruEnum('hedef_turu').notNull(),
  hedefId: text('hedef_id').notNull(),
  yapan: uuid('yapan').references(() => hesaplar.id, { onDelete: 'set null' }),
  gerekce: text('gerekce').notNull(),
  sonuc: jsonb('sonuc').notNull(),            // kilit anındaki KayitSonucu
  kilitZamani: timestamp('kilit_zamani', { withTimezone: true }).notNull().defaultNow(),
  acilisZamani: timestamp('acilis_zamani', { withTimezone: true }),
}, (t) => [uniqueIndex('kilitler_aktif_tekil').on(t.hedefTuru, t.hedefId).where(sql`${t.acilisZamani} is null`)]);

export const moderasyonKayitlari = pgTable('moderasyon_kayitlari', {
  id: uuid('id').primaryKey().defaultRandom(),
  islem: text('islem').notNull(),             // 'oy-geri-al' | 'kilitle' | 'kilit-ac' | 'engelle' | ...
  yapan: uuid('yapan').references(() => hesaplar.id, { onDelete: 'set null' }),
  hedefTuru: hedefTuruEnum('hedef_turu'),
  hedefId: text('hedef_id'),
  gerekce: text('gerekce'),
  ayrinti: jsonb('ayrinti'),
  zaman: timestamp('zaman', { withTimezone: true }).notNull().defaultNow(),
});

export const engeller = pgTable('engeller', {
  id: uuid('id').primaryKey().defaultRandom(),
  tur: text('tur').notNull(),                 // 'tarayici' | 'ip'
  deger: text('deger').notNull(),             // çerez kimliği ya da IP özeti
  sebep: text('sebep'),
  yapan: uuid('yapan').references(() => hesaplar.id, { onDelete: 'set null' }),
  olusturma: simdi(),
  bitis: timestamp('bitis', { withTimezone: true }),
}, (t) => [uniqueIndex('engeller_tekil').on(t.tur, t.deger)]);

/** Yayınlanan db.json sürümleri. veri_surumu her yayında bir öncekinden büyüktür. */
export const yayinSurumleri = pgTable('yayin_surumleri', {
  veriSurumu: integer('veri_surumu').primaryKey(),
  olusturma: simdi(),
  kanalSayisi: integer('kanal_sayisi').notNull(),
  videoSayisi: integer('video_sayisi').notNull(),
  onaylayan: uuid('onaylayan').references(() => hesaplar.id, { onDelete: 'set null' }),
  icerik: jsonb('icerik').notNull(),
});
