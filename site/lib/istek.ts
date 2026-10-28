/**
 * Kamusal API'lerin ortak istek yardımcıları: aynı origin kontrolü, IP özeti,
 * JSON yanıtı, hata yanıtı ve gövde okuma.
 */
import { createHmac } from 'node:crypto';
import { HttpHatasi } from './hata.ts';

/** Kamusal oy hız limitleri (env ile ezilebilir). */
export const OY_LIMITI_DAKIKA = Number(process.env.OY_LIMITI_DAKIKA ?? 120);
export const OY_LIMITI_GUN = Number(process.env.OY_LIMITI_GUN ?? 2000);
export const TALEP_LIMITI_SAAT = Number(process.env.TALEP_LIMITI_SAAT ?? 5);
export const GIRIS_LIMITI_15DK = Number(process.env.GIRIS_LIMITI_15DK ?? 10);
export const PANEL_YAZMA_LIMITI_DAKIKA = Number(process.env.PANEL_YAZMA_LIMITI_DAKIKA ?? 120);

/**
 * `Origin` başlığı beklenen siteyle aynı mı? Caddy/proxy arkasında `req.url`
 * iç origin'i gösterebildiği için önce `SITE_ORIGIN` ortam değişkenine bakılır.
 */
export function ayniOriginMi(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;

  const beklenen = process.env.SITE_ORIGIN ?? new URL(req.url).origin;
  return origin === beklenen;
}

/** `x-forwarded-for` ilk değerinin HMAC-SHA256 özeti; anahtar yoksa `null`. */
export function ipOzeti(req: Request): string | null {
  const gizli = process.env.IP_HASH_SECRET;
  if (!gizli) return null;

  const ilk = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!ilk) return null;

  return createHmac('sha256', gizli).update(ilk).digest('hex');
}

/** JSON yanıtı; verilen başlıkları (ör. Set-Cookie) korur. */
export function jsonCevap(veri: unknown, durum = 200, basliklar?: HeadersInit): Response {
  return Response.json(veri, { status: durum, headers: basliklar });
}

/** `HttpHatasi` ise durum/kodunu, değilse 500 döndürür. */
export function hataCevap(hata: unknown): Response {
  if (hata instanceof HttpHatasi) {
    return jsonCevap({ hata: hata.message, kod: hata.kod }, hata.durum);
  }
  console.error('Beklenmeyen API hatası:', hata);
  return jsonCevap({ hata: 'Sunucu hatası', kod: 'sunucu' }, 500);
}

/** İstek gövdesini JSON olarak okur; çözümlenemezse 400 `gecersiz-govde`. */
export async function govdeOku<T>(req: Request): Promise<T> {
  try {
    return await req.json() as T;
  } catch {
    throw new HttpHatasi(400, 'gecersiz-govde');
  }
}
