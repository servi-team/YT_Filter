'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bildirim } from './bildirim.tsx';
import { Dugme } from './dugme.tsx';
import { GerekceDialogu, type GerekceSonucu } from './gerekce-dialogu.tsx';
import type { HedefTuru } from '../../lib/tipler.ts';
import s from '../panel/panel.module.css';

type Eylem = 'tek' | 'cerez-kayit' | 'cerez-site' | 'cerez' | 'ag';

interface EylemAyari {
  baslik: string;
  aciklama: (satir: OyEylemSatiri) => string;
  uyari?: (satir: OyEylemSatiri) => string;
  ekOnay?: string;
  onayMetni: string;
  tehlike: boolean;
}

const EYLEMLER: Record<Eylem, EylemAyari> = {
  tek: {
    baslik: 'Bu oyu geri al',
    aciklama: (satir) => `${satir.etiket} · ${satir.ogeAdi} (${satir.deger})`,
    onayMetni: 'Oyu geri al',
    tehlike: false,
  },
  'cerez-kayit': {
    baslik: 'Bu çerezin bu kayıttaki oyları',
    aciklama: (satir) => `${satir.etiket} çerezine ait bu kayıttaki tüm oylar kapatılır.`,
    uyari: () => 'Bu kayıttaki tüm konu ve etiket oyları kalıcı olarak geri alınır.',
    onayMetni: 'Bu kayıttaki oyları geri al',
    tehlike: true,
  },
  'cerez-site': {
    baslik: 'Bu çerezin tüm site oyları',
    aciklama: (satir) => `${satir.etiket} çerezine ait tüm kayıtlardaki oylar kapatılır.`,
    uyari: () => 'Bu işlem kalıcıdır; çerezin tüm site oyları geri alınır. Gelecekteki oyları durdurmak için ayrıca çerez engeli kullanın.',
    ekOnay: 'Bu işlemin kalıcı olduğunu anladım.',
    onayMetni: 'Tüm site oylarını geri al',
    tehlike: true,
  },
  cerez: {
    baslik: 'Bu çerezi engelle',
    aciklama: (satir) => `${satir.etiket} çerezi engellenir.`,
    uyari: () => 'Engel kaldırılana kadar bu çerezin oyları sayılmaz ve yeni oyları reddedilir.',
    onayMetni: 'Çerezi engelle',
    tehlike: true,
  },
  ag: {
    baslik: 'Bu ağı engelle',
    aciklama: (satir) => `${satir.ipEtiketi ?? 'Ağ özeti'} engellenir.`,
    uyari: () => 'Paylaşımlı ağları (NAT, okul, ofis) etkileyebilir. Önce çerez engeli önerilir.',
    ekOnay: 'Paylaşımlı ağ uyarısını anladım.',
    onayMetni: 'Ağı engelle',
    tehlike: true,
  },
};

async function istekGonder(yol: string, govde: unknown): Promise<GerekceSonucu> {
  try {
    const yanit = await fetch(yol, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(govde),
    });

    let veri: { hata?: unknown } | null = null;
    try {
      veri = await yanit.json() as { hata?: unknown };
    } catch {
      veri = null;
    }

    if (!yanit.ok) {
      return {
        basarili: false,
        hata: typeof veri?.hata === 'string' ? veri.hata : 'İşlem tamamlanamadı.',
      };
    }
    if (veri && typeof veri === 'object' && typeof veri.hata === 'string') {
      return { basarili: false, hata: veri.hata };
    }
    return { basarili: true };
  } catch {
    return {
      basarili: false,
      hata: 'İşlem tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin.',
    };
  }
}

export interface OyEylemSatiri {
  id: string;
  etiket: string;
  ipEtiketi: string | null;
  ogeAdi: string;
  deger: 'up' | 'kararsiz' | 'down';
  durum: 'aktif' | 'ziyaretci-geri-alindi' | 'moderasyon-geri-alindi' | 'engelli';
}

/** Kilit bandındaki kilitle/kilidi aç düğmesi ve gerekçe dialogu. */
export function KilitDugmesi({
  hedefTuru,
  hedefId,
  kilitli,
}: {
  hedefTuru: HedefTuru;
  hedefId: string;
  kilitli: boolean;
}) {
  const [acik, setAcik] = useState(false);
  const [bildirim, setBildirim] = useState<string | null>(null);
  const router = useRouter();

  async function onayla(gerekce: string): Promise<GerekceSonucu> {
    const sonuc = await istekGonder(
      kilitli ? '/api/panel/moderasyon/kilit-ac' : '/api/panel/moderasyon/kilitle',
      { hedefTuru, hedefId, gerekce },
    );
    if (sonuc.basarili) {
      setBildirim(kilitli ? 'Kilit açıldı; sonuç güncel oylarla hesaplanacak.' : 'Kayıt kilitlendi; sonuç dondu.');
      router.refresh();
    }
    return sonuc;
  }

  return (
    <>
      <Dugme
        tur={kilitli ? 'birincil' : 'ikincil'}
        boyut="kucuk"
        onClick={() => {
          setBildirim(null);
          setAcik(true);
        }}
      >
        {kilitli ? 'Kilidi aç' : 'Kilitle'}
      </Dugme>

      {bildirim ? (
        <Bildirim tur="basari" mesaj={bildirim} kapat={() => setBildirim(null)} />
      ) : null}

      <GerekceDialogu
        acik={acik}
        baslik={kilitli ? 'Kilidi aç' : 'Kaydı kilitle'}
        aciklama={kilitli
          ? 'Kilit açıldığında sonuç, biriken güncel oylarla yeniden hesaplanır.'
          : 'Kilitliyken oylar kabul edilmeye devam eder; sonuç kilit anındaki hâliyle donar.'}
        onayMetni={kilitli ? 'Kilidi aç' : 'Kilitle'}
        tehlike={false}
        onayla={onayla}
        onIptal={() => setAcik(false)}
      />
    </>
  );
}

/** Tek bir oy satırının geri alma ve engelleme eylemleri. */
export function OyEylemleri({ satir }: { satir: OyEylemSatiri }) {
  const [eylem, setEylem] = useState<Eylem | null>(null);
  const [bildirim, setBildirim] = useState<string | null>(null);
  const router = useRouter();

  const ayar = eylem ? EYLEMLER[eylem] : null;

  async function onayla(gerekce: string): Promise<GerekceSonucu> {
    if (!eylem) return { basarili: false, hata: 'İşlem seçilmedi.' };

    const sonuc = eylem === 'cerez' || eylem === 'ag'
      ? await istekGonder('/api/panel/moderasyon/engelle', {
        oyId: satir.id,
        kapsam: eylem,
        gerekce,
      })
      : await istekGonder('/api/panel/moderasyon/oy-geri-al', {
        oyId: satir.id,
        kapsam: eylem,
        gerekce,
      });

    if (sonuc.basarili) {
      setBildirim(eylem === 'cerez' || eylem === 'ag'
        ? 'Engel kaydedildi.'
        : 'Oy geri alma işlemi tamamlandı.');
      router.refresh();
    }
    return sonuc;
  }

  const geriAlinmis = satir.durum === 'moderasyon-geri-alindi';

  return (
    <>
      <div className={s.talepEylem} style={{ flexWrap: 'wrap' }}>
        <Dugme
          tur="ikincil"
          boyut="kucuk"
          disabled={geriAlinmis}
          title={geriAlinmis ? 'Bu oy zaten moderasyonla geri alındı.' : undefined}
          onClick={() => { setBildirim(null); setEylem('tek'); }}
        >
          Bu oyu geri al
        </Dugme>
        <Dugme
          tur="ikincil"
          boyut="kucuk"
          onClick={() => { setBildirim(null); setEylem('cerez-kayit'); }}
        >
          Bu çerezin bu kayıttaki oyları
        </Dugme>
        <Dugme
          tur="tehlike"
          boyut="kucuk"
          onClick={() => { setBildirim(null); setEylem('cerez-site'); }}
        >
          Bu çerezin tüm site oyları
        </Dugme>
        <Dugme
          tur="ikincil"
          boyut="kucuk"
          onClick={() => { setBildirim(null); setEylem('cerez'); }}
        >
          Bu çerezi engelle
        </Dugme>
        {satir.ipEtiketi ? (
          <Dugme
            tur="tehlike"
            boyut="kucuk"
            onClick={() => { setBildirim(null); setEylem('ag'); }}
          >
            Bu ağı engelle
          </Dugme>
        ) : null}
      </div>

      {bildirim ? (
        <div aria-live="polite" style={{ marginTop: '0.5rem' }}>
          <Bildirim tur="basari" mesaj={bildirim} kapat={() => setBildirim(null)} />
        </div>
      ) : null}

      {ayar ? (
        <GerekceDialogu
          acik={eylem !== null}
          baslik={ayar.baslik}
          aciklama={ayar.aciklama(satir)}
          uyari={ayar.uyari?.(satir)}
          ekOnay={ayar.ekOnay}
          onayMetni={ayar.onayMetni}
          tehlike={ayar.tehlike}
          onayla={onayla}
          onIptal={() => setEylem(null)}
        />
      ) : null}
    </>
  );
}
