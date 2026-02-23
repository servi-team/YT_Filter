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

// Veritabanını yükle (Current scope: content.js içine gömülü veya local fetch)
async function loadMapping() {
    try {
        // Not: Manifest V3'te yerel JSON'a erişim için url belirtilmeli veya dahili tanımlanmalı.
        // Şimdilik test için manuel bir fetch simülasyonu yapıyoruz.
        const response = await fetch(chrome.runtime.getURL('mapping.json'));
        videoMapping = await response.json();
        console.log("YT Filter: Mapping loaded", videoMapping);
    } catch (e) {
        console.error("YT Filter: Mapping load failed", e);
    }
}

// Kullanıcı tercihlerini yükle
async function loadPreferences() {
    if (typeof browser !== 'undefined' && browser.storage) {
        const data = await browser.storage.local.get("preferences");
        if (data.preferences) userPreferences = data.preferences;
    } else if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = await new Promise(r => chrome.storage.local.get("preferences", r));
        if (data.preferences) userPreferences = data.preferences;
    }
}

/**
 * The Extractor: Video ID ayıkla
 */
function extractVideoId(element) {
    // 1. Standart video linki veya Grid linki ara
    const link = element.querySelector('a#thumbnail, a.ytd-video-renderer, a.ytd-compact-video-renderer, a#video-title-link, a#video-title');
    if (!link) return null;

    // 2. Link href'inden video ID'sini çek
    const href = link.href;
    if (!href) return null;

    try {
        const url = new URL(href, window.location.origin);
        return url.searchParams.get('v');
    } catch (e) {
        return null;
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

    // En kısıtlayıcı tercihi bul (Basitlik için ilk etikete göre işlem yapalım)
    const primaryTag = tags[0];
    const pref = userPreferences[primaryTag] || { visibility: "Show Badge", enforcement: "Allow Video" };

    // 1. Enforcement (Zorlama/Engelleme)
    if (pref.enforcement === "Remove Video Entirely") {
        element.classList.add('yt-filter-hidden');
        return; // Remove edildiyse badge eklemeye gerek yok
    } else if (pref.enforcement === "Blur Thumbnail") {
        const thumbnail = element.querySelector('ytd-thumbnail img');
        if (thumbnail) thumbnail.classList.add('yt-filter-blur');
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

    tags.forEach(tag => {
        const badge = document.createElement('span');
        badge.textContent = tag === 'untagged' ? 'ETİKETLENMEMİŞ' : tag;

        // Stil belirleme
        let typeClass = 'yt-filter-badge-neutral';
        if (tag === 'safe' || tag === 'educational') typeClass = 'yt-filter-badge-safe';
        if (tag === 'violence' || tag === 'profanity') typeClass = 'yt-filter-badge-warning';
        if (tag === 'untagged') typeClass = 'yt-filter-badge-untagged';

        badge.className = `yt-filter-badge ${typeClass}`;
        container.appendChild(badge);
    });

    // Thumbnail konteynırını bul (Homepage ve Search sonuçları farklı olabiliyor)
    const thumbnail = element.querySelector('ytd-thumbnail, #thumbnail, .ytd-thumbnail');
    if (thumbnail) {
        // Absolute konumlandırma için relative yap
        thumbnail.style.setProperty('position', 'relative', 'important');
        thumbnail.appendChild(container);
    }
}


/**
 * The Watcher: MutationObserver
 */
const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    // Hedef youtube elementlerini tara
                    const videos = node.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer');
                    videos.forEach(processVideo);

                    // Eğer eklenen node kendisi bir video elementi ise
                    if (node.tagName.toLowerCase().includes('video-renderer') || node.tagName.toLowerCase().includes('rich-item-renderer')) {
                        processVideo(node);
                    }
                }
            });
        }
    }
});

function processVideo(element) {
    // İşlendi mi kontrolü
    if (element.dataset.ytFilterProcessed) return;
    element.dataset.ytFilterProcessed = "true";

    const videoId = extractVideoId(element);
    if (!videoId) return;

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
    document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer').forEach(processVideo);

    // Yeni videoları izle
    observer.observe(document.body, { childList: true, subtree: true });
}

init();
