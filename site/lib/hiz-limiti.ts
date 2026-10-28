/**
 * Sabit pencereli hız sayacı. Anahtar + pencere tekildir; aynı penceredeki
 * istekler tek satırda toplanır. Eski pencereler bakımda silinir.
 */
import { and, eq, sql } from 'drizzle-orm';
import { hizLimitleri } from '../db/schema.ts';
import type { Db } from './oy-deposu.ts';

export interface PencereKurali {
  anahtar: string;
  pencereSaniye: number;
}

/** Pencerenin başlangıcı: `floor(simdi / pencere) * pencere` (saniye). */
export function pencereBaslangici(simdi: Date, pencereSaniye: number): Date {
  const pencereMs = pencereSaniye * 1000;
  return new Date(Math.floor(simdi.getTime() / pencereMs) * pencereMs);
}

/** Sayacı `adet` kadar artırır ve güncel değeri döndürür. */
export async function sayacArtir(
  db: Db,
  kural: PencereKurali,
  simdi: Date = new Date(),
  adet = 1,
): Promise<number> {
  const pencere = pencereBaslangici(simdi, kural.pencereSaniye);
  const [satir] = await db.insert(hizLimitleri)
    .values({ anahtar: kural.anahtar, pencere, sayac: adet })
    .onConflictDoUpdate({
      target: [hizLimitleri.anahtar, hizLimitleri.pencere],
      set: { sayac: sql`${hizLimitleri.sayac} + ${adet}` },
    })
    .returning({ sayac: hizLimitleri.sayac });

  return satir?.sayac ?? adet;
}

/** Sayacı artırmadan okur; kayıt yoksa 0. */
export async function sayacOku(
  db: Db,
  kural: PencereKurali,
  simdi: Date = new Date(),
): Promise<number> {
  const pencere = pencereBaslangici(simdi, kural.pencereSaniye);
  const [satir] = await db.select({ sayac: hizLimitleri.sayac })
    .from(hizLimitleri)
    .where(and(eq(hizLimitleri.anahtar, kural.anahtar), eq(hizLimitleri.pencere, pencere)));
  return satir?.sayac ?? 0;
}

/** Sayacı bir artırıp `adet` sınırını aşıp aşmadığını söyler. */
export async function limitAsildiMi(
  db: Db,
  kural: { anahtar: string; adet: number; pencereSaniye: number },
  simdi: Date = new Date(),
): Promise<boolean> {
  const sayac = await sayacArtir(db, { anahtar: kural.anahtar, pencereSaniye: kural.pencereSaniye }, simdi, 1);
  return sayac > kural.adet;
}
