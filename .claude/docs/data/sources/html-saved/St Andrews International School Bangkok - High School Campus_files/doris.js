function setDorisWindowField(name, value) {
    if (window.doris){
        window.doris[name] = value;
    } else {
        window['doris'] = new Object(); // {} breaks my syntax highlighting for some reason so new Object()
        window['doris'][name] = value;
    }
}
setDorisWindowField('setDorisWindowField', setDorisWindowField);

const generateEventId = () => "evt_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

function trackEvent(name, data={}){
    const { fbp, fbc } = getFbCookies();
    const fbFields = { fbp, ...(fbc ? { fbc } : {}) };
    const eventID = generateEventId();

    if (window.fbq) {
        if (data.email) {
            hashEmail(data.email).then(hashed => {
                const safeForFb = {...data, email: undefined, phone: undefined, name: undefined, em: hashed, ...fbFields}
                window.fbq('trackCustom', name, safeForFb, { eventID: eventID });
            });
        } else {
            window.fbq('trackCustom', name, {...data, ...fbFields}, { eventID: eventID });
        }
    }
    if (window.dataLayer) {
        const gtmData = {
            event: name,
            event_id: eventID,
            ...data,
            ...fbFields
        };

        // Google Ads enhanced conversions. The identity can come from the event
        // itself (a lead form the parent just filled in) or from the signed-in
        // parent. Both routes matter: school_profile_view and a WhatsApp
        // school_profile_lead are Ads conversions, and neither one carries an
        // email in its own payload.
        const googleEmail = enhancedConversionEmail(data);
        const gtmPayload = data.email ? withoutPii(gtmData) : gtmData;
        if (googleEmail) {
            // user_data has to be in place BEFORE the event that triggers the
            // conversion tag, so the push waits on the hash. It must not wait
            // FOREVER though: crypto.subtle is undefined outside a secure
            // context, and since every event from a signed-in parent now takes
            // this branch, an unguarded reject would silently drop the lot.
            // Losing the enhanced-conversion match is survivable; losing the
            // conversion is not.
            hashEmailForGoogle(googleEmail)
                .then(hashed => setGoogleUserData(hashed))
                .catch(() => undefined)
                .then(() => window.dataLayer.push(gtmPayload));
        } else {
            window.dataLayer.push(gtmPayload);
        }
    }
    if (window.uetq) {
        if (data.email) {
            hashEmail(data.email).then(hashed => {
                const safe = { ...data, email: undefined, phone: undefined, name: undefined };
                window.uetq.push('set', 'user_data', { em: hashed });
                window.uetq.push({
                    ec: 'Custom',      // category
                    ea: name,          // action (use your event name)
                    el: safe.label || '', // optional label
                    ev: safe.value || 1   // optional numeric value
                });
            });
        } else {
            window.uetq.push({ec: 'Custom', ea: name, el: data.label || '', ev: data.value || 1});
        }
    }
    // OpenAI ads measurement pixel (oaiq). The base pixel + init is loaded in
    // Google Tag Manager alongside the Facebook and Bing/UET base tags, so
    // `window.oaiq` only exists once that tag has fired (and, if the tag is
    // consent-gated in GTM, only after consent). We relay each of our events as
    // an OpenAI `custom` event, passing eventID as event_id for dedup parity
    // with the Facebook/CAPI side. https://developers.openai.com/ads/measurement-pixel
    if (window.oaiq) {
        const oaiEvent = sanitizeOaiEventName(name);
        const fireOai = () => window.oaiq('measure', 'custom',
            {type: 'custom', event_id: eventID},
            {custom_event_name: oaiEvent});
        if (data.email) {
            hashEmail(data.email).then(hashed => {
                // Advanced matching: attach the hashed email to the pixel (init
                // is the documented sink for user identifiers). No raw PII here.
                window.oaiq('init', {user: {email_sha256: hashed}});
                fireOai();
            });
        } else {
            fireOai();
        }
    }

    const payload = {name, data};
    window.doris.saveEvent(payload);
}
setDorisWindowField('trackEvent', trackEvent);

setDorisWindowField('consentToMarketing', consentToMarketing);
function consentToMarketing(yesNo) {
    if (window.doris && window.doris.consentToCookiesGtm) window.doris.consentToCookiesGtm(yesNo);
    if (window.doris && window.doris.consentToCookiesFb) window.doris.consentToCookiesFb(yesNo);
    if (window.doris && window.doris.consentToCookiesTt) window.doris.consentToCookiesTt(yesNo);
    if (window.doris && window.doris.consentToCookiesMs) window.doris.consentToCookiesMs(yesNo);
    if (window.doris && window.doris.consentToCookiesRd) window.doris.consentToCookiesRd(yesNo);
}

// Whether we may fire the ad / marketing pixels for this visitor. Used by gtm.js,
// fb.js and uetq.js, which each hold their own vendor consent call.
//
// The answer lives in `cookie-marketing`, NOT `cookie-consent`. cookie-banner.js
// writes `cookie-consent = 'true'` on Accept AND on "Reject optional", because
// there it only means "has answered"; the marketing answer goes to its own key.
// Gating on `cookie-consent` could therefore never observe a rejection, and the
// ordering made it self-defeating: savePreferences() called consentToMarketing('no'),
// correctly denying, then dispatched cookie-consent-changed, and each tag's listener
// re-read `cookie-consent`, saw 'true' and re-granted. Last write won, so an explicit
// rejection landed as granted. Same bug that was fixed for Hotjar via `cookie-analytics`.
//
// Legacy visitors have no `cookie-marketing` key, because it only arrived with the
// granular banner in Nov 2025. Before that a single `cookie-consent` carried the
// whole answer and Reject wrote 'false', so for those visitors that key IS their
// recorded choice and we honour it rather than throwing away a real consent.
//
// Still nothing recorded means we have never asked. Resolved by whether we are
// asking right now: with #cookie-banner on the page (EEA / unknown country) we stay
// off, which is what ePrivacy prior consent requires, and cookie-banner.js grants
// on accept. With no banner there is no pending question, so known non-EEA visitors
// keep the behaviour they had.
setDorisWindowField('marketingConsentGranted', marketingConsentGranted);
function marketingConsentGranted() {
    const choice = localStorage.getItem('cookie-marketing');
    if (choice === 'true') return true;
    if (choice === 'false') return false;
    const legacy = localStorage.getItem('cookie-consent');
    if (legacy === 'true') return true;
    if (legacy === 'false') return false;
    return !document.getElementById('cookie-banner');
}

// OpenAI custom event names must be 1–64 chars of letters, numbers, underscore
// or dash. Our internal event names use other punctuation (e.g. "school/lead",
// "view-section/school/profile"), so coerce to the allowed charset.
function sanitizeOaiEventName(name) {
    const cleaned = String(name || 'custom').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);
    return cleaned || 'custom';
}

// True when a school_profile_lead target is a DIRECT contact channel a parent
// clicked through to enquire (message/call the school), as opposed to a share
// action, a website visit, a prospectus download, etc. `target` values come
// from the contact-channel renderers (schoolProfileMisc.ts, schoolProfile.ts,
// publicEventDetailPage.ts) and the Doris AI contact cards (dorisAgent.ts):
// e.g. "whatsapp", "call", "email", "wechat", "line", "social-instagram".
function isEnquiryChannel(target) {
    if (!target) return false;
    const t = String(target).toLowerCase();
    if (t.indexOf('share') === 0 || t.indexOf('share-') !== -1) return false; // share-* is sharing, not enquiring
    const direct = ['whatsapp', 'wechat', 'line', 'email', 'call', 'phone', 'telegram', 'viber', 'messenger', 'facebook', 'instagram'];
    if (direct.indexOf(t) !== -1) return true;
    return /^social-(facebook|instagram|messenger)$/.test(t); // DMs rendered as social-<network>
}

async function hashEmail(email) {
    // Facebook / Microsoft advanced matching: lower-case + trim, nothing else.
    return sha256Hex(email.toLowerCase().trim());
}

// Google normalises further than Facebook does before hashing: gmail.com and
// googlemail.com ignore dots in the local part, so an address has to be de-dotted
// or the digest matches nobody. Same parent, two different digests across the
// platforms, on purpose.
// https://support.google.com/google-ads/answer/13262500
async function hashEmailForGoogle(email) {
    const trimmed = String(email).toLowerCase().trim();
    const at = trimmed.lastIndexOf('@');
    if (at === -1) return sha256Hex(trimmed);
    const local = trimmed.slice(0, at);
    const domain = trimmed.slice(at + 1);
    const dedotted = (domain === 'gmail.com' || domain === 'googlemail.com')
        ? local.split('.').join('')
        : local;
    return sha256Hex(dedotted + '@' + domain);
}

// The address to send as enhanced conversion data, or undefined. Hashed or not,
// this is the parent's email address, so it needs a marketing consent we can
// point at. `data.email` is the parent identifying themselves in the event
// (a lead form); currentParentEmail() covers every other conversion a signed-in
// parent fires, none of which carry an address of their own.
function enhancedConversionEmail(data) {
    if (!marketingConsentGranted()) return undefined;
    return data.email || currentParentEmail();
}

// `gtag('set', 'user_data', …)` is the documented sink for enhanced conversions
// and the only form GTM reads. `dataLayer.push('set', 'user_data', {…})` looks
// identical and is not: gtag is `function gtag(){ dataLayer.push(arguments) }`
// (view-components/gtm.ts), so the command form appends ONE arguments-like
// element GTM understands, whereas a three-argument dataLayer.push appends
// THREE: two bare strings GTM's processor ignores, plus a bare object that
// lands as a top-level `email` variable. Checked against the live container:
// after the push form, dataLayer.get('user_data') is null. `sha256_email_address`
// (not `email`) is the key for an already-hashed value.
function setGoogleUserData(hashedEmail) {
    const userData = {sha256_email_address: hashedEmail};
    if (typeof window.gtag === 'function') window.gtag('set', 'user_data', userData);
    else window.dataLayer.push({user_data: userData});
}

// Ad platforms get the hash, never the address, the name or the phone number.
function withoutPii(payload) {
    return {...payload, email: undefined, phone: undefined, name: undefined};
}

async function sha256Hex(value) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // 64-char hex
}

function waitFor(getField, callback, checkInterval = 100, timeout = 10000) {
    const startTime = Date.now();

    function check() {
        const value = getField();
        if (value !== undefined) {
            callback(value);
        } else if (Date.now() - startTime >= timeout) {
            console.error('Timeout: Field not found: ' + getField.toString());
        } else {
            setTimeout(check, checkInterval);
        }
    }

    check();
}
setDorisWindowField('waitFor', waitFor);


function fp() {
    const detectedBrowser = brwsr(navigator.userAgent);
    setDorisWindowField('browser', detectedBrowser);
    return {
        user_agent: navigator.userAgent,
        detected_browser_name: detectedBrowser.name,
        detected_browser_version: detectedBrowser.version,
        platform: navigator.platform,
        browser_language: navigator.language,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        pixel_ratio: window.devicePixelRatio,
        cpu_cores: navigator.hardwareConcurrency || 0,
        timezone_offset: new Date().getTimezoneOffset(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    function brwsr(userAgent) {
        const browsers = [
            { name: "Edge", regex: new RegExp("Edg\\/(\\d+)") },
            { name: "Chrome", regex: new RegExp("Chrome\\/(\\d+)") },
            { name: "Firefox", regex: new RegExp("Firefox\\/(\\d+)") },
            { name: "Safari", regex: new RegExp("Version\\/(\\d+).*Safari") },
            { name: "Opera", regex: new RegExp("OPR\\/(\\d+)") },
            { name: "IE", regex: new RegExp("Trident\\/.*rv:(\\d+)") }
        ];

        for (let browser of browsers) {
            let match = userAgent.match(browser.regex);
            if (match) {
                return { name: browser.name, version: match[1] };
            }
        }

        return { name: "Unknown", version: "N/A" };
    }
}
window.addEventListener('DOMContentLoaded', async () => {
    const script = document.getElementById('doris-script');
    const url = new URL(script.src);
    const pageName = url.searchParams.get('pageName');
    const params = {};
    for (const [key, value] of url.searchParams.entries()) {
        params[key] = value;
    }
    const payload = {
        "name": pageName,
        "url": window.location.href,
        "fp": JSON.stringify(fp()),
        "data": {
            referer: document.referrer,
            host: window.location.hostname,
            ...params
        }
    };
    window.doris.saveEvent(payload)
});


window.addEventListener('DOMContentLoaded', () => {
    openWebinarPopup();
    bindRegisterRedirectCapture();
    maybeRedirectAfterRegister();
    cleanCacheBusterFromUrl();
    hydrateUser();
    bindHistoryBackLinks();
})

// Any `<a data-history-back href="...">` goes BACK in history when the visitor
// arrived from elsewhere on doris (e.g. the search results or a school profile),
// so "Back" returns them where they came from rather than a fixed page. When
// there's no same-site referrer (direct link, external, fresh tab) the href is
// left to act as a sensible fallback destination.
function bindHistoryBackLinks() {
    Array.from(document.querySelectorAll('[data-history-back]')).forEach(el => {
        el.addEventListener('click', (e) => {
            try {
                const ref = document.referrer;
                if (ref && new URL(ref).origin === window.location.origin && window.history.length > 1) {
                    e.preventDefault();
                    window.history.back();
                }
            } catch (_) {
                // fall through to the href fallback
            }
        });
    });
}

// Single fetch of /api/me on every page load. Sets window.doris.user once
// resolved; consumer JS files use waitFor(() => window.doris.user, ...) to
// avoid each making their own /api/me call.
//
// We also write the <meta name="app:email"> tag so synchronous post-hydration
// code (timers, second-click handlers) keeps working unchanged.
//
// Hydrates favourite UI on whichever page we're on:
//   - school profile (single .save-button using meta[name="app:school-id"])
//   - any element with [data-favourite-btn][data-school-id] (used by lists,
//     pillar pages, parent dashboard, compare cards) — Step 4/6 will populate
//     these data-* attributes on the templates.
function hydrateUser() {
    fetch('/api/me', {credentials: 'same-origin', headers: {'Accept': 'application/json'}})
        .then(r => r.ok ? r.json() : {favouriteSchoolIds: []})
        .catch(() => ({favouriteSchoolIds: []}))
        .then(user => {
            // Back-fill the meta tag so synchronous code that checks it keeps
            // working (e.g. openRegistrationModal at the 60s timer mark). Add
            // the tag for logged-in users; remove it for anonymous so a stale
            // cached "logged-in" page is corrected after hydration.
            const existingMeta = document.querySelector('meta[name="app:email"]');
            if (user && user.email) {
                let m = existingMeta;
                if (!m) {
                    m = document.createElement('meta');
                    m.setAttribute('name', 'app:email');
                    document.head.appendChild(m);
                }
                m.setAttribute('content', user.email);
            } else if (existingMeta) {
                existingMeta.remove();
            }

            // Hydrate favourite hearts on this page.
            const favIds = (user && user.favouriteSchoolIds) || [];
            applyFavouriteHydration(favIds);

            // Last step — signals readiness to any code using waitFor.
            window.doris.user = user || {favouriteSchoolIds: []};
            document.dispatchEvent(new CustomEvent('doris:user-ready', {detail: window.doris.user}));
        });
}

function applyFavouriteHydration(favouriteSchoolIds) {
    const favSet = new Set(favouriteSchoolIds);
    // The real figure, straight from /api/me. Everything after this is deltas.
    window.doris.setNavFaveCount(favSet.size);

    // 1. School profile / sub-pages — single school, identified by app:school-id meta.
    //    The existing markup is `.save-button` with an inner <svg> whose `fill`
    //    attribute toggles between '#3C72D7' (favourited) and 'none'.
    const schoolIdMeta = document.querySelector('meta[name="app:school-id"]');
    if (schoolIdMeta) {
        const thisSchoolId = schoolIdMeta.getAttribute('content');
        const isFavourited = favSet.has(thisSchoolId);
        document.querySelectorAll('.save-button svg').forEach(svg => {
            svg.setAttribute('fill', isFavourited ? '#3C72D7' : 'none');
        });
    }

    // 2. Any explicit [data-favourite-btn][data-school-id] elsewhere — for lists,
    //    pillar pages, etc. These hydrate by toggling .is-favourited and the SVG fill.
    document.querySelectorAll('[data-favourite-btn][data-school-id]').forEach(el => {
        const id = el.getAttribute('data-school-id');
        const fav = favSet.has(id);
        el.classList.toggle('is-favourited', fav);
        const svg = el.querySelector('svg');
        if (svg) svg.setAttribute('fill', fav ? '#3C72D7' : 'none');
    });
}

// When the register popup is opened, remember the page they were on so we can
// return them there after they finish registering / logging in.
// .modal-open-button is the canonical trigger used everywhere the popup is shown
// (doris.js auto-open, schoolListAndMap.js, cta-shortcut-gate.js, forum.js, etc.).
function bindRegisterRedirectCapture() {
    const openBtn = document.querySelector('#register-popup .modal-open-button');
    if (!openBtn) return;
    openBtn.addEventListener('click', () => {
        try {
            const here = location.pathname + location.search;
            if (here.startsWith('/parent/')) return; // don't loop back to /parent/* pages
            localStorage.setItem('register-redirect-to', JSON.stringify({url: here, ts: Date.now()}));
        } catch (e) {
            // localStorage may be disabled — fall through silently
        }
    });
    // The capture above only remembers WHERE they were. The redirect must only
    // fire when an auth journey actually started — otherwise a popup that was
    // opened and dismissed leaves a landmine that hijacks the next dashboard
    // visit (e.g. "View your shortlist" from Doris AI bouncing to the
    // homepage). Arm it when a register/login/OAuth link in the popup is
    // followed; maybeRedirectAfterRegister requires both keys.
    Array.from(document.querySelectorAll('#register-popup a[href^="/parent/"]')).forEach(a => {
        a.addEventListener('click', () => {
            try {
                localStorage.setItem('register-redirect-armed', String(Date.now()));
            } catch (e) { /* fall through */ }
        });
    });
}

// Runs on every page load: if we are landing on the parent dashboard right after
// a registration/login that originated from the popup, send them back.
function maybeRedirectAfterRegister() {
    if (!location.pathname.startsWith('/parent/dashboard')) return;
    let stored, armed;
    try {
        stored = localStorage.getItem('register-redirect-to');
        armed = localStorage.getItem('register-redirect-armed');
    } catch (e) { return; }
    if (!stored && !armed) return;
    try {
        // Single-shot either way: any dashboard visit clears both keys, so a
        // stale capture can never hijack a later visit.
        localStorage.removeItem('register-redirect-to');
        localStorage.removeItem('register-redirect-armed');
        // Only bounce when an auth journey actually started (an auth link in
        // the popup was followed) — a popup merely opened and dismissed must
        // not redirect the next dashboard visit.
        const armedTs = Number(armed);
        if (!stored || !armed || !Number.isFinite(armedTs) || Date.now() - armedTs > 30 * 60 * 1000) return;
        const {url, ts} = JSON.parse(stored);
        // 1 hour expiry — registration flows that take longer than this are abandoned.
        if (!url || typeof ts !== 'number' || Date.now() - ts > 60 * 60 * 1000) return;
        // Same-origin only — no protocol-relative or absolute URLs.
        if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return;
        // Cache-bust: school/pillar pages are served with `cache-control: public,
        // max-age=3600` and the cached copy is the logged-out HTML. Without a
        // unique URL the browser would serve from cache and the user would still
        // appear logged-out until they refreshed.
        const sep = url.includes('?') ? '&' : '?';
        location.replace(url + sep + '_=' + Date.now());
    } catch (e) {
        try {
            localStorage.removeItem('register-redirect-to');
            localStorage.removeItem('register-redirect-armed');
        } catch (_) {}
    }
}

// Strip the `_=<ts>` cache-buster set by maybeRedirectAfterRegister so the user
// doesn't see the ugly query param in their address bar.
function cleanCacheBusterFromUrl() {
    if (!location.search.includes('_=')) return;
    try {
        const params = new URLSearchParams(location.search);
        if (!params.has('_')) return;
        params.delete('_');
        const qs = params.toString();
        const cleaned = location.pathname + (qs ? '?' + qs : '') + location.hash;
        history.replaceState(history.state, '', cleaned);
    } catch (e) {
        // older browsers / unusual URLs — leave the param in place
    }
}

function isAnyPopupOpen() {
    return !!document.querySelector('.modal-content.visible:not(.invisible)');
}

// ---- the shortlist register wall ----
//
// An anonymous parent may save ANON_SHORTLIST_LIMIT schools. The next one they
// try to save opens the register modal AND does not go through: the school is
// not saved, the heart does not fill, nothing is pushed into any page's
// favourites array. Dismissing the modal has to leave them exactly where they
// were, otherwise registering is optional and the wall is theatre.
//
// Must be kept in step with ANON_SHORTLIST_LIMIT in src/schools/schoolsStore.ts,
// which is what actually enforces this — the server refuses the write and
// answers 'blocked'. This gate exists so the parent sees the ask instead of a
// click that silently does nothing.
const ANON_SHORTLIST_LIMIT = 2;
setDorisWindowField('ANON_SHORTLIST_LIMIT', ANON_SHORTLIST_LIMIT);

function currentParentEmail() {
    // Prefer the hydrated /api/me result; fall back to the server-rendered meta
    // tag for the brief pre-hydration window.
    if (window.doris && window.doris.user) return window.doris.user.email;
    const emailMeta = document.querySelector('meta[name="app:email"]');
    return emailMeta ? emailMeta.content : undefined;
}
setDorisWindowField('currentParentEmail', currentParentEmail);

// Opens the register modal with the shortlist ask. Also the fallback when the
// server answers 'blocked' on a click this gate let through (stale counts,
// a second tab, devtools).
setDorisWindowField('openShortlistRegisterPopup', openShortlistRegisterPopup);
function openShortlistRegisterPopup() {
    const opener = document.querySelector('#register-popup .modal-open-button');
    if (!opener) {
        window.location.href = '/parent/register';
        return;
    }
    const message = document.querySelector('#register-popup .parent-message');
    if (message) message.innerText = 'Sign up for free to save more schools to your shortlist';
    opener.click();
    saveEvent({name: 'register_popup_shown', data: {source: 'shortlist_wall', via: 'modal'}});
}

// Every school the parent has shortlisted, anywhere. Hydrated once from /api/me
// and kept current by rememberShortlisted. This is the count the wall works off
// — NOT the search page's own window.doris.favouritedSchools, which is scoped to
// the region being browsed and would let a parent with two Singapore schools
// save two more in Spain before the client noticed.
setDorisWindowField('shortlistedSchoolIds', shortlistedSchoolIds);
function shortlistedSchoolIds() {
    if (!window.doris.user || !window.doris.user.favouriteSchoolIds) return [];
    return window.doris.user.favouriteSchoolIds;
}

// true when this click must be refused. Callers check "is this an ADD?" first:
// taking a school back off the shortlist is never walled.
//
// Pre-hydration (/api/me still in flight) the count reads 0 and this lets the
// click through. That is on purpose: guessing "walled" would refuse a click from
// a registered parent. The server still refuses the write, and every caller
// handles the 'blocked' reply by reverting and showing the modal.
setDorisWindowField('shortlistWallHit', shortlistWallHit);
function shortlistWallHit() {
    if (currentParentEmail()) return false;
    if (shortlistedSchoolIds().length < ANON_SHORTLIST_LIMIT) return false;
    openShortlistRegisterPopup();
    return true;
}

// Keeps the list above honest as schools are saved and un-saved. Un-saving MUST
// prune: a stale-high count would wall a parent who is back under their
// allowance, and the school page, search page and pillar pages all share it.
setDorisWindowField('rememberShortlisted', rememberShortlisted);
function rememberShortlisted(schoolId, isShortlisted) {
    const user = window.doris.user || {};
    const ids = (user.favouriteSchoolIds || []).filter(id => id !== schoolId);
    if (isShortlisted) ids.push(schoolId);
    user.favouriteSchoolIds = ids;
    window.doris.user = user;
    return ids;
}

setDorisWindowField('openRegistrationModal', openRegistrationModal);
function openRegistrationModal() {
    const emailMeta = document.querySelector('meta[name="app:email"]');
    const email = emailMeta ? emailMeta.content : null;
    const openRegistrationPrompt = document.querySelector('#register-popup .modal-open-button');
    const shownTimes = Number(localStorage.getItem('shown-registration-prompt') || '0');
    if (!email && openRegistrationPrompt) {
        setTimeout(() => {
            if (isAnyPopupOpen()) return;
            localStorage.setItem('shown-registration-prompt', (shownTimes + 1).toString());
            saveEvent({name: 'user/registration-prompt', data: {shown_times: shownTimes + 1}});
            const signupMessage = 'Join the doris community';
            document.querySelector('#register-popup .parent-message').innerText = signupMessage;
            openRegistrationPrompt.click();
        }, 60000 + (shownTimes * 90000));
    }
}

function openWebinarPopup() {
    const popup = document.querySelector('#webinar-popup .modal-open-button');
    if (!popup) return;
    const shownTimes = Number(localStorage.getItem('shown-webinar-popup') || '0');
    if (shownTimes >= 3) return;
    const delayMs = 30000 + (shownTimes * 60000);
    setTimeout(function () {
        if (isAnyPopupOpen()) return;
        localStorage.setItem('shown-webinar-popup', (shownTimes + 1).toString());
        saveEvent({name: 'user/webinar-popup', data: {shown_times: shownTimes + 1}});
        popup.click();
    }, delayMs);
    handleWebinarCarousel();
    document.querySelectorAll('.webinar-register-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            saveEvent({name: 'user/webinar-click-through', data: {href: btn.href}});
        });
    });
}

function handleWebinarCarousel() {
    const container = document.getElementById('webinar-popup');
    if (!container) return;
    container.querySelectorAll('.retargeting-carousel').forEach(function (carousel) {
        const wrapper = carousel.parentElement;
        const dots = wrapper.querySelectorAll('.retargeting-dot');
        const leftArrow = wrapper.querySelector('.retargeting-arrow-left');
        const rightArrow = wrapper.querySelector('.retargeting-arrow-right');
        const imageCount = carousel.querySelectorAll('img').length;
        if (imageCount < 2) return;

        function updateArrows(currentIndex) {
            if (leftArrow) leftArrow.style.display = currentIndex > 0 ? 'flex' : 'none';
            if (rightArrow) rightArrow.style.display = currentIndex < imageCount - 1 ? 'flex' : 'none';
        }

        carousel.addEventListener('scroll', function () {
            const scrollLeft = carousel.scrollLeft;
            const width = carousel.offsetWidth;
            const currentIndex = Math.round(scrollLeft / width);
            dots.forEach(function (dot, idx) {
                dot.classList.toggle('bg-white', idx === currentIndex);
                dot.classList.toggle('bg-white/50', idx !== currentIndex);
            });
            updateArrows(currentIndex);
        });

        if (leftArrow) leftArrow.addEventListener('click', function () {
            carousel.scrollBy({ left: -carousel.offsetWidth, behavior: 'smooth' });
        });
        if (rightArrow) rightArrow.addEventListener('click', function () {
            carousel.scrollBy({ left: carousel.offsetWidth, behavior: 'smooth' });
        });
    });
}


function debounce(func, namespace, delay = 50) {
    if (window.doris.debouncers && window.doris.debouncers[namespace]) {
        clearTimeout(window.doris.debouncers[namespace]);
        window.doris.debouncers[namespace] = setTimeout(func, delay);
    } else {
        if (window.doris.debouncers) {
            window.doris.debouncers[namespace] = setTimeout(func, delay);
        } else {
            window.doris.debouncers = {[namespace]: setTimeout(func, delay)};
        }
    }
}

setDorisWindowField('debounce', debounce);

trackEngagement();

// A "school profile view" is a genuine, dwelt-on view of a school profile or
// one of its satellite pages (Essentials, Fees, Academics, …) — NOT a click in
// the search list/map and NOT a side-effect of a lead. We fire it once, after
// the visitor has spent 10 cumulative *visible* seconds on the page (time while
// the tab is backgrounded doesn't count), so it stays a trustworthy top-of-
// funnel conversion for the ad platforms. All profile + satellite pages carry a
// pageName beginning "school/profile" (see pageNames in dorisJs.ts).
trackSchoolProfileView();
function trackSchoolProfileView() {
    const script = document.getElementById('doris-script');
    if (!script) return;
    let pageName = '';
    try { pageName = new URL(script.src).searchParams.get('pageName') || ''; } catch (e) { return; }
    if (pageName.indexOf('school/profile') !== 0) return;

    const DWELL_SECONDS = 10;
    let visibleSeconds = 0;
    let fired = false;
    const interval = setInterval(() => {
        if (document.hidden) return;
        visibleSeconds += 1;
        if (visibleSeconds < DWELL_SECONDS || fired) return;
        fired = true;
        clearInterval(interval);
        const schoolIdMeta = document.querySelector('meta[name="app:school-id"]');
        const schoolId = schoolIdMeta ? schoolIdMeta.content : undefined;
        window.doris.trackEvent('school_profile_view', {school_id: schoolId, page: pageName});
    }, 1000);
}

function trackEngagement() {
    const script = document.getElementById('doris-script');
    const url = new URL(script.src);
    const pageName = url.searchParams.get('pageName');

    let engagedTime = 0;
    let lastActive = Date.now();
    let isWindowActive = true;
    let idleTimeout;
    let fallbackTimeout;
    let hasReported = false;

    const IDLE_THRESHOLD = 20000; // 20 secs
    const FALLBACK_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours

    function updateLastActive() {
        lastActive = Date.now();
        isWindowActive = true;

        clearTimeout(idleTimeout);
        idleTimeout = setTimeout(() => {
            isWindowActive = false;
        }, IDLE_THRESHOLD);

        resetFallbackTimer();
    }

    function visibilityChangeHandler() {
        isWindowActive = !document.hidden;
        if (isWindowActive) updateLastActive();
    }

    function trackEngagedTime() {
        setInterval(() => {
            if (isWindowActive && (Date.now() - lastActive < IDLE_THRESHOLD)) {
                engagedTime += 1;
            }
        }, 1000);
    }

    function reportEngagedTime(reason = 'beforeunload') {
        if (hasReported) return;
        hasReported = true;
        const schoolIdMeta = document.querySelector('meta[name="app:school-id"]');
        const schoolId = schoolIdMeta ? schoolIdMeta.content : undefined;

        saveEvent({
            name: 'user/engagement-time',
            data: {
                page: pageName,
                seconds: engagedTime,
                reason,
                school_id: schoolId
            }
        });
    }

    function resetFallbackTimer() {
        clearTimeout(fallbackTimeout);
        fallbackTimeout = setTimeout(() => {
            reportEngagedTime('fallback_timeout');
        }, FALLBACK_THRESHOLD);
    }

    const activityEvents = [
        'mousemove', 'touchstart', 'touchmove', 'focus', 'blur',
        'keydown', 'scroll', 'click'
    ];

    activityEvents.forEach(event =>
        document.addEventListener(event, e => {
            debounce(updateLastActive, 'doris-' + e.type, 500);
        }, { passive: true })
    );

    document.addEventListener('visibilitychange', visibilityChangeHandler);

    window.addEventListener('pagehide', event => {
        if (!event.persisted) {
            reportEngagedTime('pagehide');
        }
    });

    // Fallback for cases when pagehide doesn't fire
    window.addEventListener('beforeunload', () => {
        reportEngagedTime('beforeunload');
    });

    window.addEventListener('pageshow', event => {
        if (event.persisted) {
            hasReported = false;
            updateLastActive();
            resetFallbackTimer();
        }
    });

    updateLastActive();
    trackEngagedTime();
    resetFallbackTimer();
}

function saveEvent(event) {
    return navigator.sendBeacon('/api/v1/events', JSON.stringify(event));
}
setDorisWindowField('saveEvent', saveEvent);

function getFbCookies() {
    return { fbp: getOrCreateFbp(), fbc: getOrCreateFbc() };
}

function getOrCreateFbp() {
    const existing = readFbCookie('_fbp');
    if (existing) return existing;
    const subdomainIndex = fbSubdomainIndex();
    const rand = crypto.getRandomValues(new Uint32Array(1))[0];
    const fbp = `fb.${subdomainIndex}.${Date.now()}.${rand}`;
    setFbCookie('_fbp', fbp, 90);
    return fbp;
}

function getOrCreateFbc() {
    const raw = new URLSearchParams(window.location.search).get('fbclid');
    // Facebook click IDs are constrained tokens — accept only the safe
    // charset and bound length. Without this, a crafted `?fbclid=…;path=/`
    // value lets the attacker inject extra cookie attributes (cookie
    // bombing, attribute override) via the `;`-as-delimiter in
    // document.cookie. Restricting to [A-Za-z0-9._-] prevents that.
    const fbclid = raw && /^[A-Za-z0-9._-]{1,512}$/.test(raw) ? raw : null;
    const existing = readFbCookie('_fbc');
    if (existing && (!fbclid || existing.split('.').pop() === fbclid)) return existing;
    if (!fbclid) return existing;
    const fbc = `fb.${fbSubdomainIndex()}.${Date.now()}.${fbclid}`;
    setFbCookie('_fbc', fbc, 90);
    return fbc;
}

function fbSubdomainIndex() {
    return window.location.hostname.split('.').length - 1;
}

function readFbCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return match ? match[1] : null;
}

function setFbCookie(name, value, days) {
    const parts = window.location.hostname.split('.');
    const domain = parts.length >= 2 ? '.' + parts.slice(-2).join('.') : window.location.hostname;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; domain=${domain}; SameSite=Lax`;
}

function trackClicks() {
    document.querySelectorAll(".tracked").forEach(el => {
        trackClick(el);
    })
}

window.addEventListener('DOMContentLoaded', () => {
    trackClicks();
})

window.doris.trackClick = trackClick;
    function trackClick(el) {
    if (!el) return;
    el.addEventListener('click', () => {
        const data = JSON.parse(el.dataset.data)
        const name = el.dataset.name || 'external_link_click';
        const target = el.dataset.target;
        const email = data.email;

        // A lead fired through a direct contact channel (WhatsApp, IG/FB DM,
        // WeChat, LINE, phone, email) is our highest-intent signal — surface it
        // as its own conversion so ad platforms can optimise on "enquired via a
        // channel" specifically, not just the broad school_profile_lead bucket.
        // (school_profile_lead still fires below for every lead, channel or not.)
        if (name === 'school_profile_lead' && isEnquiryChannel(target)) {
            window.doris.trackEvent('enquiry_channel_click', {channel: target, school_id: data.school_id});
        }

        const eventName = name.toLowerCase();
        const detail = {...data, target, email}
        window.doris.trackEvent(eventName, detail);
    })
}
setDorisWindowField('trackClick', trackClick);

window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.back-button').forEach(el => {
        el.addEventListener('click', (e) => {
          window.history.back();
        })
    })
})

function modals() {
    const modals = document.querySelectorAll('.modal-container');
    modals.forEach(thisModal => {
        const modalContent = thisModal.querySelector('.modal-content')
        if (!modalContent) return;

        thisModal.querySelector('.modal-open-button').addEventListener('click', () => show(modalContent))
        thisModal.querySelector('.modal-background').addEventListener('click', () => hide(modalContent))
        thisModal.querySelectorAll('.modal-exit').forEach(el => el.addEventListener('click', (ev) => {
            ev.preventDefault();
            hide(modalContent);
        }))

        window.addEventListener('keydown', ev => {
            if (ev.key === 'Escape') {
                hide(modalContent);
            }
        })

        const navContainer = thisModal.querySelector('.modal-close-on-click');
        if (navContainer) {
            navContainer.addEventListener('click', (ev) => {
                // Check if the clicked element (or its parent) is a link
                if (ev.target.closest('a')) {
                    hide(modalContent);
                }
            });
        }

        function show(modal) {
            document.querySelector('body').style.overflow = 'hidden';
            modal.classList.remove("opacity-0", "invisible");
            modal.classList.add("opacity-100", "visible");
        }
        function hide(modal) {
            document.querySelector('body').style.overflow = 'scroll';
            modal.classList.remove("opacity-100", "visible");
            modal.classList.add("opacity-0", "invisible");
        }
    })
}
window.addEventListener('DOMContentLoaded', () => {
    modals();
})

setDorisWindowField('toLocaleMoney', toLocaleMoney);
function toLocaleMoney(fees, withCurrency = true, currency = "USD") {
    const maxDigits = 0;
    const locale = navigator.language || 'en-US';

    try {
        return new Intl.NumberFormat(locale, {
            style: withCurrency ? "currency" : "decimal",
            currency: withCurrency ? currency : undefined,
            maximumFractionDigits: maxDigits
        }).format(fees);
    } catch (e) {
        console.warn("Intl.NumberFormat failed:", e);
        return `${withCurrency ? currency + " " : ""}${Math.round(fees)}`;
    }
}

setDorisWindowField('fromLocaleMoney', fromLocaleMoney);
function fromLocaleMoney(str, locale = navigator.language || "en-US") {
    // Detect separators using the locale
    const example = Intl.NumberFormat(locale).format(11111.1);
    const group = example[2];   // thousands separator
    const decimal = example[example.length - 2]; // decimal separator

    let normalized = str;

    // Remove currency symbols and whitespace
    normalized = normalized.replace(/[^\d\-\+\.,]/g, '');
    // Remove grouping separator
    const groupRegex = new RegExp('\\' + group, 'g');
    normalized = normalized.replace(groupRegex, '');
    // Replace decimal separator with "."
    const decRegex = new RegExp('\\' + decimal, 'g');
    normalized = normalized.replace(decRegex, '.');
    // Parse to number
    const num = Number(normalized);
    return isNaN(num) ? null : num;
}

setDorisWindowField('handleCollapsibleSections', handleCollapsibleSections)
function handleCollapsibleSections() {
    const schoolIdMeta = document.querySelector('meta[name="app:school-id"]');
    const schoolId = schoolIdMeta ? schoolIdMeta.content : undefined;
    const headers = document.querySelectorAll('.collapsible-header');
    const openedSections = new Set();

    headers.forEach(header => {
        header.addEventListener('click', (e) => {
            const section = header.dataset.name;
            const id = schoolId || header.dataset.schoolId;
            // Track expansion only the first time this section is opened
            if (id && section && !openedSections.has(section)) {
                openedSections.add(section);
                window.doris.saveEvent({
                    name: 'view-section/school/profile',
                    data: {name: section, school_id: schoolId}
                });
            }
        }, {once: true});
    });
}


setDorisWindowField('hamburgerMenuSchoolProfilePage', hamburgerMenuSchoolProfilePage)
function hamburgerMenuSchoolProfilePage() {
    if (window.__dorisHamburgerInit) return;
    window.__dorisHamburgerInit = true;
    const hamburgerButton = document.getElementById('hamburger-button');
    const hamburgerButtonDesktop = document.getElementById('hamburger-button-desktop');
    const openDrawerEl = document.getElementById('open-drawer');
    const closeButton = document.getElementById('close-drawer');
    const drawer = document.getElementById('drawer');

    if (!closeButton || !drawer) {
        return;
    }

    function openDrawer() {
        drawer.classList.remove('translate-x-full');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        drawer.classList.add('translate-x-full');
        document.body.style.overflow = '';
    }

    if (hamburgerButton) {
        hamburgerButton.addEventListener('click', openDrawer);
    }
    if (hamburgerButtonDesktop) {
        hamburgerButtonDesktop.addEventListener('click', openDrawer);
    }
    if (openDrawerEl) {
        openDrawerEl.addEventListener('click', openDrawer);
    }
    closeButton.addEventListener('click', closeDrawer);

    // Clicking anywhere off the drawer closes it, the same way the search page's filter
    // drawer behaves. Before this the only way out was the X, which is easy to miss when
    // the drawer was opened just to reach the currency switcher.
    //
    // Gated on the drawer being open, so while closed this costs one class check per
    // click. The openers are excluded because their own click bubbles to document, and
    // without that the drawer would close in the same gesture that opened it.
    // Every control that OPENS the drawer has to be excluded, or its own click bubbles to
    // document with the drawer already open and closes it in the same gesture. Note
    // `.currency-open-btn` is not wired through openDrawer above: toggleCurrencySelector
    // opens the drawer itself and then expands the currency list inside it, so it has to
    // be listed here too. Anything new that opens the drawer belongs in this selector.
    const DRAWER_OPENERS = '#hamburger-button, #hamburger-button-desktop, #open-drawer, .currency-open-btn';
    document.addEventListener('click', function (e) {
        if (drawer.classList.contains('translate-x-full')) return;
        if (drawer.contains(e.target)) return;
        if (e.target.closest && e.target.closest(DRAWER_OPENERS)) return;
        closeDrawer();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !drawer.classList.contains('translate-x-full')) closeDrawer();
    });
}

setDorisWindowField('toggleCurrencySelector', toggleCurrencySelector)
function toggleCurrencySelector() {
    if (window.__dorisCurrencyInit) return;
    window.__dorisCurrencyInit = true;

    const currencyToggleMobile = document.getElementById('currency-toggle-mobile');
    const currencyListMobile = document.getElementById('currency-list-mobile');
    const currencyArrowMobile = document.getElementById('currency-arrow-mobile');

    if (currencyToggleMobile && currencyListMobile && currencyArrowMobile) {
        currencyToggleMobile.addEventListener('click', function() {
            const isHidden = currencyListMobile.classList.toggle('hidden');
            // Rotate arrow: right (0deg) -> down (90deg)
            if (isHidden) {
                currencyArrowMobile.style.transform = 'rotate(0deg)';
            } else {
                currencyArrowMobile.style.transform = 'rotate(90deg)';
                revealCurrencySection();
            }
        });
    }

    // Filter the flat 78-currency list. Matches the code, the currency name and
    // the country names (English and local) that the server put in
    // data-currency-search, so "spain" finds EUR and "dirham" finds AED. Every
    // whitespace-separated token must match, so "south dollar" narrows.
    const currencySearch = document.getElementById('currency-search');
    if (currencySearch) {
        const rows = document.querySelectorAll('.currency-option-mobile[data-currency-search]');
        const noMatch = document.getElementById('currency-no-match');
        currencySearch.addEventListener('input', function() {
            const tokens = currencySearch.value.toLowerCase().split(/\s+/).filter(function(t) { return t.length > 0; });
            let shown = 0;
            for (let i = 0; i < rows.length; i++) {
                const haystack = rows[i].getAttribute('data-currency-search') || '';
                let matches = true;
                for (let t = 0; t < tokens.length; t++) {
                    if (haystack.indexOf(tokens[t]) === -1) { matches = false; break; }
                }
                rows[i].classList.toggle('hidden', !matches);
                if (matches) shown++;
            }
            if (noMatch) noMatch.classList.toggle('hidden', shown > 0);
        });
        // Escape clears the filter rather than closing the drawer out from under
        // someone who is mid-search.
        currencySearch.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && currencySearch.value !== '') {
                e.stopPropagation();
                currencySearch.value = '';
                currencySearch.dispatchEvent(new Event('input'));
            }
        });
    }

    // Show which currency is actually active. The drawer radios were never
    // checked on load, so the selected row rendered identically to the other 77.
    const activeOnLoad = localStorage.getItem('currency') || 'USD';
    const activeRadio = document.querySelector('.currency-option-mobile input[value="' + activeOnLoad + '"]');
    if (activeRadio) activeRadio.checked = true;

    // Mobile currency selector options
    const currencyOptionsMobile = document.querySelectorAll('.currency-option-mobile');
    if (currencyOptionsMobile.length > 0) {
        currencyOptionsMobile.forEach(option => {
            option.addEventListener('click', function() {
                const previousCurrency = localStorage.getItem('currency') || 'USD';
                const selectedCurrency = this.getAttribute('data-currency');

                // If the school-list filter form has a matching currency radio,
                // click it first. Its change handler reads localStorage for the
                // previous currency, so we must trigger it BEFORE setting the
                // new currency ourselves — otherwise the fee-slider exchange
                // calculation gets the wrong rate. On pages without the filter
                // form (everywhere except /schools), fall through to the
                // direct localStorage update.
                const filterRadio = document.querySelector('form[name="currency"] input[value="' + selectedCurrency + '"]');
                if (filterRadio && !filterRadio.checked) {
                    // handleChangeCurrency in schoolListAndMap.js owns the whole
                    // update from here: localStorage, the fee slider reprice, the
                    // result list, the conversion pass and the change_currency
                    // event. Doing any of it again below would double-count the
                    // event, so delegate and stop.
                    filterRadio.click();
                } else {
                    if (!filterRadio) localStorage.setItem('currency', selectedCurrency);
                    convertFeesToSelectedCurrency();
                    // Track currency change event
                    window.doris.saveEvent({name: 'change_currency', data: {from: previousCurrency, to: selectedCurrency}});
                }
                // Hide the list after selection
                if (currencyListMobile) {
                    currencyListMobile.classList.add('hidden');
                }
                // Close the hamburger drawer
                const drawer = document.getElementById('drawer');
                if (drawer) {
                    drawer.classList.add('translate-x-full');
                    document.body.style.overflow = '';
                }
            });
        });
    }

    const currencyFeeSelect = document.getElementById('currency-fee-select');
    if (currencyFeeSelect) {
        currencyFeeSelect.value = localStorage.getItem('currency') || 'USD';
        currencyFeeSelect.addEventListener('change', function() {
            const previousCurrency = localStorage.getItem('currency') || 'USD';
            localStorage.setItem('currency', this.value);
            convertFeesToSelectedCurrency();
            window.doris.saveEvent({name: 'change_currency', data: {from: previousCurrency, to: this.value}});
        });
    }

    // Header currency button: open the slide-out drawer + auto-expand the currency section
    const drawer = document.getElementById('drawer');
    document.querySelectorAll('.currency-open-btn').forEach(btn => {
        if (btn.dataset.currencyBound === '1') return;
        btn.dataset.currencyBound = '1';
        btn.addEventListener('click', () => {
            if (drawer) {
                drawer.classList.remove('translate-x-full');
                document.body.style.overflow = 'hidden';
            }
            if (currencyListMobile && currencyListMobile.classList.contains('hidden')) {
                currencyListMobile.classList.remove('hidden');
                if (currencyArrowMobile) currencyArrowMobile.style.transform = 'rotate(90deg)';
            }
            // The currency section is the last thing in the drawer, below ~11 nav
            // links, so opening the drawer from the nav's currency button used to
            // land you at the top with the currency list off-screen entirely.
            revealCurrencySection();
        });
    });

    // Sync the active-currency label in any header button
    const activeCurrency = localStorage.getItem('currency') || 'USD';
    document.querySelectorAll('.currency-active-label').forEach(el => { el.textContent = activeCurrency; });
}

// Scroll the drawer to its currency section and focus the search box, so opening
// currency from the nav puts the cursor where typing already works. Deferred a
// frame because the section is un-hidden in the same tick and has no height yet.
// Focus is skipped on touch devices: it would raise the keyboard over the list.
function revealCurrencySection() {
    const section = document.getElementById('currency-toggle-mobile');
    const drawer = document.getElementById('drawer');
    if (!section || !drawer) return;
    // Deferred a frame: the list is un-hidden in the same tick, so the section
    // has no height yet and any offset measured now is the collapsed one.
    setTimeout(function() {
        // scrollTop directly, not scrollIntoView: the drawer is position:fixed, so
        // it is the offsetParent, and scrollIntoView picks its own scroll container
        // and its own final offset. Setting scrollTop is deterministic.
        //
        // Subtract the close button's sticky bar, or it lands on top of the
        // "Currency" heading: sticky elements are out of flow, so they cover the
        // scrolled-to position rather than pushing it down. Measured off the
        // button's own parent because the two drawers size that bar differently.
        const closeButton = document.getElementById('close-drawer');
        const stickyBar = closeButton ? closeButton.parentElement : null;
        const stickyHeight = stickyBar ? stickyBar.offsetHeight : 0;
        drawer.scrollTop = section.offsetTop - stickyHeight - 8;
        const search = document.getElementById('currency-search');
        // Not on touch: focusing raises the keyboard over the list the parent came
        // to look at. They can tap the box themselves if they want to type.
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (search && !isTouch) search.focus();
    }, 50);
}

// Auto-init the drawer + currency UI on every page that renders them.
// Idempotent — safe to call alongside the explicit page-level callers (school-profile.js etc).
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('drawer')) hamburgerMenuSchoolProfilePage();
    if (document.getElementById('currency-toggle-mobile') || document.querySelector('.currency-open-btn')) {
        toggleCurrencySelector();
    }
    if (localStorage.getItem('currency')) convertFeesToSelectedCurrency();
});


function getExchangeRate(from, to) {
    // USD value per 1 unit of each currency (3 significant figures, last refreshed 2026-05-08 from open.er-api.com)
    const toUSD = {
        USD: 1,        GBP: 1.36,   EUR: 1.17,   SGD: 0.789,  MYR: 0.256,  THB: 0.0311,
        BND: 0.789,    HKD: 0.128,  VND: 0.0000382, KRW: 0.000688, JPY: 0.00639,
        KHR: 0.000249, LAK: 0.0000461, RMB: 0.147,  TWD: 0.0318, IDR: 0.0000577, INR: 0.0106,
        MMK: 0.000476, PHP: 0.0165, PKR: 0.00358,
        BHD: 2.66,     JOD: 1.41,   OMR: 2.60,   QAR: 0.275,  SAR: 0.267,  AED: 0.272,
        NOK: 0.108,    SEK: 0.108,  CHF: 1.28,   PLN: 0.278,  CZK: 0.0483, HUF: 0.00329,
        RON: 0.224,    DKK: 0.157,  BAM: 0.601,  BGN: 0.601,  GEL: 0.372,  RSD: 0.0100,
        ARS: 0.000719, BRL: 0.203,  CAD: 0.733,  CLP: 0.00112, COP: 0.000270, MXN: 0.0579,
        PEN: 0.289,    CRC: 0.00219, DOP: 0.0168,
        ZAR: 0.0610,   KES: 0.00774, NGN: 0.000737, EGP: 0.0190, ETB: 0.00642,
        MAD: 0.109,    MUR: 0.0214, UGX: 0.000267,
        GHS: 0.0889,   XOF: 0.00179, RWF: 0.000683, TZS: 0.000385, TND: 0.347, ZMW: 0.0525, ZWL: 0.0392,
        BDT: 0.00815,  LKR: 0.00312, NPR: 0.00662,
        MOP: 0.124,    MVR: 0.0649, BTN: 0.0106,
        AUD: 0.723,    NZD: 0.595,
        KWD: 3.25,     LBP: 0.0000112, TRY: 0.0221, IQD: 0.000763, RUB: 0.0120,
        KZT: 0.00216,  UZS: 0.0000824, AZN: 0.588, AMD: 0.00271, MNT: 0.000281, KGS: 0.0114, TJS: 0.107, TMT: 0.286
    };
    if (from === to) return 1;
    const fromRate = toUSD[from];
    const toRate = toUSD[to];
    if (!fromRate || !toRate) return 1;
    return fromRate / toRate;
}


// Detect currency code from a currency symbol or code in text
function detectCurrencyFromText(text) {
    const symbolToCurrency = {
        'US$': 'USD',
        'A$': 'AUD',
        'NZ$': 'NZD',
        'CA$': 'CAD',
        'S$': 'SGD',
        'HK$': 'HKD',
        'TW$': 'TWD',
        'NT$': 'TWD',
        'MX$': 'MXN',
        'CN¥': 'RMB',
        'JP¥': 'JPY',
        '¥': 'JPY', // Could be JPY or RMB, default to JPY
        '£': 'GBP',
        'E£': 'EGP',
        'L£': 'LBP',
        '₽': 'RUB',
        '€': 'EUR',
        '$': 'USD', // Default $ to USD
        'RM': 'MYR',
        '฿': 'THB',
        '₫': 'VND',
        '₩': 'KRW',
        '៛': 'KHR',
        '₭': 'LAK',
        '₱': 'PHP',
        'Rp': 'IDR',
        '₹': 'INR',
        'Rs': 'PKR',
        'R$': 'BRL',
        '₺': 'TRY',
        '₼': 'AZN',
        '₸': 'KZT',
        '₮': 'MNT',
        '֏': 'AMD',
        '৳': 'BDT',
        '₾': 'GEL',
        'zł': 'PLN',
        '₡': 'CRC',
        '₦': 'NGN',
        '₵': 'GHS',
        'Kč': 'CZK',
        'лв': 'BGN',
        'RD$': 'DOP',
        'MOP$': 'MOP',
    };

    // Check for explicit currency codes first (most reliable)
    // Require space or start of string before the code to avoid matching inside words like "term" -> "RM"
    const codeMatch = text.match(/(?:^|[\s])(USD|GBP|EUR|SGD|MYR|THB|BND|HKD|VND|KRW|JPY|KHR|LAK|RMB|TWD|IDR|INR|MMK|PHP|PKR|MOP|MVR|BTN|BHD|JOD|OMR|QAR|SAR|AED|KWD|LBP|TRY|IQD|RUB|GHS|XOF|RWF|TZS|TND|ZMW|ZWL|BDT|LKR|NPR|AUD|NZD|KZT|UZS|AZN|AMD|MNT|KGS|TJS|TMT|BAM|BGN|CZK|DKK|GEL|HUF|NOK|PLN|RON|RSD|SEK|CHF|ARS|BRL|CAD|CLP|COP|CRC|DOP|MXN|PEN|EGP|ETB|KES|MUR|MAD|NGN|ZAR|UGX)\b/i);
    if (codeMatch) {
        return codeMatch[1].toUpperCase();
    }

    // Check for currency symbols (order matters - check longer symbols first)
    // For letter-based symbols like RM and Rp, require they're followed by a digit or space to avoid matching inside words
    const symbolPatterns = [
        // Longest $ symbols first to avoid bare $ matching prematurely
        { symbol: 'US$', pattern: /US\$/ },
        { symbol: 'A$', pattern: /A\$/ },
        { symbol: 'NZ$', pattern: /NZ\$/ },
        { symbol: 'CA$', pattern: /CA\$/ },
        { symbol: 'MX$', pattern: /MX\$/ },
        { symbol: 'RD$', pattern: /RD\$/ },
        { symbol: 'MOP$', pattern: /MOP\$/ },
        { symbol: 'R$', pattern: /R\$/ },
        { symbol: 'S$', pattern: /S\$/ },
        { symbol: 'HK$', pattern: /HK\$/ },
        { symbol: 'TW$', pattern: /TW\$/ },
        { symbol: 'NT$', pattern: /NT\$/ },
        // Longest ¥/£ symbols first
        { symbol: 'CN¥', pattern: /CN¥/ },
        { symbol: 'JP¥', pattern: /JP¥/ },
        { symbol: 'E£', pattern: /E£/ },
        { symbol: 'L£', pattern: /L£/ },
        // Letter-based symbols (require word boundary context)
        { symbol: 'RM', pattern: /(?:^|[\s])RM[\s\d]/ },
        { symbol: 'Rp', pattern: /(?:^|[\s])Rp[\s\d]/ },
        { symbol: 'Rs', pattern: /(?:^|[\s])Rs[\s\d]/ },
        // Single-char symbols
        { symbol: '¥', pattern: /¥/ },
        { symbol: '£', pattern: /£/ },
        { symbol: '€', pattern: /€/ },
        { symbol: '฿', pattern: /฿/ },
        { symbol: '₫', pattern: /₫/ },
        { symbol: '₩', pattern: /₩/ },
        { symbol: '₹', pattern: /₹/ },
        { symbol: '₱', pattern: /₱/ },
        { symbol: '៛', pattern: /៛/ },
        { symbol: '₭', pattern: /₭/ },
        { symbol: '₺', pattern: /₺/ },
        { symbol: '₼', pattern: /₼/ },
        { symbol: '₸', pattern: /₸/ },
        { symbol: '₮', pattern: /₮/ },
        { symbol: '֏', pattern: /֏/ },
        { symbol: '৳', pattern: /৳/ },
        { symbol: '₾', pattern: /₾/ },
        { symbol: '₡', pattern: /₡/ },
        { symbol: '₦', pattern: /₦/ },
        { symbol: '₵', pattern: /₵/ },
        { symbol: 'zł', pattern: /zł/ },
        { symbol: 'Kč', pattern: /Kč/ },
        { symbol: 'лв', pattern: /лв/ },
        { symbol: '₽', pattern: /₽/ },
        // Bare $ last — only matches if no prefix letter matched above
        { symbol: '$', pattern: /\$/ },
    ];
    for (const { symbol, pattern } of symbolPatterns) {
        if (pattern.test(text)) {
            return symbolToCurrency[symbol];
        }
    }

    return null; // Could not detect currency
}

// Cheap pre-test: bail before running the heavy alternation regex.
// Letter-based codes guarded so words like "iron" / "form" / "Hufflepuff"
//   don't false-positive on RON / RM / HUF.
// No regex lookbehind anywhere in this file: a lookbehind LITERAL is a parse
//   error on Safari < 16.4 and kills the entire script (test/public/
//   legacyBrowserSyntax.spec.ts pins this). `(?:^|[^a-zA-Z])` is safe here
//   because this regex is only ever used with .test().
const __currencyQuickTest = /[$£€¥฿₫₩₹₱₭₺₼₸₮֏৳₾₡₦₵₽]|(?:^|[^a-zA-Z])(?:US\$|A\$|NZ\$|CA\$|MX\$|RD\$|MOP\$|R\$|S\$|HK\$|TW\$|NT\$|CN¥|JP¥|E£|L£|zł|Kč|лв|៛|RM|Rp|Rs|USD|GBP|EUR|SGD|MYR|THB|BND|HKD|VND|KRW|JPY|KHR|LAK|RMB|TWD|IDR|INR|MMK|PHP|PKR|MOP|MVR|BTN|BHD|JOD|OMR|QAR|SAR|AED|KWD|LBP|TRY|IQD|RUB|GHS|XOF|RWF|TZS|TND|ZMW|ZWL|BDT|LKR|NPR|AUD|NZD|KZT|UZS|AZN|AMD|MNT|KGS|TJS|TMT|BAM|BGN|CZK|DKK|GEL|HUF|NOK|PLN|RON|RSD|SEK|CHF|ARS|BRL|CAD|CLP|COP|CRC|DOP|MXN|PEN|EGP|ETB|KES|MUR|MAD|NGN|ZAR|UGX)(?![a-zA-Z])/;

// `\b` (not lookbehind — Safari < 16.4 throws even from new RegExp) so the
// match stays zero-width-anchored: the regexes built from this are used with
// .replace() and must not consume the character before RM/Rp/Rs.
// The ISO codes and letter-based symbols (RM/Rp/Rs) share a `\b` so a code
// never matches mid-word — "ARS" inside "Ye|ars|", "RON" inside "i|ron|",
// "HUF" inside "|Huf|flepuff". `\b` is zero-width (won't consume the preceding
// char in .replace) and, unlike a lookbehind, parses on Safari < 16.4. The
// non-word-leading symbols ($, £, €, ฿…, лв, ៛) stay OUTSIDE the `\b` group:
// a boundary before a non-word char fails after a space, which would break
// e.g. " €100".
const __currencySymbols = '(?:US\\$|A\\$|NZ\\$|CA\\$|MX\\$|RD\\$|MOP\\$|R\\$|S\\$|HK\\$|TW\\$|NT\\$|\\$|E£|L£|£|€|฿|₫|₩|₹|₱|₺|₼|₸|₮|֏|৳|₾|₡|₦|₵|₽|zł|Kč|лв|CN¥|៛|₭|JP¥|\\b(?:RM|Rp|Rs|USD|GBP|EUR|SGD|MYR|THB|BND|HKD|VND|KRW|JPY|KHR|LAK|RMB|TWD|IDR|INR|MMK|PHP|PKR|MOP|MVR|BTN|BHD|JOD|OMR|QAR|SAR|AED|KWD|LBP|TRY|IQD|RUB|GHS|XOF|RWF|TZS|TND|ZMW|ZWL|BDT|LKR|NPR|AUD|NZD|KZT|UZS|AZN|AMD|MNT|KGS|TJS|TMT|BAM|BGN|CZK|DKK|GEL|HUF|NOK|PLN|RON|RSD|SEK|CHF|ARS|BRL|CAD|CLP|COP|CRC|DOP|MXN|PEN|EGP|ETB|KES|MUR|MAD|NGN|ZAR|UGX))';
const __currencyRangeRegex = new RegExp('(' + __currencySymbols + '\\s*[\\d,]+(?:\\.\\d{1,2})?)\\s*[-–—]\\s*([\\d,]+(?:\\.\\d{1,2})?)', 'gi');
const __currencySingleRegex = new RegExp(__currencySymbols + '\\s*[\\d,]+(?:\\.\\d{1,2})?', 'gi');

// Cache original text per text node so we can re-convert when currency changes
const __originalTextByNode = new WeakMap();
const __noConvertTags = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE']);

function __convertCurrencyTextNode(textNode, selectedCurrency, fallbackCurrency) {
    const toLocaleMoney = window.doris.toLocaleMoney;
    let original = __originalTextByNode.get(textNode);
    if (original === undefined) {
        original = textNode.nodeValue;
        if (!__currencyQuickTest.test(original)) {
            __originalTextByNode.set(textNode, null);
            return;
        }
        __originalTextByNode.set(textNode, original);
    } else if (original === null) {
        return;
    }

    let converted = original.replace(__currencyRangeRegex, (match, minValue, maxValue) => {
        const sourceCurrency = detectCurrencyFromText(minValue) || fallbackCurrency;
        if (sourceCurrency === selectedCurrency) return match;
        const xr = getExchangeRate(sourceCurrency, selectedCurrency);
        if (xr === null || xr === undefined || isNaN(xr)) return match;
        const minAmount = window.doris.fromLocaleMoney(minValue);
        if (isNaN(minAmount) || minAmount < 1) return match;
        const maxAmount = window.doris.fromLocaleMoney(maxValue);
        if (isNaN(maxAmount) || maxAmount < 1) return match;
        return `${toLocaleMoney(minAmount * xr, true, selectedCurrency)} - ${toLocaleMoney(maxAmount * xr, false, selectedCurrency)}`;
    });

    converted = converted.replace(__currencySingleRegex, (match) => {
        const sourceCurrency = detectCurrencyFromText(match) || fallbackCurrency;
        if (sourceCurrency === selectedCurrency) return match;
        const xr = getExchangeRate(sourceCurrency, selectedCurrency);
        if (xr === null || xr === undefined || isNaN(xr)) return match;
        const amount = window.doris.fromLocaleMoney(match);
        if (isNaN(amount) || amount < 1) return match;
        return toLocaleMoney(amount * xr, true, selectedCurrency);
    });

    if (converted !== textNode.nodeValue) textNode.nodeValue = converted;
}

setDorisWindowField('convertFeesToSelectedCurrency', convertFeesToSelectedCurrency)
// Pages don't call this themselves — doris.js handles currency conversion globally
// via the DOMContentLoaded auto-init at the bottom of this file. Re-running is
// effectively a no-op because we always convert from the cached original text.
function convertFeesToSelectedCurrency() {
    // Get the selected currency from localStorage
    const selectedCurrency = localStorage.getItem('currency');

    // If no currency is selected, don't do anything
    if (!selectedCurrency) {
        return;
    }

    // Get the school's region from the page (used as fallback)
    const schoolRegionMeta = document.querySelector('meta[name="app:school-region"]');
    const schoolRegion = schoolRegionMeta ? schoolRegionMeta.content : null;
    const fallbackCurrency = schoolRegion ? regionToCurrency(schoolRegion) : 'USD';

    // Walk every text node in <body>, converting any currency-shaped tokens.
    // Skip script/style/input/etc and anything inside [data-no-currency].
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (__noConvertTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
            if (parent.closest('[data-no-currency]')) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    for (const n of nodes) __convertCurrencyTextNode(n, selectedCurrency, fallbackCurrency);

    // Structured fee cells with explicit data-original-* attrs (school profile fee table)
    convertStructuredFeeCells(selectedCurrency);

    // Update the active-currency label in the header
    document.querySelectorAll('.currency-active-label').forEach(el => { el.textContent = selectedCurrency; });
}

function convertStructuredFeeCells(selectedCurrency) {
    const feeCells = document.querySelectorAll('.convert-me');
    if (feeCells.length === 0) return;
    feeCells.forEach(cell => {
        // Respect the same opt-out attribute the text walker uses.
        if (cell.closest('[data-no-currency]')) return;
        const originalValue = parseFloat(cell.dataset.originalValue);
        const sourceCurrency = cell.dataset.originalCurrency;
        if (isNaN(originalValue)) return;
        const xr = getExchangeRate(sourceCurrency, selectedCurrency);
        if (!xr) return;
        const convertedAmount = originalValue * xr;
        const valueSpan = cell.querySelector('.convert-me-value');
        const currencySpan = cell.querySelector('.convert-me-currency');
        if (valueSpan) {
            valueSpan.innerText = new Intl.NumberFormat(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(convertedAmount);
        }
        if (currencySpan) currencySpan.innerText = selectedCurrency;
    });
}


function regionToCurrency(region) {
    switch (region.toLowerCase()) {
        case 'singapore':
            return 'SGD'
        case 'malaysia':
            return 'MYR'
        case 'thailand':
            return 'THB'
        case 'hong kong':
            return 'HKD'
        case 'brunei':
            return 'BND'
        case 'vietnam':
            return 'VND'
        case 'south korea':
            return 'KRW'
        case 'japan':
            return 'JPY'
        case 'cambodia':
            return 'KHR'
        case 'laos':
            return 'LAK'
        case 'macau':
            return 'MOP'
        case 'maldives':
            return 'MVR'
        case 'bhutan':
            return 'BTN'
        case 'china':
            return 'RMB'
        case 'taiwan':
            return 'TWD'
        case 'indonesia':
            return 'IDR'
        case 'india':
            return 'INR'
        case 'myanmar':
            return 'MMK'
        case 'pakistan':
            return 'PKR'
        case 'philippines':
            return 'PHP'
        case 'bahrain':
            return 'BHD'
        case 'jordan':
            return 'JOD'
        case 'oman':
            return 'OMR'
        case 'qatar':
            return 'QAR'
        case 'saudi arabia':
            return 'SAR'
        case 'united arab emirates':
            return 'AED'
        // Europe - EUR zone
        case 'andorra':
        case 'austria':
        case 'belgium':
        case 'croatia':
        case 'estonia':
        case 'france':
        case 'germany':
        case 'greece':
        case 'ireland':
        case 'italy':
        case 'latvia':
        case 'lithuania':
        case 'luxembourg':
        case 'netherlands':
        case 'portugal':
        case 'slovakia':
        case 'slovenia':
        case 'spain':
            return 'EUR'
        // Europe - own currencies
        case 'bosnia and herzegovina':
            return 'BAM'
        case 'bulgaria':
            return 'BGN'
        case 'czech republic':
            return 'CZK'
        case 'denmark':
            return 'DKK'
        case 'georgia':
            return 'GEL'
        case 'hungary':
            return 'HUF'
        case 'norway':
            return 'NOK'
        case 'poland':
            return 'PLN'
        case 'romania':
            return 'RON'
        case 'russia':
            return 'RUB'
        case 'serbia':
            return 'RSD'
        case 'sweden':
            return 'SEK'
        case 'switzerland':
            return 'CHF'
        case 'united kingdom':
            return 'GBP'
        // Americas
        case 'argentina':
            return 'ARS'
        case 'brazil':
            return 'BRL'
        case 'canada':
            return 'CAD'
        case 'chile':
            return 'CLP'
        case 'colombia':
            return 'COP'
        case 'costa rica':
            return 'CRC'
        case 'dominican republic':
            return 'DOP'
        case 'ecuador':
        case 'panama':
        case 'timor-leste':
        case 'united states':
            return 'USD'
        case 'mexico':
            return 'MXN'
        case 'peru':
            return 'PEN'
        // Africa & Indian Ocean
        case 'egypt':
            return 'EGP'
        case 'ethiopia':
            return 'ETB'
        case 'kenya':
            return 'KES'
        case 'mauritius':
            return 'MUR'
        case 'morocco':
            return 'MAD'
        case 'nigeria':
            return 'NGN'
        case 'south africa':
            return 'ZAR'
        case 'uganda':
            return 'UGX'
        case 'ghana':
            return 'GHS'
        case 'ivory coast':
        case 'senegal':
            return 'XOF'
        case 'rwanda':
            return 'RWF'
        case 'tanzania':
            return 'TZS'
        case 'tunisia':
            return 'TND'
        case 'zambia':
            return 'ZMW'
        case 'zimbabwe':
            return 'ZWL'
        case 'bangladesh':
            return 'BDT'
        case 'sri lanka':
            return 'LKR'
        case 'nepal':
            return 'NPR'
        case 'australia':
            return 'AUD'
        case 'new zealand':
            return 'NZD'
        case 'iraq':
            return 'IQD'
        case 'kuwait':
            return 'KWD'
        case 'lebanon':
            return 'LBP'
        case 'turkey':
            return 'TRY'
        case 'finland':
        case 'cyprus':
        case 'malta':
            return 'EUR'
        case 'kazakhstan':
            return 'KZT'
        case 'uzbekistan':
            return 'UZS'
        case 'azerbaijan':
            return 'AZN'
        case 'armenia':
            return 'AMD'
        case 'mongolia':
            return 'MNT'
        case 'kyrgyzstan':
            return 'KGS'
        case 'tajikistan':
            return 'TJS'
        case 'turkmenistan':
            return 'TMT'
        default:
            return '$'
    }
}

setDorisWindowField('saveSchoolToShortlist', saveSchoolToShortlist)
function saveSchoolToShortlist() {
    const schoolId = document.querySelector('meta[name="app:school-id"]').content;
    const saveButtons = document.getElementsByClassName("save-button");
    // Per-school in-flight guard: server is now a pure toggle, so two clicks
    // landing in flight at the same time would CANCEL each other (favourite →
    // unfavourite). Block subsequent clicks until the first request returns.
    let inFlight = false;
    let firedManyFavourites = false;
    Array.from(saveButtons).forEach(saveButton => {
        saveButton.addEventListener('click', () => {
            if (inFlight) return;
            // The register wall, checked before anything moves. Only on the way
            // IN: a parent at the wall must still be able to un-save this school,
            // so a click on an already-saved heart goes straight through.
            const alreadySaved = window.doris.shortlistedSchoolIds().indexOf(schoolId) !== -1;
            if (!alreadySaved && window.doris.shortlistWallHit()) return;
            inFlight = true;
            fetch('/schools/' + schoolId + `/favourite`, {method: 'POST'})
                .then(res => {
                    res.text().then(body => {
                        if (body === 'blocked') {
                            // Server refused: our count was stale (another tab,
                            // or a click before /api/me landed). Ask, change nothing.
                            window.doris.openShortlistRegisterPopup();
                        } else if (body === 'true') {
                            updateButton(saveButton, 'saved')
                            pulseNavHeart();
                            bumpNavFaveCount(1);
                            window.doris.trackEvent('parent_favourite_a_school', {school_id: schoolId});
                            maybeTrackManyFavourites(schoolId);
                        } else {
                            updateButton(saveButton, 'unsave')
                            bumpNavFaveCount(-1);
                            window.doris.rememberShortlisted(schoolId, false);
                        }
                    })
                })
                .catch(err => {
                    console.error(err);
                })
                .finally(() => {
                    inFlight = false;
                })
        })
    })

    function updateButton(saveButton, to) {
        if (to.toLowerCase() === 'saved') {
            saveButton.querySelector("svg").setAttribute("fill", "#3C72D7")
        } else {
            saveButton.querySelector("svg").setAttribute("fill", "none")
        }
    }

    // Milestone conversion: the parent has built a real shortlist (3+ schools).
    // Counts this school on top of the ids hydrated from /api/me, and keeps that
    // list current so a further favourite on this same page still counts. Fires
    // at most once per page load.
    function maybeTrackManyFavourites(justFavouritedId) {
        const favs = window.doris.rememberShortlisted(justFavouritedId, true);
        if (favs.length >= 3 && !firedManyFavourites) {
            firedManyFavourites = true;
            window.doris.trackEvent('parent_favourite_many_schools', {count: favs.length});
        }
    }
}

// When a school is shortlisted, celebrate on the top-nav shortlist heart: a
// quick "beat" on the icon plus a burst of little hearts that pop out, rise,
// wiggle left/right and fade — a delightful cue pointing at where the shortlist
// lives. Removing + re-adding the class (with a reflow) restarts the beat.
// The little circle on the nav's "My shortlist" pill.
//
// Client-side only, deliberately: the nav ships on CDN-cacheable pages, so a
// server-rendered count would be whichever parent warmed the cache. setNavFaveCount
// is called once from the /api/me hydration with the real figure, and bump() keeps it
// honest as schools are favourited from a profile, the search page or a pillar page.
// Hidden at zero rather than showing a 0, and capped at 99+ so it cannot stretch the pill.
var navFaveCount = null;

setDorisWindowField('setNavFaveCount', setNavFaveCount);
function setNavFaveCount(n) {
    navFaveCount = typeof n === 'number' && n >= 0 ? n : 0;
    var badge = document.querySelector('[data-nav-fave-count]');
    if (!badge) return;
    if (navFaveCount < 1) {
        badge.hidden = true;
        badge.textContent = '';
        return;
    }
    badge.textContent = navFaveCount > 99 ? '99+' : String(navFaveCount);
    badge.hidden = false;
}

// delta is +1 on favourite, -1 on unfavourite. A no-op until hydration has told us
// the starting figure, because guessing from 0 would show "1" to a parent who already
// has nine shortlisted schools.
setDorisWindowField('bumpNavFaveCount', bumpNavFaveCount);
function bumpNavFaveCount(delta) {
    if (navFaveCount === null) return;
    // 0 -> 1 is the moment a parent first has something to compare, and the
    // only moment they have no reason to know the board exists. Every
    // favourite surface funnels through here, so one hook covers them all.
    // Hung off the bump rather than setNavFaveCount so hydration on a page
    // load can't fire it at a parent who already has one school saved.
    const firstEver = navFaveCount === 0 && delta > 0;
    setNavFaveCount(navFaveCount + (delta > 0 ? 1 : -1));
    if (firstEver) showShortlistNavTooltip();
}

// Signposts the shortlist pill the first time a school is saved. Right-aligned
// to the pill so the bubble grows leftwards, away from the screen edge: the pill
// sits a thumb's width from the right on a phone, and left-anchoring it there
// would push the bubble off the viewport. Fades in, holds 3s, fades out and
// removes itself.
function showShortlistNavTooltip() {
    const heart = document.querySelector('[data-nav-heart]');
    if (!heart || heart.querySelector('[data-nav-heart-tip]')) return;
    const tip = document.createElement('div');
    tip.setAttribute('data-nav-heart-tip', '');
    tip.textContent = 'Compare your shortlist here';
    tip.style.cssText = 'position:absolute;top:calc(100% + 9px);right:0;width:max-content;max-width:calc(100vw - 24px);' +
        'background:#fff;color:#151C3F;font-size:12px;font-weight:700;line-height:1.35;text-align:left;' +
        'padding:6px 10px;border-radius:8px;pointer-events:none;box-shadow:0 6px 16px rgba(0,0,0,0.22);' +
        'opacity:0;transition:opacity 250ms ease;z-index:60;';
    const caret = document.createElement('div');
    caret.style.cssText = 'position:absolute;top:-3px;right:14px;width:8px;height:8px;background:#fff;transform:rotate(45deg);border-radius:1px;';
    tip.appendChild(caret);
    heart.appendChild(tip);
    requestAnimationFrame(function () { tip.style.opacity = '1'; });
    setTimeout(function () {
        tip.style.opacity = '0';
        setTimeout(function () { tip.remove(); }, 400);
    }, 3000);
}

setDorisWindowField('pulseNavHeart', pulseNavHeart)
function pulseNavHeart() {
    const heart = document.querySelector('[data-nav-heart]');
    if (!heart) return;
    heart.classList.remove('animate-heart-pulse');
    void heart.offsetWidth;
    heart.classList.add('animate-heart-pulse');
    heart.addEventListener('animationend', () => heart.classList.remove('animate-heart-pulse'), {once: true});
    spawnFloatingHearts(heart);
}

let lastHeartBurstAt = 0;
function spawnFloatingHearts(anchorEl) {
    // Debounce: a single favourite can invoke pulseNavHeart more than once in
    // quick succession, which used to spawn a second overlapping wave/swirl of
    // hearts. Collapse anything within ~900ms into one burst.
    const now = Date.now();
    if (now - lastHeartBurstAt < 900) return;
    lastHeartBurstAt = now;
    // Emanate from the heart glyph itself (right of the "Shortlist" pill on
    // desktop), not the whole pill, so the burst doesn't sit over the label.
    const iconEl = anchorEl.querySelector('svg') || anchorEl;
    const rect = iconEl.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.bottom - 2;
    // Exactly three hearts, one down-left, one straight down, one down-right —
    // each a single diagonal drop. Animated with the Web Animations API (not the
    // shared CSS keyframes) so there's no rotate/two-phase drift: it fires once
    // and never re-runs.
    const hearts = [
        {emoji: '💖', dx: -30},
        {emoji: '❤️', dx: 0},
        {emoji: '💕', dx: 30},
    ];
    const size = 18;
    for (const {emoji, dx} of hearts) {
        const el = document.createElement('span');
        el.textContent = emoji;
        el.style.cssText =
            'position:fixed;left:' + (originX - size / 2) + 'px;top:' + (originY - size / 2) + 'px;' +
            'font-size:' + size + 'px;line-height:1;pointer-events:none;z-index:99998;will-change:transform,opacity;';
        document.body.appendChild(el);
        const anim = el.animate([
            {transform: 'translate(0, 0) scale(0.6)', opacity: 0, offset: 0},
            {opacity: 1, offset: 0.2},
            {opacity: 1, offset: 0.7},
            {transform: 'translate(' + dx + 'px, 84px) scale(0.9)', opacity: 0, offset: 1},
        ], {duration: 1000, easing: 'ease-out', fill: 'forwards'});
        anim.onfinish = () => el.remove();
        setTimeout(() => el.remove(), 1500); // safety net
    }
}

setDorisWindowField('shareButtons', shareButtons)
function shareButtons() {
    Array.from(document.querySelectorAll(".share-copy-clipboard")).forEach(btn => {
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href);

            const schoolId = btn.dataset.schoolId;
            window.doris.trackEvent('school_profile_lead', { school_id: schoolId, target: 'share-by-hand' });

            const tooltip = document.createElement('div');
            tooltip.textContent = 'Copied!';
            tooltip.style.cssText = 'position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;font-size:12px;padding:3px 8px;border-radius:6px;white-space:nowrap;pointer-events:none;';
            btn.appendChild(tooltip);
            setTimeout(() => tooltip.remove(), 1500);
        })
    })
}
