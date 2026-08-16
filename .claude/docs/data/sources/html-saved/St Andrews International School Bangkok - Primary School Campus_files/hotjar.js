window.setDorisWindowField('loadHotjar', loadHotjar);
window.setDorisWindowField('analyticsConsentGranted', analyticsConsentGranted);

// Defer Hotjar (40kb + cookies + recording overhead) until the user shows
// real intent — first scroll, click, keystroke or touch. Crawlers
// (Googlebot, GPTBot, ClaudeBot, etc.) never trigger these, so they never
// load it. Real users still get session recordings starting from their
// first interaction.
//
// mousemove was previously in this list but fires instantly on desktop
// the moment the cursor crosses the page (often before paint completes),
// so it effectively wasn't deferring anything. Removed.
//
// Fallback: if nothing happens after 5s we load it anyway so we don't
// lose data on visitors who land + read without scrolling.
if (analyticsConsentGranted() && window.location.hostname != 'localhost') {
    // NB: declared as `const` + arrow rather than `function loadOnce()`.
    // Safari/WebKit's Annex B.3.3 hoists block-scoped function declarations
    // to the surrounding (global) scope as a var-style binding while leaving
    // `let loaded` block-scoped — when the hoisted copy is invoked later by
    // a listener or setTimeout, its scope chain doesn't include this block
    // and `loaded` resolves to "Can't find variable: loaded". An arrow
    // assigned to a `const` keeps both bindings in the same block scope.
    let loaded = false;
    const loadOnce = () => {
        if (loaded) return;
        loaded = true;
        try {
            window.removeEventListener('scroll', loadOnce);
            window.removeEventListener('click', loadOnce);
            window.removeEventListener('keydown', loadOnce);
            window.removeEventListener('touchstart', loadOnce);
        } catch (e) {}
        loadHotjar();
    };
    window.addEventListener('scroll', loadOnce, {once: true, passive: true});
    window.addEventListener('click', loadOnce, {once: true, passive: true});
    window.addEventListener('keydown', loadOnce, {once: true});
    window.addEventListener('touchstart', loadOnce, {once: true, passive: true});
    setTimeout(loadOnce, 5000);
}

// Whether we may load analytics / session recording for this visitor.
//
// The answer lives in `cookie-analytics`, NOT `cookie-consent`. cookie-banner.js
// writes `cookie-consent = 'true'` on Accept AND on "Reject optional", because
// there it only means "has answered"; the analytics choice goes to a separate
// key. Gating on `cookie-consent` therefore never observed a rejection, so
// visitors who explicitly declined analytics cookies were recorded anyway.
//
// Undecided is resolved by whether we are currently asking. When #cookie-banner
// is on the page (EEA / unknown country) we stay off and let cookie-banner.js
// call loadHotjar() itself on accept, which is what ePrivacy prior consent
// requires. With no banner there is no pending question to wait for, so known
// non-EEA visitors keep the previous behaviour.
// Legacy visitors have no `cookie-analytics` key: it only arrived with the granular
// banner in Nov 2025. Before that a single `cookie-consent` carried the whole answer
// and Reject wrote 'false', so for those visitors that key IS their recorded choice.
// Without this fallback everyone who consented before Nov 2025 fell through to the
// banner check, and because cookie-banner.js only ADDS a `hidden` class the element
// is still in the DOM, so they silently stopped being recorded despite having agreed.
function analyticsConsentGranted() {
    const choice = localStorage.getItem('cookie-analytics');
    if (choice === 'true') return true;
    if (choice === 'false') return false;
    const legacy = localStorage.getItem('cookie-consent');
    if (legacy === 'true') return true;
    if (legacy === 'false') return false;
    return !document.getElementById('cookie-banner');
}

function loadHotjar(){
    (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:5329466,hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=')
}