import { adminIcerikListele } from '../../../../lib/arsiv-deposu.ts';
import { db } from '../../../../lib/db.ts';
import { hataCevap, jsonCevap } from '../../../../lib/istek.ts';
import { rolGerekli } from '../../../../lib/yetki.ts';

export const dynamic = 'force-dynamic';

/** Admin: aktif veya arşivdeki içerikleri arar/listeler. */
export async function GET(req: Request) {
  try {
    const veritabani = await db();
    await rolGerekli(veritabani, req, ['admin']);

    const parametreler = new URL(req.url).searchParams;
    const durum = parametreler.get('durum') === 'arsiv' ? 'arsiv' : 'aktif';
    const arama = parametreler.get('arama')?.trim() || undefined;

    return jsonCevap({
      kayitlar: await adminIcerikListele(veritabani, { durum, arama }),
    });
  } catch (hata) {
    return hataCevap(hata);
  }
}
