function consentToCookiesMs(yesNo = 'no') {
    if (!window.uetq) return;
    const consent = yesNo.toLowerCase() === 'yes';

    if (consent) {
        window.uetq.push('consent', 'grant');
    } else {
        window.uetq.push('consent', 'revoke');
    }
}

window.setDorisWindowField('consentToCookiesMs', consentToCookiesMs);

// marketingConsentGranted(), not `cookie-consent`: that key reads 'true' on
// "Reject optional" too, so gating on it re-granted after the reject had denied.
// See doris.js for the full reasoning.
window.doris.waitFor(() => window.uetq, () => {
    if (window.doris.marketingConsentGranted()) {
        window.doris.consentToCookiesMs('yes');
    } else {
        window.doris.consentToCookiesMs('no');
    }
});

window.addEventListener('cookie-consent-changed', (event) => {
    // we fire this event on cookie accept/reject so we can update the consent status
    const consentGiven = window.doris.marketingConsentGranted();
    window.doris.consentToCookiesMs(consentGiven ? 'yes' : 'no');
});