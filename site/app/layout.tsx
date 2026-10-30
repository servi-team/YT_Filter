import type { Metadata, Viewport } from 'next';
import './stil.css';
import { fraunces, manrope } from './fontlar.ts';
import { Atla } from './bilesenler/atla.tsx';
import { UstBar } from './bilesenler/ust-bar.tsx';
import { AltBilgi } from './bilesenler/alt-bilgi.tsx';
import { siteKullanici } from '../lib/sunucu-oturum.ts';

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

export default async function KokDuzen({ children }: { children: React.ReactNode }) {
  const kullanici = await siteKullanici();
  const ustKullanici = kullanici
    ? { ad: kullanici.eposta.split('@')[0] ?? kullanici.eposta, rol: kullanici.rol }
    : null;

  return (
    <html lang="tr" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        <Atla />
        <UstBar kullanici={ustKullanici} />
        <main id="icerik" className="kap sayfa" tabIndex={-1}>
          {children}
        </main>
        <AltBilgi veriSurumu={null} />
      </body>
    </html>
  );
}
