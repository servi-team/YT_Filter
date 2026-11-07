import { db } from '../../../../lib/db.ts';
import { HttpHatasi } from '../../../../lib/hata.ts';
import { ayniOriginMi, govdeOku, hataCevap, jsonCevap } from '../../../../lib/istek.ts';
import { parolaDegistir } from '../../../../lib/oturum.ts';
import { kullaniciGerekli } from '../../../../lib/yetki.ts';

export const dynamic = 'force-dynamic';

interface ParolaGovdesi {
  mevcutParola?: unknown;
  yeniParola?: unknown;
}

/** Oturumdaki hesabın parolasını değiştirir; diğer oturumlar iptal edilir. */
export async function POST(req: Request) {
  try {
    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const veritabani = await db();
    const kullanici = await kullaniciGerekli(veritabani, req);
    const govde = await govdeOku<ParolaGovdesi>(req);

    if (typeof govde?.mevcutParola !== 'string' || typeof govde?.yeniParola !== 'string') {
      throw new HttpHatasi(400, 'gecersiz-govde', 'Mevcut ve yeni parola gerekli.');
    }

    const token = (() => {
      const cerezler = req.headers.get('cookie');
      if (!cerezler) return '';
      for (const parca of cerezler.split(';')) {
        const ayrac = parca.indexOf('=');
        if (ayrac < 0) continue;
        if (parca.slice(0, ayrac).trim() !== 'ytf_oturum') continue;
        const deger = parca.slice(ayrac + 1).trim();
        try {
          return decodeURIComponent(deger);
        } catch {
          return deger;
        }
      }
      return '';
    })();

    await parolaDegistir(veritabani, {
      hesapId: kullanici.id,
      mevcutParola: govde.mevcutParola,
      yeniParola: govde.yeniParola,
      token,
    });

    return jsonCevap({ ok: true });
  } catch (hata) {
    return hataCevap(hata);
  }
}
