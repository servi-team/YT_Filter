import type { ReactNode } from 'react';
import s from './sayfa-basligi.module.css';

export function SayfaBasligi({
  baslik,
  aciklama,
  eylem,
}: {
  baslik: string;
  aciklama?: ReactNode;
  eylem?: ReactNode;
}) {
  return (
    <header className={s.baslik}>
      <div className={s.metin}>
        <h1>{baslik}</h1>
        {aciklama ? <p className={s.aciklama}>{aciklama}</p> : null}
      </div>
      {eylem ? <div className={s.eylem}>{eylem}</div> : null}
    </header>
  );
}
