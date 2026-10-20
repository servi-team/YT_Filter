/**
 * YouTube Filtreleyici - PIN karma yardımcıları.
 * PIN, arayüz kilididir (şifreleme değil); yine de depoda düz metin tutulmaz.
 * Biçim: pbkdf2-sha256$<iterasyon>$<tuzBase64>$<ozetBase64>
 * Eski sürümlerden gelen düz metin PIN kayıtları okunur; ilk başarılı girişte karma'ya yükseltilir (options.js).
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else { root.YTF = root.YTF || {}; Object.assign(root.YTF, factory()); }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const PIN_ONEK = 'pbkdf2-sha256';
    const PIN_ITERASYON = 120000;
    const PIN_TUZ_UZUNLUK = 16;
    const PIN_OZET_BIT = 256;

    function baytlariBaz64(uyg) {
        let metin = '';
        uyg.forEach(b => { metin += String.fromCharCode(b); });
        return btoa(metin);
    }

    function baz64Baytlara(metin) {
        const ham = atob(metin);
        const uyg = new Uint8Array(ham.length);
        for (let i = 0; i < ham.length; i++) uyg[i] = ham.charCodeAt(i);
        return uyg;
    }

    /**
     * pin: kullanıcının girdiği PIN. tuz verilmezse rastgele üretilir.
     * Dönüş: "pbkdf2-sha256$120000$<tuz>$<ozet>" biçiminde tek satır.
     */
    async function pinKarmala(pin, { tuz, iterasyon = PIN_ITERASYON } = {}) {
        // Node 18'de WebCrypto global değildir; tarayıcıda globalThis.crypto kullanılır.
        const kripto = globalThis.crypto || (typeof require === 'function' ? require('crypto').webcrypto : null);
        if (!kripto || !kripto.subtle) throw new Error('WebCrypto bu ortamda yok');
        const tuzUyg = tuz ? baz64Baytlara(tuz) : kripto.getRandomValues(new Uint8Array(PIN_TUZ_UZUNLUK));
        const anahtar = await kripto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
        const ozet = await kripto.subtle.deriveBits(
            { name: 'PBKDF2', salt: tuzUyg, iterations: iterasyon, hash: 'SHA-256' },
            anahtar,
            PIN_OZET_BIT
        );
        return `${PIN_ONEK}$${iterasyon}$${baytlariBaz64(tuzUyg)}$${baytlariBaz64(new Uint8Array(ozet))}`;
    }

    // Kayıt yeni biçimde mi? (Eski kayıtlar düz metin olabilir.)
    function pinKarmaliMi(kayit) {
        return typeof kayit === 'string' && kayit.split('$').length === 4 && kayit.startsWith(PIN_ONEK + '$');
    }

    /**
     * girilen: kullanıcı girdisi, kayitli: storage'daki pinKodu.
     * Kayıt yoksa kilit yoktur (true). Eski düz metin kayıt birebir karşılaştırılır.
     */
    async function pinDogrulaGirdi(girilen, kayitli) {
        if (!kayitli) return true;
        if (!pinKarmaliMi(kayitli)) return String(girilen) === kayitli;
        const [onek, iterasyon, tuz] = kayitli.split('$');
        if (onek !== PIN_ONEK) return false;
        const yeni = await pinKarmala(girilen, { tuz, iterasyon: Number(iterasyon) || PIN_ITERASYON });
        return yeni === kayitli;
    }

    // Depoda kalan eski biçimli (düz metin) PIN mi?
    function pinDuzMetinMi(kayit) {
        return typeof kayit === 'string' && kayit.length > 0 && !pinKarmaliMi(kayit);
    }

    return { PIN_ONEK, PIN_ITERASYON, pinKarmala, pinKarmaliMi, pinDogrulaGirdi, pinDuzMetinMi };
});
