/**
 * Ekleme talebi servisi. Kayıtlı olmayan veya arşivlenmiş bir YouTube linki
 * için talep oluşturur; aynı hedefe gelen talepleri tek satırda birleştirir.
 * Handle'lar metadata çözücüyle UC kimliğine kanonikleştirilir; böylece
 * `@k` ile aynı kanalın `/channel/UC…` linki aynı talebe düşer.
 */
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { eklemeTalepleri, hesaplar, moderasyonKayitlari } from '../db/schema.ts';
import { linkIleKayitBul } from './icerik-deposu.ts';
import { icerikEkle, metaKimlikleTamamla } from './icerik-yaz.ts';
import { HttpHatasi } from './hata.ts';
import type { Db } from './oy-deposu.ts';
import type { HedefTuru } from './tipler.ts';
import type { KanalMeta, Meta, MetaCozucu, MetaSonucu } from './youtube-meta.ts';
import { linkCoz, type LinkSonucu } from './youtube-link.ts';

export type CozulenLink = Exclude<LinkSonucu, { tur: 'hata' }>;

export interface TalepGirdisi {
  link: string;
  cozulen: CozulenLink;
  metaCozucu?: MetaCozucu;
  tarayiciId: string;
  ipOzeti: string | null;
}

export type TalepSonucu =
  | { durum: 'kayitli'; tur: HedefTuru; id: string }
  | { durum: 'talep'; talepId: string; yeni: boolean };

const KANAL_ID = /^UC[A-Za-z0-9_-]{22}$/;

/** Handle'ı çözer; UC kimliği dışında bir sonuç gelirse 422 fırlatır. */
async function handleKanalKimligi(
  cozulen: CozulenLink,
  metaCozucu: MetaCozucu | undefined,
): Promise<string> {
  if (!metaCozucu) {
    throw new HttpHatasi(422, 'kanal-cozulemedi', 'Kanal kimliği bulunamadı.');
  }

  const meta = await metaCozucu(cozulen);
  if (meta.tur !== 'kanal' || !KANAL_ID.test(meta.id)) {
    throw new HttpHatasi(422, 'kanal-cozulemedi', 'Kanal kimliği bulunamadı.');
  }
  return meta.id;
}

/**
 * Aktif kayıt varsa doğrudan ona döner. Arşivli kayıt aktif sayılmaz; talep
 * akışına düşer. Talep `(hedefTuru, anahtar)` üzerinden upsert edilir:
 * tekrar gelen talep sayacı artırır, red edilmiş talep yeniden açılır.
 */
export async function talepOlustur(db: Db, girdi: TalepGirdisi): Promise<TalepSonucu> {
  const ilkKayit = await linkIleKayitBul(db, girdi.cozulen);
  if (ilkKayit && !ilkKayit.arsivli) {
    return { durum: 'kayitli', tur: ilkKayit.kayit.tur, id: ilkKayit.kayit.id };
  }

  let hedefTuru: HedefTuru;
  let anahtar: string;

  if (girdi.cozulen.tur === 'video') {
    hedefTuru = 'video';
    anahtar = girdi.cozulen.id;
  } else if ('handle' in girdi.cozulen) {
    hedefTuru = 'kanal';
    anahtar = await handleKanalKimligi(girdi.cozulen, girdi.metaCozucu);

    const cozulenKayit = await linkIleKayitBul(db, { tur: 'kanal', id: anahtar });
    if (cozulenKayit && !cozulenKayit.arsivli) {
      return { durum: 'kayitli', tur: 'kanal', id: cozulenKayit.kayit.id };
    }
  } else {
    hedefTuru = 'kanal';
    anahtar = girdi.cozulen.id;
  }

  const [satir] = await db.insert(eklemeTalepleri)
    .values({
      hedefTuru,
      anahtar,
      link: girdi.link,
      durum: 'bekliyor',
      talepSayisi: 1,
    })
    .onConflictDoUpdate({
      target: [eklemeTalepleri.hedefTuru, eklemeTalepleri.anahtar],
      set: {
        talepSayisi: sql`${eklemeTalepleri.talepSayisi} + 1`,
        sonTalep: sql`now()`,
        link: girdi.link,
        durum: 'bekliyor',
        redGerekce: null,
      },
    })
    .returning({ id: eklemeTalepleri.id, talepSayisi: eklemeTalepleri.talepSayisi });

  if (!satir) {
    throw new Error('Ekleme talebi kaydedilemedi.');
  }

  return { durum: 'talep', talepId: satir.id, yeni: satir.talepSayisi === 1 };
}

export type TalepDurumu = 'bekliyor' | 'kabul' | 'red';

export interface TalepSatiri {
  id: string;
  hedefTuru: HedefTuru;
  anahtar: string;
  link: string;
  durum: TalepDurumu;
  talepSayisi: number;
  ilkTalep: Date;
  sonTalep: Date;
  isleyen: string | null;
  isleyenEposta: string | null;
  redGerekce: string | null;
}

export interface TalepleriListeleSecenekleri {
  durum?: TalepDurumu | TalepDurumu[];
}

/** Panel kuyruğu; isteğe bağlı durum filtresiyle en yeni talepler önce. */
export async function talepleriListele(
  db: Db,
  secenek: TalepleriListeleSecenekleri = {},
): Promise<TalepSatiri[]> {
  const durumlar = secenek.durum === undefined
    ? null
    : Array.isArray(secenek.durum) ? secenek.durum : [secenek.durum];

  const temel = db.select({
    id: eklemeTalepleri.id,
    hedefTuru: eklemeTalepleri.hedefTuru,
    anahtar: eklemeTalepleri.anahtar,
    link: eklemeTalepleri.link,
    durum: eklemeTalepleri.durum,
    talepSayisi: eklemeTalepleri.talepSayisi,
    ilkTalep: eklemeTalepleri.ilkTalep,
    sonTalep: eklemeTalepleri.sonTalep,
    isleyen: eklemeTalepleri.isleyen,
    isleyenEposta: hesaplar.eposta,
    redGerekce: eklemeTalepleri.redGerekce,
  }).from(eklemeTalepleri)
    .leftJoin(hesaplar, eq(eklemeTalepleri.isleyen, hesaplar.id));

  const satirlar = durumlar
    ? await temel.where(inArray(eklemeTalepleri.durum, durumlar)).orderBy(desc(eklemeTalepleri.sonTalep))
    : await temel.orderBy(desc(eklemeTalepleri.sonTalep));

  return satirlar;
}

export interface TalepIsleGirdisi {
  talepId: string;
  karar: 'kabul' | 'red';
  gerekce?: string | null;
  yapan: string;
  metaCozucu?: MetaCozucu;
}

export interface TalepIsleSonucu {
  durum: 'kabul' | 'red';
  hedef?: { tur: HedefTuru; id: string };
}

/**
 * Handle talebinde kimlik zaten `anahtar` alanında UC… olarak durur; metadata
 * yalnızca görünen ad/handle/avatar için kullanılır. Metadata çözülemezse
 * kimlikle devam edilir, böylece kabul akışı ağ hatasına takılmaz.
 */
function kabulMeta(cozulen: CozulenLink, metaSonucu: MetaSonucu | null, anahtar: string): Meta {
  if (cozulen.tur === 'kanal' && 'handle' in cozulen) {
    const kanalMeta = metaSonucu && metaSonucu.tur === 'kanal' ? metaSonucu : null;
    const meta: KanalMeta = {
      tur: 'kanal',
      id: anahtar,
      ad: kanalMeta?.ad ?? null,
      handle: kanalMeta?.handle ?? cozulen.handle,
      avatar: kanalMeta?.avatar ?? null,
    };
    return meta;
  }

  return metaKimlikleTamamla(cozulen, metaSonucu);
}

/**
 * Bekleyen talebi kabul veya red eder. Aynı talep ikinci kez işlenemez.
 * Kabulde içerik `icerikEkle` ile yazılır; video kanal satırı açmaz.
 */
export async function talepIsle(db: Db, girdi: TalepIsleGirdisi): Promise<TalepIsleSonucu> {
  const [talep] = await db.select({
    id: eklemeTalepleri.id,
    hedefTuru: eklemeTalepleri.hedefTuru,
    anahtar: eklemeTalepleri.anahtar,
    link: eklemeTalepleri.link,
    durum: eklemeTalepleri.durum,
  }).from(eklemeTalepleri)
    .where(eq(eklemeTalepleri.id, girdi.talepId))
    .limit(1);

  if (!talep) {
    throw new HttpHatasi(404, 'talep-yok', 'Talep bulunamadı.');
  }
  if (talep.durum !== 'bekliyor') {
    throw new HttpHatasi(409, 'islenmis', 'Bu talep zaten işlenmiş.');
  }

  if (girdi.karar === 'red') {
    const gerekce = typeof girdi.gerekce === 'string' ? girdi.gerekce.trim() : '';
    if (!gerekce) {
      throw new HttpHatasi(422, 'gerekce', 'Red için gerekçe gerekli.');
    }

    await db.transaction(async (tx) => {
      const [guncel] = await tx.update(eklemeTalepleri)
        .set({ durum: 'red', isleyen: girdi.yapan, redGerekce: gerekce })
        .where(and(eq(eklemeTalepleri.id, talep.id), eq(eklemeTalepleri.durum, 'bekliyor')))
        .returning({ id: eklemeTalepleri.id });

      if (!guncel) {
        throw new HttpHatasi(409, 'islenmis', 'Bu talep zaten işlenmiş.');
      }

      await tx.insert(moderasyonKayitlari).values({
        islem: 'talep-red',
        yapan: girdi.yapan,
        hedefTuru: talep.hedefTuru,
        hedefId: talep.anahtar,
        gerekce,
        ayrinti: { talepId: talep.id },
      });
    });

    return { durum: 'red' };
  }

  if (girdi.karar !== 'kabul') {
    throw new HttpHatasi(400, 'gecersiz-karar', 'Geçersiz karar.');
  }

  const cozulen = linkCoz(talep.link);
  if (cozulen.tur === 'hata') {
    throw new HttpHatasi(422, 'gecersiz-link', cozulen.neden);
  }

  const metaSonucu = girdi.metaCozucu ? await girdi.metaCozucu(cozulen) : null;
  const meta = kabulMeta(cozulen, metaSonucu, talep.anahtar);
  const sonuc = await icerikEkle(db, { cozulen, meta, ekleyen: girdi.yapan });

  await db.transaction(async (tx) => {
    const [guncel] = await tx.update(eklemeTalepleri)
      .set({ durum: 'kabul', isleyen: girdi.yapan, redGerekce: null })
      .where(and(eq(eklemeTalepleri.id, talep.id), eq(eklemeTalepleri.durum, 'bekliyor')))
      .returning({ id: eklemeTalepleri.id });

    if (!guncel) {
      throw new HttpHatasi(409, 'islenmis', 'Bu talep zaten işlenmiş.');
    }

    await tx.insert(moderasyonKayitlari).values({
      islem: 'talep-kabul',
      yapan: girdi.yapan,
      hedefTuru: sonuc.tur,
      hedefId: sonuc.id,
      ayrinti: {
        talepId: talep.id,
        hedef: { tur: sonuc.tur, id: sonuc.id },
        durum: sonuc.durum,
      },
    });
  });

  return { durum: 'kabul', hedef: { tur: sonuc.tur, id: sonuc.id } };
}
