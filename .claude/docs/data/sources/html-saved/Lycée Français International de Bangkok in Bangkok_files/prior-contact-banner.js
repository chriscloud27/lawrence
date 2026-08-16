// "You contacted this school before" banner injected into each contact-style
// tray when the parent has prior history with the school. Idempotent: each
// tray gets at most one banner per page load. Anonymous users get no banner
// (the endpoint returns an empty payload).
//
// We hook off MutationObserver on the tray's class/style attributes so we
// don't need to patch each tray's own JS. Trays are made visible by removing
// the `.invisible` class and bumping `style.height` — we wait for either
// signal to flip and then inject.
window.addEventListener('DOMContentLoaded', () => {
    const trays = [
        {sel: '.book-tour-step',      formSel: '.book-tour-form',          relevantType: 'tour',         label: 'a tour booking'},
        {sel: '.availability-step',   formSel: '.availability-form',       relevantType: 'availability', label: 'an availability question'},
        {sel: '.apply-interest-step', formSel: '.apply-interest-form',     relevantType: 'application',  label: 'an application interest'},
        {sel: '.contact-step-1',      formSel: '.submit-contact-details-form', relevantType: 'general',  label: 'a message'},
    ];

    const cache = new Map(); // schoolId → Promise<{contacts, tours}>
    function loadFor(schoolId) {
        if (!cache.has(schoolId)) {
            cache.set(schoolId, fetch('/parent/interactions/' + encodeURIComponent(schoolId), {credentials: 'same-origin'})
                .then(r => r.ok ? r.json() : {contacts: [], tours: []})
                .catch(() => ({contacts: [], tours: []})));
        }
        return cache.get(schoolId);
    }

    function prettyType(t) {
        switch (t) {
            case 'general': return 'Sent a message';
            case 'request_callback': return 'Requested a phone-call';
            case 'availability': return 'Asked about availability';
            case 'school_visit': return 'Requested a visit';
            case 'application': return 'Sent an application interest';
            case 'tour': return 'Booked a tour';
            default: return 'Contacted';
        }
    }

    function prettyDate(iso) {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'});
    }

    function pickRelevant({contacts, tours}, relevantType) {
        if (relevantType === 'tour' && tours.length > 0) {
            return {type: 'tour', created_at: tours[0].created_at};
        }
        const sameType = (contacts || []).find(c => c.type === relevantType);
        if (sameType) return {type: sameType.type, created_at: sameType.created_at};
        // Fallback: any prior interaction, most recent first.
        const all = [
            ...(contacts || []).map(c => ({type: c.type, created_at: c.created_at})),
            ...(tours || []).map(t => ({type: 'tour', created_at: t.created_at})),
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return all[0] || null;
    }

    function buildBanner(record, label) {
        const wrapper = document.createElement('div');
        wrapper.className = 'prior-contact-banner mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm';
        wrapper.innerHTML =
            '<div class="text-base leading-none mt-0.5">ℹ️</div>' +
            '<div class="flex-1 min-w-0">' +
                '<div class="font-semibold text-amber-900">You already sent ' + label + ' to this school</div>' +
                '<div class="text-amber-800/90 text-xs mt-0.5">' + prettyType(record.type) + ' · ' + prettyDate(record.created_at) +
                ' · <a href="/parent/dashboard/contacts" class="underline">View in your dashboard</a></div>' +
                '<div class="text-amber-800/80 text-xs mt-1">You can still submit again if you need to — schools are used to follow-ups.</div>' +
            '</div>' +
            '<button type="button" aria-label="Dismiss" class="prior-contact-banner-close text-amber-700 hover:text-amber-900 leading-none -mt-1">×</button>';
        wrapper.querySelector('.prior-contact-banner-close').addEventListener('click', () => wrapper.remove());
        return wrapper;
    }

    async function inject(trayEl, formEl, relevantType, label) {
        if (trayEl.dataset.priorBannerInjected === '1') return;
        const schoolId = formEl.dataset.schoolId;
        if (!schoolId) return;
        trayEl.dataset.priorBannerInjected = '1';
        const data = await loadFor(schoolId);
        const record = pickRelevant(data, relevantType);
        if (!record) return;
        const inner = trayEl.firstElementChild || trayEl;
        // Slip the banner in just after the close button row so it sits at
        // the top of the readable area without overlapping the close icon.
        const closeRow = inner.querySelector('.book-tour-close, .availability-close, .apply-interest-close, .school-contact-parent-close');
        const closeRowParent = closeRow ? closeRow.closest('.flex.justify-end, .flex.justify-between') : null;
        const banner = buildBanner(record, label);
        if (closeRowParent && closeRowParent.parentElement === inner) {
            closeRowParent.insertAdjacentElement('afterend', banner);
        } else {
            inner.insertBefore(banner, inner.firstChild);
        }
    }

    trays.forEach(({sel, formSel, relevantType, label}) => {
        document.querySelectorAll(sel).forEach(trayEl => {
            const formEl = trayEl.querySelector(formSel);
            if (!formEl) return;
            const observer = new MutationObserver(() => {
                const visible = !trayEl.classList.contains('invisible')
                    && trayEl.style.height
                    && trayEl.style.height !== '0'
                    && trayEl.style.height !== '0px';
                if (visible) inject(trayEl, formEl, relevantType, label);
            });
            observer.observe(trayEl, {attributes: true, attributeFilter: ['class', 'style']});
        });
    });
});
