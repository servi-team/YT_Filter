// İçerik listesi ve link yapıştırarak ekleme
Uygulama.varsayilanYol = '#/icerikler';

function turRozeti(tur) {
    return el('span', { class: 'rozet' }, tur === 'video' ? 'Video' : 'Kanal');
}

function kapakGorseli(icerik, sinif = 'kapak') {
    return icerik.kapakUrl
        ? el('img', { class: sinif, src: icerik.kapakUrl, alt: '', loading: 'lazy' })
        : el('div', { class: `${sinif} kapak-bos` }, icerik.tur === 'kanal' ? '@' : '▶');
}

sayfaKaydet({
    desen: /^#\/icerikler$/,
    baslik: 'İçerikler',
    menu: 'İçerikler',
    menuYolu: '#/icerikler',
    ciz: async (kok) => {
        const durum = { arama: '', tur: '', sayfa: 1 };
        const listeAlani = el('div');

        const listeyiCiz = async () => {
            const sorgu = new URLSearchParams({ arama: durum.arama, tur: durum.tur, sayfa: durum.sayfa });
            const veri = await api(`/icerikler?${sorgu}`);
            const sayfaSayisi = Math.max(1, Math.ceil(veri.toplam / veri.sayfaBoyutu));

            const satirlar = veri.icerikler.map(icerik => el('tr', {
                class: 'tiklanabilir',
                onclick: () => { location.hash = `#/icerik/${icerik.id}`; }
            },
                el('td', { style: 'width: 110px' }, kapakGorseli(icerik)),
                el('td', {},
                    el('a', { class: 'icerik-baslik', href: `#/icerik/${icerik.id}` }, icerik.baslik || icerik.youtubeId),
                    el('div', { class: 'icerik-alt' }, icerik.tur === 'video' ? (icerik.kanalAdi || icerik.kanalHandle || '') : icerik.youtubeId)
                ),
                el('td', {}, turRozeti(icerik.tur)),
                el('td', { class: 'sonuc-hucre', dataset: { icerikId: icerik.id } }),
                el('td', { class: 'icerik-alt' }, icerik.ekleyen || '—', el('br'), new Date(icerik.eklenme).toLocaleDateString('tr-TR'))
            ));

            listeAlani.replaceChildren(
                veri.icerikler.length === 0
                    ? bosDurum(durum.arama ? 'Aramayla eşleşen içerik yok.' : 'Henüz içerik eklenmemiş. Yukarıya bir YouTube linki yapıştırın.')
                    : el('div', { class: 'tablo-kap' },
                        el('table', { class: 'tablo' },
                            el('thead', {}, el('tr', {}, el('th', {}, ''), el('th', {}, 'İçerik'), el('th', {}, 'Tür'), el('th', {}, 'Sonuç'), el('th', {}, 'Ekleyen'))),
                            el('tbody', {}, satirlar)
                        )
                    ),
                el('div', { class: 'sayfalama' },
                    el('span', { class: 'icerik-alt' }, `${veri.toplam} içerik · Sayfa ${veri.sayfa}/${sayfaSayisi}`),
                    el('button', { class: 'dugme dugme-ikincil dugme-kucuk', disabled: durum.sayfa <= 1, onclick: () => { durum.sayfa--; listeyiCiz(); } }, '‹ Önceki'),
                    el('button', { class: 'dugme dugme-ikincil dugme-kucuk', disabled: durum.sayfa >= sayfaSayisi, onclick: () => { durum.sayfa++; listeyiCiz(); } }, 'Sonraki ›')
                )
            );
            document.dispatchEvent(new CustomEvent('icerik-listesi-cizildi', { detail: { icerikler: veri.icerikler, kok: listeAlani } }));
        };

        // Link ekleme formu
        const link = el('input', { type: 'text', id: 'yeniLink', placeholder: 'https://www.youtube.com/watch?v=… veya https://www.youtube.com/@kanal', autocomplete: 'off' });
        const hata = el('p', { class: 'hata-metni', role: 'alert' });
        const ekleDugmesi = el('button', { class: 'dugme', type: 'submit' }, 'Ekle');
        const form = el('form', {
            onsubmit: async (e) => {
                e.preventDefault();
                hata.textContent = '';
                ekleDugmesi.disabled = true;
                try {
                    const icerik = await api('/icerikler', { yontem: 'POST', govde: { link: link.value } });
                    bildirim('İçerik eklendi');
                    location.hash = `#/icerik/${icerik.id}`;
                } catch (h) {
                    hata.textContent = h.message;
                    // Zaten eklenmiş içerik: oylama sayfasına götür
                    if (h.durum === 409 && h.veri && h.veri.id) {
                        bildirim('Bu içerik zaten eklenmiş, oylama sayfası açıldı');
                        location.hash = `#/icerik/${h.veri.id}`;
                    }
                } finally {
                    ekleDugmesi.disabled = false;
                }
            }
        },
            el('div', { class: 'form-satir' }, el('div', { class: 'alan' }, link), ekleDugmesi),
            hata
        );

        // Arama ve tür filtresi
        let aramaZamanlayici = null;
        const arama = el('input', {
            type: 'search',
            placeholder: 'Başlık, kanal veya ID ara…',
            'aria-label': 'İçeriklerde ara',
            oninput: (e) => {
                clearTimeout(aramaZamanlayici);
                aramaZamanlayici = setTimeout(() => {
                    durum.arama = e.target.value.trim();
                    durum.sayfa = 1;
                    listeyiCiz();
                }, 300);
            }
        });
        const cipler = el('div', { class: 'cipler' }, [['', 'Tümü'], ['video', 'Videolar'], ['kanal', 'Kanallar']].map(([deger, etiket]) =>
            el('button', {
                class: `cip ${durum.tur === deger ? 'aktif' : ''}`,
                onclick: (e) => {
                    durum.tur = deger;
                    durum.sayfa = 1;
                    cipler.querySelectorAll('.cip').forEach(c => c.classList.remove('aktif'));
                    e.target.classList.add('aktif');
                    listeyiCiz();
                }
            }, etiket)
        ));

        kok.append(
            el('div', { class: 'sayfa-baslik' },
                el('div', {}, el('h1', {}, 'İçerikler'), el('p', { class: 'aciklama' }, 'Kanal veya video linkini yapıştırın; site ID\'yi otomatik çıkarır ve oylamaya açar.'))
            ),
            el('section', { class: 'kart' }, el('h2', {}, 'Kanal veya video ekle'), form),
            el('section', { class: 'kart' },
                el('div', { class: 'form-satir', style: 'margin-bottom: 12px; align-items: center' }, el('div', { class: 'alan' }, arama), cipler),
                listeAlani
            )
        );
        await listeyiCiz();
        link.focus();
    }
});
