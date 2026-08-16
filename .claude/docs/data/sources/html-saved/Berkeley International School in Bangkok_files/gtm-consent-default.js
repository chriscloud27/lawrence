// Google consent mode: the DEFAULT state, set before the GTM container loads.
//
// This is a plain blocking <script> in the head, not a deferred one, and that is
// deliberate: `gtag('consent', 'default', …)` is only honoured before the
// container script runs. Set it afterwards and the tags have already decided.
// gtm.js, which is deferred, can therefore only ever send `update`.
//
// Everything starts denied because we cannot yet tell whether this visitor is
// one we have to ask. marketingConsentGranted() resolves "never answered" by
// looking for #cookie-banner (present = EEA or unknown country = stay off), and
// the body has not been parsed at this point, so the banner is not in the DOM to
// find. Two ways out of denied:
//
//   1. A visitor who has answered before: their answer is in localStorage right
//      now, so it goes in immediately as an update and nothing waits.
//   2. A visitor who has not: `wait_for_update` buys gtm.js a moment to answer
//      once the banner is (or is not) in the DOM. Google's tags hold their hits
//      for that long rather than sending them as denied.
//
// So a known non-EEA visitor is still granted, a few milliseconds later than
// before. What changes is that a rejection now actually reaches Google, which it
// never did: gtm.js used to push the gtag command form through raw
// dataLayer.push, which drops it. See gtm.js for the mechanics.
window.dataLayer = window.dataLayer || [];
if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
}

window.gtag('consent', 'default', {
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'analytics_storage': 'denied',
    'wait_for_update': 500,
});

(function applyRecordedAnswer() {
    const marketing = recordedChoice('cookie-marketing');
    const analytics = recordedChoice('cookie-analytics');
    if (marketing === null && analytics === null) return; // never asked; gtm.js resolves it

    window.gtag('consent', 'update', {
        'ad_storage': grant(marketing),
        'ad_user_data': grant(marketing),
        'ad_personalization': grant(marketing),
        'analytics_storage': grant(analytics),
    });
})();

function grant(choice) {
    return choice === true ? 'granted' : 'denied';
}

// The visitor's recorded answer, or null for "never asked". Duplicated from
// marketingConsentGranted() / analyticsConsentGranted() rather than shared,
// because those live in doris.js and hotjar.js and neither has loaded yet. The
// difference: they resolve "never asked" via the banner, and we cannot, so we
// return null and let the deferred script decide.
//
// Legacy visitors have no granular key: it only arrived with the granular banner
// in Nov 2025, and before that a single `cookie-consent` carried the whole
// answer, with Reject writing 'false'. For them that key IS the recorded choice.
function recordedChoice(key) {
    const choice = localStorage.getItem(key);
    if (choice === 'true') return true;
    if (choice === 'false') return false;
    const legacy = localStorage.getItem('cookie-consent');
    if (legacy === 'true') return true;
    if (legacy === 'false') return false;
    return null;
}
