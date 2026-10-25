// Eklenti veritabanını JSON olarak dışa aktarma (yalnızca yönetici)
sayfaKaydet({
    desen: /^#\/disa-aktar$/,
    baslik: 'Dışa Aktar',
    menu: 'Dışa Aktar',
    menuYolu: '#/disa-aktar',
    admin: true,
    ciz: async (kok) => {
        const [onizleme, gecmis] = await Promise.all([api('/disa-aktarimlar/onizleme'), api('/disa-aktarimlar')]);

        const olusturDugmesi = el('button', {
            class: 'dugme',
            onclick: async () => {
                if (!confirm(`${onizleme.sonrakiSurum} sürümü oluşturulsun mu? (${onizleme.videoSayisi} video, ${onizleme.kanalSayisi} kanal)`)) return;
                olusturDugmesi.disabled = true;
                try {
                    const kayit = await api('/disa-aktarimlar', { yontem: 'POST', govde: {} });
                    bildirim(`${kayit.surum} sürümü oluşturuldu`);
                    yonlendir();
                } catch (h) {
                    bildirim(h.message, 'hata');
                    olusturDugmesi.disabled = false;
                }
            }
        }, `${onizleme.sonrakiSurum} sürümünü oluştur`);

        const bilgi = (etiket, deger) => el('div', { class: 'sonuc-grup' }, el('div', { class: 'sonuc-etiket' }, etiket), el('div', { style: 'font-size: 20px; font-weight: 700' }, deger));

        const satirlar = gecmis.map(k => el('tr', {},
            el('td', {}, el('code', {}, k.surum)),
            el('td', {}, new Date(k.olusturulma).toLocaleString('tr-TR')),
            el('td', {}, k.editor || '—'),
            el('td', { class: 'sayi' }, k.videoSayisi),
            el('td', { class: 'sayi' }, k.kanalSayisi),
            el('td', { class: 'sayi' }, el('a', {
                class: 'dugme dugme-ikincil dugme-kucuk',
                href: `/api/disa-aktarimlar/${encodeURIComponent(k.surum)}/dosya`,
                download: `veritabani-${k.surum}.json`
            }, 'JSON indir'))
        ));

        kok.append(
            el('div', { class: 'sayfa-baslik' },
                el('div', {},
                    el('h1', {}, 'Dışa Aktar'),
                    el('p', { class: 'aciklama' }, 'Oylama sonuçları eklentinin okuyacağı JSON veritabanına dönüştürülür. Eklenti siteye bağlanmaz; indirilen dosya eklentinin kaynak koduna eklenir.')
                )
            ),
            el('section', { class: 'kart' },
                el('h2', {}, 'Şu an dışa aktarılırsa'),
                el('div', { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0 16px' },
                    bilgi('Video', onizleme.videoSayisi),
                    bilgi('Kanal', onizleme.kanalSayisi),
                    bilgi('Bilinmeyen kalacak', onizleme.toplamIcerik - onizleme.videoSayisi - onizleme.kanalSayisi),
                    bilgi('Konu / Etiket', `${onizleme.konuSayisi} / ${onizleme.etiketSayisi}`)
                ),
                el('p', { class: 'icerik-alt', style: 'margin: 10px 0 14px' }, 'Ne konusu ne etiketi belirlenmiş içerikler dosyaya yazılmaz; eklentide bilinmeyen olarak kalır.'),
                olusturDugmesi
            ),
            el('section', { class: 'kart' },
                el('h2', {}, 'Eklentiye ekleme'),
                el('p', { class: 'aciklama' }, 'İndirdiğiniz dosyayı eklenti deposunun kökünde şu komutlarla içe aktarın:'),
                el('pre', { class: 'kod' }, 'npm run db:import -- veritabani-SURUM.json\nnpm run build')
            ),
            el('section', { class: 'kart tablo-kap' },
                el('h2', {}, 'Sürüm geçmişi'),
                gecmis.length === 0
                    ? bosDurum('Henüz dışa aktarım yapılmadı.')
                    : el('table', { class: 'tablo' },
                        el('thead', {}, el('tr', {}, el('th', {}, 'Sürüm'), el('th', {}, 'Tarih'), el('th', {}, 'Oluşturan'), el('th', { class: 'sayi' }, 'Video'), el('th', { class: 'sayi' }, 'Kanal'), el('th', {}, ''))),
                        el('tbody', {}, satirlar)
                    )
            )
        );
    }
});
