'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './admin.module.css';

const BAGLAR = [
  { yol: '/admin', etiket: 'Özet' },
  { yol: '/admin/hesaplar', etiket: 'Hesaplar' },
  { yol: '/admin/icerikler', etiket: 'İçerikler' },
  { yol: '/admin/yayinlar', etiket: 'Yayınlar' },
  { yol: '/admin/taksonomi', etiket: 'Taksonomi' },
] as const;

/** Admin yan menüsü; aktif bağlantıyı `aria-current="page"` ile işaretler. */
export function AdminMenu() {
  const yol = usePathname();

  return (
    <nav aria-label="Admin gezinmesi">
      <ul className={s.menuListe}>
        {BAGLAR.map((bag) => {
          const aktif = bag.yol === '/admin' ? yol === '/admin' : yol.startsWith(bag.yol);
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
