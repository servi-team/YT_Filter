import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '../../lib/db.ts';
import { panelOzeti } from '../../lib/panel-deposu.ts';
import { sunucuRolGerekli } from '../../lib/sunucu-oturum.ts';
import { YOUTUBE_KOTA_GUNLUK } from '../../lib/youtube-kota.ts';
import { Bildirim } from '../bilesenler/bildirim.tsx';
import { BosDurum } from '../bilesenler/bos-durum.tsx';
import { SayfaBasligi } from '../bilesenler/sayfa-basligi.tsx';
import s from './panel.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Panel özeti',
  description: 'Bekleyen talepler, oy sayıları, kilitler ve son moderasyon işlemleri.',
};

const tarihBicimi = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default async function PanelOzetSayfasi() {
  await sunucuRolGerekli(['editor', 'admin']);
  const veritabani = await db();
  const ozet = await panelOzeti(veritabani);

  return (
    <>
      <SayfaBasligi
        baslik="Panel özeti"
        aciklama="Kuyruk, oy hacmi ve son moderasyon işlemlerine tek bakışta bakın."
      />

      {ozet.kota.uyari ? (
        <Bildirim
          tur="bilgi"
          mesaj={`YouTube API kotası yaklaşıyor: ${ozet.kota.kullanilan}/${YOUTUBE_KOTA_GUNLUK}. HTML/oEmbed fallback kullanılabilir.`}
        />
      ) : null}

      <div className={s.kartlar}>
        <div className={s.kart}>
          <p className={s.kartEtiket}>Bekleyen talep</p>
          <p className={s.kartDeger}>{ozet.bekleyenTalep}</p>
          <p className={s.kartNot}>
            <Link href="/panel/talepler">Kuyruğa git</Link>
          </p>
        </div>
        <div className={s.kart}>
          <p className={s.kartEtiket}>Toplam oy</p>
          <p className={s.kartDeger}>{ozet.toplamOy}</p>
          <p className={s.kartNot}>Geri alınan ve engelli oylar hariç</p>
        </div>
        <div className={s.kart}>
          <p className={s.kartEtiket}>Kilitli kayıt</p>
          <p className={s.kartDeger}>{ozet.kilitli}</p>
          <p className={s.kartNot}>Açık kilitler</p>
        </div>
        <div className={s.kart}>
          <p className={s.kartEtiket}>YouTube kotası</p>
          <p className={s.kartDeger}>{ozet.kota.kullanilan}</p>
          <p className={s.kartNot}>
            Günlük {YOUTUBE_KOTA_GUNLUK} birim · kalan {ozet.kota.kalan}
          </p>
        </div>
      </div>

      <section className={s.bolum} aria-labelledby="son-moderasyon-baslik">
        <h2 className={s.bolumBaslik} id="son-moderasyon-baslik">Son moderasyon</h2>
        {ozet.sonModerasyon.length ? (
          <ul className={s.liste}>
            {ozet.sonModerasyon.map((kayit, i) => (
              <li className={s.satir} key={`${kayit.zaman.toISOString()}-${i}`}>
                <div className={s.satirAna}>
                  <p className={s.satirBaslik}>
                    {kayit.islem}
                    {kayit.hedefTuru && kayit.hedefId ? (
                      <> · {kayit.hedefTuru} <code>{kayit.hedefId}</code></>
                    ) : null}
                  </p>
                  <p className={s.satirMeta}>
                    {kayit.yapanEposta ?? 'Anonim'}
                    {kayit.gerekce ? ` · ${kayit.gerekce}` : ''}
                  </p>
                </div>
                <time className={s.satirMeta} dateTime={kayit.zaman.toISOString()}>
                  {tarihBicimi.format(kayit.zaman)}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <BosDurum
            baslik="Henüz moderasyon kaydı yok."
            aciklama="İlk talep kabulü veya geri alma işlemi burada görünecek."
          />
        )}
      </section>
    </>
  );
}
