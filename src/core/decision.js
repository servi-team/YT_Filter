/**
 * YouTube Filtreleyici - Karar fonksiyonu.
 * Saf fonksiyon: DOM, chrome.* ya da başka bir modül kullanmaz. Hem tarayıcıda (global YTF) hem Node'da çalışır.
 * Kuralların kaynağı: docs/SISTEM_TASARIMI.md (ekip lideri dökümanı) ve docs/DEVIR_NOTU.md bölüm 2.5.
 *
 * kararVer(ayar, video, kanal)
 *   ayar  : kullanıcı ayarları (taxonomy.varsayilanAyar() şekli)
 *   video : { id, kayit }          kayit = { anaKonu?, yanKonular[], etiketler[], kararsizKonular[], kararsizEtiketler[] } | null
 *   kanal : { id, handle, kayit }  aynı şekilde
 *
 * Dönüş: { karar: 'ac' | 'engelle', sebepler: [ ... ] }   (sebepler, engel banner'ında gösterilir)
 *   sebep türleri: liste | etiketlenmemis | konu | etiket | kararsiz-konu | kararsiz-etiket | izinli-konu-yok
 *
 * Akış:
 *   1) Listeler (istisna): video > kanal; aynı düzeyde beyaz > kara > özel.
 *   2) Kaynak seçimi: ÖNCE VİDEO. Videoda hiç bilgi yoksa (ve ayar.kanalKontrol açıksa) KANAL. İkisi birden asla karıştırılmaz.
 *      Hiçbirinde bilgi yoksa "bilinmeyen" -> ayar.etiketlenmemis.
 *   3) Seçilen kaynak üzerinde mod kuralları:
 *      - Her modda: kullanıcının engellediği (kesinleşmiş) etiket varsa engelle.
 *      - Serbest: herhangi bir konu izinliyse aç. Kararsızlara kullanıcı lehine izin verilir.
 *      - Orta   : yalnızca ana konuya bakılır. Kararsızlar ayar.kararsiz'a göre (varsayılan izinver).
 *      - Katı   : herhangi bir konu engelliyse engelle. Kararsızlar da (kullanıcı o konu/etiketi engelliyorsa) engeller.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else { root.YTF = root.YTF || {}; Object.assign(root.YTF, factory()); }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const norm = (x) => (typeof x === 'string' && x ? x.toLowerCase() : null);
    const dizi = (x) => (Array.isArray(x) ? x : []);

    // Kayıtta herhangi bir bilgi varsa kayıt "incelenmiş" sayılır. Hiç bilgi yoksa null döner.
    // Not: ana konu olmayabilir (oylamada hiçbir konu pozitif çıkmamış, yalnızca etiket/kararsız olabilir).
    function ozet(kayit) {
        if (!kayit || typeof kayit !== 'object') return null;
        const yan = dizi(kayit.yanKonular);
        const etiketler = dizi(kayit.etiketler);
        const kararsizKonular = dizi(kayit.kararsizKonular);
        const kararsizEtiketler = dizi(kayit.kararsizEtiketler);
        if (!kayit.anaKonu && !yan.length && !etiketler.length && !kararsizKonular.length && !kararsizEtiketler.length) return null;
        const konular = kayit.anaKonu ? [kayit.anaKonu, ...yan.filter(k => k !== kayit.anaKonu)] : [...yan];
        return { ana: kayit.anaKonu || null, konular, etiketler, kararsizKonular, kararsizEtiketler };
    }

    // Listede (anahtar -> true) verilen anahtarlardan biri var mı?
    function listede(liste, anahtarlar) {
        if (!liste) return false;
        return anahtarlar.some(a => { const n = norm(a); return n && Object.prototype.hasOwnProperty.call(liste, n) && liste[n] === true; });
    }

    // Durumu belirtilmemiş konu izinli sayılır; durumu belirtilmemiş etiket engelli sayılır.
    // Engelli = 'izinli' dışındaki her değer ('engelli' eski değeri dahil; kaldir/uyari/bulaniklastir eylemleri).
    const konuEngelli = (ayar, id) => !!(ayar.konular && ayar.konular[id] && ayar.konular[id] !== 'izinli');
    const konuIzinli = (ayar, id) => !konuEngelli(ayar, id);
    const etiketEngelli = (ayar, id) => !(ayar.etiketler && ayar.etiketler[id] === 'izinli');

    const sonuc = (karar, sebepler) => ({ karar, sebepler });

    function kararVer(ayar, video, kanal) {
        ayar = ayar || {};
        video = video || {};
        kanal = kanal || {};

        // 1) Listeler. Video düzeyi kanal düzeyini yener; aynı düzeyde beyaz liste kara listeyi yener.
        const L = ayar.listeler || {};
        for (const [kaynak, anahtarlar] of [['video', [video.id]], ['kanal', [kanal.id, kanal.handle]]]) {
            if (listede(L.beyaz, anahtarlar)) return sonuc('ac', [{ tur: 'liste', liste: 'beyaz', kaynak }]);
            if (listede(L.kara, anahtarlar)) return sonuc('engelle', [{ tur: 'liste', liste: 'kara', kaynak }]);
            for (const o of (L.ozel || [])) {
                if (listede(o.uyeler, anahtarlar)) {
                    return sonuc(o.eylem === 'izinver' ? 'ac' : 'engelle', [{ tur: 'liste', liste: o.ad, kaynak }]);
                }
            }
        }

        // 2) Kaynak seçimi: önce video; videoda bilgi yoksa kanal (kanal kontrol açıksa). Asla ikisi birlikte değerlendirilmez.
        const v = ozet(video.kayit);
        const kanalBakilsin = ayar.kanalKontrol !== false;
        const k = (!v && kanalBakilsin) ? ozet(kanal.kayit) : null;
        const o = v || k;
        if (!o) {
            // Bilinmeyen: kullanıcının ilk açılışta seçtiği ayar. Seçilmemişse (null) engelle.
            return sonuc(ayar.etiketlenmemis === 'ac' ? 'ac' : 'engelle', [{ tur: 'etiketlenmemis' }]);
        }
        const kaynak = v ? 'video' : 'kanal';
        const mod = ['serbest', 'orta', 'kati'].includes(ayar.mod) ? ayar.mod : 'orta';
        const sebepler = [];

        // 3a) Her modda: kullanıcının engellediği kesinleşmiş etiket.
        o.etiketler.filter(e => etiketEngelli(ayar, e)).forEach(id => sebepler.push({ tur: 'etiket', id, kaynak }));

        // 3b) Kararsız konu/etiketler: Serbest -> hep izin; Orta -> ayar.kararsiz; Katı -> hep engelle.
        //     "Engelle" demek: kararsız bir konu/etiket, kullanıcı onu zaten engelliyorsa kesinleşmiş gibi sayılır.
        if (mod === 'kati' || (mod === 'orta' && ayar.kararsiz === 'engelle')) {
            o.kararsizEtiketler.filter(e => etiketEngelli(ayar, e)).forEach(id => sebepler.push({ tur: 'kararsiz-etiket', id, kaynak }));
            o.kararsizKonular.filter(c => konuEngelli(ayar, c)).forEach(id => sebepler.push({ tur: 'kararsiz-konu', id, kaynak }));
        }

        // 3c) Konu kuralları
        if (mod === 'kati') {
            // Herhangi bir (ana veya yan) konu engelliyse engelle.
            o.konular.filter(c => konuEngelli(ayar, c)).forEach(id => sebepler.push({ tur: 'konu', id, kaynak }));
        } else {
            // Serbest: tüm konulara bakılır, biri izinliyse yeter (kararsız konu da "lehine" sayılır).
            // Orta   : yalnızca ana konuya bakılır.
            // Hiç kesin konu yoksa (yalnızca etiket/kararsız bilgi) konu kuralı uygulanmaz.
            const bakilacak = mod === 'serbest' ? o.konular : (o.ana ? [o.ana] : []);
            if (bakilacak.length) {
                const tamam = bakilacak.some(c => konuIzinli(ayar, c)) || (mod === 'serbest' && o.kararsizKonular.length > 0);
                if (!tamam) sebepler.push({ tur: 'izinli-konu-yok', kaynak });
            }
        }

        return sonuc(sebepler.length ? 'engelle' : 'ac', sebepler);
    }

    return { kararVer };
});
