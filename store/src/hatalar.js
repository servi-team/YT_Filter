/**
 * Kullanıcıya gösterilecek, HTTP durum kodlu hata.
 * Diğer tüm hatalar istemciye "Sunucu hatası" olarak döner.
 */
class HttpHatasi extends Error {
    constructor(durum, mesaj) {
        super(mesaj);
        this.durum = durum;
    }
}

module.exports = { HttpHatasi };
