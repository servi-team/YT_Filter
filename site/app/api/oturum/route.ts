import { createHash } from 'node:crypto';
import { db } from '../../../lib/db.ts';
import { HttpHatasi } from '../../../lib/hata.ts';
import { limitAsildiMi } from '../../../lib/hiz-limiti.ts';
import {
  GIRIS_LIMITI_15DK,
  ayniOriginMi,
  govdeOku,
  hataCevap,
  ipOzeti,
  jsonCevap,
} from '../../../lib/istek.ts';
import {
  OTURUM_CEREZI,
  epostaNormalize,
  girisYap,
  oturumCerezi,
  oturumKapat,
} from '../../../lib/oturum.ts';

export const dynamic = 'force-dynamic';

interface GirisGovdesi {
  eposta?: unknown;
  parola?: unknown;
}

function epostaOzeti(eposta: string): string {
  return createHash('sha256').update(eposta).digest('hex');
}

function cerezTokeni(req: Request): string | null {
  const cerezler = req.headers.get('cookie');
  if (!cerezler) return null;

  for (const parca of cerezler.split(';')) {
    const ayrac = parca.indexOf('=');
    if (ayrac < 0) continue;
    if (parca.slice(0, ayrac).trim() !== OTURUM_CEREZI) continue;
    const deger = parca.slice(ayrac + 1).trim();
    if (!deger) return null;
    try {
      return decodeURIComponent(deger);
    } catch {
      return deger;
    }
  }
  return null;
}

/** Giriş: origin → gövde → IP+e-posta hız limiti → oturum. */
export async function POST(req: Request) {
  try {
    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const govde = await govdeOku<GirisGovdesi>(req);
    if (typeof govde?.eposta !== 'string' || typeof govde?.parola !== 'string') {
      throw new HttpHatasi(400, 'gecersiz-govde', 'E-posta ve parola gerekli.');
    }

    const eposta = epostaNormalize(govde.eposta);
    const veritabani = await db();
    const ip = ipOzeti(req);

    const asildi = await limitAsildiMi(veritabani, {
      anahtar: `giris:${ip ?? 'ip-yok'}:${epostaOzeti(eposta)}`,
      adet: GIRIS_LIMITI_15DK,
      pencereSaniye: 15 * 60,
    });
    if (asildi) {
      throw new HttpHatasi(429, 'hiz-limiti', 'Çok fazla giriş denemesi. Lütfen biraz sonra tekrar deneyin.');
    }

    const giris = await girisYap(veritabani, {
      eposta,
      parola: govde.parola,
      ipOzeti: ip,
    });

    return jsonCevap(
      { kullanici: giris.kullanici },
      200,
      { 'Set-Cookie': oturumCerezi(giris.token, giris.sonKullanma) },
    );
  } catch (hata) {
    return hataCevap(hata);
  }
}

/** Çıkış: oturum satırını siler ve çerezi temizler. */
export async function DELETE(req: Request) {
  try {
    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const token = cerezTokeni(req);
    if (token) {
      await oturumKapat(await db(), token);
    }

    const silme = `${OTURUM_CEREZI}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
    return new Response(null, {
      status: 204,
      headers: { 'Set-Cookie': silme },
    });
  } catch (hata) {
    return hataCevap(hata);
  }
}
