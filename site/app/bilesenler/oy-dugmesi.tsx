'use client';

import type { OyDegeri } from '../../lib/oy-hesabi.ts';
import s from './oy-dugmesi.module.css';

const ETIKETLER: Record<OyDegeri, string> = {
  up: 'katılıyorum',
  kararsiz: 'kararsızım',
  down: 'katılmıyorum',
};

function Ikon({ deger }: { deger: OyDegeri }) {
  if (deger === 'kararsiz') {
    return <span className={s.soru} aria-hidden="true">?</span>;
  }

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {deger === 'up' ? (
        <path d="M4 10.5 8 6.5l4 4M8 6.5v7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M4 7.5 8 11.5l4-4M8 11.5v-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function OyDugmesi({
  deger,
  sayi,
  secili = false,
  onSec,
  engelli = false,
  ogeAdi,
}: {
  deger: OyDegeri;
  sayi: number;
  secili?: boolean;
  onSec?: () => void;
  engelli?: boolean;
  ogeAdi: string;
}) {
  return (
    <button
      type="button"
      className={`${s.dugme} ${s[deger]} ${secili ? s.secili : ''}`}
      aria-pressed={secili}
      aria-label={`${ogeAdi} için ${ETIKETLER[deger]}`}
      onClick={onSec}
      disabled={engelli}
    >
      <Ikon deger={deger} />
      <span className={s.sayi}>{sayi}</span>
    </button>
  );
}
