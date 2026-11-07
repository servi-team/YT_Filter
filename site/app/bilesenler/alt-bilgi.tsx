import Link from 'next/link';
import { Kalkan } from './kalkan.tsx';
import s from './kabuk.module.css';

/** Alt bilgi: marka, site bağlantıları, proje bağlantısı ve yayınlanan veri sürümü. */
export function AltBilgi({ veriSurumu }: { veriSurumu: number | null }) {
  const yil = new Date().getFullYear();

  return (
    <footer className={s.alt}>
      <div className={`kap ${s.altIc}`}>
        <div className={s.altMarka}>
          <Kalkan boyut={30} kimlik="kalkan-alt" />
          <div>
            <p className={s.altBaslik}>YouTube Filter Store</p>
            <p className={s.altAciklama}>
              Video ve kanalların konusunu topluluk oylarıyla belirleyen açık bir kütüphane.
            </p>
          </div>
        </div>

        <nav className={s.altBaglar} aria-label="Alt bilgi bağlantıları">
          <Link href="/gizlilik">Gizlilik</Link>
          <Link href="/kosullar">Koşullar</Link>
          <Link href="/iletisim">İletişim</Link>
          <a href="https://github.com/servi-team/YT_Filter" rel="noreferrer">GitHub</a>
        </nav>
      </div>

      <div className={`kap ${s.altSon}`}>
        <span>© {yil} YouTube Filter Store</span>
        <span className={s.surum}>
          {veriSurumu === null ? 'Veri sürümü: yayın bekliyor' : `Veri sürümü: ${veriSurumu}`}
        </span>
      </div>
    </footer>
  );
}
