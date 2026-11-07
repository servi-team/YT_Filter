'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import s from './sekmeler.module.css';

export interface Sekme {
  id: string;
  etiket: string;
  icerik: ReactNode;
}

export function Sekmeler({
  sekmeler,
  baslangic,
  etiket = 'Bölümler',
  sinif = '',
}: {
  sekmeler: Sekme[];
  baslangic?: string;
  etiket?: string;
  sinif?: string;
}) {
  const ilk = sekmeler.some((x) => x.id === baslangic) ? baslangic! : sekmeler[0]?.id ?? '';
  const [aktif, setAktif] = useState(ilk);
  const gecerliAktif = sekmeler.some((x) => x.id === aktif) ? aktif : ilk;
  const temel = useId();
  const dugmeler = useRef<Array<HTMLButtonElement | null>>([]);

  function sec(indeks: number) {
    const sekme = sekmeler[indeks];
    if (!sekme) return;
    setAktif(sekme.id);
    dugmeler.current[indeks]?.focus();
  }

  function tusla(e: KeyboardEvent<HTMLDivElement>) {
    const mevcut = sekmeler.findIndex((x) => x.id === gecerliAktif);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      sec((mevcut + 1) % sekmeler.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      sec((mevcut - 1 + sekmeler.length) % sekmeler.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      sec(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      sec(sekmeler.length - 1);
    }
  }

  if (!sekmeler.length) return null;

  return (
    <div className={sinif}>
      <div className={s.liste} role="tablist" aria-label={etiket} onKeyDown={tusla}>
        {sekmeler.map((sekme, i) => {
          const secili = sekme.id === gecerliAktif;
          return (
            <button
              key={sekme.id}
              ref={(el) => { dugmeler.current[i] = el; }}
              type="button"
              role="tab"
              id={`${temel}-sekme-${sekme.id}`}
              aria-selected={secili}
              aria-controls={`${temel}-panel-${sekme.id}`}
              tabIndex={secili ? 0 : -1}
              className={`${s.sekme} ${secili ? s.aktif : ''}`}
              onClick={() => setAktif(sekme.id)}
            >
              {sekme.etiket}
            </button>
          );
        })}
      </div>

      {sekmeler.map((sekme) => (
        <div
          key={sekme.id}
          role="tabpanel"
          id={`${temel}-panel-${sekme.id}`}
          aria-labelledby={`${temel}-sekme-${sekme.id}`}
          hidden={sekme.id !== gecerliAktif}
          className={s.panel}
          tabIndex={0}
        >
          {sekme.icerik}
        </div>
      ))}
    </div>
  );
}
