import Link from 'next/link';
import { db } from '../../lib/db.ts';
import { sonIcerikler, siteIstatistikleri } from '../../lib/icerik-deposu.ts';
import { BosDurum } from '../bilesenler/bos-durum.tsx';
import { dugmeSinifi } from '../bilesenler/dugme.tsx';
import { IcerikKarti } from '../bilesenler/icerik-karti.tsx';
import { Kalkan } from '../bilesenler/kalkan.tsx';
import { LinkFormu } from '../bilesenler/link-formu.tsx';
import s from './ana-sayfa.module.css';

export const dynamic = 'force-dynamic';

const ADIMLAR = [
  'Linki yapıştır',
  'Konu ve etiketleri oyla',
  'Sonuç eklentiye gider',
] as const;

export default async function AnaSayfa() {
  const veritabani = await db();
  const sonKayitlar = await sonIcerikler(veritabani, 6);
  const istatistik = await siteIstatistikleri(veritabani);
  const sonKayit = sonKayitlar[0] ?? null;

  return (
    <>
      <section className={s.kahraman} aria-labelledby="ana-baslik">
        <div className={s.metin}>
          <p className={s.ustEtiket}>
            <span className={s.isaret} aria-hidden="true" />
            Topluluk kütüphanesi
          </p>

          <h1 id="ana-baslik" className={s.baslik}>
            YouTube’un gürültüsünü birlikte süzüyoruz.
          </h1>

          <p className={s.giris}>
            Video ve kanalların konusunu, uyarı etiketlerini topluluk oylarıyla belirliyoruz. Hesap gerekmez.
          </p>

          <div className={s.linkAlani}>
            <LinkFormu />
          </div>
          <p className={s.ipucu}>Video, kanal veya @handle bağlantısı yapıştırın.</p>

          <dl className={s.istatistikler}>
            <div className={s.istatistik}>
              <dt>kayıt</dt>
              <dd>{istatistik.kayit}</dd>
            </div>
            <div className={s.istatistik}>
              <dt>oy</dt>
              <dd>{istatistik.oy}</dd>
            </div>
            <div className={s.istatistik}>
              <dt>veri sürümü</dt>
              <dd className={istatistik.yayinSurumu === null ? s.yayinYok : undefined}>
                {istatistik.yayinSurumu === null ? 'Henüz yayın yok' : `v${istatistik.yayinSurumu}`}
              </dd>
            </div>
          </dl>
        </div>

        <aside className={s.yan} aria-label="Son eklenen kayıt">
          <div className={s.yanUst}>
            <span>Son eklenen</span>
            <Link className={s.yanBag} href="/kesfet">
              Tümü <span aria-hidden="true">→</span>
            </Link>
          </div>

          {sonKayit ? (
            <IcerikKarti kayit={sonKayit} oncelik />
          ) : (
            <BosDurum baslik="Henüz kayıt yok. İlk kaydı editörler ekler." />
          )}
        </aside>
      </section>

      {sonKayitlar.length > 0 ? (
        <section className={s.bolum} aria-labelledby="son-kayitlar-baslik">
          <div className={s.bolumUst}>
            <h2 id="son-kayitlar-baslik" className={s.bolumBaslik}>Son kayıtlar</h2>
            <Link className={s.bolumBag} href="/kesfet">
              Keşfet <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className={s.izgara}>
            {sonKayitlar.map((kayit, i) => (
              <IcerikKarti
                key={`${kayit.tur}:${kayit.id}`}
                kayit={kayit}
                oncelik={i < 2}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section id="nasil-calisir" className={s.nasil} aria-labelledby="nasil-baslik">
        <div className={s.nasilKalkan} aria-hidden="true">
          <Kalkan boyut={340} kimlik="kalkan-nasil" />
        </div>

        <div className={s.nasilUst}>
          <div>
            <p className={s.nasilEtiket}>Üç adım</p>
            <h2 id="nasil-baslik" className={s.nasilBaslik}>Nasıl çalışır?</h2>
          </div>
          <p className={s.nasilAciklama}>
            Linki bırakın; konu ve uyarı etiketleri topluluk oylarıyla netleşsin. Sonuç, eklentinin okuduğu veri dosyasına yazılır.
          </p>
        </div>

        <ol className={s.adimlar}>
          {ADIMLAR.map((adim, i) => (
            <li key={adim} className={s.adim}>
              <span className={s.adimNo}>{String(i + 1).padStart(2, '0')}</span>
              <h3 className={s.adimBaslik}>{adim}</h3>
              {i < ADIMLAR.length - 1 ? (
                <span className={s.adimOk} aria-hidden="true">→</span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className={s.veri} aria-labelledby="veri-baslik">
        <div>
          <p className={s.veriEtiket}>Açık veri</p>
          <h2 id="veri-baslik" className={s.veriBaslik}>Sonuçlar tek dosyada.</h2>
          <p className={s.veriMetin}>
            Eklentinin kullandığı <code>db.json</code> dosyasını indirin. Dosya, yayınlanan konu ve etiket sonuçlarını taşır.
          </p>
        </div>
        <div className={s.veriEylem}>
          <a className={dugmeSinifi('birincil')} href="/db.json" download>
            db.json indir <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>
    </>
  );
}
