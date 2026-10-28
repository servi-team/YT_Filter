/**
 * Aktif engel sorgusu. Engel; tarayıcı çerezi (`tur='tarayici'`) veya IP
 * özeti (`tur='ip'`) üzerinden konur. `bitis` boşsa süresizdir; doluysa
 * yalnızca gelecekteyse aktiftir.
 */
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { engeller } from '../db/schema.ts';
import type { Db } from './oy-deposu.ts';

export async function aktifEngelVarMi(
  db: Db,
  p: { tarayiciId: string; ipOzeti: string | null },
  simdi: Date = new Date(),
): Promise<boolean> {
  const tarayiciKosulu = and(eq(engeller.tur, 'tarayici'), eq(engeller.deger, p.tarayiciId));
  const ipKosulu = p.ipOzeti
    ? and(eq(engeller.tur, 'ip'), eq(engeller.deger, p.ipOzeti))
    : undefined;

  const [satir] = await db.select({ id: engeller.id }).from(engeller)
    .where(and(
      ipKosulu ? or(tarayiciKosulu, ipKosulu) : tarayiciKosulu,
      or(isNull(engeller.bitis), gt(engeller.bitis, simdi)),
    ))
    .limit(1);

  return Boolean(satir);
}
