/**
 * YouTube Filtreleyici - Content Script
 * Hem Chromium hem de Firefox ile %100 uyumlu içerik denetleyici.
 */

const browserAPI = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

let hafiza = {};
let ayarMotor = null;      // çözümlenmiş ayar (core/engine.js)
let veriTabani = null;     // indekslenmiş veritabanı (core/db.js)
let paketliDbSozu = null;  // paketle gelen db.json, sayfa başına bir kez okunur
let currentChannelContext = null;
let motorHazir = false;     // loadData bitmeden karar verilmez (varsayılan ayarla geçici engel/banner çıkmasın)
let sonKararAnahtari = '';  // tanılama günlüğü yalnızca karar değişince yazılsın
let stilElemani = document.createElement('style');
document.head.appendChild(stilElemani);

function ensureHelperInjected() {
    if (window !== window.top) return; // iframe/embed'de gerekmez; orada chrome-extension:// yüklemesi hata verir
    if (!document.querySelector('script[data-yt-filter-helper]')) {
        try {
            const script = document.createElement('script');
            script.src = browserAPI.runtime.getURL('inject_helper.js');
            script.setAttribute('data-yt-filter-helper', 'true');
            script.onload = () => script.remove();
            (document.head || document.documentElement).appendChild(script);
        } catch (e) {
            // Manifest MAIN world üzerinden zaten yüklendiyse veya CSP izin vermiyorsa yakala
        }
    }
}

function updateChannelContext() {
    const url = window.location.href;
    const handleMatch = url.match(/\/(@[a-zA-Z0-9._-]+)/);
    if (handleMatch && handleMatch[1]) {
        currentChannelContext = handleMatch[1];
    } else {
        currentChannelContext = null;
    }
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
    if (!sebep) return '';
    const nerede = sebep.kaynak === 'video' ? ' (video)' : sebep.kaynak === 'kanal' ? ' (kanal)' : '';
    const ad = (liste, id) => { const x = (liste || []).find(o => o.id === id); return x ? x.ad : id; };
    switch (sebep.tur) {
        case 'liste':
            if (sebep.liste === 'beyaz') return `Beyaz listede${nerede}`;
            if (sebep.liste === 'kara') return `Kara listede${nerede}`;
            return `"${sebep.liste}" listesinde${nerede}`;
        case 'etiketlenmemis': return 'Etiketlenmemiş içerik (veritabanında kaydı yok)';
        case 'etiket': return `Etiket: ${ad(YTF.ETIKETLER, sebep.id)}${nerede}`;
        case 'konu': return `Engelli konu: ${ad(YTF.KONULAR, sebep.id)}${nerede}`;
        case 'kararsiz-etiket': return `Etiket (kararsız): ${ad(YTF.ETIKETLER, sebep.id)}${nerede}`;
        case 'kararsiz-konu': return `Engelli konu (kararsız): ${ad(YTF.KONULAR, sebep.id)}${nerede}`;
        case 'izinli-konu-yok': return 'İzinli konu yok';
        case 'shorts': return 'Shorts gizleme ayarı açık';
        default: return sebep.tur || '';
    }
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
            const a = YTF.ayarCoz((await getStorageData(null)) || {});
            delete a.listeler.kara[k];
            (a.listeler.ozel || []).forEach(l => { delete l.uyeler[k]; });
            a.listeler.beyaz[k] = true;
            await setStorageData({ surum: 2, ayar: a });
            engelBanneriniKaldir();
            await loadData();
            checkWatchPage();
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

// Kanal sayfası (/@handle, /channel/UC...): engelliyse tam sayfa banner.
function kanalSayfasiniKontrolEt() {
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
        kanalSayfasiniKontrolEt();
        return;
    }

    let channelHandle = currentChannelContext;
    if (!isEmbed) {
        const channelLink = document.querySelector('ytd-watch-metadata #owner a[href^="/@"]');
        if (channelLink) {
            const match = channelLink.href.match(/\/(@[a-zA-Z0-9._-]+)/);
            if (match) channelHandle = match[1];
        }
    }

    const sonuc = icerikKarari(videoId, channelHandle, null);
    kararGunlugu('video', { videoId, channelHandle }, sonuc);

    const ytdPlayer = document.querySelector('#ytd-player');
    const embedPlayer = document.querySelector('#player');
    const html5Player = document.querySelector('.html5-video-player');
    const videoElements = document.querySelectorAll('video');

    let isBlocked = (sonuc.karar === 'engelle' && sonuc.engelEylemi !== 'bulaniklastir');
    let isBlurred = (sonuc.karar === 'engelle' && sonuc.engelEylemi === 'bulaniklastir');

    // Shorts Videolar Gizliyse, URL'den Direkt Girmeyi De Kesin Engelle
    let shortsZorla = false;
    if (url.pathname.startsWith('/shorts/') && hafiza.ayarlar?.shortsGizle) {
        isBlocked = true;
        shortsZorla = true;
    }

    if (isBlocked) {
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
        if (ytdPlayer) ytdPlayer.style.setProperty('filter', 'blur(35px)', 'important');
        if (embedPlayer) embedPlayer.style.setProperty('filter', 'blur(35px)', 'important');
        if (html5Player) html5Player.style.setProperty('filter', 'blur(35px)', 'important');
        if (isEmbed) document.body.style.setProperty('filter', 'blur(35px)', 'important');
        videoElements.forEach(v => { v.muted = true; });
    } else {
        engelBanneriniKaldir();
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
    if (currentChannelContext) return currentChannelContext;
    return null;
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
        if (mutation.type === 'childList') {
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
    ensureHelperInjected();
    updateChannelContext();
    await loadData();
    document.querySelectorAll(videoSelectors).forEach(processVideo);
    checkWatchPage();
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
}

let lastUrl = location.href;
setInterval(() => {
    checkWatchPage();
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        updateChannelContext();
        document.querySelectorAll(videoSelectors).forEach(el => resetElement(el));
        setTimeout(() => document.querySelectorAll(videoSelectors).forEach(processVideo), 1000);
    }
}, 1000);

const storageObj = (typeof browser !== 'undefined' && browser.storage) ? browser.storage : chrome.storage;
if (storageObj && storageObj.onChanged) {
    storageObj.onChanged.addListener(() => {
        document.querySelectorAll(videoSelectors).forEach(el => { if (el.dataset.ytFilterProcessed) resetElement(el); });
        loadData().then(() => {
            document.querySelectorAll(videoSelectors).forEach(processVideo);
            checkWatchPage();
        });
    });
}

init();
