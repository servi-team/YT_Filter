'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dugme } from './dugme.tsx';
import { FormAlani } from './form-alani.tsx';
import { HataMetni } from './hata-metni.tsx';
import s from '../admin/admin.module.css';

interface HesapYaniti {
  hesap?: { eposta?: string };
  geciciParola?: string;
  hata?: string;
}

const PAROLA_HARFLERI = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function parolaUret(): string {
  const rastgele = new Uint32Array(16);
  crypto.getRandomValues(rastgele);
  return Array.from(rastgele, (sayi) => PAROLA_HARFLERI[sayi % PAROLA_HARFLERI.length]).join('');
}

/** Yeni hesap formu; geçici parolayı yalnızca başarılı yanıtta bir kez gösterir. */
export function HesapFormu() {
  const [eposta, setEposta] = useState('');
  const [rol, setRol] = useState<'editor' | 'admin'>('editor');
  const [parola, setParola] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [olusan, setOlusan] = useState<{ eposta: string; parola: string } | null>(null);
  const epostaId = useId();
  const rolId = useId();
  const parolaId = useId();
  const hataId = useId();
  const router = useRouter();

  async function gonder(olay: React.FormEvent<HTMLFormElement>) {
    olay.preventDefault();
    setHata(null);

    if (!eposta.trim()) {
      setHata('E-posta gerekli.');
      return;
    }
    if (parola.length < 12) {
      setHata('Parola en az 12 karakter olmalı.');
      return;
    }

    setYukleniyor(true);
    try {
      const yanit = await fetch('/api/admin/hesaplar', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ eposta: eposta.trim(), parola, rol }),
      });

      let veri: HesapYaniti | null = null;
      try {
        veri = await yanit.json() as HesapYaniti;
      } catch {
        veri = null;
      }

      if (!yanit.ok) {
        setHata(veri?.hata ?? 'Hesap oluşturulamadı. Lütfen tekrar deneyin.');
        return;
      }

      setOlusan({
        eposta: veri?.hesap?.eposta ?? eposta.trim(),
        parola: veri?.geciciParola ?? parola,
      });
      setEposta('');
      setRol('editor');
      setParola('');
      router.refresh();
    } catch {
      setHata('Hesap oluşturulamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <>
      {olusan ? (
        <div className={s.sifreKutu} role="status" aria-live="polite">
          <p className={s.sifreBaslik}>Hesap oluşturuldu: {olusan.eposta}</p>
          <code className={s.sifreKod}>{olusan.parola}</code>
          <p className={s.sifreNot}>
            Bu geçici parola yalnızca şimdi gösterilir. Sayfayı yenilediğinizde kaybolur;
            güvenli bir kanaldan iletin.
          </p>
          <div>
            <Dugme tur="ikincil" boyut="kucuk" onClick={() => setOlusan(null)}>
              Parolayı gizle
            </Dugme>
          </div>
        </div>
      ) : null}

      <form className={s.form} onSubmit={gonder} noValidate>
        <div className={s.formGrid}>
          <FormAlani etiket="E-posta" htmlFor={epostaId} zorunlu>
            <input
              id={epostaId}
              type="email"
              value={eposta}
              onChange={(olay) => {
                setEposta(olay.target.value);
                if (hata) setHata(null);
              }}
              autoComplete="off"
              inputMode="email"
              required
            />
          </FormAlani>

          <FormAlani etiket="Rol" htmlFor={rolId} zorunlu>
            <select
              id={rolId}
              value={rol}
              onChange={(olay) => setRol(olay.target.value === 'admin' ? 'admin' : 'editor')}
            >
              <option value="editor">Editör</option>
              <option value="admin">Admin</option>
            </select>
          </FormAlani>
        </div>

        <FormAlani
          etiket="Geçici parola"
          htmlFor={parolaId}
          zorunlu
          ipucu="En az 12 karakter. Kullanıcı ilk girişte parolasını değiştirmek zorundadır."
        >
          <input
            id={parolaId}
            type="text"
            value={parola}
            onChange={(olay) => {
              setParola(olay.target.value);
              if (hata) setHata(null);
            }}
            autoComplete="new-password"
            spellCheck={false}
            required
          />
        </FormAlani>

        {hata ? <HataMetni mesaj={hata} id={hataId} /> : null}

        <div className={s.formAlt}>
          <Dugme
            type="button"
            tur="ikincil"
            onClick={() => {
              setParola(parolaUret());
              setHata(null);
            }}
          >
            Parola üret
          </Dugme>
          <Dugme type="submit" yukleniyor={yukleniyor}>Hesap oluştur</Dugme>
        </div>
      </form>
    </>
  );
}
