import { db } from '../../../../lib/db.ts';
import { HttpHatasi } from '../../../../lib/hata.ts';
import { ayniOriginMi, govdeOku, hataCevap, jsonCevap } from '../../../../lib/istek.ts';
import { yayinGecmisi, yayinla } from '../../../../lib/yayin-deposu.ts';
import { panelKoruma, rolGerekli } from '../../../../lib/yetki.ts';

export const dynamic = 'force-dynamic';

interface YayinGovdesi {
  notlar?: unknown;
}

/** Admin: yayın geçmişini listeler. */
export async function GET(req: Request) {
  try {
    const veritabani = await db();
    await rolGerekli(veritabani, req, ['admin']);
    return jsonCevap({ yayinlar: await yayinGecmisi(veritabani) });
  } catch (hata) {
    return hataCevap(hata);
  }
}

/** Admin: yeni bir db.json sürümü yayınlar. */
export async function POST(req: Request) {
  try {
    const veritabani = await db();
    const kullanici = await panelKoruma(veritabani, req, ['admin']);

    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const govde = await govdeOku<YayinGovdesi>(req);
    if (govde?.notlar !== undefined && govde?.notlar !== null && typeof govde.notlar !== 'string') {
      throw new HttpHatasi(400, 'notlar-gecersiz', 'Notlar metin olmalı.');
    }

    const notlar = typeof govde?.notlar === 'string' ? govde.notlar : undefined;
    const sonuc = await yayinla(veritabani, { notlar, onaylayan: kullanici.id });

    return jsonCevap(sonuc, 201);
  } catch (hata) {
    return hataCevap(hata);
  }
}
