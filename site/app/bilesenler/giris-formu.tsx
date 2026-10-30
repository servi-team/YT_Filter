'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dugme } from './dugme.tsx';
import { FormAlani } from './form-alani.tsx';
import { HataMetni } from './hata-metni.tsx';

interface GirisYaniti {
  kullanici?: {
    parolaDegistirmeli?: boolean;
  };
  hata?: string;
}

/** E-posta/parola giriş formu; başarıda ilk giriş kontrolüyle yönlendirir. */
export function GirisFormu() {
  const [eposta, setEposta] = useState('');
  const [parola, setParola] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const hataKimligi = useId();
  const router = useRouter();

  async function gonder(olay: React.FormEvent<HTMLFormElement>) {
    olay.preventDefault();
    setHata(null);
    setYukleniyor(true);

    try {
      const yanit = await fetch('/api/oturum', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ eposta, parola }),
      });

      let veri: GirisYaniti | null = null;
      try {
        veri = await yanit.json() as GirisYaniti;
      } catch {
        veri = null;
      }

      if (!yanit.ok) {
        setHata(veri?.hata ?? 'Giriş yapılamadı. Lütfen tekrar deneyin.');
        return;
      }

      const hedef = veri?.kullanici?.parolaDegistirmeli ? '/sifre-degistir' : '/panel';
      router.push(hedef);
      router.refresh();
    } catch {
      setHata('Giriş yapılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <form className="kutu" onSubmit={gonder} noValidate>
      <div style={{ display: 'grid', gap: '1rem', width: '100%' }}>
        <FormAlani etiket="E-posta" htmlFor="giris-eposta" zorunlu>
          <input
            id="giris-eposta"
            type="email"
            value={eposta}
            onChange={(olay) => {
              setEposta(olay.target.value);
              if (hata) setHata(null);
            }}
            autoComplete="username"
            inputMode="email"
            aria-invalid={hata ? true : undefined}
            aria-describedby={hata ? hataKimligi : undefined}
            required
          />
        </FormAlani>

        <FormAlani etiket="Parola" htmlFor="giris-parola" zorunlu>
          <input
            id="giris-parola"
            type="password"
            value={parola}
            onChange={(olay) => {
              setParola(olay.target.value);
              if (hata) setHata(null);
            }}
            autoComplete="current-password"
            aria-invalid={hata ? true : undefined}
            aria-describedby={hata ? hataKimligi : undefined}
            required
          />
        </FormAlani>

        {hata ? <HataMetni mesaj={hata} id={hataKimligi} /> : null}

        <Dugme type="submit" yukleniyor={yukleniyor} tamGenislik>
          Giriş yap
        </Dugme>
      </div>
    </form>
  );
}
