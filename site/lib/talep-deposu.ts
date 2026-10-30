/**
 * Ekleme talebi servisi. Kayıtlı olmayan veya arşivlenmiş bir YouTube linki
 * için talep oluşturur; aynı hedefe gelen talepleri tek satırda birleştirir.
 * Handle'lar metadata çözücüyle UC kimliğine kanonikleştirilir; böylece
 * `@k` ile aynı kanalın `/channel/UC…` linki aynı talebe düşer.
 */
import { sql } from 'drizzle-orm';
import { eklemeTalepleri } from '../db/schema.ts';
import { linkIleKayitBul } from './icerik-deposu.ts';
import { HttpHatasi } from './hata.ts';
import type { Db } from './oy-deposu.ts';
import type { HedefTuru } from './tipler.ts';
import type { MetaCozucu } from './youtube-meta.ts';
import type { LinkSonucu } from './youtube-link.ts';

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
