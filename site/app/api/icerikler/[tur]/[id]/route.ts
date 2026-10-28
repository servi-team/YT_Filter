import { db } from '../../../../../lib/db.ts';
import { HttpHatasi } from '../../../../../lib/hata.ts';
import { icerikGetir } from '../../../../../lib/icerik-deposu.ts';
import { hataCevap, jsonCevap } from '../../../../../lib/istek.ts';
import { benimOylarim } from '../../../../../lib/oy-deposu.ts';
import { ziyaretciKimligi } from '../../../../../lib/ziyaretci.ts';
import type { HedefTuru } from '../../../../../lib/tipler.ts';

export const dynamic = 'force-dynamic';

/** Tek içerik detayı: sayımlar, sonuç, kilit ve (çerez varsa) kendi oylar. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ tur: string; id: string }> },
) {
  try {
    const { tur, id } = await params;
    if (tur !== 'kanal' && tur !== 'video') {
      throw new HttpHatasi(404, 'icerik-yok', 'İçerik bulunamadı.');
    }

    const hedefTuru: HedefTuru = tur;
    const veritabani = await db();
    const detay = await icerikGetir(veritabani, hedefTuru, id);
    if (!detay) {
      throw new HttpHatasi(404, 'icerik-yok', 'İçerik bulunamadı.');
    }

    const kimlik = ziyaretciKimligi(req);
    const oylar = kimlik
      ? await benimOylarim(veritabani, hedefTuru, id, kimlik)
      : [];

    return jsonCevap({ ...detay, benimOylarim: oylar });
  } catch (hata) {
    return hataCevap(hata);
  }
}
