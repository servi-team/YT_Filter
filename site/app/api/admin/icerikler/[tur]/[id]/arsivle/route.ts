import { icerikArsivle } from '../../../../../../../lib/arsiv-deposu.ts';
import { db } from '../../../../../../../lib/db.ts';
import { HttpHatasi } from '../../../../../../../lib/hata.ts';
import { ayniOriginMi, govdeOku, hataCevap, jsonCevap } from '../../../../../../../lib/istek.ts';
import type { HedefTuru } from '../../../../../../../lib/tipler.ts';
import { panelKoruma } from '../../../../../../../lib/yetki.ts';

export const dynamic = 'force-dynamic';

interface ArsivGovdesi {
  gerekce?: unknown;
}

function turMu(deger: string): deger is HedefTuru {
  return deger === 'kanal' || deger === 'video';
}

/** Admin: kaydı gerekçeyle arşivler. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tur: string; id: string }> },
) {
  try {
    const veritabani = await db();
    const kullanici = await panelKoruma(veritabani, req, ['admin']);

    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const { tur, id } = await params;
    if (!turMu(tur)) {
      throw new HttpHatasi(400, 'tur-gecersiz', 'Tür kanal veya video olmalı.');
    }

    const govde = await govdeOku<ArsivGovdesi>(req);
    await icerikArsivle(veritabani, {
      tur,
      id,
      yapan: kullanici.id,
      gerekce: typeof govde?.gerekce === 'string' ? govde.gerekce : '',
    });

    return jsonCevap({ ok: true });
  } catch (hata) {
    return hataCevap(hata);
  }
}
