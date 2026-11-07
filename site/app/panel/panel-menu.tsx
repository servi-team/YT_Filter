'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './panel.module.css';

const BAGLAR = [
  { yol: '/panel', etiket: 'Özet' },
  { yol: '/panel/icerikler', etiket: 'İçerikler' },
  { yol: '/panel/talepler', etiket: 'Talepler' },
  { yol: '/panel/moderasyon', etiket: 'Moderasyon' },
  { yol: '/panel/engeller', etiket: 'Engeller' },
] as const;

/** Panel sol menüsü; aktif bağlantıyı `aria-current="page"` ile işaretler. */
export function PanelMenu() {
  const yol = usePathname();

  return (
    <nav aria-label="Panel gezinmesi">
      <ul className={s.menuListe}>
        {BAGLAR.map((bag) => {
          const aktif = bag.yol === '/panel' ? yol === '/panel' : yol.startsWith(bag.yol);
          return (
            <li key={bag.yol}>
              <Link
                className={`${s.menuBag} ${aktif ? s.menuAktif : ''}`}
                href={bag.yol}
                aria-current={aktif ? 'page' : undefined}
              >
                {bag.etiket}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
