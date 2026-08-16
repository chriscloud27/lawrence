// Click-to-play for Cloudflare Stream videos, and the only video signal we
// fully own.
//
// The server renders each video as its poster frame behind a play button (see
// videoClickToPlay in editSchoolHtml.ts); this swaps in the Stream player on
// click. Two events come out of it:
//
//   school/video/play  - a parent pressed play. Fired by OUR click handler, so
//                        unlike video-watch.js (a passive listener on
//                        Cloudflare's undocumented postMessage channel) it
//                        cannot silently stop firing when Cloudflare changes
//                        something.
//   school/video/shown - which videos actually came into view. Without this,
//                        zero watch time is ambiguous: no videos on screen and
//                        nobody pressing play look identical.
//
// Together they make the health check decidable: plays > 0 with no seconds
// means watch-time tracking broke; impressions with no plays means parents
// aren't interested. video-watch.js keeps counting the seconds once the player
// exists — its MutationObserver picks up the iframe we inject here.
(function () {
    // Only ever inject a src that still looks like the Stream embed URL the
    // server generated. The attribute is server-escaped, but this keeps a
    // stored-XSS style payload in image_id from becoming a live frame.
    const STREAM_SRC_RE = /^https:\/\/customer-[a-z0-9]+\.cloudflarestream\.com\/[0-9a-f]{16,64}\/iframe\?autoplay=true$/;

    const schoolIdMeta = document.querySelector('meta[name="app:school-id"]');
    const schoolId = schoolIdMeta ? schoolIdMeta.content : undefined;

    function saveEvent(name, data) {
        const event = {name: name, data: data, url: window.location.href};
        if (window.doris && window.doris.saveEvent) {
            window.doris.saveEvent(event);
        } else if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/v1/events', JSON.stringify(event));
        }
    }

    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!target || !target.closest) return;
        const btn = target.closest('[data-video-play]');
        if (!btn) return;

        const uid = btn.getAttribute('data-video-play');
        const src = btn.getAttribute('data-video-src') || '';
        if (!STREAM_SRC_RE.test(src)) return;

        const iframe = document.createElement('iframe');
        iframe.className = btn.getAttribute('data-video-class') || '';
        iframe.title = btn.getAttribute('data-video-title') || '';
        iframe.src = src;
        iframe.setAttribute('allow', 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;');
        iframe.setAttribute('allowfullscreen', 'true');
        btn.replaceWith(iframe);

        saveEvent('school/video/play', {school_id: schoolId, uid: uid});
    });

    // Impressions. Reported at page-hide alongside video-watch.js's own
    // beacon, deduped so a tab that goes hidden and comes back only ever
    // sends uids it hasn't sent yet.
    const seen = new Set();
    const sent = new Set();

    function report() {
        const fresh = [];
        seen.forEach(uid => {
            if (!sent.has(uid)) {
                sent.add(uid);
                fresh.push(uid);
            }
        });
        if (fresh.length === 0) return;
        saveEvent('school/video/shown', {school_id: schoolId, uids: fresh, count: fresh.length});
    }

    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const uid = entry.target.getAttribute('data-video-play');
                if (uid) seen.add(uid);
                io.unobserve(entry.target);
            }
        }, {threshold: 0.5});

        // Galleries render behind lazy tabs, so pick up posters added later
        // (same reason video-watch.js observes the document).
        const observeAll = () => document.querySelectorAll('[data-video-play]').forEach(b => io.observe(b));
        observeAll();
        new MutationObserver(observeAll).observe(document.documentElement, {childList: true, subtree: true});

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') report();
        });
        window.addEventListener('pagehide', report);
    }

    // Read-only debug/e2e hook, mirroring window.__dorisVideoWatch.
    window.__dorisVideoPlay = {
        state: () => ({
            posters: document.querySelectorAll('[data-video-play]').length,
            players: document.querySelectorAll('iframe[src*="cloudflarestream.com"]').length,
            seen: Array.from(seen),
            sent: Array.from(sent),
        }),
    };
})();
