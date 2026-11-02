'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import s from './(kamusal)/metin.module.css';

/** Beklenmeyen bir çalışma zamanı hatasında gösterilen Türkçe kurtarma ekranı. */
export default function HataSayfasi({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className={s.durum} aria-labelledby="hata-baslik">
      <p className={s.kod}>Hata</p>
      <h1 id="hata-baslik">Bir sorun oluştu</h1>
      <p className={s.giris}>
        Sayfa beklenmedik bir hatayla karşılaştı. Yeniden denemek sorunu çözebilir; sorun sürerse
        ana sayfaya dönüp tekrar deneyin.
      </p>
      <div className={s.eylem}>
        <button className={s.dugme} type="button" onClick={reset}>
          Tekrar dene
        </button>
        <Link className={s.bag} href="/">Ana sayfaya dön</Link>
        {error.digest ? (
          <span className={s.ust}>Hata kimliği: <code>{error.digest}</code></span>
        ) : null}
      </div>
    </section>
  );
}
