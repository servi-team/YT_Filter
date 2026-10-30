/**
 * Editör paneli özeti: bekleyen talepler, sayılan oylar, kilitli kayıtlar,
 * son moderasyon işlemleri ve YouTube kotası. Oy filtresi S2 sayımıyla
 * aynıdır: iki geri alma bayrağı false ve aktif engelli çerez/IP yok.
 */
import { and, desc, eq, gt, isNull, notExists, or, sql } from 'drizzle-orm';
import { eklemeTalepleri, engeller, hesaplar, kilitler, moderasyonKayitlari, oylar } from '../db/schema.ts';
import type { Db } from './oy-deposu.ts';
import type { HedefTuru } from './tipler.ts';
import { kotaDurumu, type KotaDurumu } from './youtube-kota.ts';

export interface SonModerasyon {
  islem: string;
  hedefTuru: HedefTuru | null;
  hedefId: string | null;
  gerekce: string | null;
  zaman: Date;
  yapanEposta: string | null;
}

export interface PanelOzeti {
  bekleyenTalep: number;
  toplamOy: number;
  kilitli: number;
  sonModerasyon: SonModerasyon[];
  kota: KotaDurumu;
}

/** Panelin dört sayaç kartı ve son moderasyon listesi. */
export async function panelOzeti(db: Db): Promise<PanelOzeti> {
  const [bekleyen] = await db.select({ sayi: sql<number>`count(*)::int` }).from(eklemeTalepleri)
    .where(eq(eklemeTalepleri.durum, 'bekliyor'));

  const aktifEngelYok = notExists(
    db.select({ bir: sql`1` }).from(engeller).where(and(
      or(
        and(eq(engeller.tur, 'tarayici'), eq(engeller.deger, oylar.tarayiciId)),
        and(eq(engeller.tur, 'ip'), eq(engeller.deger, oylar.ipOzeti)),
      ),
      or(isNull(engeller.bitis), gt(engeller.bitis, sql`now()`)),
    )),
  );

  const [oylarSayisi] = await db.select({ sayi: sql<number>`count(*)::int` }).from(oylar)
    .where(and(
      eq(oylar.moderasyonGeriAlindi, false),
      eq(oylar.ziyaretciGeriAlindi, false),
      aktifEngelYok,
    ));

  const [kilitli] = await db.select({ sayi: sql<number>`count(*)::int` }).from(kilitler)
    .where(isNull(kilitler.acilisZamani));

  const sonModerasyon = await db.select({
    islem: moderasyonKayitlari.islem,
    hedefTuru: moderasyonKayitlari.hedefTuru,
    hedefId: moderasyonKayitlari.hedefId,
    gerekce: moderasyonKayitlari.gerekce,
    zaman: moderasyonKayitlari.zaman,
    yapanEposta: hesaplar.eposta,
  }).from(moderasyonKayitlari)
    .leftJoin(hesaplar, eq(moderasyonKayitlari.yapan, hesaplar.id))
    .orderBy(desc(moderasyonKayitlari.zaman))
    .limit(5);

  return {
    bekleyenTalep: Number(bekleyen?.sayi ?? 0),
    toplamOy: Number(oylarSayisi?.sayi ?? 0),
    kilitli: Number(kilitli?.sayi ?? 0),
    sonModerasyon: sonModerasyon.map((satir) => ({
      islem: satir.islem,
      hedefTuru: satir.hedefTuru,
      hedefId: satir.hedefId,
      gerekce: satir.gerekce,
      zaman: satir.zaman,
      yapanEposta: satir.yapanEposta,
    })),
    kota: await kotaDurumu(db),
  };
}
