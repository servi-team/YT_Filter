/**
 * Admin özeti: hesap sayıları, bekleyen talepler, açık kilitler ve son yayın.
 * Yayın deposuna bağımlı değildir; doğrudan `yayin_surumleri` tablosunu okur.
 */
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { eklemeTalepleri, hesaplar, kilitler, yayinSurumleri } from '../db/schema.ts';
import type { Db } from './oy-deposu.ts';

export interface SonYayinOzeti {
  veriSurumu: number;
  olusturma: Date;
  kanalSayisi: number;
  videoSayisi: number;
}

export interface AdminOzeti {
  hesaplar: number;
  aktifAdmin: number;
  bekleyenTalep: number;
  kilitli: number;
  sonYayin: SonYayinOzeti | null;
  uyarilar: string[];
}

/** Admin ana sayfası için sayaçlar ve operatör uyarıları. */
export async function adminOzeti(db: Db): Promise<AdminOzeti> {
  const [hesapSayisi] = await db.select({ sayi: sql<number>`count(*)::int` }).from(hesaplar);
  const [aktifAdminSayisi] = await db.select({ sayi: sql<number>`count(*)::int` }).from(hesaplar)
    .where(and(eq(hesaplar.rol, 'admin'), eq(hesaplar.aktif, true)));
  const [bekleyenTalepSayisi] = await db.select({ sayi: sql<number>`count(*)::int` }).from(eklemeTalepleri)
    .where(eq(eklemeTalepleri.durum, 'bekliyor'));
  const [kilitliSayisi] = await db.select({ sayi: sql<number>`count(*)::int` }).from(kilitler)
    .where(isNull(kilitler.acilisZamani));

  const [sonYayinSatiri] = await db.select({
    veriSurumu: yayinSurumleri.veriSurumu,
    olusturma: yayinSurumleri.olusturma,
    kanalSayisi: yayinSurumleri.kanalSayisi,
    videoSayisi: yayinSurumleri.videoSayisi,
  }).from(yayinSurumleri)
    .orderBy(desc(yayinSurumleri.veriSurumu))
    .limit(1);

  const aktifAdmin = Number(aktifAdminSayisi?.sayi ?? 0);
  const bekleyenTalep = Number(bekleyenTalepSayisi?.sayi ?? 0);
  const sonYayin = sonYayinSatiri ?? null;

  const uyarilar: string[] = [];
  if (aktifAdmin === 1) uyarilar.push('Yalnızca bir aktif admin var; ikinci bir admin ekleyin.');
  if (!sonYayin) uyarilar.push('Henüz yayınlanmış veri yok.');
  if (bekleyenTalep > 0) uyarilar.push(`${bekleyenTalep} bekleyen ekleme talebi var.`);

  return {
    hesaplar: Number(hesapSayisi?.sayi ?? 0),
    aktifAdmin,
    bekleyenTalep,
    kilitli: Number(kilitliSayisi?.sayi ?? 0),
    sonYayin,
    uyarilar,
  };
}
