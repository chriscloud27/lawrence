function consentToCookiesFb(yesNo = 'no') {
    if (!window.fbq) return;
    const consent = yesNo.toLowerCase() === 'yes' ;
    if (consent) {
        window.fbq('consent', 'grant');
    } else {
        window.fbq('consent', 'revoke');
    }
}
window.setDorisWindowField('consentToCookiesFb', consentToCookiesFb);
// marketingConsentGranted(), not `cookie-consent`: that key reads 'true' on
// "Reject optional" too, so gating on it re-granted after the reject had denied.
// See doris.js for the full reasoning.
window.doris.waitFor(() => window.fbq, () => {
    if (window.doris.marketingConsentGranted()) {
        window.doris.consentToCookiesFb('yes');
    } else {
        window.doris.consentToCookiesFb('no');
    }
})

window.addEventListener('cookie-consent-changed', (event) => {
    // we fire this event on cookie accept/reject so we can update the consent status
    const consentGiven = window.doris.marketingConsentGranted();
    window.doris.consentToCookiesFb(consentGiven ? 'yes' : 'no');
});