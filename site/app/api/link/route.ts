import { db } from '../../../lib/db.ts';
import { HttpHatasi } from '../../../lib/hata.ts';
import { linkIleKayitBul } from '../../../lib/icerik-deposu.ts';
import { hataCevap, jsonCevap } from '../../../lib/istek.ts';
import { linkCoz } from '../../../lib/youtube-link.ts';

export const dynamic = 'force-dynamic';

/**
 * Yapıştırılan linkin kayıt durumunu döndürür. `kayitli` aktif içeriği,
 * `arsiv` arşivli kaydı, `kayitsiz` ise hiç kaydı olmayan geçerli linki
 * gösterir. Handle dahil tüm geçerli linkler bu yoldan geçer.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url).searchParams.get('url')?.trim() ?? '';
    if (!url) {
      throw new HttpHatasi(400, 'gecersiz-url', 'Link gerekli.');
    }

    const cozulen = linkCoz(url);
    if (cozulen.tur === 'hata') {
      throw new HttpHatasi(400, 'gecersiz-url', cozulen.neden);
    }

    const veritabani = await db();
    const bulunan = await linkIleKayitBul(veritabani, cozulen);

    if (!bulunan) {
      return jsonCevap({ durum: 'kayitsiz', tur: cozulen.tur });
    }

    return jsonCevap({
      durum: bulunan.arsivli ? 'arsiv' : 'kayitli',
      tur: bulunan.kayit.tur,
      id: bulunan.kayit.id,
    });
  } catch (hata) {
    return hataCevap(hata);
  }
}
