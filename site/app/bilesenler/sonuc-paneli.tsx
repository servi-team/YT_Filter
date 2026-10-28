import type { KayitSonucu } from '../../lib/ortak.ts';
import { ESIK, toplamOy } from '../../lib/oy-hesabi.ts';
import type { Sayimlar } from '../../lib/tipler.ts';
import { Rozet } from './rozet.tsx';
import { etiketAdi, konuAdi } from './taksonomi-adlari.ts';
import s from './sonuc-paneli.module.css';

export interface SonucPaneliProps {
  sonuc: KayitSonucu;
  sayimlar: Sayimlar;
  kilitli?: boolean;
  /** Verilirse panelin altında yayın durumu gösterilir. */
  yayinSurumu?: number | null;
}

function enYuksekOy(sayimlar: Sayimlar): number {
  const hepsi = [
    ...Object.values(sayimlar.konular),
    ...Object.values(sayimlar.etiketler),
  ];
  return hepsi.reduce((en, sayim) => Math.max(en, toplamOy(sayim)), 0);
}

/** İçerik sayfasının canlı sonuç paneli: ana/yan konular, etiketler, kararsızlar ve eşik. */
export function SonucPaneli({
  sonuc,
  sayimlar,
  kilitli = false,
  yayinSurumu,
}: SonucPaneliProps) {
  const enYuksek = enYuksekOy(sayimlar);
  const gosterilen = Math.min(enYuksek, ESIK);
  const yuzde = Math.round((gosterilen / ESIK) * 100);
  const kararsizlar = [
    ...sonuc.kararsizKonular.map((id) => ({ tur: 'konu' as const, id, ad: konuAdi(id) })),
    ...sonuc.kararsizEtiketler.map((id) => ({ tur: 'etiket' as const, id, ad: etiketAdi(id) })),
  ];
  const bos =
    !sonuc.anaKonu &&
    !sonuc.yanKonular.length &&
    !sonuc.etiketler.length &&
    !kararsizlar.length;

  return (
    <aside className={s.panel} aria-live="polite" aria-label="Oylama sonucu">
      <div className={s.ust}>
        <h2 className={s.baslik}>Sonuç</h2>
        {kilitli ? (
          <Rozet tur="kilitli">Kilitli</Rozet>
        ) : (
          <Rozet tur="yayinda">Güncel</Rozet>
        )}
      </div>

      {sonuc.anaKonu ? (
        <div className={s.ana}>
          <span className={s.anaEtiket}>Ana konu</span>
          <span className={s.anaAd}>{konuAdi(sonuc.anaKonu)}</span>
        </div>
      ) : (
        <p className={s.bos}>
          {bos
            ? `Henüz sonuç çıkmadı. Bir başlığın sonuçlanması için en az ${ESIK} oy gerekir.`
            : 'Ana konu için yeterli oy yok.'}
        </p>
      )}

      {sonuc.yanKonular.length ? (
        <section className={s.bolum} aria-label="Yan konular">
          <h3 className={s.bolumBaslik}>Yan konular</h3>
          <ul className={s.liste}>
            {sonuc.yanKonular.map((id) => (
              <li key={id}>
                <Rozet tur="konu">{konuAdi(id)}</Rozet>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sonuc.etiketler.length ? (
        <section className={s.bolum} aria-label="Etiketler">
          <h3 className={s.bolumBaslik}>Etiketler</h3>
          <ul className={s.liste}>
            {sonuc.etiketler.map((id) => (
              <li key={id}>
                <Rozet tur="etiket">{etiketAdi(id)}</Rozet>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {kararsizlar.length ? (
        <section className={s.bolum} aria-label="Kararsız başlıklar">
          <h3 className={s.bolumBaslik}>Kararsızlar</h3>
          <ul className={s.liste}>
            {kararsizlar.map((oge) => (
              <li key={`${oge.tur}:${oge.id}`}>
                <Rozet tur="kararsiz" baslik={oge.tur === 'konu' ? 'Konu' : 'Etiket'}>
                  {oge.ad}
                </Rozet>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className={s.esik}>
        <div className={s.esikUst}>
          <span>Eşik</span>
          <span>
            {gosterilen}/{ESIK} oy
          </span>
        </div>
        <div
          className={s.cubuk}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={ESIK}
          aria-valuenow={gosterilen}
          aria-label={`En çok oy alan başlığın eşik ilerlemesi: ${gosterilen} / ${ESIK}`}
        >
          <span
            className={`${s.dolgu} ${gosterilen >= ESIK ? s.tamam : ''}`}
            style={{ width: `${yuzde}%` }}
          />
        </div>
        <p className={s.esikNot}>
          {kilitli
            ? 'Sonuç kilit anındaki oylarla dondurulmuştur; çubuk güncel oyları gösterir.'
            : enYuksek >= ESIK
              ? 'Eşik aşıldı; sonuç güncel oylardan hesaplanıyor.'
              : `Sonuç için en az ${ESIK} oy gerekir.`}
        </p>
      </div>

      {yayinSurumu !== undefined ? (
        <p className={s.yayin}>
          {yayinSurumu === null
            ? 'Henüz yayınlanmadı.'
            : `Son yayın: veri sürümü ${yayinSurumu}.`}
        </p>
      ) : null}
    </aside>
  );
}
