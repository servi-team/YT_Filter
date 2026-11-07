/**
 * Arşiv ve metadata deposu: yönetici içerik listesi, arşivleme/geri getirme ve
 * kanal/video metadata düzeltmeleri. Arşivleme oylara, kilitlere veya yayın
 * sürümlerine dokunmaz; yalnızca kaydın görünürlüğünü değiştirir.
 */
import { eq } from 'drizzle-orm';
import { kanallar, moderasyonKayitlari, videolar } from '../db/schema.ts';
import { HttpHatasi } from './hata.ts';
import { icerikListele, type IcerikListeOgesi } from './icerik-deposu.ts';
import type { Db } from './oy-deposu.ts';
import type { HedefTuru } from './tipler.ts';

export interface AdminIcerikSatiri extends IcerikListeOgesi {}

export interface ArsivGirdisi {
  tur: HedefTuru;
  id: string;
  yapan: string;
  gerekce: string;
}

export interface MetadataGirdisi {
  tur: HedefTuru;
  id: string;
  ad?: string | null;
  handle?: string | null;
  avatar?: string | null;
  baslik?: string | null;
  kanalAdi?: string | null;
  kanalHandle?: string | null;
  kanalAvatar?: string | null;
  yapan: string;
}

function gerekceDogrula(gerekce: string): string {
  const temiz = typeof gerekce === 'string' ? gerekce.trim() : '';
  if (!temiz) throw new HttpHatasi(422, 'gerekce', 'Gerekçe zorunlu.');
  return temiz;
}

function turDogrula(tur: HedefTuru): void {
  if (tur !== 'kanal' && tur !== 'video') {
    throw new HttpHatasi(400, 'tur-gecersiz', 'Tür kanal veya video olmalı.');
  }
}

function metin(deger: string | null | undefined): string | null | undefined {
  if (deger === undefined) return undefined;
  if (deger === null) return null;
  const temiz = deger.trim();
  return temiz ? temiz : null;
}

function avatarDogrula(deger: string | null | undefined): string | null | undefined {
  if (deger === undefined || deger === null) return deger;
  const temiz = deger.trim();
  if (!temiz) return null;
  if (!temiz.startsWith('https://')) {
    throw new HttpHatasi(422, 'metadata-gecersiz', 'Avatar adresi https:// ile başlamalı.');
  }
  return temiz;
}

function handleDogrula(deger: string | null | undefined): string | null | undefined {
  if (deger === undefined || deger === null) return deger;
  const temiz = deger.trim();
  if (!temiz) return null;
  if (!temiz.startsWith('@')) {
    throw new HttpHatasi(422, 'metadata-gecersiz', 'Kanal handle değeri @ ile başlamalı.');
  }
  return temiz;
}

/** Yönetici listesi; varsayılan aktif kayıtlar. Kamusal listeyle aynı sorgu yolunu kullanır. */
export async function adminIcerikListele(
  db: Db,
  girdi: { durum?: 'aktif' | 'arsiv'; arama?: string } = {},
): Promise<AdminIcerikSatiri[]> {
  const { kayitlar } = await icerikListele(db, {
    durum: girdi.durum ?? 'aktif',
    arama: girdi.arama,
    sayfaBoyu: 1000,
  });
  return kayitlar;
}

/** Kaydı arşivler; oylar, kilitler ve yayın sürümleri olduğu gibi kalır. */
export async function icerikArsivle(db: Db, girdi: ArsivGirdisi): Promise<void> {
  turDogrula(girdi.tur);
  const gerekce = gerekceDogrula(girdi.gerekce);

  await db.transaction(async (tx) => {
    if (girdi.tur === 'kanal') {
      const [hedef] = await tx.select({ arsivlendi: kanallar.arsivlendi })
        .from(kanallar).where(eq(kanallar.id, girdi.id)).for('update');
      if (!hedef) throw new HttpHatasi(404, 'icerik-yok', 'İçerik bulunamadı.');
      if (hedef.arsivlendi) throw new HttpHatasi(409, 'zaten-arsivde', 'Kayıt zaten arşivde.');
      await tx.update(kanallar)
        .set({ arsivlendi: true, arsivleyen: girdi.yapan })
        .where(eq(kanallar.id, girdi.id));
    } else {
      const [hedef] = await tx.select({ arsivlendi: videolar.arsivlendi })
        .from(videolar).where(eq(videolar.id, girdi.id)).for('update');
      if (!hedef) throw new HttpHatasi(404, 'icerik-yok', 'İçerik bulunamadı.');
      if (hedef.arsivlendi) throw new HttpHatasi(409, 'zaten-arsivde', 'Kayıt zaten arşivde.');
      await tx.update(videolar)
        .set({ arsivlendi: true, arsivleyen: girdi.yapan })
        .where(eq(videolar.id, girdi.id));
    }

    await tx.insert(moderasyonKayitlari).values({
      islem: 'arsivle',
      yapan: girdi.yapan,
      hedefTuru: girdi.tur,
      hedefId: girdi.id,
      gerekce,
      ayrinti: { tur: girdi.tur, id: girdi.id },
    });
  });
}

/** Arşivdeki kaydı yeniden görünür yapar; oylar ve kilit korunur. */
export async function icerikGeriGetir(db: Db, girdi: ArsivGirdisi): Promise<void> {
  turDogrula(girdi.tur);
  const gerekce = gerekceDogrula(girdi.gerekce);

  await db.transaction(async (tx) => {
    if (girdi.tur === 'kanal') {
      const [hedef] = await tx.select({ arsivlendi: kanallar.arsivlendi })
        .from(kanallar).where(eq(kanallar.id, girdi.id)).for('update');
      if (!hedef) throw new HttpHatasi(404, 'icerik-yok', 'İçerik bulunamadı.');
      if (!hedef.arsivlendi) throw new HttpHatasi(409, 'zaten-aktif', 'Kayıt zaten aktif.');
      await tx.update(kanallar)
        .set({ arsivlendi: false, arsivleyen: null })
        .where(eq(kanallar.id, girdi.id));
    } else {
      const [hedef] = await tx.select({ arsivlendi: videolar.arsivlendi })
        .from(videolar).where(eq(videolar.id, girdi.id)).for('update');
      if (!hedef) throw new HttpHatasi(404, 'icerik-yok', 'İçerik bulunamadı.');
      if (!hedef.arsivlendi) throw new HttpHatasi(409, 'zaten-aktif', 'Kayıt zaten aktif.');
      await tx.update(videolar)
        .set({ arsivlendi: false, arsivleyen: null })
        .where(eq(videolar.id, girdi.id));
    }

    await tx.insert(moderasyonKayitlari).values({
      islem: 'geri-getir',
      yapan: girdi.yapan,
      hedefTuru: girdi.tur,
      hedefId: girdi.id,
      gerekce,
      ayrinti: { tur: girdi.tur, id: girdi.id },
    });
  });
}

/**
 * Kanal veya video metadata alanlarını düzeltir. Yalnızca türe ait alanlar
 * yazılır; video güncellemesi kanal satırı oluşturmaz. Günlükte değerler değil,
 * değiştirilen alan adları tutulur.
 */
export async function metadataGuncelle(db: Db, girdi: MetadataGirdisi): Promise<void> {
  turDogrula(girdi.tur);

  const ad = metin(girdi.ad);
  const handle = handleDogrula(girdi.handle);
  const avatar = avatarDogrula(girdi.avatar);
  const baslik = metin(girdi.baslik);
  const kanalAdi = metin(girdi.kanalAdi);
  const kanalHandle = handleDogrula(girdi.kanalHandle);
  const kanalAvatar = avatarDogrula(girdi.kanalAvatar);

  await db.transaction(async (tx) => {
    const alanlar: string[] = [];

    if (girdi.tur === 'kanal') {
      const degerler: {
        ad?: string | null;
        handle?: string | null;
        avatar?: string | null;
        metaGuncelleme: Date;
      } = { metaGuncelleme: new Date() };

      if (ad !== undefined) { degerler.ad = ad; alanlar.push('ad'); }
      if (handle !== undefined) { degerler.handle = handle; alanlar.push('handle'); }
      if (avatar !== undefined) { degerler.avatar = avatar; alanlar.push('avatar'); }

      if (!alanlar.length) {
        throw new HttpHatasi(400, 'degisiklik-yok', 'Güncellenecek alan belirtilmedi.');
      }

      const guncellenen = await tx.update(kanallar).set(degerler)
        .where(eq(kanallar.id, girdi.id)).returning({ id: kanallar.id });
      if (!guncellenen.length) throw new HttpHatasi(404, 'icerik-yok', 'İçerik bulunamadı.');
    } else {
      const degerler: {
        baslik?: string | null;
        kanalAdi?: string | null;
        kanalHandle?: string | null;
        kanalAvatar?: string | null;
        metaGuncelleme: Date;
      } = { metaGuncelleme: new Date() };

      if (baslik !== undefined) { degerler.baslik = baslik; alanlar.push('baslik'); }
      if (kanalAdi !== undefined) { degerler.kanalAdi = kanalAdi; alanlar.push('kanalAdi'); }
      if (kanalHandle !== undefined) { degerler.kanalHandle = kanalHandle; alanlar.push('kanalHandle'); }
      if (kanalAvatar !== undefined) { degerler.kanalAvatar = kanalAvatar; alanlar.push('kanalAvatar'); }

      if (!alanlar.length) {
        throw new HttpHatasi(400, 'degisiklik-yok', 'Güncellenecek alan belirtilmedi.');
      }

      const guncellenen = await tx.update(videolar).set(degerler)
        .where(eq(videolar.id, girdi.id)).returning({ id: videolar.id });
      if (!guncellenen.length) throw new HttpHatasi(404, 'icerik-yok', 'İçerik bulunamadı.');
    }

    await tx.insert(moderasyonKayitlari).values({
      islem: 'metadata-duzelt',
      yapan: girdi.yapan,
      hedefTuru: girdi.tur,
      hedefId: girdi.id,
      ayrinti: { tur: girdi.tur, id: girdi.id, alanlar },
    });
  });
}
