import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '../../../lib/db.ts';
import { moderasyonGecmisi } from '../../../lib/moderasyon-deposu.ts';
import { sunucuRolGerekli } from '../../../lib/sunucu-oturum.ts';
import { BosDurum } from '../../bilesenler/bos-durum.tsx';
import { SayfaBasligi } from '../../bilesenler/sayfa-basligi.tsx';
import s from './moderasyon.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Moderasyon geçmişi',
  description: 'Panelde yapılan son moderasyon işlemlerini gerekçeleriyle görün.',
};

const tarihBicimi = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const ISLEM_ADLARI: Record<string, string> = {
  kilitle: 'Kilitlendi',
  'kilit-ac': 'Kilit açıldı',
  'oy-geri-al': 'Oy geri alındı',
  engelle: 'Engellendi',
  'engel-kaldir': 'Engel kaldırıldı',
  'hesap-olustur': 'Hesap oluşturuldu',
  'rol-degistir': 'Rol değişti',
  aktiflik: 'Aktiflik değişti',
  'parola-sifirla': 'Parola sıfırlandı',
};

export default async function PanelModerasyonSayfasi() {
  await sunucuRolGerekli(['editor', 'admin']);
  const veritabani = await db();
  const kayitlar = await moderasyonGecmisi(veritabani, { limit: 100 });

  return (
    <>
      <SayfaBasligi
        baslik="Moderasyon geçmişi"
        aciklama="Son 100 işlem; her satır hedefi, gerekçesi ve işlemi yapan hesapla listelenir."
      />

      {kayitlar.length ? (
        <div className={s.tabloSar}>
          <table className={s.tablo}>
            <thead>
              <tr>
                <th scope="col">İşlem</th>
                <th scope="col">Hedef</th>
                <th scope="col">Gerekçe</th>
                <th scope="col">Zaman</th>
                <th scope="col">Yapan</th>
              </tr>
            </thead>
            <tbody>
              {kayitlar.map((kayit) => (
                <tr key={kayit.id}>
                  <td data-etiket="İşlem">
                    <span className={s.islem}>{ISLEM_ADLARI[kayit.islem] ?? kayit.islem}</span>
                  </td>
                  <td data-etiket="Hedef">
                    {kayit.hedefTuru && kayit.hedefId ? (
                      <Link
                        className={s.hedefBag}
                        href={`/panel/icerikler/${kayit.hedefTuru}/${kayit.hedefId}`}
                      >
                        {kayit.hedefTuru === 'kanal' ? 'Kanal' : 'Video'} · {kayit.hedefId}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td data-etiket="Gerekçe">{kayit.gerekce ?? '—'}</td>
                  <td data-etiket="Zaman">
                    <time dateTime={kayit.zaman.toISOString()}>{tarihBicimi.format(kayit.zaman)}</time>
                  </td>
                  <td data-etiket="Yapan">{kayit.yapanEposta ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <BosDurum
          baslik="Henüz moderasyon işlemi yok."
          aciklama="Geri alma, kilit ve engel işlemleri burada gerekçeleriyle görünecek."
        />
      )}
    </>
  );
}
