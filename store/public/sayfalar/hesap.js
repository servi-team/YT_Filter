// Hesabım: kendi şifresini değiştirme
sayfaKaydet({
    desen: /^#\/hesap$/,
    baslik: 'Hesabım',
    ciz: async (kok) => {
        const mevcut = el('input', { type: 'password', id: 'mevcutSifre', autocomplete: 'current-password' });
        const yeni = el('input', { type: 'password', id: 'yeniSifre', autocomplete: 'new-password' });
        const tekrar = el('input', { type: 'password', id: 'yeniSifreTekrar', autocomplete: 'new-password' });
        const hata = el('p', { class: 'hata-metni', role: 'alert' });

        const form = el('form', {
            class: 'form-dikey',
            onsubmit: async (e) => {
                e.preventDefault();
                hata.textContent = '';
                if (yeni.value !== tekrar.value) {
                    hata.textContent = 'Yeni şifreler eşleşmiyor.';
                    return;
                }
                try {
                    await api('/oturum/sifre', { yontem: 'POST', govde: { mevcutSifre: mevcut.value, yeniSifre: yeni.value } });
                    form.reset();
                    bildirim('Şifreniz değiştirildi');
                } catch (h) {
                    hata.textContent = h.message;
                }
            }
        },
            el('div', { class: 'alan' }, el('label', { for: 'mevcutSifre' }, 'Mevcut şifre'), mevcut),
            el('div', { class: 'alan' }, el('label', { for: 'yeniSifre' }, 'Yeni şifre (en az 8 karakter)'), yeni),
            el('div', { class: 'alan' }, el('label', { for: 'yeniSifreTekrar' }, 'Yeni şifre (tekrar)'), tekrar),
            hata,
            el('button', { class: 'dugme', type: 'submit' }, 'Şifreyi değiştir')
        );

        const k = Uygulama.kullanici;
        kok.append(el('section', { class: 'kart dar' },
            el('h1', {}, 'Hesabım'),
            el('p', { class: 'aciklama' }, `${k.ad} · @${k.kullaniciAdi} · ${k.rol === 'admin' ? 'Yönetici' : 'Editör'}`),
            form
        ));
    }
});
