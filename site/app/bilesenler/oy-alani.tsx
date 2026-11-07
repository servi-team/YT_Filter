'use client';

import { useState } from 'react';
import { sonucHesapla, type OyDegeri, type Sayim } from '../../lib/oy-hesabi.ts';
import type { KayitSonucu } from '../../lib/ortak.ts';
import type { HedefTuru, OgeTuru, Sayimlar } from '../../lib/tipler.ts';
import { Bildirim } from './bildirim.tsx';
import { OyTablosu, type BenimOy, type OySatiri } from './oy-tablosu.tsx';
import { SonucPaneli } from './sonuc-paneli.tsx';
import s from './oy-alani.module.css';

export interface OyAlaniProps {
  hedef: { tur: HedefTuru; id: string };
  baslangicSayimlar: Sayimlar;
  baslangicSonuc: KayitSonucu;
  kilitliSonuc: KayitSonucu | null;
  benimOylarim: BenimOy[];
  konular: OySatiri[];
  etiketler: OySatiri[];
}

interface OyCevabi {
  sayimlar?: Sayimlar;
  sonuc?: KayitSonucu;
  kilitliSonuc?: KayitSonucu | null;
  hata?: string;
  kod?: string;
}

interface OncekiDurum {
  sayimlar: Sayimlar;
  sonuc: KayitSonucu;
  kilitliSonuc: KayitSonucu | null;
  benim: BenimOy[];
}

function kopyala(sayimlar: Sayimlar): Sayimlar {
  const kopya: Sayimlar = { konular: {}, etiketler: {} };
  for (const [id, sayim] of Object.entries(sayimlar.konular)) kopya.konular[id] = { ...sayim };
  for (const [id, sayim] of Object.entries(sayimlar.etiketler)) kopya.etiketler[id] = { ...sayim };
  return kopya;
}

function sayimAl(sayimlar: Sayimlar, tur: OgeTuru, id: string): Sayim {
  const kaynak = tur === 'konu' ? sayimlar.konular : sayimlar.etiketler;
  return (kaynak[id] ??= { up: 0, kararsiz: 0, down: 0 });
}

function oyEkle(
  sayimlar: Sayimlar,
  tur: OgeTuru,
  id: string,
  eskiDeger: OyDegeri | null,
  yeniDeger: OyDegeri,
): Sayimlar {
  const kopya = kopyala(sayimlar);
  const sayim = sayimAl(kopya, tur, id);
  if (eskiDeger) sayim[eskiDeger] = Math.max(0, sayim[eskiDeger] - 1);
  sayim[yeniDeger] += 1;
  return kopya;
}

function oyCikar(sayimlar: Sayimlar, tur: OgeTuru, id: string, deger: OyDegeri): Sayimlar {
  const kopya = kopyala(sayimlar);
  const sayim = sayimAl(kopya, tur, id);
  sayim[deger] = Math.max(0, sayim[deger] - 1);
  return kopya;
}

function benimGuncelle(benim: BenimOy[], tur: OgeTuru, id: string, deger: OyDegeri): BenimOy[] {
  const indeks = benim.findIndex((oy) => oy.ogeTuru === tur && oy.ogeId === id);
  if (indeks < 0) {
    return [...benim, { ogeTuru: tur, ogeId: id, deger, ziyaretciGeriAlindi: false, moderasyonGeriAlindi: false }];
  }
  const kopya = benim.slice();
  kopya[indeks] = { ...kopya[indeks], deger, ziyaretciGeriAlindi: false };
  return kopya;
}

function benimGeriAl(benim: BenimOy[], tur: OgeTuru, id: string): BenimOy[] {
  return benim.map((oy) =>
    oy.ogeTuru === tur && oy.ogeId === id
      ? { ...oy, ziyaretciGeriAlindi: true }
      : oy);
}

function hataMesaji(durum: number, cevap: OyCevabi): string {
  if (durum === 429) return 'Çok fazla istek gönderdiniz. Lütfen biraz sonra tekrar deneyin.';
  if (durum === 409) return 'Bu oy moderasyon tarafından geri alındı.';
  if (durum === 403) return cevap.hata || 'Bu tarayıcıdan oy verilemiyor.';
  return cevap.hata || 'Oy kaydedilemedi. Lütfen tekrar deneyin.';
}

/** İçerik sayfasının canlı oy alanı: iyimser sayımlar, geri alma ve sonuç paneli. */
export function OyAlani({
  hedef,
  baslangicSayimlar,
  baslangicSonuc,
  kilitliSonuc: baslangicKilitliSonuc,
  benimOylarim: baslangicOylarim,
  konular,
  etiketler,
}: OyAlaniProps) {
  const [sayimlar, setSayimlar] = useState<Sayimlar>(baslangicSayimlar);
  const [sonuc, setSonuc] = useState<KayitSonucu>(baslangicSonuc);
  const [kilitliSonuc, setKilitliSonuc] = useState<KayitSonucu | null>(baslangicKilitliSonuc);
  const [benim, setBenim] = useState<BenimOy[]>(baslangicOylarim);
  const [bekliyor, setBekliyor] = useState(false);
  const [bildirim, setBildirim] = useState<string | null>(null);

  const konuSirasi = konular.map((konu) => konu.id);
  const etiketSirasi = etiketler.map((etiket) => etiket.id);
  const adlar = new Map<string, string>();
  for (const konu of konular) adlar.set(`konu:${konu.id}`, konu.ad);
  for (const etiket of etiketler) adlar.set(`etiket:${etiket.id}`, etiket.ad);

  const aktifOylar = benim.filter((oy) => !oy.ziyaretciGeriAlindi && !oy.moderasyonGeriAlindi);

  function hesapla(yeniSayimlar: Sayimlar): KayitSonucu {
    return sonucHesapla(yeniSayimlar.konular, yeniSayimlar.etiketler, konuSirasi, etiketSirasi);
  }

  function geriYukle(onceki: OncekiDurum) {
    setSayimlar(onceki.sayimlar);
    setSonuc(onceki.sonuc);
    setKilitliSonuc(onceki.kilitliSonuc);
    setBenim(onceki.benim);
  }

  async function oyVer(tur: OgeTuru, id: string, deger: OyDegeri) {
    if (bekliyor) return;

    const mevcut = benim.find((oy) => oy.ogeTuru === tur && oy.ogeId === id);
    if (mevcut?.moderasyonGeriAlindi) return;
    const eskiDeger = mevcut && !mevcut.ziyaretciGeriAlindi ? mevcut.deger : null;

    const onceki: OncekiDurum = { sayimlar, sonuc, kilitliSonuc, benim };
    const yeniSayimlar = oyEkle(sayimlar, tur, id, eskiDeger, deger);
    const yeniBenim = benimGuncelle(benim, tur, id, deger);

    setSayimlar(yeniSayimlar);
    setSonuc(hesapla(yeniSayimlar));
    setBenim(yeniBenim);
    setBekliyor(true);
    setBildirim(null);

    try {
      const yanit = await fetch('/api/oylar', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          hedefTuru: hedef.tur,
          hedefId: hedef.id,
          ogeTuru: tur,
          ogeId: id,
          deger,
        }),
      });
      const cevap = await yanit.json().catch(() => ({})) as OyCevabi;

      if (!yanit.ok) {
        geriYukle(onceki);
        if (yanit.status === 409) {
          setBenim((liste) => liste.map((oy) =>
            oy.ogeTuru === tur && oy.ogeId === id
              ? { ...oy, moderasyonGeriAlindi: true }
              : oy));
        }
        setBildirim(hataMesaji(yanit.status, cevap));
        return;
      }

      if (!cevap.sayimlar || !cevap.sonuc) {
        geriYukle(onceki);
        setBildirim('Sunucudan beklenen oy sonucu gelmedi.');
        return;
      }

      setSayimlar(cevap.sayimlar);
      setSonuc(cevap.sonuc);
      setKilitliSonuc(cevap.kilitliSonuc ?? null);
    } catch {
      geriYukle(onceki);
      setBildirim('Ağ hatası: oy kaydedilemedi.');
    } finally {
      setBekliyor(false);
    }
  }

  async function geriAl(oy: BenimOy) {
    if (bekliyor) return;

    const onceki: OncekiDurum = { sayimlar, sonuc, kilitliSonuc, benim };
    const yeniSayimlar = oyCikar(sayimlar, oy.ogeTuru, oy.ogeId, oy.deger);
    const yeniBenim = benimGeriAl(benim, oy.ogeTuru, oy.ogeId);

    setSayimlar(yeniSayimlar);
    setSonuc(hesapla(yeniSayimlar));
    setBenim(yeniBenim);
    setBekliyor(true);
    setBildirim(null);

    try {
      const yanit = await fetch('/api/oylar/geri-al', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          hedefTuru: hedef.tur,
          hedefId: hedef.id,
          ogeTuru: oy.ogeTuru,
          ogeId: oy.ogeId,
        }),
      });
      const cevap = await yanit.json().catch(() => ({})) as OyCevabi;

      if (!yanit.ok) {
        geriYukle(onceki);
        if (yanit.status === 409) {
          setBenim((liste) => liste.map((kayit) =>
            kayit.ogeTuru === oy.ogeTuru && kayit.ogeId === oy.ogeId
              ? { ...kayit, moderasyonGeriAlindi: true }
              : kayit));
        }
        setBildirim(hataMesaji(yanit.status, cevap));
        return;
      }

      if (!cevap.sayimlar || !cevap.sonuc) {
        geriYukle(onceki);
        setBildirim('Sunucudan beklenen oy sonucu gelmedi.');
        return;
      }

      setSayimlar(cevap.sayimlar);
      setSonuc(cevap.sonuc);
      setKilitliSonuc(cevap.kilitliSonuc ?? null);
    } catch {
      geriYukle(onceki);
      setBildirim('Ağ hatası: oy geri alınamadı.');
    } finally {
      setBekliyor(false);
    }
  }

  return (
    <>
      {bildirim ? (
        <Bildirim tur="hata" mesaj={bildirim} kapat={() => setBildirim(null)} />
      ) : null}

      <div className={s.duzen}>
        <div className={s.oylar}>
          <section className={s.bolum} aria-labelledby="oy-tablolari-baslik">
            <h2 id="oy-tablolari-baslik" className={s.bolumBaslik}>Konular ve etiketler</h2>
            <OyTablosu
              satirlar={{ konular, etiketler }}
              sayimlar={sayimlar}
              benimOylarim={benim}
              onOy={(tur, id, deger) => void oyVer(tur, id, deger)}
              engelli={bekliyor}
            />
          </section>

          <section className={s.bolum} aria-labelledby="oylarim-baslik">
            <h2 id="oylarim-baslik" className={s.bolumBaslik}>Oylarım</h2>
            {aktifOylar.length ? (
              <ul className={s.oylarimListe}>
                {aktifOylar.map((oy) => {
                  const anahtar = `${oy.ogeTuru}:${oy.ogeId}`;
                  const ad = adlar.get(anahtar) ?? oy.ogeId;
                  return (
                    <li key={anahtar} className={s.oylarimSatir}>
                      <span className={s.oylarimAd}>{ad}</span>
                      <button
                        type="button"
                        className={s.geriAl}
                        onClick={() => void geriAl(oy)}
                        disabled={bekliyor}
                        aria-label={`${ad} oyunu geri al`}
                      >
                        Oyumu geri al
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={s.bos}>Bu içerikte henüz oyunuz yok.</p>
            )}
          </section>
        </div>

        <div className={s.sonuc}>
          <SonucPaneli
            sonuc={kilitliSonuc ?? sonuc}
            sayimlar={sayimlar}
            kilitli={kilitliSonuc !== null}
          />
        </div>
      </div>
    </>
  );
}
