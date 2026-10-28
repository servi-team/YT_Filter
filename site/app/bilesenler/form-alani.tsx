import type { ReactNode } from 'react';
import { HataMetni } from './hata-metni.tsx';
import s from './form-alani.module.css';

export function FormAlani({
  etiket,
  htmlFor,
  ipucu,
  hata,
  zorunlu = false,
  children,
}: {
  etiket: string;
  htmlFor: string;
  ipucu?: string;
  hata?: string;
  zorunlu?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={s.alan}>
      <label className={s.etiket} htmlFor={htmlFor}>
        {etiket}
        {zorunlu ? <span className={s.zorunlu}> (zorunlu)</span> : null}
      </label>
      {ipucu ? <p className={s.ipucu} id={`${htmlFor}-ipucu`}>{ipucu}</p> : null}
      {children}
      {hata ? <HataMetni mesaj={hata} id={`${htmlFor}-hata`} /> : null}
    </div>
  );
}
