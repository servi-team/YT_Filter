import { db } from '../../../../lib/db.ts';
import { HttpHatasi } from '../../../../lib/hata.ts';
import { icerikEkle, metaKimlikleTamamla } from '../../../../lib/icerik-yaz.ts';
import { ayniOriginMi, govdeOku, hataCevap, jsonCevap } from '../../../../lib/istek.ts';
import { panelKoruma } from '../../../../lib/yetki.ts';
import { kotaylaMetaCozucu } from '../../../../lib/youtube-kota.ts';
import { linkCoz } from '../../../../lib/youtube-link.ts';

export const dynamic = 'force-dynamic';

interface IcerikGovdesi {
  url?: unknown;
}

/** Editör: yapıştırılan linkten kanal/video kaydı ekler veya arşivden getirir. */
export async function POST(req: Request) {
  try {
    const veritabani = await db();
    const kullanici = await panelKoruma(veritabani, req, ['editor', 'admin']);

    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const govde = await govdeOku<IcerikGovdesi>(req);
    const url = typeof govde?.url === 'string' ? govde.url.trim() : '';
    if (!url) throw new HttpHatasi(400, 'gecersiz-url', 'Link gerekli.');

    const cozulen = linkCoz(url);
    if (cozulen.tur === 'hata') {
      throw new HttpHatasi(400, 'gecersiz-url', cozulen.neden);
    }

    const meta = await kotaylaMetaCozucu(veritabani)(cozulen);
    const tamMeta = metaKimlikleTamamla(cozulen, meta);
    const sonuc = await icerikEkle(veritabani, {
      cozulen,
      meta: tamMeta,
      ekleyen: kullanici.id,
    });

    return jsonCevap(sonuc, sonuc.durum === 'eklendi' ? 201 : 200);
  } catch (hata) {
    return hataCevap(hata);
  }
}
