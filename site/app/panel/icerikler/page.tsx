import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '../../../lib/db.ts';
import { icerikListele } from '../../../lib/icerik-deposu.ts';
import { sunucuRolGerekli } from '../../../lib/sunucu-oturum.ts';
import { BosDurum } from '../../bilesenler/bos-durum.tsx';
import { Dugme } from '../../bilesenler/dugme.tsx';
import { IcerikEkleFormu } from '../../bilesenler/icerik-ekle-formu.tsx';
import { SayfaBasligi } from '../../bilesenler/sayfa-basligi.tsx';
import { etiketAdi, konuAdi } from '../../bilesenler/taksonomi-adlari.ts';
import s from '../panel.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Panel içerikleri',
  description: 'Kayıtları arayın, yeni video veya kanal ekleyin.',
};

type SayfaProps = {
  searchParams: Promise<{ arama?: string | string[] }>;
};

export default async function PanelIceriklerSayfasi({ searchParams }: SayfaProps) {
  await sunucuRolGerekli(['editor', 'admin']);
  const parametreler = await searchParams;
  const arama = typeof parametreler.arama === 'string' ? parametreler.arama.trim() : '';

  const veritabani = await db();
  const sonuc = await icerikListele(veritabani, {
    arama: arama || undefined,
    sayfaBoyu: 50,
  });

  return (
    <>
      <SayfaBasligi
        baslik="İçerikler"
        aciklama="Kayıtları arayın; yeni bir YouTube videosu veya kanalı ekleyin."
      />

      <div className={s.formKutu}>
        <IcerikEkleFormu />
      </div>

      <form className={s.aramaFormu} action="/panel/icerikler" method="get" role="search">
        <label htmlFor="panel-arama" className={s.gizli}>İçerik ara</label>
        <input
          id="panel-arama"
          className={s.aramaGirdi}
          type="search"
          name="arama"
          defaultValue={arama}
          placeholder="Başlık veya kanal ara"
          autoComplete="off"
          spellCheck={false}
        />
        <Dugme type="submit" tur="ikincil">Ara</Dugme>
      </form>

      {sonuc.kayitlar.length ? (
        <div className={s.tabloSar}>
          <table className={s.tablo}>
            <thead>
              <tr>
                <th scope="col">Başlık</th>
                <th scope="col">Tür</th>
                <th scope="col">Sonuç</th>
                <th scope="col">Oy</th>
                <th scope="col">Kilit</th>
                <th scope="col">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {sonuc.kayitlar.map((kayit) => (
                <tr key={`${kayit.tur}:${kayit.id}`}>
                  <td>
                    <Link className={s.tabloBag} href={`/icerik/${kayit.tur}/${kayit.id}`}>
                      <span className={s.tabloBaslik}>{kayit.baslik}</span>
                    </Link>
                  </td>
                  <td><span className={s.turEtiket}>{kayit.tur === 'video' ? 'Video' : 'Kanal'}</span></td>
                  <td>
                    {kayit.sonuc.anaKonu
                      ? konuAdi(kayit.sonuc.anaKonu)
                      : kayit.sonuc.etiketler.length
                        ? kayit.sonuc.etiketler.map((id) => etiketAdi(id)).join(', ')
                        : 'Sonuç bekliyor'}
                  </td>
                  <td>{kayit.oySayisi}</td>
                  <td>{kayit.kilitli ? 'Kilitli' : '—'}</td>
                  <td>
                    <Link
                      className={s.tabloBag}
                      href={`/panel/icerikler/${kayit.tur}/${encodeURIComponent(kayit.id)}`}
                      aria-label={`${kayit.baslik} kaydının oylarını ve kilidini yönet`}
                    >
                      Oyları yönet
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <BosDurum
          baslik={arama ? 'Bu aramada kayıt bulunamadı.' : 'Henüz kayıt yok.'}
          aciklama={arama
            ? `“${arama}” için sonuç yok. Farklı bir terim deneyin.`
            : 'Yukarıdaki alandan ilk video veya kanalı ekleyin.'}
          eylem={arama ? <Link href="/panel/icerikler">Aramayı temizle</Link> : undefined}
        />
      )}
    </>
  );
}
