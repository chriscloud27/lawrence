// Google consent mode: UPDATES. The default is set by gtm-consent-default.js,
// which is a blocking head script because a default arriving after the container
// has loaded is ignored. This file is deferred, so by the time it runs the body
// is parsed and #cookie-banner is in the DOM, which is what lets
// marketingConsentGranted() tell "declined" from "not asked yet".
//
// It must be gtag(), never a raw dataLayer.push. `dataLayer.push('consent',
// 'default', {…})`, which is what this file used to do, looks identical and does
// nothing: gtag is `function gtag(){ dataLayer.push(arguments) }`, so the command
// form appends ONE arguments-like element that GTM's processor recognises,
// whereas a three-argument push appends THREE, of which the two bare strings are
// dropped and the object lands as an ordinary dataLayer variable. Checked
// against the live container: after the push form, `ad_storage` reads "denied"
// as a VARIABLE and the consent subsystem has heard nothing at all. Every
// rejection a parent ever made was lost here.
function consentToCookiesGtm(yesNo = 'no') {
    const marketing = yesNo.toLowerCase() === 'no' ? 'denied' : 'granted';
    window.gtag('consent', 'update', {
        'ad_storage': marketing,
        'ad_user_data': marketing,
        'ad_personalization': marketing,
        'analytics_storage': analyticsGranted() ? 'granted' : 'denied',
    });
}
window.setDorisWindowField('consentToCookiesGtm', consentToCookiesGtm);

// marketingConsentGranted(), not `cookie-consent`: that key reads 'true' on
// "Reject optional" too, so gating on it re-granted after the reject had denied.
// This is the tag that carries ad_storage / ad_user_data / ad_personalization and
// loads the Facebook, Bing and OpenAI base tags, so it is the one that mattered.
// See doris.js for the full reasoning.
//
// url_passthrough is not set here: the container's Conversion Linker tag already
// enables it. The line that used to sit here spelled it `set_url_passthrough`
// and went through the same broken push, so it never applied either.
window.doris.waitFor(() => window.dataLayer, () => {
    consentToCookiesGtm(window.doris.marketingConsentGranted() ? 'yes' : 'no');
})

window.addEventListener('cookie-consent-changed', (event) => {
    // we fire this event on cookie accept/reject so we can update the consent status
    const consentGiven = window.doris.marketingConsentGranted();
    window.doris.consentToCookiesGtm(consentGiven ? 'yes' : 'no');
});

// The analytics answer is independent of the marketing one: Hotjar is analytics,
// the ad tags are marketing, and the banner records them separately. Same shape
// as analyticsConsentGranted() in hotjar.js, read here rather than called
// because hotjar.js is not loaded on every page.
function analyticsGranted() {
    const choice = localStorage.getItem('cookie-analytics');
    if (choice === 'true') return true;
    if (choice === 'false') return false;
    const legacy = localStorage.getItem('cookie-consent');
    if (legacy === 'true') return true;
    if (legacy === 'false') return false;
    return !document.getElementById('cookie-banner');
}
