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
                otomatikOynatmaKapat: false,
                pinIptal: false,
                koyuTema: false
            }
        };
        chrome.storage.local.set(varsayilanVeriler);
    }
});