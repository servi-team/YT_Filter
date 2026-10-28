'use client';
import { useState } from 'react';
import { linkCoz, type LinkSonucu } from '../lib/youtube-link.ts';

export default function AdresCubugu() {
  const [girdi, setGirdi] = useState('');
  const [sonuc, setSonuc] = useState<LinkSonucu | null>(null);

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    setSonuc(linkCoz(girdi));
  }

  return (
    <>
      <form className="kutu" onSubmit={gonder}>
        <input
          type="text" value={girdi} onChange={(e) => setGirdi(e.target.value)}
          placeholder="Bir YouTube video veya kanal linki yapıştırın" aria-label="YouTube linki" autoComplete="off"
        />
        <button type="submit">Ara</button>
      </form>
      {sonuc && sonuc.tur === 'hata' && <p className="sonuc hata" role="alert">{sonuc.neden}</p>}
      {sonuc && sonuc.tur !== 'hata' && (
        <p className="sonuc tamam" role="status">
          Link tanındı ({sonuc.tur === 'video' ? 'video' : 'kanal'}: <code>{'id' in sonuc ? sonuc.id : sonuc.handle}</code>).
          Oylama sayfası bir sonraki aşamada eklenecek.
        </p>
      )}
    </>
  );
}
