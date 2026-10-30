/**
 * İçerik okuma deposu: kamusal listeler, arama ve detay sayfası için kanal/video
 * satırlarını, oy sayımlarını ve aktif kilitleri okur. Bu modül yazma yapmaz.
 *
 * Liste sorgusu önce tüm kanal/video başlıklarını çeker (arama Türkçe katlamayla
 * bellekte yapılır), sonra yalnızca sayfadaki kayıtların oylarını ve kilitlerini
 * topluca getirir. Böylece sayfa başına kayıt sayısı kadar sorgu açılmaz.
 */
import { and, desc, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { kanallar, kilitler, oylar, videolar, yayinSurumleri } from '../db/schema.ts';
import type { Veritabani } from './db.ts';
import { taksonomi, type KayitSonucu } from './ortak.ts';
import { bosSayim, sonucHesapla, toplamOy, type Sayim } from './oy-hesabi.ts';
import type { HedefTuru, IcerikDurumu, Sayimlar } from './tipler.ts';
import type { LinkSonucu } from './youtube-link.ts';

type KanalSatiri = typeof kanallar.$inferSelect;
type VideoSatiri = typeof videolar.$inferSelect;
type KilitBilgisi = Pick<typeof kilitler.$inferSelect, 'sonuc' | 'gerekce' | 'kilitZamani'>;

export interface IcerikBasligi {
  tur: HedefTuru;
  id: string;
  baslik: string;
  kanalId: string | null;
  kanalAdi: string | null;
  kanalHandle: string | null;
  avatar: string | null;
  olusturma: Date;
  arsivlendi: boolean;
}

export interface IcerikListeOgesi extends IcerikBasligi {
  sonuc: KayitSonucu;
  kilitli: boolean;
  oySayisi: number;
}

export interface IcerikDetay {
  icerik: IcerikBasligi;
  sayimlar: Sayimlar;
  sonuc: KayitSonucu;
  kilitliSonuc: KayitSonucu | null;
  kilit: { gerekce: string; kilitZamani: Date } | null;
}

export interface IcerikListeGirdisi {
  arama?: string;
  tur?: HedefTuru;
  sayfa?: number;
  sayfaBoyu?: number;
  durum?: IcerikDurumu;
}

export interface IcerikListeSonucu {
  kayitlar: IcerikListeOgesi[];
  toplam: number;
  sayfa: number;
  sayfaBoyu: number;
}

const KONU_SIRASI = taksonomi.KONULAR.map((konu) => konu.id);
const ETIKET_SIRASI = taksonomi.ETIKETLER.map((etiket) => etiket.id);

/**
 * Arama anahtarı: Türkçe küçük harfe indirir, aksanları sadeleştirir ve
 * birleşik nokta (combining dot) kalıntılarını temizler.
 * 'İNCİ ŞÖLEN' -> 'inci solen', 'ığdır' -> 'igdir'.
 */
export function aramaAnahtari(metin: string): string {
  return metin
    .toLocaleLowerCase('tr-TR')
    .replace(/İ/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hedefAnahtari(tur: HedefTuru, id: string): string {
  return `${tur}:${id}`;
}

function bosSayimlar(): Sayimlar {
  return { konular: {}, etiketler: {} };
}

function kanalBasligi(satir: KanalSatiri): IcerikBasligi {
  return {
    tur: 'kanal',
    id: satir.id,
    baslik: satir.ad ?? `Kanal ${satir.id}`,
    kanalId: satir.id,
    kanalAdi: satir.ad,
    kanalHandle: satir.handle,
    avatar: satir.avatar,
    olusturma: satir.olusturma,
    arsivlendi: satir.arsivlendi,
  };
}

function videoBasligi(satir: VideoSatiri): IcerikBasligi {
  return {
    tur: 'video',
    id: satir.id,
    baslik: satir.baslik ?? `Video ${satir.id}`,
    kanalId: satir.kanalId,
    kanalAdi: satir.kanalAdi,
    kanalHandle: satir.kanalHandle,
    avatar: satir.kanalAvatar,
    olusturma: satir.olusturma,
    arsivlendi: satir.arsivlendi,
  };
}

function aramaMetni(kayit: IcerikBasligi): string {
  const alanlar = kayit.tur === 'kanal'
    ? [kayit.baslik, kayit.kanalHandle]
    : [kayit.baslik, kayit.kanalAdi, kayit.kanalHandle];
  return alanlar.filter((alan): alan is string => Boolean(alan)).join(' ');
}

function pozitifTamsayi(deger: number | undefined, varsayilan: number): number {
  if (deger === undefined || !Number.isFinite(deger)) return varsayilan;
  const sayi = Math.trunc(deger);
  return sayi >= 1 ? sayi : varsayilan;
}

function sayimToplami(sayimlar: Sayimlar): number {
  let toplam = 0;
  for (const sayim of Object.values(sayimlar.konular)) toplam += toplamOy(sayim);
  for (const sayim of Object.values(sayimlar.etiketler)) toplam += toplamOy(sayim);
  return toplam;
}

/** Sayfadaki kayıtların oylarını tür başına tek sorguda, iki geri alma bayrağı false iken getirir. */
async function topluSayimlar(db: Veritabani, turIdleri: Map<HedefTuru, string[]>): Promise<Map<string, Sayimlar>> {
  const harita = new Map<string, Sayimlar>();
  const kosullar: SQL[] = [];
  for (const [tur, idler] of turIdleri) {
    if (!idler.length) continue;
    const kosul = and(eq(oylar.hedefTuru, tur), inArray(oylar.hedefId, idler));
    if (kosul) kosullar.push(kosul);
  }
  if (!kosullar.length) return harita;

  const satirlar = await db.select({
    hedefTuru: oylar.hedefTuru,
    hedefId: oylar.hedefId,
    ogeTuru: oylar.ogeTuru,
    ogeId: oylar.ogeId,
    deger: oylar.deger,
    adet: sql<number>`count(*)::int`,
  }).from(oylar)
    .where(and(
      kosullar.length === 1 ? kosullar[0] : or(...kosullar),
      eq(oylar.moderasyonGeriAlindi, false),
      eq(oylar.ziyaretciGeriAlindi, false),
    ))
    .groupBy(oylar.hedefTuru, oylar.hedefId, oylar.ogeTuru, oylar.ogeId, oylar.deger);

  for (const satir of satirlar) {
    const anahtar = hedefAnahtari(satir.hedefTuru, satir.hedefId);
    let sayimlar = harita.get(anahtar);
    if (!sayimlar) {
      sayimlar = bosSayimlar();
      harita.set(anahtar, sayimlar);
    }
    const hedef = satir.ogeTuru === 'konu' ? sayimlar.konular : sayimlar.etiketler;
    (hedef[satir.ogeId] ??= bosSayim())[satir.deger] = Number(satir.adet);
  }
  return harita;
}

/** Sayfadaki kayıtların aktif kilitlerini tür başına tek sorguda getirir. */
async function topluKilitler(db: Veritabani, turIdleri: Map<HedefTuru, string[]>): Promise<Map<string, KilitBilgisi>> {
  const harita = new Map<string, KilitBilgisi>();
  const kosullar: SQL[] = [];
  for (const [tur, idler] of turIdleri) {
    if (!idler.length) continue;
    const kosul = and(eq(kilitler.hedefTuru, tur), inArray(kilitler.hedefId, idler));
    if (kosul) kosullar.push(kosul);
  }
  if (!kosullar.length) return harita;

  const satirlar = await db.select({
    hedefTuru: kilitler.hedefTuru,
    hedefId: kilitler.hedefId,
    sonuc: kilitler.sonuc,
    gerekce: kilitler.gerekce,
    kilitZamani: kilitler.kilitZamani,
  }).from(kilitler)
    .where(and(
      kosullar.length === 1 ? kosullar[0] : or(...kosullar),
      isNull(kilitler.acilisZamani),
    ));

  for (const satir of satirlar) {
    harita.set(hedefAnahtari(satir.hedefTuru, satir.hedefId), {
      sonuc: satir.sonuc,
      gerekce: satir.gerekce,
      kilitZamani: satir.kilitZamani,
    });
  }
  return harita;
}

async function sayfaOgeleri(db: Veritabani, kayitlar: IcerikBasligi[]): Promise<IcerikListeOgesi[]> {
  if (!kayitlar.length) return [];

  const turIdleri = new Map<HedefTuru, string[]>();
  for (const kayit of kayitlar) {
    const idler = turIdleri.get(kayit.tur);
    if (idler) idler.push(kayit.id);
    else turIdleri.set(kayit.tur, [kayit.id]);
  }

  const sayimlar = await topluSayimlar(db, turIdleri);
  const kilitler = await topluKilitler(db, turIdleri);

  return kayitlar.map((kayit) => {
    const anahtar = hedefAnahtari(kayit.tur, kayit.id);
    const sayim = sayimlar.get(anahtar) ?? bosSayimlar();
    const kilit = kilitler.get(anahtar);
    return {
      ...kayit,
      sonuc: kilit
        ? (kilit.sonuc as KayitSonucu)
        : sonucHesapla(sayim.konular, sayim.etiketler, KONU_SIRASI, ETIKET_SIRASI),
      kilitli: kilit !== undefined,
      oySayisi: sayimToplami(sayim),
    };
  });
}

/** Tüm kanal ve video başlıklarını (varsayılan olarak yalnızca aktifleri) döndürür. */
export async function tumKayitlar(db: Veritabani, durum: IcerikDurumu = 'aktif'): Promise<IcerikBasligi[]> {
  const arsivde = durum === 'arsiv';
  const kanalSatirlari = await db.select().from(kanallar).where(eq(kanallar.arsivlendi, arsivde));
  const videoSatirlari = await db.select().from(videolar).where(eq(videolar.arsivlendi, arsivde));

  const kayitlar = [
    ...kanalSatirlari.map((satir) => kanalBasligi(satir)),
    ...videoSatirlari.map((satir) => videoBasligi(satir)),
  ];
  kayitlar.sort((a, b) =>
    b.olusturma.getTime() - a.olusturma.getTime() ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return kayitlar;
}

/** Aranan metni Türkçe katlamayla kanal/video başlığında arar; sayfalar. */
export async function icerikListele(db: Veritabani, girdi: IcerikListeGirdisi = {}): Promise<IcerikListeSonucu> {
  const durum = girdi.durum ?? 'aktif';
  const sayfa = pozitifTamsayi(girdi.sayfa, 1);
  const sayfaBoyu = pozitifTamsayi(girdi.sayfaBoyu, 12);

  let kayitlar = await tumKayitlar(db, durum);
  if (girdi.tur) kayitlar = kayitlar.filter((kayit) => kayit.tur === girdi.tur);

  const arama = girdi.arama?.trim();
  if (arama) {
    const anahtar = aramaAnahtari(arama);
    if (anahtar) {
      kayitlar = kayitlar.filter((kayit) => aramaAnahtari(aramaMetni(kayit)).includes(anahtar));
    }
  }

  const toplam = kayitlar.length;
  const baslangic = (sayfa - 1) * sayfaBoyu;
  const dilim = kayitlar.slice(baslangic, baslangic + sayfaBoyu);
  return {
    kayitlar: await sayfaOgeleri(db, dilim),
    toplam,
    sayfa,
    sayfaBoyu,
  };
}

async function icerikSatiriGetir(db: Veritabani, tur: HedefTuru, id: string): Promise<IcerikBasligi | null> {
  if (tur === 'kanal') {
    const [satir] = await db.select().from(kanallar).where(eq(kanallar.id, id));
    return satir ? kanalBasligi(satir) : null;
  }
  const [satir] = await db.select().from(videolar).where(eq(videolar.id, id));
  return satir ? videoBasligi(satir) : null;
}

/** Tek hedefin konu/etiket sayımları; geri alınmış oylar hesaba girmez. */
async function tekHedefSayimlari(db: Veritabani, tur: HedefTuru, id: string): Promise<Sayimlar> {
  const satirlar = await db.select({
    ogeTuru: oylar.ogeTuru,
    ogeId: oylar.ogeId,
    deger: oylar.deger,
    adet: sql<number>`count(*)::int`,
  }).from(oylar)
    .where(and(
      eq(oylar.hedefTuru, tur),
      eq(oylar.hedefId, id),
      eq(oylar.moderasyonGeriAlindi, false),
      eq(oylar.ziyaretciGeriAlindi, false),
    ))
    .groupBy(oylar.ogeTuru, oylar.ogeId, oylar.deger);

  const sayimlar = bosSayimlar();
  for (const satir of satirlar) {
    const hedef = satir.ogeTuru === 'konu' ? sayimlar.konular : sayimlar.etiketler;
    (hedef[satir.ogeId] ??= bosSayim())[satir.deger] = Number(satir.adet);
  }
  return sayimlar;
}

/** Tek hedefin açık kilidi (varsa). */
async function tekAktifKilit(db: Veritabani, tur: HedefTuru, id: string): Promise<KilitBilgisi | null> {
  const [kilit] = await db.select({
    sonuc: kilitler.sonuc,
    gerekce: kilitler.gerekce,
    kilitZamani: kilitler.kilitZamani,
  }).from(kilitler)
    .where(and(
      eq(kilitler.hedefTuru, tur),
      eq(kilitler.hedefId, id),
      isNull(kilitler.acilisZamani),
    ));
  return kilit ?? null;
}

/**
 * Tek içerik detayı. Varsayılan olarak yalnızca aktif kaydı döndürür; arşivli
 * kayıt için `{ durum: 'arsiv' }` gerekir. Kilit varsa sonuç kilit anındaki
 * donmuş sonuçtur; `kilitliSonuc` da aynı değeri taşır.
 */
export async function icerikGetir(
  db: Veritabani,
  tur: HedefTuru,
  id: string,
  secenek: { durum?: IcerikDurumu } = {},
): Promise<IcerikDetay | null> {
  const icerik = await icerikSatiriGetir(db, tur, id);
  if (!icerik) return null;

  const durum = secenek.durum ?? 'aktif';
  if (durum === 'arsiv' ? !icerik.arsivlendi : icerik.arsivlendi) return null;

  const sayimlar = await tekHedefSayimlari(db, tur, id);
  const kilit = await tekAktifKilit(db, tur, id);
  const hesaplanan = sonucHesapla(sayimlar.konular, sayimlar.etiketler, KONU_SIRASI, ETIKET_SIRASI);
  const kilitliSonuc = kilit ? (kilit.sonuc as KayitSonucu) : null;

  return {
    icerik,
    sayimlar,
    sonuc: kilitliSonuc ?? hesaplanan,
    kilitliSonuc,
    kilit: kilit ? { gerekce: kilit.gerekce, kilitZamani: kilit.kilitZamani } : null,
  };
}

/** Ana sayfa için son aktif kayıtlar (varsayılan 6). */
export async function sonIcerikler(db: Veritabani, adet = 6): Promise<IcerikListeOgesi[]> {
  const sayi = Number.isFinite(adet) ? Math.max(0, Math.trunc(adet)) : 6;
  if (sayi === 0) return [];
  const { kayitlar } = await icerikListele(db, { sayfa: 1, sayfaBoyu: sayi });
  return kayitlar;
}

/** Site geneli sayaçlar ve son yayın sürümü; yayın yoksa sürüm alanları null. */
export async function siteIstatistikleri(db: Veritabani): Promise<{
  kayit: number;
  oy: number;
  yayinSurumu: number | null;
  sonYayin: Date | null;
}> {
  const [kanalSayisi] = await db.select({ sayi: sql<number>`count(*)::int` }).from(kanallar)
    .where(eq(kanallar.arsivlendi, false));
  const [videoSayisi] = await db.select({ sayi: sql<number>`count(*)::int` }).from(videolar)
    .where(eq(videolar.arsivlendi, false));
  const [oySayisi] = await db.select({ sayi: sql<number>`count(*)::int` }).from(oylar)
    .where(and(
      eq(oylar.moderasyonGeriAlindi, false),
      eq(oylar.ziyaretciGeriAlindi, false),
    ));
  const [sonYayin] = await db.select({
    veriSurumu: yayinSurumleri.veriSurumu,
    olusturma: yayinSurumleri.olusturma,
  }).from(yayinSurumleri)
    .orderBy(desc(yayinSurumleri.veriSurumu))
    .limit(1);

  return {
    kayit: Number(kanalSayisi?.sayi ?? 0) + Number(videoSayisi?.sayi ?? 0),
    oy: Number(oySayisi?.sayi ?? 0),
    yayinSurumu: sonYayin?.veriSurumu ?? null,
    sonYayin: sonYayin?.olusturma ?? null,
  };
}

/**
 * Çözülmüş bir YouTube linkinin kayıtlı karşılığını bulur. Video kimliği
 * `videolar`, UC kimliği `kanallar`, @handle ise büyük/küçük harf duyarsız
 * `kanallar.handle` üzerinden aranır. Arşivli kayıt da döner; çağıran taraf
 * `arsivli` alanına bakarak karar verir.
 */
export async function linkIleKayitBul(
  db: Veritabani,
  link: Exclude<LinkSonucu, { tur: 'hata' }>,
): Promise<{ kayit: IcerikBasligi; arsivli: boolean } | null> {
  if (link.tur === 'video') {
    const [satir] = await db.select().from(videolar).where(eq(videolar.id, link.id));
    return satir ? { kayit: videoBasligi(satir), arsivli: satir.arsivlendi } : null;
  }

  if ('handle' in link) {
    const [satir] = await db.select().from(kanallar)
      .where(sql`lower(${kanallar.handle}) = ${link.handle.toLowerCase()}`);
    return satir ? { kayit: kanalBasligi(satir), arsivli: satir.arsivlendi } : null;
  }

  const [satir] = await db.select().from(kanallar).where(eq(kanallar.id, link.id));
  return satir ? { kayit: kanalBasligi(satir), arsivli: satir.arsivlendi } : null;
}

/** Video kapağı adresi (YouTube'un hqdefault görseli). */
export function videoKapak(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
