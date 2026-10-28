import AdresCubugu from './adres-cubugu.tsx';

export default function AnaSayfa() {
  return (
    <>
      <h1>YouTube Filter Store</h1>
      <p className="alt">Videoların ve kanalların konusunu ve uyarı etiketlerini birlikte belirliyoruz.</p>
      <AdresCubugu />
      <p className="alt not">
        Eklenti siteyle konuşmaz: sonuçlar aylık güncellemeyle eklentiye <code>db.json</code> olarak gelir.
      </p>
    </>
  );
}
