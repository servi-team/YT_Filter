/**
 * Oy deposu: veritabanı işlemleri. Hesap kuralları burada DEĞİL, saf `oy-hesabi.ts` içindedir;
 * burası yalnızca oyu yazar ve sayımı okur. Hem node-postgres hem pglite sürücüsüyle çalışır.
 */
import { and, eq, sql } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { oylar, kilitler, moderasyonKayitlari } from '../db/schema.ts';
import { taksonomi, type KayitSonucu } from './ortak.ts';
import { bosSayim, type Sayim, type OyDegeri } from './oy-hesabi.ts';
import type { HedefTuru, OgeTuru, Sayimlar } from './tipler.ts';

export type Db = PgDatabase<any, any, any>;

const DEGERLER: OyDegeri[] = ['up', 'kararsiz', 'down'];

export interface OyGirdisi {
  hedefTuru: HedefTuru;
  hedefId: string;
  ogeTuru: OgeTuru;
  ogeId: string;
  deger: OyDegeri;
  tarayiciId: string;
  ipOzeti?: string | null;
}

/** Konu/etiket kimliği ve oy değeri doğrulanır; bilinmeyen kimlikle oy YAZILMAZ. */
export function oyGirdisiDogrula(g: OyGirdisi): void {
  const idler = (g.ogeTuru === 'konu' ? taksonomi.KONULAR : taksonomi.ETIKETLER).map(x => x.id);
  if (!idler.includes(g.ogeId)) throw new Error(`Bilinmeyen ${g.ogeTuru}: ${g.ogeId}`);
  if (!DEGERLER.includes(g.deger)) throw new Error(`Geçersiz oy değeri: ${g.deger}`);
  if (!g.tarayiciId || g.tarayiciId.length > 100) throw new Error('Geçersiz tarayıcı kimliği.');
}

/**
 * Oy verir. Aynı tarayıcı aynı konu/etikette tekrar oy verirse YENİ satır açılmaz, eski oy güncellenir.
 * Moderasyonla geri alınmış oy, sahibi tekrar oy verse de geri alınmış kalır (geri alma sabittir).
 */
export async function oyVer(db: Db, g: OyGirdisi): Promise<void> {
  oyGirdisiDogrula(g);
  await db.insert(oylar).values({
    hedefTuru: g.hedefTuru, hedefId: g.hedefId, ogeTuru: g.ogeTuru, ogeId: g.ogeId,
    deger: g.deger, tarayiciId: g.tarayiciId, ipOzeti: g.ipOzeti ?? null,
  }).onConflictDoUpdate({
    target: [oylar.hedefTuru, oylar.hedefId, oylar.ogeTuru, oylar.ogeId, oylar.tarayiciId],
    set: {
      deger: g.deger,
      ipOzeti: g.ipOzeti ?? null,
      // Ziyaretçi yeniden oy verince kendi geri alması temizlenir; moderasyon bayrağı korunur.
      ziyaretciGeriAlindi: false,
      guncelleme: sql`now()`,
    },
  });
}

/** Bir hedefin konu ve etiket sayımları. Geri alınan oylar hesaba girmez. */
export async function sayimlariGetir(db: Db, hedefTuru: HedefTuru, hedefId: string): Promise<Sayimlar> {
  const satirlar = await db.select({
    ogeTuru: oylar.ogeTuru, ogeId: oylar.ogeId, deger: oylar.deger,
    adet: sql<number>`count(*)::int`,
  }).from(oylar)
    .where(and(
      eq(oylar.hedefTuru, hedefTuru),
      eq(oylar.hedefId, hedefId),
      eq(oylar.moderasyonGeriAlindi, false),
      eq(oylar.ziyaretciGeriAlindi, false),
    ))
    .groupBy(oylar.ogeTuru, oylar.ogeId, oylar.deger);

  const konular: Record<string, Sayim> = {};
  const etiketler: Record<string, Sayim> = {};
  for (const s of satirlar) {
    const hedef = s.ogeTuru === 'konu' ? konular : etiketler;
    (hedef[s.ogeId] ??= bosSayim())[s.deger] = s.adet;
  }
  return { konular, etiketler };
}

export interface BenimOy {
  ogeTuru: OgeTuru;
  ogeId: string;
  deger: OyDegeri;
  ziyaretciGeriAlindi: boolean;
  moderasyonGeriAlindi: boolean;
}

/** Bir tarayıcının bu hedefteki mevcut oyları (arayüzde seçili düğmeleri göstermek için). */
export async function benimOylarim(db: Db, hedefTuru: HedefTuru, hedefId: string, tarayiciId: string): Promise<BenimOy[]> {
  return db.select({
    ogeTuru: oylar.ogeTuru,
    ogeId: oylar.ogeId,
    deger: oylar.deger,
    ziyaretciGeriAlindi: oylar.ziyaretciGeriAlindi,
    moderasyonGeriAlindi: oylar.moderasyonGeriAlindi,
  }).from(oylar)
    .where(and(eq(oylar.hedefTuru, hedefTuru), eq(oylar.hedefId, hedefId), eq(oylar.tarayiciId, tarayiciId)));
}

/** Editör: bir tarayıcının bu hedefteki TÜM oylarını geri alır (silmez, işaretler). Gerekçe zorunlu. */
export async function oylariGeriAl(db: Db, p: {
  hedefTuru: HedefTuru; hedefId: string; tarayiciId: string; yapan: string; gerekce: string;
}): Promise<number> {
  if (!p.gerekce.trim()) throw new Error('Gerekçe zorunlu.');
  return db.transaction(async (tx) => {
    const etkilenen = await tx.update(oylar).set({
      moderasyonGeriAlindi: true, geriAlan: p.yapan, geriAlmaGerekce: p.gerekce, geriAlmaZamani: sql`now()`,
    }).where(and(
      eq(oylar.hedefTuru, p.hedefTuru), eq(oylar.hedefId, p.hedefId),
      eq(oylar.tarayiciId, p.tarayiciId), eq(oylar.moderasyonGeriAlindi, false),
    )).returning({ id: oylar.id });
    await tx.insert(moderasyonKayitlari).values({
      islem: 'oy-geri-al', yapan: p.yapan, hedefTuru: p.hedefTuru, hedefId: p.hedefId, gerekce: p.gerekce,
      ayrinti: { tarayiciId: p.tarayiciId, adet: etkilenen.length },
    });
    return etkilenen.length;
  });
}

/** Aktif kilidi (varsa) döndürür. */
export async function aktifKilit(db: Db, hedefTuru: HedefTuru, hedefId: string) {
  const [k] = await db.select().from(kilitler).where(and(
    eq(kilitler.hedefTuru, hedefTuru), eq(kilitler.hedefId, hedefId), sql`${kilitler.acilisZamani} is null`,
  ));
  return k ?? null;
}

/** Editör: kaydı kilitler; kilit anındaki sonuç saklanır. Zaten kilitliyse hata verir. */
export async function kilitle(db: Db, p: {
  hedefTuru: HedefTuru; hedefId: string; yapan: string; gerekce: string; sonuc: KayitSonucu;
}): Promise<void> {
  if (!p.gerekce.trim()) throw new Error('Gerekçe zorunlu.');
  await db.transaction(async (tx) => {
    await tx.insert(kilitler).values({
      hedefTuru: p.hedefTuru, hedefId: p.hedefId, yapan: p.yapan, gerekce: p.gerekce, sonuc: p.sonuc,
    });
    await tx.insert(moderasyonKayitlari).values({
      islem: 'kilitle', yapan: p.yapan, hedefTuru: p.hedefTuru, hedefId: p.hedefId, gerekce: p.gerekce,
    });
  });
}

export async function kilidiAc(db: Db, p: { hedefTuru: HedefTuru; hedefId: string; yapan: string; gerekce: string }): Promise<boolean> {
  if (!p.gerekce.trim()) throw new Error('Gerekçe zorunlu.');
  return db.transaction(async (tx) => {
    const acilan = await tx.update(kilitler).set({ acilisZamani: sql`now()` }).where(and(
      eq(kilitler.hedefTuru, p.hedefTuru), eq(kilitler.hedefId, p.hedefId), sql`${kilitler.acilisZamani} is null`,
    )).returning({ id: kilitler.id });
    if (acilan.length) {
      await tx.insert(moderasyonKayitlari).values({
        islem: 'kilit-ac', yapan: p.yapan, hedefTuru: p.hedefTuru, hedefId: p.hedefId, gerekce: p.gerekce,
      });
    }
    return acilan.length > 0;
  });
}
