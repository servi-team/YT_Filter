import { db } from '../../../../lib/db.ts';
import { hataCevap, jsonCevap } from '../../../../lib/istek.ts';
import { kullaniciGerekli } from '../../../../lib/yetki.ts';

export const dynamic = 'force-dynamic';

/** Geçerli oturum kullanıcısını döndürür; oturum yoksa 401. */
export async function GET(req: Request) {
  try {
    const kullanici = await kullaniciGerekli(await db(), req);
    return jsonCevap({ kullanici });
  } catch (hata) {
    return hataCevap(hata);
  }
}
