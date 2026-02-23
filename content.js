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

// Veritabanını yükle (Önce Storage, yoksa JSON, sonra birleştir)
async function loadMapping() {
    try {
        // 1. JSON'dan varsayılanları çek
        const response = await fetch(chrome.runtime.getURL('mapping.json'));
        const defaultMapping = await response.json();

        // 2. Storage'daki mevcut verileri çek
        let storageData;
        if (typeof browser !== 'undefined' && browser.storage) {
            storageData = await browser.storage.local.get("mapping");
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
            storageData = await new Promise(r => chrome.storage.local.get("mapping", r));
        }

        // 3. Birleştir (Mapping.json > Storage - Yeni eklenen defaultlar ezsin ama kullanıcı değişimlerini korusun)
        // Kullanıcı bir şeyi elle değiştirdiyse onu korumak için basit bir merge:
        videoMapping = { ...defaultMapping, ...(storageData?.mapping || {}) };

        // Eğer storage boşsa veya yeni bir default eklendiyse storage'ı güncelle
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
    let links = Array.from(root.querySelectorAll('a[href]'));

    // Check all children for shadowRoots
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

    // 0. Check for MAIN world exposed ID (Highest Priority/Aggressive)
    const exposedId = element.getAttribute('data-yt-exposed-id');
    if (exposedId && exposedId.length === 11) return exposedId;

    // 1. Element-level property check (Relies on ISOLATED world properties if any)
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

    // 1. Check data attributes
    const dataId = element.getAttribute('data-video-id') ||
        (element.querySelector('[data-video-id]')?.getAttribute('data-video-id'));
    if (dataId) return dataId;

    // 2. Link scanning (Essential for Search Results & Shadow DOM)
    const links = findAllLinks(element);
    for (const link of links) {
        const href = link.getAttribute('href') || link.href;
        if (!href) continue;

        // /watch?v=...
        const watchMatch = href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (watchMatch && watchMatch[1]) return watchMatch[1];

        // /shorts/... (More robust patterns)
        const shortsPatterns = [
            /\/shorts\/([a-zA-Z0-9_-]{11})/,
            /shorts\/([a-zA-Z0-9_-]{11})/,
            /v=([a-zA-Z0-9_-]{11})/ // Fallback for some weird short links
        ];

        for (const pattern of shortsPatterns) {
            const match = href.match(pattern);
            if (match && match[1]) return match[1];
        }
    }

    // 3. Thumbnail Image check (Expanded for various CDNs)
    const thumbImg = element.querySelector('img[src*="/vi/"], img[src*="ytimg.com/"]');
    if (thumbImg) {
        const patterns = [
            /\/vi\/([a-zA-Z0-9_-]{11})\//,
            /\/([a-zA-Z0-9_-]{11})\/(?:hq|mq|sd|maxres)default/, // Common YouTube CDN pattern
            /[\/\=]([a-zA-Z0-9_-]{11})[\/\?\.]/ // Generic 11-char ID extraction from image URL
        ];

        for (const pattern of patterns) {
            const match = thumbImg.src.match(pattern);
            if (match && match[1]) return match[1];
        }
    }

    // 4. Nested elements check (Sometimes ID is in a child component's data)
    const childWithData = element.querySelector('[videoId], [data-video-id], [video-id]');
    if (childWithData) {
        const vid = childWithData.getAttribute('videoId') ||
            childWithData.getAttribute('data-video-id') ||
            childWithData.getAttribute('video-id');
        if (vid && vid.length === 11) return vid;
    }

    return null;
}

/**
 * Channel Handle/ID ayıkla
 */
function extractChannelHandle(element) {
    if (!element) return null;

    // 0. Check for MAIN world exposed Channel (Highest Priority)
    const exposedChannel = element.getAttribute('data-yt-exposed-channel');
    if (exposedChannel) return exposedChannel;

    // 1. Link pattern check
    const links = findAllLinks(element);
    // console.log(`YT Filter: Found ${links.length} links in element`, element);

    for (const link of links) {
        const href = (link.getAttribute('href') || link.href || "");
        if (!href) continue;

        // @handle pattern
        const handleMatch = href.match(/\/@([a-zA-Z0-9._-]+)/);
        if (handleMatch && handleMatch[1]) {
            return `@${handleMatch[1]}`;
        }

        // /user/ or /channel/ pattern
        const channelMatch = href.match(/\/(?:user|channel)\/([a-zA-Z0-9._-]+)/);
        if (channelMatch && channelMatch[1]) {
            return channelMatch[1];
        }
    }

    // 2. Element specific check (Try to find the link by specific class/id if generic search failed)
    const channelLink = element.querySelector('a[href*="/@"], a[href*="/user/"], a[href*="/channel/"]');
    if (channelLink) {
        const href = channelLink.getAttribute('href');
        const handleMatch = href.match(/\/@([a-zA-Z0-9._-]+)/);
        if (handleMatch) return `@${handleMatch[1]}`;
    }

    // 3. Text content fallback (Aggressive)
    const channelNameEl = element.querySelector('ytd-channel-name, #channel-name, #text.ytd-channel-name');
    if (channelNameEl) {
        const link = channelNameEl.querySelector('a');
        if (link) {
            const href = link.getAttribute('href');
            if (href) {
                const match = href.match(/\/@([a-zA-Z0-9._-]+)/);
                if (match) return `@${match[1]}`;
            }
        }
    }

    return null;
}

/**
 * Data Provider: Video veya Kanal etiketlerini getir
 */
function getTagData(videoId, channelHandle) {
    let tags = [];

    // Video'nun kendi etiketleri varsa (Öncelikli)
    if (videoId && videoMapping[videoId]) {
        tags = videoMapping[videoId];
    }
    // Kanalın etiketleri varsa (Büyük/küçük harf duyarsız kontrol)
    else if (channelHandle) {
        const handleLower = channelHandle.toLowerCase();
        // Mapping içindeki tüm anahtarları kontrol et
        const matchingKey = Object.keys(videoMapping).find(key => key.toLowerCase() === handleLower);
        if (matchingKey) {
            tags = videoMapping[matchingKey];
            console.log(`YT Filter: Matched channel ${channelHandle} to tags:`, tags);
        } else {
            console.log(`YT Filter: No match for channel ${channelHandle} in mapping`, Object.keys(videoMapping).filter(k => k.startsWith('@')));
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

    // 1. Enforcement (Zorlama/Engelleme)
    if (pref.enforcement === "Remove Video Entirely") {
        element.classList.add('yt-filter-hidden');
        return;
    } else if (pref.enforcement === "Blur Thumbnail") {
        // En sağlam yöntem: Direkt ana elemente (renderer) attribute set et.
        // CSS bu attribute'u kullanarak içerideki tüm thumbnail bileşenlerini bulacak.
        element.dataset.ytFilterBlur = "true";
    }

    // 2. Visibility (Rozet Gösterimi)
    if (pref.visibility === "Show Badge") {
        addBadge(element, tags);
    }
}

function addBadge(element, tags) {
    // Zaten badge eklenmiş mi?
    if (element.querySelector('.yt-filter-badge-container')) return;

    const container = document.createElement('div');
    container.className = 'yt-filter-badge-container';

    // Bulanıklıktan etkilenmemesi için en yüksek öncelik
    container.style.zIndex = "200";
    container.style.pointerEvents = "auto"; // Etkileşim gerekirse

    tags.forEach(tag => {
        const badge = document.createElement('span');
        badge.textContent = tag === 'untagged' ? 'ETİKETLENMEMİŞ' : tag;

        let typeClass = 'yt-filter-badge-neutral';
        if (tag === 'safe' || tag === 'educational') typeClass = 'yt-filter-badge-safe';
        if (tag === 'violence' || tag === 'profanity') typeClass = 'yt-filter-badge-warning';
        if (tag === 'untagged') typeClass = 'yt-filter-badge-untagged';

        badge.className = `yt-filter-badge ${typeClass}`;
        container.appendChild(badge);
    });

    // KRİTİK: Badge'i bulanıklaşan container'ın (thumbnail) İÇİNE DEĞİL, 
    // Video elementinin (renderer) direkt içine ekliyoruz.
    // Bu sayede thumbnail bulanıklaşsa bile badge net kalır.
    element.style.setProperty('position', 'relative', 'important');
    element.appendChild(container);
}

/**
 * The Watcher: MutationObserver
 */
/**
 * The Watcher: MutationObserver
 * Artık sadece belirli etiketleri değil, video olma ihtimali olan her şeyi izliyoruz.
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
    'ytd-reel-item-view-model'
].join(', ');

const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    // 1. Bilinen renderları tara
                    const videos = node.querySelectorAll(videoSelectors);
                    videos.forEach(processVideo);

                    // 2. Eğer eklenen node'un kendisi bir video konteynırı olabilirse
                    if (node.matches && node.matches(videoSelectors)) {
                        processVideo(node);
                    }

                    // 3. Jenerik ama içinde link olan elemanları tara (Daha derin ama daha yavaş olabilir, dengeli tutuyoruz)
                    // Sadece link içeren ve belirli derinlikteki elemanlara bakıyoruz
                    if (node.querySelectorAll) {
                        const potentialLinks = node.querySelectorAll('a[href*="watch?v="], a[href*="/shorts/"]');
                        potentialLinks.forEach(link => {
                            // Linkin en yakın "render" veya "liste elemanı" olan atasına git
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
    // 1. Zaten bir üst eleman tarafından kapsanıyor mu? (İç içe etiketlemeyi engelle)
    // Eğer element bir video selector ise, onun üstünde başka bir video selector var mı bak.
    // Ama element kendisi listede olduğu için element.parentElement.closest(...) kullanmalıyız.
    if (element.parentElement && element.parentElement.closest(videoSelectors)) {
        // ytd-rich-item-renderer is a wrapper for grid items. If we are it, and we have a more specific
        // video element inside, we should let the inner one handle it to avoid double badges or weird hiding.
        if (element.matches('ytd-rich-item-renderer')) {
            const innerVideo = element.querySelector('ytd-video-renderer, ytd-reel-item-renderer, ytd-lockup-view-model');
            if (innerVideo) return;
        }
    }

    const currentVideoId = extractVideoId(element);
    const currentChannelHandle = extractChannelHandle(element);

    // Eğer ne ID ne de Kanal bulamadıysak bu bir video değildir, dataset'i temizle ve çık
    if (!currentVideoId && !currentChannelHandle) {
        if (element.dataset.ytFilterProcessed) resetElement(element);
        return;
    }

    const lastVideoId = element.dataset.ytFilterLastId;
    const lastChannelId = element.dataset.ytFilterLastChannelId;

    if (currentVideoId !== lastVideoId || currentChannelHandle !== lastChannelId) {
        resetElement(element);
        element.dataset.ytFilterLastId = currentVideoId;
        element.dataset.ytFilterLastChannelId = currentChannelHandle;
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
    const badge = element.querySelector('.yt-filter-badge-container');
    if (badge) badge.remove();
}

function finishProcessing(element, videoId, channelHandle) {
    element.dataset.ytFilterProcessed = "true";
    const tags = getTagData(videoId, channelHandle);

    // Debug logging
    if (videoId || channelHandle) {
        console.log(`YT Filter: Processing - ID: ${videoId}, Channel: ${channelHandle}, Tags: ${tags.join(', ')}`);
    }

    if (tags) {
        applyFilter(element, tags);
    }
}

// Başlat
async function init() {
    await loadMapping();
    await loadPreferences();

    // Mevcut videoları tara
    document.querySelectorAll(videoSelectors).forEach(processVideo);

    // Daha agresif: Tüm linkleri tarayarak kapsayıcılarını bul
    document.querySelectorAll('a[href*="watch?v="], a[href*="/shorts/"]').forEach(link => {
        const container = link.closest(videoSelectors);
        if (container) processVideo(container);
    });

    // Yeni videoları izle
    observer.observe(document.body, { childList: true, subtree: true });
}

// URL değişikliklerini takip et
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(() => {
            document.querySelectorAll(videoSelectors).forEach(processVideo);
        }, 1500);
    }
}).observe(document, { subtree: true, childList: true });

init();
