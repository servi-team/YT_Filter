(function () {
    if (window.__yt_filter_helper_active) return;
    window.__yt_filter_helper_active = true;

    console.log("YT Filter: Main World Helper Active");

    function findChannelHandleInElement(el) {
        const paths = [
            'data.ownerText.runs.0.navigationEndpoint.browseEndpoint.canonicalBaseUrl',
            'data.shortBylineText.runs.0.navigationEndpoint.browseEndpoint.canonicalBaseUrl',
            'dataModel.shortBylineText.runs.0.navigationEndpoint.browseEndpoint.canonicalBaseUrl',
            'data.ownerText.runs.0.navigationEndpoint.commandMetadata.webCommandMetadata.url',
            'data.navigationEndpoint.browseEndpoint.canonicalBaseUrl',
            'jvmModel.shortBylineText.runs.0.navigationEndpoint.browseEndpoint.canonicalBaseUrl',
            'data.longBylineText.runs.0.navigationEndpoint.browseEndpoint.canonicalBaseUrl'
        ];

        for (const path of paths) {
            let val = el;
            for (const segment of path.split('.')) {
                if (val && Array.isArray(val) && !isNaN(segment)) {
                    val = val[parseInt(segment)];
                } else {
                    val = val ? val[segment] : null;
                }
            }
            if (typeof val === 'string') {
                const handleMatch = val.match(/\/(@[a-zA-Z0-9._-]+)/);
                if (handleMatch) return handleMatch[1];
                const channelMatch = val.match(/\/(?:user|channel)\/([a-zA-Z0-9._-]+)/);
                if (channelMatch) return channelMatch[1];
            }
        }
        return null;
    }


    function findChannelIdInElement(el) {
        const paths = [
            'data.ownerText.runs.0.navigationEndpoint.browseEndpoint.browseId',
            'data.shortBylineText.runs.0.navigationEndpoint.browseEndpoint.browseId',
            'data.longBylineText.runs.0.navigationEndpoint.browseEndpoint.browseId',
            'dataModel.shortBylineText.runs.0.navigationEndpoint.browseEndpoint.browseId',
            'jvmModel.shortBylineText.runs.0.navigationEndpoint.browseEndpoint.browseId',
            'data.navigationEndpoint.browseEndpoint.browseId'
        ];

        for (const path of paths) {
            let val = el;
            for (const segment of path.split('.')) {
                if (val && Array.isArray(val) && !isNaN(segment)) {
                    val = val[parseInt(segment)];
                } else {
                    val = val ? val[segment] : null;
                }
            }
            if (typeof val === 'string' && /^UC[A-Za-z0-9_-]{22}$/.test(val)) return val;
        }
        return null;
    }

    function findVideoIdInElement(el) {
        const paths = [
            'data.videoId',
            'dataModel.videoId',
            'jvmModel.videoId',
            'data.contentId',
            'data.videoRenderer.videoId',
            'videoRenderer.videoId',
            'data.gridVideoRenderer.videoId',
            'data.reelItemRenderer.videoId'
        ];

        for (const path of paths) {
            let val = el;
            for (const segment of path.split('.')) {
                val = val ? val[segment] : null;
            }
            if (typeof val === 'string' && val.length === 11) return val;
        }
        return null;
    }


    // Kart verisinin içinde anahtar adına göre arama yapar (sabit yollar yapı değişince bozuluyor).
    function kartKokleri(el) {
        const kokler = [];
        const adaylar = [el.data, el.__data, el.dataModel, el.jvmModel, el.props, el.polymerController && el.polymerController.data];
        adaylar.forEach(k => { if (k && typeof k === 'object' && !kokler.includes(k)) kokler.push(k); });
        return kokler;
    }

    function derinBul(el) {
        const sonuc = { videoId: null, handle: null, channelId: null };
        const kokler = kartKokleri(el);
        const ziyaret = new WeakSet();
        let sayac = 0;

        function gez(node, derinlik) {
            if (!node || typeof node !== 'object' || derinlik > 12 || sayac > 4000) return;
            if (ziyaret.has(node)) return;
            ziyaret.add(node);
            sayac++;

            let anahtarlar;
            try { anahtarlar = Object.keys(node); } catch (e) { return; }

            for (const k of anahtarlar) {
                let v;
                try { v = node[k]; } catch (e) { continue; }

                if (typeof v === 'string') {
                    if (!sonuc.videoId && (k === 'videoId' || k === 'contentId') && /^[A-Za-z0-9_-]{11}$/.test(v)) sonuc.videoId = v;
                    else if (!sonuc.channelId && k === 'browseId' && /^UC[A-Za-z0-9_-]{22}$/.test(v)) sonuc.channelId = v;
                    else if (!sonuc.handle && (k === 'canonicalBaseUrl' || k === 'url')) {
                        const m = v.match(/^\/(@[a-zA-Z0-9._-]+)/);
                        if (m) sonuc.handle = m[1];
                    }
                } else if (v && typeof v === 'object') {
                    gez(v, derinlik + 1);
                }
                if (sonuc.videoId && sonuc.handle && sonuc.channelId) return;
            }
        }

        kokler.forEach(k => gez(k, 0));
        return sonuc;
    }

    function scan() {
        const selectors = [
            'ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-reel-item-renderer',
            'ytd-lockup-view-model', 'ytd-lockup-view-model-wiz', 'yt-lockup-view-model-wiz',
            'ytd-reel-item-view-model', 'yt-reel-item-view-model', 'ytd-grid-video-renderer',
            'ytd-rich-grid-media', 'yt-lockup-view-model', 'ytd-compact-video-renderer'
        ];

        document.querySelectorAll(selectors.join(', ')).forEach(el => {
            let derin = null;
            const derinAl = () => derin || (derin = derinBul(el));

            if (!el.dataset.ytExposedId) {
                const videoId = findVideoIdInElement(el) || derinAl().videoId;
                if (videoId) el.setAttribute('data-yt-exposed-id', videoId);
            }
            if (!el.dataset.ytExposedChannel) {
                const channelHandle = findChannelHandleInElement(el) || derinAl().handle;
                if (channelHandle) el.setAttribute('data-yt-exposed-channel', channelHandle);
            }
            if (!el.dataset.ytExposedChannelId) {
                const channelId = findChannelIdInElement(el) || derinAl().channelId;
                if (channelId) el.setAttribute('data-yt-exposed-channel-id', channelId);
            }
        });
    }

    // Tanılama: Konsolda  __ytFilterDiag()  yazın.
    window.__ytFilterDiag = function () {
        const all = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-lockup-view-model, yt-lockup-view-model, ytd-grid-video-renderer');
        const sonuc = { toplamKart: all.length, videoIdBulunan: 0, handleBulunan: 0, kanalIdBulunan: 0, ornek: [] };
        all.forEach(el => {
            if (el.dataset.ytExposedId) sonuc.videoIdBulunan++;
            if (el.dataset.ytExposedChannel) sonuc.handleBulunan++;
            if (el.dataset.ytExposedChannelId) sonuc.kanalIdBulunan++;
            if (sonuc.ornek.length < 3) {
                sonuc.ornek.push({
                    etiket: el.tagName.toLowerCase(),
                    videoId: el.dataset.ytExposedId || null,
                    handle: el.dataset.ytExposedChannel || null,
                    kanalId: el.dataset.ytExposedChannelId || null,
                    koklerVar: kartKokleri(el).length, veriAnahtarlari: kartKokleri(el).map(k => Object.keys(k).slice(0, 8).join(',')).join(' | ')
                });
            }
        });
        console.table(sonuc.ornek);
        console.log('YT Filter tanılama:', { toplamKart: sonuc.toplamKart, videoIdBulunan: sonuc.videoIdBulunan, handleBulunan: sonuc.handleBulunan, kanalIdBulunan: sonuc.kanalIdBulunan });
        return sonuc;
    };

    setInterval(scan, 2000);
    document.addEventListener('scroll', scan, { passive: true });
})();
