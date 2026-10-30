import { db } from '../../../../../lib/db.ts';
import { HttpHatasi } from '../../../../../lib/hata.ts';
import { ayniOriginMi, govdeOku, hataCevap } from '../../../../../lib/istek.ts';
import { engelKaldir } from '../../../../../lib/moderasyon-deposu.ts';
import { panelKoruma } from '../../../../../lib/yetki.ts';

export const dynamic = 'force-dynamic';

interface EngelKaldirGovdesi {
  gerekce?: unknown;
}

/** Editör: engeli kaldırır; satır silinir, gerekçe moderasyon kaydında kalır. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const veritabani = await db();
    const kullanici = await panelKoruma(veritabani, req, ['editor', 'admin']);

    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const { id } = await params;
    if (!id) throw new HttpHatasi(404, 'engel-yok', 'Engel bulunamadı.');

    const govde = await govdeOku<EngelKaldirGovdesi>(req);
    await engelKaldir(veritabani, {
      engelId: id,
      yapan: kullanici.id,
      gerekce: typeof govde?.gerekce === 'string' ? govde.gerekce : '',
    });

    return new Response(null, { status: 204 });
  } catch (hata) {
    return hataCevap(hata);
  }
}
