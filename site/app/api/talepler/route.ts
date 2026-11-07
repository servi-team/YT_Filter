import { db } from '../../../lib/db.ts';
import { HttpHatasi } from '../../../lib/hata.ts';
import { limitAsildiMi } from '../../../lib/hiz-limiti.ts';
import {
  TALEP_LIMITI_SAAT,
  ayniOriginMi,
  govdeOku,
  hataCevap,
  ipOzeti,
  jsonCevap,
} from '../../../lib/istek.ts';
import type { Db } from '../../../lib/oy-deposu.ts';
import { talepOlustur } from '../../../lib/talep-deposu.ts';
import {
  yeniZiyaretciKimligi,
  ziyaretciCerezi,
  ziyaretciKimligi,
} from '../../../lib/ziyaretci.ts';
import { kotaylaMetaCozucu } from '../../../lib/youtube-kota.ts';
import { linkCoz } from '../../../lib/youtube-link.ts';

export const dynamic = 'force-dynamic';

interface TalepGovdesi {
  url?: unknown;
}

function guvenliMi(req: Request): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.SITE_ORIGIN?.startsWith('https://')) return true;
  return new URL(req.url).protocol === 'https:';
}

/** IP başına saatlik talep sınırı; IP özeti yoksa (geliştirme) sayaç açılmaz. */
async function talepLimitiAsildiMi(db_: Db, ip: string | null): Promise<boolean> {
  if (!ip) return false;
  return limitAsildiMi(db_, {
    anahtar: `ip:${ip}:talep`,
    adet: TALEP_LIMITI_SAAT,
    pencereSaniye: 3600,
  });
}

/**
 * Kayıtsız link için ekleme talebi. Sıra: origin → gövde/link → IP hız
 * limiti → çerez → servis. Aynı link tekrar gönderilirse satır açılmaz,
 * `talepSayisi` artar.
 */
export async function POST(req: Request) {
  try {
    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const govde = await govdeOku<TalepGovdesi>(req);
    const url = typeof govde?.url === 'string' ? govde.url.trim() : '';
    if (!url) {
      throw new HttpHatasi(400, 'gecersiz-url', 'Link gerekli.');
    }

    const cozulen = linkCoz(url);
    if (cozulen.tur === 'hata') {
      throw new HttpHatasi(400, 'gecersiz-url', cozulen.neden);
    }

    const veritabani = await db();
    const ip = ipOzeti(req);
    if (await talepLimitiAsildiMi(veritabani, ip)) {
      throw new HttpHatasi(429, 'hiz-limiti', 'Çok fazla talep gönderdiniz. Lütfen biraz sonra tekrar deneyin.');
    }

    let kimlik = ziyaretciKimligi(req);
    let cerez: string | null = null;
    if (!kimlik) {
      kimlik = yeniZiyaretciKimligi();
      cerez = ziyaretciCerezi(kimlik, guvenliMi(req));
    }

    const sonuc = await talepOlustur(veritabani, {
      link: url,
      cozulen,
      metaCozucu: kotaylaMetaCozucu(veritabani),
      tarayiciId: kimlik,
      ipOzeti: ip,
    });

    return jsonCevap(sonuc, 202, cerez ? { 'Set-Cookie': cerez } : undefined);
  } catch (hata) {
    return hataCevap(hata);
  }
}
