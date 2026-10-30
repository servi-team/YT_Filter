/**
 * Editör/admin oturumları. Ham token yalnızca çerezde ve yanıtta yaşar;
 * veritabanında SHA-256 özeti tutulur. Oturum 7 gün kayan, 30 gün mutlak
 * pencerelidir; pasif hesap sonraki istekte düşer.
 */
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, ne, sql } from 'drizzle-orm';
import { hesaplar, oturumlar } from '../db/schema.ts';
import { HttpHatasi } from './hata.ts';
import { parolaDogrula, parolaGecerliMi, parolaOzetle } from './parola.ts';
import type { Db } from './oy-deposu.ts';

export const OTURUM_CEREZI = 'ytf_oturum';

const GUN_MS = 24 * 60 * 60 * 1000;
const KAYAN_PENCERE_MS = 7 * GUN_MS;
const MUTLAK_PENCERE_MS = 30 * GUN_MS;
const SON_GORULME_ESIK_MS = 5 * 60 * 1000;

export interface OturumKullanicisi {
  id: string;
  eposta: string;
  rol: 'editor' | 'admin';
  parolaDegistirmeli: boolean;
}

export interface GirisGirdisi {
  eposta: string;
  parola: string;
  ipOzeti: string | null;
  simdi?: Date;
}

export interface GirisSonucu {
  token: string;
  sonKullanma: Date;
  kullanici: OturumKullanicisi;
}

/** E-posta normalizasyonu: tüm kayıt/giriş yolları bu biçimi kullanır. */
export function epostaNormalize(eposta: string): string {
  return eposta.trim().toLocaleLowerCase('tr-TR');
}

function tokenOzeti(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function yeniToken(): string {
  return randomBytes(32).toString('base64url');
}

function enErken(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

function kullaniciyaCevir(satir: {
  id: string;
  eposta: string;
  rol: 'editor' | 'admin';
  parolaDegistirmeli: boolean;
}): OturumKullanicisi {
  return {
    id: satir.id,
    eposta: satir.eposta,
    rol: satir.rol,
    parolaDegistirmeli: satir.parolaDegistirmeli,
  };
}

function girisHatasi(): HttpHatasi {
  return new HttpHatasi(401, 'giris-hatali', 'E-posta veya parola hatalı.');
}

/** E-posta+parola ile giriş yapar; başarısızlıkta hesabın varlığını sızdırmaz. */
export async function girisYap(db: Db, girdi: GirisGirdisi): Promise<GirisSonucu> {
  const simdi = girdi.simdi ?? new Date();
  const eposta = epostaNormalize(girdi.eposta);

  const [hesap] = await db.select().from(hesaplar)
    .where(sql`lower(${hesaplar.eposta}) = ${eposta}`)
    .limit(1);

  if (!hesap || !hesap.aktif) throw girisHatasi();
  if (!(await parolaDogrula(girdi.parola, hesap.parolaOzeti))) throw girisHatasi();

  const token = yeniToken();
  const sonKullanma = enErken(
    new Date(simdi.getTime() + KAYAN_PENCERE_MS),
    new Date(simdi.getTime() + MUTLAK_PENCERE_MS),
  );

  await db.transaction(async (tx) => {
    await tx.update(hesaplar).set({ sonGiris: simdi }).where(eq(hesaplar.id, hesap.id));
    await tx.insert(oturumlar).values({
      tokenOzeti: tokenOzeti(token),
      hesapId: hesap.id,
      olusturma: simdi,
      sonKullanma,
      sonGorulme: simdi,
      ipOzeti: girdi.ipOzeti,
    });
  });

  return {
    token,
    sonKullanma,
    kullanici: kullaniciyaCevir(hesap),
  };
}

/** Token'ı okur; süresi dolmuş, iptal edilmiş veya pasif hesap için `null`. */
export async function oturumOku(db: Db, token: string, simdi: Date = new Date()): Promise<OturumKullanicisi | null> {
  if (!token) return null;

  const [satir] = await db.select({
    oturumId: oturumlar.id,
    olusturma: oturumlar.olusturma,
    sonKullanma: oturumlar.sonKullanma,
    sonGorulme: oturumlar.sonGorulme,
    id: hesaplar.id,
    eposta: hesaplar.eposta,
    rol: hesaplar.rol,
    aktif: hesaplar.aktif,
    parolaDegistirmeli: hesaplar.parolaDegistirmeli,
  }).from(oturumlar)
    .innerJoin(hesaplar, eq(oturumlar.hesapId, hesaplar.id))
    .where(eq(oturumlar.tokenOzeti, tokenOzeti(token)))
    .limit(1);

  if (!satir) return null;
  if (satir.sonKullanma.getTime() <= simdi.getTime()) return null;
  if (!satir.aktif) return null;

  if (simdi.getTime() - satir.sonGorulme.getTime() > SON_GORULME_ESIK_MS) {
    const yeniSonKullanma = enErken(
      new Date(simdi.getTime() + KAYAN_PENCERE_MS),
      new Date(satir.olusturma.getTime() + MUTLAK_PENCERE_MS),
    );
    await db.update(oturumlar).set({
      sonGorulme: simdi,
      sonKullanma: yeniSonKullanma,
    }).where(eq(oturumlar.id, satir.oturumId));
  }

  return kullaniciyaCevir(satir);
}

/** Token'ın oturum satırını siler; token yoksa sessizce döner. */
export async function oturumKapat(db: Db, token: string): Promise<void> {
  if (!token) return;
  await db.delete(oturumlar).where(eq(oturumlar.tokenOzeti, tokenOzeti(token)));
}

/** Hesabın tüm oturumlarını siler; `haricToken` verilirse onun özeti korunur. */
export async function hesapOturumlariniIptalEt(db: Db, hesapId: string, haricToken?: string): Promise<void> {
  const kosul = haricToken
    ? and(eq(oturumlar.hesapId, hesapId), ne(oturumlar.tokenOzeti, tokenOzeti(haricToken)))
    : eq(oturumlar.hesapId, hesapId);
  await db.delete(oturumlar).where(kosul);
}

/**
 * Parola değiştirir; mevcut parola doğrulanır, yeni parola en az 12 karakter
 * olmalıdır. Başarıda hesabın diğer oturumları iptal edilir.
 */
export async function parolaDegistir(db: Db, girdi: {
  hesapId: string;
  mevcutParola: string;
  yeniParola: string;
  token: string;
  simdi?: Date;
}): Promise<void> {
  const [hesap] = await db.select().from(hesaplar).where(eq(hesaplar.id, girdi.hesapId)).limit(1);
  if (!hesap) throw new HttpHatasi(401, 'oturum-yok', 'Oturum gerekli.');

  if (!(await parolaDogrula(girdi.mevcutParola, hesap.parolaOzeti))) {
    throw new HttpHatasi(401, 'parola-hatali', 'Mevcut parola hatalı.');
  }
  if (!parolaGecerliMi(girdi.yeniParola)) {
    throw new HttpHatasi(400, 'parola-zayif', 'Parola en az 12 karakter olmalı.');
  }

  const yeniOzet = await parolaOzetle(girdi.yeniParola);
  await db.transaction(async (tx) => {
    await tx.update(hesaplar).set({
      parolaOzeti: yeniOzet,
      parolaDegistirmeli: false,
    }).where(eq(hesaplar.id, girdi.hesapId));
    await hesapOturumlariniIptalEt(tx as unknown as Db, girdi.hesapId, girdi.token);
  });
}

/** `ytf_oturum` çerezinin Set-Cookie değeri. Üretimde Secure eklenir. */
export function oturumCerezi(token: string, sonKullanma: Date): string {
  const kalanSaniye = Math.max(0, Math.floor((sonKullanma.getTime() - Date.now()) / 1000));
  const parcalar = [
    `${OTURUM_CEREZI}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${kalanSaniye}`,
    `Expires=${sonKullanma.toUTCString()}`,
  ];
  if (process.env.NODE_ENV === 'production') parcalar.push('Secure');
  return parcalar.join('; ');
}
