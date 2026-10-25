// Konu ve etiket yönetimi (yalnızca yönetici)

// Türkçe adı anahtara çevirir: "Bilim Kurgu / Fantastik" → "bilim-kurgu-fantastik"
function anahtarUret(ad) {
    const harfler = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
    return ad.toLocaleLowerCase('tr-TR')
        .replace(/[çğıöşüâîû]/g, h => harfler[h])
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

sayfaKaydet({
    desen: /^#\/basliklar$/,
    baslik: 'Konu ve Etiketler',
    menu: 'Konu ve Etiketler',
    menuYolu: '#/basliklar',
    admin: true,
    ciz: async (kok) => {
        const basliklar = await api('/basliklar');

        const istek = async (yol, secenek, mesaj) => {
            try {
                await api(yol, secenek);
                if (mesaj) bildirim(mesaj);
                yonlendir();
            } catch (h) {
                bildirim(h.message, 'hata');
            }
        };

        const tabloCiz = (tur) => {
            const liste = basliklar.filter(b => b.tur === tur);
            const satirlar = liste.map((b, i) => el('tr', {},
                el('td', {},
                    el('div', { class: 'oy-dugmeleri' },
                        el('button', { class: 'oy-dugme', title: 'Yukarı taşı', 'aria-label': `${b.ad} yukarı`, disabled: i === 0, onclick: () => istek(`/basliklar/${b.id}/tasi`, { yontem: 'POST', govde: { yon: 'yukari' } }) }, '↑'),
                        el('button', { class: 'oy-dugme', title: 'Aşağı taşı', 'aria-label': `${b.ad} aşağı`, disabled: i === liste.length - 1, onclick: () => istek(`/basliklar/${b.id}/tasi`, { yontem: 'POST', govde: { yon: 'asagi' } }) }, '↓')
                    )
                ),
                el('td', {}, el('code', {}, b.anahtar)),
                el('td', {}, el('input', {
                    type: 'text',
                    value: b.ad,
                    'aria-label': `${b.anahtar} adı`,
                    onchange: (e) => istek(`/basliklar/${b.id}`, { yontem: 'PATCH', govde: { ad: e.target.value } }, 'Ad güncellendi')
                })),
                el('td', {}, el('input', {
                    type: 'text',
                    value: b.aciklama,
                    placeholder: 'Açıklama',
                    'aria-label': `${b.anahtar} açıklaması`,
                    onchange: (e) => istek(`/basliklar/${b.id}`, { yontem: 'PATCH', govde: { aciklama: e.target.value } }, 'Açıklama güncellendi')
                })),
                el('td', { class: 'sayi' }, el('button', {
                    class: `dugme dugme-kucuk ${b.aktif ? 'dugme-ikincil' : 'dugme-tehlike'}`,
                    title: b.aktif ? 'Pasifleştir: oylanmaz ve dışa aktarılmaz' : 'Etkinleştir',
                    onclick: () => istek(`/basliklar/${b.id}`, { yontem: 'PATCH', govde: { aktif: !b.aktif } }, b.aktif ? 'Pasifleştirildi' : 'Etkinleştirildi')
                }, b.aktif ? 'Aktif' : 'Pasif'))
            ));

            const ad = el('input', { type: 'text', placeholder: tur === 'konu' ? 'Yeni konu adı' : 'Yeni etiket adı', 'aria-label': 'Ad' });
            const anahtar = el('input', { type: 'text', placeholder: 'anahtar', 'aria-label': 'Anahtar' });
            ad.addEventListener('input', () => { anahtar.value = anahtarUret(ad.value); });

            const form = el('form', {
                class: 'form-satir',
                style: 'margin-top: 12px',
                onsubmit: (e) => {
                    e.preventDefault();
                    istek('/basliklar', { yontem: 'POST', govde: { tur, ad: ad.value, anahtar: anahtar.value } }, `${tur === 'konu' ? 'Konu' : 'Etiket'} eklendi`);
                }
            },
                el('div', { class: 'alan' }, ad),
                el('div', { class: 'alan', style: 'flex: 0 0 200px' }, anahtar),
                el('button', { class: 'dugme', type: 'submit' }, 'Ekle')
            );

            return el('section', { class: 'kart' },
                el('h2', {}, tur === 'konu' ? `Konular (${liste.length})` : `Etiketler (${liste.length})`),
                el('div', { class: 'tablo-kap' },
                    el('table', { class: 'tablo' },
                        el('thead', {}, el('tr', {}, el('th', {}, 'Sıra'), el('th', {}, 'Anahtar'), el('th', {}, 'Ad'), el('th', {}, 'Açıklama'), el('th', {}, ''))),
                        el('tbody', {}, satirlar)
                    )
                ),
                form
            );
        };

        kok.append(
            el('div', { class: 'sayfa-baslik' },
                el('div', {},
                    el('h1', {}, 'Konu ve Etiketler'),
                    el('p', { class: 'aciklama' }, 'Anahtarlar eklenti ayarlarında kalıcı kimlik olarak kullanılır ve değiştirilemez. Kullanılmayan başlıkları pasifleştirin.')
                )
            ),
            tabloCiz('konu'),
            tabloCiz('etiket')
        );
    }
});
