'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import s from './kabuk.module.css';

/** Oturumu sunucuda kapatır, çerezi siler ve ana sayfaya döner. */
export function CikisDugmesi() {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const router = useRouter();

  async function cikisYap() {
    setHata(null);
    setYukleniyor(true);

    try {
      const yanit = await fetch('/api/oturum', {
        method: 'DELETE',
        headers: { accept: 'application/json' },
      });
      if (!yanit.ok) {
        setHata('Çıkış yapılamadı.');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setHata('Çıkış yapılamadı.');
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <span className={s.cikisFormu}>
      <button
        type="button"
        className={s.cikis}
        onClick={cikisYap}
        disabled={yukleniyor}
        aria-busy={yukleniyor || undefined}
      >
        {yukleniyor ? 'Çıkılıyor…' : 'Çıkış'}
      </button>
      {hata ? (
        <span role="alert" style={{ color: 'var(--kirmizi)', fontSize: '0.8rem' }}>
          {hata}
        </span>
      ) : null}
    </span>
  );
}
