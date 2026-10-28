import Link from 'next/link';
import type { KayitSonucu } from '../../lib/ortak.ts';
import type { HedefTuru } from '../../lib/tipler.ts';
import { Rozet } from './rozet.tsx';
import { etiketAdi, konuAdi } from './taksonomi-adlari.ts';
import s from './icerik-karti.module.css';

/**
 * `IcerikListeOgesi` ile yapısal olarak uyumludur. Bileşen Task 6'dan önce
 * yazıldığı için depo tipine doğrudan bağlanmaz; alanlar isteğe bağlıdır.
 */
export interface IcerikKartiKaydi {
  tur: HedefTuru;
  id: string;
  baslik: string;
  kanalId?: string | null;
  kanalAdi?: string | null;
  kanalHandle?: string | null;
  avatar?: string | null;
  olusturma?: Date | string;
  arsivlendi?: boolean;
  sonuc: KayitSonucu;
  kilitli?: boolean;
  oySayisi: number;
}

interface Cip {
  tur: 'konu' | 'etiket';
  id: string;
  ad: string;
}

/** Kamusal listelerde kullanılan içerik kartı: kapak/avatar, başlık, kanal ve sonuç çipleri. */
export function IcerikKarti({
  kayit,
  oncelik = false,
}: {
  kayit: IcerikKartiKaydi;
  /** Görselin sayfa açılışında hemen yüklenmesi gerekiyorsa true. */
  oncelik?: boolean;
}) {
  const video = kayit.tur === 'video';
  const kapak = video ? `https://i.ytimg.com/vi/${kayit.id}/hqdefault.jpg` : kayit.avatar ?? null;
  const alt = video
    ? `${kayit.baslik} videosunun kapağı`
    : `${kayit.baslik} kanalının avatarı`;
  const harf = (kayit.baslik.trim()[0] ?? '?').toLocaleUpperCase('tr-TR');
  const kanal = video
    ? kayit.kanalAdi ?? kayit.kanalHandle ?? null
    : kayit.kanalHandle ?? null;

  const cipsler: Cip[] = [];
  if (kayit.sonuc.anaKonu) {
    cipsler.push({ tur: 'konu', id: kayit.sonuc.anaKonu, ad: konuAdi(kayit.sonuc.anaKonu) });
  }
  for (const id of kayit.sonuc.etiketler.slice(0, 2)) {
    cipsler.push({ tur: 'etiket', id, ad: etiketAdi(id) });
  }
  const kalanEtiket = Math.max(0, kayit.sonuc.etiketler.length - 2);

  return (
    <article className={s.kart}>
      <Link href={`/icerik/${kayit.tur}/${kayit.id}`} className={s.bag}>
        <span className={s.kapak}>
          {kapak ? (
            <img
              src={kapak}
              alt={alt}
              width={video ? 480 : 96}
              height={video ? 270 : 96}
              loading={oncelik ? 'eager' : 'lazy'}
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className={s.harf} aria-hidden="true">{harf}</span>
          )}
        </span>

        <span className={s.govde}>
          <span className={s.ust}>
            <span className={s.tur}>{video ? 'Video' : 'Kanal'}</span>
            <span className={s.oy}>{kayit.oySayisi} oy</span>
          </span>

          <span className={s.baslik}>{kayit.baslik}</span>
          {kanal ? <span className={s.kanal}>{kanal}</span> : null}

          <span className={s.sonuc}>
            {kayit.kilitli ? <Rozet tur="kilitli">Kilitli</Rozet> : null}
            {cipsler.map((cip) => (
              <Rozet key={`${cip.tur}:${cip.id}`} tur={cip.tur}>
                {cip.ad}
              </Rozet>
            ))}
            {kalanEtiket ? <span className={s.kalan}>+{kalanEtiket}</span> : null}
            {!kayit.kilitli && !cipsler.length ? (
              <Rozet tur="kararsiz">Sonuç bekliyor</Rozet>
            ) : null}
          </span>
        </span>
      </Link>
    </article>
  );
}
