import type { Metadata } from 'next';
import Link from 'next/link';
import s from '../metin.module.css';

export const metadata: Metadata = {
  title: 'Gizlilik',
  description: 'YouTube Filter Store sitesinin gizlilik ilkeleri: anonim oy, çerez, IP özeti ve veri saklama.',
};

export default function GizlilikSayfasi() {
  return (
    <article className={s.metin} aria-labelledby="gizlilik-baslik">
      <h1 id="gizlilik-baslik">Gizlilik</h1>
      <p className={s.ust}>
        Son güncelleme: <time dateTime="2026-10-27">27 Ekim 2026</time>
      </p>

      <p className={s.giris}>
        Bu sayfa yalnızca YouTube Filter Store sitesini kapsar. Tarayıcı eklentisinin gizlilik metni ayrıdır.
      </p>

      <section className={s.bolum} aria-labelledby="hesapsiz-oy">
        <h2 id="hesapsiz-oy">Hesap açmadan oy verme</h2>
        <p>
          Sitede oy vermek için hesap açmanız gerekmez. Tarayıcınıza <strong>1 yıl</strong> ömürlü,
          rastgele üretilmiş bir kimlik <strong>çerez</strong>i konur. Bu kimlik yalnızca aynı tarayıcıdan
          gelen oyları ayırt etmek için kullanılır.
        </p>
        <p>
          Oy sayıları herkese açıktır; ancak tekil bir oy sahibinin kimliği yayınlanmaz. Yayınlanan
          veri dosyasında çerez kimliği, IP adresi veya benzeri kişisel kimlik bulunmaz.
        </p>
      </section>

      <section className={s.bolum} aria-labelledby="ip-ozeti">
        <h2 id="ip-ozeti">IP adresi ve güvenlik özeti</h2>
        <p>
          IP adresinizin düz metni saklanmaz. Kötüye kullanımı sınırlamak için oy kayıtlarında
          yalnızca geri döndürülemez bir güvenlik özeti tutulur; bu özet <strong>30 gün</strong> sonra
          temizlenir. Aktif bir engel kaydı varsa, ilgili özet engel süresince saklanır.
        </p>
      </section>

      <section className={s.bolum} aria-labelledby="engeller">
        <h2 id="engeller">Engeller ve takma etiketler</h2>
        <p>
          Engeller için çerez kimliği veya IP özeti sunucuda tutulur. Panelde bunlar yalnızca
          <code>çerez:xxxxxxxx</code> ve <code>ağ:xxxxxxxx</code> gibi kısa <strong>takma etiket</strong>lerle
          görünür. Moderatörler tam çerez kimliğini, tam IP özetini veya ham IP adresini görmez.
        </p>
      </section>

      <section className={s.bolum} aria-labelledby="arsiv">
        <h2 id="arsiv">Kayıtların arşivlenmesi</h2>
        <p>
          İçerik kayıtları silinmek yerine <strong>arşiv</strong>lenir. Arşivlenen bir kaydın oyları
          silinmez; kayıt yalnızca kamusal listeden ve yayınlanan veri dosyasından çıkarılır. Yönetici
          kaydı geri getirirse önceki oylar ve kilit durumu korunur.
        </p>
      </section>

      <section className={s.bolum} aria-labelledby="hesaplar">
        <h2 id="hesaplar">Editör ve admin hesapları</h2>
        <p>
          Editör ve admin hesaplarında e-posta adresi ile parolanın geri döndürülemez özeti tutulur.
          Ham parola saklanmaz. Oturumlar <strong>7 gün</strong> kayan, <strong>30 gün</strong> mutlak
          pencereyle sınırlıdır; hesap pasifleştirildiğinde açık oturumlar geçersiz olur.
        </p>
      </section>

      <section className={s.bolum} aria-labelledby="youtube-gorselleri">
        <h2 id="youtube-gorselleri">YouTube görselleri ve yazı tipleri</h2>
        <p>
          Başlık, avatar ve kapak görselleri YouTube sunucularından yüklenir. Site kendi yazı tiplerini
          yerel dosyalardan sunar; üçüncü taraf font servisi kullanılmaz.
        </p>
      </section>

      <section className={s.bolum} aria-labelledby="izleme">
        <h2 id="izleme">İzleme ve reklam</h2>
        <p>
          Sitede <strong>analitik</strong>, <strong>reklam</strong> veya <strong>üçüncü taraf</strong> izleme
          aracı yoktur. Site, davranışınızı reklam amacıyla profillemez.
        </p>
      </section>

      <section className={s.bolum} aria-labelledby="silme-iletisim">
        <h2 id="silme-iletisim">Veri silme ve iletişim</h2>
        <p>
          Verilerinizle ilgili silme veya düzeltme talebi için{' '}
          <a href="https://github.com/servi-team/YT_Filter/issues">GitHub Issues</a> üzerinden konu açabilirsiniz.
          Talebinizi değerlendirirken ilgili kaydı ve saklama süresini dikkate alırız.
        </p>
      </section>

      <div className={s.not}>
        <p>
          Bu metin yalnızca siteyi kapsar; <strong>eklenti</strong>nin gizlilik metni ayrıdır.
        </p>
        <p>
          Ayrıntılar için <Link href="/kosullar">kullanım koşullarını</Link> ve{' '}
          <Link href="/iletisim">iletişim sayfasını</Link> inceleyebilirsiniz.
        </p>
      </div>
    </article>
  );
}
