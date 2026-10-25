// İçerik sayfasındaki oylama tablosu ve sonuç paneli

const OY_SECENEKLERI = [
    { oy: 1, simge: '↑', etiket: 'Upvote' },
    { oy: 0, simge: '?', etiket: 'Kararsız' },
    { oy: -1, simge: '↓', etiket: 'Downvote' }
];

function netSinifi(net) {
    if (net > 0) return 'net-pozitif';
    if (net < 0) return 'net-negatif';
    return 'net-sifir';
}

function rozetListesi(anahtarlar, adlar, sinif) {
    if (anahtarlar.length === 0) return el('span', { class: 'icerik-alt' }, '—');
    return anahtarlar.map(a => el('span', { class: `rozet ${sinif}` }, adlar[a] || a));
}

async function oylamaAlaniniCiz(alan, icerik) {
    let veri = await api(`/icerikler/${icerik.id}/oylama`);

    const oyVer = async (anahtar, oy) => {
        try {
            veri = await api(`/icerikler/${icerik.id}/oylar/${encodeURIComponent(anahtar)}`, { yontem: 'PUT', govde: { oy } });
            ciz();
        } catch (h) {
            bildirim(h.message, 'hata');
        }
    };

    const tabloCiz = (tur) => {
        const satirlar = veri.basliklar.filter(b => b.tur === tur).map(b => {
            const s = veri.sayimlar[b.anahtar];
            const benimOyum = veri.benimOylarim[b.anahtar];
            const oyVarMi = s.yukari + s.kararsiz + s.asagi > 0;
            return el('tr', {},
                el('td', { title: b.aciklama || '' }, b.ad),
                el('td', {},
                    el('div', { class: 'oy-dugmeleri', role: 'group', 'aria-label': `${b.ad} için oyunuz` },
                        OY_SECENEKLERI.map(({ oy, simge, etiket }) => el('button', {
                            class: `oy-dugme ${benimOyum === oy ? 'secili' : ''}`,
                            dataset: { oy: String(oy) },
                            title: benimOyum === oy ? `${etiket} (geri almak için tekrar tıklayın)` : etiket,
                            'aria-label': `${b.ad}: ${etiket}`,
                            'aria-pressed': benimOyum === oy ? 'true' : 'false',
                            onclick: () => oyVer(b.anahtar, benimOyum === oy ? null : oy)
                        }, simge))
                    )
                ),
                el('td', { class: 'sayi sayim-yukari' }, s.yukari),
                el('td', { class: 'sayi sayim-kararsiz' }, s.kararsiz),
                el('td', { class: 'sayi sayim-asagi' }, s.asagi),
                el('td', { class: `sayi ${oyVarMi ? netSinifi(s.net) : 'icerik-alt'}` }, oyVarMi ? (s.net > 0 ? `+${s.net}` : s.net) : '—')
            );
        });

        return el('section', { class: 'kart' },
            el('h2', {}, tur === 'konu' ? 'Konu seçimi' : 'Etiket seçimi'),
            el('div', { class: 'tablo-kap' },
                el('table', { class: 'tablo' },
                    el('thead', {}, el('tr', {},
                        el('th', {}, tur === 'konu' ? 'Konu' : 'Etiket'),
                        el('th', {}, 'Oyunuz'),
                        el('th', { class: 'sayi' }, 'Upvote'),
                        el('th', { class: 'sayi' }, 'Kararsız'),
                        el('th', { class: 'sayi' }, 'Downvote'),
                        el('th', { class: 'sayi' }, 'Toplam')
                    )),
                    el('tbody', {}, satirlar)
                )
            )
        );
    };

    const sonucPaneli = () => {
        const adlar = Object.fromEntries(veri.basliklar.map(b => [b.anahtar, b.ad]));
        const s = veri.sonuc;
        const grup = (baslik, icerikEl) => el('div', { class: 'sonuc-grup' }, el('div', { class: 'sonuc-etiket' }, baslik), el('div', { class: 'sonuc-deger' }, icerikEl));

        return el('aside', { class: 'kart sonuc-paneli' },
            el('h2', {}, 'Sonuç'),
            grup('Ana konu', s.anaKonu ? el('span', { class: 'rozet rozet-konu' }, adlar[s.anaKonu]) : el('span', { class: 'icerik-alt' }, 'Bilinmeyen')),
            grup('Yan konular', rozetListesi(s.yanKonular, adlar, 'rozet-konu')),
            grup('Kararsız konular', rozetListesi(s.kararsizKonular, adlar, 'rozet-kararsiz')),
            grup('Etiketler', rozetListesi(s.etiketler, adlar, 'rozet-etiket')),
            grup('Kararsız etiketler', rozetListesi(s.kararsizEtiketler, adlar, 'rozet-kararsiz')),
            grup('Dışa aktarım',
                veri.disaAktarilir
                    ? el('span', { class: 'rozet rozet-iyi' }, 'Veritabanına girecek')
                    : el('span', { class: 'rozet' }, 'Bilinmeyen kalacak')
            ),
            el('p', { class: 'icerik-alt', style: 'margin-top: 10px' },
                `Toplam ${veri.oySayisi} oy. Net puan = upvote − downvote. Eşitlikte o puana ilk ulaşan konu ana konu olur.`)
        );
    };

    const ciz = () => {
        alan.replaceChildren(el('div', { class: 'oylama-izgara' },
            el('div', {}, tabloCiz('konu'), tabloCiz('etiket')),
            sonucPaneli()
        ));
    };
    ciz();
}
