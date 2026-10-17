/**
 * YouTube Filtreleyici - Karar fonksiyonu.
 * Saf fonksiyon: DOM, chrome.* ya da başka bir modül kullanmaz. Hem tarayıcıda (global YTF) hem Node'da çalışır.
 *
 * kararVer(ayar, video, kanal)
 *   ayar  : kullanıcı ayarları (taxonomy.varsayilanAyar() şekli)
 *   video : { id, kayit }          kayit = { anaKonu, yanKonular[], etiketler[] } | null (null = incelenmemiş)
 *   kanal : { id, handle, kayit }  aynı şekilde
 *
 * Dönüş: { karar: 'ac' | 'engelle', sebepler: [ ... ] }   (sebepler, engel banner'ında gösterilir)
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else { root.YTF = root.YTF || {}; Object.assign(root.YTF, factory()); }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const norm = (x) => (typeof x === 'string' && x ? x.toLowerCase() : null);

    // Konusu (ana konusu) olan kayıt "incelenmiş" sayılır. Yoksa null döner.
    function ozet(kayit) {
        if (!kayit || !kayit.anaKonu) return null;
        const yan = Array.isArray(kayit.yanKonular) ? kayit.yanKonular : [];
        return {
            ana: kayit.anaKonu,
            konular: [kayit.anaKonu, ...yan.filter(k => k !== kayit.anaKonu)],
            etiketler: Array.isArray(kayit.etiketler) ? kayit.etiketler : []
        };
    }

    // Listede (anahtar -> true) verilen anahtarlardan biri var mı?
    function listede(liste, anahtarlar) {
        if (!liste) return false;
        return anahtarlar.some(a => { const n = norm(a); return n && liste[n]; });
    }

    // Durumu belirtilmemiş konu izinli sayılır; durumu belirtilmemiş etiket engelli sayılır.
    const konuIzinli = (ayar, id) => !(ayar.konular && ayar.konular[id] === 'engelli');
    const konuEngelli = (ayar, id) => !!(ayar.konular && ayar.konular[id] === 'engelli');
    const etiketEngelli = (ayar, id) => !(ayar.etiketler && ayar.etiketler[id] === 'izinli');

    function etiketSebepleri(ayar, o, kaynak) {
        if (!o) return [];
        return o.etiketler.filter(e => etiketEngelli(ayar, e)).map(e => ({ tur: 'etiket', id: e, kaynak }));
    }

    function sonuc(karar, sebepler) { return { karar, sebepler }; }

    function kararVer(ayar, video, kanal) {
        ayar = ayar || {};
        video = video || {};
        kanal = kanal || {};

        const L = ayar.listeler || {};
        const videoAnahtar = [video.id];
        const kanalAnahtar = [kanal.id, kanal.handle];

        // 1) Listeler. Video düzeyi kanal düzeyini yener; aynı düzeyde beyaz liste kara listeyi yener.
        for (const [kaynak, anahtarlar] of [['video', videoAnahtar], ['kanal', kanalAnahtar]]) {
            if (listede(L.beyaz, anahtarlar)) return sonuc('ac', [{ tur: 'liste', liste: 'beyaz', kaynak }]);
            if (listede(L.kara, anahtarlar)) return sonuc('engelle', [{ tur: 'liste', liste: 'kara', kaynak }]);
            for (const o of (L.ozel || [])) {
                if (listede(o.uyeler, anahtarlar)) {
                    return sonuc(o.eylem === 'izinver' ? 'ac' : 'engelle', [{ tur: 'liste', liste: o.ad, kaynak }]);
                }
            }
        }

        // 2) Ne video ne kanal incelenmiş: kullanıcının ilk açılışta seçtiği ayar. Seçilmemişse (null) engelle.
        const v = ozet(video.kayit);
        const k = ozet(kanal.kayit);
        if (!v && !k) {
            return sonuc(ayar.etiketlenmemis === 'ac' ? 'ac' : 'engelle', [{ tur: 'etiketlenmemis' }]);
        }

        const mod = ['serbest', 'orta', 'kati'].includes(ayar.mod) ? ayar.mod : 'orta';

        // 3) Katı mod: herhangi bir engelli konu VEYA herhangi bir engelli etiket (video ve kanal) varsa engelle.
        if (mod === 'kati') {
            const sebepler = [];
            [['video', v], ['kanal', k]].forEach(([kaynak, o]) => {
                if (!o) return;
                o.konular.filter(id => konuEngelli(ayar, id)).forEach(id => sebepler.push({ tur: 'konu', id, kaynak }));
                sebepler.push(...etiketSebepleri(ayar, o, kaynak));
            });
            return sonuc(sebepler.length ? 'engelle' : 'ac', sebepler);
        }

        // 4) Serbest / orta: konu izinli olmalı VE engelli etiket olmamalı.
        //    Serbest: video veya kanalın HERHANGİ bir konusu izinli yeter.  Orta: yalnızca ANA konulara bakılır.
        //    Etiketler: video incelenmişse video etiketleri (kanal etiketleri yok sayılır), değilse kanal etiketleri.
        const konular = (o) => (!o ? [] : (mod === 'serbest' ? o.konular : [o.ana]));
        const konuTamam = konular(v).some(id => konuIzinli(ayar, id)) || konular(k).some(id => konuIzinli(ayar, id));
        const sebepler = v ? etiketSebepleri(ayar, v, 'video') : etiketSebepleri(ayar, k, 'kanal');
        if (!konuTamam) sebepler.push({ tur: 'izinli-konu-yok' });
        return sonuc(sebepler.length ? 'engelle' : 'ac', sebepler);
    }

    return { kararVer };
});
