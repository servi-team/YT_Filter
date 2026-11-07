import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { db } from '../../../../../lib/db.ts';
import { icerikGetir, videoKapak } from '../../../../../lib/icerik-deposu.ts';
import { benimOylarim } from '../../../../../lib/oy-deposu.ts';
import { taksonomi } from '../../../../../lib/ortak.ts';
import { ZIYARETCI_CEREZI, ziyaretciKimligiCoz } from '../../../../../lib/ziyaretci.ts';
import type { HedefTuru } from '../../../../../lib/tipler.ts';
import { OyAlani } from '../../../../bilesenler/oy-alani.tsx';
import { Rozet } from '../../../../bilesenler/rozet.tsx';
import s from './icerik.module.css';

export const dynamic = 'force-dynamic';

type SayfaProps = {
  params: Promise<{ tur: string; id: string }>;
};

function turCoz(tur: string): HedefTuru | null {
  return tur === 'kanal' || tur === 'video' ? tur : null;
}

function youtubeAdresi(tur: HedefTuru, id: string): string {
  return tur === 'video'
    ? `https://www.youtube.com/watch?v=${id}`
    : `https://www.youtube.com/channel/${id}`;
}

export async function generateMetadata({ params }: SayfaProps): Promise<Metadata> {
  const { tur, id } = await params;
  const hedefTuru = turCoz(tur);
  if (!hedefTuru) return { title: 'İçerik' };

  const detay = await icerikGetir(await db(), hedefTuru, id);
  if (!detay) return { title: 'İçerik' };

  return {
    // Kök şablon başlık eklemesin diye absolute kullanılır.
    title: { absolute: `${detay.icerik.baslik} — YouTube Filter Store` },
    description: `${detay.icerik.baslik} için topluluk konu ve etiket oyları.`,
  };
}

export default async function IcerikSayfasi({ params }: SayfaProps) {
  const { tur, id } = await params;
  const hedefTuru = turCoz(tur);
  if (!hedefTuru) notFound();

  const veritabani = await db();
  const detay = await icerikGetir(veritabani, hedefTuru, id);
  if (!detay) notFound();

  const cerezler = await cookies();
  const kimlik = ziyaretciKimligiCoz(cerezler.get(ZIYARETCI_CEREZI)?.value ?? null);
  const oylar = kimlik ? await benimOylarim(veritabani, hedefTuru, id, kimlik) : [];

  const { icerik, sayimlar, sonuc, kilitliSonuc, kilit } = detay;
  const video = hedefTuru === 'video';
  const kapak = video ? videoKapak(id) : icerik.avatar;
  const harf = (icerik.baslik.trim()[0] ?? '?').toLocaleUpperCase('tr-TR');
  const konular = taksonomi.KONULAR.map(({ id: konuId, ad, aciklama }) => ({ id: konuId, ad, aciklama }));
  const etiketler = taksonomi.ETIKETLER.map(({ id: etiketId, ad, aciklama }) => ({ id: etiketId, ad, aciklama }));
  const disAdres = youtubeAdresi(hedefTuru, id);

  return (
    <article className={s.icerik}>
      <nav className={s.geri} aria-label="Geri dönüş">
        <Link href="/kesfet">← Keşfet’e dön</Link>
      </nav>

      <header className={s.baslikAlani}>
        <div className={`${s.kapak} ${video ? '' : s.kapakKucuk}`.trim()}>
          {kapak ? (
            <img
              src={kapak}
              alt={video ? `${icerik.baslik} videosunun kapağı` : `${icerik.baslik} kanalının avatarı`}
              width={video ? 480 : 96}
              height={video ? 270 : 96}
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className={s.harf} aria-hidden="true">{harf}</span>
          )}
        </div>

        <div className={s.baslikMetni}>
          <p className={s.tur}>{video ? 'Video' : 'Kanal'}</p>
          <h1 className={s.baslik}>{icerik.baslik}</h1>

          {video && (icerik.kanalAdi || icerik.kanalHandle) ? (
            <p className={s.kanal}>
              {icerik.kanalAdi ?? icerik.kanalHandle}
              {icerik.kanalAdi && icerik.kanalHandle ? <span className={s.ayrac}> · </span> : null}
              {icerik.kanalAdi && icerik.kanalHandle ? icerik.kanalHandle : null}
            </p>
          ) : null}

          {!video && icerik.kanalHandle ? (
            <p className={s.kanal}>{icerik.kanalHandle}</p>
          ) : null}

          <a className={s.disBag} href={disAdres} target="_blank" rel="noreferrer">
            YouTube’da aç <span aria-hidden="true">↗</span>
          </a>

          {kilit ? (
            <div className={s.kilitBandi} role="note">
              <Rozet tur="kilitli">Kilitli</Rozet>
              <span>
                Sonuç donduruldu; yeni oylar sayılır ama sonuç değişmez.
                {kilit.gerekce ? <span className={s.kilitGerekce}> Gerekçe: {kilit.gerekce}</span> : null}
              </span>
            </div>
          ) : null}
        </div>
      </header>

      <OyAlani
        hedef={{ tur: hedefTuru, id }}
        baslangicSayimlar={sayimlar}
        baslangicSonuc={sonuc}
        kilitliSonuc={kilitliSonuc}
        benimOylarim={oylar}
        konular={konular}
        etiketler={etiketler}
      />
    </article>
  );
}
