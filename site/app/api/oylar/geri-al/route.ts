import { db } from '../../../../lib/db.ts';
import { HttpHatasi } from '../../../../lib/hata.ts';
import { limitAsildiMi } from '../../../../lib/hiz-limiti.ts';
import {
  OY_LIMITI_DAKIKA,
  OY_LIMITI_GUN,
  ayniOriginMi,
  govdeOku,
  hataCevap,
  ipOzeti,
  jsonCevap,
} from '../../../../lib/istek.ts';
import type { Db } from '../../../../lib/oy-deposu.ts';
import { oyGeriAlZiyaretci } from '../../../../lib/oy-servisi.ts';
import { taksonomi } from '../../../../lib/ortak.ts';
import type { HedefTuru, OgeTuru } from '../../../../lib/tipler.ts';
import { ziyaretciKimligi } from '../../../../lib/ziyaretci.ts';

export const dynamic = 'force-dynamic';

const KONU_IDLERI = new Set(taksonomi.KONULAR.map((konu) => konu.id));
const ETIKET_IDLERI = new Set(taksonomi.ETIKETLER.map((etiket) => etiket.id));

interface OyGovdesi {
  hedefTuru: HedefTuru;
  hedefId: string;
  ogeTuru: OgeTuru;
  ogeId: string;
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

  const gecerliIdler = g.ogeTuru === 'konu' ? KONU_IDLERI : ETIKET_IDLERI;
  if (!gecerliIdler.has(ogeId)) {
    throw new HttpHatasi(400, 'gecersiz-oge', 'Bilinmeyen konu veya etiket.');
  }

  return {
    hedefTuru: g.hedefTuru,
    hedefId,
    ogeTuru: g.ogeTuru,
    ogeId,
  };
}

async function hizAsildiMi(db_: Db, kimlik: string, ip: string | null): Promise<boolean> {
  if (await limitAsildiMi(db_, { anahtar: `cerez:${kimlik}:dk`, adet: OY_LIMITI_DAKIKA, pencereSaniye: 60 })) return true;
  if (await limitAsildiMi(db_, { anahtar: `cerez:${kimlik}:gun`, adet: OY_LIMITI_GUN, pencereSaniye: 86400 })) return true;

  if (ip) {
    if (await limitAsildiMi(db_, { anahtar: `ip:${ip}:dk`, adet: OY_LIMITI_DAKIKA, pencereSaniye: 60 })) return true;
    if (await limitAsildiMi(db_, { anahtar: `ip:${ip}:gun`, adet: OY_LIMITI_GUN, pencereSaniye: 86400 })) return true;
  }

  return false;
}

/** Ziyaretçi kendi oyunu geri alır. Sıra: origin → gövde → çerez → hız limiti → servis. */
export async function POST(req: Request) {
  try {
    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const girdi = oyGovdesiCoz(await govdeOku<unknown>(req));
    const kimlik = ziyaretciKimligi(req);
    if (!kimlik) {
      throw new HttpHatasi(400, 'ziyaretci-yok', 'Geri alınacak ziyaretçi çerezi yok.');
    }

    const veritabani = await db();
    const ip = ipOzeti(req);
    if (await hizAsildiMi(veritabani, kimlik, ip)) {
      throw new HttpHatasi(429, 'hiz-limiti', 'Çok fazla istek gönderdiniz. Lütfen biraz sonra tekrar deneyin.');
    }

    const sonuc = await oyGeriAlZiyaretci(veritabani, {
      hedefTuru: girdi.hedefTuru,
      hedefId: girdi.hedefId,
      ogeTuru: girdi.ogeTuru,
      ogeId: girdi.ogeId,
      tarayiciId: kimlik,
    });

    return jsonCevap(sonuc);
  } catch (hata) {
    return hataCevap(hata);
  }
}
