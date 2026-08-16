// Counts seconds of ACTUAL video playback on this page and beacons the total
// once per page session. Cloudflare's own "minutes viewed" metric counts
// minutes *delivered* — player preload on page load shows up as watch time —
// so server-side numbers are inflated even for click-to-play videos. This is
// the ground truth: the Stream iframe player broadcasts its media events to
// the parent window (same channel its official sdk.latest.js consumes:
// plain-object messages tagged __privateUnstableMessageType), and we only
// count currentTime deltas that arrive while the player reports playing.
// Purely passive — nothing is ever posted to the player.
(function () {
    // Origin is derived per-iframe from its src rather than hardcoded, so a
    // changed customer subdomain can't silently kill tracking.
    const STREAM_ORIGIN_RE = /^https:\/\/customer-[a-z0-9]+\.cloudflarestream\.com$/;

    const schoolIdMeta = document.querySelector('meta[name="app:school-id"]');
    const schoolId = schoolIdMeta ? schoolIdMeta.content : undefined;

    const attached = new Map();   // iframe contentWindow -> uid
    const watched = {};           // uid -> seconds of real playback (not yet sent)
    const playing = {};           // uid -> currently playing
    const lastSeconds = {};       // uid -> currentTime at last update while playing

    function uidFromSrc(src) {
        const match = /cloudflarestream\.com\/([0-9a-f]{16,64})\//.exec(src || '');
        return match ? match[1] : null;
    }

    function attach(iframe) {
        const uid = uidFromSrc(iframe.src);
        if (!uid || !STREAM_ORIGIN_RE.test((() => {
            try {
                return new URL(iframe.src).origin;
            } catch {
                return '';
            }
        })())) return;
        if (iframe.contentWindow) attached.set(iframe.contentWindow, uid);
        iframe.addEventListener('load', () => {
            if (iframe.contentWindow) attached.set(iframe.contentWindow, uid);
        });
    }

    function attachAll() {
        document.querySelectorAll('iframe[src*="cloudflarestream.com"]').forEach(attach);
    }

    window.addEventListener('message', (e) => {
        if (!STREAM_ORIGIN_RE.test(e.origin)) return;
        const uid = attached.get(e.source);
        const msg = e.data;
        if (!uid || !msg || !msg.__privateUnstableMessageType) return;

        if (msg.__privateUnstableMessageType === 'event') {
            if (msg.eventName === 'play' || msg.eventName === 'playing') {
                playing[uid] = true;
            } else if (msg.eventName === 'pause' || msg.eventName === 'ended') {
                playing[uid] = false;
                lastSeconds[uid] = null;
            }
        } else if (msg.__privateUnstableMessageType === 'propertyChange') {
            if (msg.property === 'paused') {
                playing[uid] = !msg.value;
                if (msg.value) lastSeconds[uid] = null;
            } else if (msg.property === 'currentTime' && playing[uid] && typeof msg.value === 'number') {
                const prev = lastSeconds[uid];
                if (prev != null) {
                    const delta = msg.value - prev;
                    // Negative = seek back / loop restart; large = seek
                    // forward. Neither is watching — currentTime ticks
                    // ~4x/second during real playback, so only count small
                    // forward steps.
                    if (delta > 0 && delta < 5) watched[uid] = (watched[uid] || 0) + delta;
                }
                lastSeconds[uid] = msg.value;
            }
        }
    });

    function report() {
        const videos = {};
        let total = 0;
        for (const uid of Object.keys(watched)) {
            const secs = Math.round(watched[uid]);
            if (secs >= 1) {
                videos[uid] = secs;
                total += secs;
            }
        }
        if (total < 1) return;
        // Reset so a tab that comes back to visibility and plays more sends
        // only the new seconds next time — the crunch sums per session.
        for (const uid of Object.keys(watched)) delete watched[uid];
        const event = {
            name: 'school/video/watch',
            data: {school_id: schoolId, seconds: total, videos},
            url: window.location.href,
        };
        if (window.doris && window.doris.saveEvent) {
            window.doris.saveEvent(event);
        } else if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/v1/events', JSON.stringify(event));
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') report();
    });
    window.addEventListener('pagehide', report);

    attachAll();
    // Some sections render after load (lazy tabs, admin previews) — pick up
    // Stream iframes added later.
    new MutationObserver(attachAll).observe(document.documentElement, {childList: true, subtree: true});

    // Read-only debug/e2e hook (asserted by the puppeteer verification).
    window.__dorisVideoWatch = {
        state: () => ({watched: {...watched}, playing: {...playing}, attached: attached.size}),
    };
})();
