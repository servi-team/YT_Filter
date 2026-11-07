import type { Metadata } from 'next';
import Link from 'next/link';
import { adminIcerikListele } from '../../../lib/arsiv-deposu.ts';
import { db } from '../../../lib/db.ts';
import { sunucuRolGerekli } from '../../../lib/sunucu-oturum.ts';
import { ArsivEylemi } from '../../bilesenler/arsiv-dialogu.tsx';
import { BosDurum } from '../../bilesenler/bos-durum.tsx';
import { Dugme } from '../../bilesenler/dugme.tsx';
import { SayfaBasligi } from '../../bilesenler/sayfa-basligi.tsx';
import s from './admin-icerik.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin içerikleri',
  description: 'İçerikleri arayın, arşivleyin, geri getirin ve metadata düzeltin.',
};

const tarihBicimi = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeZone: 'Europe/Istanbul',
});

type SayfaProps = {
  searchParams: Promise<{ durum?: string | string[]; arama?: string | string[] }>;
};

export default async function AdminIceriklerSayfasi({ searchParams }: SayfaProps) {
  await sunucuRolGerekli(['admin']);
  const parametreler = await searchParams;
  const durum = parametreler.durum === 'arsiv' ? 'arsiv' : 'aktif';
  const arama = typeof parametreler.arama === 'string' ? parametreler.arama.trim() : '';

  const veritabani = await db();
  const kayitlar = await adminIcerikListele(veritabani, { durum, arama: arama || undefined });

  const aktifBag = `/admin/icerikler${arama ? `?arama=${encodeURIComponent(arama)}` : ''}`;
  const arsivBag = `/admin/icerikler?durum=arsiv${arama ? `&arama=${encodeURIComponent(arama)}` : ''}`;

  return (
    <>
      <SayfaBasligi
        baslik="İçerikler"
        aciklama="Kanal ve videoları arşivleyin, geri getirin; başlık ve kanal bilgilerini düzeltin."
      />

      <nav className={s.sekmeler} aria-label="İçerik durumu">
        <Link
          className={`${s.sekme} ${durum === 'aktif' ? s.sekmeAktif : ''}`}
          href={aktifBag}
          aria-current={durum === 'aktif' ? 'page' : undefined}
        >
          Aktif
        </Link>
        <Link
          className={`${s.sekme} ${durum === 'arsiv' ? s.sekmeAktif : ''}`}
          href={arsivBag}
          aria-current={durum === 'arsiv' ? 'page' : undefined}
        >
          Arşiv
        </Link>
      </nav>

      <form className={s.aramaFormu} action="/admin/icerikler" method="get" role="search">
        <input type="hidden" name="durum" value={durum} />
        <label htmlFor="admin-icerik-arama" className={s.sekmeAktif ? 'gizli' : undefined} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
          İçerik ara
        </label>
        <input
          id="admin-icerik-arama"
          className={s.aramaGirdi}
          type="search"
          name="arama"
          defaultValue={arama}
          placeholder="Başlık, kanal adı veya handle ara"
          autoComplete="off"
          spellCheck={false}
        />
        <Dugme type="submit" tur="ikincil">Ara</Dugme>
      </form>

      {kayitlar.length ? (
        <div className={s.tabloSar}>
          <table className={s.tablo}>
            <thead>
              <tr>
                <th scope="col">Başlık</th>
                <th scope="col">Tür</th>
                <th scope="col">Oy</th>
                <th scope="col">Kilit</th>
                <th scope="col">Oluşturma</th>
                <th scope="col">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {kayitlar.map((kayit) => (
                <tr key={`${kayit.tur}:${kayit.id}`}>
                  <td data-etiket="Başlık">
                    <Link
                      className={s.tabloBag}
                      href={`/admin/icerikler/${kayit.tur}/${encodeURIComponent(kayit.id)}`}
                    >
                      <span className={s.tabloBaslik}>{kayit.baslik}</span>
                    </Link>
                    <code className={s.kimlik}>{kayit.id}</code>
                  </td>
                  <td data-etiket="Tür">
                    <span className={s.turEtiket}>{kayit.tur === 'video' ? 'Video' : 'Kanal'}</span>
                  </td>
                  <td data-etiket="Oy">{kayit.oySayisi}</td>
                  <td data-etiket="Kilit">
                    <span className={`${s.durum} ${kayit.kilitli ? s.durumKilit : s.durumAcik}`}>
                      {kayit.kilitli ? 'Kilitli' : 'Açık'}
                    </span>
                  </td>
                  <td data-etiket="Oluşturma">
                    <time dateTime={kayit.olusturma.toISOString()}>
                      {tarihBicimi.format(kayit.olusturma)}
                    </time>
                  </td>
                  <td data-etiket="İşlem">
                    <div className={s.islemler}>
                      <Link
                        className={s.tabloBag}
                        href={`/panel/icerikler/${kayit.tur}/${encodeURIComponent(kayit.id)}`}
                        aria-label={`${kayit.baslik} kaydının oylarını ve kilidini yönet`}
                      >
                        Moderasyon
                      </Link>
                      <ArsivEylemi
                        tur={kayit.tur}
                        id={kayit.id}
                        baslik={kayit.baslik}
                        arsivli={durum === 'arsiv'}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <BosDurum
          baslik={arama ? 'Bu aramada kayıt bulunamadı.' : durum === 'arsiv' ? 'Arşivde kayıt yok.' : 'Aktif kayıt yok.'}
          aciklama={arama
            ? `“${arama}” için sonuç yok. Farklı bir terim deneyin.`
            : durum === 'arsiv'
              ? 'Arşivlenen kayıtlar burada görünecek.'
              : 'Panelden eklenen kanal ve videolar burada listelenir.'}
          eylem={arama ? <Link href={`/admin/icerikler?durum=${durum}`}>Aramayı temizle</Link> : undefined}
        />
      )}
    </>
  );
}
