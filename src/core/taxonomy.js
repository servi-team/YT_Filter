/**
 * YouTube Filtreleyici - Konu / Etiket tanımları ve kayıt doğrulama.
 * Hem tarayıcıda (global YTF) hem Node'da (require) çalışır. DOM veya chrome.* kullanmaz.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else { root.YTF = root.YTF || {}; Object.assign(root.YTF, factory()); }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Konu = videonun/kanalın kategorisi. Etiket = uyarı bayrağı (flag).
    const KONULAR = [
        { id: 'ders-okul', ad: 'Ders / Okul', aciklama: 'okul müfredatı, konu anlatımı, sınav hazırlığı, üniversite dersleri' },
        { id: 'egitici', ad: 'Eğitici', aciklama: 'belgesel, nasıl yapılır videoları, ders harici kurslar (dil dahil)' },
        { id: 'bilim', ad: 'Bilim', aciklama: 'akademik/araştırma içeriği, popüler bilim, uzay, doğa bilimleri' },
        { id: 'teknoloji', ad: 'Teknoloji', aciklama: 'yazılım, donanım, yapay zeka, inceleme kanalları' },
        { id: 'haber', ad: 'Haber / Güncel olaylar', aciklama: 'haber kanalları, siyasi yorum, gündem' },
        { id: 'din', ad: 'Din / Maneviyat', aciklama: 'dini sohbetler, vaazlar, manevi içerik' },
        { id: 'eglence', ad: 'Eğlence / Mizah', aciklama: 'komedi, skeç, meme, tepki videoları' },
        { id: 'oyun', ad: 'Oyun', aciklama: 'oyun oynanışı, oyun incelemeleri, espor' },
        { id: 'spor', ad: 'Spor', aciklama: 'futbol, basketbol, fitness, spor haberleri' },
        { id: 'muzik', ad: 'Müzik', aciklama: 'müzik videoları, cover, müzik analizi' },
        { id: 'film-dizi-sanat', ad: 'Film / Dizi / Sanat', aciklama: 'sinema, dizi, çizim, sanat' },
        { id: 'yasam-vlog', ad: 'Yaşam / Vlog', aciklama: 'günlük vlog, yemek, seyahat, yaşam tarzı' },
        { id: 'finans', ad: 'Finans / Girişim', aciklama: 'borsa, kripto, iş, ekonomi' },
        { id: 'saglik-gelisim', ad: 'Sağlık / Kişisel gelişim', aciklama: 'sağlık, psikoloji, motivasyon, kişisel gelişim' },
        { id: 'cocuk', ad: 'Çocuk içerikleri', aciklama: 'çocuklara yönelik animasyon/şarkı kanalları' }
    ];

    const ETIKETLER = [
        { id: 'kufur', ad: 'Küfürlü içerik', aciklama: 'küfür içeren videolar' },
        { id: 'argo', ad: 'Argolu içerik', aciklama: 'hakaret içeren (aptal, salak vb.)' },
        { id: 'ai', ad: 'AI ile üretilmiş içerik', aciklama: 'YZ ile yapılmış videolar (emin değilseniz eklemeyin)' },
        { id: 'kumar', ad: 'Kumar / bahis', aciklama: 'kumar ve bahis içeren içerikler' },
        { id: 'siddet', ad: 'Şiddet', aciklama: 'dövüş, savaş, gerçekçi öldürmeli oyunlar; arada kalırsanız buraya' },
        { id: 'zararli', ad: 'Zararlı / uygunsuz içerik', aciklama: 'sigara, alkol, uyuşturucu, cinsel içerik, kanun ihlali' },
        { id: 'olumsuz-ornek', ad: 'Olumsuz örnek', aciklama: 'zorbalama, taciz, dinî açıdan uygun olmayan davranışlar' },
        { id: 'spam', ad: 'Spam / sahte içerik', aciklama: 'gerçekmiş gibi duran aldatıcı içerikler, çoğu trading/coin videosu' }
    ];

    const MODLAR = ['serbest', 'orta', 'kati'];

    // Engellenen içeriğin görünümü: kaldir = tamamen gizle, bulaniklastir = bulanık, uyari = üstü uyarı sayfasıyla kapalı.
    // Sertlik sırası (birden çok sebepte en sert kazanır): kaldir > uyari > bulaniklastir.
    const ENGEL_EYLEMLERI = ['kaldir', 'uyari', 'bulaniklastir'];
    const KARARSIZ_SECENEKLERI = ['izinver', 'engelle'];

    /**
     * Kullanıcı ayarlarının varsayılanı.
     * etiketlenmemis: null = kullanıcı henüz seçmedi (ilk açılışta sorulacak). Karar sırasında 'engelle' sayılır.
     * engelEylemi: liste / etiketlenmemiş / "izinli konu yok" gibi konu-etiket dışı engellerin görünümü ('kaldir' | 'uyari' | 'bulaniklastir').
     * konular[id]  : 'izinli' | 'kaldir' | 'uyari' | 'bulaniklastir'   (izinli değilse engelli; değer = engellenince nasıl görüneceği)
     * etiketler[id]: aynı değerler.
     * kanalKontrol : true = videoda veri yoksa kanalın konu/etiketine bakılır; false = doğrudan "bilinmeyen" sayılır.
     * kararsiz     : 'izinver' | 'engelle'. Topluluk oylamasında sonuç çıkmamış (toplam 0) konu/etiketlerin Orta moddaki davranışı.
     *                Serbest modda kararsızlara hep izin verilir; Katı modda hep engellenir (kullanıcının engellediği konu/etiketse).
     * rozetGoster: kartların üzerinde rozet gösterilsin mi.
     */
    function varsayilanAyar() {
        const konular = {};
        KONULAR.forEach(k => { konular[k.id] = 'izinli'; });
        const etiketler = {};
        // Yeni model: etiket eylem değerleri 'izinli' | 'bulaniklastir' | 'kaldir'
        ETIKETLER.forEach(e => { etiketler[e.id] = 'kaldir'; });
        return {
            mod: 'orta',
            konular,
            etiketler,
            etiketlenmemis: null,
            engelEylemi: 'kaldir',
            kanalKontrol: true,
            kararsiz: 'izinver',
            rozetGoster: true,
            listeler: { beyaz: {}, kara: {}, ozel: [] }
        };
    }


    const REZERVE_LISTE_ADLARI = ['beyaz liste', 'kara liste'];
    const sahipMi = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    const duzNesne = (o) => o && typeof o === 'object' && !Array.isArray(o);

    /**
     * Dışarıdan gelen (içe aktarılan, depodan okunan) ayarı doğrular ve temizler: bilinmeyen alanlar atılır,
     * geçersiz değerler varsayılana döner, eksikler varsayılanla dolar. Her zaman geçerli bir ayar döndürür.
     */
    function ayarTemizle(girdi) {
        const a = duzNesne(girdi) ? girdi : {};
        const c = varsayilanAyar();

        if (MODLAR.includes(a.mod)) c.mod = a.mod;
        c.etiketlenmemis = (a.etiketlenmemis === 'ac' || a.etiketlenmemis === 'engelle') ? a.etiketlenmemis : null;
        if (ENGEL_EYLEMLERI.includes(a.engelEylemi)) c.engelEylemi = a.engelEylemi;
        if (typeof a.kanalKontrol === 'boolean') c.kanalKontrol = a.kanalKontrol;
        if (KARARSIZ_SECENEKLERI.includes(a.kararsiz)) c.kararsiz = a.kararsiz;

        // Konu / etiket değerleri: 'izinli' | 'kaldir' | 'uyari' | 'bulaniklastir'.
        // Geriye uyum: eski 'engelli' değeri genel engelEylemi'ne çevrilir.
        const degerCoz = (deger, varsayilan) => {
            if (deger === 'engelli') return c.engelEylemi;
            if (deger === 'izinli' || ENGEL_EYLEMLERI.includes(deger)) return deger;
            return varsayilan;
        };
        KONULAR.forEach(k => {
            if (duzNesne(a.konular) && sahipMi(a.konular, k.id)) c.konular[k.id] = degerCoz(a.konular[k.id], c.konular[k.id]);
        });
        ETIKETLER.forEach(e => {
            if (duzNesne(a.etiketler) && sahipMi(a.etiketler, e.id)) c.etiketler[e.id] = degerCoz(a.etiketler[e.id], c.etiketler[e.id]);
        });
        if (typeof a.rozetGoster === 'boolean') c.rozetGoster = a.rozetGoster;

        const anahtarlariAl = (kaynak, hedef) => {
            if (!duzNesne(kaynak)) return;
            Object.keys(kaynak).forEach(k => {
                if (kaynak[k] === true && k.length > 0 && k.length <= 100) hedef[k.toLowerCase()] = true;
            });
        };
        const L = duzNesne(a.listeler) ? a.listeler : {};
        anahtarlariAl(L.beyaz, c.listeler.beyaz);
        anahtarlariAl(L.kara, c.listeler.kara);

        const kullanilan = new Set(REZERVE_LISTE_ADLARI);
        (Array.isArray(L.ozel) ? L.ozel : []).forEach(o => {
            if (!duzNesne(o) || typeof o.ad !== 'string') return;
            const ad = o.ad.trim().slice(0, 40);
            const anahtar = ad.toLocaleLowerCase('tr-TR'); // Türkçe I/ı, İ/i için
            if (!ad || kullanilan.has(anahtar)) return;
            kullanilan.add(anahtar);
            const uyeler = {};
            anahtarlariAl(o.uyeler, uyeler);
            c.listeler.ozel.push({ ad, eylem: o.eylem === 'izinver' ? 'izinver' : 'engelle', uyeler });
        });
        return c;
    }

    /**
     * Bir video/kanal kaydını doğrular. Hata mesajlarının listesini döndürür (boş = geçerli).
     * kayit: { anaKonu?, yanKonular[], etiketler[], kararsizKonular[], kararsizEtiketler[] }
     *
     * Kurallar:
     *  - Düzenleme sitesi her zaman bir ana konu girer; ancak topluluk oylamasında hiçbir konu pozitif çıkmayabilir.
     *    Bu yüzden anaKonu burada isteğe bağlıdır. Yan konu varsa ana konu zorunludur.
     *  - Kayıtta en az bir bilgi olmalı (ana konu, etiket ya da kararsız); tamamen boş kayıt "bilinmeyen"dir, kayıt sayılmaz.
     *  - Bir konu/etiket hem kesin hem kararsız olamaz.
     */
    function kayitDogrula(kayit) {
        const hatalar = [];
        const konuIdleri = KONULAR.map(k => k.id);
        const etiketIdleri = ETIKETLER.map(e => e.id);

        if (!kayit || typeof kayit !== 'object') return ['Kayıt yok.'];

        const liste = (alan, idler, ad) => {
            const v = kayit[alan] === undefined ? [] : kayit[alan];
            if (!Array.isArray(v)) { hatalar.push(`${alan} liste olmalı.`); return []; }
            v.forEach(x => { if (!idler.includes(x)) hatalar.push(`Bilinmeyen ${ad}: ${x}`); });
            return v;
        };

        if (kayit.anaKonu && !konuIdleri.includes(kayit.anaKonu)) hatalar.push(`Bilinmeyen ana konu: ${kayit.anaKonu}`);
        const yan = liste('yanKonular', konuIdleri, 'yan konu');
        const et = liste('etiketler', etiketIdleri, 'etiket');
        const kk = liste('kararsizKonular', konuIdleri, 'kararsız konu');
        const ke = liste('kararsizEtiketler', etiketIdleri, 'kararsız etiket');

        if (yan.length && !kayit.anaKonu) hatalar.push('Yan konu için ana konu gerekli.');
        if (kayit.anaKonu && yan.includes(kayit.anaKonu)) hatalar.push('Ana konu yan konularda tekrar edilemez.');
        if (kk.some(k => k === kayit.anaKonu || yan.includes(k))) hatalar.push('Bir konu hem kesin hem kararsız olamaz.');
        if (ke.some(e => et.includes(e))) hatalar.push('Bir etiket hem kesin hem kararsız olamaz.');
        if (!kayit.anaKonu && !et.length && !kk.length && !ke.length && !hatalar.length) {
            hatalar.push('Kayıt boş: ana konu, etiket ya da kararsız bilgi gerekli.');
        }
        return hatalar;
    }

    return { KONULAR, ETIKETLER, MODLAR, ENGEL_EYLEMLERI, KARARSIZ_SECENEKLERI, REZERVE_LISTE_ADLARI, varsayilanAyar, ayarTemizle, kayitDogrula };
});
