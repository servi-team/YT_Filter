import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '../../../lib/db.ts';
import { linkIleKayitBul } from '../../../lib/icerik-deposu.ts';
import { linkCoz } from '../../../lib/youtube-link.ts';
import { HataMetni } from '../../bilesenler/hata-metni.tsx';
import { SayfaBasligi } from '../../bilesenler/sayfa-basligi.tsx';
import { TalepFormu } from '../../bilesenler/talep-formu.tsx';
import s from './link.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Link ekle',
  description: 'Kayıtsız bir YouTube videosu veya kanalı için ekleme talebi gönderin.',
};

type SayfaProps = {
  searchParams: Promise<{ url?: string | string[] }>;
};

/**
 * Kayıtsız/arşivli link için ince talep sayfası. Sayfa açılışında dış
 * metadata servisi çağrılmaz; yalnızca link türü/kimliği ve yapıştırılan
 * adres gösterilir. Aktif kayıt varsa içerik sayfasına yönlendirilir.
 */
export default async function LinkSayfasi({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const ham = parametreler.url;
  const url = typeof ham === 'string' ? ham.trim() : '';

  if (!url) {
    return (
      <>
        <SayfaBasligi
          baslik="Link ekle"
          aciklama="Kayıtsız bir YouTube videosu veya kanalı için ekleme talebi gönderin."
        />
        <div className={s.govde}>
          <p>
            Ana sayfadaki link alanına bir YouTube video veya kanal bağlantısı yapıştırın.
            Kayıtlı içerikler doğrudan sayfasına gider; kayıtsız veya arşivli içerikler burada talebe dönüşür.
          </p>
          <p className={s.geri}>
            <Link className={s.bag} href="/">← Ana sayfaya dön</Link>
          </p>
        </div>
      </>
    );
  }

  const cozulen = linkCoz(url);
  if (cozulen.tur === 'hata') {
    return (
      <>
        <SayfaBasligi
          baslik="Link incelenemedi"
          aciklama="Yapıştırılan bağlantı çözümlenemedi."
        />
        <div className={s.govde}>
          <HataMetni mesaj={cozulen.neden} />
          <p className={s.geri}>
            <Link className={s.bag} href="/">← Ana sayfaya dön</Link>
          </p>
        </div>
      </>
    );
  }

  const veritabani = await db();
  const bulunan = await linkIleKayitBul(veritabani, cozulen);

  if (bulunan && !bulunan.arsivli) {
    redirect(`/icerik/${bulunan.kayit.tur}/${bulunan.kayit.id}`);
  }

  const arsivli = bulunan?.arsivli === true;
  const tur = cozulen.tur === 'video' ? 'Video' : 'Kanal';
  const kimlik = cozulen.tur === 'video'
    ? cozulen.id
    : ('handle' in cozulen ? cozulen.handle : cozulen.id);

  return (
    <>
      <SayfaBasligi
        baslik={arsivli ? 'Arşivdeki içerik' : 'Bu içerik henüz kayıtlı değil.'}
        aciklama={arsivli
          ? 'Bu içerik arşivde; talep göndererek geri getirilmesini isteyebilirsiniz.'
          : 'Talebiniz editör kuyruğuna düşer; aynı bağlantı için gelen talepler tek kayıtta birleşir.'}
      />

      <div className={s.govde}>
        {arsivli && bulunan ? (
          <p className={s.mevcutBaslik}>{bulunan.kayit.baslik}</p>
        ) : null}

        <dl className={s.kunye}>
          <div>
            <dt>Tür</dt>
            <dd>{tur}</dd>
          </div>
          <div>
            <dt>{cozulen.tur === 'video' ? 'Video kimliği' : 'Kanal'}</dt>
            <dd><code>{kimlik}</code></dd>
          </div>
          <div>
            <dt>Yapıştırılan bağlantı</dt>
            <dd><code className={s.adres}>{url}</code></dd>
          </div>
        </dl>

        <TalepFormu url={url} />

        <p className={s.not}>
          Aynı bağlantı için tekrar gönderilen talepler tek kayıtta birleşir; talep sayısı artar.
        </p>
        <p className={s.geri}>
          <Link className={s.bag} href="/">← Ana sayfaya dön</Link>
        </p>
      </div>
    </>
  );
}
