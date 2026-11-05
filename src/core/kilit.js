/**
 * YouTube Filtreleyici - PIN kilit durum çekirdeği.
 * Saf durum fonksiyonları; DOM veya storage bağımlılığı yoktur.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./pin.js'));
    else { root.YTF = root.YTF || {}; Object.assign(root.YTF, factory(root.YTF)); }
})(typeof self !== 'undefined' ? self : this, function (pin) {
    'use strict';

    const KILIT_SURESI_MS = 600000;
    const HATA_SINIRI = 5;
    const HATA_BEKLEME_MS = 30000;

    function kilitGerekli(veri) {
        const v = veri || {};
        if (!v.pinKodu) return false;
        if (v.ayarlar && v.ayarlar.pinIptal === true) return false;
        return true;
    }

    function kilitAcik(veri, simdi = Date.now()) {
        const v = veri || {};
        if (!kilitGerekli(v) && !v.pinKilitBitis) return true;
        return Number(v.pinKilitBitis || 0) > simdi;
    }

    function kilitBitisZamani(simdi = Date.now(), sure = KILIT_SURESI_MS) {
        return simdi + sure;
    }

    function hataBeklemesi(veri, simdi = Date.now()) {
        const v = veri || {};
        const kalan = Number(v.pinHataBitis || 0) - simdi;
        return kalan > 0 ? kalan : 0;
    }

    function hataKaydet(veri, simdi = Date.now()) {
        const v = veri || {};
        const sayi = (Number(v.pinHataSayisi) || 0) + 1;
        if (sayi >= HATA_SINIRI) {
            return { pinHataSayisi: 0, pinHataBitis: simdi + HATA_BEKLEME_MS };
        }
        return { pinHataSayisi: sayi, pinHataBitis: 0 };
    }

    async function pinDogrula(girilen, veri) {
        const v = veri || {};
        return pin.pinDogrulaGirdi(girilen, v.pinKodu);
    }

    return { KILIT_SURESI_MS, HATA_SINIRI, HATA_BEKLEME_MS, kilitGerekli, kilitAcik, kilitBitisZamani, hataBeklemesi, hataKaydet, pinDogrula };
});
