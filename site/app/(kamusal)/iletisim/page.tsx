import type { Metadata } from 'next';
import s from '../metin.module.css';

export const metadata: Metadata = {
  title: 'İletişim',
  description: 'YouTube Filter Store için soru, hata bildirimi ve veri taleplerini GitHub Issues üzerinden iletin.',
};

export default function IletisimSayfasi() {
  return (
    <article className={s.metin} aria-labelledby="iletisim-baslik">
      <h1 id="iletisim-baslik">İletişim</h1>
      <p className={s.ust}>Tek kanal: GitHub Issues</p>

      <p className={s.giris}>
        Soru, hata bildirimi, veri düzeltme veya silme taleplerinizi proje deposundaki issue
        sayfasından iletebilirsiniz. Site üzerinde e-posta formu veya iletişim formu bulunmaz.
      </p>

      <section className={s.bolum} aria-labelledby="issue-baslik">
        <h2 id="issue-baslik">GitHub Issues</h2>
        <p>
          Yeni bir konu açmak veya mevcut konuları incelemek için{' '}
          <a href="https://github.com/TalhaOzz/YouTubeFilter/issues">
            github.com/TalhaOzz/YouTubeFilter/issues
          </a>{' '}
          adresini kullanın.
        </p>
        <p>
          Bildiriminizde sayfanın adresini, beklenen davranışı ve gördüğünüz sonucu paylaşmanız
          incelemeyi hızlandırır. Parola, çerez değeri veya ham IP adresi gibi hassas bilgileri
          issue içeriğine yazmayın.
        </p>
      </section>

      <div className={s.not}>
        <p>
          Gizlilik uygulamalarımız hakkında ayrıntı için <a href="/gizlilik">gizlilik sayfasına</a>,
          kullanım kuralları için <a href="/kosullar">kullanım koşullarına</a> bakabilirsiniz.
        </p>
      </div>
    </article>
  );
}
