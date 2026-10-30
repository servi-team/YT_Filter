import { db } from '../../../../../lib/db.ts';
import { HttpHatasi } from '../../../../../lib/hata.ts';
import { ayniOriginMi, govdeOku, hataCevap, jsonCevap } from '../../../../../lib/istek.ts';
import {
  engelle,
  type EngelKapsami,
} from '../../../../../lib/moderasyon-deposu.ts';
import { panelKoruma } from '../../../../../lib/yetki.ts';

export const dynamic = 'force-dynamic';

interface EngelGovdesi {
  oyId?: unknown;
  kapsam?: unknown;
  gerekce?: unknown;
  bitis?: unknown;
}

function metin(deger: unknown): string | null {
  return typeof deger === 'string' && deger.trim() ? deger.trim() : null;
}

function kapsamMi(deger: unknown): deger is EngelKapsami {
  return deger === 'cerez' || deger === 'ag';
}

function bitisCoz(deger: unknown): Date | undefined {
  if (deger === undefined || deger === null || deger === '') return undefined;
  if (typeof deger !== 'string') {
    throw new HttpHatasi(400, 'gecersiz-bitis', 'Bitiş tarihi ISO metni olmalı.');
  }
  const tarih = new Date(deger);
  if (Number.isNaN(tarih.getTime())) {
    throw new HttpHatasi(400, 'gecersiz-bitis', 'Bitiş tarihi geçersiz.');
  }
  return tarih;
}

/** Editör: seçili oyun çerezini veya IP özetini engeller. */
export async function POST(req: Request) {
  try {
    const veritabani = await db();
    const kullanici = await panelKoruma(veritabani, req, ['editor', 'admin']);

    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const govde = await govdeOku<EngelGovdesi>(req);
    const oyId = metin(govde?.oyId);
    if (!oyId) throw new HttpHatasi(400, 'gecersiz-oy', 'oyId gerekli.');
    if (!kapsamMi(govde?.kapsam)) {
      throw new HttpHatasi(400, 'gecersiz-kapsam', 'Geçersiz engel kapsamı.');
    }

    const sonuc = await engelle(veritabani, {
      oyId,
      kapsam: govde.kapsam,
      yapan: kullanici.id,
      gerekce: typeof govde?.gerekce === 'string' ? govde.gerekce : '',
      bitis: bitisCoz(govde?.bitis),
    });

    return jsonCevap(sonuc, 201);
  } catch (hata) {
    return hataCevap(hata);
  }
}
