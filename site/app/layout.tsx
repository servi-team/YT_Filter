import type { Metadata, Viewport } from 'next';
import './stil.css';
import { fraunces, manrope } from './fontlar.ts';
import { Atla } from './bilesenler/atla.tsx';
import { UstBar } from './bilesenler/ust-bar.tsx';
import { AltBilgi } from './bilesenler/alt-bilgi.tsx';

export const metadata: Metadata = {
  title: {
    default: 'YouTube Filter Store',
    template: '%s · YouTube Filter Store',
  },
  description:
    'YouTube video ve kanallarının konusunu ve uyarı etiketlerini topluluk oylamasıyla belirleyen açık kütüphane.',
  applicationName: 'YouTube Filter Store',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F3EB' },
    { media: '(prefers-color-scheme: dark)', color: '#111315' },
  ],
};

export default function KokDuzen({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        <Atla />
        <UstBar kullanici={null} />
        <main id="icerik" className="kap sayfa" tabIndex={-1}>
          {children}
        </main>
        <AltBilgi veriSurumu={null} />
      </body>
    </html>
  );
}
