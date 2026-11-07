import type { Metadata } from 'next';
import Link from 'next/link';
import s from '../metin.module.css';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları',
  description: 'YouTube Filter Store sitesinin kullanım koşulları, moderasyon ilkeleri ve sorumluluk sınırı.',
};

export default function KosullarSayfasi() {
  return (
    <article className={s.metin} aria-labelledby="kosullar-baslik">
      <h1 id="kosullar-baslik">Kullanım Koşulları</h1>
      <p className={s.ust}>
        Yürürlük: <time dateTime="2026-10-27">27 Ekim 2026</time>
      </p>

      <p className={s.giris}>
        YouTube Filter Store, video ve kanalların konusunu ve uyarı etiketlerini topluluk oylarıyla
        belirleyen bir topluluk oylama aracıdır. Siteyi kullanarak bu koşulları kabul etmiş olursunuz.
      </p>

      <section className={s.bolum} aria-labelledby="amac">
        <h2 id="amac">Amaç ve kapsam</h2>
        <p>
          Site, YouTube içeriklerine ilişkin topluluk değerlendirmelerini toplar ve yayınlanan
          <code>db.json</code> dosyasıyla tarayıcı eklentisine aktarır. Oylar anonimdir; ziyaretçiler
          hesap açmadan oy verebilir ve oylarını değiştirebilir.
        </p>
      </section>

      <section className={s.bolum} aria-labelledby="youtube">
        <h2 id="youtube">YouTube ile bağlantı</h2>
        <p>
          Bu site bağımsız bir topluluk projesidir; YouTube veya Google ile bağlantılı, onlar tarafından
          desteklenen ya da onaylanan bir hizmet değildir. YouTube markası ve içerikleri ilgili sahiplerine aittir.
        </p>
      </section>

      <section className={s.bolum} aria-labelledby="hesap-guvenligi">
        <h2 id="hesap-guvenligi">Hesap güvenliği</h2>
        <p>
          Editör ve admin hesapları yalnızca yetkili kişilere verilir. Hesabınızın parolasını ve oturum
          bilgilerini korumak sizin sorumluluğunuzdadır. Yetkisiz erişim şüphesinde derhal yöneticiye
          bildirin; hesaplar pasifleştirilebilir ve açık oturumlar iptal edilebilir.
        </p>
      </section>

      <section className={s.bolum} aria-labelledby="moderasyon">
        <h2 id="moderasyon">Moderasyon</h2>
        <p>
          Editörler ve yöneticiler, topluluk kurallarını ve yayın bütünlüğünü korumak için gerekçeli
          <strong> moderasyon</strong> işlemleri yapabilir. Oylar geri alınabilir, kayıtlar kilitlenebilir,
          çerez veya ağ engeli uygulanabilir ve içerik arşivlenebilir. Moderasyon işlemleri gerekçesiyle
          birlikte kayıt altına alınır.
        </p>
      </section>

      <section className={s.bolum} aria-labelledby="sorumluluk">
        <h2 id="sorumluluk">Sorumluluk sınırı</h2>
        <p>
          Site “olduğu gibi” sunulur. Topluluk oylarına dayanan sonuçların doğruluğu, eksiksizliği veya
          belirli bir amaca uygunluğu garanti edilmez. Hizmetin kesintisiz çalışacağı taahhüt edilmez;
          veri kaybı, dolaylı zarar veya üçüncü taraf içeriklerinden doğan kayıplar bakımından
          <strong> sorumluluk</strong> kabul edilmez. Yürürlükteki hukukun izin verdiği ölçüde sorumluluk
          site işletmecisiyle sınırlıdır.
        </p>
      </section>

      <section className={s.bolum} aria-labelledby="degisiklik">
        <h2 id="degisiklik">Değişiklikler</h2>
        <p>
          Bu koşullar zaman zaman güncellenebilir. Önemli bir <strong>değişiklik</strong> olduğunda bu
          sayfadaki yürürlük tarihi yenilenir. Güncel metni düzenli olarak kontrol etmeniz önerilir;
          değişiklikten sonra siteyi kullanmaya devam etmeniz yeni koşulları kabul ettiğiniz anlamına gelir.
        </p>
      </section>

      <section className={s.bolum} aria-labelledby="iletisim">
        <h2 id="iletisim">İletişim</h2>
        <p>
          Sorularınız ve itirazlarınız için{' '}
          <a href="https://github.com/servi-team/YT_Filter/issues">GitHub Issues</a> üzerinden konu açabilirsiniz.
          Ayrıca <Link href="/gizlilik">gizlilik sayfasını</Link> inceleyebilirsiniz.
        </p>
      </section>

      <div className={s.not}>
        <p>
          Bu metin yalnızca siteyi kapsar; tarayıcı eklentisinin kullanım ve gizlilik koşulları ayrıdır.
        </p>
      </div>
    </article>
  );
}
