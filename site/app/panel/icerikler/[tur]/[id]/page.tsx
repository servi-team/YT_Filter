import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '../../../../../lib/db.ts';
import { icerikGetir } from '../../../../../lib/icerik-deposu.ts';
import { moderasyonGecmisi, oySatirlari } from '../../../../../lib/moderasyon-deposu.ts';
import { aktifKilit } from '../../../../../lib/oy-deposu.ts';
import { taksonomi } from '../../../../../lib/ortak.ts';
import { sunucuRolGerekli } from '../../../../../lib/sunucu-oturum.ts';
import { BosDurum } from '../../../../bilesenler/bos-durum.tsx';
import { KilitDugmesi, OyEylemleri } from '../../../../bilesenler/moderasyon-araclari.tsx';
import { SayfaBasligi } from '../../../../bilesenler/sayfa-basligi.tsx';
import s from './moderasyon.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Kayıt moderasyonu',
  description: 'Bir kanal veya videonun oylarını inceleyin, geri alın, kilitleyin ve engelleyin.',
};

const tarihBicimi = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const ADLAR = new Map(
  [...taksonomi.KONULAR, ...taksonomi.ETIKETLER].map((oge) => [oge.id, oge.ad] as const),
);

const DEGER_ADLARI = {
  up: 'Beğen',
  kararsiz: 'Kararsız',
  down: 'Beğenme',
} as const;

const DURUM_ADLARI = {
  aktif: 'Aktif',
  'ziyaretci-geri-alindi': 'Ziyaretçi geri aldı',
  'moderasyon-geri-alindi': 'Moderasyon geri aldı',
  engelli: 'Engelli',
} as const;

type SayfaProps = {
  params: Promise<{ tur: string; id: string }>;
};

export default async function PanelIcerikModerasyonSayfasi({ params }: SayfaProps) {
  await sunucuRolGerekli(['editor', 'admin']);

  const { tur, id } = await params;
  if (tur !== 'kanal' && tur !== 'video') notFound();

  const veritabani = await db();
  const detay = await icerikGetir(veritabani, tur, id);
  if (!detay) notFound();

  const kilit = await aktifKilit(veritabani, tur, id);
  const oylar = await oySatirlari(veritabani, tur, id);
  const gecmis = (await moderasyonGecmisi(veritabani, { limit: 100 }))
    .filter((kayit) => kayit.hedefTuru === tur && kayit.hedefId === id);

  return (
    <>
      <SayfaBasligi
        baslik={detay.icerik.baslik}
        aciklama={`${tur === 'kanal' ? 'Kanal' : 'Video'} · ${oylar.length} oy · Kayıt kimliği ${id}`}
        eylem={<Link href="/panel/icerikler">İçeriklere dön</Link>}
      />

      <section className={s.kilitBandi} aria-label="Kilit durumu">
        <div>
          {kilit ? (
            <>
              <p className={s.kilitBaslik}>Kayıt kilitli; sonuç kilit anındaki hâliyle dondu.</p>
              <p className={s.kilitMeta}>
                Gerekçe: {kilit.gerekce}
                {' · '}
                <time dateTime={kilit.kilitZamani.toISOString()}>
                  {tarihBicimi.format(kilit.kilitZamani)}
                </time>
              </p>
            </>
          ) : (
            <>
              <p className={s.kilitBaslik}>Kayıt açık.</p>
              <p className={s.kilitMeta}>Sonuç, gelen oylarla birlikte yeniden hesaplanır.</p>
            </>
          )}
        </div>
        <KilitDugmesi hedefTuru={tur} hedefId={id} kilitli={Boolean(kilit)} />
      </section>

      <section className={s.bolum} aria-labelledby="oylar-baslik">
        <h2 className={s.bolumBaslik} id="oylar-baslik">Oylar</h2>

        {oylar.length ? (
          <div className={s.tabloSar}>
            <table className={s.tablo}>
              <thead>
                <tr>
                  <th scope="col">Kimlik</th>
                  <th scope="col">Öğe</th>
                  <th scope="col">Oy</th>
                  <th scope="col">Zaman</th>
                  <th scope="col">Durum</th>
                  <th scope="col">Eylemler</th>
                </tr>
              </thead>
              <tbody>
                {oylar.map((oy) => {
                  const ogeAdi = ADLAR.get(oy.ogeId) ?? oy.ogeId;
                  return (
                    <tr key={oy.id}>
                      <td data-etiket="Kimlik">
                        <code className={s.kimlik}>{oy.etiket}</code>
                        {oy.ipEtiketi ? <code className={s.kimlik}>{oy.ipEtiketi}</code> : null}
                      </td>
                      <td data-etiket="Öğe">
                        {oy.ogeTuru === 'konu' ? 'Konu' : 'Etiket'} · {ogeAdi}
                      </td>
                      <td data-etiket="Oy">{DEGER_ADLARI[oy.deger]}</td>
                      <td data-etiket="Zaman">
                        <time dateTime={oy.guncelleme.toISOString()}>
                          {tarihBicimi.format(oy.guncelleme)}
                        </time>
                      </td>
                      <td data-etiket="Durum">{DURUM_ADLARI[oy.durum]}</td>
                      <td data-etiket="Eylemler">
                        <OyEylemleri
                          satir={{
                            id: oy.id,
                            etiket: oy.etiket,
                            ipEtiketi: oy.ipEtiketi,
                            ogeAdi,
                            deger: oy.deger,
                            durum: oy.durum,
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <BosDurum
            baslik="Bu kayıtta henüz oy yok."
            aciklama="Ziyaretçiler oy verdikçe satırlar burada görünecek."
          />
        )}
      </section>

      <section className={s.bolum} aria-labelledby="gecmis-baslik">
        <h2 className={s.bolumBaslik} id="gecmis-baslik">Bu kaydın moderasyon geçmişi</h2>

        {gecmis.length ? (
          <ul className={s.gecmisListe}>
            {gecmis.map((kayit) => (
              <li className={s.gecmisOge} key={kayit.id}>
                <p className={s.gecmisUst}>
                  <span className={s.islem}>{kayit.islem}</span>
                  {' · '}
                  <time dateTime={kayit.zaman.toISOString()}>{tarihBicimi.format(kayit.zaman)}</time>
                  {kayit.yapanEposta ? ` · ${kayit.yapanEposta}` : ''}
                </p>
                {kayit.gerekce ? <p className={s.gecmisGerekce}>{kayit.gerekce}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.bosMetin}>Bu kayıt için henüz moderasyon işlemi yapılmadı.</p>
        )}
      </section>
    </>
  );
}
