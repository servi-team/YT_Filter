'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dugme } from './dugme.tsx';
import { FormAlani } from './form-alani.tsx';
import { HataMetni } from './hata-metni.tsx';

interface ParolaYaniti {
  ok?: boolean;
  hata?: string;
}

/** Mevcut parola + yeni parola (iki kez) formu; başarıda panele döner. */
export function ParolaFormu() {
  const [mevcutParola, setMevcutParola] = useState('');
  const [yeniParola, setYeniParola] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const hataKimligi = useId();
  const router = useRouter();

  async function gonder(olay: React.FormEvent<HTMLFormElement>) {
    olay.preventDefault();
    setHata(null);

    if (yeniParola.length < 12) {
      setHata('Parola en az 12 karakter olmalı.');
      return;
    }
    if (yeniParola !== tekrar) {
      setHata('Yeni parolalar birbiriyle eşleşmiyor.');
      return;
    }

    setYukleniyor(true);
    try {
      const yanit = await fetch('/api/oturum/parola', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ mevcutParola, yeniParola }),
      });

      let veri: ParolaYaniti | null = null;
      try {
        veri = await yanit.json() as ParolaYaniti;
      } catch {
        veri = null;
      }

      if (!yanit.ok) {
        setHata(veri?.hata ?? 'Parola değiştirilemedi. Lütfen tekrar deneyin.');
        return;
      }

      router.push('/panel');
      router.refresh();
    } catch {
      setHata('Parola değiştirilemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <form className="kutu" onSubmit={gonder} noValidate>
      <div style={{ display: 'grid', gap: '1rem', width: '100%' }}>
        <FormAlani etiket="Mevcut parola" htmlFor="parola-mevcut" zorunlu>
          <input
            id="parola-mevcut"
            type="password"
            value={mevcutParola}
            onChange={(olay) => setMevcutParola(olay.target.value)}
            autoComplete="current-password"
            aria-invalid={hata ? true : undefined}
            aria-describedby={hata ? hataKimligi : undefined}
            required
          />
        </FormAlani>

        <FormAlani
          etiket="Yeni parola"
          htmlFor="parola-yeni"
          ipucu="En az 12 karakter."
          zorunlu
        >
          <input
            id="parola-yeni"
            type="password"
            value={yeniParola}
            onChange={(olay) => setYeniParola(olay.target.value)}
            autoComplete="new-password"
            aria-invalid={hata ? true : undefined}
            aria-describedby={hata ? hataKimligi : undefined}
            required
          />
        </FormAlani>

        <FormAlani etiket="Yeni parola (tekrar)" htmlFor="parola-tekrar" zorunlu>
          <input
            id="parola-tekrar"
            type="password"
            value={tekrar}
            onChange={(olay) => setTekrar(olay.target.value)}
            autoComplete="new-password"
            aria-invalid={hata ? true : undefined}
            aria-describedby={hata ? hataKimligi : undefined}
            required
          />
        </FormAlani>

        {hata ? <HataMetni mesaj={hata} id={hataKimligi} /> : null}

        <Dugme type="submit" yukleniyor={yukleniyor} tamGenislik>
          Parolayı değiştir
        </Dugme>
      </div>
    </form>
  );
}
