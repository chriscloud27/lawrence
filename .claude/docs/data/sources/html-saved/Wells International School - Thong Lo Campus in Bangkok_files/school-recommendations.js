window.addEventListener('DOMContentLoaded', function () {
    var placeholder = document.getElementById('recommendations-placeholder');
    if (!placeholder) return;
    var url = placeholder.dataset.recsUrl;
    if (!url) return;

    function load() {
        fetch(url)
            .then(function (res) { return res.ok ? res.text() : Promise.reject(); })
            .then(function (html) {
                if (!html || !html.trim()) {
                    placeholder.remove();
                    return;
                }
                placeholder.innerHTML = html;
                if (typeof window.handlePlacementSection === 'function') window.handlePlacementSection();
                if (typeof window.observeRecommendations === 'function') window.observeRecommendations();
            })
            .catch(function () { placeholder.remove(); });
    }

    // This section is below the fold, so it's never the LCP element. Let the
    // browser finish the critical render, then fetch during idle time — that
    // keeps /recommendations out of the page-load network waterfall without any
    // scroll bookkeeping. The timeout guarantees it still runs on a busy main
    // thread; the setTimeout is the fallback for browsers without rIC.
    if ('requestIdleCallback' in window) {
        requestIdleCallback(load, {timeout: 3000});
    } else {
        setTimeout(load, 1200);
    }
});
