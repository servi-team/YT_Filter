import { db } from '../../../../lib/db.ts';
import { hataCevap, jsonCevap } from '../../../../lib/istek.ts';
import { engelleriListele } from '../../../../lib/moderasyon-deposu.ts';
import { rolGerekli } from '../../../../lib/yetki.ts';

export const dynamic = 'force-dynamic';

/** Editör/admin: aktif engelleri listeler. Okuma olduğu için yazma hız limiti yok. */
export async function GET(req: Request) {
  try {
    const veritabani = await db();
    await rolGerekli(veritabani, req, ['editor', 'admin']);
    const engeller = await engelleriListele(veritabani);
    return jsonCevap({ engeller });
  } catch (hata) {
    return hataCevap(hata);
  }
}
