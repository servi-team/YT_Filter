chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        const simdi = new Date();
        const tarihSaat = simdi.toLocaleDateString('tr-TR') + ", " + simdi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const defaultPreferences = {
            "profanity": { visibility: "Show Badge", enforcement: "Blur Thumbnail" },
            "violence": { visibility: "Show Badge", enforcement: "Remove Video Entirely" },
            "safe": { visibility: "Show Badge", enforcement: "Allow Video" },
            "educational": { visibility: "Show Badge", enforcement: "Allow Video" },
            "untagged": { visibility: "Show Badge", enforcement: "Remove Video Entirely" }
        };
        const varsayilanVeriler = {
            kurulumTarihi: tarihSaat,
            pinKodu: "1234",
            customMapping: {},
            preferences: defaultPreferences,
            ayarlar: {
                shortsGizle: true,
                yorumGizle: true,
                onerilenGizle: true,
                guncellemeUrl: ""
            }
        };
        chrome.storage.local.set(varsayilanVeriler);
    }
    
    chrome.alarms.create("veritabaniGuncelle", { periodInMinutes: 1440 });
});

chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "veritabaniGuncelle") {
        chrome.storage.local.get(["ayarlar", "customMapping"], (veri) => {
            if (veri.ayarlar && veri.ayarlar.guncellemeUrl) {
                fetch(veri.ayarlar.guncellemeUrl)
                    .then(response => response.json())
                    .then(uzakVeri => {
                        const birlesikMapping = { ...veri.customMapping, ...(uzakVeri.customMapping || {}) };
                        chrome.storage.local.set({ customMapping: birlesikMapping });
                    }).catch(err => console.error("Güncelleme hatası: ", err));
            }
        });
    }
});