'use client';

import { bosSayim, type OyDegeri } from '../../lib/oy-hesabi.ts';
import type { OgeTuru, Sayimlar } from '../../lib/tipler.ts';
import { OyDugmesi } from './oy-dugmesi.tsx';
import { Sekmeler } from './sekmeler.tsx';
import s from './oy-tablosu.module.css';

export interface OySatiri {
  id: string;
  ad: string;
  aciklama?: string;
}

export interface BenimOy {
  ogeTuru: OgeTuru;
  ogeId: string;
  deger: OyDegeri;
  ziyaretciGeriAlindi?: boolean;
  moderasyonGeriAlindi?: boolean;
}

export interface OyTablosuProps {
  satirlar: { konular: OySatiri[]; etiketler: OySatiri[] };
  sayimlar: Sayimlar;
  benimOylarim: BenimOy[];
  onOy: (ogeTuru: OgeTuru, ogeId: string, deger: OyDegeri) => void;
  engelli?: boolean;
}

function Oylar({
  tur,
  satir,
  sayimlar,
  benim,
  onOy,
  engelli,
}: {
  tur: OgeTuru;
  satir: OySatiri;
  sayimlar: Sayimlar;
  benim: Map<string, BenimOy>;
  onOy: OyTablosuProps['onOy'];
  engelli: boolean;
}) {
  const kayit = benim.get(`${tur}:${satir.id}`);
  const sayim = (tur === 'konu' ? sayimlar.konular : sayimlar.etiketler)[satir.id] ?? bosSayim();
  const moderasyon = kayit?.moderasyonGeriAlindi === true;
  const secili = kayit && !moderasyon && !kayit.ziyaretciGeriAlindi ? kayit.deger : null;

  return (
    <div className={s.oyGrubu}>
      <OyDugmesi deger="up" sayi={sayim.up} secili={secili === 'up'} onSec={() => onOy(tur, satir.id, 'up')} engelli={engelli || moderasyon} ogeAdi={satir.ad} />
      <OyDugmesi deger="kararsiz" sayi={sayim.kararsiz} secili={secili === 'kararsiz'} onSec={() => onOy(tur, satir.id, 'kararsiz')} engelli={engelli || moderasyon} ogeAdi={satir.ad} />
      <OyDugmesi deger="down" sayi={sayim.down} secili={secili === 'down'} onSec={() => onOy(tur, satir.id, 'down')} engelli={engelli || moderasyon} ogeAdi={satir.ad} />
    </div>
  );
}

function Uyari({ kayit }: { kayit?: BenimOy }) {
  if (kayit?.moderasyonGeriAlindi) {
    return <span className={s.uyari}>Bu oy moderasyon tarafından geri alındı.</span>;
  }
  if (kayit?.ziyaretciGeriAlindi) {
    return <span className={s.not}>Oyunuz geri alındı; yeniden oy verebilirsiniz.</span>;
  }
  return null;
}

function Tablo({
  tur,
  satirlar,
  sayimlar,
  benim,
  onOy,
  engelli,
}: {
  tur: OgeTuru;
  satirlar: OySatiri[];
  sayimlar: Sayimlar;
  benim: Map<string, BenimOy>;
  onOy: OyTablosuProps['onOy'];
  engelli: boolean;
}) {
  if (!satirlar.length) {
    return <p className={s.bos}>Bu bölümde henüz başlık yok.</p>;
  }

  return (
    <>
      <table className={s.tablo}>
        <caption className={s.gizli}>{tur === 'konu' ? 'Konular' : 'Etiketler'}</caption>
        <thead>
          <tr>
            <th scope="col">Başlık</th>
            <th scope="col">Katılıyorum</th>
            <th scope="col">Kararsızım</th>
            <th scope="col">Katılmıyorum</th>
          </tr>
        </thead>
        <tbody>
          {satirlar.map((satir) => (
            <tr key={satir.id}>
              <th scope="row">
                <span className={s.ogeAd}>{satir.ad}</span>
                {satir.aciklama ? <span className={s.ogeAciklama}>{satir.aciklama}</span> : null}
                <Uyari kayit={benim.get(`${tur}:${satir.id}`)} />
              </th>
              {(['up', 'kararsiz', 'down'] as const).map((deger) => {
                const kayit = benim.get(`${tur}:${satir.id}`);
                const sayim = (tur === 'konu' ? sayimlar.konular : sayimlar.etiketler)[satir.id] ?? bosSayim();
                const moderasyon = kayit?.moderasyonGeriAlindi === true;
                const secili = kayit && !moderasyon && !kayit.ziyaretciGeriAlindi ? kayit.deger : null;
                return (
                  <td key={deger}>
                    <OyDugmesi
                      deger={deger}
                      sayi={sayim[deger]}
                      secili={secili === deger}
                      onSec={() => onOy(tur, satir.id, deger)}
                      engelli={engelli || moderasyon}
                      ogeAdi={satir.ad}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className={s.kartlar}>
        {satirlar.map((satir) => (
          <li className={s.kart} key={satir.id}>
            <div>
              <span className={s.ogeAd}>{satir.ad}</span>
              {satir.aciklama ? <span className={s.ogeAciklama}>{satir.aciklama}</span> : null}
              <Uyari kayit={benim.get(`${tur}:${satir.id}`)} />
            </div>
            <Oylar tur={tur} satir={satir} sayimlar={sayimlar} benim={benim} onOy={onOy} engelli={engelli} />
          </li>
        ))}
      </ul>
    </>
  );
}

export function OyTablosu({
  satirlar,
  sayimlar,
  benimOylarim,
  onOy,
  engelli = false,
}: OyTablosuProps) {
  const benim = new Map(benimOylarim.map((oy) => [`${oy.ogeTuru}:${oy.ogeId}`, oy]));

  return (
    <Sekmeler
      etiket="Oy başlıkları"
      sekmeler={[
        {
          id: 'konular',
          etiket: 'Konular',
          icerik: (
            <Tablo tur="konu" satirlar={satirlar.konular} sayimlar={sayimlar} benim={benim} onOy={onOy} engelli={engelli} />
          ),
        },
        {
          id: 'etiketler',
          etiket: 'Etiketler',
          icerik: (
            <Tablo tur="etiket" satirlar={satirlar.etiketler} sayimlar={sayimlar} benim={benim} onOy={onOy} engelli={engelli} />
          ),
        },
      ]}
    />
  );
}
