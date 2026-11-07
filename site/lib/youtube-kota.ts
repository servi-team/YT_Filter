/**
 * YouTube Data API günlük kota sayacı. Sayaç `hiz_limitleri` tablosunda,
 * UTC gününe hizalı 86400 saniyelik sabit pencereyle tutulur. API anahtarı
 * yoksa çözücü yalnızca oEmbed/HTML kullanır ve sayaç artmaz.
 */
import { sayacArtir, sayacOku } from './hiz-limiti.ts';
import type { Db } from './oy-deposu.ts';
import { metaCoz, type MetaCozucu } from './youtube-meta.ts';

export const YOUTUBE_KOTA_GUNLUK = 10000;
export const YOUTUBE_KOTA_UYARI = 8000;

const KOTA_KURALI = { anahtar: 'youtube-kota', pencereSaniye: 86400 } as const;

export interface KotaDurumu {
  kullanilan: number;
  kalan: number;
  uyari: boolean;
}

export interface KotaMetaSecenekleri {
  apiKey?: string | null;
  fetch?: typeof fetch;
}

function ozet(kullanilan: number): KotaDurumu {
  return {
    kullanilan,
    kalan: Math.max(0, YOUTUBE_KOTA_GUNLUK - kullanilan),
    uyari: kullanilan >= YOUTUBE_KOTA_UYARI,
  };
}

/** Kotayı `adet` kadar artırır ve güncel durumu döndürür. */
export async function kotaKullan(db: Db, adet = 1, simdi: Date = new Date()): Promise<KotaDurumu> {
  const kullanilan = await sayacArtir(db, KOTA_KURALI, simdi, adet);
  return ozet(kullanilan);
}

/** Kotayı artırmadan okur; kayıt yoksa kullanım 0'dır. */
export async function kotaDurumu(db: Db, simdi: Date = new Date()): Promise<KotaDurumu> {
  const kullanilan = await sayacOku(db, KOTA_KURALI, simdi);
  return ozet(kullanilan);
}

/** API anahtarını ortamdan tamamlayan ve kotayı veritabanına yazan çözücü. */
export function kotaylaMetaCozucu(db: Db, secenek: KotaMetaSecenekleri = {}): MetaCozucu {
  const apiKey = secenek.apiKey || process.env.YOUTUBE_API_KEY || null;

  return (link) => metaCoz(link, {
    fetch: secenek.fetch,
    apiKey,
    kotaArtir: async (adet) => {
      await kotaKullan(db, adet);
    },
  });
}
