/**
 * YT Filter Content Script
 * YouTube videolarını algılar, veritabanı ile eşleştirir ve filtreler.
 */

// Global Ayarlar (Storage'dan gelecek)
let userPreferences = {
    "profanity": { visibility: "Show Badge", enforcement: "Blur Thumbnail" },
    "violence": { visibility: "Show Badge", enforcement: "Remove Video Entirely" },
    "safe": { visibility: "Show Badge", enforcement: "Allow Video" },
    "educational": { visibility: "Show Badge", enforcement: "Allow Video" },
    "untagged": { visibility: "Show Badge", enforcement: "Allow Video" }
};

// Admin Mapping (Dahili JSON - Gelecekte API olabilir)
let videoMapping = {};

// Channel Context: Eğer bir kanal sayfasındaysak (/@handle), bu kanalın handle'ını tutar.
let currentChannelContext = null;

/**
 * URL'den kanal handle'ını ayıkla
 */
function updateChannelContext() {
    const url = window.location.href;
    const handleMatch = url.match(/\/(@[a-zA-Z0-9._-]+)/);
    if (handleMatch && handleMatch[1]) {
        currentChannelContext = handleMatch[1];
        console.log("YT Filter: Current Channel Context:", currentChannelContext);
    } else {
        currentChannelContext = null;
    }
}

// Veritabanını yükle (Önce Storage, yoksa JSON, sonra birleştir)
async function loadMapping() {
    try {
        const response = await fetch(chrome.runtime.getURL('mapping.json'));
        const defaultMapping = await response.json();

        let storageData;
        if (typeof browser !== 'undefined' && browser.storage) {
            storageData = await browser.storage.local.get("mapping");
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
            storageData = await new Promise(r => chrome.storage.local.get("mapping", r));
        }

        videoMapping = { ...defaultMapping, ...(storageData?.mapping || {}) };

        if (!storageData?.mapping || Object.keys(defaultMapping).some(key => !storageData.mapping[key])) {
            chrome.storage.local.set({ "mapping": videoMapping });
        }

        console.log("YT Filter: Mapping loaded and merged", videoMapping);
    } catch (e) {
        console.error("YT Filter: Mapping load failed", e);
    }
}

// Kullanıcı tercihlerini yükle
async function loadPreferences() {
    try {
        if (typeof browser !== 'undefined' && browser.storage) {
            const data = await browser.storage.local.get("preferences");
            if (data.preferences) userPreferences = data.preferences;
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
            const data = await new Promise(r => chrome.storage.local.get("preferences", r));
            if (data.preferences) userPreferences = data.preferences;
        }
    } catch (e) {
        console.warn("YT Filter: Preferences load failed, using defaults", e);
    }
}

/**
 * Deep search for links including Shadow DOM
 */
function findAllLinks(root) {
    if (!root) return [];
    let links = Array.from(root.querySelectorAll('a[href]'));

    const walkers = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walkers.nextNode();
    while (node) {
        if (node.shadowRoot) {
            links = links.concat(findAllLinks(node.shadowRoot));
        }
        node = walkers.nextNode();
    }
    return links;
}

/**
 * The Extractor: Video ID ayıkla
 */
function extractVideoId(element) {
    if (!element) return null;

    // 0. Check for MAIN world exposed ID
    const exposedId = element.getAttribute('data-yt-exposed-id');
    if (exposedId && exposedId.length === 11) return exposedId;

    // 1. Element-level property check
    const propertyPaths = [
        'data.videoId',
        'dataModel.videoId',
        'jvmModel.videoId',
        'data.contentId',
        'data.videoRenderer.videoId'
    ];

    for (const path of propertyPaths) {
        let val = element;
        for (const segment of path.split('.')) {
            val = val ? val[segment] : null;
        }
        if (typeof val === 'string' && val.length === 11) return val;
    }

    // 2. Link scanning (Most robust for Search & Shorts)
    const links = findAllLinks(element);
    for (const link of links) {
        const href = link.getAttribute('href') || link.href;
        if (!href) continue;

        const watchMatch = href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (watchMatch && watchMatch[1]) return watchMatch[1];

        const shortsMatch = href.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
        if (shortsMatch && shortsMatch[1]) return shortsMatch[1];
    }

    // 3. Thumbnail Image check
    const thumbImg = element.querySelector('img[src*="/vi/"], img[src*="ytimg.com/"]');
    if (thumbImg) {
        const patterns = [
            /\/vi\/([a-zA-Z0-9_-]{11})\//,
            /\/([a-zA-Z0-9_-]{11})\/(?:hq|mq|sd|maxres)default/
        ];

        for (const pattern of patterns) {
            const match = thumbImg.src.match(pattern);
            if (match && match[1]) return match[1];
        }
    }

    return null;
}

/**
 * Channel Handle/ID ayıkla
 */
function extractChannelHandle(element) {
    if (!element) return null;

    // 0. Check for MAIN world exposed Channel
    const exposedChannel = element.getAttribute('data-yt-exposed-channel');
    if (exposedChannel) return exposedChannel;

    // 1. Link pattern check
    const links = findAllLinks(element);
    for (const link of links) {
        const href = (link.getAttribute('href') || link.href || "");
        if (!href) continue;

        const handleMatch = href.match(/\/(@[a-zA-Z0-9._-]+)/);
        if (handleMatch && handleMatch[1]) return handleMatch[1];

        const channelMatch = href.match(/\/(?:user|channel)\/([a-zA-Z0-9._-]+)/);
        if (channelMatch && channelMatch[1]) return channelMatch[1];
    }

    // 2. Element specific check
    const channelLink = element.querySelector('a[href*="/@"], a[href*="/user/"], a[href*="/channel/"]');
    if (channelLink) {
        const href = channelLink.getAttribute('href');
        const handleMatch = href.match(/\/(@[a-zA-Z0-9._-]+)/);
        if (handleMatch) return handleMatch[1];
    }

    // 3. Context Fallback: Eğer bir kanal sayfasındaysak ve listedeki bir videosak
    // (ve başka bir kanal linki bulamadıysak), bu kanalın videosu olduğumuzu varsayabiliriz.
    if (currentChannelContext) {
        // Ancak bu varsayımı sadece kanalın kendi içerik alanındaysak yapmalıyız.
        // YouTube genellikle kanal sayfasında videoları ytd-rich-grid-media veya ytd-video-renderer içinde gösterir.
        return currentChannelContext;
    }

    return null;
}

/**
 * Data Provider: Video veya Kanal etiketlerini getir
 */
function getTagData(videoId, channelHandle) {
    let tags = [];

    if (videoId && videoMapping[videoId]) {
        tags = videoMapping[videoId];
    } else if (channelHandle) {
        const handleMatch = channelHandle.startsWith('@') ? channelHandle : `@${channelHandle}`;
        const handleLower = handleMatch.toLowerCase();

        const matchingKey = Object.keys(videoMapping).find(key => key.toLowerCase() === handleLower);
        if (matchingKey) {
            tags = videoMapping[matchingKey];
            console.log(`YT Filter: Matched channel ${handleMatch} to tags:`, tags);
        }
    }

    return tags.length > 0 ? tags : ['untagged'];
}

/**
 * UI Injection & Filtering
 */
function applyFilter(element, tags) {
    if (!tags || tags.length === 0) return;

    const primaryTag = tags[0];
    const pref = userPreferences[primaryTag] || { visibility: "Show Badge", enforcement: "Allow Video" };

    if (pref.enforcement === "Remove Video Entirely") {
        element.classList.add('yt-filter-hidden');
        return;
    } else if (pref.enforcement === "Blur Thumbnail") {
        element.dataset.ytFilterBlur = "true";
    }

    if (pref.visibility === "Show Badge") {
        addBadge(element, tags);
    }
}

function addBadge(element, tags) {
    if (element.querySelector('.yt-filter-badge-container')) return;

    const container = document.createElement('div');
    container.className = 'yt-filter-badge-container';
    container.style.zIndex = "200";
    container.style.pointerEvents = "auto";

    tags.forEach(tag => {
        const badge = document.createElement('span');
        badge.textContent = tag === 'untagged' ? 'ETİKETLENMEMİŞ' : tag.toUpperCase();

        let typeClass = 'yt-filter-badge-neutral';
        if (tag === 'safe' || tag === 'educational') typeClass = 'yt-filter-badge-safe';
        if (tag === 'violence' || tag === 'profanity') typeClass = 'yt-filter-badge-warning';
        if (tag === 'untagged') typeClass = 'yt-filter-badge-untagged';

        badge.className = `yt-filter-badge ${typeClass}`;
        container.appendChild(badge);
    });

    element.style.setProperty('position', 'relative', 'important');
    element.appendChild(container);
}

/**
 * The Watcher: MutationObserver
 */
const videoSelectors = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-reel-item-renderer',
    'ytd-lockup-view-model',
    'ytd-rich-grid-media',
    'ytd-lockup-view-model-wiz',
    'yt-lockup-view-model-wiz',
    'yt-lockup-view-model',
    'ytd-reel-video-renderer',
    'ytd-rich-grid-slim-media',
    'yt-reel-item-view-model',
    'ytd-reel-item-view-model',
    'ytd-grid-video-renderer' // Eskiden daha yaygındı, hala bulunabilir
].join(', ');

const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    const videos = node.querySelectorAll(videoSelectors);
                    videos.forEach(processVideo);

                    if (node.matches && node.matches(videoSelectors)) {
                        processVideo(node);
                    }

                    // Link-first detection
                    if (node.querySelectorAll) {
                        const potentialLinks = node.querySelectorAll('a[href*="watch?v="], a[href*="/shorts/"]');
                        potentialLinks.forEach(link => {
                            const container = link.closest(videoSelectors);
                            if (container) processVideo(container);
                        });
                    }
                }
            });
        }
    }
});

async function processVideo(element) {
    // İç içe renderları engelle (Örn: ytd-rich-item-renderer içinde ytd-rich-grid-media)
    const childVideo = element.querySelector(videoSelectors);
    if (childVideo && childVideo !== element) {
        // Eğer içimizde başka bir video renderer varsa, dıştakini işlemeden çıkabiliriz 
        // VEYA dıştakini işleyip içtekini pas geçebiliriz. 
        // YouTube genellikle içtekini asıl video verisiyle doldurur.
        // Ancak badge'i dıştakine takmak layout açısından daha güvenli olabilir.
        // Şimdilik: Eğer en dıştaki renderer isek devam et.
    }

    const currentVideoId = extractVideoId(element);
    const currentChannelHandle = extractChannelHandle(element);

    if (!currentVideoId && !currentChannelHandle) {
        return;
    }

    const lastVideoId = element.dataset.ytFilterLastId;
    const lastChannelId = element.dataset.ytFilterLastChannelId;

    if (currentVideoId !== lastVideoId || currentChannelHandle !== lastChannelId) {
        resetElement(element);
        element.dataset.ytFilterLastId = currentVideoId || "";
        element.dataset.ytFilterLastChannelId = currentChannelHandle || "";
        finishProcessing(element, currentVideoId, currentChannelHandle);
    } else if (element.dataset.ytFilterProcessed) {
        return;
    } else {
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
    const tags = getTagData(videoId, channelHandle);

    if (videoId || channelHandle) {
        // console.log(`YT Filter: Processing - ID: ${videoId}, Channel: ${channelHandle}, Tags: ${tags.join(', ')}`);
    }

    applyFilter(element, tags);
}

// Başlat
async function init() {
    updateChannelContext();
    await loadMapping();
    await loadPreferences();

    document.querySelectorAll(videoSelectors).forEach(processVideo);

    observer.observe(document.body, { childList: true, subtree: true });
}

// URL ve Navigasyon Takibi
let lastUrl = location.href;
setInterval(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        console.log("YT Filter: URL changed, updating context and re-scanning");
        updateChannelContext();

        // Kanal sayfalarında sekmeler arası geçişte her şey tazelenmeli
        document.querySelectorAll(videoSelectors).forEach(el => resetElement(el));

        setTimeout(() => {
            document.querySelectorAll(videoSelectors).forEach(processVideo);
        }, 1000);
    }
}, 1000);

init();
