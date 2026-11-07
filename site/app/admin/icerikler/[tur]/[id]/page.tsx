import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '../../../../../lib/db.ts';
import { icerikGetir } from '../../../../../lib/icerik-deposu.ts';
import { toplamOy } from '../../../../../lib/oy-hesabi.ts';
import { sunucuRolGerekli } from '../../../../../lib/sunucu-oturum.ts';
import { ArsivEylemi } from '../../../../bilesenler/arsiv-dialogu.tsx';
import { MetadataFormu } from '../../../../bilesenler/metadata-formu.tsx';
import { SayfaBasligi } from '../../../../bilesenler/sayfa-basligi.tsx';
import s from '../../admin-icerik.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'İçerik düzenle',
  description: 'Kanal veya video metadata bilgilerini düzeltin ve arşiv durumunu yönetin.',
};

const tarihBicimi = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Istanbul',
});

type SayfaProps = {
  params: Promise<{ tur: string; id: string }>;
};

export default async function AdminIcerikDetaySayfasi({ params }: SayfaProps) {
  await sunucuRolGerekli(['admin']);

  const { tur, id } = await params;
  if (tur !== 'kanal' && tur !== 'video') notFound();

  const veritabani = await db();
  const detay = await icerikGetir(veritabani, tur, id)
    ?? await icerikGetir(veritabani, tur, id, { durum: 'arsiv' });
  if (!detay) notFound();

  const { icerik, sayimlar, kilit } = detay;
  const oySayisi = [...Object.values(sayimlar.konular), ...Object.values(sayimlar.etiketler)]
    .reduce((toplam, sayim) => toplam + toplamOy(sayim), 0);
  const geriBag = icerik.arsivlendi ? '/admin/icerikler?durum=arsiv' : '/admin/icerikler';

  const baslangic = tur === 'kanal'
    ? {
        ad: icerik.kanalAdi,
        handle: icerik.kanalHandle,
        avatar: icerik.avatar,
        baslik: null,
        kanalAdi: null,
        kanalHandle: null,
        kanalAvatar: null,
      }
    : {
        ad: null,
        handle: null,
        avatar: null,
        baslik: icerik.baslik,
        kanalAdi: icerik.kanalAdi,
        kanalHandle: icerik.kanalHandle,
        kanalAvatar: icerik.avatar,
      };

  return (
    <>
      <SayfaBasligi
        baslik={icerik.baslik}
        aciklama={`${tur === 'kanal' ? 'Kanal' : 'Video'} · Kayıt kimliği ${id}`}
        eylem={(
          <>
            <Link href={`/panel/icerikler/${tur}/${encodeURIComponent(id)}`}>
              Oyları ve kilidi yönet
            </Link>
            <Link href={geriBag}>İçeriklere dön</Link>
          </>
        )}
      />

      {icerik.arsivlendi ? (
        <section className={s.arsivBandi} aria-label="Arşiv durumu">
          <div>
            <p className={s.arsivMetin}>Arşivde</p>
            <p className={s.arsivNot}>
              Bu kayıt kamusal listelerde ve yayın adayında görünmez. Oylar ve kilit korunur.
            </p>
          </div>
          <ArsivEylemi tur={tur} id={id} baslik={icerik.baslik} arsivli />
        </section>
      ) : null}

      <section className={s.bolum} aria-labelledby="kayit-ozeti-baslik">
        <h2 className={s.bolumBaslik} id="kayit-ozeti-baslik">Kayıt özeti</h2>
        <dl className={s.ozet}>
          <div className={s.ozetOge}>
            <dt className={s.ozetEtiket}>Tür</dt>
            <dd className={s.ozetDeger}>{tur === 'kanal' ? 'Kanal' : 'Video'}</dd>
          </div>
          <div className={s.ozetOge}>
            <dt className={s.ozetEtiket}>Oy</dt>
            <dd className={s.ozetDeger}>{oySayisi}</dd>
          </div>
          <div className={s.ozetOge}>
            <dt className={s.ozetEtiket}>Kilit</dt>
            <dd className={s.ozetDeger}>{kilit ? 'Kilitli' : 'Açık'}</dd>
          </div>
          <div className={s.ozetOge}>
            <dt className={s.ozetEtiket}>Oluşturma</dt>
            <dd className={s.ozetDeger}>
              <time dateTime={icerik.olusturma.toISOString()}>
                {tarihBicimi.format(icerik.olusturma)}
              </time>
            </dd>
          </div>
          <div className={s.ozetOge}>
            <dt className={s.ozetEtiket}>Kimlik</dt>
            <dd className={s.ozetDeger}><code className={s.kimlik}>{id}</code></dd>
          </div>
        </dl>
        {kilit ? <p className={s.meta}>Kilit gerekçesi: {kilit.gerekce}</p> : null}
      </section>

      <section className={s.bolum} aria-labelledby="metadata-baslik">
        <h2 className={s.bolumBaslik} id="metadata-baslik">Metadata düzelt</h2>
        <p className={s.meta}>
          {tur === 'kanal'
            ? 'Kanal adı, handle ve avatar bilgisini düzeltin. Boş alanlar temizlenir.'
            : 'Video başlığı ve kanal bilgilerini düzeltin. Bu işlem yeni bir kanal kaydı oluşturmaz.'}
        </p>
        <MetadataFormu tur={tur} id={id} baslangic={baslangic} />
      </section>
    </>
  );
}
