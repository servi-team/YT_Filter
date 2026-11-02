/**
 * Yayın deposu: yayın adayı üretimi, db.json sürümlerinin yazılması ve
 * okunması. Aday her zaman yalnızca arşivlenmemiş kayıtlardan, oy sayımları ve
 * aktif kilit sonuçları üzerinden üretilir; yayınlanmış sürümler değiştirilmez.
 */
import { desc, eq, sql } from 'drizzle-orm';
import { hesaplar, kanallar, videolar, yayinSurumleri } from '../db/schema.ts';
import { dbUret, type HedefGirdi } from './db-uret.ts';
import { HttpHatasi } from './hata.ts';
import { DB_SEMA, type KayitSonucu } from './ortak.ts';
import { aktifKilit, sayimlariGetir, type Db } from './oy-deposu.ts';
import type { HedefTuru } from './tipler.ts';

export interface YayinIcerik {
  sema: number;
  veriSurumu: number;
  olusturma?: string;
  kanallar: unknown[];
  videolar: unknown[];
}

export interface YayinOzeti {
  kanal: number;
  video: number;
  yazilmayan: number;
}

export interface YayinAdayi {
  veriSurumu: number;
  icerik: YayinIcerik;
  ozet: YayinOzeti;
  hatalar: string[];
  uyarilar: string[];
  gecerli: boolean;
}

export interface YayinSatiri {
  veriSurumu: number;
  olusturma: Date;
  kanalSayisi: number;
  videoSayisi: number;
  onaylayan: string | null;
  notlar: string | null;
  icerik: YayinIcerik;
}

export type YayinOzetSatiri = Omit<YayinSatiri, 'icerik'>;

function tekilIhlaliMi(hata: unknown): boolean {
  if (!hata || typeof hata !== 'object') return false;
  const h = hata as {
    code?: unknown;
    message?: unknown;
    cause?: { code?: unknown; message?: unknown };
  };
  if (h.code === '23505' || h.cause?.code === '23505') return true;
  const metin = `${String(h.message ?? '')} ${String(h.cause?.message ?? '')}`.toLocaleLowerCase('tr-TR');
  return metin.includes('duplicate key') || metin.includes('unique constraint');
}

function tarihMetni(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(new Date());
}

async function sonSurum(db: Db): Promise<number> {
  const [satir] = await db.select({
    enBuyuk: sql<number>`max(${yayinSurumleri.veriSurumu})::int`,
  }).from(yayinSurumleri);
  return Number(satir?.enBuyuk ?? 0);
}

async function kayitGirdisi(
  db: Db,
  tur: HedefTuru,
  satir: { id: string },
): Promise<HedefGirdi> {
  const sayimlar = await sayimlariGetir(db, tur, satir.id);
  const kilit = await aktifKilit(db, tur, satir.id);

  const ortak = {
    konular: sayimlar.konular,
    etiketler: sayimlar.etiketler,
    kilitliSonuc: (kilit?.sonuc ?? null) as KayitSonucu | null,
  };

  if (tur === 'kanal') {
    const kanal = satir as { id: string; handle?: string | null; ad?: string | null; avatar?: string | null };
    return {
      tur: 'kanal',
      id: kanal.id,
      handle: kanal.handle ?? null,
      ad: kanal.ad ?? null,
      avatar: kanal.avatar ?? null,
      ...ortak,
    };
  }

  return { tur: 'video', id: satir.id, ...ortak };
}

/** Yayınlanacak adayı üretir; doğrulama hatasını fırlatmak yerine sonuca yazar. */
export async function yayinAdayiUret(
  db: Db,
  secenek: { veriSurumu?: number } = {},
): Promise<YayinAdayi> {
  const enBuyuk = await sonSurum(db);
  const adaySurum = secenek.veriSurumu ?? enBuyuk + 1;

  const bosIcerik = (): YayinIcerik => ({
    sema: DB_SEMA,
    veriSurumu: adaySurum,
    kanallar: [],
    videolar: [],
  });
  const bosOzet: YayinOzeti = { kanal: 0, video: 0, yazilmayan: 0 };

  try {
    const kanalSatirlari = await db.select().from(kanallar).where(eq(kanallar.arsivlendi, false));
    const videoSatirlari = await db.select().from(videolar).where(eq(videolar.arsivlendi, false));

    const kayitlar: HedefGirdi[] = [];
    for (const satir of kanalSatirlari) kayitlar.push(await kayitGirdisi(db, 'kanal', satir));
    for (const satir of videoSatirlari) kayitlar.push(await kayitGirdisi(db, 'video', satir));

    const sonuc = dbUret({
      kayitlar,
      veriSurumu: adaySurum,
      oncekiSurum: enBuyuk || undefined,
      olusturma: tarihMetni(),
    });

    const uyarilar: string[] = [];
    if (sonuc.ozet.yazilmayan > 0) {
      uyarilar.push(`${sonuc.ozet.yazilmayan} kayıt eşik altında olduğu için dosyaya yazılmadı.`);
    }
    if (kayitlar.length === 0) uyarilar.push('Hiç aktif kayıt yok.');

    return {
      veriSurumu: adaySurum,
      icerik: sonuc.json as unknown as YayinIcerik,
      ozet: sonuc.ozet,
      hatalar: [],
      uyarilar,
      gecerli: true,
    };
  } catch (hata) {
    return {
      veriSurumu: adaySurum,
      icerik: bosIcerik(),
      ozet: bosOzet,
      hatalar: [hata instanceof Error ? hata.message : 'Yayın adayı üretilemedi.'],
      uyarilar: [],
      gecerli: false,
    };
  }
}

/** Notları 500 karaktere kırpar; boş not `null` olur. */
function notlariKirp(notlar: string | undefined | null): string | null {
  const temiz = notlar?.trim().slice(0, 500) ?? '';
  return temiz ? temiz : null;
}

/** Yeni bir sürüm yayınlar; eşzamanlı çakışmalarda sürümü yeniden üretir. */
export async function yayinla(
  db: Db,
  girdi: { notlar?: string | null; onaylayan: string },
): Promise<{ veriSurumu: number; icerik: YayinIcerik; ozet: YayinOzeti; indirmeAdi: string }> {
  if (!girdi.onaylayan) {
    throw new HttpHatasi(400, 'onaylayan-yok', 'Onaylayan hesap gerekli.');
  }
  const notlar = notlariKirp(girdi.notlar);

  for (let deneme = 0; deneme <= 2; deneme++) {
    const sonraki = (await sonSurum(db)) + 1;
    const aday = await yayinAdayiUret(db, { veriSurumu: sonraki });

    if (!aday.gecerli) {
      throw new HttpHatasi(422, 'gecersiz-icerik', aday.hatalar[0] ?? 'İçerik geçersiz.');
    }
    if (aday.icerik.veriSurumu !== sonraki) {
      throw new HttpHatasi(500, 'surum-uyusmazligi', 'Yayın sürümü içerikle eşleşmedi.');
    }

    try {
      await db.transaction(async (tx) => {
        await tx.insert(yayinSurumleri).values({
          veriSurumu: sonraki,
          kanalSayisi: aday.ozet.kanal,
          videoSayisi: aday.ozet.video,
          onaylayan: girdi.onaylayan,
          notlar,
          icerik: aday.icerik,
        });
      });

      return {
        veriSurumu: sonraki,
        icerik: aday.icerik,
        ozet: aday.ozet,
        indirmeAdi: yayinIndirmeAdi(sonraki),
      };
    } catch (hata) {
      if (tekilIhlaliMi(hata)) {
        if (deneme < 2) continue;
        throw new HttpHatasi(409, 'surum-cakismasi', 'Yayın sürümü çakıştı; yeniden deneyin.');
      }
      throw hata;
    }
  }

  throw new HttpHatasi(409, 'surum-cakismasi', 'Yayın sürümü çakıştı; yeniden deneyin.');
}

/** İndirilen dosyanın adı. */
export function yayinIndirmeAdi(veriSurumu: number): string {
  return `yt-filter-db-v${veriSurumu}.json`;
}

function satiraCevir(satir: {
  veriSurumu: number;
  olusturma: Date;
  kanalSayisi: number;
  videoSayisi: number;
  onaylayan: string | null;
  notlar: string | null;
  icerik: unknown;
}): YayinSatiri {
  return {
    ...satir,
    icerik: satir.icerik as YayinIcerik,
  };
}

const SECILI_ALANLAR = {
  veriSurumu: yayinSurumleri.veriSurumu,
  olusturma: yayinSurumleri.olusturma,
  kanalSayisi: yayinSurumleri.kanalSayisi,
  videoSayisi: yayinSurumleri.videoSayisi,
  onaylayan: hesaplar.eposta,
  notlar: yayinSurumleri.notlar,
} as const;

/** En son yayınlanan sürümü (içeriğiyle) döndürür. */
export async function sonYayin(db: Db): Promise<YayinSatiri | null> {
  const [satir] = await db.select({
    ...SECILI_ALANLAR,
    icerik: yayinSurumleri.icerik,
  }).from(yayinSurumleri)
    .leftJoin(hesaplar, eq(yayinSurumleri.onaylayan, hesaplar.id))
    .orderBy(desc(yayinSurumleri.veriSurumu))
    .limit(1);

  return satir ? satiraCevir(satir) : null;
}

/** Belirli bir yayın sürümünü (içeriğiyle) döndürür. */
export async function yayinGetir(db: Db, veriSurumu: number): Promise<YayinSatiri | null> {
  const [satir] = await db.select({
    ...SECILI_ALANLAR,
    icerik: yayinSurumleri.icerik,
  }).from(yayinSurumleri)
    .leftJoin(hesaplar, eq(yayinSurumleri.onaylayan, hesaplar.id))
    .where(eq(yayinSurumleri.veriSurumu, veriSurumu))
    .limit(1);

  return satir ? satiraCevir(satir) : null;
}

/** Son yayınları içerikleri olmadan listeler (varsayılan ve üst sınır 50). */
export async function yayinGecmisi(db: Db, limit = 50): Promise<YayinOzetSatiri[]> {
  const adet = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 50;
  const satirlar = await db.select(SECILI_ALANLAR).from(yayinSurumleri)
    .leftJoin(hesaplar, eq(yayinSurumleri.onaylayan, hesaplar.id))
    .orderBy(desc(yayinSurumleri.veriSurumu))
    .limit(adet);

  return satirlar;
}
