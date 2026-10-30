/**
 * Parola özetleme: Node scrypt (N=32768, r=8, p=1), 16 bayt rastgele tuz,
 * 64 bayt anahtar. Özet biçimi `scrypt$N$r$p$tuz$anahtar`; tuz ve anahtar
 * base64url kodlanır. Doğrulama sabit zamanlı karşılaştırma kullanır.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const N = 32768;
const R = 8;
const P = 1;
const TUZ_BAYT = 16;
const ANAHTAR_BAYT = 64;
const MAXMEM = 64 * 1024 * 1024;
const EN_AZ_PAROLA = 12;

function scryptTure(tuz: Buffer, parola: string, anahtarBayt: number): Promise<Buffer> {
  return new Promise((cozum, red) => {
    scrypt(parola, tuz, anahtarBayt, { N, r: R, p: P, maxmem: MAXMEM }, (hata, anahtar) => {
      if (hata) red(hata);
      else cozum(anahtar);
    });
  });
}

/** Parolayı scrypt ile özetler. */
export async function parolaOzetle(parola: string): Promise<string> {
  const tuz = randomBytes(TUZ_BAYT);
  const anahtar = await scryptTure(tuz, parola, ANAHTAR_BAYT);
  return [
    'scrypt',
    String(N),
    String(R),
    String(P),
    tuz.toString('base64url'),
    anahtar.toString('base64url'),
  ].join('$');
}

/**
 * Parolayı özetle karşılaştırır. Bozuk, eksik veya tanınmayan özetlerde
 * hata fırlatmaz; yalnızca `false` döner.
 */
export async function parolaDogrula(parola: string, ozet: string): Promise<boolean> {
  if (typeof parola !== 'string' || typeof ozet !== 'string') return false;

  const parcalar = ozet.split('$');
  if (parcalar.length !== 6 || parcalar[0] !== 'scrypt') return false;

  const n = Number(parcalar[1]);
  const r = Number(parcalar[2]);
  const p = Number(parcalar[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  if (n <= 0 || r <= 0 || p <= 0) return false;

  let tuz: Buffer;
  let beklenen: Buffer;
  try {
    tuz = Buffer.from(parcalar[4], 'base64url');
    beklenen = Buffer.from(parcalar[5], 'base64url');
  } catch {
    return false;
  }
  if (!tuz.length || !beklenen.length) return false;

  try {
    const anahtar = await new Promise<Buffer>((cozum, red) => {
      scrypt(parola, tuz, beklenen.length, { N: n, r, p, maxmem: MAXMEM }, (hata, sonuc) => {
        if (hata) red(hata);
        else cozum(sonuc);
      });
    });
    return anahtar.length === beklenen.length && timingSafeEqual(anahtar, beklenen);
  } catch {
    return false;
  }
}

/** Parola en az 12 karakter mi? (Boşluklar kırpılmaz; yalnızca uzunluğa bakılır.) */
export function parolaGecerliMi(parola: string): boolean {
  return typeof parola === 'string' && parola.length >= EN_AZ_PAROLA;
}
