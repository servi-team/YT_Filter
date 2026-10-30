/**
 * Bakım işleri: 30 günden eski oy IP özetlerini temizler, süresi dolmuş
 * oturum/engel satırlarını ve eski hız limiti pencerelerini siler. Tüm
 * adımlar tek transaction içinde çalışır; oy satırı silinmez.
 */
import { sql } from 'drizzle-orm';
import type { Db } from './oy-deposu.ts';

export const GUN = 86_400_000;

export interface BakimSonucu {
  ipOzeti: number;
  oturum: number;
  engel: number;
  hizLimiti: number;
}

interface SatirSonucu {
  rows: unknown[];
}

export async function bakimYap(
  db: Db,
  { simdi = new Date(), ipGun = 30 }: { simdi?: Date; ipGun?: number } = {},
): Promise<BakimSonucu> {
  const ipEsik = new Date(simdi.getTime() - ipGun * GUN);
  const hizEsik = new Date(simdi.getTime() - 2 * GUN);

  return db.transaction(async (tx) => {
    const ip = await tx.execute(sql`
      update oylar
      set ip_ozeti = null
      where ip_ozeti is not null and guncelleme < ${ipEsik}
      returning id
    `) as unknown as SatirSonucu;

    const oturum = await tx.execute(sql`
      delete from oturumlar
      where son_kullanma <= ${simdi}
      returning id
    `) as unknown as SatirSonucu;

    const engel = await tx.execute(sql`
      delete from engeller
      where bitis is not null and bitis <= ${simdi}
      returning id
    `) as unknown as SatirSonucu;

    const hizLimiti = await tx.execute(sql`
      delete from hiz_limitleri
      where pencere < ${hizEsik}
      returning anahtar
    `) as unknown as SatirSonucu;

    return {
      ipOzeti: ip.rows.length,
      oturum: oturum.rows.length,
      engel: engel.rows.length,
      hizLimiti: hizLimiti.rows.length,
    };
  });
}
