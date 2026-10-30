'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bildirim } from './bildirim.tsx';
import { Dugme } from './dugme.tsx';
import { HataMetni } from './hata-metni.tsx';
import s from '../panel/panel.module.css';

interface EkleYaniti {
  durum?: 'eklendi' | 'vardi' | 'arsivden';
  tur?: 'video' | 'kanal';
  id?: string;
  hata?: string;
}

const BASARI_METNI: Record<NonNullable<EkleYaniti['durum']>, string> = {
  eklendi: 'Kayıt eklendi.',
  vardi: 'Bu kayıt zaten vardı; yeni satır açılmadı.',
  arsivden: 'Arşivli kayıt geri getirildi; oyları korundu.',
};

/** Panelden yapıştırılan linki ekler; başarıda listeyi sunucudan yeniler. */
export function IcerikEkleFormu() {
  const [url, setUrl] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const girdiKimligi = useId();
  const hataKimligi = useId();
  const router = useRouter();

  async function gonder(olay: React.FormEvent<HTMLFormElement>) {
    olay.preventDefault();
    const metin = url.trim();

    if (!metin) {
      setHata('Bir YouTube video veya kanal linki yapıştırın.');
      setBasari(null);
      return;
    }

    setHata(null);
    setBasari(null);
    setYukleniyor(true);

    try {
      const yanit = await fetch('/api/panel/icerikler', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ url: metin }),
      });

      let veri: EkleYaniti | null = null;
      try {
        veri = await yanit.json() as EkleYaniti;
      } catch {
        veri = null;
      }

      if (!yanit.ok) {
        setHata(veri?.hata ?? 'Kayıt eklenemedi. Lütfen tekrar deneyin.');
        return;
      }

      setUrl('');
      setBasari(BASARI_METNI[veri?.durum ?? 'eklendi']);
      router.refresh();
    } catch {
      setHata('Kayıt eklenemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <form onSubmit={gonder} noValidate>
      <div className={s.aramaFormu}>
        <label className={s.gizli} htmlFor={girdiKimligi}>YouTube video veya kanal linki</label>
        <input
          id={girdiKimligi}
          className={s.aramaGirdi}
          type="text"
          value={url}
          onChange={(olay) => {
            setUrl(olay.target.value);
            if (hata) setHata(null);
            if (basari) setBasari(null);
          }}
          placeholder="https://www.youtube.com/watch?v=… veya kanal linki"
          aria-invalid={hata ? true : undefined}
          aria-describedby={hata ? hataKimligi : undefined}
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
        />
        <Dugme type="submit" yukleniyor={yukleniyor}>Ekle</Dugme>
      </div>

      <p className={s.satirMeta}>
        Video eklemek kanal satırı oluşturmaz; kanal bilgisi videoda saklanır.
      </p>

      {hata ? <HataMetni mesaj={hata} id={hataKimligi} /> : null}
      {basari ? <Bildirim tur="basari" mesaj={basari} /> : null}
    </form>
  );
}
