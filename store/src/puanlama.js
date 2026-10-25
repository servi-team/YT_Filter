/**
 * YouTube Filter Store - Oylama sonucunu hesaplayan saf fonksiyonlar
 * Kurallar: docs/SPESIFIKASYON.md (Bölüm 5)
 *
 * - Net puan = upvote − downvote; kararsız oylar puanı etkilemez.
 * - Net > 0 geçerli, net = 0 (ve en az bir oy) kararsız, net < 0 atanmaz.
 * - Ana konu en yüksek net puanlı konudur; eşitlikte o puana ilk ulaşan seçilir.
 * - Pozitif puanlı konu yoksa ana konu yoktur ve kararsız konular da yazılmaz.
 */

/**
 * @param {Array<{anahtar: string, tur: 'konu'|'etiket'}>} basliklar  aktif başlıklar, görüntüleme sırasıyla
 * @param {Array<{baslik: string, editor: number, oy: -1|0|1|null, zaman: Date|string|number}>} gecmis
 *        oy geçmişi; oy: null editörün oyunu geri aldığını gösterir
 */
function puanla(basliklar, gecmis) {
    const sayimlar = {};
    basliklar.forEach(b => {
        sayimlar[b.anahtar] = { yukari: 0, kararsiz: 0, asagi: 0, net: 0 };
    });

    // Geçmiş baştan oynatılarak hem güncel oylar hem de her puana ilk ulaşma zamanı bulunur
    const guncelOylar = new Map();
    const ilkUlasma = {};
    basliklar.forEach(b => { ilkUlasma[b.anahtar] = new Map([[0, -Infinity]]); });

    const sirali = gecmis
        .map((olay, sira) => ({ ...olay, zamanMs: new Date(olay.zaman).getTime(), sira }))
        .sort((a, b) => a.zamanMs - b.zamanMs || a.sira - b.sira);

    for (const olay of sirali) {
        const sayim = sayimlar[olay.baslik];
        if (!sayim) continue; // pasif ya da silinmiş başlık

        const anahtar = `${olay.baslik}|${olay.editor}`;
        const onceki = guncelOylar.get(anahtar);
        if (onceki !== undefined) sayimDegistir(sayim, onceki, -1);
        if (olay.oy === null || olay.oy === undefined) {
            guncelOylar.delete(anahtar);
        } else {
            guncelOylar.set(anahtar, olay.oy);
            sayimDegistir(sayim, olay.oy, +1);
        }

        sayim.net = sayim.yukari - sayim.asagi;
        if (!ilkUlasma[olay.baslik].has(sayim.net)) ilkUlasma[olay.baslik].set(sayim.net, olay.zamanMs);
    }

    const durum = anahtar => {
        const s = sayimlar[anahtar];
        if (s.net > 0) return 'gecerli';
        if (s.net === 0 && s.yukari + s.kararsiz + s.asagi > 0) return 'kararsiz';
        return null;
    };

    const konular = basliklar.filter(b => b.tur === 'konu').map(b => b.anahtar);
    const etiketler = basliklar.filter(b => b.tur === 'etiket').map(b => b.anahtar);
    const gecerliKonular = konular.filter(k => durum(k) === 'gecerli');

    let anaKonu = null;
    gecerliKonular.forEach(k => {
        if (anaKonu === null) {
            anaKonu = k;
            return;
        }
        const aday = sayimlar[k].net;
        const mevcut = sayimlar[anaKonu].net;
        const dahaErken = ilkUlasma[k].get(aday) < ilkUlasma[anaKonu].get(mevcut);
        if (aday > mevcut || (aday === mevcut && dahaErken)) anaKonu = k;
    });

    const sonuc = {
        anaKonu,
        yanKonular: gecerliKonular.filter(k => k !== anaKonu),
        kararsizKonular: anaKonu ? konular.filter(k => durum(k) === 'kararsiz') : [],
        etiketler: etiketler.filter(e => durum(e) === 'gecerli'),
        kararsizEtiketler: etiketler.filter(e => durum(e) === 'kararsiz')
    };

    return {
        sayimlar,
        sonuc,
        // Ne konusu ne etiketi olan içerik dışa aktarılan veritabanına girmez
        disaAktarilir: sonuc.anaKonu !== null || sonuc.etiketler.length > 0 || sonuc.kararsizEtiketler.length > 0
    };
}

function sayimDegistir(sayim, oy, miktar) {
    if (oy === 1) sayim.yukari += miktar;
    else if (oy === 0) sayim.kararsiz += miktar;
    else if (oy === -1) sayim.asagi += miktar;
}

module.exports = { puanla };
