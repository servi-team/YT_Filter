import type { Metadata } from 'next';
import { db } from '../../../lib/db.ts';
import { yayinAdayiUret, yayinGecmisi } from '../../../lib/yayin-deposu.ts';
import { BosDurum } from '../../bilesenler/bos-durum.tsx';
import { SayfaBasligi } from '../../bilesenler/sayfa-basligi.tsx';
import { YayinOnizleme } from '../../bilesenler/yayin-onizleme.tsx';
import a from '../admin.module.css';
import s from './yayin.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Yayınlar',
  description: 'db.json dosyasını önizleyin, yayınlayın ve eski sürümleri indirin.',
};

const tarihBicimi = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Istanbul',
});

export default async function AdminYayinlarSayfasi() {
  const veritabani = await db();
  const [aday, gecmis] = await Promise.all([
    yayinAdayiUret(veritabani),
    yayinGecmisi(veritabani),
  ]);

  return (
    <>
      <SayfaBasligi
        baslik="Yayınlar"
        aciklama="Yayın adayını önizleyin, yeni bir db.json sürümü yayınlayın ve eski sürümleri indirin."
      />

      <section aria-labelledby="yayin-onizleme-baslik">
        <h2 className={a.bolumBaslik} id="yayin-onizleme-baslik">Yeni yayın</h2>
        <YayinOnizleme baslangic={aday} />
      </section>

      <section className={a.bolum} aria-labelledby="yayin-gecmisi-baslik">
        <h2 className={a.bolumBaslik} id="yayin-gecmisi-baslik">Yayın geçmişi</h2>
        {gecmis.length === 0 ? (
          <BosDurum
            baslik="Henüz yayınlanmış sürüm yok"
            aciklama="İlk sürümü yayınladığınızda burada tarih, sayılar ve indirme bağlantısıyla listelenir."
          />
        ) : (
          <div className={a.tabloSar}>
            <table className={a.tablo}>
              <thead>
                <tr>
                  <th>Sürüm</th>
                  <th>Tarih</th>
                  <th>Kanal</th>
                  <th>Video</th>
                  <th>Onaylayan</th>
                  <th>Not</th>
                  <th>Dosya</th>
                </tr>
              </thead>
              <tbody>
                {gecmis.map((yayin) => (
                  <tr key={yayin.veriSurumu}>
                    <td><strong>v{yayin.veriSurumu}</strong></td>
                    <td>{tarihBicimi.format(yayin.olusturma)}</td>
                    <td>{yayin.kanalSayisi}</td>
                    <td>{yayin.videoSayisi}</td>
                    <td>{yayin.onaylayan ?? '—'}</td>
                    <td>{yayin.notlar ?? '—'}</td>
                    <td>
                      <a href={`/db.json?surum=${yayin.veriSurumu}`}>
                        db.json indir
                        <span className={s.ekranOkuyucu}> (v{yayin.veriSurumu})</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
