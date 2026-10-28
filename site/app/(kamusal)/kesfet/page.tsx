import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '../../../lib/db.ts';
import { icerikListele } from '../../../lib/icerik-deposu.ts';
import { BosDurum } from '../../bilesenler/bos-durum.tsx';
import { IcerikKarti } from '../../bilesenler/icerik-karti.tsx';
import { SayfaBasligi } from '../../bilesenler/sayfa-basligi.tsx';
import { Sayfalama } from '../../bilesenler/sayfalama.tsx';
import s from './kesfet.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Keşfet',
  description: 'Video ve kanalların konusunu ve uyarı etiketlerini topluluk oylarıyla keşfet.',
};

const SAYFA_BOYU = 12;

const TURLER = [
  { etiket: 'Tümü', deger: undefined },
  { etiket: 'Videolar', deger: 'video' },
  { etiket: 'Kanallar', deger: 'kanal' },
] as const;

function turCoz(deger: string | undefined): 'video' | 'kanal' | undefined {
  return deger === 'video' || deger === 'kanal' ? deger : undefined;
}

function sayfaCoz(deger: string | undefined): number {
  if (!deger || !/^[1-9]\d*$/.test(deger)) return 1;
  const sayi = Number(deger);
  return Number.isSafeInteger(sayi) ? sayi : 1;
}

function kesfetAdresi({
  arama,
  tur,
  sayfa,
}: {
  arama?: string;
  tur?: 'video' | 'kanal';
  sayfa?: number;
}): string {
  const parametreler = new URLSearchParams();
  if (arama) parametreler.set('arama', arama);
  if (tur) parametreler.set('tur', tur);
  if (sayfa && sayfa > 1) parametreler.set('sayfa', String(sayfa));
  const sorgu = parametreler.toString();
  return sorgu ? `/kesfet?${sorgu}` : '/kesfet';
}

export default async function Kesfet({
  searchParams,
}: {
  searchParams: Promise<{ arama?: string; tur?: string; sayfa?: string }>;
}) {
  const parametreler = await searchParams;
  const arama = typeof parametreler.arama === 'string' ? parametreler.arama.trim() : '';
  const tur = turCoz(typeof parametreler.tur === 'string' ? parametreler.tur : undefined);
  let sayfa = sayfaCoz(typeof parametreler.sayfa === 'string' ? parametreler.sayfa : undefined);

  const veritabani = await db();
  let sonuc = await icerikListele(veritabani, {
    arama: arama || undefined,
    tur,
    sayfa,
    sayfaBoyu: SAYFA_BOYU,
  });

  const sonSayfa = Math.max(1, Math.ceil(sonuc.toplam / SAYFA_BOYU));
  if (sonuc.toplam > 0 && sonuc.sayfa > sonSayfa) {
    sayfa = sonSayfa;
    sonuc = await icerikListele(veritabani, {
      arama: arama || undefined,
      tur,
      sayfa,
      sayfaBoyu: SAYFA_BOYU,
    });
  }

  const bosAciklama = arama
    ? `“${arama}” için sonuç yok. Farklı bir arama terimi veya tür deneyin.`
    : tur
      ? 'Bu türde kayıt yok. Tümü filtresine dönmeyi deneyin.'
      : 'Kütüphane henüz boş. İlk kayıtlar editörler tarafından eklenecek.';

  return (
    <>
      <SayfaBasligi
        baslik="Keşfet"
        aciklama="Video ve kanalların konusunu ve uyarı etiketlerini topluluk oylarıyla keşfet."
      />

      <div className={s.araclar}>
        <form className={s.aramaFormu} action="/kesfet" method="get" role="search">
          <label className={s.gizli} htmlFor="kesfet-arama">Ara</label>
          <input
            id="kesfet-arama"
            className={s.aramaGirdi}
            type="search"
            name="arama"
            defaultValue={arama}
            placeholder="Video veya kanal ara"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
          {tur ? <input type="hidden" name="tur" value={tur} /> : null}
          <button className={s.aramaDugme} type="submit">Ara</button>
        </form>

        <nav className={s.turler} aria-label="İçerik türü">
          {TURLER.map((secenek) => {
            const aktif = secenek.deger === tur;
            return (
              <Link
                key={secenek.etiket}
                className={`${s.turBag} ${aktif ? s.turAktif : ''}`}
                href={kesfetAdresi({ arama: arama || undefined, tur: secenek.deger, sayfa: 1 })}
                aria-current={aktif ? 'true' : undefined}
              >
                {secenek.etiket}
              </Link>
            );
          })}
        </nav>
      </div>

      <section className={s.sonuclar} aria-labelledby="sonuc-basligi">
        <div className={s.sonucUst}>
          <div className={s.sonucBaslikGrup}>
            <h2 id="sonuc-basligi" className={s.sonucBaslik}>Sonuçlar</h2>
            <p className={s.sayim}>
              {arama ? (
                <>
                  <span className={s.aramaVurgu}>“{arama}”</span> için{' '}
                </>
              ) : null}
              <strong>{sonuc.toplam}</strong> kayıt
              {sonSayfa > 1 ? ` · sayfa ${sonuc.sayfa}/${sonSayfa}` : null}
            </p>
          </div>

          {arama || tur ? (
            <Link className={s.temizle} href="/kesfet">Filtreleri temizle</Link>
          ) : null}
        </div>

        {sonuc.kayitlar.length > 0 ? (
          <div className={s.izgara}>
            {sonuc.kayitlar.map((kayit, i) => (
              <IcerikKarti
                key={`${kayit.tur}:${kayit.id}`}
                kayit={kayit}
                oncelik={i < 3}
              />
            ))}
          </div>
        ) : (
          <BosDurum
            baslik="Bu aramada kayıt bulunamadı."
            aciklama={bosAciklama}
            eylem={
              arama || tur ? (
                <Link className={s.temizleBag} href="/kesfet">Tüm kayıtları gör</Link>
              ) : undefined
            }
          />
        )}

        <Sayfalama
          sayfa={sonuc.sayfa}
          toplam={sonuc.toplam}
          sayfaBoyu={SAYFA_BOYU}
          arama={arama || undefined}
          tur={tur}
        />
      </section>
    </>
  );
}
