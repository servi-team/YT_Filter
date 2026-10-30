import type { Metadata } from 'next';
import { taksonomi } from '../../../lib/ortak.ts';
import { Bildirim } from '../../bilesenler/bildirim.tsx';
import { SayfaBasligi } from '../../bilesenler/sayfa-basligi.tsx';
import s from '../admin.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Taksonomi',
  description: 'Eklentiyle ortak konu ve etiket kimliklerinin salt okunur listesi.',
};

export default function AdminTaksonomiSayfasi() {
  return (
    <>
      <SayfaBasligi
        baslik="Taksonomi"
        aciklama="Konu ve etiket kimlikleri eklenti çekirdeğiyle tek kaynaktan gelir."
      />

      <Bildirim
        tur="bilgi"
        mesaj="Yeni kimlik yalnızca eklenti sürümüyle gelir. Bu sayfa salt okunurdur; buradan ekleme veya düzenleme yapılamaz."
      />

      <section className={s.bolum} aria-labelledby="konular-baslik">
        <h2 className={s.bolumBaslik} id="konular-baslik">Konular</h2>
        <ol className={s.saltListe}>
          {taksonomi.KONULAR.map((konu, sira) => (
            <li className={s.saltOge} key={konu.id}>
              <span className={s.saltNo} aria-hidden="true">{String(sira + 1).padStart(2, '0')}</span>
              <p className={s.saltAd}>
                {konu.ad} <code className={s.saltKimlik}>{konu.id}</code>
              </p>
              <p className={s.saltAciklama}>{konu.aciklama}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={s.bolum} aria-labelledby="etiketler-baslik">
        <h2 className={s.bolumBaslik} id="etiketler-baslik">Etiketler</h2>
        <ol className={s.saltListe}>
          {taksonomi.ETIKETLER.map((etiket, sira) => (
            <li className={s.saltOge} key={etiket.id}>
              <span className={s.saltNo} aria-hidden="true">{String(sira + 1).padStart(2, '0')}</span>
              <p className={s.saltAd}>
                {etiket.ad} <code className={s.saltKimlik}>{etiket.id}</code>
              </p>
              <p className={s.saltAciklama}>{etiket.aciklama}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
