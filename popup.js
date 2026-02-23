/**
 * YT Filter Popup Script
 */

const tags = ["profanity", "violence", "educational", "safe", "untagged"];
const tagLabels = {
    "profanity": "Küfür/ArgO",
    "violence": "Şiddet",
    "educational": "Eğitici",
    "safe": "Güvenli",
    "untagged": "Etiketlenmemiş"
};
const defaultPreferences = {
    "profanity": { visibility: "Show Badge", enforcement: "Blur Thumbnail" },
    "violence": { visibility: "Show Badge", enforcement: "Remove Video Entirely" },
    "educational": { visibility: "Show Badge", enforcement: "Allow Video" },
    "safe": { visibility: "Show Badge", enforcement: "Allow Video" },
    "untagged": { visibility: "Show Badge", enforcement: "Allow Video" }
};

const storage = (typeof browser !== 'undefined') ? browser.storage.local : chrome.storage.local;

async function init() {
    const container = document.getElementById('settings-container');
    const data = await storage.get("preferences");
    const prefs = data.preferences || defaultPreferences;

    tags.forEach(tag => {
        const div = document.createElement('div');
        div.className = 'tag-group';
        div.innerHTML = `
            <span class="tag-title">${tagLabels[tag] || tag}</span>
            <div class="option">
                <span>Görünüm:</span>
                <select id="${tag}-visibility">
                    <option value="Show Badge" ${prefs[tag].visibility === 'Show Badge' ? 'selected' : ''}>Rozet Göster</option>
                    <option value="Hide Badge" ${prefs[tag].visibility === 'Hide Badge' ? 'selected' : ''}>Rozet Gizle</option>
                </select>
            </div>
            <div class="option">
                <span>Eylem:</span>
                <select id="${tag}-enforcement">
                    <option value="Allow Video" ${prefs[tag].enforcement === 'Allow Video' ? 'selected' : ''}>İzin Ver</option>
                    <option value="Blur Thumbnail" ${prefs[tag].enforcement === 'Blur Thumbnail' ? 'selected' : ''}>Bulanıklaştır</option>
                    <option value="Remove Video Entirely" ${prefs[tag].enforcement === 'Remove Video Entirely' ? 'selected' : ''}>Tamamen Kaldır</option>
                </select>
            </div>
        `;
        container.appendChild(div);
    });

    document.getElementById('save-btn').addEventListener('click', saveSettings);
}

async function saveSettings() {
    const newPrefs = {};
    tags.forEach(tag => {
        newPrefs[tag] = {
            visibility: document.getElementById(`${tag}-visibility`).value,
            enforcement: document.getElementById(`${tag}-enforcement`).value
        };
    });

    await storage.set({ preferences: newPrefs });

    // Değişikliklerin anında yansıması için mesaj gönderilebilir veya sayfa yenilenmesi istenebilir
    const btn = document.getElementById('save-btn');
    btn.textContent = "Kaydedildi! ✓";
    btn.style.backgroundColor = "#2ecc71";

    setTimeout(() => {
        btn.textContent = "Ayarları Kaydet";
        btn.style.backgroundColor = "#f00";
    }, 2000);
}

document.addEventListener('DOMContentLoaded', init);
