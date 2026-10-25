// Editör yönetimi (yalnızca yönetici)
sayfaKaydet({
    desen: /^#\/editorler$/,
    baslik: 'Editörler',
    menu: 'Editörler',
    menuYolu: '#/editorler',
    admin: true,
    ciz: async (kok) => {
        const editorler = await api('/editorler');

        const guncelle = async (editor, degisiklik, mesaj) => {
            try {
                await api(`/editorler/${editor.id}`, { yontem: 'PATCH', govde: degisiklik });
                bildirim(mesaj);
                yonlendir();
            } catch (h) {
                bildirim(h.message, 'hata');
            }
        };

        const satirlar = editorler.map(editor => {
            const kendisi = editor.id === Uygulama.kullanici.id;
            const rolSecici = el('select', {
                disabled: kendisi,
                'aria-label': `${editor.kullaniciAdi} rolü`,
                onchange: (e) => guncelle(editor, { rol: e.target.value }, 'Rol güncellendi')
            },
                el('option', { value: 'editor', selected: editor.rol === 'editor' }, 'Editör'),
                el('option', { value: 'admin', selected: editor.rol === 'admin' }, 'Yönetici')
            );
            return el('tr', {},
                el('td', {}, el('div', { class: 'icerik-baslik' }, editor.ad), el('div', { class: 'icerik-alt' }, '@' + editor.kullaniciAdi)),
                el('td', {}, rolSecici),
                el('td', {}, el('span', { class: `rozet ${editor.aktif ? 'rozet-iyi' : ''}` }, editor.aktif ? 'Aktif' : 'Pasif')),
                el('td', {}, new Date(editor.olusturulma).toLocaleDateString('tr-TR')),
                el('td', { class: 'sayi' },
                    el('button', {
                        class: 'dugme dugme-ikincil dugme-kucuk',
                        onclick: () => {
                            const sifre = prompt(`${editor.kullaniciAdi} için yeni şifre (en az 8 karakter):`);
                            if (sifre) guncelle(editor, { sifre }, 'Şifre sıfırlandı');
                        }
                    }, 'Şifre sıfırla'),
                    ' ',
                    kendisi ? null : el('button', {
                        class: `dugme dugme-kucuk ${editor.aktif ? 'dugme-tehlike' : 'dugme-ikincil'}`,
                        onclick: () => guncelle(editor, { aktif: !editor.aktif }, editor.aktif ? 'Editör pasifleştirildi' : 'Editör etkinleştirildi')
                    }, editor.aktif ? 'Pasifleştir' : 'Etkinleştir')
                )
            );
        });

        const kullaniciAdi = el('input', { type: 'text', id: 'yeniKullaniciAdi', placeholder: 'ornek.editor', autocomplete: 'off' });
        const ad = el('input', { type: 'text', id: 'yeniAd', placeholder: 'Ad Soyad', autocomplete: 'off' });
        const sifre = el('input', { type: 'password', id: 'yeniEditorSifre', autocomplete: 'new-password' });
        const rol = el('select', { id: 'yeniRol' }, el('option', { value: 'editor' }, 'Editör'), el('option', { value: 'admin' }, 'Yönetici'));
        const hata = el('p', { class: 'hata-metni', role: 'alert' });

        const form = el('form', {
            onsubmit: async (e) => {
                e.preventDefault();
                hata.textContent = '';
                try {
                    await api('/editorler', {
                        yontem: 'POST',
                        govde: { kullaniciAdi: kullaniciAdi.value, ad: ad.value, sifre: sifre.value, rol: rol.value }
                    });
                    bildirim('Editör eklendi');
                    yonlendir();
                } catch (h) {
                    hata.textContent = h.message;
                }
            }
        },
            el('div', { class: 'form-satir' },
                el('div', { class: 'alan' }, el('label', { for: 'yeniKullaniciAdi' }, 'Kullanıcı adı'), kullaniciAdi),
                el('div', { class: 'alan' }, el('label', { for: 'yeniAd' }, 'Ad'), ad),
                el('div', { class: 'alan' }, el('label', { for: 'yeniEditorSifre' }, 'Şifre'), sifre),
                el('div', { class: 'alan', style: 'flex: 0 0 130px; min-width: 0' }, el('label', { for: 'yeniRol' }, 'Rol'), rol),
                el('button', { class: 'dugme', type: 'submit' }, 'Ekle')
            ),
            hata
        );

        kok.append(
            el('div', { class: 'sayfa-baslik' },
                el('div', {}, el('h1', {}, 'Editörler'), el('p', { class: 'aciklama' }, 'Editörler silinmez, pasifleştirilir; verdikleri oylar korunur.'))
            ),
            el('section', { class: 'kart' }, el('h2', {}, 'Yeni editör'), form),
            el('section', { class: 'kart tablo-kap' },
                el('table', { class: 'tablo' },
                    el('thead', {}, el('tr', {}, el('th', {}, 'Editör'), el('th', {}, 'Rol'), el('th', {}, 'Durum'), el('th', {}, 'Eklenme'), el('th', {}, ''))),
                    el('tbody', {}, satirlar)
                )
            )
        );
    }
});
