// Tek bir içeriğin sayfası: bilgiler ve oylama
sayfaKaydet({
    desen: /^#\/icerik\/(\d+)$/,
    baslik: 'İçerik',
    ciz: async (kok, eslesme) => {
        const icerik = await api(`/icerikler/${eslesme[1]}`);

        const silDugmesi = Uygulama.kullanici.rol === 'admin'
            ? el('button', {
                class: 'dugme dugme-tehlike dugme-kucuk',
                onclick: async () => {
                    if (!confirm('Bu içerik ve tüm oyları silinsin mi?')) return;
                    await api(`/icerikler/${icerik.id}`, { yontem: 'DELETE', govde: {} });
                    bildirim('İçerik silindi');
                    location.hash = '#/icerikler';
                }
            }, 'Sil')
            : null;

        kok.append(
            el('p', { style: 'margin-bottom: 12px' }, el('a', { href: '#/icerikler' }, '‹ İçerikler')),
            el('section', { class: 'kart icerik-ust' },
                kapakGorseli(icerik),
                el('div', { style: 'flex: 1; min-width: 220px' },
                    el('div', { style: 'display: flex; gap: 8px; align-items: center; margin-bottom: 6px' }, turRozeti(icerik.tur), el('code', {}, icerik.youtubeId)),
                    el('h1', {}, icerik.baslik || icerik.youtubeId),
                    icerik.tur === 'video'
                        ? el('p', { class: 'aciklama' }, icerik.kanalAdi || '', icerik.kanalHandle ? ` · ${icerik.kanalHandle}` : '')
                        : null,
                    el('p', { class: 'icerik-alt', style: 'margin-top: 6px' }, `${icerik.ekleyen || '—'} tarafından ${new Date(icerik.eklenme).toLocaleString('tr-TR')} tarihinde eklendi`),
                    el('div', { style: 'display: flex; gap: 8px; margin-top: 12px' },
                        el('a', { class: 'dugme dugme-ikincil dugme-kucuk', href: icerik.youtubeUrl, target: '_blank', rel: 'noopener noreferrer' }, 'YouTube\'da aç ↗'),
                        silDugmesi
                    )
                )
            ),
            el('div', { id: 'oylamaAlani' })
        );
        await oylamaAlaniniCiz(document.getElementById('oylamaAlani'), icerik);
    }
});
