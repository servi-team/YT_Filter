/**
 * Sunucu bileşenleri ve route handler'ları için oturum yardımcıları.
 * Yalnızca sunucuda import edilir; istemci bileşenlerine import etmeyin.
 */
import { cookies } from 'next/headers';
import { db } from './db.ts';
import { HttpHatasi } from './hata.ts';
import { OTURUM_CEREZI, oturumOku, type OturumKullanicisi } from './oturum.ts';
import type { Rol } from './yetki.ts';

/** Geçerli oturum kullanıcısı; yoksa `null`. */
export async function siteKullanici(): Promise<OturumKullanicisi | null> {
  const cerezler = await cookies();
  const token = cerezler.get(OTURUM_CEREZI)?.value;
  if (!token) return null;

  const veritabani = await db();
  return oturumOku(veritabani, token);
}

/** Oturum yoksa 401, rol yoksa 403 fırlatır. */
export async function sunucuRolGerekli(roller: readonly Rol[]): Promise<OturumKullanicisi> {
  const kullanici = await siteKullanici();
  if (!kullanici) throw new HttpHatasi(401, 'oturum-yok', 'Oturum gerekli.');
  if (!roller.includes(kullanici.rol)) {
    throw new HttpHatasi(403, 'yetki-yok', 'Bu işlem için yetkiniz yok.');
  }
  return kullanici;
}
