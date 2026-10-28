/**
 * Oy servisi: depo işlemlerini iş kurallarıyla birleştirir. API rotaları
 * buradaki fonksiyonları çağırır; HTTP ayrıntısı (origin, hız limiti,
 * çerez) rota katmanında kalır.
 */
import { and, eq, sql } from 'drizzle-orm';
import { kanallar, oylar, videolar } from '../db/schema.ts';
import { aktifEngelVarMi } from './engel-deposu.ts';
import { HttpHatasi } from './hata.ts';
import { sonucHesapla } from './oy-hesabi.ts';
import {
  aktifKilit,
  benimOylarim,
  oyVer,
  sayimlariGetir,
  type Db,
  type OyGirdisi,
} from './oy-deposu.ts';
import { taksonomi, type KayitSonucu } from './ortak.ts';
import type { HedefTuru, OgeTuru, Sayimlar } from './tipler.ts';

export interface OySonucu {
  sayimlar: Sayimlar;
  sonuc: KayitSonucu;
  kilitliSonuc: KayitSonucu | null;
}

const KONU_SIRASI = taksonomi.KONULAR.map((konu) => konu.id);
const ETIKET_SIRASI = taksonomi.ETIKETLER.map((etiket) => etiket.id);

async function hedefVarMi(db: Db, hedefTuru: HedefTuru, hedefId: string): Promise<boolean> {
  if (hedefTuru === 'kanal') {
    const [satir] = await db.select({ id: kanallar.id }).from(kanallar)
      .where(and(eq(kanallar.id, hedefId), eq(kanallar.arsivlendi, false)));
    return Boolean(satir);
  }

  const [satir] = await db.select({ id: videolar.id }).from(videolar)
    .where(and(eq(videolar.id, hedefId), eq(videolar.arsivlendi, false)));
  return Boolean(satir);
}

async function sonucGetir(db: Db, hedefTuru: HedefTuru, hedefId: string): Promise<OySonucu> {
  const sayimlar = await sayimlariGetir(db, hedefTuru, hedefId);
  const kilit = await aktifKilit(db, hedefTuru, hedefId);
  const kilitliSonuc = kilit ? (kilit.sonuc as KayitSonucu) : null;
  const sonuc = kilitliSonuc ?? sonucHesapla(sayimlar.konular, sayimlar.etiketler, KONU_SIRASI, ETIKET_SIRASI);
  return { sayimlar, sonuc, kilitliSonuc };
}

/** Oy verir/değiştirir; hedef, engel ve moderasyon kurallarını uygular. */
export async function oyKaydet(db: Db, girdi: OyGirdisi): Promise<OySonucu> {
  if (!(await hedefVarMi(db, girdi.hedefTuru, girdi.hedefId))) {
    throw new HttpHatasi(404, 'icerik-yok', 'İçerik bulunamadı.');
  }

  if (await aktifEngelVarMi(db, {
    tarayiciId: girdi.tarayiciId,
    ipOzeti: girdi.ipOzeti ?? null,
  })) {
    throw new HttpHatasi(403, 'engelli', 'Bu tarayıcıdan oy verilemiyor.');
  }

  const mevcut = await benimOylarim(db, girdi.hedefTuru, girdi.hedefId, girdi.tarayiciId);
  const ayniOy = mevcut.find((oy) => oy.ogeTuru === girdi.ogeTuru && oy.ogeId === girdi.ogeId);
  if (ayniOy?.moderasyonGeriAlindi) {
    throw new HttpHatasi(409, 'moderasyon-geri-alindi', 'Bu oy moderasyon tarafından geri alındı.');
  }

  await oyVer(db, girdi);
  return sonucGetir(db, girdi.hedefTuru, girdi.hedefId);
}

/** Ziyaretçi yalnızca kendi oyunu geri alabilir; moderasyon geri alması kalıcıdır. */
export async function oyGeriAlZiyaretci(
  db: Db,
  p: {
    hedefTuru: HedefTuru;
    hedefId: string;
    ogeTuru: OgeTuru;
    ogeId: string;
    tarayiciId: string;
  },
): Promise<OySonucu> {
  const mevcut = await benimOylarim(db, p.hedefTuru, p.hedefId, p.tarayiciId);
  const satir = mevcut.find((oy) => oy.ogeTuru === p.ogeTuru && oy.ogeId === p.ogeId);

  if (!satir) throw new HttpHatasi(404, 'oy-yok', 'Geri alınacak oy bulunamadı.');
  if (satir.moderasyonGeriAlindi) {
    throw new HttpHatasi(409, 'moderasyon-geri-alindi', 'Bu oy moderasyon tarafından geri alındı.');
  }

  await db.update(oylar)
    .set({ ziyaretciGeriAlindi: true, guncelleme: sql`now()` })
    .where(and(
      eq(oylar.hedefTuru, p.hedefTuru),
      eq(oylar.hedefId, p.hedefId),
      eq(oylar.ogeTuru, p.ogeTuru),
      eq(oylar.ogeId, p.ogeId),
      eq(oylar.tarayiciId, p.tarayiciId),
    ));

  return sonucGetir(db, p.hedefTuru, p.hedefId);
}
