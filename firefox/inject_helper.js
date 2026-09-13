/**
 * YT Filter - Main World Helper
 * Accesses YouTube's internal Javascript objects to extract Video IDs.
 */
(function () {
    console.log("YT Filter: Main World Helper Active");

    function findChannelHandleInElement(el) {
        // Paths to check for channel handle/ID in internal data
        const paths = [
            'data.ownerText.runs.0.navigationEndpoint.browseEndpoint.canonicalBaseUrl',
            'data.shortBylineText.runs.0.navigationEndpoint.browseEndpoint.canonicalBaseUrl',
            'dataModel.shortBylineText.runs.0.navigationEndpoint.browseEndpoint.canonicalBaseUrl',
            'data.ownerText.runs.0.navigationEndpoint.commandMetadata.webCommandMetadata.url',
            'data.navigationEndpoint.browseEndpoint.canonicalBaseUrl',
            'jvmModel.shortBylineText.runs.0.navigationEndpoint.browseEndpoint.canonicalBaseUrl', // Search results
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
                if (handleMatch) return `@${handleMatch[1]}`;

                const channelMatch = val.match(/\/(?:user|channel)\/([a-zA-Z0-9._-]+)/);
                if (channelMatch) return channelMatch[1];
            }
        }
        return null;
    }

    function findVideoIdInElement(el) {
        // Paths to check on the element object
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

    function scan() {
        // Targeted selectors for video components
        const selectors = [
            'ytd-rich-item-renderer',
            'ytd-video-renderer',
            'ytd-reel-item-renderer',
            'ytd-lockup-view-model',
            'ytd-lockup-view-model-wiz',
            'yt-lockup-view-model-wiz',
            'ytd-reel-item-view-model',
            'yt-reel-item-view-model',
            'ytd-grid-video-renderer',
            'ytd-rich-grid-media'
        ];

        document.querySelectorAll(selectors.join(', ')).forEach(el => {
            if (!el.dataset.ytExposedId) {
                const videoId = findVideoIdInElement(el);
                if (videoId) {
                    el.setAttribute('data-yt-exposed-id', videoId);
                }
            }

            if (!el.dataset.ytExposedChannel) {
                const channelHandle = findChannelHandleInElement(el);
                if (channelHandle) {
                    el.setAttribute('data-yt-exposed-channel', channelHandle);
                }
            }
        });
    }

    // Run periodically
    setInterval(scan, 2000);

    // Also run on interaction/scroll
    document.addEventListener('scroll', scan, { passive: true });
})();
