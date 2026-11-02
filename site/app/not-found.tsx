import type { Metadata } from 'next';
import Link from 'next/link';
import s from './(kamusal)/metin.module.css';

export const metadata: Metadata = {
  title: 'Sayfa bulunamadı',
  description: 'Aradığınız sayfa bulunamadı.',
};

export default function BulunamadiSayfasi() {
  return (
    <section className={s.durum} aria-labelledby="bulunamadi-baslik">
      <p className={s.kod}>404</p>
      <h1 id="bulunamadi-baslik">Sayfa bulunamadı</h1>
      <p className={s.giris}>
        Aradığınız sayfa taşınmış, arşivlenmiş veya hiç var olmamış olabilir. Ana sayfadan devam
        edebilir ya da keşfet sayfasından kayıtlara göz atabilirsiniz.
      </p>
      <div className={s.eylem}>
        <Link className={`${s.bag} ${s.bagBirincil}`} href="/">Ana sayfaya dön</Link>
        <Link className={s.bag} href="/kesfet">Keşfet</Link>
      </div>
    </section>
  );
}
