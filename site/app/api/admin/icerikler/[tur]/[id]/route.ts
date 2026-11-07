import { metadataGuncelle } from '../../../../../../lib/arsiv-deposu.ts';
import { db } from '../../../../../../lib/db.ts';
import { HttpHatasi } from '../../../../../../lib/hata.ts';
import { ayniOriginMi, govdeOku, hataCevap, jsonCevap } from '../../../../../../lib/istek.ts';
import type { HedefTuru } from '../../../../../../lib/tipler.ts';
import { panelKoruma } from '../../../../../../lib/yetki.ts';

export const dynamic = 'force-dynamic';

interface MetadataGovdesi {
  ad?: unknown;
  handle?: unknown;
  avatar?: unknown;
  baslik?: unknown;
  kanalAdi?: unknown;
  kanalHandle?: unknown;
  kanalAvatar?: unknown;
}

function turMu(deger: string): deger is HedefTuru {
  return deger === 'kanal' || deger === 'video';
}

function metin(deger: unknown): string | null | undefined {
  if (deger === undefined) return undefined;
  if (deger === null) return null;
  if (typeof deger === 'string') return deger;
  throw new HttpHatasi(422, 'metadata-gecersiz', 'Metadata alanları metin olmalı.');
}

/** Admin: kanal/video metadata alanlarını düzeltir. */
export async function PATCH(
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

    const govde = await govdeOku<MetadataGovdesi>(req);
    await metadataGuncelle(veritabani, {
      tur,
      id,
      ad: metin(govde?.ad),
      handle: metin(govde?.handle),
      avatar: metin(govde?.avatar),
      baslik: metin(govde?.baslik),
      kanalAdi: metin(govde?.kanalAdi),
      kanalHandle: metin(govde?.kanalHandle),
      kanalAvatar: metin(govde?.kanalAvatar),
      yapan: kullanici.id,
    });

    return jsonCevap({ ok: true });
  } catch (hata) {
    return hataCevap(hata);
  }
}
