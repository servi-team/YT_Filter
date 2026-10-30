/**
 * İçerik yazma servisi. Editörün yapıştırdığı linkten kanal/video kaydı
 * oluşturur. Video eklemek kanal satırı AÇMAZ; kanal bilgisi video satırında
 * denormalized durur. Arşivli kayıt aynı kimlikle gelirse geri getirilir,
 * oyları ve kilidi korunur.
 */
import { eq, sql } from 'drizzle-orm';
import { kanallar, moderasyonKayitlari, videolar } from '../db/schema.ts';
import { HttpHatasi } from './hata.ts';
import type { Db } from './oy-deposu.ts';
import type { HedefTuru } from './tipler.ts';
import type { KanalMeta, Meta, MetaSonucu, VideoMeta } from './youtube-meta.ts';
import type { LinkSonucu } from './youtube-link.ts';

export type CozulenLink = Exclude<LinkSonucu, { tur: 'hata' }>;

export interface IcerikEkleGirdisi {
  cozulen: CozulenLink;
  meta: Meta;
  ekleyen: string;
}

export interface IcerikEkleSonucu {
  durum: 'eklendi' | 'vardi' | 'arsivden';
  tur: HedefTuru;
  id: string;
}

const KANAL_ID = /^UC[A-Za-z0-9_-]{22}$/;

function bosVideoMeta(id: string): VideoMeta {
  return {
    tur: 'video',
    id,
    baslik: null,
    kanalId: null,
    kanalAdi: null,
    kanalHandle: null,
    kanalAvatar: null,
  };
}

function bosKanalMeta(id: string): KanalMeta {
  return { tur: 'kanal', id, ad: null, handle: null, avatar: null };
}

/**
 * Metadata çözülemediğinde kimlikle devam eder: video/UC kanal için null
 * alanlı meta üretir; handle'ın UC kimliği yoksa 422 fırlatır.
 */
export function metaKimlikleTamamla(cozulen: CozulenLink, meta: MetaSonucu | null): Meta {
  if (meta && meta.tur !== 'hata') return meta;
  if (cozulen.tur === 'video') return bosVideoMeta(cozulen.id);
  if ('handle' in cozulen) {
    throw new HttpHatasi(422, 'kanal-cozulemedi', 'Kanal kimliği bulunamadı.');
  }
  return bosKanalMeta(cozulen.id);
}

function videoMeta(meta: Meta, id: string): VideoMeta {
  return meta.tur === 'video' ? meta : bosVideoMeta(id);
}

function kanalMeta(meta: Meta, id: string): KanalMeta {
  return meta.tur === 'kanal' ? meta : bosKanalMeta(id);
}

function kanalKimligi(cozulen: CozulenLink, meta: Meta): string {
  if (cozulen.tur === 'kanal' && 'handle' in cozulen) {
    if (meta.tur !== 'kanal' || !KANAL_ID.test(meta.id)) {
      throw new HttpHatasi(422, 'kanal-cozulemedi', 'Kanal kimliği bulunamadı.');
    }
    return meta.id;
  }
  return cozulen.id;
}

async function arsivdenGeriGetir(
  db: Db,
  tur: HedefTuru,
  id: string,
  degerler: Record<string, unknown>,
  ekleyen: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    if (tur === 'video') {
      await tx.update(videolar).set({
        ...degerler,
        metaGuncelleme: sql`now()`,
        arsivlendi: false,
        arsivleyen: null,
      }).where(eq(videolar.id, id));
    } else {
      await tx.update(kanallar).set({
        ...degerler,
        metaGuncelleme: sql`now()`,
        arsivlendi: false,
        arsivleyen: null,
      }).where(eq(kanallar.id, id));
    }

    await tx.insert(moderasyonKayitlari).values({
      islem: 'geri-getir',
      yapan: ekleyen,
      hedefTuru: tur,
      hedefId: id,
      gerekce: 'Aynı link yeniden eklendi.',
      ayrinti: { kaynak: 'icerik-ekle' },
    });
  });
}

/** Linkten çözülen kimliği ekler; aynı kimlik aktifse dokunmaz. */
export async function icerikEkle(db: Db, girdi: IcerikEkleGirdisi): Promise<IcerikEkleSonucu> {
  const { cozulen, meta, ekleyen } = girdi;

  if (cozulen.tur === 'video') {
    const id = cozulen.id;
    const alanlar = videoMeta(meta, id);
    const [mevcut] = await db.select({ arsivlendi: videolar.arsivlendi }).from(videolar)
      .where(eq(videolar.id, id)).limit(1);

    if (mevcut) {
      if (!mevcut.arsivlendi) return { durum: 'vardi', tur: 'video', id };
      await arsivdenGeriGetir(db, 'video', id, {
        baslik: alanlar.baslik,
        kanalId: alanlar.kanalId,
        kanalAdi: alanlar.kanalAdi,
        kanalHandle: alanlar.kanalHandle,
        kanalAvatar: alanlar.kanalAvatar,
      }, ekleyen);
      return { durum: 'arsivden', tur: 'video', id };
    }

    await db.insert(videolar).values({
      id,
      baslik: alanlar.baslik,
      kanalId: alanlar.kanalId,
      kanalAdi: alanlar.kanalAdi,
      kanalHandle: alanlar.kanalHandle,
      kanalAvatar: alanlar.kanalAvatar,
      ekleyen,
      metaGuncelleme: new Date(),
      arsivlendi: false,
    });
    return { durum: 'eklendi', tur: 'video', id };
  }

  const id = kanalKimligi(cozulen, meta);
  const alanlar = kanalMeta(meta, id);
  const [mevcut] = await db.select({ arsivlendi: kanallar.arsivlendi }).from(kanallar)
    .where(eq(kanallar.id, id)).limit(1);

  if (mevcut) {
    if (!mevcut.arsivlendi) return { durum: 'vardi', tur: 'kanal', id };
    await arsivdenGeriGetir(db, 'kanal', id, {
      ad: alanlar.ad,
      handle: alanlar.handle,
      avatar: alanlar.avatar,
    }, ekleyen);
    return { durum: 'arsivden', tur: 'kanal', id };
  }

  await db.insert(kanallar).values({
    id,
    ad: alanlar.ad,
    handle: alanlar.handle,
    avatar: alanlar.avatar,
    ekleyen,
    metaGuncelleme: new Date(),
    arsivlendi: false,
  });
  return { durum: 'eklendi', tur: 'kanal', id };
}
