'use client';

import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dugme } from './dugme.tsx';
import { FormAlani } from './form-alani.tsx';
import { HataMetni } from './hata-metni.tsx';
import s from '../panel/panel.module.css';

interface IslemYaniti {
  durum?: 'kabul' | 'red';
  hedef?: { tur: string; id: string };
  hata?: string;
}

/** Bekleyen talebi kabul eder veya gerekçe dialoguyla reddeder. */
export function TalepIslem({ talepId }: { talepId: string }) {
  const [hata, setHata] = useState<string | null>(null);
  const [dialogHatasi, setDialogHatasi] = useState<string | null>(null);
  const [gerekce, setGerekce] = useState('');
  const [islem, setIslem] = useState<'kabul' | 'red' | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hataKimligi = useId();
  const gerekceKimligi = useId();
  const baslikKimligi = useId();
  const router = useRouter();

  async function gonder(karar: 'kabul' | 'red', gerekceMetni?: string): Promise<boolean> {
    setHata(null);
    if (karar === 'red') setDialogHatasi(null);
    setIslem(karar);

    try {
      const yanit = await fetch(`/api/panel/talepler/${encodeURIComponent(talepId)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(karar === 'red' ? { karar, gerekce: gerekceMetni } : { karar }),
      });

      let veri: IslemYaniti | null = null;
      try {
        veri = await yanit.json() as IslemYaniti;
      } catch {
        veri = null;
      }

      if (!yanit.ok) {
        const mesaj = veri?.hata ?? 'Talep işlenemedi. Lütfen tekrar deneyin.';
        if (karar === 'red') setDialogHatasi(mesaj);
        else setHata(mesaj);
        return false;
      }

      dialogRef.current?.close();
      setGerekce('');
      router.refresh();
      return true;
    } catch {
      const mesaj = 'Talep işlenemedi. Bağlantınızı kontrol edip tekrar deneyin.';
      if (karar === 'red') setDialogHatasi(mesaj);
      else setHata(mesaj);
      return false;
    } finally {
      setIslem(null);
    }
  }

  function redDialogAc() {
    setHata(null);
    setDialogHatasi(null);
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }

  return (
    <>
      <div className={s.talepEylem}>
        <Dugme
          type="button"
          boyut="kucuk"
          disabled={islem !== null}
          yukleniyor={islem === 'kabul'}
          onClick={() => { void gonder('kabul'); }}
        >
          Kabul et
        </Dugme>
        <Dugme
          type="button"
          tur="tehlike"
          boyut="kucuk"
          disabled={islem !== null}
          onClick={redDialogAc}
        >
          Reddet
        </Dugme>
      </div>

      {hata ? <HataMetni mesaj={hata} id={hataKimligi} /> : null}

      <dialog
        ref={dialogRef}
        aria-labelledby={baslikKimligi}
        style={{
          width: 'min(32rem, calc(100% - 2rem))',
          padding: '1.25rem',
          border: '1px solid var(--cizgi)',
          borderRadius: '14px',
          background: 'var(--yuzey)',
          color: 'inherit',
        }}
        onClose={() => {
          setDialogHatasi(null);
          setGerekce('');
        }}
      >
        <form
          onSubmit={(olay) => {
            olay.preventDefault();
            const metin = gerekce.trim();
            if (!metin) {
              setDialogHatasi('Red için gerekçe gerekli.');
              return;
            }
            void gonder('red', metin);
          }}
          noValidate
        >
          <h2 id={baslikKimligi} className={s.bolumBaslik} style={{ marginTop: 0 }}>
            Talebi reddet
          </h2>
          <p className={s.talepMeta}>
            Red gerekçesi moderasyon kaydına yazılır; talep reddedilmiş olarak işaretlenir.
          </p>

          <FormAlani etiket="Gerekçe" htmlFor={gerekceKimligi} zorunlu>
            <textarea
              id={gerekceKimligi}
              value={gerekce}
              onChange={(olay) => {
                setGerekce(olay.target.value);
                if (dialogHatasi) setDialogHatasi(null);
              }}
              aria-invalid={dialogHatasi ? true : undefined}
              aria-describedby={dialogHatasi ? `${gerekceKimligi}-hata` : undefined}
              required
            />
          </FormAlani>

          {dialogHatasi ? <HataMetni mesaj={dialogHatasi} id={`${gerekceKimligi}-hata`} /> : null}

          <div className={s.talepEylem} style={{ marginTop: '1rem' }}>
            <Dugme
              type="button"
              tur="ikincil"
              boyut="kucuk"
              disabled={islem === 'red'}
              onClick={() => dialogRef.current?.close()}
            >
              Vazgeç
            </Dugme>
            <Dugme type="submit" tur="tehlike" boyut="kucuk" yukleniyor={islem === 'red'}>
              Reddet
            </Dugme>
          </div>
        </form>
      </dialog>
    </>
  );
}
