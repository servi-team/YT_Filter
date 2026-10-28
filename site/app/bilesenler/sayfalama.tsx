import Link from 'next/link';
import s from '../(kamusal)/kesfet/kesfet.module.css';

type SayfaIsareti = number | 'bosluk';

/** Geçerli sayfanın çevresinde en fazla yedi sayı gösterir; uzak sayfaları üç noktayla özetler. */
function sayfaAraligi(gecerli: number, sonSayfa: number): SayfaIsareti[] {
  if (sonSayfa <= 7) {
    return Array.from({ length: sonSayfa }, (_, i) => i + 1);
  }

  const kume = new Set<number>([1, sonSayfa, gecerli - 1, gecerli, gecerli + 1]);
  if (gecerli <= 3) {
    kume.add(2);
    kume.add(3);
    kume.add(4);
  }
  if (gecerli >= sonSayfa - 2) {
    kume.add(sonSayfa - 1);
    kume.add(sonSayfa - 2);
    kume.add(sonSayfa - 3);
  }

  const siralanmis = [...kume]
    .filter((sayi) => sayi >= 1 && sayi <= sonSayfa)
    .sort((a, b) => a - b);

  const sonuc: SayfaIsareti[] = [];
  for (let i = 0; i < siralanmis.length; i += 1) {
    if (i > 0 && siralanmis[i] - siralanmis[i - 1] > 1) sonuc.push('bosluk');
    sonuc.push(siralanmis[i]);
  }
  return sonuc;
}

export function Sayfalama({
  sayfa,
  toplam,
  sayfaBoyu,
  arama,
  tur,
}: {
  sayfa: number;
  toplam: number;
  sayfaBoyu: number;
  arama?: string;
  tur?: 'video' | 'kanal';
}) {
  const boy = Math.max(1, Math.trunc(sayfaBoyu) || 1);
  if (toplam <= boy) return null;

  const sonSayfa = Math.max(1, Math.ceil(toplam / boy));
  const gecerli = Math.min(Math.max(1, Math.trunc(sayfa) || 1), sonSayfa);
  const sayfalar = sayfaAraligi(gecerli, sonSayfa);

  function adres(hedef: number): string {
    const parametreler = new URLSearchParams();
    if (arama) parametreler.set('arama', arama);
    if (tur) parametreler.set('tur', tur);
    if (hedef > 1) parametreler.set('sayfa', String(hedef));
    const sorgu = parametreler.toString();
    return sorgu ? `/kesfet?${sorgu}` : '/kesfet';
  }

  const onceki = gecerli > 1 ? adres(gecerli - 1) : null;
  const sonraki = gecerli < sonSayfa ? adres(gecerli + 1) : null;

  return (
    <nav className={s.sayfalama} aria-label="Sayfalar">
      {onceki ? (
        <Link className={s.sayfaYon} href={onceki} rel="prev">
          Önceki
        </Link>
      ) : (
        <span className={`${s.sayfaYon} ${s.sayfaPasif}`} aria-disabled="true">
          Önceki
        </span>
      )}

      <ol className={s.sayfaListesi}>
        {sayfalar.map((isaret, i) =>
          isaret === 'bosluk' ? (
            <li key={`bosluk-${i}`} className={s.sayfaBosluk} aria-hidden="true">
              …
            </li>
          ) : isaret === gecerli ? (
            <li key={isaret}>
              <span
                className={`${s.sayfaBag} ${s.sayfaSimdi}`}
                aria-current="page"
                aria-label={`Sayfa ${isaret}, geçerli sayfa`}
              >
                {isaret}
              </span>
            </li>
          ) : (
            <li key={isaret}>
              <Link className={s.sayfaBag} href={adres(isaret)} aria-label={`Sayfa ${isaret}`}>
                {isaret}
              </Link>
            </li>
          ),
        )}
      </ol>

      {sonraki ? (
        <Link className={s.sayfaYon} href={sonraki} rel="next">
          Sonraki
        </Link>
      ) : (
        <span className={`${s.sayfaYon} ${s.sayfaPasif}`} aria-disabled="true">
          Sonraki
        </span>
      )}
    </nav>
  );
}
