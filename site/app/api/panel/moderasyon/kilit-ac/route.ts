import { db } from '../../../../../lib/db.ts';
import { HttpHatasi } from '../../../../../lib/hata.ts';
import { ayniOriginMi, govdeOku, hataCevap, jsonCevap } from '../../../../../lib/istek.ts';
import { kayitKilidiniAc } from '../../../../../lib/moderasyon-deposu.ts';
import type { HedefTuru } from '../../../../../lib/tipler.ts';
import { panelKoruma } from '../../../../../lib/yetki.ts';

export const dynamic = 'force-dynamic';

interface KilitGovdesi {
  hedefTuru?: unknown;
  hedefId?: unknown;
  gerekce?: unknown;
}

function hedefTuruMu(deger: unknown): deger is HedefTuru {
  return deger === 'kanal' || deger === 'video';
}

function metin(deger: unknown): string | null {
  return typeof deger === 'string' && deger.trim() ? deger.trim() : null;
}

/** Editör: açık kilidi kaldırır; sonuç güncel oylarla yeniden hesaplanır. */
export async function POST(req: Request) {
  try {
    const veritabani = await db();
    const kullanici = await panelKoruma(veritabani, req, ['editor', 'admin']);

    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const govde = await govdeOku<KilitGovdesi>(req);
    if (!hedefTuruMu(govde?.hedefTuru)) {
      throw new HttpHatasi(400, 'gecersiz-hedef', 'hedefTuru kanal veya video olmalı.');
    }
    const hedefId = metin(govde?.hedefId);
    if (!hedefId) throw new HttpHatasi(400, 'gecersiz-hedef', 'hedefId gerekli.');

    await kayitKilidiniAc(veritabani, {
      hedefTuru: govde.hedefTuru,
      hedefId,
      yapan: kullanici.id,
      gerekce: typeof govde?.gerekce === 'string' ? govde.gerekce : '',
    });

    return jsonCevap({ durum: 'acildi' });
  } catch (hata) {
    return hataCevap(hata);
  }
}
