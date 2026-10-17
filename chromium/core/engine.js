/**
 * YouTube Filtreleyici - Motor: ayar çözümleme + veritabanı arama + karar + rozet metni.
 * content.js yalnızca bu dosyadaki fonksiyonları çağırır (DOM işi content.js'te kalır).
 * Saf fonksiyonlar: Node'da test edilebilir.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./taxonomy.js'), require('./decision.js'), require('./migrate.js'));
    } else { root.YTF = root.YTF || {}; Object.assign(root.YTF, factory(root.YTF, root.YTF, root.YTF)); }
})(typeof self !== 'undefined' ? self : this, function (T, D, M) {
    'use strict';

    /**
     * Depodan (storage.local içeriği) kullanılacak ayarı çıkarır.
     *   - Yeni model (surum >= 2) varsa onu kullanır; eksik alanlar varsayılanla doldurulur.
     *   - Yoksa eski model (customMapping + preferences) her çağrıda bellekte yeni modele çevrilir
     *     (kalıcı geçiş eski arayüz kaldırılınca yapılacak).
     */
    function ayarCoz(depo) {
        if (depo && depo.surum >= 2 && depo.ayar) return T.ayarTemizle(depo.ayar);
        const yama = M.migrate(depo || {});
        return T.ayarTemizle(yama ? yama.ayar : null);
    }

    /**
     * Bir video/kanal için tam karar. Veritabanında kayıt varsa kanalın id/handle bilgisi tamamlanır
     * (liste anahtarı ID, ekrandan gelen yalnızca handle olsa da eşleşsin diye).
     */
    function icerikKarari(ayar, db, girdi) {
        girdi = girdi || {};
        const vk = girdi.videoId ? db.videoBul(girdi.videoId) : null;
        const k = db.kanalBul(girdi.channelId, girdi.handle);

        const sonuc = D.kararVer(
            ayar,
            { id: girdi.videoId || null, kayit: vk },
            { id: girdi.channelId || (k && k.id) || null, handle: girdi.handle || (k && k.handle) || null, kayit: k ? k.kayit : null }
        );

        // Nihai eylem: en sert sebep kazanır (kaldir > bulaniklastir).
        // Etiket kaynaklı sebep → etiket-özgü eylem (ayar.etiketler[id]).
        // Konu / liste / etiketlenmemiş kaynaklı sebep → genel engelEylemi.
        let engelEylemi = 'kaldir';
        if (sonuc.karar === 'engelle') {
            const genel = ayar.engelEylemi === 'bulaniklastir' ? 'bulaniklastir' : 'kaldir';
            let enSert = null;
            for (const sebep of (sonuc.sebepler || [])) {
                let eylem;
                if (sebep.tur === 'etiket') {
                    const ed = ayar.etiketler && ayar.etiketler[sebep.id];
                    eylem = (ed === 'bulaniklastir') ? 'bulaniklastir' : 'kaldir';
                } else {
                    eylem = genel;
                }
                if (eylem === 'kaldir') { enSert = 'kaldir'; break; } // en sert, dur
                if (eylem === 'bulaniklastir') enSert = 'bulaniklastir';
            }
            engelEylemi = enSert || genel;
        }

        return {
            karar: sonuc.karar,
            sebepler: sonuc.sebepler,
            engelEylemi,
            anaKonu: (vk && vk.anaKonu) || (k && k.kayit.anaKonu) || null
        };
    }

    const konuAdi = (id) => { const k = T.KONULAR.find(x => x.id === id); return k ? k.ad : id; };
    const etiketAdi = (id) => { const e = T.ETIKETLER.find(x => x.id === id); return e ? e.ad : id; };

    /**
     * Kartın üzerindeki rozet: { metin, sinif | renkAnahtari } ya da null (rozet kapalıysa).
     * sinif: inject.css'teki yt-filter-badge-<sinif> (safe, warning, untagged, educational, profanity).
     */
    function rozetBilgisi(sonuc, ayar) {
        if (ayar && ayar.rozetGoster === false) return null;
        const s = sonuc.sebepler && sonuc.sebepler[0];
        if (!s) return sonuc.anaKonu ? { metin: konuAdi(sonuc.anaKonu), sinif: 'educational' } : null;

        switch (s.tur) {
            case 'liste':
                if (s.liste === 'beyaz') return { metin: 'Beyaz liste', sinif: 'safe' };
                if (s.liste === 'kara') return { metin: 'Kara liste', sinif: 'warning' };
                return { metin: s.liste, renkAnahtari: s.liste };
            case 'etiketlenmemis': return { metin: 'Etiketlenmemiş', sinif: 'untagged' };
            case 'etiket': return { metin: etiketAdi(s.id), sinif: 'profanity' };
            case 'konu': return { metin: konuAdi(s.id), sinif: 'warning' };
            case 'izinli-konu-yok': return { metin: 'Konu izinli değil', sinif: 'warning' };
            default: return null;
        }
    }

    return { ayarCoz, icerikKarari, rozetBilgisi };
});
