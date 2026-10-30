'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { HesapSatiri } from '../../lib/hesap-deposu.ts';
import { Bildirim } from './bildirim.tsx';
import { Dugme } from './dugme.tsx';
import { FormAlani } from './form-alani.tsx';
import { HataMetni } from './hata-metni.tsx';
import s from '../admin/admin.module.css';

type Rol = 'editor' | 'admin';

const tarihBicimi = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Istanbul',
});

function tarihYaz(deger: Date | string | null): string {
  if (!deger) return '—';
  const tarih = new Date(deger);
  return Number.isNaN(tarih.getTime()) ? '—' : tarihBicimi.format(tarih);
}

async function hataOku(yanit: Response): Promise<string | null> {
  try {
    const veri = await yanit.json() as { hata?: unknown };
    return typeof veri.hata === 'string' ? veri.hata : null;
  } catch {
    return null;
  }
}

/** Hesap tablosu: rol kaydı, aktiflik ve tek seferlik geçici parola işlemleri. */
export function HesapTablosu({
  hesaplar,
  kendiId,
}: {
  hesaplar: HesapSatiri[];
  kendiId: string;
}) {
  const [roller, setRoller] = useState<Record<string, Rol>>(
    () => Object.fromEntries(hesaplar.map((hesap) => [hesap.id, hesap.rol])),
  );
  const [islem, setIslem] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [parolaHedefi, setParolaHedefi] = useState<HesapSatiri | null>(null);
  const [geciciParola, setGeciciParola] = useState('');
  const [parolaHatasi, setParolaHatasi] = useState<string | null>(null);
  const [sifreSonucu, setSifreSonucu] = useState<{ eposta: string; parola: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const parolaId = useId();
  const parolaHatasiId = useId();
  const dialogBaslikId = useId();
  const router = useRouter();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (parolaHedefi && !dialog.open) dialog.showModal();
    else if (!parolaHedefi && dialog.open) dialog.close();
  }, [parolaHedefi]);

  function temizle() {
    setHata(null);
    setBasari(null);
  }

  async function kaydetRol(hesap: HesapSatiri) {
    const yeniRol = roller[hesap.id] ?? hesap.rol;
    if (yeniRol === hesap.rol) return;

    temizle();
    setIslem(`rol:${hesap.id}`);
    try {
      const yanit = await fetch(`/api/admin/hesaplar/${encodeURIComponent(hesap.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ rol: yeniRol }),
      });

      if (!yanit.ok) {
        setRoller((onceki) => ({ ...onceki, [hesap.id]: hesap.rol }));
        setHata(await hataOku(yanit) ?? 'Rol güncellenemedi. Lütfen tekrar deneyin.');
        return;
      }

      setBasari(`${hesap.eposta} için rol güncellendi.`);
      router.refresh();
    } catch {
      setRoller((onceki) => ({ ...onceki, [hesap.id]: hesap.rol }));
      setHata('Rol güncellenemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIslem(null);
    }
  }

  async function degistirAktif(hesap: HesapSatiri) {
    const yeniAktif = !hesap.aktif;
    temizle();
    setIslem(`aktif:${hesap.id}`);
    try {
      const yanit = await fetch(`/api/admin/hesaplar/${encodeURIComponent(hesap.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ aktif: yeniAktif }),
      });

      if (!yanit.ok) {
        setHata(await hataOku(yanit) ?? 'Hesap durumu değiştirilemedi.');
        return;
      }

      setBasari(`${hesap.eposta} ${yeniAktif ? 'etkinleştirildi' : 'pasifleştirildi'}.`);
      router.refresh();
    } catch {
      setHata('Hesap durumu değiştirilemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIslem(null);
    }
  }

  function parolaDialogAc(hesap: HesapSatiri) {
    temizle();
    setGeciciParola('');
    setParolaHatasi(null);
    setParolaHedefi(hesap);
  }

  async function parolaKaydet(olay: React.FormEvent<HTMLFormElement>) {
    olay.preventDefault();
    if (!parolaHedefi) return;

    if (geciciParola.length < 12) {
      setParolaHatasi('Parola en az 12 karakter olmalı.');
      return;
    }

    setParolaHatasi(null);
    setIslem('parola');
    try {
      const yanit = await fetch(`/api/admin/hesaplar/${encodeURIComponent(parolaHedefi.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ geciciParola }),
      });

      if (!yanit.ok) {
        setParolaHatasi(await hataOku(yanit) ?? 'Geçici parola kaydedilemedi.');
        return;
      }

      setSifreSonucu({ eposta: parolaHedefi.eposta, parola: geciciParola });
      setGeciciParola('');
      setParolaHedefi(null);
      router.refresh();
    } catch {
      setParolaHatasi('Geçici parola kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIslem(null);
    }
  }

  return (
    <>
      {hata ? <Bildirim tur="hata" mesaj={hata} kapat={() => setHata(null)} /> : null}
      {basari ? <Bildirim tur="basari" mesaj={basari} kapat={() => setBasari(null)} /> : null}

      {sifreSonucu ? (
        <div className={s.sifreKutu} role="status" aria-live="polite">
          <p className={s.sifreBaslik}>{sifreSonucu.eposta} için geçici parola</p>
          <code className={s.sifreKod}>{sifreSonucu.parola}</code>
          <p className={s.sifreNot}>
            Yalnızca bir kez gösterilir. Sayfayı yenilediğinizde kaybolur; güvenli bir
            kanaldan iletin.
          </p>
          <div>
            <Dugme tur="ikincil" boyut="kucuk" onClick={() => setSifreSonucu(null)}>
              Parolayı gizle
            </Dugme>
          </div>
        </div>
      ) : null}

      <div className={s.tabloSar}>
        <table className={s.tablo}>
          <thead>
            <tr>
              <th scope="col">E-posta</th>
              <th scope="col">Rol</th>
              <th scope="col">Durum</th>
              <th scope="col">Son giriş</th>
              <th scope="col">Oluşturma</th>
              <th scope="col">Eylemler</th>
            </tr>
          </thead>
          <tbody>
            {hesaplar.map((hesap) => {
              const kendi = hesap.id === kendiId;
              const seciliRol = roller[hesap.id] ?? hesap.rol;
              const rolDegisti = seciliRol !== hesap.rol;
              const rolIslem = islem === `rol:${hesap.id}`;
              const aktifIslem = islem === `aktif:${hesap.id}`;

              return (
                <tr key={hesap.id}>
                  <td data-etiket="E-posta">
                    <code className={s.eposta}>{hesap.eposta}</code>
                    {kendi ? <p className={s.neden}>Siz</p> : null}
                  </td>

                  <td data-etiket="Rol">
                    <select
                      className={s.rolSecim}
                      value={seciliRol}
                      disabled={kendi || islem !== null}
                      aria-label={`${hesap.eposta} rolü`}
                      onChange={(olay) => {
                        const yeni = olay.target.value === 'admin' ? 'admin' : 'editor';
                        setRoller((onceki) => ({ ...onceki, [hesap.id]: yeni }));
                      }}
                    >
                      <option value="editor">Editör</option>
                      <option value="admin">Admin</option>
                    </select>
                    {kendi ? (
                      <p className={s.neden}>Kendi rolünüzü değiştiremezsiniz.</p>
                    ) : (
                      <div className={s.eylemler} style={{ marginTop: '0.4rem' }}>
                        <Dugme
                          tur="ikincil"
                          boyut="kucuk"
                          disabled={!rolDegisti || islem !== null}
                          yukleniyor={rolIslem}
                          onClick={() => { void kaydetRol(hesap); }}
                        >
                          Rolü kaydet
                        </Dugme>
                      </div>
                    )}
                  </td>

                  <td data-etiket="Durum">
                    <span className={`${s.durum} ${hesap.aktif ? s.durumAktif : s.durumPasif}`}>
                      {hesap.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>

                  <td data-etiket="Son giriş">
                    <span className={s.meta}>{tarihYaz(hesap.sonGiris)}</span>
                  </td>

                  <td data-etiket="Oluşturma">
                    <span className={s.meta}>{tarihYaz(hesap.olusturma)}</span>
                  </td>

                  <td data-etiket="Eylemler">
                    <div className={s.eylemler}>
                      {kendi ? (
                        <p className={s.neden}>Kendi hesabınızı pasifleştiremezsiniz.</p>
                      ) : (
                        <Dugme
                          tur={hesap.aktif ? 'tehlike' : 'ikincil'}
                          boyut="kucuk"
                          disabled={islem !== null}
                          yukleniyor={aktifIslem}
                          onClick={() => { void degistirAktif(hesap); }}
                        >
                          {hesap.aktif ? 'Pasifleştir' : 'Etkinleştir'}
                        </Dugme>
                      )}
                      <Dugme
                        tur="ikincil"
                        boyut="kucuk"
                        disabled={islem !== null}
                        onClick={() => parolaDialogAc(hesap)}
                      >
                        Geçici parola ver
                      </Dugme>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <dialog
        ref={dialogRef}
        className={s.dialog}
        aria-labelledby={dialogBaslikId}
        onClose={() => {
          setParolaHedefi(null);
          setGeciciParola('');
          setParolaHatasi(null);
        }}
      >
        <form onSubmit={parolaKaydet} noValidate>
          <h2 className={s.formBaslik} id={dialogBaslikId}>Geçici parola ver</h2>
          <p className={s.formAciklama}>
            {parolaHedefi?.eposta} hesabı için yeni bir geçici parola belirleyin. Hesabın açık
            oturumları kapatılır ve kullanıcı ilk girişte parolasını değiştirmek zorunda kalır.
          </p>

          <FormAlani
            etiket="Geçici parola"
            htmlFor={parolaId}
            zorunlu
            ipucu="En az 12 karakter."
          >
            <input
              id={parolaId}
              type="text"
              value={geciciParola}
              onChange={(olay) => {
                setGeciciParola(olay.target.value);
                if (parolaHatasi) setParolaHatasi(null);
              }}
              autoComplete="new-password"
              spellCheck={false}
              aria-invalid={parolaHatasi ? true : undefined}
              aria-describedby={parolaHatasi ? parolaHatasiId : undefined}
              required
            />
          </FormAlani>

          {parolaHatasi ? <HataMetni mesaj={parolaHatasi} id={parolaHatasiId} /> : null}

          <div className={s.formAlt} style={{ marginTop: '1rem' }}>
            <Dugme
              type="button"
              tur="ikincil"
              disabled={islem === 'parola'}
              onClick={() => dialogRef.current?.close()}
            >
              Vazgeç
            </Dugme>
            <Dugme type="submit" yukleniyor={islem === 'parola'}>
              Parolayı kaydet
            </Dugme>
          </div>
        </form>
      </dialog>
    </>
  );
}
