/**
 * YouTube Filtreleyici - Content Script
 * Hem Chromium hem de Firefox ile %100 uyumlu içerik denetleyici.
 */

const browserAPI = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

let hafiza = {};
let currentChannelContext = null;
let stilElemani = document.createElement('style');
document.head.appendChild(stilElemani);

function ensureHelperInjected() {
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

async function loadData() {
    try {
        const storageData = await getStorageData(null);
        hafiza = storageData || {};
        arayuzAyarlariniUygula();
    } catch (e) {
        console.error("Veri yükleme hatası", e);
    }
}

function arayuzAyarlariniUygula() {
    let cssKurallari = `
        .yt-filter-badge-container { position: absolute !important; top: 8px !important; left: 8px !important; display: flex !important; flex-direction: column !important; gap: 4px !important; z-index: 200 !important; pointer-events: none !important; }
        .yt-filter-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        
        .yt-filter-badge-safe { background-color: #2ecc71; border: 1px solid #27ae60; }
        .yt-filter-badge-konu { background-color: #3498db; border: 1px solid #2980b9; }
        .yt-filter-badge-warning { background-color: #e74c3c; border: 1px solid #c0392b; }
        .yt-filter-badge-untagged { background-color: #7f8c8d; border: 1px solid #95a5a6; }

        /* Uyarı sayfası: içeriğin üstünü kapatan katman */
        .yt-filter-uyari { position: absolute !important; inset: 0 !important; z-index: 300 !important; display: flex !important; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 8px; text-align: center; background: rgba(15, 15, 15, 0.94); color: #fff; font-family: Roboto, Arial, sans-serif; border-radius: 12px; cursor: not-allowed; }
        .yt-filter-uyari strong { font-size: 14px; }
        .yt-filter-uyari span { font-size: 12px; opacity: 0.75; }
        .yt-filter-uyari-oynatici { border-radius: 0; }
        .yt-filter-uyari-oynatici strong { font-size: 20px; }
        
        /* Thumbnail Blur etkileri */
        [data-yt-filter-blur="true"] img,
        [data-yt-filter-blur="true"] yt-image,
        [data-yt-filter-blur="true"] ytd-video-preview,
        [data-yt-filter-blur="true"] #mouseover-overlay,
        [data-yt-filter-blur="true"] #hover-overlays,
        [data-yt-filter-blur="true"] ytd-moving-thumbnail-renderer,
        [data-yt-filter-blur="true"] #inline-preview-player { 
            filter: blur(25px) !important; 
        }
        
        .yt-filter-hidden { display: none !important; }
        ytd-thumbnail, ytd-rich-grid-media, ytd-rich-item-renderer, ytd-video-renderer { position: relative !important; }
    `;

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

// Oynatılan, Tıklanan ve Dış Sitedeki (Google) Embed Videoları için Kontrolcü
function checkWatchPage() {
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

    if (videoId) {
        let channelHandle = currentChannelContext;
        if (!isEmbed) {
            const channelLink = document.querySelector('ytd-watch-metadata #owner a[href^="/@"]');
            if (channelLink) {
                const match = channelLink.href.match(/\/(@[a-zA-Z0-9._-]+)/);
                if (match) channelHandle = match[1];
            }
        }

        const karar = motorKarari(videoId, channelHandle);

        const ytdPlayer = document.querySelector('#ytd-player');
        const embedPlayer = document.querySelector('#player');
        const html5Player = document.querySelector('.html5-video-player');
        const videoElements = document.querySelectorAll('video');

        let isBlocked = (karar.bicim === "gizle");
        let isBlurred = (karar.bicim === "bulaniklastir");
        let isWarned = (karar.bicim === "uyari");

        // Shorts Videolar Gizliyse, URL'den Direkt Girmeyi De Kesin Engelle
        if (url.pathname.startsWith('/shorts/') && hafiza.ayarlar?.shortsGizle) {
            isBlocked = true;
            isWarned = false;
        }

        const mevcutUyari = document.querySelector('.yt-filter-uyari-oynatici');
        if (mevcutUyari && !isWarned) mevcutUyari.remove();

        if (isWarned) {
            // Oynatıcının üstü uyarı katmanıyla kapatılır, video durdurulur ve susturulur
            const kapsayici = html5Player || embedPlayer || ytdPlayer;
            if (kapsayici && !kapsayici.querySelector('.yt-filter-uyari-oynatici')) {
                kapsayici.appendChild(uyariKatmaniOlustur('yt-filter-uyari yt-filter-uyari-oynatici', karar));
            }
            videoElements.forEach(v => {
                v.muted = true;
                if (!v.paused) v.pause();
            });
        } else if (isBlocked) {
            if (ytdPlayer) ytdPlayer.style.setProperty('display', 'none', 'important');
            if (embedPlayer) embedPlayer.style.setProperty('display', 'none', 'important');
            if (html5Player) html5Player.style.setProperty('display', 'none', 'important');
            
            // Eğer Google Search vb. dış bir sitede iframe içinde ise iframe gövdesini gizle
            if (isEmbed) {
                document.body.style.setProperty('display', 'none', 'important');
            }

            videoElements.forEach(v => {
                v.style.setProperty('display', 'none', 'important');
                if (!v.paused) v.pause();
                if (v.src) v.removeAttribute('src'); // Kaynağı tamamen sil (Arka planda dahi oynamaz)
            });
        } else if (isBlurred) {
            // Arka planda oynar ancak dev bir blur ile engellenir ve Sesi Susturulur
            if (ytdPlayer) ytdPlayer.style.setProperty('filter', 'blur(35px)', 'important');
            if (embedPlayer) embedPlayer.style.setProperty('filter', 'blur(35px)', 'important');
            if (html5Player) html5Player.style.setProperty('filter', 'blur(35px)', 'important');
            
            if (isEmbed) {
                document.body.style.setProperty('filter', 'blur(35px)', 'important');
            }

            videoElements.forEach(v => {
                v.muted = true; // Sesi zorunlu kapat (Mute)
            });
        } else {
            // İzin veriliyorsa kısıtlamaları kaldır
            if (ytdPlayer) {
                ytdPlayer.style.removeProperty('display');
                ytdPlayer.style.removeProperty('filter');
            }
            if (embedPlayer) {
                embedPlayer.style.removeProperty('display');
                embedPlayer.style.removeProperty('filter');
            }
            if (html5Player) {
                html5Player.style.removeProperty('display');
                html5Player.style.removeProperty('filter');
            }
            if (isEmbed) {
                document.body.style.removeProperty('display');
                document.body.style.removeProperty('filter');
            }
            videoElements.forEach(v => {
                v.style.removeProperty('display');
            });
        }
    }
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
    
    let kanalElemani = element.querySelector('.ytd-channel-name a, ytd-channel-name yt-formatted-string, #channel-name');
    if (kanalElemani) {
        let text = (kanalElemani.title || kanalElemani.innerText || kanalElemani.textContent || "").trim();
        if (text) return text;
    }

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

// Filtre motorundan karar alır; ayarlar henüz yüklenmediyse içeriğe dokunulmaz
function motorKarari(videoId, channelHandle) {
    if (!hafiza.filtre || typeof YTFiltreMotoru === 'undefined') {
        return { sonuc: 'izin', bicim: null, sebep: null, kaynak: null, kayit: null };
    }
    return YTFiltreMotoru.kararVer(
        { videoId, kanal: channelHandle },
        hafiza.veritabani,
        hafiza.filtre,
        { beyaz: hafiza.beyazListe, kara: hafiza.karaListe }
    );
}

function baslikAdi(tur, id) {
    const liste = (hafiza.veritabani && hafiza.veritabani[tur]) || [];
    const baslik = liste.find(b => b.id === id);
    return baslik ? baslik.ad : id;
}

const SEBEP_ACIKLAMALARI = {
    'kara-liste': 'Kara listede',
    'etiket': 'Engellenen etiket',
    'konu': 'Engellenen konu',
    'ana-konu': 'Engellenen ana konu',
    'bilinmeyen-konu': 'Konusu bilinmiyor',
    'bilinmeyen-etiket': 'Etiketleri bilinmiyor',
    'kararsiz-konu': 'Kararsız konu',
    'kararsiz-etiket': 'Kararsız etiket'
};

function uyariKatmaniOlustur(sinif, karar) {
    const katman = document.createElement('div');
    katman.className = sinif;
    const baslik = document.createElement('strong');
    baslik.textContent = 'Bu içerik filtrelendi';
    const aciklama = document.createElement('span');
    aciklama.textContent = SEBEP_ACIKLAMALARI[karar.sebep] || '';
    katman.append(baslik, aciklama);
    // Tıklamalar alttaki videoya ulaşmasın
    katman.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); }, true);
    return katman;
}

function applyFilter(element, videoId, channelHandle) {
    const karar = motorKarari(videoId, channelHandle);

    if (karar.bicim === "gizle") {
        element.classList.add('yt-filter-hidden');
    } else if (karar.bicim === "bulaniklastir") {
        element.dataset.ytFilterBlur = "true";
    } else if (karar.bicim === "uyari") {
        element.style.setProperty('position', 'relative', 'important');
        element.appendChild(uyariKatmaniOlustur('yt-filter-uyari', karar));
    }

    if (hafiza.filtre && hafiza.filtre.rozetGoster !== false) {
        addBadges(element, karar);
    }
}

function addBadges(element, karar) {
    if (element.querySelector('.yt-filter-badge-container')) return;
    const container = document.createElement('div');
    container.className = 'yt-filter-badge-container';

    const rozetEkle = (metin, sinif) => {
        const badge = document.createElement('span');
        badge.className = `yt-filter-badge ${sinif}`;
        badge.textContent = metin.toLocaleUpperCase('tr-TR');
        container.appendChild(badge);
    };

    const kayit = karar.kayit;
    if (kayit && kayit.anaKonu) {
        rozetEkle(baslikAdi('konular', kayit.anaKonu), 'yt-filter-badge-konu');
    } else if (karar.sebep !== 'beyaz-liste' && karar.sebep !== 'kara-liste') {
        rozetEkle('Bilinmeyen', 'yt-filter-badge-untagged');
    }
    if (kayit) {
        kayit.etiketler.forEach(id => rozetEkle(baslikAdi('etiketler', id), 'yt-filter-badge-warning'));
    }
    if (karar.sebep === 'beyaz-liste') rozetEkle('Beyaz liste', 'yt-filter-badge-safe');
    if (karar.sebep === 'kara-liste') rozetEkle('Kara liste', 'yt-filter-badge-warning');

    if (!container.childElementCount) return;
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
    const currentVideoId = extractVideoId(element);
    const currentChannelHandle = extractChannelHandle(element);
    if (!currentVideoId && !currentChannelHandle) return;
    
    const lastVideoId = element.dataset.ytFilterLastId;
    const lastChannelId = element.dataset.ytFilterLastChannelId;
    
    if (currentVideoId !== lastVideoId || currentChannelHandle !== lastChannelId) {
        resetElement(element);
        element.dataset.ytFilterLastId = currentVideoId || "";
        element.dataset.ytFilterLastChannelId = currentChannelHandle || "";
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
    element.querySelectorAll(':scope > .yt-filter-uyari').forEach(katman => katman.remove());
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
        document.querySelectorAll('[data-yt-filter-processed="true"]').forEach(el => resetElement(el));
        loadData().then(() => {
            document.querySelectorAll(videoSelectors).forEach(processVideo);
            checkWatchPage();
        });
    });
}

init();
