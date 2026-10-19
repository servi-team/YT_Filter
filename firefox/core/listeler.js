/**
 * YouTube Filtreleyici - İstisna listeleri içe/dışa aktarma.
 * Saf modül: DOM, storage ve ağ kullanmaz; içe aktarılan veriyi doğrular ve mevcut listelerle birleştirir.
 *
 * Paket biçimi:
 *   { tur: 'ytf-listeler', surum: 1, listeler: { beyaz, kara, ozel[] } }
 * Tam yedek dosyaları ({ surum: 2, ayar: { listeler } }) da kabul edilir.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./taxonomy.js'));
    else { root.YTF = root.YTF || {}; Object.assign(root.YTF, factory(root.YTF)); }
})(typeof self !== 'undefined' ? self : this, function (T) {
    'use strict';

    const PAKET_TUR = 'ytf-listeler';
    const PAKET_SURUM = 1;
    const MAKS_AD = 40;

    const trKucuk = (x) => String(x == null ? '' : x).toLocaleLowerCase('tr-TR');
    const duzNesne = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
    const kendi = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    const bosListeler = () => ({ beyaz: {}, kara: {}, ozel: [] });

    function listeKopyala(listeler) {
        const L = duzNesne(listeler) ? listeler : {};
        return {
            beyaz: { ...(duzNesne(L.beyaz) ? L.beyaz : {}) },
            kara: { ...(duzNesne(L.kara) ? L.kara : {}) },
            ozel: (Array.isArray(L.ozel) ? L.ozel : []).map(l => ({
                ad: l && typeof l.ad === 'string' ? l.ad : '',
                eylem: l && l.eylem === 'izinver' ? 'izinver' : 'engelle',
                uyeler: { ...((l && duzNesne(l.uyeler)) ? l.uyeler : {}) }
            }))
        };
    }

    function anahtarTemizle(x) {
        if (typeof x !== 'string') return null;
        const k = x.trim().toLowerCase();
        if (!k || k.length > 100) return null;
        return k;
    }

    function uyelerTemizle(uyeler) {
        const temiz = {};
        let atlanan = 0;
        if (!duzNesne(uyeler)) return { temiz, atlanan };
        Object.keys(uyeler).forEach(k => {
            const a = anahtarTemizle(k);
            if (!a || uyeler[k] !== true) { atlanan++; return; }
            temiz[a] = true;
        });
        return { temiz, atlanan };
    }

    /**
     * Kullanıcının listelerinden dışa aktarma paketi üretir.
     * secim: 'hepsi' | 'beyaz' | 'kara' | 'ozel:<liste adı>'
     */
    function listePaketiOlustur(ayar, secim) {
        const L = (ayar && duzNesne(ayar.listeler)) ? ayar.listeler : bosListeler();
        const paket = { tur: PAKET_TUR, surum: PAKET_SURUM, listeler: {} };
        const hepsi = !secim || secim === 'hepsi';
        if (hepsi || secim === 'beyaz') paket.listeler.beyaz = { ...(L.beyaz || {}) };
        if (hepsi || secim === 'kara') paket.listeler.kara = { ...(L.kara || {}) };
        if (hepsi) {
            paket.listeler.ozel = (L.ozel || []).map(l => ({ ad: l.ad, eylem: l.eylem, uyeler: { ...(l.uyeler || {}) } }));
        } else if (typeof secim === 'string' && secim.startsWith('ozel:')) {
            const l = (L.ozel || []).find(x => x.ad === secim.slice(5));
            if (l) paket.listeler.ozel = [{ ad: l.ad, eylem: l.eylem, uyeler: { ...(l.uyeler || {}) } }];
        }
        return paket;
    }

    /**
     * İçe aktarılan JSON'u doğrular ve temizler. Geçersiz üyeler/özel listeler atlanır ve sayılır.
     * Dönüş: { gecerli, listeler, hatalar, atlanan }
     */
    function listePaketiCoz(girdi) {
        const sonuc = { gecerli: false, listeler: bosListeler(), hatalar: [], atlanan: 0 };
        if (!duzNesne(girdi)) {
            sonuc.hatalar.push('Dosya bir JSON nesnesi değil.');
            return sonuc;
        }

        let kaynak = null;
        if (girdi.tur === PAKET_TUR) {
            if (girdi.surum != null && Number(girdi.surum) > PAKET_SURUM) {
                sonuc.hatalar.push(`Desteklenmeyen liste paketi sürümü: ${girdi.surum}`);
                return sonuc;
            }
            kaynak = girdi.listeler;
        } else if (duzNesne(girdi.ayar) && duzNesne(girdi.ayar.listeler)) {
            kaynak = girdi.ayar.listeler;
        } else if (duzNesne(girdi.listeler)) {
            kaynak = girdi.listeler;
        }

        if (!duzNesne(kaynak)) {
            sonuc.hatalar.push('Liste verisi bulunamadı.');
            return sonuc;
        }

        ['beyaz', 'kara'].forEach(ad => {
            if (kaynak[ad] == null) return;
            if (!duzNesne(kaynak[ad])) {
                sonuc.hatalar.push(`${ad}: geçersiz üye listesi`);
                return;
            }
            const r = uyelerTemizle(kaynak[ad]);
            sonuc.listeler[ad] = r.temiz;
            sonuc.atlanan += r.atlanan;
        });

        if (kaynak.ozel != null && !Array.isArray(kaynak.ozel)) {
            sonuc.hatalar.push('ozel: geçersiz liste dizisi');
        }

        const kullanilan = new Set();
        (Array.isArray(kaynak.ozel) ? kaynak.ozel : []).forEach((l, i) => {
            if (!duzNesne(l) || typeof l.ad !== 'string') {
                sonuc.atlanan++;
                sonuc.hatalar.push(`ozel[${i}]: geçersiz kayıt`);
                return;
            }
            const ad = l.ad.trim().slice(0, MAKS_AD);
            const anahtar = trKucuk(ad);
            if (!ad || T.REZERVE_LISTE_ADLARI.includes(anahtar)) {
                sonuc.atlanan++;
                sonuc.hatalar.push(`ozel[${i}]: geçersiz veya ayrılmış liste adı`);
                return;
            }
            const r = uyelerTemizle(l.uyeler);
            sonuc.atlanan += r.atlanan;
            if (kullanilan.has(anahtar)) {
                const mevcut = sonuc.listeler.ozel.find(x => trKucuk(x.ad) === anahtar);
                Object.assign(mevcut.uyeler, r.temiz);
                sonuc.hatalar.push(`ozel[${i}]: "${ad}" birden çok kez geçti; birleştirildi`);
                return;
            }
            kullanilan.add(anahtar);
            sonuc.listeler.ozel.push({ ad, eylem: l.eylem === 'izinver' ? 'izinver' : 'engelle', uyeler: r.temiz });
        });

        sonuc.gecerli = true;
        return sonuc;
    }

    /**
     * Temizlenmiş içe aktarma listelerini mevcut listelerle birleştirir. Mevcut nesne değiştirilmez.
     * cakisma: 'birlestir' (varsayılan) | 'uzerine' | 'yeniden'
     * Dönüş: { listeler, rapor }
     */
    function listeleriBirlestir(mevcut, gelen, cakisma) {
        const strateji = (cakisma === 'uzerine' || cakisma === 'yeniden') ? cakisma : 'birlestir';
        const L = listeKopyala(mevcut);
        const rapor = {
            gecerli: duzNesne(gelen),
            eklenen: 0,
            tasinan: 0,
            uzerineYazilan: 0,
            birlestirilen: 0,
            yenidenAdlandirilan: 0,
            atlanan: 0
        };

        if (!rapor.gecerli) return { listeler: L, rapor };

        const cikar = (anahtar) => {
            let vardi = false;
            if (kendi(L.beyaz, anahtar)) { delete L.beyaz[anahtar]; vardi = true; }
            if (kendi(L.kara, anahtar)) { delete L.kara[anahtar]; vardi = true; }
            L.ozel.forEach(l => {
                if (kendi(l.uyeler, anahtar)) { delete l.uyeler[anahtar]; vardi = true; }
            });
            return vardi;
        };

        const uyeEkle = (hedef, anahtar) => {
            const zatenHedefte = kendi(hedef, anahtar);
            if (cikar(anahtar) && !zatenHedefte) rapor.tasinan++;
            if (!zatenHedefte) rapor.eklenen++;
            hedef[anahtar] = true;
        };

        ['beyaz', 'kara'].forEach(ad => {
            const uyeler = (gelen && duzNesne(gelen[ad])) ? gelen[ad] : {};
            Object.keys(uyeler).forEach(a => uyeEkle(L[ad], a));
        });

        const benzersizAd = (ad) => {
            const temel = ad.slice(0, MAKS_AD - 4).trim() || 'Liste';
            let n = 2;
            let deneme = temel;
            while (L.ozel.some(l => trKucuk(l.ad) === trKucuk(deneme)) || T.REZERVE_LISTE_ADLARI.includes(trKucuk(deneme))) {
                deneme = `${temel} (${n})`;
                n++;
            }
            return deneme.slice(0, MAKS_AD);
        };

        (Array.isArray(gelen && gelen.ozel) ? gelen.ozel : []).forEach(g => {
            if (!duzNesne(g) || typeof g.ad !== 'string' || !duzNesne(g.uyeler)) {
                rapor.atlanan++;
                return;
            }
            const mevcutListe = L.ozel.find(l => trKucuk(l.ad) === trKucuk(g.ad));
            let hedef = mevcutListe;

            if (!mevcutListe) {
                hedef = { ad: benzersizAd(g.ad.trim().slice(0, MAKS_AD)), eylem: g.eylem === 'izinver' ? 'izinver' : 'engelle', uyeler: {} };
                L.ozel.push(hedef);
            } else if (strateji === 'yeniden') {
                hedef = { ad: benzersizAd(g.ad.trim().slice(0, MAKS_AD)), eylem: g.eylem === 'izinver' ? 'izinver' : 'engelle', uyeler: {} };
                L.ozel.push(hedef);
                rapor.yenidenAdlandirilan++;
            } else if (strateji === 'uzerine') {
                hedef.uyeler = {};
                hedef.eylem = g.eylem === 'izinver' ? 'izinver' : 'engelle';
                rapor.uzerineYazilan++;
            } else {
                rapor.birlestirilen++;
            }

            Object.keys(g.uyeler).forEach(a => uyeEkle(hedef.uyeler, a));
        });

        return { listeler: L, rapor };
    }

    return {
        listePaketiOlustur,
        listePaketiCoz,
        listeleriBirlestir,
        LISTE_PAKET_TUR: PAKET_TUR,
        LISTE_PAKET_SURUM: PAKET_SURUM
    };
});
