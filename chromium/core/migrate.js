/**
 * YouTube Filtreleyici - Eski veri modelinden (customMapping + preferences) yeni modele taşıma.
 * Saf fonksiyon: storage'a yazmaz, yalnızca yazılacak "yama" nesnesini döndürür.
 *
 * Kurallar:
 *   - Etiketin eylemi "İzin Ver" ise o etiketli kanal/video -> beyaz liste, aksi halde -> kara liste (core etiketler).
 *   - Kullanıcının oluşturduğu kategoriler -> özel liste (eylem: izinver / engelle).
 *   - "untagged" tercihi -> etiketlenmemis ayarı ('ac' / 'engelle').
 *   - Eski veri silinmez, eskiYedek altında saklanır.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./taxonomy.js'));
    else { root.YTF = root.YTF || {}; Object.assign(root.YTF, factory(root.YTF)); }
})(typeof self !== 'undefined' ? self : this, function (T) {
    'use strict';

    const CORE = ['safe', 'educational', 'profanity', 'violence', 'untagged'];
    const IZIN = 'Allow Video';

    function migrate(eski) {
        eski = eski || {};
        if (eski.surum >= 2) return null; // zaten yeni modelde

        const map = eski.customMapping || {};
        const tercih = eski.preferences || {};
        const ayar = T.varsayilanAyar();

        // content.js'in çalışma anındaki varsayılanıyla aynı: tercihi olmayan etiket "Tamamen Kaldır" sayılırdı.
        const eylemi = (tag) => (tercih[tag] && tercih[tag].enforcement) || 'Remove Video Entirely';

        const gorunurluk = (tag) => (tercih[tag] && tercih[tag].visibility) || 'Show Badge';
        const gorunurlukler = [gorunurluk('untagged')];
        const engelEylemleri = [];
        const ozelListeler = {};

        const untaggedEylem = eylemi('untagged');
        ayar.etiketlenmemis = untaggedEylem === IZIN ? 'ac' : 'engelle';
        if (untaggedEylem !== IZIN) engelEylemleri.push(untaggedEylem);

        for (const [id, tag] of Object.entries(map)) {
            if (tag === 'untagged') continue;
            const eylem = eylemi(tag);
            const izinli = eylem === IZIN;
            gorunurlukler.push(gorunurluk(tag));
            if (!izinli) engelEylemleri.push(eylem);

            if (CORE.includes(tag)) {
                (izinli ? ayar.listeler.beyaz : ayar.listeler.kara)[id.toLowerCase()] = true;
            } else {
                if (!ozelListeler[tag]) {
                    ozelListeler[tag] = {
                        ad: (tercih[tag] && tercih[tag].adi) || tag,
                        eylem: izinli ? 'izinver' : 'engelle',
                        uyeler: {}
                    };
                }
                ozelListeler[tag].uyeler[id.toLowerCase()] = true;
            }
        }
        ayar.listeler.ozel = Object.values(ozelListeler);

        // Etiket başına rozet gizleme yeni modelde tek genel ayar: hepsi gizliyse gizle, biri bile gösteriyorsa göster.
        ayar.rozetGoster = gorunurlukler.some(v => v !== 'Hide Badge');

        // Tek bir genel engel eylemi: herhangi biri "Tamamen Kaldır" ise kaldır, yalnızca bulanıklaştırma varsa bulanıklaştır.
        if (!engelEylemleri.includes('Remove Video Entirely') && engelEylemleri.includes('Blur Thumbnail')) {
            ayar.engelEylemi = 'bulaniklastir';
        }

        return {
            surum: 2,
            ayar,
            eskiYedek: { customMapping: map, preferences: tercih }
        };
    }

    return { migrate };
});
