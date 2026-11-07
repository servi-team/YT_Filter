import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { siteKullanici } from '../../../lib/sunucu-oturum.ts';
import { ParolaFormu } from '../../bilesenler/parola-formu.tsx';
import { SayfaBasligi } from '../../bilesenler/sayfa-basligi.tsx';
import s from '../giris/giris.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Parola değiştir',
  description: 'Hesap parolanızı yenileyin.',
};

export default async function SifreDegistirSayfasi() {
  const kullanici = await siteKullanici();
  if (!kullanici) redirect('/giris?donus=/sifre-degistir');

  return (
    <>
      <SayfaBasligi
        baslik="Parola değiştir"
        aciklama={
          kullanici.parolaDegistirmeli
            ? 'İlk girişte geçici parolanızı değiştirmeniz gerekir.'
            : 'Hesabınızın parolasını yenileyin.'
        }
      />
      <div className={s.govde}>
        <ParolaFormu />
        <p className={s.not}>
          Parola değişince bu oturum dışındaki tüm oturumlar kapatılır.
        </p>
      </div>
    </>
  );
}
