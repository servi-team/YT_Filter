/**
 * Oy hesabı: SAF fonksiyon (veritabanı, ağ, saat yok). Kural kaynağı: docs/db-sema.md "dışa aktarma kuralı"
 * ve docs/PLAN_SITE.md bölüm 4.
 *
 *  1. Geri alınan oylar hesaba girmez.
 *  2. Toplam oy (up + kararsız + down) ESIK'ten azsa konu/etiket değerlendirilmez.
 *  3. Net = up - down (kararsız oylar hariç).
 *  4. Net > 0: konu için ana/yan, etiket için aktif. Net = 0: kararsız. Net < 0: elenir.
 *  5. Ana konu: en yüksek net; eşitlikte çok upvote; o da eşitse taksonomi sırası. Gerisi yan konu.
 */
import type { KayitSonucu } from './ortak.ts';

export const ESIK = 3;

export type OyDegeri = 'up' | 'kararsiz' | 'down';
export interface Oy {
  deger: OyDegeri;
  ziyaretciGeriAlindi?: boolean;
  moderasyonGeriAlindi?: boolean;
}
export interface Sayim { up: number; kararsiz: number; down: number }

export const bosSayim = (): Sayim => ({ up: 0, kararsiz: 0, down: 0 });
export const toplamOy = (s: Sayim): number => s.up + s.kararsiz + s.down;
export const net = (s: Sayim): number => s.up - s.down;

/** Tek bir konu/etiketin ham oy listesini sayıma çevirir. Geri alınanlar atlanır. */
export function sayimYap(oylar: Oy[]): Sayim {
  const s = bosSayim();
  for (const o of oylar) if (!o.ziyaretciGeriAlindi && !o.moderasyonGeriAlindi) s[o.deger]++;
  return s;
}

export type Durum = 'esik-alti' | 'pozitif' | 'kararsiz' | 'elendi';

export function durumBul(s: Sayim, esik = ESIK): Durum {
  if (toplamOy(s) < esik) return 'esik-alti';
  const n = net(s);
  return n > 0 ? 'pozitif' : n === 0 ? 'kararsiz' : 'elendi';
}

/**
 * konular / etiketler: { kimlik: Sayim }. Oy almamış kimlikler verilmeyebilir.
 * konuSirasi: taxonomy.KONULAR kimlik sırası (beraberlik için). Etiketler çıktıda taksonomi sırasında verilir.
 */
export function sonucHesapla(
  konular: Record<string, Sayim>,
  etiketler: Record<string, Sayim>,
  konuSirasi: string[],
  etiketSirasi: string[],
  esik = ESIK,
): KayitSonucu {
  const sira = (dizi: string[], id: string) => { const i = dizi.indexOf(id); return i < 0 ? Number.MAX_SAFE_INTEGER : i; };

  const pozitifKonular: string[] = [];
  const kararsizKonular: string[] = [];
  for (const id of Object.keys(konular)) {
    const d = durumBul(konular[id], esik);
    if (d === 'pozitif') pozitifKonular.push(id);
    else if (d === 'kararsiz') kararsizKonular.push(id);
  }
  pozitifKonular.sort((a, b) =>
    net(konular[b]) - net(konular[a]) ||
    konular[b].up - konular[a].up ||
    sira(konuSirasi, a) - sira(konuSirasi, b));
  kararsizKonular.sort((a, b) => sira(konuSirasi, a) - sira(konuSirasi, b));

  const aktifEtiketler: string[] = [];
  const kararsizEtiketler: string[] = [];
  for (const id of Object.keys(etiketler)) {
    const d = durumBul(etiketler[id], esik);
    if (d === 'pozitif') aktifEtiketler.push(id);
    else if (d === 'kararsiz') kararsizEtiketler.push(id);
  }
  aktifEtiketler.sort((a, b) => sira(etiketSirasi, a) - sira(etiketSirasi, b));
  kararsizEtiketler.sort((a, b) => sira(etiketSirasi, a) - sira(etiketSirasi, b));

  return {
    anaKonu: pozitifKonular[0] ?? null,
    yanKonular: pozitifKonular.slice(1),
    etiketler: aktifEtiketler,
    kararsizKonular,
    kararsizEtiketler,
  };
}

/** Sonuçta hiçbir bilgi yok mu? (Boş kayıt db.json'a yazılmaz; eklentide "bilinmeyen" sayılır.) */
export function sonucBosMu(r: KayitSonucu): boolean {
  return !r.anaKonu && !r.etiketler.length && !r.kararsizKonular.length && !r.kararsizEtiketler.length;
}
