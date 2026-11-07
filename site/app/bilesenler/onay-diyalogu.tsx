'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Dugme } from './dugme.tsx';
import s from './onay-diyalogu.module.css';

export function OnayDiyalogu({
  acik,
  baslik,
  onayla,
  onIptal,
  children,
  onayMetni = 'Onayla',
  iptalMetni = 'Vazgeç',
  tehlike = false,
}: {
  acik: boolean;
  baslik: string;
  onayla: () => void;
  onIptal: () => void;
  children: ReactNode;
  onayMetni?: string;
  iptalMetni?: string;
  tehlike?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const baslikId = useId();

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (acik && !d.open) d.showModal();
    else if (!acik && d.open) d.close();
  }, [acik]);

  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-labelledby={baslikId}
      onCancel={(e) => {
        e.preventDefault();
        onIptal();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onIptal();
      }}
    >
      <div className={s.ic}>
        <h2 className={s.baslik} id={baslikId}>{baslik}</h2>
        <div className={s.govde}>{children}</div>
        <div className={s.alt}>
          <Dugme tur="ikincil" onClick={onIptal}>{iptalMetni}</Dugme>
          <Dugme tur={tehlike ? 'tehlike' : 'birincil'} onClick={onayla}>{onayMetni}</Dugme>
        </div>
      </div>
    </dialog>
  );
}
