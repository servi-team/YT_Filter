/**
 * YouTube Filter Store - YouTube link ayrıştırma ve oEmbed bilgisi
 * API anahtarı gerektirmez. Kimlik biçimleri eklentiyle aynıdır:
 * video ID'si büyük/küçük harf korunarak, kanal ise küçük harfli @handle olarak saklanır.
 */

const { HttpHatasi } = require('./hatalar');

const VIDEO_KALIPLARI = [
    /(?:youtube\.com|youtube-nocookie\.com)\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/)([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/
];
const HANDLE_KALIBI = /(?:^|youtube\.com\/)(@[a-zA-Z0-9._-]{3,30})(?:[/?#]|$)/;

function linkiAyristir(girdi) {
    const metin = String(girdi || '').trim();
    if (!metin) throw new HttpHatasi(400, 'Kanal veya video linki gerekli');

    for (const kalip of VIDEO_KALIPLARI) {
        const eslesme = metin.match(kalip);
        if (eslesme) return { tur: 'video', youtubeId: eslesme[1] };
    }
    if (/^[a-zA-Z0-9_-]{11}$/.test(metin) && !metin.startsWith('@')) {
        return { tur: 'video', youtubeId: metin };
    }

    const handle = metin.match(HANDLE_KALIBI);
    if (handle) return { tur: 'kanal', youtubeId: handle[1].toLowerCase() };

    if (/youtube\.com\/(?:channel|c|user)\//.test(metin)) {
        throw new HttpHatasi(400, 'Kanal linki @kullanıcıadı içermeli (ör. youtube.com/@kanaladi). Kanal sayfasındaki @adı kullanın.');
    }
    throw new HttpHatasi(400, 'Geçerli bir YouTube video veya kanal linki bulunamadı');
}

// "https://www.youtube.com/@KanalAdi" → "@kanaladi"
function handleCikar(url) {
    const eslesme = String(url || '').match(/\/(@[a-zA-Z0-9._-]+)/);
    return eslesme ? eslesme[1].toLowerCase() : null;
}

const varsayilanKapak = videoId => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

/**
 * Video başlığı, kanal ve kapak görselini oEmbed ile alır.
 * Video yoksa 404 fırlatır; ağ hatasında yalnızca varsayılan kapakla döner.
 */
async function videoBilgisiGetir(videoId, fetchFn = fetch) {
    const adres = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
    let yanit;
    try {
        yanit = await fetchFn(adres, { signal: AbortSignal.timeout(6000) });
    } catch (hata) {
        return { baslik: null, kanalAdi: null, kanalHandle: null, kapakUrl: varsayilanKapak(videoId) };
    }
    if (yanit.status === 400 || yanit.status === 404) {
        throw new HttpHatasi(404, 'Video bulunamadı veya kaldırılmış');
    }
    if (!yanit.ok) {
        // 401/403: video var ama gizli ya da yerleştirmeye kapalı
        return { baslik: null, kanalAdi: null, kanalHandle: null, kapakUrl: varsayilanKapak(videoId) };
    }
    const veri = await yanit.json();
    return {
        baslik: veri.title || null,
        kanalAdi: veri.author_name || null,
        kanalHandle: handleCikar(veri.author_url),
        kapakUrl: veri.thumbnail_url || varsayilanKapak(videoId)
    };
}

module.exports = { linkiAyristir, handleCikar, videoBilgisiGetir };
