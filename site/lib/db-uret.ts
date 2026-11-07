/**
 * db.json üretimi (Faz 5'in çekirdeği, saf). Girdi: kayıtların ham oy sayımları (+ varsa kilit anındaki sonuç).
 * Çıktı yayınlanmadan önce İKİ doğrulamadan geçer, biri bile başarısızsa HATA fırlatılır (dosya üretilmez):
 *   1. Katı doğrulama (taxonomy.kayitDogrula): bilinmeyen kimlik, çelişki, boş kayıt = hata.
 *   2. Eklentinin kendi yükleyicisi (dbKur): atlanan veya yok sayılan kayıt olmamalı.
 */
import { taksonomi, dbKur, DB_SEMA, type KayitSonucu } from './ortak.ts';
import { sonucHesapla, sonucBosMu, type Sayim } from './oy-hesabi.ts';

export interface KanalGirdi { tur: 'kanal'; id: string; handle?: string | null; ad?: string | null; avatar?: string | null }
export interface VideoGirdi { tur: 'video'; id: string }
export type HedefGirdi = (KanalGirdi | VideoGirdi) & {
  konular: Record<string, Sayim>;
  etiketler: Record<string, Sayim>;
  /** Kayıt kilitliyse kilit anındaki sonuç. Varsa güncel oylar YOK SAYILIR. */
  kilitliSonuc?: KayitSonucu | null;
};

export interface UretimGirdisi {
  kayitlar: HedefGirdi[];
  veriSurumu: number;
  /** Bir önceki yayınlanan sürüm. veriSurumu bundan büyük olmalıdır. */
  oncekiSurum?: number;
  /** YYYY-MM-DD (yalnızca metadata) */
  olusturma?: string;
}

export interface UretimSonucu {
  json: Record<string, unknown>;
  ozet: { kanal: number; video: number; yazilmayan: number };
}

export function dbUret(g: UretimGirdisi): UretimSonucu {
  if (!Number.isInteger(g.veriSurumu) || g.veriSurumu < 1) throw new Error('veriSurumu pozitif tam sayı olmalı.');
  if (g.oncekiSurum !== undefined && g.veriSurumu <= g.oncekiSurum) {
    throw new Error(`veriSurumu (${g.veriSurumu}) önceki sürümden (${g.oncekiSurum}) büyük olmalı.`);
  }
  const konuSirasi = taksonomi.KONULAR.map(k => k.id);
  const etiketSirasi = taksonomi.ETIKETLER.map(e => e.id);

  const kanallar: Record<string, unknown>[] = [];
  const videolar: Record<string, unknown>[] = [];
  const goruldu = new Set<string>();
  let yazilmayan = 0;

  for (const k of g.kayitlar) {
    const anahtar = `${k.tur}:${k.id}`;
    if (goruldu.has(anahtar)) throw new Error(`Aynı kayıt iki kez verildi: ${anahtar}`);
    goruldu.add(anahtar);

    const sonuc = k.kilitliSonuc ?? sonucHesapla(k.konular, k.etiketler, konuSirasi, etiketSirasi);
    if (sonucBosMu(sonuc)) { yazilmayan++; continue; }

    const hatalar = taksonomi.kayitDogrula(sonuc);
    if (hatalar.length) throw new Error(`${anahtar}: ${hatalar[0]}`);

    const kayit: Record<string, unknown> = { id: k.id };
    if (k.tur === 'kanal') {
      if (k.handle) kayit.handle = k.handle;
      if (k.ad) kayit.ad = k.ad;
      kayit.avatar = k.avatar ?? null;
    }
    Object.assign(kayit, {
      anaKonu: sonuc.anaKonu, yanKonular: sonuc.yanKonular, etiketler: sonuc.etiketler,
      kararsizKonular: sonuc.kararsizKonular, kararsizEtiketler: sonuc.kararsizEtiketler,
    });
    if (!kayit.anaKonu) delete kayit.anaKonu;
    (k.tur === 'kanal' ? kanallar : videolar).push(kayit);
  }

  // Sıra deterministik olsun: aynı girdi her zaman aynı dosya.
  const idSirala = (a: any, b: any) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  kanallar.sort(idSirala); videolar.sort(idSirala);

  const json: Record<string, unknown> = { sema: DB_SEMA, veriSurumu: g.veriSurumu };
  if (g.olusturma) json.olusturma = g.olusturma;
  json.kanallar = kanallar;
  json.videolar = videolar;

  // Eklentinin kendi yükleyicisi: tek bir atlanan veya yok sayılan kayıt bile yayını durdurur.
  const yukle = dbKur(JSON.parse(JSON.stringify(json)));
  if (yukle.sayac.atlanan || yukle.sayac.yokSayilan) {
    throw new Error(`Eklenti doğrulayıcısı reddetti: ${[...yukle.hatalar, ...yukle.uyarilar].slice(0, 3).join(' | ')}`);
  }
  if (yukle.sayac.kanal !== kanallar.length || yukle.sayac.video !== videolar.length) {
    throw new Error('Eklenti doğrulayıcısı kayıt sayısını tutturamadı.');
  }
  return { json, ozet: { kanal: kanallar.length, video: videolar.length, yazilmayan } };
}
