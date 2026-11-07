'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dugme } from './dugme.tsx';
import { HataMetni } from './hata-metni.tsx';

interface TalepYaniti {
  durum?: string;
  talepId?: string;
  tur?: string;
  id?: string;
  hata?: string;
  kod?: string;
}

/**
 * Kayıtsız/arşivli link için ekleme talebi formu. Başarıda sunucunun
 * "talebiniz alındı" mesajını gösterir; link bu arada kayıtlı hale gelmişse
 * doğrudan içerik sayfasına yönlendirir.
 */
export function TalepFormu({ url }: { url: string }) {
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [basari, setBasari] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const router = useRouter();

  async function gonder(olay: React.FormEvent<HTMLFormElement>) {
    olay.preventDefault();
    setGonderiliyor(true);
    setBasari(null);
    setHata(null);

    try {
      const yanit = await fetch('/api/talepler', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ url }),
      });

      let veri: TalepYaniti | null = null;
      try {
        veri = await yanit.json() as TalepYaniti;
      } catch {
        veri = null;
      }

      if (veri?.durum === 'kayitli' && (veri.tur === 'video' || veri.tur === 'kanal') && veri.id) {
        router.push(`/icerik/${veri.tur}/${veri.id}`);
        return;
      }

      if (!yanit.ok) {
        setHata(veri?.hata ?? 'Talep gönderilemedi. Lütfen biraz sonra tekrar deneyin.');
        return;
      }

      if (veri?.durum === 'talep') {
        setBasari('Talebiniz alındı. Editörler inceleyecek.');
        return;
      }

      setHata('Talep yanıtı anlaşılamadı. Lütfen tekrar deneyin.');
    } catch {
      setHata('Talep gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <>
      <form className="kutu" onSubmit={gonder}>
        <input type="hidden" name="url" value={url} />
        <Dugme type="submit" yukleniyor={gonderiliyor} tamGenislik>
          Ekleme talebi gönder
        </Dugme>
      </form>

      {basari ? (
        <p className="sonuc tamam" role="status" aria-live="polite" aria-atomic="true">
          {basari}
        </p>
      ) : null}

      {hata ? <HataMetni mesaj={hata} /> : null}
    </>
  );
}
