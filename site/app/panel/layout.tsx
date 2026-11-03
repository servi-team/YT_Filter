import { notFound, redirect } from 'next/navigation';
import { HttpHatasi } from '../../lib/hata.ts';
import { sunucuRolGerekli } from '../../lib/sunucu-oturum.ts';
import { PanelMenu } from './panel-menu.tsx';
import s from './panel.module.css';

export const dynamic = 'force-dynamic';

/**
 * Panel kabuğu: oturum + editör/admin rolü zorunlu. Oturum yoksa girişe,
 * yetkisiz rol varsa 404'e yönlendirir. Menü mobilde yatay kaydırılır.
 */
export default async function PanelDuzeni({ children }: { children: React.ReactNode }) {
  let kullanici;
  try {
    kullanici = await sunucuRolGerekli(['editor', 'admin']);
  } catch (hata) {
    if (hata instanceof HttpHatasi) {
      if (hata.durum === 401) redirect('/giris?donus=/panel');
      if (hata.durum === 403) notFound();
    }
    throw hata;
  }

  return (
    <div className={s.panel}>
      <aside className={s.yan}>
        <div className={s.menuUst}>
          <p className={s.menuEtiket}>
            {kullanici.rol === 'admin' ? 'Yönetici paneli' : 'Editör paneli'}
          </p>
          <p className={s.menuKullanici} title={kullanici.eposta}>{kullanici.eposta}</p>
        </div>
        <PanelMenu />
      </aside>
      <div className={s.icerik}>{children}</div>
    </div>
  );
}
