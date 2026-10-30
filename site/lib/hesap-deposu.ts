/**
 * Hesap deposu: admin panelinden hesap oluşturma, listeleme ve güncelleme.
 * E-posta her yerde aynı yerel ayardan bağımsız küçük harf normalizasyonuyla
 * yazılır; dönen satırlarda parola özeti asla bulunmaz.
 */
import { and, eq, sql } from 'drizzle-orm';
import { hesaplar, moderasyonKayitlari, oturumlar } from '../db/schema.ts';
import { HttpHatasi } from './hata.ts';
import { epostaNormalize } from './oturum.ts';
import { parolaGecerliMi, parolaOzetle } from './parola.ts';
import type { Db } from './oy-deposu.ts';

export interface IlkAdminSonucu {
  id: string;
  eposta: string;
  rol: 'editor' | 'admin';
}

export interface HesapSatiri {
  id: string;
  eposta: string;
  rol: 'editor' | 'admin';
  aktif: boolean;
  parolaDegistirmeli: boolean;
  sonGiris: Date | null;
  olusturma: Date;
}

const HESAP_ALANLARI = {
  id: hesaplar.id,
  eposta: hesaplar.eposta,
  rol: hesaplar.rol,
  aktif: hesaplar.aktif,
  parolaDegistirmeli: hesaplar.parolaDegistirmeli,
  sonGiris: hesaplar.sonGiris,
  olusturma: hesaplar.olusturma,
} as const;

/** PostgreSQL/PGlite tekil indeks ihlalini tanır. */
function tekilIhlaliMi(hata: unknown): boolean {
  if (!hata || typeof hata !== 'object') return false;
  const h = hata as {
    code?: unknown;
    message?: unknown;
    cause?: { code?: unknown; message?: unknown };
  };
  if (h.code === '23505' || h.cause?.code === '23505') return true;
  const metin = `${String(h.message ?? '')} ${String(h.cause?.message ?? '')}`.toLocaleLowerCase('tr-TR');
  return metin.includes('duplicate key') || metin.includes('unique constraint');
}

function rolMu(deger: unknown): deger is 'editor' | 'admin' {
  return deger === 'editor' || deger === 'admin';
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

/** Tüm hesapları parola özeti olmadan, oluşturma ve kimlik sırasıyla listeler. */
export async function hesaplariListele(db: Db): Promise<HesapSatiri[]> {
  return db.select(HESAP_ALANLARI).from(hesaplar)
    .orderBy(hesaplar.olusturma, hesaplar.id);
}

/**
 * Yeni editör/admin hesabı açar. Geçici parola yalnızca bu yanıtta bir kez
 * döner; hesap ilk girişte parola değiştirmek zorundadır.
 */
export async function hesapOlustur(
  db: Db,
  girdi: { eposta: string; parola: string; rol: 'editor' | 'admin'; yapan: string },
): Promise<{ hesap: HesapSatiri; geciciParola: string }> {
  const eposta = epostaNormalize(girdi.eposta);
  if (!parolaGecerliMi(girdi.parola)) {
    throw new HttpHatasi(400, 'parola-zayif', 'Parola en az 12 karakter olmalı.');
  }
  if (!rolMu(girdi.rol)) {
    throw new HttpHatasi(400, 'rol-gecersiz', 'Rol editör veya admin olmalı.');
  }

  const parolaOzeti = await parolaOzetle(girdi.parola);

  try {
    return await db.transaction(async (tx) => {
      const [hesap] = await tx.insert(hesaplar).values({
        eposta,
        parolaOzeti,
        rol: girdi.rol,
        aktif: true,
        parolaDegistirmeli: true,
      }).returning(HESAP_ALANLARI);

      if (!hesap) throw new Error('Hesap oluşturulamadı.');

      await tx.insert(moderasyonKayitlari).values({
        islem: 'hesap-olustur',
        yapan: girdi.yapan,
        ayrinti: { hesapId: hesap.id, rol: hesap.rol },
      });

      return { hesap, geciciParola: girdi.parola };
    });
  } catch (hata) {
    if (tekilIhlaliMi(hata)) {
      throw new HttpHatasi(409, 'eposta-var', 'Bu e-posta zaten kayıtlı.');
    }
    throw hata;
  }
}

/**
 * Hesabın rolünü, aktifliğini veya geçici parolasını günceller.
 *
 * Tüm hesap satırları transaction içinde `ORDER BY id FOR UPDATE` ile
 * kilitlenir; böylece eşzamanlı iki rol düşürmesi son aktif admini sıfırlayamaz.
 * Kendi hesabını düşürmek/pasifleştirmek ve son aktif admini düşürmek 409'dur.
 */
export async function hesapGuncelle(
  db: Db,
  girdi: {
    hesapId: string;
    rol?: 'editor' | 'admin';
    aktif?: boolean;
    geciciParola?: string;
    yapan: string;
    kendiId: string;
  },
): Promise<{ hesap: HesapSatiri; geciciParola?: string }> {
  const rolVerildi = girdi.rol !== undefined;
  const aktifVerildi = girdi.aktif !== undefined;
  const parolaVerildi = girdi.geciciParola !== undefined;

  if (!rolVerildi && !aktifVerildi && !parolaVerildi) {
    throw new HttpHatasi(400, 'degisiklik-yok', 'Güncellenecek alan belirtilmedi.');
  }
  if (rolVerildi && !rolMu(girdi.rol)) {
    throw new HttpHatasi(400, 'rol-gecersiz', 'Rol editör veya admin olmalı.');
  }
  if (parolaVerildi && !parolaGecerliMi(girdi.geciciParola as string)) {
    throw new HttpHatasi(422, 'parola-zayif', 'Parola en az 12 karakter olmalı.');
  }

  const yeniOzet = parolaVerildi ? await parolaOzetle(girdi.geciciParola as string) : null;

  return db.transaction(async (tx) => {
    // Tüm hesap satırlarını sabit sırayla kilitle: yarışı serileştirir.
    await tx.execute(sql`select id from hesaplar order by id for update`);

    const [hedef] = await tx.select().from(hesaplar)
      .where(eq(hesaplar.id, girdi.hesapId))
      .limit(1);
    if (!hedef) throw new HttpHatasi(404, 'hesap-yok', 'Hesap bulunamadı.');

    const rolDegisiyor = rolVerildi && girdi.rol !== hedef.rol;
    const pasiflestiriliyor = aktifVerildi && girdi.aktif === false;

    if (girdi.kendiId === girdi.hesapId && (rolDegisiyor || pasiflestiriliyor)) {
      throw new HttpHatasi(409, 'kendi-hesap', 'Kendi hesabınızı pasifleştiremez veya rolünüzü düşüremezsiniz.');
    }

    if ((rolDegisiyor || pasiflestiriliyor) && hedef.rol === 'admin' && hedef.aktif) {
      const [sayim] = await tx.select({ sayi: sql<number>`count(*)::int` }).from(hesaplar)
        .where(and(eq(hesaplar.rol, 'admin'), eq(hesaplar.aktif, true)));
      if (Number(sayim?.sayi ?? 0) <= 1) {
        throw new HttpHatasi(409, 'son-admin', 'Son aktif admin pasifleştirilemez veya rolü düşürülemez.');
      }
    }

    const degerler: {
      rol?: 'editor' | 'admin';
      aktif?: boolean;
      parolaOzeti?: string;
      parolaDegistirmeli?: boolean;
    } = {};
    if (rolVerildi) degerler.rol = girdi.rol;
    if (aktifVerildi) degerler.aktif = girdi.aktif;
    if (yeniOzet) {
      degerler.parolaOzeti = yeniOzet;
      degerler.parolaDegistirmeli = true;
    }

    if (Object.keys(degerler).length) {
      await tx.update(hesaplar).set(degerler).where(eq(hesaplar.id, girdi.hesapId));
    }

    if (rolDegisiyor || pasiflestiriliyor || parolaVerildi) {
      await tx.delete(oturumlar).where(eq(oturumlar.hesapId, girdi.hesapId));
    }

    if (rolDegisiyor) {
      await tx.insert(moderasyonKayitlari).values({
        islem: 'rol-degistir',
        yapan: girdi.yapan,
        ayrinti: { hesapId: girdi.hesapId, eskiRol: hedef.rol, yeniRol: girdi.rol },
      });
    }
    if (aktifVerildi && girdi.aktif !== hedef.aktif) {
      await tx.insert(moderasyonKayitlari).values({
        islem: 'aktiflik',
        yapan: girdi.yapan,
        ayrinti: { hesapId: girdi.hesapId, eskiAktif: hedef.aktif, yeniAktif: girdi.aktif },
      });
    }
    if (parolaVerildi) {
      await tx.insert(moderasyonKayitlari).values({
        islem: 'parola-sifirla',
        yapan: girdi.yapan,
        ayrinti: { hesapId: girdi.hesapId },
      });
    }

    const [guncel] = await tx.select(HESAP_ALANLARI).from(hesaplar)
      .where(eq(hesaplar.id, girdi.hesapId))
      .limit(1);
    if (!guncel) throw new Error('Güncellenen hesap okunamadı.');

    return parolaVerildi
      ? { hesap: guncel, geciciParola: girdi.geciciParola as string }
      : { hesap: guncel };
  });
}
