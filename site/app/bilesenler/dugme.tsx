import type { ButtonHTMLAttributes } from 'react';
import s from './dugme.module.css';

export type DugmeTuru = 'birincil' | 'ikincil' | 'tehlike' | 'hayalet';
export type DugmeBoyutu = 'normal' | 'kucuk';

export interface DugmeProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tur?: DugmeTuru;
  boyut?: DugmeBoyutu;
  tamGenislik?: boolean;
  yukleniyor?: boolean;
}

/** CSS Module sınıflarını dışarıya açar; bağlantıyı düğme gibi göstermek için. */
export function dugmeSinifi(
  tur: DugmeTuru = 'birincil',
  boyut: DugmeBoyutu = 'normal',
  tamGenislik = false,
): string {
  return [s.dugme, s[tur], s[boyut], tamGenislik ? s.tam : ''].filter(Boolean).join(' ');
}

export function Dugme({
  tur = 'birincil',
  boyut = 'normal',
  tamGenislik = false,
  yukleniyor = false,
  className = '',
  children,
  type = 'button',
  disabled,
  ...kalan
}: DugmeProps) {
  return (
    <button
      {...kalan}
      type={type}
      className={`${dugmeSinifi(tur, boyut, tamGenislik)} ${className}`.trim()}
      disabled={disabled || yukleniyor}
      aria-busy={yukleniyor || undefined}
    >
      {yukleniyor ? (
        <>
          <span className={s.donuyor} aria-hidden="true" />
          <span>İşleniyor…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
