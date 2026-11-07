import type { ReactNode } from 'react';
import s from './rozet.module.css';

export type RozetTuru = 'konu' | 'etiket' | 'kararsiz' | 'kilitli' | 'yayinda';

const IKONLAR: Partial<Record<RozetTuru, string>> = {
  kararsiz: '?',
  yayinda: '●',
};

export function Rozet({
  tur,
  children,
  baslik,
}: {
  tur: RozetTuru;
  children: ReactNode;
  baslik?: string;
}) {
  return (
    <span className={`${s.rozet} ${s[tur]}`} title={baslik}>
      {IKONLAR[tur] ? (
        <span className={s.ikon} aria-hidden="true">{IKONLAR[tur]}</span>
      ) : null}
      {children}
    </span>
  );
}
