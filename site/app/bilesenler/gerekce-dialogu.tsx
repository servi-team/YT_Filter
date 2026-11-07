'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Dugme } from './dugme.tsx';
import { HataMetni } from './hata-metni.tsx';
import s from './onay-diyalogu.module.css';

export type GerekceSonucu =
  | { basarili: true }
  | { basarili: false; hata: string };

export interface GerekceDialoguProps {
  acik: boolean;
  baslik: string;
  aciklama?: ReactNode;
  uyari?: ReactNode;
  ekOnay?: string;
  onayMetni?: string;
  tehlike?: boolean;
  onayla: (gerekce: string) => Promise<GerekceSonucu>;
  onIptal: () => void;
}

/**
 * Gerekçe zorunlu onay dialogu. Onay düğmesi gerekçe yazılmadan (ve varsa
 * ek onay işaretlenmeden) kapalıdır. `OnayDiyalogu` ile aynı görsel dili
 * kullanır; form alanları ve doğrulama burada yönetilir.
 */
export function GerekceDialogu({
  acik,
  baslik,
  aciklama,
  uyari,
  ekOnay,
  onayMetni = 'Onayla',
  tehlike = false,
  onayla,
  onIptal,
}: GerekceDialoguProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [gerekce, setGerekce] = useState('');
  const [ekOnayIsaretli, setEkOnayIsaretli] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const baslikId = useId();
  const gerekceId = useId();
  const hataId = `${gerekceId}-hata`;
  const ekOnayId = useId();

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (acik && !d.open) d.showModal();
    else if (!acik && d.open) d.close();
  }, [acik]);

  function kapat() {
    if (gonderiliyor) return;
    setGerekce('');
    setEkOnayIsaretli(false);
    setHata(null);
    onIptal();
  }

  const onayKapali = !gerekce.trim()
    || Boolean(ekOnay && !ekOnayIsaretli)
    || gonderiliyor;

  async function gonder() {
    const metin = gerekce.trim();
    if (!metin || (ekOnay && !ekOnayIsaretli)) {
      setHata('Devam etmek için gerekçe yazın.');
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
      setGerekce('');
      setEkOnayIsaretli(false);
      onIptal();
    } catch {
      setHata('İşlem tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-labelledby={baslikId}
      onCancel={(olay) => {
        olay.preventDefault();
        kapat();
      }}
      onClick={(olay) => {
        if (olay.target === olay.currentTarget) kapat();
      }}
    >
      <div className={s.ic}>
        <h2 className={s.baslik} id={baslikId}>{baslik}</h2>

        <div className={s.govde}>
          {aciklama ? <p>{aciklama}</p> : null}

          {uyari ? (
            <div
              role="note"
              style={{
                margin: '0 0 1rem',
                padding: '0.7rem 0.85rem',
                borderLeft: '3px solid var(--amber)',
                borderRadius: '8px',
                background: 'color-mix(in srgb, var(--amber) 10%, transparent)',
                color: 'var(--murekkep)',
                fontSize: '0.9rem',
              }}
            >
              {uyari}
            </div>
          ) : null}

          <label
            htmlFor={gerekceId}
            style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, color: 'var(--murekkep)' }}
          >
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

          {ekOnay ? (
            <label
              htmlFor={ekOnayId}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.55rem',
                marginTop: '0.9rem',
                color: 'var(--murekkep)',
                fontSize: '0.9rem',
                fontWeight: 700,
              }}
            >
              <input
                id={ekOnayId}
                type="checkbox"
                checked={ekOnayIsaretli}
                onChange={(olay) => {
                  setEkOnayIsaretli(olay.target.checked);
                  if (hata) setHata(null);
                }}
                style={{ width: '1.1rem', height: '1.1rem', marginTop: '0.18rem', flex: '0 0 auto' }}
              />
              <span>{ekOnay}</span>
            </label>
          ) : null}
        </div>

        <div className={s.alt}>
          <Dugme tur="ikincil" onClick={kapat} disabled={gonderiliyor}>Vazgeç</Dugme>
          <Dugme
            tur={tehlike ? 'tehlike' : 'birincil'}
            onClick={() => { void gonder(); }}
            disabled={onayKapali}
            yukleniyor={gonderiliyor}
          >
            {onayMetni}
          </Dugme>
        </div>
      </div>
    </dialog>
  );
}
