// Sistem durumu: sunucu ve veritabanı bağlantısı
sayfaKaydet({
    desen: /^#\/durum$/,
    baslik: 'Durum',
    herkese: true,
    ciz: async (kok) => {
        const yanit = await fetch('/saglik').catch(() => null);
        const veri = yanit ? await yanit.json().catch(() => ({})) : {};
        const calisiyor = yanit && yanit.ok;

        kok.append(
            el('section', { class: 'kart dar' },
                el('h1', {}, 'Sistem Durumu'),
                el('p', { class: calisiyor ? 'durum-iyi' : 'durum-kotu' },
                    calisiyor ? 'Sunucu ve veritabanı çalışıyor.' : `Veritabanına ulaşılamıyor (${veri.durum || 'sunucu yanıt vermiyor'}).`),
                Uygulama.kullanici ? null : el('a', { class: 'dugme', href: '#/giris' }, 'Giriş yap')
            )
        );
    }
});
