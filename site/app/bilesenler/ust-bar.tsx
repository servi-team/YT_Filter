import Link from 'next/link';
import { Kalkan } from './kalkan.tsx';
import s from './kabuk.module.css';

export interface Kullanici {
  ad: string;
  rol: 'editor' | 'admin';
}

/** Üst gezinme: yapışkan değil, ince ve sakin. Oturum açıksa panele ve çıkışa yer açar. */
export function UstBar({ kullanici }: { kullanici: Kullanici | null }) {
  const panelYolu = kullanici?.rol === 'admin' ? '/admin' : '/panel';

  return (
    <header className={s.ust}>
      <div className={`kap ${s.ustIc}`}>
        <Link href="/" className={s.marka} aria-label="YouTube Filter Store ana sayfa">
          <Kalkan boyut={34} kimlik="kalkan-ust" />
          <span className={s.markaAd}>YouTube Filter</span>
          <span className={s.markaEk}>Store</span>
        </Link>

        <nav className={s.gezinme} aria-label="Ana gezinme">
          <Link className={s.bag} href="/kesfet">Keşfet</Link>
          <Link className={s.bag} href="/#nasil-calisir">Nasıl çalışır?</Link>
          <Link className={s.bag} href="/db.json">db.json</Link>
          {kullanici ? (
            <>
              <Link className={s.panel} href={panelYolu}>Panel</Link>
              <form action="/api/oturum/cikis" method="post" className={s.cikisFormu}>
                <button type="submit" className={s.cikis}>Çıkış</button>
              </form>
            </>
          ) : (
            <Link className={s.giris} href="/giris">Giriş</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
