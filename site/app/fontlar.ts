import localFont from 'next/font/local';

export const fraunces = localFont({
  src: './fontlar/fraunces-variable.woff2',
  variable: '--font-fraunces',
  weight: '100 900',
  display: 'swap',
});

export const manrope = localFont({
  src: './fontlar/manrope-variable.woff2',
  variable: '--font-manrope',
  weight: '200 800',
  display: 'swap',
});
