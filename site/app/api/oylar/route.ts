import { db } from '../../../lib/db.ts';
import { HttpHatasi } from '../../../lib/hata.ts';
import { limitAsildiMi, sayacArtir } from '../../../lib/hiz-limiti.ts';
import {
  OY_LIMITI_DAKIKA,
  OY_LIMITI_GUN,
  ayniOriginMi,
  govdeOku,
  hataCevap,
  ipOzeti,
  jsonCevap,
} from '../../../lib/istek.ts';
import type { Db } from '../../../lib/oy-deposu.ts';
import { oyKaydet } from '../../../lib/oy-servisi.ts';
import { taksonomi } from '../../../lib/ortak.ts';
import type { OyDegeri } from '../../../lib/oy-hesabi.ts';
import type { HedefTuru, OgeTuru } from '../../../lib/tipler.ts';
import {
  yeniZiyaretciKimligi,
  ziyaretciCerezi,
  ziyaretciKimligi,
} from '../../../lib/ziyaretci.ts';

export const dynamic = 'force-dynamic';

const KONU_IDLERI = new Set(taksonomi.KONULAR.map((konu) => konu.id));
const ETIKET_IDLERI = new Set(taksonomi.ETIKETLER.map((etiket) => etiket.id));

interface OyGovdesi {
  hedefTuru: HedefTuru;
  hedefId: string;
  ogeTuru: OgeTuru;
  ogeId: string;
  deger: OyDegeri;
}

function metin(deger: unknown): string | null {
  return typeof deger === 'string' && deger.trim() ? deger.trim() : null;
}

function oyGovdesiCoz(girdi: unknown): OyGovdesi {
  if (!girdi || typeof girdi !== 'object') {
    throw new HttpHatasi(400, 'gecersiz-alan', 'Gövde bir nesne olmalı.');
  }

  const g = girdi as Record<string, unknown>;
  if (g.hedefTuru !== 'kanal' && g.hedefTuru !== 'video') {
    throw new HttpHatasi(400, 'gecersiz-alan', 'hedefTuru kanal veya video olmalı.');
  }

  const hedefId = metin(g.hedefId);
  if (!hedefId) {
    throw new HttpHatasi(400, 'gecersiz-alan', 'hedefId boş olamaz.');
  }

  if (g.ogeTuru !== 'konu' && g.ogeTuru !== 'etiket') {
    throw new HttpHatasi(400, 'gecersiz-alan', 'ogeTuru konu veya etiket olmalı.');
  }

  const ogeId = metin(g.ogeId);
  if (!ogeId) {
    throw new HttpHatasi(400, 'gecersiz-alan', 'ogeId boş olamaz.');
  }

  if (g.deger !== 'up' && g.deger !== 'kararsiz' && g.deger !== 'down') {
    throw new HttpHatasi(400, 'gecersiz-alan', 'deger up, kararsiz veya down olmalı.');
  }

  const gecerliIdler = g.ogeTuru === 'konu' ? KONU_IDLERI : ETIKET_IDLERI;
  if (!gecerliIdler.has(ogeId)) {
    throw new HttpHatasi(400, 'gecersiz-oge', 'Bilinmeyen konu veya etiket.');
  }

  return {
    hedefTuru: g.hedefTuru,
    hedefId,
    ogeTuru: g.ogeTuru,
    ogeId,
    deger: g.deger,
  };
}

/** Çerez ve IP sayaçlarını sırayla artırır; herhangi biri sınırı aşarsa true. */
async function hizAsildiMi(db_: Db, kimlik: string | null, ip: string | null): Promise<boolean> {
  if (kimlik) {
    if (await limitAsildiMi(db_, { anahtar: `cerez:${kimlik}:dk`, adet: OY_LIMITI_DAKIKA, pencereSaniye: 60 })) return true;
    if (await limitAsildiMi(db_, { anahtar: `cerez:${kimlik}:gun`, adet: OY_LIMITI_GUN, pencereSaniye: 86400 })) return true;
  }

  if (ip) {
    if (await limitAsildiMi(db_, { anahtar: `ip:${ip}:dk`, adet: OY_LIMITI_DAKIKA, pencereSaniye: 60 })) return true;
    if (await limitAsildiMi(db_, { anahtar: `ip:${ip}:gun`, adet: OY_LIMITI_GUN, pencereSaniye: 86400 })) return true;
  }

  return false;
}

function guvenliMi(req: Request): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.SITE_ORIGIN?.startsWith('https://')) return true;
  return new URL(req.url).protocol === 'https:';
}

/** Oy ver/değiştir. Sıra: origin → gövde → hız limiti → çerez → servis. */
export async function PUT(req: Request) {
  try {
    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const girdi = oyGovdesiCoz(await govdeOku<unknown>(req));
    const veritabani = await db();
    const mevcutKimlik = ziyaretciKimligi(req);
    const ip = ipOzeti(req);

    if (await hizAsildiMi(veritabani, mevcutKimlik, ip)) {
      throw new HttpHatasi(429, 'hiz-limiti', 'Çok fazla istek gönderdiniz. Lütfen biraz sonra tekrar deneyin.');
    }

    let kimlik = mevcutKimlik;
    let cerez: string | null = null;
    if (!kimlik) {
      kimlik = yeniZiyaretciKimligi();
      cerez = ziyaretciCerezi(kimlik, guvenliMi(req));
      // Yeni çerezin ilk isteği de sayaçlara yazılır.
      await sayacArtir(veritabani, { anahtar: `cerez:${kimlik}:dk`, pencereSaniye: 60 });
      await sayacArtir(veritabani, { anahtar: `cerez:${kimlik}:gun`, pencereSaniye: 86400 });
    }

    const sonuc = await oyKaydet(veritabani, {
      ...girdi,
      tarayiciId: kimlik,
      ipOzeti: ip,
    });

    return jsonCevap(sonuc, 200, cerez ? { 'Set-Cookie': cerez } : undefined);
  } catch (hata) {
    return hataCevap(hata);
  }
}
