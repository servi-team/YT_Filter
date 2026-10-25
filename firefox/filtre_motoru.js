/**
 * YouTube Filtreleyici - Filtre Motoru
 * Konu/etiket verisine ve kullanıcı ayarlarına göre bir içeriğin
 * gösterilip gösterilmeyeceğine karar veren saf fonksiyonlar.
 * Kurallar için: docs/SPESIFIKASYON.md (Bölüm 6)
 *
 * Tarayıcıda `YTFiltreMotoru` global'i olarak, Node'da `require` ile kullanılır.
 */

(function (kok) {
    const MODLAR = ['serbest', 'orta', 'kati'];
    const BICIMLER = ['gizle', 'uyari', 'bulaniklastir'];

    // Birden fazla kural engellediğinde en sert biçim uygulanır
    const BICIM_SERTLIGI = { gizle: 3, uyari: 2, bulaniklastir: 1 };

    // Eklenti ilk kurulduğunda ve veritabanında yeni konu/etiket çıktığında kullanılır
    function varsayilanFiltreAyarlari(veritabani) {
        const filtre = {
            mod: 'orta',
            kanalKontrol: true,
            varsayilanBicim: 'gizle',
            rozetGoster: true,
            orta: {
                bilinmeyenKonu: 'izin',
                bilinmeyenEtiket: 'izin',
                kararsizKonu: 'izin',
                kararsizEtiket: 'izin'
            },
            konular: {},
            etiketler: {}
        };
        return eksikBasliklariTamamla(filtre, veritabani);
    }

    // Veritabanında olup ayarlarda olmayan konu/etiketleri varsayılan değerleriyle ekler
    function eksikBasliklariTamamla(filtre, veritabani) {
        const vt = veritabani || {};
        (vt.konular || []).forEach(konu => {
            if (!filtre.konular[konu.id]) filtre.konular[konu.id] = { filtrele: false, bicim: 'gizle' };
        });
        (vt.etiketler || []).forEach(etiket => {
            if (!filtre.etiketler[etiket.id]) filtre.etiketler[etiket.id] = { filtrele: true, bicim: 'gizle' };
        });
        return filtre;
    }

    /**
     * v1 verisini (customMapping + preferences) v2 yapısına taşır.
     * "İzin Ver" eylemli kategorilere atanmış ID'ler beyaz listeye,
     * diğerleri kara listeye gider. "Etiketlenmemiş" engelleniyorsa
     * orta modda bilinmeyen konular engellenir.
     */
    function eskiVeriyiTasi(customMapping, preferences, filtre) {
        const tercihler = preferences || {};
        const beyaz = [];
        const kara = [];
        Object.entries(customMapping || {}).forEach(([id, kategori]) => {
            const eylem = tercihler[kategori] ? tercihler[kategori].enforcement : 'Remove Video Entirely';
            (eylem === 'Allow Video' ? beyaz : kara).push(id.toLowerCase());
        });
        if (tercihler.untagged && tercihler.untagged.enforcement !== 'Allow Video') {
            filtre.orta.bilinmeyenKonu = 'engel';
        }
        return { beyaz, kara };
    }

    function kaydiNormallestir(kayit) {
        const k = kayit || {};
        return {
            anaKonu: k.anaKonu || null,
            yanKonular: k.yanKonular || [],
            kararsizKonular: k.anaKonu ? (k.kararsizKonular || []) : [],
            etiketler: k.etiketler || [],
            kararsizEtiketler: k.kararsizEtiketler || []
        };
    }

    function listedeMi(liste, videoId, kanal) {
        if (!liste || liste.length === 0) return false;
        return (videoId && liste.includes(videoId.toLowerCase())) || (kanal && liste.includes(kanal));
    }

    function enSertBicim(idler, tercihler, yedekBicim) {
        let secilen = null;
        idler.forEach(id => {
            const bicim = (tercihler[id] && tercihler[id].bicim) || yedekBicim;
            if (!secilen || BICIM_SERTLIGI[bicim] > BICIM_SERTLIGI[secilen]) secilen = bicim;
        });
        return secilen || yedekBicim;
    }

    function izin(sebep, kaynak, kayit) {
        return { sonuc: 'izin', bicim: null, sebep, kaynak, kayit };
    }

    function engel(bicim, sebep, kaynak, kayit) {
        return { sonuc: 'engel', bicim, sebep, kaynak, kayit };
    }

    /**
     * @param {{videoId?: string, kanal?: string}} icerik
     * @param {object} veritabani  docs/veritabani-semasi.md biçiminde
     * @param {object} filtre      varsayilanFiltreAyarlari() biçiminde
     * @param {{beyaz?: string[], kara?: string[]}} listeler  küçük harfli ID/handle listeleri
     * @returns {{sonuc: 'izin'|'engel', bicim: string|null, sebep: string, kaynak: 'video'|'kanal'|null, kayit: object}}
     */
    function kararVer(icerik, veritabani, filtre, listeler) {
        const videoId = icerik.videoId || null;
        const kanal = icerik.kanal ? icerik.kanal.toLowerCase() : null;
        const vt = veritabani || {};
        const ls = listeler || {};
        const varsayilanBicim = filtre.varsayilanBicim || 'gizle';

        // 1. Listeler algoritmadan önce gelir; çakışmada beyaz liste kazanır
        if (listedeMi(ls.beyaz, videoId, kanal)) return izin('beyaz-liste', null, null);
        if (listedeMi(ls.kara, videoId, kanal)) return engel(varsayilanBicim, 'kara-liste', null, null);

        // 2. Önce video, video verisi yoksa (ve ayar açıksa) kanal
        let kaynak = null;
        let hamKayit = null;
        if (videoId && vt.videolar && vt.videolar[videoId]) {
            kaynak = 'video';
            hamKayit = vt.videolar[videoId];
        } else if (filtre.kanalKontrol && kanal && vt.kanallar && vt.kanallar[kanal]) {
            kaynak = 'kanal';
            hamKayit = vt.kanallar[kanal];
        }
        const k = kaydiNormallestir(hamKayit);

        const konuFiltrelenir = id => !!(filtre.konular[id] && filtre.konular[id].filtrele);
        const etiketFiltrelenir = id => !!(filtre.etiketler[id] && filtre.etiketler[id].filtrele);
        const konuBilinmeyen = !k.anaKonu;
        const etiketBilinmeyen = k.etiketler.length === 0 && k.kararsizEtiketler.length === 0;
        const tumKonular = k.anaKonu ? [k.anaKonu, ...k.yanKonular, ...k.kararsizKonular] : [];

        // 3. Engellenen geçerli bir etiket her modda engeller
        const engelliEtiketler = k.etiketler.filter(etiketFiltrelenir);
        if (engelliEtiketler.length > 0) {
            return engel(enSertBicim(engelliEtiketler, filtre.etiketler, varsayilanBicim), 'etiket', kaynak, k);
        }

        // 4. Mod kuralı
        if (filtre.mod === 'serbest') {
            if (konuBilinmeyen) return izin('bilinmeyen-konu', kaynak, k);
            if (tumKonular.some(id => !konuFiltrelenir(id))) return izin('konu', kaynak, k);
            return engel(enSertBicim(tumKonular, filtre.konular, varsayilanBicim), 'konu', kaynak, k);
        }

        if (filtre.mod === 'kati') {
            if (konuBilinmeyen) return engel(varsayilanBicim, 'bilinmeyen-konu', kaynak, k);
            if (etiketBilinmeyen) return engel(varsayilanBicim, 'bilinmeyen-etiket', kaynak, k);
            const engelliKararsizEtiketler = k.kararsizEtiketler.filter(etiketFiltrelenir);
            if (engelliKararsizEtiketler.length > 0) {
                return engel(enSertBicim(engelliKararsizEtiketler, filtre.etiketler, varsayilanBicim), 'kararsiz-etiket', kaynak, k);
            }
            const engelliKonular = tumKonular.filter(konuFiltrelenir);
            if (engelliKonular.length > 0) {
                return engel(enSertBicim(engelliKonular, filtre.konular, varsayilanBicim), 'konu', kaynak, k);
            }
            return izin('konu', kaynak, k);
        }

        // Orta mod (varsayılan)
        const orta = filtre.orta || {};
        if (konuBilinmeyen && orta.bilinmeyenKonu === 'engel') return engel(varsayilanBicim, 'bilinmeyen-konu', kaynak, k);
        if (etiketBilinmeyen && orta.bilinmeyenEtiket === 'engel') return engel(varsayilanBicim, 'bilinmeyen-etiket', kaynak, k);
        if (orta.kararsizEtiket === 'engel' && k.kararsizEtiketler.some(etiketFiltrelenir)) {
            return engel(varsayilanBicim, 'kararsiz-etiket', kaynak, k);
        }
        if (orta.kararsizKonu === 'engel' && k.kararsizKonular.some(konuFiltrelenir)) {
            return engel(varsayilanBicim, 'kararsiz-konu', kaynak, k);
        }
        if (!konuBilinmeyen && konuFiltrelenir(k.anaKonu)) {
            return engel(enSertBicim([k.anaKonu], filtre.konular, varsayilanBicim), 'ana-konu', kaynak, k);
        }
        return izin(konuBilinmeyen ? 'bilinmeyen-konu' : 'ana-konu', kaynak, k);
    }

    const api = { MODLAR, BICIMLER, varsayilanFiltreAyarlari, eksikBasliklariTamamla, eskiVeriyiTasi, kararVer };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        kok.YTFiltreMotoru = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
