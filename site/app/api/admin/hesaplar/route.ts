import { db } from '../../../../lib/db.ts';
import { HttpHatasi } from '../../../../lib/hata.ts';
import { hesapOlustur, hesaplariListele } from '../../../../lib/hesap-deposu.ts';
import { ayniOriginMi, govdeOku, hataCevap, jsonCevap } from '../../../../lib/istek.ts';
import { panelKoruma, rolGerekli } from '../../../../lib/yetki.ts';

export const dynamic = 'force-dynamic';

interface HesapGovdesi {
  eposta?: unknown;
  parola?: unknown;
  rol?: unknown;
}

/** Admin: hesapları listeler. */
export async function GET(req: Request) {
  try {
    const veritabani = await db();
    await rolGerekli(veritabani, req, ['admin']);
    return jsonCevap({ hesaplar: await hesaplariListele(veritabani) });
  } catch (hata) {
    return hataCevap(hata);
  }
}

/** Admin: yeni editör/admin hesabı açar; geçici parola yalnızca bu yanıtta döner. */
export async function POST(req: Request) {
  try {
    const veritabani = await db();
    const kullanici = await panelKoruma(veritabani, req, ['admin']);

    if (!ayniOriginMi(req)) {
      throw new HttpHatasi(403, 'origin', 'İstek kaynağı doğrulanamadı.');
    }

    const govde = await govdeOku<HesapGovdesi>(req);
    const eposta = typeof govde?.eposta === 'string' ? govde.eposta.trim() : '';
    const parola = typeof govde?.parola === 'string' ? govde.parola : '';
    if (!eposta) throw new HttpHatasi(400, 'eposta-gecersiz', 'E-posta gerekli.');
    if (govde?.rol !== 'editor' && govde?.rol !== 'admin') {
      throw new HttpHatasi(400, 'rol-gecersiz', 'Rol editör veya admin olmalı.');
    }

    const sonuc = await hesapOlustur(veritabani, {
      eposta,
      parola,
      rol: govde.rol,
      yapan: kullanici.id,
    });

    return jsonCevap(sonuc, 201);
  } catch (hata) {
    return hataCevap(hata);
  }
}
