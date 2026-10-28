/**
 * Anonim ziyaretçi kimliği. Hesap yoktur; tarayıcıya HttpOnly bir çerez
 * bırakılır. Ham kimlik hiçbir zaman günlüğe/etikete yazılmaz.
 */
import { createHash, randomBytes } from 'node:crypto';

export const ZIYARETCI_CEREZI = 'ytf_ziyaretci';
export const ZIYARETCI_CEREZ_SURESI = 60 * 60 * 24 * 365;

/** İstekteki `ytf_ziyaretci` çerezini çözer; yoksa `null`. */
export function ziyaretciKimligi(req: Request): string | null {
  const cerezler = req.headers.get('cookie');
  if (!cerezler) return null;

  for (const parca of cerezler.split(';')) {
    const ayrac = parca.indexOf('=');
    if (ayrac < 0) continue;
    const ad = parca.slice(0, ayrac).trim();
    if (ad !== ZIYARETCI_CEREZI) continue;
    const deger = parca.slice(ayrac + 1).trim();
    if (!deger) return null;
    try {
      return decodeURIComponent(deger);
    } catch {
      return deger;
    }
  }
  return null;
}

/** 32 rastgele baytın base64url karşılığı (43 karakter). */
export function yeniZiyaretciKimligi(): string {
  return randomBytes(32).toString('base64url');
}

/** Set-Cookie değeri. `guvenli` yalnızca HTTPS ortamında true olmalıdır. */
export function ziyaretciCerezi(kimlik: string, guvenli: boolean): string {
  const parcalar = [
    `${ZIYARETCI_CEREZI}=${encodeURIComponent(kimlik)}`,
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
