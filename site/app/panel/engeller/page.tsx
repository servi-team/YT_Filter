import type { Metadata } from 'next';
import { db } from '../../../lib/db.ts';
import { engelleriListele } from '../../../lib/moderasyon-deposu.ts';
import { sunucuRolGerekli } from '../../../lib/sunucu-oturum.ts';
import { BosDurum } from '../../bilesenler/bos-durum.tsx';
import { EngelListesi } from '../../bilesenler/engel-listesi.tsx';
import { SayfaBasligi } from '../../bilesenler/sayfa-basligi.tsx';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Engeller',
  description: 'Çerez ve ağ engellerini görün, sürelerini izleyin ve gerekçeyle kaldırın.',
};

export default async function PanelEngellerSayfasi() {
  await sunucuRolGerekli(['editor', 'admin']);
  const veritabani = await db();
  const engeller = await engelleriListele(veritabani);

  return (
    <>
      <SayfaBasligi
        baslik="Engeller"
        aciklama="Yalnızca süresi dolmamış engeller listelenir; kimlikler kısa takma etiketlerle gösterilir."
      />

      {engeller.length ? (
        <EngelListesi engeller={engeller} />
      ) : (
        <BosDurum
          baslik="Aktif engel yok."
          aciklama="Bir oy satırından çerez veya ağ engeli eklendiğinde burada görünecek."
        />
      )}
    </>
  );
}
