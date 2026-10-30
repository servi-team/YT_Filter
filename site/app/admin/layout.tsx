import { forbidden, redirect } from 'next/navigation';
import { HttpHatasi } from '../../lib/hata.ts';
import { sunucuRolGerekli } from '../../lib/sunucu-oturum.ts';
import { AdminMenu } from './admin-menu.tsx';
import s from './admin.module.css';

export const dynamic = 'force-dynamic';

/**
 * Admin kabuğu: yalnızca admin rolü. Oturum yoksa girişe yönlendirir,
 * yetersiz rolde gerçek 403 sayfasını gösterir. `forbidden()` try/catch
 * dışında çağrılır; Next.js bu interrupt'ı fırlatarak çalıştırır.
 */
export default async function AdminDuzeni({ children }: { children: React.ReactNode }) {
  let kullanici: Awaited<ReturnType<typeof sunucuRolGerekli>> | null = null;
  let hata: unknown = null;

  try {
    kullanici = await sunucuRolGerekli(['admin']);
  } catch (yakalanan) {
    hata = yakalanan;
  }

  if (hata instanceof HttpHatasi) {
    if (hata.durum === 401) redirect('/giris?donus=/admin');
    if (hata.durum === 403) forbidden();
  }
  if (hata) throw hata;
  if (!kullanici) throw new Error('Admin oturumu okunamadı.');

  return (
    <div className={s.admin}>
      <aside className={s.yan}>
        <div className={s.menuUst}>
          <p className={s.menuEtiket}>Yönetici paneli</p>
          <p className={s.menuKullanici} title={kullanici.eposta}>{kullanici.eposta}</p>
        </div>
        <AdminMenu />
      </aside>
      <div className={s.icerik}>{children}</div>
    </div>
  );
}
