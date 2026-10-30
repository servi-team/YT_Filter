import { db } from '../../../../../lib/db.ts';
import { HttpHatasi } from '../../../../../lib/hata.ts';
import { ayniOriginMi, govdeOku, hataCevap, jsonCevap } from '../../../../../lib/istek.ts';
import { talepIsle } from '../../../../../lib/talep-deposu.ts';
import { panelKoruma } from '../../../../../lib/yetki.ts';
import { kotaylaMetaCozucu } from '../../../../../lib/youtube-kota.ts';

export const dynamic = 'force-dynamic';

interface TalepKarari {
  karar?: unknown;
  gerekce?: unknown;
}

/** Editör: bekleyen talebi kabul veya gerekçeli red olarak işler. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const veritabani = await db();
    const kullanici = await panelKoruma(veritabani, req, ['editor', 'admin']);

    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const { id } = await params;
    if (!id) throw new HttpHatasi(404, 'talep-yok', 'Talep bulunamadı.');

    const govde = await govdeOku<TalepKarari>(req);
    const karar = govde?.karar;
    if (karar !== 'kabul' && karar !== 'red') {
      throw new HttpHatasi(400, 'gecersiz-karar', 'Karar kabul veya red olmalı.');
    }

    const gerekce = typeof govde?.gerekce === 'string' ? govde.gerekce : null;
    const sonuc = await talepIsle(veritabani, {
      talepId: id,
      karar,
      gerekce,
      yapan: kullanici.id,
      metaCozucu: kotaylaMetaCozucu(veritabani),
    });

    return jsonCevap(sonuc);
  } catch (hata) {
    return hataCevap(hata);
  }
}
