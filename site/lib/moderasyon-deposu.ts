/**
 * Moderasyon deposu: panelin oy satırlarını, geri alma, kilit ve engel
 * işlemlerini yönetir. Panelde ve moderasyon kayıtlarında ham çerez/IP
 * değerleri tutulmaz; yalnızca kısa takma etiketler döner.
 */
import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { engeller, hesaplar, moderasyonKayitlari, oylar } from '../db/schema.ts';
import { icerikGetir } from './icerik-deposu.ts';
import { HttpHatasi } from './hata.ts';
import { sonucHesapla } from './oy-hesabi.ts';
import {
  aktifKilit,
  kilidiAc,
  kilitle,
  sayimlariGetir,
  type Db,
} from './oy-deposu.ts';
import { taksonomi } from './ortak.ts';
import type { HedefTuru, OgeTuru } from './tipler.ts';
import type { OyDegeri } from './oy-hesabi.ts';
import { kimlikEtiketi } from './ziyaretci.ts';

export type GeriAlmaKapsami = 'tek' | 'cerez-kayit' | 'cerez-site';
export type EngelKapsami = 'cerez' | 'ag';

export type OyDurumu = 'aktif' | 'ziyaretci-geri-alindi' | 'moderasyon-geri-alindi' | 'engelli';

export interface OySatiri {
  id: string;
  ogeTuru: OgeTuru;
  ogeId: string;
  deger: OyDegeri;
  etiket: string;
  ipEtiketi: string | null;
  durum: OyDurumu;
  olusturma: Date;
  guncelleme: Date;
}

export interface EngelSatiri {
  id: string;
  tur: 'tarayici' | 'ip';
  etiket: string;
  sebep: string | null;
  yapanEposta: string | null;
  olusturma: Date;
  bitis: Date | null;
}

export interface ModerasyonSatiri {
  id: string;
  islem: string;
  yapanEposta: string | null;
  hedefTuru: HedefTuru | null;
  hedefId: string | null;
  gerekce: string | null;
  ayrinti: unknown;
  zaman: Date;
}

const KONU_SIRASI = taksonomi.KONULAR.map((konu) => konu.id);
const ETIKET_SIRASI = taksonomi.ETIKETLER.map((etiket) => etiket.id);

/** Boş/boşluk gerekçeyi 422 ile reddeder; kırpılmış metni döndürür. */
function gerekceDogrula(gerekce: string): string {
  const temiz = typeof gerekce === 'string' ? gerekce.trim() : '';
  if (!temiz) throw new HttpHatasi(422, 'gerekce', 'Gerekçe zorunlu.');
  return temiz;
}

/** PostgreSQL/PGlite tekil indeks ihlalini tanır. */
function tekilIhlaliMi(hata: unknown): boolean {
  if (!hata || typeof hata !== 'object') return false;
  const h = hata as { code?: unknown; message?: unknown; cause?: { message?: unknown } };
  if (h.code === '23505') return true;
  const metin = `${String(h.message ?? '')} ${String(h.cause?.message ?? '')}`.toLocaleLowerCase('tr-TR');
  return metin.includes('duplicate key')
    || metin.includes('kilitler_aktif_tekil')
    || metin.includes('unique constraint');
}

/**
 * Panel oy tablosu. Satırlar güncelleme zamanına göre yenidir; ham çerez/IP
 * değerleri döndürülmez. Durum önceliği: moderasyon geri aldı → ziyaretçi
 * geri aldı → engelli → aktif.
 */
export async function oySatirlari(
  db: Db,
  hedefTuru: HedefTuru,
  hedefId: string,
  simdi: Date = new Date(),
): Promise<OySatiri[]> {
  const satirlar = await db.select({
    id: oylar.id,
    ogeTuru: oylar.ogeTuru,
    ogeId: oylar.ogeId,
    deger: oylar.deger,
    tarayiciId: oylar.tarayiciId,
    ipOzeti: oylar.ipOzeti,
    moderasyonGeriAlindi: oylar.moderasyonGeriAlindi,
    ziyaretciGeriAlindi: oylar.ziyaretciGeriAlindi,
    olusturma: oylar.olusturma,
    guncelleme: oylar.guncelleme,
  }).from(oylar)
    .where(and(eq(oylar.hedefTuru, hedefTuru), eq(oylar.hedefId, hedefId)))
    .orderBy(desc(oylar.guncelleme), desc(oylar.olusturma));

  const aktifEngeller = await db.select({
    tur: engeller.tur,
    deger: engeller.deger,
  }).from(engeller)
    .where(or(isNull(engeller.bitis), gt(engeller.bitis, simdi)));

  const engelliCerezler = new Set(
    aktifEngeller.filter((e) => e.tur === 'tarayici').map((e) => e.deger),
  );
  const engelliIpler = new Set(
    aktifEngeller.filter((e) => e.tur === 'ip').map((e) => e.deger),
  );

  return satirlar.map((satir) => {
    let durum: OyDurumu = 'aktif';
    if (satir.moderasyonGeriAlindi) durum = 'moderasyon-geri-alindi';
    else if (satir.ziyaretciGeriAlindi) durum = 'ziyaretci-geri-alindi';
    else if (engelliCerezler.has(satir.tarayiciId)
      || (satir.ipOzeti !== null && engelliIpler.has(satir.ipOzeti))) {
      durum = 'engelli';
    }

    return {
      id: satir.id,
      ogeTuru: satir.ogeTuru,
      ogeId: satir.ogeId,
      deger: satir.deger,
      etiket: kimlikEtiketi('cerez', satir.tarayiciId),
      ipEtiketi: satir.ipOzeti ? kimlikEtiketi('ağ', satir.ipOzeti) : null,
      durum,
      olusturma: satir.olusturma,
      guncelleme: satir.guncelleme,
    };
  });
}

/**
 * Seçili oyu kalıcı olarak geri alır. `tek` yalnızca satırı, `cerez-kayit`
 * aynı çerezin bu hedefteki, `cerez-site` tüm hedeflerdeki oylarını kapatır.
 */
export async function oyGeriAlModerasyon(
  db: Db,
  p: { oyId: string; kapsam: GeriAlmaKapsami; yapan: string; gerekce: string },
): Promise<{ adet: number; etiket: string }> {
  const [secili] = await db.select({
    id: oylar.id,
    hedefTuru: oylar.hedefTuru,
    hedefId: oylar.hedefId,
    tarayiciId: oylar.tarayiciId,
    moderasyonGeriAlindi: oylar.moderasyonGeriAlindi,
  }).from(oylar).where(eq(oylar.id, p.oyId));

  if (!secili) throw new HttpHatasi(404, 'oy-yok', 'Oy bulunamadı.');

  const gerekce = gerekceDogrula(p.gerekce);
  if (secili.moderasyonGeriAlindi) {
    throw new HttpHatasi(409, 'zaten-geri-alindi', 'Bu oy zaten moderasyonla geri alındı.');
  }

  const etiket = kimlikEtiketi('cerez', secili.tarayiciId);
  const kapsamKosulu = p.kapsam === 'tek'
    ? eq(oylar.id, secili.id)
    : p.kapsam === 'cerez-kayit'
      ? and(
        eq(oylar.tarayiciId, secili.tarayiciId),
        eq(oylar.hedefTuru, secili.hedefTuru),
        eq(oylar.hedefId, secili.hedefId),
      )
      : eq(oylar.tarayiciId, secili.tarayiciId);

  const adet = await db.transaction(async (tx) => {
    const etkilenen = await tx.update(oylar).set({
      moderasyonGeriAlindi: true,
      geriAlan: p.yapan,
      geriAlmaGerekce: gerekce,
      geriAlmaZamani: sql`now()`,
    }).where(and(kapsamKosulu, eq(oylar.moderasyonGeriAlindi, false)))
      .returning({ id: oylar.id });

    await tx.insert(moderasyonKayitlari).values({
      islem: 'oy-geri-al',
      yapan: p.yapan,
      hedefTuru: secili.hedefTuru,
      hedefId: secili.hedefId,
      gerekce,
      ayrinti: { kapsam: p.kapsam, oyId: secili.id, etiket, adet: etkilenen.length },
    });

    return etkilenen.length;
  });

  return { adet, etiket };
}

/** Aktif kaydı kilitler; kilit anındaki sonuç jsonb olarak saklanır. */
export async function kayitKilitle(
  db: Db,
  p: { hedefTuru: HedefTuru; hedefId: string; yapan: string; gerekce: string },
): Promise<void> {
  const gerekce = gerekceDogrula(p.gerekce);

  const icerik = await icerikGetir(db, p.hedefTuru, p.hedefId);
  if (!icerik) throw new HttpHatasi(404, 'icerik-yok', 'İçerik bulunamadı.');
  if (await aktifKilit(db, p.hedefTuru, p.hedefId)) {
    throw new HttpHatasi(409, 'zaten-kilitli', 'Bu kayıt zaten kilitli.');
  }

  const sayimlar = await sayimlariGetir(db, p.hedefTuru, p.hedefId);
  const sonuc = sonucHesapla(sayimlar.konular, sayimlar.etiketler, KONU_SIRASI, ETIKET_SIRASI);

  try {
    await kilitle(db, {
      hedefTuru: p.hedefTuru,
      hedefId: p.hedefId,
      yapan: p.yapan,
      gerekce,
      sonuc,
    });
  } catch (hata) {
    if (tekilIhlaliMi(hata)) {
      throw new HttpHatasi(409, 'zaten-kilitli', 'Bu kayıt zaten kilitli.');
    }
    throw hata;
  }
}

/** Açık kilidi kaldırır; aktif kilit yoksa 409. */
export async function kayitKilidiniAc(
  db: Db,
  p: { hedefTuru: HedefTuru; hedefId: string; yapan: string; gerekce: string },
): Promise<boolean> {
  const gerekce = gerekceDogrula(p.gerekce);
  const acildi = await kilidiAc(db, {
    hedefTuru: p.hedefTuru,
    hedefId: p.hedefId,
    yapan: p.yapan,
    gerekce,
  });
  if (!acildi) throw new HttpHatasi(409, 'kilit-yok', 'Açık kilit bulunamadı.');
  return true;
}

/**
 * Seçili oyun çerezini veya IP özetini engeller. Aynı kimlik için eski engel
 * varsa güncellenir. Dönen etiket kısadır; ham değer istemciye gitmez.
 */
export async function engelle(
  db: Db,
  p: {
    oyId: string;
    kapsam: EngelKapsami;
    yapan: string;
    gerekce: string;
    bitis?: Date | null;
  },
): Promise<{ id: string; etiket: string }> {
  const gerekce = gerekceDogrula(p.gerekce);

  const [satir] = await db.select({
    hedefTuru: oylar.hedefTuru,
    hedefId: oylar.hedefId,
    tarayiciId: oylar.tarayiciId,
    ipOzeti: oylar.ipOzeti,
  }).from(oylar).where(eq(oylar.id, p.oyId));

  if (!satir) throw new HttpHatasi(404, 'oy-yok', 'Oy bulunamadı.');
  if (p.kapsam === 'ag' && !satir.ipOzeti) {
    throw new HttpHatasi(409, 'ip-yok', 'Bu oy için ağ kimliği yok.');
  }

  const simdi = new Date();
  if (p.bitis && p.bitis.getTime() <= simdi.getTime()) {
    throw new HttpHatasi(422, 'bitis-gecersiz', 'Engel bitişi gelecekte olmalı.');
  }

  const tur = p.kapsam === 'cerez' ? 'tarayici' : 'ip';
  const deger = p.kapsam === 'cerez' ? satir.tarayiciId : satir.ipOzeti as string;
  const etiket = kimlikEtiketi(p.kapsam === 'cerez' ? 'cerez' : 'ağ', deger);
  const bitis = p.bitis ?? null;

  const id = await db.transaction(async (tx) => {
    const [kayit] = await tx.insert(engeller).values({
      tur,
      deger,
      sebep: gerekce,
      yapan: p.yapan,
      bitis,
    }).onConflictDoUpdate({
      target: [engeller.tur, engeller.deger],
      set: {
        sebep: gerekce,
        yapan: p.yapan,
        bitis,
        olusturma: sql`now()`,
      },
    }).returning({ id: engeller.id });

    await tx.insert(moderasyonKayitlari).values({
      islem: 'engelle',
      yapan: p.yapan,
      hedefTuru: satir.hedefTuru,
      hedefId: satir.hedefId,
      gerekce,
      ayrinti: { kapsam: p.kapsam, etiket, bitis },
    });

    return kayit.id;
  });

  return { id, etiket };
}

/** Aktif (süresi dolmamış) engelleri yapan hesap e-postasıyla listeler. */
export async function engelleriListele(
  db: Db,
  simdi: Date = new Date(),
): Promise<EngelSatiri[]> {
  const satirlar = await db.select({
    id: engeller.id,
    tur: engeller.tur,
    deger: engeller.deger,
    sebep: engeller.sebep,
    yapanEposta: hesaplar.eposta,
    olusturma: engeller.olusturma,
    bitis: engeller.bitis,
  }).from(engeller)
    .leftJoin(hesaplar, eq(engeller.yapan, hesaplar.id))
    .where(or(isNull(engeller.bitis), gt(engeller.bitis, simdi)))
    .orderBy(desc(engeller.olusturma));

  return satirlar.map((satir) => {
    const tur = satir.tur === 'tarayici' ? 'tarayici' : 'ip';
    return {
      id: satir.id,
      tur,
      etiket: kimlikEtiketi(tur === 'tarayici' ? 'cerez' : 'ağ', satir.deger),
      sebep: satir.sebep,
      yapanEposta: satir.yapanEposta,
      olusturma: satir.olusturma,
      bitis: satir.bitis,
    };
  });
}

/** Engeli siler; kısa etiket, eski sebep ve gerekçe moderasyon kaydında kalır. */
export async function engelKaldir(
  db: Db,
  p: { engelId: string; yapan: string; gerekce: string },
): Promise<void> {
  const gerekce = gerekceDogrula(p.gerekce);

  const [satir] = await db.select({
    tur: engeller.tur,
    deger: engeller.deger,
    sebep: engeller.sebep,
  }).from(engeller).where(eq(engeller.id, p.engelId));

  if (!satir) throw new HttpHatasi(404, 'engel-yok', 'Engel bulunamadı.');

  const tur = satir.tur === 'tarayici' ? 'tarayici' : 'ip';
  const etiket = kimlikEtiketi(tur === 'tarayici' ? 'cerez' : 'ağ', satir.deger);

  await db.transaction(async (tx) => {
    await tx.delete(engeller).where(eq(engeller.id, p.engelId));
    await tx.insert(moderasyonKayitlari).values({
      islem: 'engel-kaldir',
      yapan: p.yapan,
      gerekce,
      ayrinti: { etiket, eskiSebep: satir.sebep, gerekce },
    });
  });
}

/** Son moderasyon işlemleri; yapan hesabın e-postasıyla birlikte. */
export async function moderasyonGecmisi(
  db: Db,
  { limit = 100 }: { limit?: number } = {},
): Promise<ModerasyonSatiri[]> {
  const adet = Number.isFinite(limit) ? Math.min(Math.max(1, Math.trunc(limit)), 500) : 100;

  const satirlar = await db.select({
    id: moderasyonKayitlari.id,
    islem: moderasyonKayitlari.islem,
    yapanEposta: hesaplar.eposta,
    hedefTuru: moderasyonKayitlari.hedefTuru,
    hedefId: moderasyonKayitlari.hedefId,
    gerekce: moderasyonKayitlari.gerekce,
    ayrinti: moderasyonKayitlari.ayrinti,
    zaman: moderasyonKayitlari.zaman,
  }).from(moderasyonKayitlari)
    .leftJoin(hesaplar, eq(moderasyonKayitlari.yapan, hesaplar.id))
    .orderBy(desc(moderasyonKayitlari.zaman))
    .limit(adet);

  return satirlar.map((satir) => ({
    ...satir,
    hedefTuru: satir.hedefTuru ?? null,
    hedefId: satir.hedefId ?? null,
  }));
}
