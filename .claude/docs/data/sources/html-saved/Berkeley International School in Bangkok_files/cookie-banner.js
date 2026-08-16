window.addEventListener('DOMContentLoaded', () => {
    const banner = document.getElementById('cookie-banner');
    if (!banner) return; // Exit if banner doesn't exist (non-EEA users)

    const consent = localStorage.getItem('cookie-consent');

    // Publish the banner's live height as a CSS var so a fixed bottom-0 control
    // (e.g. the school-search "Show N results" button) can sit above the banner
    // instead of being covered by it. 0px whenever the banner is hidden/dismissed.
    function updateBannerOffset() {
        const visible = !banner.classList.contains('hidden');
        const h = visible ? banner.offsetHeight : 0;
        document.documentElement.style.setProperty('--cookie-banner-h', h + 'px');
    }

    // Hide banner if user has already made a choice
    if (consent != null) {
        banner.classList.add('hidden');
        // Apply saved preferences
        applySavedPreferences();
    }
    updateBannerOffset();
    window.addEventListener('resize', updateBannerOffset);

    // Reject Optional Cookies
    const rejectButton = document.querySelector('.cookie-reject');
    if (rejectButton) {
        rejectButton.addEventListener('click', () => {
            savePreferences(false, false);
            banner.classList.add('hidden');
            updateBannerOffset();
        });
    }

    // Accept All Cookies
    const agreeButton = document.querySelector('.cookie-agree');
    if (agreeButton) {
        agreeButton.addEventListener('click', () => {
            savePreferences(true, true);
            banner.classList.add('hidden');
            updateBannerOffset();
        });
    }

    function savePreferences(analytics, marketing) {
        // Save to localStorage
        localStorage.setItem('cookie-consent', 'true');
        localStorage.setItem('cookie-analytics', analytics.toString());
        localStorage.setItem('cookie-marketing', marketing.toString());

        // Apply preferences
        if (analytics && window.doris && window.doris.loadHotjar) {
            window.doris.loadHotjar();
        }

        if (marketing) {
            window.doris.consentToMarketing('yes')
        } else {
            window.doris.consentToMarketing('no')
        }

        // Send to server
        const consents = [
            {name: 'cookiesEssential', value: true, version: '2025-11'},
            {name: 'cookiesAnalytics', value: analytics, version: '2025-11'},
            {name: 'cookiesMarketing', value: marketing, version: '2025-11'}
        ];

        fetch('/api/v1/consent', {
            method: 'POST',
            body: JSON.stringify(consents),
            credentials: 'same-origin',
            cache: 'no-store',
        }).catch(err => console.error('Failed to save cookie preferences:', err));

        window.dispatchEvent(new Event('cookie-consent-changed'));
    }

    function applySavedPreferences() {
        const analytics = localStorage.getItem('cookie-analytics');
        const marketing = localStorage.getItem('cookie-marketing');

        if (analytics === 'true' && window.doris && window.doris.loadHotjar) {
            window.doris.loadHotjar();
        }

        if (marketing === 'true') {
            window.doris.consentToMarketing('yes');
        } else if (marketing === 'false') {
            window.doris.consentToMarketing('no');

        }
    }
})