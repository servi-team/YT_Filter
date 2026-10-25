/**
 * YouTube Filtreleyici - Background Script
 * Hem Chromium hem de Firefox için ortak çalışır.
 */

const browserAPI = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

// Chromium service worker'da motoru yükle (Firefox'ta manifest üzerinden yüklenir)
if (typeof YTFiltreMotoru === 'undefined' && typeof importScripts === 'function') {
    importScripts('filtre_motoru.js');
}

// Paketteki konu/etiket veritabanını storage'a yükler (her kurulum ve güncellemede)
async function veritabaniniYukle() {
    try {
        const yanit = await fetch(browserAPI.runtime.getURL('data/veritabani.json'));
        const veritabani = await yanit.json();
        await browserAPI.storage.local.set({ veritabani });
        return veritabani;
    } catch (e) {
        console.error("Veritabanı yüklenemedi", e);
        return null;
    }
}

// Filtre ayarlarını oluşturur, yeni konu/etiketleri ekler ve v1 verisini taşır
async function filtreAyarlariniHazirla(veritabani) {
    const mevcut = await browserAPI.storage.local.get(['filtre', 'beyazListe', 'karaListe', 'customMapping', 'preferences', 'karsilamaTamamlandi']);
    const yeniVeriler = {};

    const filtre = mevcut.filtre
        ? YTFiltreMotoru.eksikBasliklariTamamla(mevcut.filtre, veritabani)
        : YTFiltreMotoru.varsayilanFiltreAyarlari(veritabani);
    yeniVeriler.filtre = filtre;
    yeniVeriler.beyazListe = mevcut.beyazListe || [];
    yeniVeriler.karaListe = mevcut.karaListe || [];

    if (mevcut.customMapping || mevcut.preferences) {
        const tasinan = YTFiltreMotoru.eskiVeriyiTasi(mevcut.customMapping, mevcut.preferences, filtre);
        yeniVeriler.beyazListe = [...new Set([...yeniVeriler.beyazListe, ...tasinan.beyaz])];
        yeniVeriler.karaListe = [...new Set([...yeniVeriler.karaListe, ...tasinan.kara])];
        // v1'den gelen kullanıcılar zaten kurulum yapmış sayılır
        if (mevcut.karsilamaTamamlandi === undefined) yeniVeriler.karsilamaTamamlandi = true;
        await browserAPI.storage.local.remove(['customMapping', 'preferences']);
    }

    await browserAPI.storage.local.set(yeniVeriler);
}

browserAPI.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
        const simdi = new Date();
        const tarihSaat = simdi.toLocaleDateString('tr-TR') + ", " + simdi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

        const varsayilanVeriler = {
            kurulumTarihi: tarihSaat,
            pinKodu: "1234",
            karsilamaTamamlandi: false,
            ayarlar: {
                shortsGizle: true,
                yorumGizle: true,
                onerilenGizle: true,
                otomatikOynatmaKapat: false,
                pinIptal: false,
                koyuTema: false
            }
        };

        await browserAPI.storage.local.set(varsayilanVeriler);
    }

    if (details.reason === "install" || details.reason === "update") {
        const veritabani = await veritabaniniYukle();
        await filtreAyarlariniHazirla(veritabani);
    }
});
