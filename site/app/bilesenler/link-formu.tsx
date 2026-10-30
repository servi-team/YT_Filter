'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { linkCoz } from '../../lib/youtube-link.ts';

interface LinkYaniti {
  durum?: string;
  tur?: string;
  id?: string;
  hata?: string;
}

/**
 * Ana sayfadaki bağlantı alanı. Önce linki istemcide çözer; geçerli her
 * linkte kayıt durumunu `GET /api/link` ile sorar. Kayıtlı içerik doğrudan
 * sayfasına, arşivli/kayıtsız içerik `/link` talep akışına gider.
 */
export function LinkFormu() {
  const [girdi, setGirdi] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const hataKimligi = useId();
  const router = useRouter();

  async function gonder(olay: React.FormEvent<HTMLFormElement>) {
    olay.preventDefault();
    const metin = girdi.trim();
    const sonuc = linkCoz(metin);

    if (sonuc.tur === 'hata') {
      setHata(sonuc.neden);
      return;
    }

    setHata(null);
    setYukleniyor(true);

    try {
      const yanit = await fetch('/api/link?url=' + encodeURIComponent(metin), {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });

      let veri: LinkYaniti | null = null;
      try {
        veri = await yanit.json() as LinkYaniti;
      } catch {
        veri = null;
      }

      if (!yanit.ok) {
        setHata(veri?.hata ?? 'Link kontrol edilemedi. Lütfen tekrar deneyin.');
        return;
      }

      if (veri?.durum === 'kayitli' && (veri.tur === 'video' || veri.tur === 'kanal') && veri.id) {
        router.push(`/icerik/${veri.tur}/${veri.id}`);
        return;
      }

      if (veri?.durum === 'arsiv' || veri?.durum === 'kayitsiz') {
        router.push('/link?url=' + encodeURIComponent(metin));
        return;
      }

      setHata('Link durumu anlaşılamadı. Lütfen tekrar deneyin.');
    } catch {
      setHata('Link kontrol edilemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setYukleniyor(false);
    }
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
        <button type="submit" disabled={yukleniyor} aria-busy={yukleniyor || undefined}>
          {yukleniyor ? 'İnceleniyor…' : 'Linki incele'}
        </button>
      </form>

      {hata ? (
        <p className="sonuc hata" id={hataKimligi} role="alert">
          {hata}
        </p>
      ) : null}
    </>
  );
}
