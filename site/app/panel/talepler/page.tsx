import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '../../../lib/db.ts';
import { sunucuRolGerekli } from '../../../lib/sunucu-oturum.ts';
import { talepleriListele } from '../../../lib/talep-deposu.ts';
import { BosDurum } from '../../bilesenler/bos-durum.tsx';
import { SayfaBasligi } from '../../bilesenler/sayfa-basligi.tsx';
import { TalepIslem } from '../../bilesenler/talep-islem.tsx';
import s from '../panel.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Panel talepleri',
  description: 'Bekleyen ekleme taleplerini kabul edin veya gerekçeyle reddedin.',
};

const tarihBicimi = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type SayfaProps = {
  searchParams: Promise<{ sekme?: string | string[] }>;
};

export default async function PanelTaleplerSayfasi({ searchParams }: SayfaProps) {
  await sunucuRolGerekli(['editor', 'admin']);
  const parametreler = await searchParams;
  const sekme = parametreler.sekme === 'islenmis' ? 'islenmis' : 'bekleyen';

  const veritabani = await db();
  const talepler = sekme === 'bekleyen'
    ? await talepleriListele(veritabani, { durum: 'bekliyor' })
    : await talepleriListele(veritabani, { durum: ['kabul', 'red'] });

  return (
    <>
      <SayfaBasligi
        baslik="Talepler"
        aciklama="Ziyaretçilerin eklemek istediği linkleri inceleyin; kabul edilen içerik hemen oylanabilir."
      />

      <nav className={s.sekmeler} aria-label="Talep durumu">
        <Link
          className={`${s.sekme} ${sekme === 'bekleyen' ? s.sekmeAktif : ''}`}
          href="/panel/talepler"
          aria-current={sekme === 'bekleyen' ? 'page' : undefined}
        >
          Bekleyenler
        </Link>
        <Link
          className={`${s.sekme} ${sekme === 'islenmis' ? s.sekmeAktif : ''}`}
          href="/panel/talepler?sekme=islenmis"
          aria-current={sekme === 'islenmis' ? 'page' : undefined}
        >
          İşlenmişler
        </Link>
      </nav>

      {talepler.length ? (
        <ul className={s.talepListe}>
          {talepler.map((talep) => (
            <li className={s.talep} key={talep.id}>
              <div className={s.talepUst}>
                <p className={s.talepBaslik}>{talep.link}</p>
                {talep.durum === 'bekliyor' ? (
                  <span className={`${s.durum} ${s.durumBekliyor}`}>Bekliyor</span>
                ) : talep.durum === 'kabul' ? (
                  <span className={`${s.durum} ${s.durumKabul}`}>Kabul</span>
                ) : (
                  <span className={`${s.durum} ${s.durumRed}`}>Red</span>
                )}
              </div>

              <p className={s.talepMeta}>
                {talep.hedefTuru === 'video' ? 'Video' : 'Kanal'} · <code>{talep.anahtar}</code>
                {' · '}{talep.talepSayisi} talep
              </p>

              <p className={s.talepMeta}>
                İlk: <time dateTime={talep.ilkTalep.toISOString()}>{tarihBicimi.format(talep.ilkTalep)}</time>
                {' · '}Son: <time dateTime={talep.sonTalep.toISOString()}>{tarihBicimi.format(talep.sonTalep)}</time>
              </p>

              {talep.durum === 'kabul' ? (
                <p className={s.talepMeta}>
                  <Link href={`/icerik/${talep.hedefTuru}/${talep.anahtar}`}>İçeriğe git</Link>
                  {talep.isleyenEposta ? ` · İşleyen: ${talep.isleyenEposta}` : ''}
                </p>
              ) : null}

              {talep.durum === 'red' ? (
                <p className={s.talepMeta}>
                  Gerekçe: {talep.redGerekce ?? '—'}
                  {talep.isleyenEposta ? ` · İşleyen: ${talep.isleyenEposta}` : ''}
                </p>
              ) : null}

              {talep.durum === 'bekliyor' ? <TalepIslem talepId={talep.id} /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <BosDurum
          baslik={sekme === 'bekleyen' ? 'Bekleyen talep yok.' : 'Henüz işlenmiş talep yok.'}
          aciklama={sekme === 'bekleyen'
            ? 'Yeni bir link gönderildiğinde burada görünecek.'
            : 'Kabul veya red edilen talepler burada arşivlenir.'}
        />
      )}
    </>
  );
}
