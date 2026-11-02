'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dugme } from './dugme.tsx';
import { HataMetni } from './hata-metni.tsx';
import { OnayDiyalogu } from './onay-diyalogu.tsx';

export type ArsivSonucu =
  | { basarili: true }
  | { basarili: false; hata: string };

export interface ArsivDialoguProps {
  acik: boolean;
  baslik: string;
  aciklama: string;
  onayMetni?: string;
  tehlike?: boolean;
  onayla: (gerekce: string) => Promise<ArsivSonucu>;
  onKapat: () => void;
}

/** Gerekçe zorunlu arşiv/geri getirme dialogu; `OnayDiyalogu` görsel dilini kullanır. */
export function ArsivDialogu({
  acik,
  baslik,
  aciklama,
  onayMetni = 'Arşivle',
  tehlike = true,
  onayla,
  onKapat,
}: ArsivDialoguProps) {
  const [gerekce, setGerekce] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const gerekceId = useId();
  const hataId = useId();

  useEffect(() => {
    if (!acik) {
      setGerekce('');
      setHata(null);
    }
  }, [acik]);

  async function gonder() {
    if (gonderiliyor) return;
    const metin = gerekce.trim();
    if (!metin) {
      setHata('Gerekçe zorunlu.');
      return;
    }

    setHata(null);
    setGonderiliyor(true);
    try {
      const sonuc = await onayla(metin);
      if (!sonuc.basarili) {
        setHata(sonuc.hata);
        return;
      }
      onKapat();
    } catch {
      setHata('İşlem tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <OnayDiyalogu
      acik={acik}
      baslik={baslik}
      onayla={() => { void gonder(); }}
      onIptal={onKapat}
      onayMetni={gonderiliyor ? 'İşleniyor…' : onayMetni}
      iptalMetni="Vazgeç"
      tehlike={tehlike}
    >
      <p>{aciklama}</p>
      <label htmlFor={gerekceId} style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}>
        Gerekçe <span style={{ color: 'var(--sinyal)' }}>(zorunlu)</span>
      </label>
      <textarea
        id={gerekceId}
        value={gerekce}
        onChange={(olay) => {
          setGerekce(olay.target.value);
          if (hata) setHata(null);
        }}
        rows={4}
        maxLength={1000}
        required
        aria-invalid={hata ? true : undefined}
        aria-describedby={hata ? hataId : undefined}
        style={{
          width: '100%',
          minHeight: '7rem',
          padding: '0.65rem 0.8rem',
          border: '1px solid var(--cizgi)',
          borderRadius: '10px',
          background: 'var(--yuzey)',
          color: 'inherit',
          resize: 'vertical',
        }}
      />
      <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem' }}>
        Gerekçe moderasyon kaydında kalır.
      </p>
      {hata ? <HataMetni mesaj={hata} id={hataId} /> : null}
    </OnayDiyalogu>
  );
}

async function hataOku(yanit: Response): Promise<string | null> {
  try {
    const veri = await yanit.json() as { hata?: unknown };
    return typeof veri.hata === 'string' ? veri.hata : null;
  } catch {
    return null;
  }
}

/**
 * Tablo satırındaki arşiv/geri getirme düğmesi. Dialogu açar, POST isteğini
 * yapar ve başarıda sunucu bileşenlerini yeniler.
 */
export function ArsivEylemi({
  tur,
  id,
  baslik,
  arsivli,
}: {
  tur: 'kanal' | 'video';
  id: string;
  baslik: string;
  arsivli: boolean;
}) {
  const [acik, setAcik] = useState(false);
  const router = useRouter();

  async function gonder(gerekce: string): Promise<ArsivSonucu> {
    try {
      const yanit = await fetch(
        `/api/admin/icerikler/${tur}/${encodeURIComponent(id)}/${arsivli ? 'geri-getir' : 'arsivle'}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ gerekce }),
        },
      );

      if (!yanit.ok) {
        return {
          basarili: false,
          hata: await hataOku(yanit) ?? 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
        };
      }

      router.refresh();
      return { basarili: true };
    } catch {
      return {
        basarili: false,
        hata: 'İşlem tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin.',
      };
    }
  }

  return (
    <>
      <Dugme
        tur={arsivli ? 'ikincil' : 'tehlike'}
        boyut="kucuk"
        onClick={() => setAcik(true)}
      >
        {arsivli ? 'Geri getir' : 'Arşivle'}
      </Dugme>
      <ArsivDialogu
        acik={acik}
        baslik={arsivli ? 'Kaydı geri getir' : 'Kaydı arşivle'}
        aciklama={arsivli
          ? `“${baslik}” yeniden kamusal listelerde görünecek. Oylar ve kilit korunur.`
          : `“${baslik}” kamusal listelerden ve yayın adayından çıkacak. Oylar ve kilit silinmez.`}
        onayMetni={arsivli ? 'Geri getir' : 'Arşivle'}
        tehlike={!arsivli}
        onayla={gonder}
        onKapat={() => setAcik(false)}
      />
    </>
  );
}
