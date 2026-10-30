/**
 * Hesap deposu. Şu an tek işlev ilk admini oluşturmaktır; hesap yönetimi
 * (ekleme, rol değiştirme, pasifleştirme) admin panelinde gelecektir.
 * E-posta her yerde aynı Türkçe küçük harf normalizasyonuyla yazılır.
 */
import { sql } from 'drizzle-orm';
import { hesaplar } from '../db/schema.ts';
import { HttpHatasi } from './hata.ts';
import { epostaNormalize } from './oturum.ts';
import { parolaGecerliMi, parolaOzetle } from './parola.ts';
import type { Db } from './oy-deposu.ts';

export interface IlkAdminSonucu {
  id: string;
  eposta: string;
  rol: 'editor' | 'admin';
}

/**
 * Yalnızca hiç hesap yokken ilk admini oluşturur. İlk girişte parola
 * değiştirme zorunludur. Parola özeti dönüş değerine konmaz.
 */
export async function ilkAdminOlustur(
  db: Db,
  girdi: { eposta: string; parola: string },
): Promise<IlkAdminSonucu> {
  const eposta = epostaNormalize(girdi.eposta);
  if (!parolaGecerliMi(girdi.parola)) {
    throw new HttpHatasi(400, 'parola-zayif', 'Parola en az 12 karakter olmalı.');
  }

  const [sayim] = await db.select({ sayi: sql<number>`count(*)::int` }).from(hesaplar);
  if (Number(sayim?.sayi ?? 0) > 0) {
    throw new HttpHatasi(409, 'hesap-var', 'Zaten bir hesap var.');
  }

  const parolaOzeti = await parolaOzetle(girdi.parola);
  const [hesap] = await db.insert(hesaplar).values({
    eposta,
    parolaOzeti,
    rol: 'admin',
    aktif: true,
    parolaDegistirmeli: true,
  }).returning({ id: hesaplar.id, eposta: hesaplar.eposta, rol: hesaplar.rol });

  if (!hesap) throw new Error('İlk admin oluşturulamadı.');
  return hesap;
}
