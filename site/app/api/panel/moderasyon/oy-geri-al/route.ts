import { db } from '../../../../../lib/db.ts';
import { HttpHatasi } from '../../../../../lib/hata.ts';
import { ayniOriginMi, govdeOku, hataCevap, jsonCevap } from '../../../../../lib/istek.ts';
import {
  oyGeriAlModerasyon,
  type GeriAlmaKapsami,
} from '../../../../../lib/moderasyon-deposu.ts';
import { panelKoruma } from '../../../../../lib/yetki.ts';

export const dynamic = 'force-dynamic';

interface GeriAlGovdesi {
  oyId?: unknown;
  kapsam?: unknown;
  gerekce?: unknown;
}

function metin(deger: unknown): string | null {
  return typeof deger === 'string' && deger.trim() ? deger.trim() : null;
}

function kapsamMi(deger: unknown): deger is GeriAlmaKapsami {
  return deger === 'tek' || deger === 'cerez-kayit' || deger === 'cerez-site';
}

/** Editör: seçili oyu, çerezin bu kayıttaki veya tüm sitedeki oylarını geri alır. */
export async function POST(req: Request) {
  try {
    const veritabani = await db();
    const kullanici = await panelKoruma(veritabani, req, ['editor', 'admin']);

    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const govde = await govdeOku<GeriAlGovdesi>(req);
    const oyId = metin(govde?.oyId);
    if (!oyId) throw new HttpHatasi(400, 'gecersiz-oy', 'oyId gerekli.');
    if (!kapsamMi(govde?.kapsam)) {
      throw new HttpHatasi(400, 'gecersiz-kapsam', 'Geçersiz geri alma kapsamı.');
    }

    const sonuc = await oyGeriAlModerasyon(veritabani, {
      oyId,
      kapsam: govde.kapsam,
      yapan: kullanici.id,
      gerekce: typeof govde?.gerekce === 'string' ? govde.gerekce : '',
    });

    return jsonCevap(sonuc);
  } catch (hata) {
    return hataCevap(hata);
  }
}
