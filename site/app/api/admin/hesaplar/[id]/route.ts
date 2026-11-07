import { db } from '../../../../../lib/db.ts';
import { HttpHatasi } from '../../../../../lib/hata.ts';
import { hesapGuncelle } from '../../../../../lib/hesap-deposu.ts';
import { ayniOriginMi, govdeOku, hataCevap, jsonCevap } from '../../../../../lib/istek.ts';
import { panelKoruma } from '../../../../../lib/yetki.ts';

export const dynamic = 'force-dynamic';

interface HesapGuncelleGovdesi {
  rol?: unknown;
  aktif?: unknown;
  geciciParola?: unknown;
}

/** Admin: hesabın rolünü, aktifliğini veya geçici parolasını günceller. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const veritabani = await db();
    const kullanici = await panelKoruma(veritabani, req, ['admin']);

    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const { id } = await params;
    const govde = await govdeOku<HesapGuncelleGovdesi>(req);

    if (govde?.rol !== undefined && govde.rol !== 'editor' && govde.rol !== 'admin') {
      throw new HttpHatasi(400, 'rol-gecersiz', 'Rol editör veya admin olmalı.');
    }
    if (govde?.aktif !== undefined && typeof govde.aktif !== 'boolean') {
      throw new HttpHatasi(400, 'aktif-gecersiz', 'Aktiflik doğru veya yanlış olmalı.');
    }
    if (govde?.geciciParola !== undefined && typeof govde.geciciParola !== 'string') {
      throw new HttpHatasi(422, 'parola-zayif', 'Parola en az 12 karakter olmalı.');
    }

    const sonuc = await hesapGuncelle(veritabani, {
      hesapId: id,
      rol: govde?.rol,
      aktif: govde?.aktif,
      geciciParola: govde?.geciciParola,
      yapan: kullanici.id,
      kendiId: kullanici.id,
    });

    return jsonCevap(sonuc);
  } catch (hata) {
    return hataCevap(hata);
  }
}
