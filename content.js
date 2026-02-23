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

// Veritabanını yükle
async function loadMapping() {
    try {
        const response = await fetch(chrome.runtime.getURL('mapping.json'));
        videoMapping = await response.json();
        console.log("YT Filter: Mapping loaded", videoMapping);
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
 * The Extractor: Video ID ayıkla
 */
function extractVideoId(element) {
    // 1. Linkleri ara (Daha geniş ve spesifik selector'lar)
    const selectors = [
        'a#video-title-link', // Homepage large items
        'a#video-title',      // Search results
        'a#thumbnail',        // Common thumbnail link
        'a.ytd-video-renderer',
        'a.ytd-compact-video-renderer',
        'a[href*="watch?v="]'
    ];

    let link = null;
    for (const selector of selectors) {
        link = element.querySelector(selector);
        if (link && (link.getAttribute('href') || link.href)) break;
    }

    if (!link) {
        if (element.tagName === 'A' && (element.getAttribute('href') || element.href)) {
            link = element;
        } else {
            return null;
        }
    }

    const href = link.getAttribute('href') || link.href;
    if (!href) return null;

    // Shorts desteği için /shorts/ kontrolü (Opsiyonel ama iyi olur)
    if (href.includes('/shorts/')) {
        const parts = href.split('/shorts/');
        return parts[1] ? parts[1].split(/[?&]/)[0] : null;
    }

    if (!href.includes('v=')) return null;

    try {
        const url = new URL(href, window.location.origin);
        return url.searchParams.get('v');
    } catch (e) {
        const match = href.match(/[?&]v=([^&#]+)/);
        return match ? match[1] : null;
    }
}

/**
 * Data Provider: Video etiketlerini getir
 */
function getTagData(videoId) {
    return videoMapping[videoId] || ['untagged'];
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
const videoSelectors = [
    'ytd-rich-item-renderer',     // Homepage grid items
    'ytd-video-renderer',          // Search results
    'ytd-compact-video-renderer',  // Sidebar videos
    'ytd-rich-grid-media',        // More home grid styles
    'ytd-grid-video-renderer',     // Old grid styles
    'ytd-reel-item-renderer'       // Shorts (Maybe)
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
                }
            });
        }
    }
});

async function processVideo(element) {
    const currentVideoId = extractVideoId(element);
    const lastVideoId = element.dataset.ytFilterLastId;

    // Eğer video değişmişse veya hiç işlenmemişse RESETle ve işleme başla
    if (currentVideoId !== lastVideoId) {
        resetElement(element);
        element.dataset.ytFilterLastId = currentVideoId || "";
    } else if (element.dataset.ytFilterProcessed) {
        // Zaten aynı video için işlenmişse çık
        return;
    }

    if (!currentVideoId) {
        // Retry logic: YouTube'un linkleri geç yüklemesi ihtimaline karşı
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            const newId = extractVideoId(element);
            if (newId) {
                clearInterval(interval);
                element.dataset.ytFilterLastId = newId;
                finishProcessing(element, newId);
            } else if (attempts > 5) {
                clearInterval(interval);
                element.dataset.ytFilterProcessed = "partial";
            }
        }, 1000);
    } else {
        finishProcessing(element, currentVideoId);
    }
}

function resetElement(element) {
    // Tüm etiketleri ve bulanıklığı temizle
    delete element.dataset.ytFilterProcessed;
    delete element.dataset.ytFilterBlur;
    const badge = element.querySelector('.yt-filter-badge-container');
    if (badge) badge.remove();
}

function finishProcessing(element, videoId) {
    element.dataset.ytFilterProcessed = "true";
    const tags = getTagData(videoId);
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

    // Yeni videoları izle
    observer.observe(document.body, { childList: true, subtree: true });
}

// URL değişikliklerini takip et (YouTube tek sayfa uygulaması olduğu için)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        // URL değiştiğinde (örn: aramadan ana sayfaya geçiş) tekrar tara
        setTimeout(() => {
            document.querySelectorAll(videoSelectors).forEach(processVideo);
        }, 1500);
    }
}).observe(document, { subtree: true, childList: true });

init();
