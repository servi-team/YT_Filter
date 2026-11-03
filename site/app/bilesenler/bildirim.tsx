import type { ReactNode } from 'react';
import s from './bildirim.module.css';

export type BildirimTuru = 'hata' | 'basari' | 'bilgi';

const IKONLAR: Record<BildirimTuru, string> = {
  hata: '!',
  basari: '✓',
  bilgi: 'i',
};

export function Bildirim({
  tur = 'bilgi',
  mesaj,
  kapat,
}: {
  tur?: BildirimTuru;
  mesaj: ReactNode;
  kapat?: () => void;
}) {
  return (
    <div
      className={`${s.bildirim} ${s[tur]}`}
      role={tur === 'hata' ? 'alert' : 'status'}
      aria-live={tur === 'hata' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span className={s.ikon} aria-hidden="true">{IKONLAR[tur]}</span>
      <div className={s.metin}>{mesaj}</div>
      {kapat ? (
        <button type="button" className={s.kapat} onClick={kapat} aria-label="Bildirimi kapat">
          ×
        </button>
      ) : null}
    </div>
  );
}
