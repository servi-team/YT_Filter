import type { Metadata } from 'next';
import { db } from '../../../lib/db.ts';
import { hesaplariListele } from '../../../lib/hesap-deposu.ts';
import { sunucuRolGerekli } from '../../../lib/sunucu-oturum.ts';
import { HesapFormu } from '../../bilesenler/hesap-formu.tsx';
import { HesapTablosu } from '../../bilesenler/hesap-tablosu.tsx';
import { SayfaBasligi } from '../../bilesenler/sayfa-basligi.tsx';
import s from '../admin.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Hesaplar',
  description: 'Editör ve admin hesaplarını oluşturun, rollerini ve aktifliklerini yönetin.',
};

export default async function AdminHesaplarSayfasi() {
  const kullanici = await sunucuRolGerekli(['admin']);
  const veritabani = await db();
  const hesaplar = await hesaplariListele(veritabani);

  return (
    <>
      <SayfaBasligi
        baslik="Hesaplar"
        aciklama="Editör ve admin hesaplarını yönetin. Geçici parolalar yalnızca bir kez gösterilir."
      />

      <section className={s.formKutu} aria-labelledby="yeni-hesap-baslik">
        <h2 className={s.formBaslik} id="yeni-hesap-baslik">Yeni hesap</h2>
        <p className={s.formAciklama}>
          Hesap ilk girişte parolasını değiştirmek zorundadır. Parolayı güvenli bir kanaldan iletin.
        </p>
        <HesapFormu />
      </section>

      <section aria-labelledby="hesap-listesi-baslik">
        <h2 className={s.bolumBaslik} id="hesap-listesi-baslik">Hesap listesi</h2>
        <HesapTablosu hesaplar={hesaplar} kendiId={kullanici.id} />
      </section>
    </>
  );
}
