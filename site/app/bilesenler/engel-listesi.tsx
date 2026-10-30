'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EngelSatiri } from '../../lib/moderasyon-deposu.ts';
import { Bildirim } from './bildirim.tsx';
import { Dugme } from './dugme.tsx';
import { GerekceDialogu, type GerekceSonucu } from './gerekce-dialogu.tsx';
import s from './engel-listesi.module.css';

const tarihBicimi = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

async function engelSil(id: string, gerekce: string): Promise<GerekceSonucu> {
  try {
    const yanit = await fetch(`/api/panel/engeller/${id}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ gerekce }),
    });

    if (yanit.status === 204) return { basarili: true };

    let veri: { hata?: unknown } | null = null;
    try {
      veri = await yanit.json() as { hata?: unknown };
    } catch {
      veri = null;
    }

    return {
      basarili: false,
      hata: typeof veri?.hata === 'string' ? veri.hata : 'Engel kaldırılamadı.',
    };
  } catch {
    return {
      basarili: false,
      hata: 'İşlem tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin.',
    };
  }
}

/** Aktif engel tablosu ve gerekçeli "Engeli kaldır" akışı. */
export function EngelListesi({ engeller }: { engeller: EngelSatiri[] }) {
  const [secilen, setSecilen] = useState<EngelSatiri | null>(null);
  const [bildirim, setBildirim] = useState<string | null>(null);
  const router = useRouter();

  async function onayla(gerekce: string): Promise<GerekceSonucu> {
    if (!secilen) return { basarili: false, hata: 'Engel seçilmedi.' };

    const sonuc = await engelSil(secilen.id, gerekce);
    if (sonuc.basarili) {
      setBildirim('Engel kaldırıldı; eski oylar yeniden sayılmaya başlayacak.');
      setSecilen(null);
      router.refresh();
    }
    return sonuc;
  }

  return (
    <>
      <div className={s.tabloSar}>
        <table className={s.tablo}>
          <thead>
            <tr>
              <th scope="col">Tür</th>
              <th scope="col">Etiket</th>
              <th scope="col">Sebep</th>
              <th scope="col">Başlangıç</th>
              <th scope="col">Bitiş</th>
              <th scope="col">Yapan</th>
              <th scope="col">Eylem</th>
            </tr>
          </thead>
          <tbody>
            {engeller.map((engel) => (
              <tr key={engel.id}>
                <td data-etiket="Tür">{engel.tur === 'tarayici' ? 'Çerez' : 'Ağ'}</td>
                <td data-etiket="Etiket"><code className={s.kimlik}>{engel.etiket}</code></td>
                <td data-etiket="Sebep">{engel.sebep ?? '—'}</td>
                <td data-etiket="Başlangıç">
                  <time dateTime={engel.olusturma.toISOString()}>
                    {tarihBicimi.format(engel.olusturma)}
                  </time>
                </td>
                <td data-etiket="Bitiş">
                  {engel.bitis ? (
                    <time dateTime={engel.bitis.toISOString()}>{tarihBicimi.format(engel.bitis)}</time>
                  ) : (
                    'Süresiz'
                  )}
                </td>
                <td data-etiket="Yapan">{engel.yapanEposta ?? '—'}</td>
                <td data-etiket="Eylem">
                  <Dugme
                    tur="ikincil"
                    boyut="kucuk"
                    onClick={() => {
                      setBildirim(null);
                      setSecilen(engel);
                    }}
                  >
                    Engeli kaldır
                  </Dugme>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bildirim ? (
        <div aria-live="polite" className={s.bildirimAlani}>
          <Bildirim tur="basari" mesaj={bildirim} kapat={() => setBildirim(null)} />
        </div>
      ) : null}

      <GerekceDialogu
        acik={secilen !== null}
        baslik="Engeli kaldır"
        aciklama={secilen
          ? `${secilen.etiket} engeli kaldırılacak. Bu kimliğin engel nedeniyle sayılmayan eski oyları yeniden hesaba katılır.`
          : undefined}
        onayMetni="Engeli kaldır"
        tehlike={false}
        onayla={onayla}
        onIptal={() => setSecilen(null)}
      />
    </>
  );
}
