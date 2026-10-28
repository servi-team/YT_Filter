import type { ReactNode } from 'react';
import { Kalkan } from './kalkan.tsx';
import s from './bos-durum.module.css';

export function BosDurum({
  baslik,
  aciklama,
  eylem,
}: {
  baslik: string;
  aciklama?: ReactNode;
  eylem?: ReactNode;
}) {
  return (
    <div className={s.bos}>
      <Kalkan boyut={48} kimlik="kalkan-bos" />
      <p className={s.baslik}>{baslik}</p>
      {aciklama ? <p className={s.aciklama}>{aciklama}</p> : null}
      {eylem ? <div className={s.eylem}>{eylem}</div> : null}
    </div>
  );
}
