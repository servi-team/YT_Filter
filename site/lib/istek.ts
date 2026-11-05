/**
 * Kamusal API'lerin ortak istek yardımcıları: aynı origin kontrolü, IP özeti,
 * JSON yanıtı, hata yanıtı ve gövde okuma.
 */
import { createHmac } from 'node:crypto';
import { HttpHatasi } from './hata.ts';

/** Gövde üst sınırı: 64 KiB. Daha büyük istekler 413 ile reddedilir. */
export const AZAMI_GOVDE_BAYT = 64 * 1024;

/**
 * Pozitif güvenli tam sayı ortam değeri okur. Boş, sayı olmayan, sıfır,
 * negatif, ondalık veya güvenli aralık dışı değerlerde varsayılana döner ve
 * uyarı üretir; böylece hatalı env yapılandırması limitleri devre dışı bırakamaz.
 */
export function sinirDegeri(
  ad: string,
  varsayilan: number,
  uyar: (mesaj: string) => void = (mesaj) => console.warn(mesaj),
): number {
  const ham = process.env[ad];
  if (ham === undefined) return varsayilan;

  const temiz = ham.trim();
  const sayi = /^[1-9][0-9]*$/.test(temiz) ? Number(temiz) : NaN;
  if (!Number.isSafeInteger(sayi)) {
    uyar(`Geçersiz ${ad} değeri (${JSON.stringify(ham)}); varsayılan ${varsayilan} kullanılıyor.`);
    return varsayilan;
  }
  return sayi;
}

/** Kamusal oy hız limitleri (env ile ezilebilir). */
export const OY_LIMITI_DAKIKA = sinirDegeri('OY_LIMITI_DAKIKA', 120);
export const OY_LIMITI_GUN = sinirDegeri('OY_LIMITI_GUN', 2000);
export const TALEP_LIMITI_SAAT = sinirDegeri('TALEP_LIMITI_SAAT', 5);
export const GIRIS_LIMITI_15DK = sinirDegeri('GIRIS_LIMITI_15DK', 10);
export const PANEL_YAZMA_LIMITI_DAKIKA = sinirDegeri('PANEL_YAZMA_LIMITI_DAKIKA', 120);

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

/**
 * İstek gövdesini en fazla 64 KiB okuyup JSON olarak çözer. Sınır aşılırsa
 * 413 `govde-buyuk`, gövde çözümlenemezse 400 `gecersiz-govde` fırlatır.
 */
export async function govdeOku<T>(req: Request): Promise<T> {
  const bildirilen = req.headers.get('content-length');
  if (bildirilen) {
    const uzunluk = Number(bildirilen);
    if (Number.isFinite(uzunluk) && uzunluk > AZAMI_GOVDE_BAYT) {
      throw new HttpHatasi(413, 'govde-buyuk');
    }
  }

  if (!req.body) throw new HttpHatasi(400, 'gecersiz-govde');

  const okuyucu = req.body.getReader();
  const parcalar: Uint8Array[] = [];
  let toplam = 0;
  try {
    for (;;) {
      const { done, value } = await okuyucu.read();
      if (done) break;
      toplam += value.byteLength;
      if (toplam > AZAMI_GOVDE_BAYT) {
        await okuyucu.cancel().catch(() => undefined);
        throw new HttpHatasi(413, 'govde-buyuk');
      }
      parcalar.push(value);
    }
  } finally {
    okuyucu.releaseLock();
  }

  try {
    return JSON.parse(Buffer.concat(parcalar).toString('utf8')) as T;
  } catch {
    throw new HttpHatasi(400, 'gecersiz-govde');
  }
}
