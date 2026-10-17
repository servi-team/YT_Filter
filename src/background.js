/**
 * YouTube Filtreleyici - Background Script
 * Hem Chromium hem de Firefox için ortak çalışır.
 */

const browserAPI = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

// Çekirdek tanımlar: Chromium service worker'da importScripts ile, Firefox'ta manifest'teki scripts listesiyle yüklenir.
// Yüklenemezse eski varsayılanlarla devam edilir (arayüz ilk açılışta yeni modele taşır).
try { if (typeof importScripts === 'function') importScripts('core/taxonomy.js'); } catch (e) { /* yedek yol kullanılacak */ }

browserAPI.runtime.onInstalled.addListener((details) => {
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
        
        // Yeni model (etiketlenmemis: null -> ilk açılışta kullanıcıya sorulur). Çekirdek yüklenemediyse eski model.
        const modelVerisi = (typeof YTF !== 'undefined' && YTF.varsayilanAyar)
            ? { surum: 2, ayar: YTF.varsayilanAyar() }
            : { customMapping: {}, preferences: defaultPreferences };

        const varsayilanVeriler = {
            kurulumTarihi: tarihSaat,
            pinKodu: "1234",
            ...modelVerisi,
            ayarlar: {
                shortsGizle: true,
                yorumGizle: true,
                onerilenGizle: true,
                otomatikOynatmaKapat: false,
                pinIptal: false,
                koyuTema: false
            }
        };
        
        browserAPI.storage.local.set(varsayilanVeriler);
    }
});
