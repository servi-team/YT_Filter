/**
 * Sunucu tarafı yetki kontrolleri. `kullaniciGerekli` istek çerezinden oturumu
 * çözer; `rolGerekli` rolü doğrular; `panelKoruma` ayrıca hesap başına panel
 * yazma hız sınırını uygular.
 */
import { HttpHatasi } from './hata.ts';
import { limitAsildiMi } from './hiz-limiti.ts';
import { PANEL_YAZMA_LIMITI_DAKIKA } from './istek.ts';
import { OTURUM_CEREZI, oturumOku, type OturumKullanicisi } from './oturum.ts';
import type { Db } from './oy-deposu.ts';

export type Rol = 'editor' | 'admin';

/** İstek başlıklarındaki `ytf_oturum` değerini çözer; yoksa `null`. */
function cerezTokeni(req: Request): string | null {
  const cerezler = req.headers.get('cookie');
  if (!cerezler) return null;

  for (const parca of cerezler.split(';')) {
    const ayrac = parca.indexOf('=');
    if (ayrac < 0) continue;
    const ad = parca.slice(0, ayrac).trim();
    if (ad !== OTURUM_CEREZI) continue;
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

/** Geçerli oturum yoksa 401 fırlatır. */
export async function kullaniciGerekli(db: Db, req: Request): Promise<OturumKullanicisi> {
  const token = cerezTokeni(req);
  if (!token) throw new HttpHatasi(401, 'oturum-yok', 'Oturum gerekli.');

  const kullanici = await oturumOku(db, token);
  if (!kullanici) throw new HttpHatasi(401, 'oturum-yok', 'Oturum gerekli.');
  return kullanici;
}

/** Oturum yoksa 401, rol listede değilse 403 fırlatır. */
export async function rolGerekli(db: Db, req: Request, roller: readonly Rol[]): Promise<OturumKullanicisi> {
  const kullanici = await kullaniciGerekli(db, req);
  if (!roller.includes(kullanici.rol)) {
    throw new HttpHatasi(403, 'yetki-yok', 'Bu işlem için yetkiniz yok.');
  }
  return kullanici;
}

/**
 * Panel yazma koruması: oturum + rol + hesap başına dakikalık yazma sınırı.
 * Varsayılan sınır `PANEL_YAZMA_LIMITI_DAKIKA` (120/dk).
 */
export async function panelKoruma(
  db: Db,
  req: Request,
  roller: readonly Rol[],
  secenek: { adet?: number; simdi?: Date } = {},
): Promise<OturumKullanicisi> {
  const kullanici = await rolGerekli(db, req, roller);

  const asildi = await limitAsildiMi(db, {
    anahtar: 'panel:' + kullanici.id,
    adet: secenek.adet ?? PANEL_YAZMA_LIMITI_DAKIKA,
    pencereSaniye: 60,
  }, secenek.simdi);

  if (asildi) {
    throw new HttpHatasi(429, 'hiz-limiti', 'Çok fazla işlem; biraz bekleyin.');
  }
  return kullanici;
}
