'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { YayinAdayi } from '../../lib/yayin-deposu.ts';
import { Bildirim } from './bildirim.tsx';
import { Dugme } from './dugme.tsx';
import { FormAlani } from './form-alani.tsx';
import { HataMetni } from './hata-metni.tsx';
import a from '../admin/admin.module.css';
import s from '../admin/yayinlar/yayin.module.css';

async function yanitJson<T>(yanit: Response): Promise<T | null> {
  try {
    return await yanit.json() as T;
  } catch {
    return null;
  }
}

async function adayGetir(): Promise<YayinAdayi> {
  const yanit = await fetch('/api/admin/yayinlar/onizle', {
    method: 'POST',
    headers: { accept: 'application/json' },
  });
  const veri = await yanitJson<YayinAdayi & { hata?: string }>(yanit);
  if (!yanit.ok) throw new Error(veri?.hata ?? 'Önizleme üretilemedi.');
  if (!veri) throw new Error('Önizleme yanıtı okunamadı.');
  return veri;
}

/** Yayın adayı önizlemesi, not alanı ve yayınlama eylemi. */
export function YayinOnizleme({ baslangic }: { baslangic: YayinAdayi }) {
  const [aday, setAday] = useState<YayinAdayi>(baslangic);
  const [notlar, setNotlar] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<{ veriSurumu: number } | null>(null);
  const [islem, setIslem] = useState<'onizle' | 'yayinla' | null>(null);
  const notId = useId();
  const hataId = useId();
  const jsonId = useId();
  const router = useRouter();

  const json = JSON.stringify(aday.icerik, null, 2) ?? '';
  const kirpik = json.length > 4096;
  const onizleme = json.slice(0, 4096);

  async function onizle() {
    setHata(null);
    setIslem('onizle');
    try {
      setAday(await adayGetir());
      setBasari(null);
    } catch (yakalanan) {
      setHata(yakalanan instanceof Error ? yakalanan.message : 'Önizleme üretilemedi.');
    } finally {
      setIslem(null);
    }
  }

  async function yayinla() {
    if (!aday.gecerli) return;
    setHata(null);
    setIslem('yayinla');
    try {
      const yanit = await fetch('/api/admin/yayinlar', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ notlar }),
      });
      const veri = await yanitJson<{ veriSurumu?: number; hata?: string }>(yanit);

      if (!yanit.ok || !veri?.veriSurumu) {
        setHata(veri?.hata ?? 'Yayın oluşturulamadı. Lütfen tekrar deneyin.');
        return;
      }

      setBasari({ veriSurumu: veri.veriSurumu });
      setNotlar('');
      router.refresh();

      try {
        setAday(await adayGetir());
      } catch {
        // Yeni aday alınamazsa başarı mesajı ve yayın geçmişi yine de gösterilir.
      }
    } catch {
      setHata('Yayın oluşturulamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIslem(null);
    }
  }

  return (
    <div className={s.panel}>
      <div className={s.ust}>
        <div>
          <p className={s.surumEtiket}>Aday sürüm</p>
          <p className={s.surumDeger}>v{aday.veriSurumu}</p>
        </div>
        <p className={`${s.rozet} ${aday.gecerli ? s.rozetGecerli : s.rozetGecersiz}`}>
          {aday.gecerli ? 'Yayına hazır' : 'Düzeltme gerekli'}
        </p>
      </div>

      <div className={s.sayaclar}>
        <div className={s.sayac}>
          <p className={s.sayacEtiket}>Kanal</p>
          <p className={s.sayacDeger}>{aday.ozet.kanal}</p>
        </div>
        <div className={s.sayac}>
          <p className={s.sayacEtiket}>Video</p>
          <p className={s.sayacDeger}>{aday.ozet.video}</p>
        </div>
        <div className={s.sayac}>
          <p className={s.sayacEtiket}>Eşik altı</p>
          <p className={s.sayacDeger}>{aday.ozet.yazilmayan}</p>
        </div>
      </div>

      {aday.hatalar.length ? (
        <Bildirim
          tur="hata"
          mesaj={(
            <>
              Dosya üretilemedi:
              <ul className={s.liste}>
                {aday.hatalar.map((metin) => <li key={metin}>{metin}</li>)}
              </ul>
            </>
          )}
        />
      ) : null}

      {aday.uyarilar.length ? (
        <Bildirim
          tur="bilgi"
          mesaj={(
            <ul className={s.liste}>
              {aday.uyarilar.map((metin) => <li key={metin}>{metin}</li>)}
            </ul>
          )}
        />
      ) : null}

      {basari ? (
        <Bildirim
          tur="basari"
          mesaj={(
            <>
              v{basari.veriSurumu} yayınlandı.{' '}
              <a href={`/db.json?surum=${basari.veriSurumu}`}>db.json dosyasını indirin</a>.
            </>
          )}
          kapat={() => setBasari(null)}
        />
      ) : null}

      <div className={s.jsonBaslik}>
        <h2 className={a.bolumBaslik} id={jsonId}>db.json önizlemesi</h2>
        <p className={s.jsonNot}>
          Dosyanın ilk 4 KB&apos;ı gösterilir; tamamı yayından sonra indirilebilir.
        </p>
      </div>
      <pre className={s.json} tabIndex={0} aria-labelledby={jsonId}>
        {onizleme}{kirpik ? '\n… (devamı kısaltıldı)' : ''}
      </pre>

      <FormAlani
        etiket="Yayın notu"
        htmlFor={notId}
        ipucu="İsteğe bağlı; en fazla 500 karakter. Eski sürümler değiştirilmez."
      >
        <textarea
          id={notId}
          value={notlar}
          onChange={(olay) => setNotlar(olay.target.value)}
          maxLength={500}
          rows={3}
        />
      </FormAlani>
      <p className={s.karakter}>{notlar.length} / 500</p>

      {hata ? <HataMetni mesaj={hata} id={hataId} /> : null}

      <div className={a.formAlt}>
        <Dugme
          tur="ikincil"
          onClick={onizle}
          yukleniyor={islem === 'onizle'}
          disabled={islem === 'yayinla'}
        >
          Önizle
        </Dugme>
        <Dugme
          onClick={yayinla}
          yukleniyor={islem === 'yayinla'}
          disabled={!aday.gecerli || islem === 'onizle'}
        >
          Yayınla
        </Dugme>
      </div>
    </div>
  );
}
