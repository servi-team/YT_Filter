'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { linkCoz } from '../../lib/youtube-link.ts';

/**
 * Ana sayfadaki bağlantı alanı. Yalnızca YouTube video/kanal kimliğini çözer;
 * kayıtsız linkler için talep akışı sonraki dilime bırakılmıştır.
 */
export function LinkFormu() {
  const [girdi, setGirdi] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const hataKimligi = useId();
  const router = useRouter();

  function gonder(olay: React.FormEvent<HTMLFormElement>) {
    olay.preventDefault();
    const sonuc = linkCoz(girdi);

    if (sonuc.tur === 'hata') {
      setHata(sonuc.neden);
      return;
    }

    setHata(null);

    if (sonuc.tur === 'kanal' && 'handle' in sonuc) {
      router.push('/kesfet?arama=' + encodeURIComponent(sonuc.handle));
      return;
    }

    router.push('/icerik/' + sonuc.tur + '/' + sonuc.id);
  }

  return (
    <>
      <form className="kutu" onSubmit={gonder}>
        <input
          type="text"
          value={girdi}
          onChange={(olay) => {
            setGirdi(olay.target.value);
            if (hata) setHata(null);
          }}
          placeholder="Bir YouTube video veya kanal linki yapıştırın"
          aria-label="YouTube video veya kanal linki"
          aria-invalid={hata ? true : undefined}
          aria-describedby={hata ? hataKimligi : undefined}
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
        />
        <button type="submit">Linki incele</button>
      </form>

      {hata ? (
        <p className="sonuc hata" id={hataKimligi} role="alert">
          {hata}
        </p>
      ) : null}
    </>
  );
}
