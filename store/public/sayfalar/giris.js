// Giriş sayfası
sayfaKaydet({
    desen: /^#\/giris$/,
    baslik: 'Giriş',
    herkese: true,
    ciz: async (kok) => {
        if (Uygulama.kullanici) {
            location.hash = Uygulama.varsayilanYol;
            return;
        }

        const kullaniciAdi = el('input', { type: 'text', id: 'girisKullanici', autocomplete: 'username', required: true });
        const sifre = el('input', { type: 'password', id: 'girisSifre', autocomplete: 'current-password', required: true });
        const hata = el('p', { class: 'hata-metni', role: 'alert' });
        const dugme = el('button', { class: 'dugme', type: 'submit' }, 'Giriş yap');

        const form = el('form', {
            class: 'form-dikey',
            onsubmit: async (e) => {
                e.preventDefault();
                hata.textContent = '';
                dugme.disabled = true;
                try {
                    Uygulama.kullanici = await api('/oturum/giris', {
                        yontem: 'POST',
                        govde: { kullaniciAdi: kullaniciAdi.value, sifre: sifre.value },
                        sessiz401: true
                    });
                    ustBilgiyiCiz();
                    location.hash = Uygulama.varsayilanYol;
                } catch (h) {
                    hata.textContent = h.message;
                    dugme.disabled = false;
                }
            }
        },
            el('div', { class: 'alan' }, el('label', { for: 'girisKullanici' }, 'Kullanıcı adı'), kullaniciAdi),
            el('div', { class: 'alan' }, el('label', { for: 'girisSifre' }, 'Şifre'), sifre),
            hata,
            dugme
        );

        kok.append(el('section', { class: 'kart dar' },
            el('h1', {}, 'Editör Girişi'),
            el('p', { class: 'aciklama' }, 'Kanal ve videolara konu/etiket oyu vermek için giriş yapın. Hesabınız yoksa yöneticinizle iletişime geçin.'),
            form
        ));
        kullaniciAdi.focus();
    }
});
