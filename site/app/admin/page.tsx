import type { Metadata } from 'next';
import Link from 'next/link';
import { adminOzeti } from '../../lib/admin-deposu.ts';
import { db } from '../../lib/db.ts';
import { Bildirim } from '../bilesenler/bildirim.tsx';
import { SayfaBasligi } from '../bilesenler/sayfa-basligi.tsx';
import s from './admin.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin özeti',
  description: 'Hesap sayıları, bekleyen talepler, kilitler ve son yayın durumu.',
};

const tarihBicimi = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default async function AdminOzetSayfasi() {
  const veritabani = await db();
  const ozet = await adminOzeti(veritabani);

  return (
    <>
      <SayfaBasligi
        baslik="Admin özeti"
        aciklama="Hesap güvenliği, kuyruk ve yayın durumuna tek bakışta bakın."
      />

      {ozet.uyarilar.length ? (
        <Bildirim tur="bilgi" mesaj={ozet.uyarilar.join(' ')} />
      ) : null}

      <div className={s.kartlar}>
        <div className={s.kart}>
          <p className={s.kartEtiket}>Aktif admin</p>
          <p className={s.kartDeger}>{ozet.aktifAdmin}</p>
          <p className={s.kartNot}>
            {ozet.hesaplar} hesap · <Link className={s.kartBag} href="/admin/hesaplar">Hesapları yönet</Link>
          </p>
        </div>
        <div className={s.kart}>
          <p className={s.kartEtiket}>Bekleyen talep</p>
          <p className={s.kartDeger}>{ozet.bekleyenTalep}</p>
          <p className={s.kartNot}>
            <Link className={s.kartBag} href="/panel/talepler">Kuyruğa git</Link>
          </p>
        </div>
        <div className={s.kart}>
          <p className={s.kartEtiket}>Kilitli kayıt</p>
          <p className={s.kartDeger}>{ozet.kilitli}</p>
          <p className={s.kartNot}>
            <Link className={s.kartBag} href="/panel/icerikler">İçeriklere git</Link>
          </p>
        </div>
        <div className={s.kart}>
          <p className={s.kartEtiket}>Son yayın</p>
          <p className={s.kartDeger}>
            {ozet.sonYayin ? `v${ozet.sonYayin.veriSurumu}` : '—'}
          </p>
          <p className={s.kartNot}>
            {ozet.sonYayin
              ? `${ozet.sonYayin.kanalSayisi} kanal · ${ozet.sonYayin.videoSayisi} video · ${tarihBicimi.format(ozet.sonYayin.olusturma)}`
              : 'Henüz yayınlanmış veri yok.'}
            {' '}
            <Link className={s.kartBag} href="/admin/yayinlar">Yayınlar</Link>
          </p>
        </div>
      </div>
    </>
  );
}
