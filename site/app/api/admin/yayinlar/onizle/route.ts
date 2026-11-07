import { db } from '../../../../../lib/db.ts';
import { HttpHatasi } from '../../../../../lib/hata.ts';
import { ayniOriginMi, hataCevap, jsonCevap } from '../../../../../lib/istek.ts';
import { yayinAdayiUret } from '../../../../../lib/yayin-deposu.ts';
import { panelKoruma } from '../../../../../lib/yetki.ts';

export const dynamic = 'force-dynamic';

/** Admin: yayın adayını yeniden üretip önizler. */
export async function POST(req: Request) {
  try {
    const veritabani = await db();
    await panelKoruma(veritabani, req, ['admin']);

    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    return jsonCevap(await yayinAdayiUret(veritabani));
  } catch (hata) {
    return hataCevap(hata);
  }
}
