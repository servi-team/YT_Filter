/**
 * YouTube Filtreleyici - Content Script
 * Hem Chromium hem de Firefox ile %100 uyumlu içerik denetleyici.
 */

const browserAPI = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

let hafiza = {};
let ayarMotor = null;      // çözümlenmiş ayar (core/engine.js)
let veriTabani = null;     // indekslenmiş veritabanı (core/db.js)
let paketliDbSozu = null;  // paketle gelen db.json, sayfa başına bir kez okunur
let motorHazir = false;     // loadData bitmeden karar verilmez (varsayılan ayarla geçici engel/banner çıkmasın)
let sonKararAnahtari = '';  // tanılama günlüğü yalnızca karar değişince yazılsın
let bulanikKok = null;      // bulanıklaştırılan tek oynatıcı kökü
let bulanikKalkan = null;   // oynatıcının üstünü kaplayan kalkan
let bulanikDinleyiciler = [];
let bulanikResizeObserver = null;
let stilElemani = document.createElement('style');
document.head.appendChild(stilElemani);

// Kanal bağlamı SAKLANMAZ: her çağrıda güncel adresten hesaplanır. Yalnızca gerçek kanal sayfasında
// (yol "/@handle" ile başlar) bir kanal vardır. Eskiden değişken saklanıyordu ve tek sayfa geçişinde bayat kalıp
// (ör. TRT Spor kanalından çıkınca) başka kanalların video/kartları o kanal sanılıp engelleniyordu.
function guncelKanalBaglami() {
    const m = window.location.pathname.match(/^\/(@[a-zA-Z0-9._-]+)/);
    return m ? m[1] : null;
}

// İzleme sayfasındaki sahip bağlantısı, yalnızca sayfadaki video bu videoysa güvenilir (geçişte bir önceki
// videonun kanalı bir süre DOM'da kalır).
function izlemeSayfasiKanali(videoId) {
    const flexy = document.querySelector('ytd-watch-flexy');
    const sayfadakiVideo = flexy && flexy.getAttribute('video-id');
    if (sayfadakiVideo && videoId && sayfadakiVideo !== videoId) return null;
    const channelLink = document.querySelector('ytd-watch-metadata #owner a[href^="/@"]');
    if (!channelLink) return null;
    const match = channelLink.href.match(/\/(@[a-zA-Z0-9._-]+)/);
    return match ? match[1] : null;
}

async function getStorageData(keys = null) {
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
        return await browser.storage.local.get(keys);
    }
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, (res) => resolve(res || {}));
    });
}

async function setStorageData(items) {
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
        return await browser.storage.local.set(items);
    }
    return new Promise((resolve) => chrome.storage.local.set(items, () => resolve()));
}

async function loadData() {
    try {
        const storageData = await getStorageData(null);
        hafiza = storageData || {};
        ayarMotor = YTF.ayarCoz(hafiza);
        const paketli = await paketliDbyiYukle();
        veriTabani = YTF.dbKur(YTF.dbSec(paketli, hafiza.dbOverride));
        if (!motorHazir) {
            console.info('YT Filter: hazır', { mod: ayarMotor.mod, etiketlenmemis: ayarMotor.etiketlenmemis,
                beyaz: Object.keys(ayarMotor.listeler.beyaz).length, kara: Object.keys(ayarMotor.listeler.kara).length,
                dbKanal: veriTabani.sayac.kanal, dbVideo: veriTabani.sayac.video, dbHatalar: veriTabani.hatalar });
        }
        motorHazir = true;
        arayuzAyarlariniUygula();
        if (document.body) hizliRayCiz();
    } catch (e) {
        console.error("Veri yükleme hatası", e);
    }
}

function arayuzAyarlariniUygula() {
    // Sabit rozet/blur/gizleme kuralları inject.css içinde. Burada yalnızca ayara bağlı kurallar var.
    let cssKurallari = '';

    if (hafiza.ayarlar?.otomatikOynatmaKapat) {
        cssKurallari += `
            ytd-video-preview,
            #mouseover-overlay,
            #hover-overlays,
            ytd-moving-thumbnail-renderer,
            #inline-preview-player { display: none !important; }
        \n`;
    }

    if (hafiza.ayarlar?.shortsGizle) {
        cssKurallari += `
            ytd-rich-shelf-renderer[is-shorts], 
            ytd-reel-shelf-renderer, 
            a[href^="/shorts"], 
            ytd-guide-entry-renderer a[title="Shorts"], 
            ytd-mini-guide-entry-renderer[aria-label="Shorts"],
            yt-page-navigation-item-view-model a[title="Shorts"] { 
                display: none !important; 
            }\n`;
    }
    
    if (hafiza.ayarlar?.yorumGizle) {
        cssKurallari += `ytd-comments { display: none !important; }\n`;
    }
    if (hafiza.ayarlar?.onerilenGizle) {
        cssKurallari += `ytd-watch-next-secondary-results-renderer { display: none !important; }\n`;
    }
    stilElemani.textContent = cssKurallari;
}


// Paketle gelen veritabanını (data/db.json) bir kez okur. Yalnızca youtube.com sayfalarında (web_accessible_resources).
function paketliDbyiYukle() {
    if (paketliDbSozu) return paketliDbSozu;
    paketliDbSozu = (async () => {
        if (!/(^|\.)youtube\.com$/.test(location.hostname)) return null;
        try {
            const yanit = await fetch(browserAPI.runtime.getURL('data/db.json'));
            return await yanit.json();
        } catch (e) {
            console.warn('YT Filter: db.json yüklenemedi', e);
            return null;
        }
    })();
    return paketliDbSozu;
}

// Tek karar noktası. Asıl mantık core/decision.js içinde; burada yalnızca mevcut ayar ve veritabanı verilir.
function icerikKarari(videoId, channelHandle, channelId) {
    return YTF.icerikKarari(
        ayarMotor || YTF.varsayilanAyar(),
        veriTabani || YTF.dbKur(null),
        { videoId, handle: channelHandle, channelId }
    );
}

// ---------- Engel Banner'ı (PR 6) ----------
const BANNER_ID = 'yt-filter-engel-banner';

function sebepiMetne(sebep) {
    return YTF.sebepMetni(sebep);
}

// ---------- PIN kapısı ve ortak liste yazımı ----------
const PIN_DEGISIM_ANAHTARLARI = ['pinKilitBitis', 'pinHataSayisi', 'pinHataBitis'];
const TAZE_ANAHTARLAR = ['surum', 'ayar', 'pinKodu', 'ayarlar', 'pinKilitBitis', 'pinHataSayisi', 'pinHataBitis'];
let pinPenceresi = null;
let bildirimZamanlayici = null;

// Kısa, ekran okuyucuların da duyduğu durum bildirimi.
function bildirimGoster(metin) {
    let el = document.getElementById('ytf-bildirim');
    if (!el) {
        el = document.createElement('div');
        el.id = 'ytf-bildirim';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
    }
    el.textContent = metin;
    if (bildirimZamanlayici) clearTimeout(bildirimZamanlayici);
    bildirimZamanlayici = setTimeout(() => {
        bildirimZamanlayici = null;
        if (el.parentNode) el.remove();
    }, 3000);
}

// Açık PIN penceresini kapatır ve bekleyen yazmayı reddeder.
function pinPenceresiIptalEt() {
    if (pinPenceresi) pinPenceresi.bitir(false);
}

/**
 * Kilitliyken istisna yazımı için PIN ister. Doğru PIN'de oturum açar ve true çözer.
 * Aynı anda birden çok pencere açılmaz; ikinci çağrı aynı promise'i bekler.
 */
function pinPenceresiAc() {
    if (pinPenceresi) return pinPenceresi.soz;

    let cozumle;
    const soz = new Promise((coz) => { cozumle = coz; });

    const kok = document.createElement('div');
    kok.className = 'ytf-pin-pencere';
    kok.setAttribute('data-ytf-pin-pencere', 'true');
    kok.setAttribute('role', 'dialog');
    kok.setAttribute('aria-modal', 'true');
    kok.setAttribute('aria-labelledby', 'ytf-pin-baslik');

    const kutu = document.createElement('div');
    kutu.className = 'ytf-pin-kutu';

    const baslik = document.createElement('h2');
    baslik.id = 'ytf-pin-baslik';
    baslik.className = 'ytf-pin-baslik';
    baslik.textContent = 'PIN gerekli';

    const aciklama = document.createElement('p');
    aciklama.className = 'ytf-pin-aciklama';
    aciklama.textContent = 'İstisna listesini değiştirmek için PIN girin.';

    const giris = document.createElement('input');
    giris.id = 'ytf-pin-giris';
    giris.className = 'ytf-pin-giris';
    giris.type = 'password';
    giris.inputMode = 'numeric';
    giris.autocomplete = 'off';
    giris.maxLength = 4;
    giris.setAttribute('aria-label', 'PIN');
    giris.addEventListener('input', () => {
        giris.value = giris.value.replace(/\D/g, '').slice(0, 4);
    });

    const hata = document.createElement('div');
    hata.id = 'ytf-pin-hata';
    hata.className = 'ytf-pin-hata';
    hata.setAttribute('aria-live', 'polite');
    hata.setAttribute('aria-atomic', 'true');

    const butonlar = document.createElement('div');
    butonlar.className = 'ytf-pin-butonlar';

    const vazgec = document.createElement('button');
    vazgec.id = 'ytf-pin-vazgec';
    vazgec.type = 'button';
    vazgec.className = 'ytf-btn ytf-btn-geri';
    vazgec.textContent = 'Vazgeç';

    const onay = document.createElement('button');
    onay.id = 'ytf-pin-onay';
    onay.type = 'button';
    onay.className = 'ytf-btn ytf-btn-beyaz';
    onay.textContent = 'Giriş';

    butonlar.append(vazgec, onay);
    kutu.append(baslik, aciklama, giris, hata, butonlar);
    kok.appendChild(kutu);

    let kapaniyor = false;
    let mesgul = false;
    let sayacZamanlayici = null;

    const bitir = (sonuc) => {
        if (kapaniyor) return;
        kapaniyor = true;
        if (sayacZamanlayici) clearInterval(sayacZamanlayici);
        sayacZamanlayici = null;
        document.removeEventListener('keydown', tusDinleyici, true);
        kok.remove();
        if (pinPenceresi && pinPenceresi.soz === soz) pinPenceresi = null;
        cozumle(sonuc);
    };

    function beklemeGuncelle() {
        const kalan = YTF.hataBeklemesi(hafiza, Date.now());
        if (kalan > 0) {
            onay.disabled = true;
            hata.textContent = `Çok fazla hatalı deneme. ${Math.ceil(kalan / 1000)} sn sonra tekrar deneyin.`;
            if (!sayacZamanlayici) {
                sayacZamanlayici = setInterval(() => {
                    const k = YTF.hataBeklemesi(hafiza, Date.now());
                    if (k <= 0) {
                        clearInterval(sayacZamanlayici);
                        sayacZamanlayici = null;
                        onay.disabled = false;
                        hata.textContent = '';
                        return;
                    }
                    hata.textContent = `Çok fazla hatalı deneme. ${Math.ceil(k / 1000)} sn sonra tekrar deneyin.`;
                }, 250);
            }
        } else {
            if (sayacZamanlayici) {
                clearInterval(sayacZamanlayici);
                sayacZamanlayici = null;
            }
            onay.disabled = false;
        }
    }

    async function onayla() {
        if (mesgul || kapaniyor || onay.disabled) return;
        const girilen = giris.value.trim();
        if (!/^\d{4}$/.test(girilen)) {
            hata.textContent = 'PIN 4 rakam olmalıdır.';
            giris.focus();
            return;
        }

        mesgul = true;
        onay.disabled = true;
        try {
            const dogru = await YTF.pinDogrula(girilen, hafiza);
            if (dogru) {
                const yazilacak = {
                    pinKilitBitis: YTF.kilitBitisZamani(),
                    pinHataSayisi: 0,
                    pinHataBitis: 0
                };
                await setStorageData(yazilacak);
                Object.assign(hafiza, yazilacak);
                bitir(true);
                return;
            }

            const hataDurumu = YTF.hataKaydet(hafiza, Date.now());
            await setStorageData(hataDurumu);
            Object.assign(hafiza, hataDurumu);
            giris.value = '';
            giris.focus();
            if (hataDurumu.pinHataBitis > 0) {
                beklemeGuncelle();
            } else {
                const kalanDeneme = Math.max(0, YTF.HATA_SINIRI - (Number(hataDurumu.pinHataSayisi) || 0));
                hata.textContent = `Hatalı PIN. ${kalanDeneme} deneme kaldı.`;
            }
        } catch (e) {
            hata.textContent = 'PIN doğrulanamadı; tekrar deneyin.';
        } finally {
            mesgul = false;
            if (!kapaniyor && YTF.hataBeklemesi(hafiza, Date.now()) <= 0) onay.disabled = false;
        }
    }

    function tusDinleyici(olay) {
        if (olay.key === 'Escape') {
            olay.preventDefault();
            bitir(false);
        } else if (olay.key === 'Enter') {
            const etkin = document.activeElement;
            if (etkin === giris || etkin === onay) {
                olay.preventDefault();
                onayla();
            }
        }
    }

    vazgec.addEventListener('click', () => bitir(false));
    onay.addEventListener('click', onayla);
    document.addEventListener('keydown', tusDinleyici, true);

    pinPenceresi = { soz, bitir };
    document.body.appendChild(kok);
    beklemeGuncelle();
    giris.focus();
    return soz;
}

// Hedef listeye yazar; aynı anahtarı önce tüm listelerden çıkarır.
function listeyeYaz(ayar, anahtar, hedef) {
    const L = ayar.listeler;
    delete L.beyaz[anahtar];
    delete L.kara[anahtar];
    (L.ozel || []).forEach(l => { delete l.uyeler[anahtar]; });

    if (hedef === 'kara') {
        L.kara[anahtar] = true;
        return true;
    }
    if (typeof hedef === 'string' && hedef.startsWith('ozel:')) {
        const liste = (L.ozel || []).find(l => l.ad === hedef.slice(5));
        if (!liste) return false;
        liste.uyeler[anahtar] = true;
        return true;
    }
    L.beyaz[anahtar] = true;
    return true;
}

/**
 * Tek liste yazma yolu: depoyu taze okur, kilitliyse PIN ister, hedefe yazar,
 * motoru/rayı yeniler ve kısa bildirim gösterir.
 */
async function listeYaz(anahtar, hedef, sonra) {
    const k = String(anahtar || '').toLowerCase();
    if (!k) return false;

    const taze = await getStorageData(TAZE_ANAHTARLAR);
    Object.assign(hafiza, taze || {});

    if (YTF.kilitGerekli(hafiza) && !YTF.kilitAcik(hafiza, Date.now())) {
        const acildi = await pinPenceresiAc();
        if (!acildi) return false;
    }

    const a = YTF.ayarCoz(hafiza);
    if (!listeyeYaz(a, k, hedef)) return false;

    await setStorageData({ surum: 2, ayar: a });
    await loadData();
    checkWatchPage();
    if (typeof hizliRayCiz === 'function') hizliRayCiz();

    const hedefEtiketi = hedef === 'kara'
        ? 'Kara listeye'
        : (typeof hedef === 'string' && hedef.startsWith('ozel:') ? `"${hedef.slice(5)}" listesine` : 'Beyaz listeye');
    bildirimGoster(`${k} ${hedefEtiketi} eklendi.`);

    if (typeof sonra === 'function') sonra();
    return true;
}

// ---------- Hızlı ekleme rayı (isteğe bağlı) ----------
const HIZLI_EKLEME_HOSTLARI = ['www.youtube.com', 'm.youtube.com', 'youtube.com'];

function hizliEklemeUygunMu() {
    if (window !== window.top) return false;
    if (!hafiza.ayarlar || hafiza.ayarlar.hizliEkleme !== true) return false;
    if (!HIZLI_EKLEME_HOSTLARI.includes(window.location.hostname)) return false;

    const yol = window.location.pathname;
    if (yol.startsWith('/embed/')) return false;
    if (yol.startsWith('/shorts/') && hafiza.ayarlar.shortsGizle) return false;
    if (yol === '/watch' || yol.startsWith('/shorts/')) return true;
    if (/^\/@[a-zA-Z0-9._-]+/.test(yol)) return true;
    if (/^\/channel\/UC[A-Za-z0-9_-]{22}/.test(yol)) return true;
    return false;
}

function hizliRayKaldir() {
    const ray = document.getElementById('ytf-hizli-ray');
    if (ray) ray.remove();
}

function hizliRayDugmesi(hedef, metin, ikonMetni, sinif, anahtar) {
    const dugme = document.createElement('button');
    dugme.type = 'button';
    dugme.className = `ytf-hizli-ray-btn ${sinif}`;
    dugme.setAttribute('data-ytf-hedef', hedef);
    dugme.setAttribute('aria-label', metin);

    const ikon = document.createElement('span');
    ikon.className = 'ytf-hizli-ray-ikon';
    ikon.textContent = ikonMetni;

    const yazi = document.createElement('span');
    yazi.className = 'ytf-hizli-ray-metin';
    yazi.textContent = metin;

    dugme.append(ikon, yazi);
    dugme.addEventListener('click', () => {
        listeYaz(anahtar, hedef, hizliRayCiz);
    });
    return dugme;
}

function hizliRayCiz() {
    if (!hizliEklemeUygunMu()) {
        hizliRayKaldir();
        return;
    }
    if (!document.body) {
        hizliRayKaldir();
        return;
    }
    const durum = sayfaKimligi();
    if (!durum || !durum.tespit) {
        hizliRayKaldir();
        return;
    }

    const anahtar = String(durum.tespit).toLowerCase();
    const imza = `${durum.tur}:${anahtar}`;
    const mevcut = document.getElementById('ytf-hizli-ray');
    if (mevcut && mevcut.dataset.ytfImza === imza) return;
    hizliRayKaldir();

    const ray = document.createElement('div');
    ray.id = 'ytf-hizli-ray';
    ray.dataset.ytfImza = imza;
    ray.setAttribute('role', 'group');
    ray.setAttribute('aria-label', 'Hızlı ekleme');

    const etiket = document.createElement('div');
    etiket.className = 'ytf-hizli-ray-etiket';
    etiket.textContent = durum.tur === 'Kanal' ? 'Kanal' : 'Video';

    ray.append(
        etiket,
        hizliRayDugmesi('beyaz', 'Beyaz listeye ekle', '✓', 'ytf-hizli-ray-beyaz', anahtar),
        hizliRayDugmesi('kara', 'Kara listeye ekle', '✕', 'ytf-hizli-ray-kara', anahtar)
    );
    document.body.appendChild(ray);
}

function sayfaKimligi() {
    const url = new URL(window.location.href);
    let videoId = null;
    if (url.pathname === '/watch') videoId = url.searchParams.get('v');
    else if (url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.split('/')[2];
        if (videoId && videoId.includes('?')) videoId = videoId.split('?')[0];
    } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.split('/')[2];
    }

    const yol = url.pathname;
    const hm = yol.match(/^\/(@[a-zA-Z0-9._-]+)/);
    const im = yol.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})/);
    let handle = hm ? hm[1] : guncelKanalBaglami();
    const kanalId = im ? im[1] : null;

    if (videoId && !url.pathname.startsWith('/embed/')) {
        handle = izlemeSayfasiKanali(videoId);
    }

    let tur = null;
    let tespit = null;
    if (videoId) { tur = 'Video'; tespit = videoId; }
    else if (handle) { tur = 'Kanal'; tespit = handle; }
    else if (kanalId) { tur = 'Kanal'; tespit = kanalId; }

    return { videoId, handle, kanalId, tur, tespit, ...sayfaKanalBilgisi() };
}

// Kullanıcı listelerinde göstermek için sayfadaki kanal adı/avatarını (varsa) toplar.
// Doğrulama options.js tarafında YTF.kanalBilgileriTemizle ile yapılır.
function ilkDeger(seciciler, ozellik) {
    for (const secici of seciciler) {
        const el = document.querySelector(secici);
        if (!el) continue;
        const deger = ozellik === 'src' ? (el.currentSrc || el.src || '') : (el.textContent || '').trim();
        if (deger) return deger;
    }
    return null;
}

function sayfaKanalBilgisi() {
    const kanalAdi = ilkDeger([
        '#owner #channel-name a',
        'ytd-c4-tabbed-header-renderer ytd-channel-name a',
        'ytd-channel-name #text a',
        'ytd-channel-name a'
    ], 'metin');
    const avatar = ilkDeger([
        '#owner #avatar img',
        'ytd-video-owner-renderer #avatar img',
        'ytd-c4-tabbed-header-renderer #avatar img',
        'ytd-c4-tabbed-header-renderer #img',
        '#avatar img'
    ], 'src');
    return { kanalAdi, avatar };
}

function sayfaDurumuAl() {
    const kimlik = sayfaKimligi();
    if (!kimlik.tespit) return { hazir: motorHazir, tespit: null };
    if (!motorHazir) return { hazir: false, ...kimlik };
    const sonuc = icerikKarari(kimlik.videoId, kimlik.handle, kimlik.kanalId);
    return {
        hazir: true,
        ...kimlik,
        karar: sonuc.karar,
        sebepler: sonuc.sebepler,
        ozet: YTF.kararOzeti(sonuc)
    };
}

function engelBanneriniKaldir() {
    const b = document.getElementById(BANNER_ID);
    if (b) b.remove();
}

// tur: 'video' | 'kanal'. anahtar: "İstisna" butonunun beyaz listeye yazacağı kimlik. Aynı sebep için banner yeniden çizilmez.
function engelBanneriniGoster(sonuc, anahtar, tur, beyazGoster = true) {
    const sebepler = (sonuc.sebepler || []).map(sebepiMetne).filter(Boolean);
    const sebepMetni = sebepler.length ? sebepler.join(' · ') : 'Filtre kuralı';

    const imza = `${tur}:${anahtar}:${sebepMetni}:${beyazGoster}`;
    const mevcut = document.getElementById(BANNER_ID);
    if (mevcut && mevcut.dataset.ytfImza === imza) return;
    engelBanneriniKaldir();

    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.setAttribute('data-yt-filter-banner', 'true');
    banner.dataset.ytfImza = imza;

    const baslik = document.createElement('div');
    baslik.className = 'ytf-banner-baslik';
    baslik.textContent = tur === 'kanal' ? '🚫 Bu kanal engellendi' : '🚫 Bu video engellendi';

    const sebepEl = document.createElement('div');
    sebepEl.className = 'ytf-banner-sebep';
    sebepEl.textContent = sebepMetni;

    const butonlar = document.createElement('div');
    butonlar.className = 'ytf-banner-butonlar';

    const geriBtn = document.createElement('button');
    geriBtn.className = 'ytf-btn ytf-btn-geri';
    geriBtn.textContent = '← Geri dön';
    geriBtn.addEventListener('click', () => {
        // Geçmişte önceki sayfa yoksa (doğrudan link) YouTube ana sayfasına git
        if (history.length > 1) history.back(); else location.href = '/';
    });
    butonlar.appendChild(geriBtn);

    if (beyazGoster) {
        const beyazBtn = document.createElement('button');
        beyazBtn.className = 'ytf-btn ytf-btn-beyaz';
        beyazBtn.textContent = '✓ İstisna: Beyaz listeye ekle';
        beyazBtn.addEventListener('click', async () => {
            const k = String(anahtar || '').toLowerCase();
            if (!k) return;
            await listeYaz(k, 'beyaz', () => engelBanneriniKaldir());
        });
        butonlar.appendChild(beyazBtn);
    }

    banner.append(baslik, sebepEl, butonlar);
    document.body.appendChild(banner);
}

function kararGunlugu(tur, ayrinti, sonuc) {
    const anahtar = tur + JSON.stringify(ayrinti) + sonuc.karar + JSON.stringify(sonuc.sebepler);
    if (anahtar === sonKararAnahtari) return;
    sonKararAnahtari = anahtar;
    console.info('YT Filter: sayfa kararı', tur, ayrinti, sonuc.karar, sonuc.sebepler);
}

// ---------- Gerçek bulanıklaştırma ----------
// Yalnızca oynatıcının kendisi filtrelenir; body'yi filtrelemek tüm sayfayı bulanıklaştırıyordu.
function bulanikKokBul() {
    return document.querySelector('#ytd-player')
        || document.querySelector('.html5-video-player')
        || document.querySelector('#player')
        || document.querySelector('video');
}

function bulanikKalkanKonumu() {
    if (!bulanikKalkan || !bulanikKok || !bulanikKok.isConnected) return;
    const kutu = bulanikKok.getBoundingClientRect();
    bulanikKalkan.style.setProperty('top', `${Math.max(0, kutu.top)}px`, 'important');
    bulanikKalkan.style.setProperty('left', `${Math.max(0, kutu.left)}px`, 'important');
    bulanikKalkan.style.setProperty('width', `${Math.max(0, kutu.width)}px`, 'important');
    bulanikKalkan.style.setProperty('height', `${Math.max(0, kutu.height)}px`, 'important');
}

function bulanikKalkanOlustur() {
    const kalkan = document.createElement('div');
    kalkan.className = 'ytf-bulanik-kalkan';
    kalkan.setAttribute('data-ytf-bulanik-kalkan', 'true');
    kalkan.setAttribute('role', 'note');

    const kilit = document.createElement('div');
    kilit.className = 'ytf-bulanik-kilit';
    kilit.textContent = '🔒';

    const metin = document.createElement('div');
    metin.className = 'ytf-bulanik-metin';
    metin.setAttribute('aria-live', 'polite');
    metin.textContent = 'Bu video bulanıklaştırıldı';

    const geri = document.createElement('button');
    geri.type = 'button';
    geri.className = 'ytf-btn ytf-btn-geri';
    geri.textContent = '← Geri dön';
    geri.addEventListener('click', () => {
        if (history.length > 1) history.back(); else location.href = '/';
    });

    kalkan.append(kilit, metin, geri);
    return kalkan;
}

function bulanikDinleyiciEkle(hedef, tur, islev, secenekler) {
    hedef.addEventListener(tur, islev, secenekler);
    bulanikDinleyiciler.push({ hedef, tur, islev, secenekler });
}

function bulanikUygula() {
    const kok = bulanikKokBul();
    if (!kok || !document.body) {
        bulanikTemizle();
        return;
    }
    if (bulanikKok !== kok) bulanikTemizle();
    bulanikKok = kok;

    kok.style.setProperty('filter', 'blur(35px)', 'important');
    kok.style.setProperty('pointer-events', 'none', 'important');

    if (!bulanikKalkan || !bulanikKalkan.isConnected) {
        bulanikKalkan = bulanikKalkanOlustur();
        document.body.appendChild(bulanikKalkan);
    }
    bulanikKalkanKonumu();

    document.querySelectorAll('video').forEach(v => {
        if (v.dataset.ytfOncekiSessiz === undefined) {
            v.dataset.ytfOncekiSessiz = v.muted ? '1' : '0';
        }
        v.muted = true;
        v.style.setProperty('pointer-events', 'none', 'important');
        if (!v.paused) v.pause();
    });

    if (bulanikDinleyiciler.length === 0) {
        const konumGuncelle = () => bulanikKalkanKonumu();
        bulanikDinleyiciEkle(window, 'resize', konumGuncelle);
        bulanikDinleyiciEkle(document, 'scroll', konumGuncelle, { capture: true, passive: true });
        bulanikDinleyiciEkle(document, 'yt-navigate-finish', konumGuncelle);

        const oynatmayiDurdur = (olay) => {
            if (!bulanikKok) return;
            const v = olay.target;
            if (v && v.tagName === 'VIDEO') {
                v.muted = true;
                v.pause();
            }
        };
        bulanikDinleyiciEkle(document, 'play', oynatmayiDurdur, true);

        const tuslariEngelle = (olay) => {
            if (!bulanikKok) return;
            const hedef = olay.target;
            if (hedef && (hedef.isContentEditable ||
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(String(hedef.tagName || '').toUpperCase()))) return;
            const tuslar = [' ', 'k', 'K', 'j', 'J', 'l', 'L', 'f', 'F', 'm', 'M',
                'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (tuslar.includes(olay.key)) {
                olay.preventDefault();
                olay.stopPropagation();
            }
        };
        bulanikDinleyiciEkle(document, 'keydown', tuslariEngelle, true);

        if (typeof ResizeObserver === 'function') {
            bulanikResizeObserver = new ResizeObserver(konumGuncelle);
            bulanikResizeObserver.observe(kok);
        }
    }
}

function bulanikTemizle() {
    if (bulanikKalkan) {
        bulanikKalkan.remove();
        bulanikKalkan = null;
    }
    if (bulanikKok) {
        bulanikKok.style.removeProperty('filter');
        bulanikKok.style.removeProperty('pointer-events');
        bulanikKok = null;
    }
    // 2.0.0 embed yolu body'yi filtreliyordu; yükseltmeden kalan izi temizle.
    if (document.body) document.body.style.removeProperty('filter');

    if (bulanikResizeObserver) {
        bulanikResizeObserver.disconnect();
        bulanikResizeObserver = null;
    }
    (bulanikDinleyiciler || []).forEach(({ hedef, tur, islev, secenekler }) => {
        hedef.removeEventListener(tur, islev, secenekler);
    });
    bulanikDinleyiciler = [];

    document.querySelectorAll('video').forEach(v => {
        if (v.dataset.ytfOncekiSessiz !== undefined) {
            v.muted = v.dataset.ytfOncekiSessiz === '1';
            delete v.dataset.ytfOncekiSessiz;
        }
        v.style.removeProperty('pointer-events');
    });
}

// Kanal sayfası (/@handle, /channel/UC...): engelliyse tam sayfa banner.
function kanalSayfasiniKontrolEt() {
    bulanikTemizle();
    const yol = window.location.pathname;
    const hm = yol.match(/^\/(@[a-zA-Z0-9._-]+)/);
    const im = yol.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})/);
    const handle = hm ? hm[1] : null;
    const kanalId = im ? im[1] : null;
    if (!handle && !kanalId) { engelBanneriniKaldir(); return; }

    const sonuc = icerikKarari(null, handle, kanalId);
    kararGunlugu('kanal', { handle, kanalId }, sonuc);
    if (sonuc.karar === 'engelle') {
        document.querySelectorAll('video').forEach(v => { if (!v.paused) v.pause(); }); // kanal vitrini videosu sesi kesilsin
        engelBanneriniGoster(sonuc, handle || kanalId, 'kanal');
    } else {
        engelBanneriniKaldir();
    }
}

// Oynatılan, Tıklanan ve Dış Sitedeki (Google) Embed Videoları için Kontrolcü
function checkWatchPage() {
    if (!motorHazir) return;
    const url = new URL(window.location.href);
    let videoId = null;
    let isEmbed = false;

    if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v');
    } else if (url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.split('/')[2];
        if (videoId && videoId.includes('?')) videoId = videoId.split('?')[0];
        isEmbed = true;
    } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.split('/')[2];
    }

    // İzleme sayfası değilse: kanal sayfası mı diye bak (değilse banner'ı kaldırır)
    if (!videoId) {
        bulanikTemizle();
        kanalSayfasiniKontrolEt();
        return;
    }

    let channelHandle = null;
    if (!isEmbed) channelHandle = izlemeSayfasiKanali(videoId);

    const sonuc = icerikKarari(videoId, channelHandle, null);
    kararGunlugu('video', { videoId, channelHandle }, sonuc);

    const ytdPlayer = document.querySelector('#ytd-player');
    const embedPlayer = document.querySelector('#player');
    const html5Player = document.querySelector('.html5-video-player');
    const videoElements = document.querySelectorAll('video');

    const eylem = sonuc.engelEylemi;
    let isBlocked = (sonuc.karar === 'engelle' && (eylem === 'kaldir' || eylem === 'uyari'));
    let isBlurred = (sonuc.karar === 'engelle' && eylem === 'bulaniklastir');

    // Shorts Videolar Gizliyse, URL'den Direkt Girmeyi De Kesin Engelle
    let shortsZorla = false;
    if (url.pathname.startsWith('/shorts/') && hafiza.ayarlar?.shortsGizle) {
        isBlocked = true;
        shortsZorla = true;
    }

    if (isBlocked) {
        bulanikTemizle();
        // Oynatıcıyı gizle
        if (ytdPlayer) ytdPlayer.style.setProperty('display', 'none', 'important');
        if (embedPlayer) embedPlayer.style.setProperty('display', 'none', 'important');
        if (html5Player) html5Player.style.setProperty('display', 'none', 'important');
        if (isEmbed) document.body.style.setProperty('display', 'none', 'important');
        videoElements.forEach(v => {
            v.style.setProperty('display', 'none', 'important');
            if (!v.paused) v.pause();
            if (v.src) v.removeAttribute('src');
        });
        // PR 6: Tam sayfa engel banner'ı göster (embed'de değil)
        if (!isEmbed) {
            if (shortsZorla) engelBanneriniGoster({ sebepler: [{ tur: 'shorts' }] }, videoId, 'video', false);
            else engelBanneriniGoster(sonuc, videoId, 'video');
        }
    } else if (isBlurred) {
        engelBanneriniKaldir();
        bulanikUygula();
    } else {
        engelBanneriniKaldir();
        bulanikTemizle();
        if (ytdPlayer) { ytdPlayer.style.removeProperty('display'); ytdPlayer.style.removeProperty('filter'); }
        if (embedPlayer) { embedPlayer.style.removeProperty('display'); embedPlayer.style.removeProperty('filter'); }
        if (html5Player) { html5Player.style.removeProperty('display'); html5Player.style.removeProperty('filter'); }
        if (isEmbed) { document.body.style.removeProperty('display'); document.body.style.removeProperty('filter'); }
        videoElements.forEach(v => { v.style.removeProperty('display'); });
    }
}


function etiketRengiUret(metin) {
    let hash = 0;
    for (let i = 0; i < metin.length; i++) {
        hash = metin.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return {
        bg: `hsl(${hue}, 65%, 45%)`,
        border: `hsl(${hue}, 70%, 35%)`
    };
}

function findAllLinks(root) {
    if (!root) return [];
    let links = Array.from(root.querySelectorAll('a[href]'));
    const walkers = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walkers.nextNode();
    while (node) {
        if (node.shadowRoot) links = links.concat(findAllLinks(node.shadowRoot));
        node = walkers.nextNode();
    }
    return links;
}

function extractVideoId(element) {
    if (!element) return null;
    const exposedId = element.getAttribute('data-yt-exposed-id');
    if (exposedId && exposedId.length === 11) return exposedId;
    const propertyPaths = ['data.videoId', 'dataModel.videoId', 'jvmModel.videoId', 'data.contentId', 'data.videoRenderer.videoId'];
    for (const path of propertyPaths) {
        let val = element;
        for (const segment of path.split('.')) val = val ? val[segment] : null;
        if (typeof val === 'string' && val.length === 11) return val;
    }
    const links = findAllLinks(element);
    for (const link of links) {
        const href = link.getAttribute('href') || link.href;
        if (!href) continue;
        const watchMatch = href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (watchMatch && watchMatch[1]) return watchMatch[1];
        const shortsMatch = href.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
        if (shortsMatch && shortsMatch[1]) return shortsMatch[1];
    }
    return null;
}

function extractChannelHandle(element) {
    if (!element) return null;
    const exposedChannel = element.getAttribute('data-yt-exposed-channel');
    if (exposedChannel) return exposedChannel;
    
    const links = findAllLinks(element);
    for (const link of links) {
        const href = (link.getAttribute('href') || link.href || "");
        if (!href) continue;
        const handleMatch = href.match(/\/(@[a-zA-Z0-9._-]+)/);
        if (handleMatch && handleMatch[1]) return handleMatch[1];
    }
    return guncelKanalBaglami();
}

function applyFilter(element, videoId, channelHandle) {
    const channelId = element.getAttribute('data-yt-exposed-channel-id');
    const sonuc = icerikKarari(videoId, channelHandle, channelId);

    if (sonuc.karar === 'engelle') {
        if (sonuc.engelEylemi === 'bulaniklastir') {
            element.dataset.ytFilterBlur = "true";
        } else if (sonuc.engelEylemi === 'uyari') {
            uyariKapagiEkle(element, sonuc);
            return; // kapak sebebi zaten yazıyor; ayrıca rozet gösterilmez
        } else {
            element.classList.add('yt-filter-hidden');
        }
    }

    const rozet = YTF.rozetBilgisi(sonuc, ayarMotor || YTF.varsayilanAyar());
    if (rozet) addBadge(element, rozet);
}

// "Üstünü uyarı sayfasıyla kapat": kartın üzerine sebebi yazan opak bir kapak çizer (tıklamayı da engeller).
function uyariKapagiEkle(element, sonuc) {
    if (element.querySelector('.ytf-uyari-kapak')) return;
    const kapak = document.createElement('div');
    kapak.className = 'ytf-uyari-kapak';
    const baslik = document.createElement('div');
    baslik.className = 'ytf-uyari-baslik';
    baslik.textContent = '🚫 Engellendi';
    const sebep = document.createElement('div');
    sebep.className = 'ytf-uyari-sebep';
    sebep.textContent = (sonuc.sebepler || []).map(sebepiMetne).filter(Boolean).slice(0, 2).join(' · ');
    kapak.append(baslik, sebep);
    kapak.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); }, true);
    element.style.setProperty('position', 'relative', 'important');
    element.appendChild(kapak);
}

// rozet: { metin, sinif } ya da { metin, renkAnahtari } (özel listeler için metinden türetilen renk)
function addBadge(element, rozet) {
    if (element.querySelector('.yt-filter-badge-container')) return;
    const container = document.createElement('div');
    container.className = 'yt-filter-badge-container';

    const badge = document.createElement('span');
    badge.textContent = rozet.metin.toLocaleUpperCase('tr-TR');

    if (rozet.sinif) {
        badge.className = `yt-filter-badge yt-filter-badge-${rozet.sinif}`;
    } else {
        const renkler = etiketRengiUret(rozet.renkAnahtari || rozet.metin);
        badge.className = 'yt-filter-badge';
        badge.style.backgroundColor = renkler.bg;
        badge.style.border = `1px solid ${renkler.border}`;
    }

    container.appendChild(badge);

    element.style.setProperty('position', 'relative', 'important');
    element.appendChild(container);
}

const videoSelectors = ['ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-compact-video-renderer', 'ytd-reel-item-renderer', 'ytd-lockup-view-model', 'ytd-rich-grid-media', 'ytd-grid-video-renderer'].join(', ');

const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
        if (mutation.type === 'attributes') {
            // Yardımcı betik geri dönüştürülen bir kartın video/kanal bilgisini güncelledi: kartı yeniden değerlendir.
            const hedef = mutation.target;
            if (hedef && hedef.matches && hedef.matches(videoSelectors)) processVideo(hedef);
        } else if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    const videos = node.querySelectorAll(videoSelectors);
                    videos.forEach(processVideo);
                    if (node.matches && node.matches(videoSelectors)) processVideo(node);
                }
            });
        }
    }
});

async function processVideo(element) {
    if (!motorHazir) return;
    const currentVideoId = extractVideoId(element);
    const currentChannelHandle = extractChannelHandle(element);
    const currentChannelId = element.getAttribute('data-yt-exposed-channel-id');
    if (!currentVideoId && !currentChannelHandle && !currentChannelId) return;

    const kanalAnahtari = (currentChannelHandle || "") + "|" + (currentChannelId || "");
    const lastVideoId = element.dataset.ytFilterLastId;
    const lastChannelKey = element.dataset.ytFilterLastChannelId;
    
    if (currentVideoId !== lastVideoId || kanalAnahtari !== lastChannelKey) {
        resetElement(element);
        element.dataset.ytFilterLastId = currentVideoId || "";
        element.dataset.ytFilterLastChannelId = kanalAnahtari;
        finishProcessing(element, currentVideoId, currentChannelHandle);
    } else if (!element.dataset.ytFilterProcessed) {
        finishProcessing(element, currentVideoId, currentChannelHandle);
    }
}

function resetElement(element) {
    delete element.dataset.ytFilterProcessed;
    delete element.dataset.ytFilterBlur;
    delete element.dataset.ytFilterLastId;
    delete element.dataset.ytFilterLastChannelId;
    element.classList.remove('yt-filter-hidden');
    const badge = element.querySelector('.yt-filter-badge-container');
    if (badge) badge.remove();
    const kapak = element.querySelector('.ytf-uyari-kapak');
    if (kapak) kapak.remove();
}

function finishProcessing(element, videoId, channelHandle) {
    element.dataset.ytFilterProcessed = "true";
    applyFilter(element, videoId, channelHandle);
}

async function init() {
    await loadData();
    document.querySelectorAll(videoSelectors).forEach(processVideo);
    checkWatchPage();
    if (document.body) observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-yt-exposed-id', 'data-yt-exposed-channel', 'data-yt-exposed-channel-id'] });
}

let lastUrl = location.href;
let sonSayfaKontrolu = 0;
let sayfaKontrolZamanlayici = null;

// YouTube tek sayfa uygulaması; olaylar art arda gelebilir. En fazla 200 ms'de bir
// kontrol et, kaçan durum varsa kuyruğa al. 1 sn'lik yoklama yerine olay + 5 sn yedek.
function sayfaGuncelle() {
    const kalan = 200 - (Date.now() - sonSayfaKontrolu);
    if (kalan > 0) {
        if (!sayfaKontrolZamanlayici) {
            sayfaKontrolZamanlayici = setTimeout(() => {
                sayfaKontrolZamanlayici = null;
                sayfaGuncelle();
            }, kalan);
        }
        return;
    }
    sonSayfaKontrolu = Date.now();
    checkWatchPage();
    hizliRayCiz();
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        document.querySelectorAll(videoSelectors).forEach(el => resetElement(el));
        setTimeout(() => document.querySelectorAll(videoSelectors).forEach(processVideo), 1000);
    }
}

document.addEventListener('yt-navigate-finish', sayfaGuncelle);
document.addEventListener('yt-page-data-updated', sayfaGuncelle);
window.addEventListener('popstate', sayfaGuncelle);
setInterval(sayfaGuncelle, 5000);

const storageObj = (typeof browser !== 'undefined' && browser.storage) ? browser.storage : chrome.storage;
if (storageObj && storageObj.onChanged) {
    storageObj.onChanged.addListener((degisim) => {
        const anahtarlar = Object.keys(degisim || {});
        const sadecePin = anahtarlar.length > 0 && anahtarlar.every(k => PIN_DEGISIM_ANAHTARLARI.includes(k));
        if (sadecePin) {
            anahtarlar.forEach(k => {
                const yeni = degisim[k] ? degisim[k].newValue : undefined;
                if (yeni === undefined) delete hafiza[k];
                else hafiza[k] = yeni;
            });
            // Oturum başka sekmede kapandıysa açık PIN penceresi boşa beklemesin.
            if (degisim.pinKilitBitis && !YTF.kilitAcik(hafiza, Date.now())) pinPenceresiIptalEt();
            return;
        }

        document.querySelectorAll(videoSelectors).forEach(el => { if (el.dataset.ytFilterProcessed) resetElement(el); });
        loadData().then(() => {
            document.querySelectorAll(videoSelectors).forEach(processVideo);
            checkWatchPage();
            hizliRayCiz();
        });
    });
}

if (window === window.top && browserAPI.runtime && browserAPI.runtime.onMessage) {
    browserAPI.runtime.onMessage.addListener((mesaj, _gonderen, sendResponse) => {
        if (!mesaj || mesaj.tur !== 'sayfaDurumu') return;
        sendResponse(sayfaDurumuAl());
        return true;
    });
}

init();
