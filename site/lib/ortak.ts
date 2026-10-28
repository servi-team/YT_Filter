/**
 * Eklentiyle ortak çekirdek. Taksonomi ve db doğrulayıcı TEK KAYNAKTAN (src/core) alınır, siteye kopyalanmaz.
 * Böylece konu/etiket kimlikleri, sıra ve doğrulama kuralları eklentiyle asla ayrışmaz.
 * Statik import kullanılır: Next.js bunları pakete dahil eder (Docker çıktısında yol sorunu çıkmaz).
 */
// @ts-ignore: src/core düz JS (UMD); tipler aşağıda elle verilir.
import taksonomiModulu from '../../src/core/taxonomy.js';
// @ts-ignore
import dbModulu from '../../src/core/db.js';

export interface Konu { id: string; ad: string; aciklama: string }
export interface KayitSonucu {
  anaKonu: string | null;
  yanKonular: string[];
  etiketler: string[];
  kararsizKonular: string[];
  kararsizEtiketler: string[];
}
export interface Taksonomi {
  KONULAR: Konu[];
  ETIKETLER: Konu[];
  kayitDogrula(kayit: unknown): string[];
}
export interface DbKurSonucu {
  veriSurumu: number;
  sayac: { kanal: number; video: number; atlanan: number; yokSayilan: number };
  hatalar: string[];
  uyarilar: string[];
}

export const taksonomi = taksonomiModulu as Taksonomi;
export const dbKur = (dbModulu as { dbKur: (json: unknown) => DbKurSonucu }).dbKur;
export const DB_SEMA = (dbModulu as { DB_SEMA: number }).DB_SEMA;
