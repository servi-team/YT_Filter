/**
 * YouTube Filtreleyici - Veritabanı yükleyici / indeksleyici.
 * db.json sözleşmesi için docs/db-sema.md dosyasına bakın.
 * Saf fonksiyon: dosya okumaz, ağ kullanmaz; JSON nesnesini alır, arama fonksiyonları döndürür.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./taxonomy.js'));
    else { root.YTF = root.YTF || {}; Object.assign(root.YTF, factory(root.YTF)); }
})(typeof self !== 'undefined' ? self : this, function (T) {
    'use strict';

    const SEMA = 1;
    const KANAL_ID = /^UC[A-Za-z0-9_-]{22}$/;
    const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
    const HANDLE = /^@[A-Za-z0-9._-]+$/;

    const dz = (x) => (Array.isArray(x) ? x : []);
    const kayitAl = (o) => ({
        anaKonu: o.anaKonu || null,
        yanKonular: dz(o.yanKonular),
        etiketler: dz(o.etiketler),
        kararsizKonular: dz(o.kararsizKonular),
        kararsizEtiketler: dz(o.kararsizEtiketler)
    });

    /**
     * json: db.json içeriği (veya null). Geçersiz kayıtlar atlanır ve sayılır; hiçbir kayıt çökmeye yol açmaz.
     * Bu eklenti sürümünün tanımadığı konu/etiket kimlikleri kaydı düşürmez; yok sayılır ve sayaçta raporlanır
     * (ileri uyumluluk: site yeni kimlikler eklediğinde eski eklenti bilinen alanları korur).
     * Dönüş: { veriSurumu, sayac:{kanal, video, atlanan, yokSayilan}, hatalar[], uyarilar[], videoBul(id), kanalBul(id, handle) }
     */
    function dbKur(json) {
        const videolar = new Map();
        const kanalIdIndeks = new Map();
        const kanalHandleIndeks = new Map();
        const kanalIdKucukIndeks = new Map();
        const sayac = { kanal: 0, video: 0, atlanan: 0, yokSayilan: 0 };
        const hatalar = [];
        const uyarilar = [];
        let veriSurumu = 0;

        const atla = (neden) => { sayac.atlanan++; if (hatalar.length < 10) hatalar.push(neden); };
        const toleransliKayit = (kayit, yer) => {
            const ayikla = T.kayitBilinmeyenleriAyikla(kayit);
            if (ayikla.yokSayilan.length) {
                sayac.yokSayilan += ayikla.yokSayilan.length;
                if (uyarilar.length < 10) uyarilar.push(`${yer}: yok sayılan ${ayikla.yokSayilan.join(', ')}`);
            }
            return ayikla.kayit;
        };

        if (json && json.sema === SEMA) {
            veriSurumu = Number(json.veriSurumu) || 0;

            (Array.isArray(json.videolar) ? json.videolar : []).forEach((v, i) => {
                if (!v || !VIDEO_ID.test(v.id || '')) return atla(`videolar[${i}]: geçersiz video id`);
                const temiz = toleransliKayit(v, `videolar[${i}] (${v.id})`);
                const h = T.kayitDogrula(temiz);
                if (h.length) return atla(`videolar[${i}] (${v.id}): ${h[0]}`);
                videolar.set(v.id, kayitAl(temiz));
                sayac.video++;
            });

            (Array.isArray(json.kanallar) ? json.kanallar : []).forEach((k, i) => {
                if (!k || !KANAL_ID.test(k.id || '')) return atla(`kanallar[${i}]: geçersiz kanal id`);
                if (k.handle && !HANDLE.test(k.handle)) return atla(`kanallar[${i}] (${k.id}): geçersiz handle`);
                const temiz = toleransliKayit(k, `kanallar[${i}] (${k.id})`);
                const h = T.kayitDogrula(temiz);
                if (h.length) return atla(`kanallar[${i}] (${k.id}): ${h[0]}`);
                const kayit = { id: k.id, handle: k.handle || null, ad: k.ad || null, avatar: k.avatar || null, kayit: kayitAl(temiz) };
                kanalIdIndeks.set(k.id, kayit);
                kanalIdKucukIndeks.set(k.id.toLowerCase(), kayit);
                if (k.handle) kanalHandleIndeks.set(k.handle.toLowerCase(), kayit);
                sayac.kanal++;
            });
        } else if (json) {
            hatalar.push(`Desteklenmeyen sema: ${json.sema}`);
        }

        return {
            veriSurumu,
            sayac,
            hatalar,
            uyarilar,
            videoBul: (id) => (id && videolar.get(id)) || null,
            // Kullanıcı listelerindeki (küçük harfe çevrilmiş) anahtardan kanal kaydını bulur: arayüzde ad göstermek için.
            anahtarBul: (anahtar) => {
                const k = String(anahtar || '').toLowerCase();
                return kanalIdKucukIndeks.get(k) || kanalHandleIndeks.get(k) || null;
            },
            kanalBul: (id, handle) => {
                if (id && kanalIdIndeks.has(id)) return kanalIdIndeks.get(id);
                if (handle && kanalHandleIndeks.has(handle.toLowerCase())) return kanalHandleIndeks.get(handle.toLowerCase());
                return null;
            }
        };
    }

    /**
     * Paketle gelen veritabanı ile kullanıcının elle içe aktardığı (override) veritabanından
     * veriSurumu büyük olanı seçer. Eşitlikte paketli olan kazanır. Geçersiz olan yok sayılır.
     */
    function dbSec(paketli, override) {
        const gecerli = (j) => j && j.sema === SEMA;
        if (gecerli(paketli) && gecerli(override)) {
            return (Number(override.veriSurumu) || 0) > (Number(paketli.veriSurumu) || 0) ? override : paketli;
        }
        if (gecerli(override)) return override;
        if (gecerli(paketli)) return paketli;
        return null;
    }

    return { dbKur, dbSec, DB_SEMA: SEMA };
});
