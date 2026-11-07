import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { siteKullanici } from '../../../lib/sunucu-oturum.ts';
import { GirisFormu } from '../../bilesenler/giris-formu.tsx';
import { SayfaBasligi } from '../../bilesenler/sayfa-basligi.tsx';
import s from './giris.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Giriş',
  description: 'Editör ve admin hesabıyla giriş yapın.',
};

export default async function GirisSayfasi() {
  const kullanici = await siteKullanici();
  if (kullanici) {
    redirect(kullanici.parolaDegistirmeli ? '/sifre-degistir' : '/panel');
  }

  return (
    <>
      <SayfaBasligi
        baslik="Giriş"
        aciklama="Editör ve admin hesapları buradan giriş yapar. Ziyaretçilerin hesabı yoktur."
      />
      <div className={s.govde}>
        <GirisFormu />
        <p className={s.not}>
          İlk girişte geçici parolanızı değiştirmeniz istenir.
        </p>
      </div>
    </>
  );
}
