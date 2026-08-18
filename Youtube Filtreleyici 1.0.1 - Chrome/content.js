let hafiza = {};
let currentChannelContext = null;
let stilElemani = document.createElement('style');
document.head.appendChild(stilElemani);

function updateChannelContext() {
    const url = window.location.href;
    const handleMatch = url.match(/\/(@[a-zA-Z0-9._-]+)/);
    if (handleMatch && handleMatch[1]) {
        currentChannelContext = handleMatch[1];
    } else {
        currentChannelContext = null;
    }
}

async function loadData() {
    try {
        const storageData = await chrome.storage.local.get(null);
        hafiza = storageData;
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
        .yt-filter-badge-educational { background-color: #3498db; border: 1px solid #2980b9; }
        .yt-filter-badge-warning { background-color: #e74c3c; border: 1px solid #c0392b; }
        .yt-filter-badge-profanity { background-color: #e67e22; border: 1px solid #d35400; }
        .yt-filter-badge-untagged { background-color: #7f8c8d; border: 1px solid #95a5a6; }
        
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

        let etiketTuru = "untagged";
        let safeVideoId = videoId.toLowerCase();
        let safeChannelHandle = channelHandle ? channelHandle.toLowerCase() : "";
        
        if (hafiza.customMapping) {
            if (safeVideoId && hafiza.customMapping[safeVideoId]) {
                etiketTuru = hafiza.customMapping[safeVideoId];
            } else if (safeChannelHandle && hafiza.customMapping[safeChannelHandle]) {
                etiketTuru = hafiza.customMapping[safeChannelHandle];
            }
        }

        const pref = (hafiza.preferences && hafiza.preferences[etiketTuru]) 
            ? hafiza.preferences[etiketTuru] 
            : { visibility: "Show Badge", enforcement: "Remove Video Entirely" };

        const ytdPlayer = document.querySelector('#ytd-player');
        const embedPlayer = document.querySelector('#player');
        const html5Player = document.querySelector('.html5-video-player');
        const videoElements = document.querySelectorAll('video');
        
        let isBlocked = (pref.enforcement === "Remove Video Entirely");
        let isBlurred = (pref.enforcement === "Blur Thumbnail");

        // Shorts Videolar Gizliyse, URL'den Direkt Girmeyi De Kesin Engelle
        if (url.pathname.startsWith('/shorts/') && hafiza.ayarlar?.shortsGizle) {
            isBlocked = true;
        }

        if (isBlocked) {
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

function applyFilter(element, videoId, channelHandle) {
    let etiketTuru = "untagged";

    if (hafiza.customMapping) {
        let safeVideoId = videoId ? videoId.toLowerCase() : "";
        let safeChannelHandle = channelHandle ? channelHandle.toLowerCase() : "";
        
        if (safeVideoId && hafiza.customMapping[safeVideoId]) {
            etiketTuru = hafiza.customMapping[safeVideoId];
        } else if (safeChannelHandle && hafiza.customMapping[safeChannelHandle]) {
            etiketTuru = hafiza.customMapping[safeChannelHandle];
        }
    }

    const pref = (hafiza.preferences && hafiza.preferences[etiketTuru]) 
        ? hafiza.preferences[etiketTuru] 
        : { visibility: "Show Badge", enforcement: "Remove Video Entirely" };

    if (pref.enforcement === "Remove Video Entirely") {
        element.classList.add('yt-filter-hidden');
    } else if (pref.enforcement === "Blur Thumbnail") {
        element.dataset.ytFilterBlur = "true";
    }

    if (pref.visibility === "Show Badge") {
        addBadge(element, etiketTuru);
    }
}

function addBadge(element, tag) {
    if (element.querySelector('.yt-filter-badge-container')) return;
    const container = document.createElement('div');
    container.className = 'yt-filter-badge-container';
    
    const badge = document.createElement('span');
    const isCore = ["profanity", "violence", "educational", "safe", "untagged"].includes(tag);
    const tagLabels = { "profanity": "Küfür/Argo", "violence": "Şiddet", "educational": "Eğitici", "safe": "Güvenli", "untagged": "Etiketlenmemiş" };
    
    let etiketAdi = tag;
    if (isCore) {
        etiketAdi = tagLabels[tag];
    } else {
        etiketAdi = (hafiza.preferences && hafiza.preferences[tag] && hafiza.preferences[tag].adi) 
            ? hafiza.preferences[tag].adi 
            : tag;
    }

    badge.textContent = etiketAdi.toLocaleUpperCase('tr-TR');
    
    if (isCore) {
        let typeClass = 'yt-filter-badge-untagged';
        if (tag === 'safe') typeClass = 'yt-filter-badge-safe';
        else if (tag === 'educational') typeClass = 'yt-filter-badge-educational';
        else if (tag === 'violence') typeClass = 'yt-filter-badge-warning';
        else if (tag === 'profanity') typeClass = 'yt-filter-badge-profanity';
        
        badge.className = `yt-filter-badge ${typeClass}`;
    } else {
        const renkler = etiketRengiUret(tag);
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
}

function finishProcessing(element, videoId, channelHandle) {
    element.dataset.ytFilterProcessed = "true";
    applyFilter(element, videoId, channelHandle);
}

async function init() {
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

chrome.storage.onChanged.addListener(() => {
    document.querySelectorAll('[data-yt-filter-processed="true"]').forEach(el => resetElement(el));
    loadData().then(() => {
        document.querySelectorAll(videoSelectors).forEach(processVideo);
        checkWatchPage();
    });
});

init();