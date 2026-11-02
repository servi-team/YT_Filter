'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bildirim } from './bildirim.tsx';
import { Dugme } from './dugme.tsx';
import { FormAlani } from './form-alani.tsx';
import { HataMetni } from './hata-metni.tsx';
import a from '../admin/admin.module.css';

export interface MetadataBaslangic {
  ad: string | null;
  handle: string | null;
  avatar: string | null;
  baslik: string | null;
  kanalAdi: string | null;
  kanalHandle: string | null;
  kanalAvatar: string | null;
}

async function hataOku(yanit: Response): Promise<string | null> {
  try {
    const veri = await yanit.json() as { hata?: unknown };
    return typeof veri.hata === 'string' ? veri.hata : null;
  } catch {
    return null;
  }
}

/** Kanal/video metadata formu; türe göre yalnızca ilgili alanları gönderir. */
export function MetadataFormu({
  tur,
  id,
  baslangic,
}: {
  tur: 'kanal' | 'video';
  id: string;
  baslangic: MetadataBaslangic;
}) {
  const [ad, setAd] = useState(baslangic.ad ?? '');
  const [handle, setHandle] = useState(baslangic.handle ?? '');
  const [avatar, setAvatar] = useState(baslangic.avatar ?? '');
  const [baslik, setBaslik] = useState(baslangic.baslik ?? '');
  const [kanalAdi, setKanalAdi] = useState(baslangic.kanalAdi ?? '');
  const [kanalHandle, setKanalHandle] = useState(baslangic.kanalHandle ?? '');
  const [kanalAvatar, setKanalAvatar] = useState(baslangic.kanalAvatar ?? '');
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const hataId = useId();
  const adId = useId();
  const handleId = useId();
  const avatarId = useId();
  const baslikId = useId();
  const kanalAdiId = useId();
  const kanalHandleId = useId();
  const kanalAvatarId = useId();
  const router = useRouter();

  async function gonder(olay: React.FormEvent<HTMLFormElement>) {
    olay.preventDefault();
    setHata(null);
    setBasari(null);
    setYukleniyor(true);

    try {
      const govde = tur === 'kanal'
        ? { ad, handle, avatar }
        : { baslik, kanalAdi, kanalHandle, kanalAvatar };

      const yanit = await fetch(
        `/api/admin/icerikler/${tur}/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(govde),
        },
      );

      if (!yanit.ok) {
        setHata(await hataOku(yanit) ?? 'Metadata kaydedilemedi. Lütfen tekrar deneyin.');
        return;
      }

      setBasari('Metadata güncellendi.');
      router.refresh();
    } catch {
      setHata('Metadata kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <>
      {basari ? <Bildirim tur="basari" mesaj={basari} kapat={() => setBasari(null)} /> : null}

      <form className={a.form} onSubmit={gonder} noValidate>
        <div className={a.formGrid}>
          {tur === 'kanal' ? (
            <>
              <FormAlani etiket="Kanal adı" htmlFor={adId} ipucu="Boş bırakılırsa temizlenir.">
                <input
                  id={adId}
                  type="text"
                  value={ad}
                  onChange={(olay) => { setAd(olay.target.value); if (hata) setHata(null); }}
                  autoComplete="off"
                />
              </FormAlani>

              <FormAlani etiket="Handle" htmlFor={handleId} ipucu="@ ile başlamalı; boş bırakılırsa temizlenir.">
                <input
                  id={handleId}
                  type="text"
                  value={handle}
                  onChange={(olay) => { setHandle(olay.target.value); if (hata) setHata(null); }}
                  placeholder="@kanal"
                  autoComplete="off"
                  spellCheck={false}
                />
              </FormAlani>

              <FormAlani etiket="Avatar adresi" htmlFor={avatarId} ipucu="Yalnızca https:// adresleri kabul edilir.">
                <input
                  id={avatarId}
                  type="text"
                  value={avatar}
                  onChange={(olay) => { setAvatar(olay.target.value); if (hata) setHata(null); }}
                  placeholder="https://…"
                  autoComplete="off"
                  spellCheck={false}
                />
              </FormAlani>
            </>
          ) : (
            <>
              <FormAlani etiket="Video başlığı" htmlFor={baslikId} ipucu="Boş bırakılırsa temizlenir.">
                <input
                  id={baslikId}
                  type="text"
                  value={baslik}
                  onChange={(olay) => { setBaslik(olay.target.value); if (hata) setHata(null); }}
                  autoComplete="off"
                />
              </FormAlani>

              <FormAlani etiket="Kanal adı" htmlFor={kanalAdiId} ipucu="Boş bırakılırsa temizlenir.">
                <input
                  id={kanalAdiId}
                  type="text"
                  value={kanalAdi}
                  onChange={(olay) => { setKanalAdi(olay.target.value); if (hata) setHata(null); }}
                  autoComplete="off"
                />
              </FormAlani>

              <FormAlani etiket="Kanal handle" htmlFor={kanalHandleId} ipucu="@ ile başlamalı; boş bırakılırsa temizlenir.">
                <input
                  id={kanalHandleId}
                  type="text"
                  value={kanalHandle}
                  onChange={(olay) => { setKanalHandle(olay.target.value); if (hata) setHata(null); }}
                  placeholder="@kanal"
                  autoComplete="off"
                  spellCheck={false}
                />
              </FormAlani>

              <FormAlani etiket="Kanal avatarı" htmlFor={kanalAvatarId} ipucu="Yalnızca https:// adresleri kabul edilir.">
                <input
                  id={kanalAvatarId}
                  type="text"
                  value={kanalAvatar}
                  onChange={(olay) => { setKanalAvatar(olay.target.value); if (hata) setHata(null); }}
                  placeholder="https://…"
                  autoComplete="off"
                  spellCheck={false}
                />
              </FormAlani>
            </>
          )}
        </div>

        {hata ? <HataMetni mesaj={hata} id={hataId} /> : null}

        <div className={a.formAlt}>
          <Dugme type="submit" yukleniyor={yukleniyor}>Kaydet</Dugme>
        </div>
      </form>
    </>
  );
}
