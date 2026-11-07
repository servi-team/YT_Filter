/**
 * Anonim ziyaretçi kimliği. Hesap yoktur; tarayıcıya HttpOnly, sunucu
 * tarafından imzalanmış bir çerez bırakılır. Ham kimlik hiçbir zaman
 * günlüğe/etikete yazılmaz; imza yalnızca kimliğin sunucu tarafından
 * üretildiğini doğrular, çerez silinmesini engellemez.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const ZIYARETCI_CEREZI = 'ytf_ziyaretci';
export const ZIYARETCI_CEREZ_SURESI = 60 * 60 * 24 * 365;

const ZIYARETCI_ID_DESENI = /^[A-Za-z0-9_-]{43}$/;
const ZIYARETCI_IMZA_DESENI = /^[A-Za-z0-9_-]{43}$/;
const ZIYARETCI_IMZA_BAGLAMI = 'ytf-ziyaretci-v1\0';
const GELISTIRME_ANAHTARI = 'ytf-gelistirme-ziyaretci-anahtari';

/**
 * İmza anahtarı `IP_HASH_SECRET` ile paylaşılır. Üretimde anahtar yoksa
 * okuma yolu kimliği yok sayar, yazma yolu açık hata verir; böylece imzasız
 * çerez kabul edilmez. Geliştirmede sabit bir anahtar kullanılır.
 */
function imzaAnahtari(): string | null {
  const anahtar = process.env.IP_HASH_SECRET;
  if (anahtar) return anahtar;
  if (process.env.NODE_ENV === 'production') return null;
  return GELISTIRME_ANAHTARI;
}

function imza(kimlik: string): string | null {
  const anahtar = imzaAnahtari();
  if (!anahtar) return null;
  return createHmac('sha256', anahtar)
    .update(ZIYARETCI_IMZA_BAGLAMI)
    .update(kimlik)
    .digest('base64url');
}

/** Sunucu tarafından üretilmiş imzalı çerez değerini çözer; geçersizse `null`. */
export function ziyaretciKimligiCoz(ham: string | null): string | null {
  if (!ham) return null;

  let deger: string;
  try {
    deger = decodeURIComponent(ham);
  } catch {
    return null;
  }

  const ayrac = deger.lastIndexOf('.');
  if (ayrac < 0) return null;

  const kimlik = deger.slice(0, ayrac);
  const gelenImza = deger.slice(ayrac + 1);
  if (!ZIYARETCI_ID_DESENI.test(kimlik) || !ZIYARETCI_IMZA_DESENI.test(gelenImza)) return null;

  const beklenenImza = imza(kimlik);
  if (!beklenenImza) return null;

  const beklenen = Buffer.from(beklenenImza, 'base64url');
  const gelen = Buffer.from(gelenImza, 'base64url');
  if (beklenen.length !== gelen.length || !timingSafeEqual(beklenen, gelen)) return null;
  return kimlik;
}

/** İstekteki `ytf_ziyaretci` çerezini çözer; yoksa veya imza geçersizse `null`. */
export function ziyaretciKimligi(req: Request): string | null {
  const cerezler = req.headers.get('cookie');
  if (!cerezler) return null;

  for (const parca of cerezler.split(';')) {
    const ayrac = parca.indexOf('=');
    if (ayrac < 0) continue;
    const ad = parca.slice(0, ayrac).trim();
    if (ad !== ZIYARETCI_CEREZI) continue;
    return ziyaretciKimligiCoz(parca.slice(ayrac + 1).trim());
  }
  return null;
}

/** 32 rastgele baytın base64url karşılığı (43 karakter). */
export function yeniZiyaretciKimligi(): string {
  return randomBytes(32).toString('base64url');
}

/** Set-Cookie değeri. `guvenli` yalnızca HTTPS ortamında true olmalıdır. */
export function ziyaretciCerezi(kimlik: string, guvenli: boolean): string {
  const imzaDegeri = imza(kimlik);
  // Anahtar yoksa eksik imzalı çerez yazmak yerine açıkça dur.
  if (!imzaDegeri) throw new Error('IP_HASH_SECRET ziyaretçi çerezi imzası için zorunlu.');
  const imzali = `${kimlik}.${imzaDegeri}`;
  const parcalar = [
    `${ZIYARETCI_CEREZI}=${encodeURIComponent(imzali)}`,
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${ZIYARETCI_CEREZ_SURESI}`,
    'Path=/',
  ];
  if (guvenli) parcalar.push('Secure');
  return parcalar.join('; ');
}

/** Günlük/moderasyon kayıtlarında ham kimlik yerine kullanılan takma etiket. */
export function kimlikEtiketi(tur: 'cerez' | 'ağ', deger: string): string {
  const ozet = createHash('sha256').update(deger).digest('hex').slice(0, 8);
  return `${tur === 'cerez' ? 'çerez' : 'ağ'}:${ozet}`;
}
