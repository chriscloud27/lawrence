window.addEventListener('DOMContentLoaded', () => {
    contactForm();
    contactTeaserFlow();
});

// Non-partner profiles: the greyed "Ask School a Question" pill opens a
// "not available on this profile" tray (contactTeaserTray) instead of the
// real contact form.
function contactTeaserFlow() {
    const step = document.querySelector('.contact-teaser-step');
    if (!step) return;
    const triggers = document.querySelectorAll('.have-contact-teaser');
    const closes = document.querySelectorAll('.contact-teaser-close');

    function open() {
        step.style.height = '100dvh';
        step.classList.remove('invisible');
        document.body.style.overflow = 'hidden';
    }

    function close() {
        step.style.height = '0';
        step.classList.add('invisible');
        document.body.style.overflow = '';
    }

    triggers.forEach(t => {
        t.addEventListener('click', e => {
            e.preventDefault();
            open();
        });
        t.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                t.click();
            }
        });
    });

    closes.forEach(c => c.addEventListener('click', close));
}

function contactForm() {
    const submitContactDetailsForm = document.querySelector('.submit-contact-details-form');
    if (!submitContactDetailsForm) {
        // Non-partner and lite/free-tier pages legitimately render no form —
        // they get contactTeaserTray or nothing instead (see schoolCtas /
        // schoolEnquiriesEnabled). Only warn when a real trigger is present
        // but the form isn't — that combination means someone broke the pairing.
        if (document.querySelector('.have-school-contact-you')) {
            console.warn('[contact-school] .submit-contact-details-form not found but trigger present — contact form is disabled.');
        }
        return;
    }
    // On school profile pages the target school is fixed (meta tag / form
    // dataset). On compare2, one modal is shared by every partner column:
    // the "Ask a question" buttons carry data-school-id/-name/-tz and the
    // click handler retargets these before opening the sheet.
    const schoolIdMeta = document.querySelector('meta[name="app:school-id"]');
    let schoolId = schoolIdMeta ? schoolIdMeta.content : (submitContactDetailsForm.dataset.schoolId || '');
    let schoolTz = submitContactDetailsForm.dataset.schoolTz || 'UTC';

    const contactStep1 = document.querySelector('.contact-step-1');
    const contactSuccess = document.querySelector('.contact-success');

    const messageBtns = document.querySelectorAll('.have-school-contact-you');
    const contactCloseBtns = document.querySelectorAll('.school-contact-parent-close');

    const schoolName = submitContactDetailsForm.querySelector('input[name=school_name]');
    const name = submitContactDetailsForm.querySelector('input[name=name]');
    const email = submitContactDetailsForm.querySelector('input[name=email]');
    const message = submitContactDetailsForm.querySelector('[name="message"]');
    const quickPickBtns = submitContactDetailsForm.querySelectorAll('.contact-quick-pick');
    const showMoreLink = submitContactDetailsForm.querySelector('.contact-show-more');
    const stepError = submitContactDetailsForm.querySelector('.contact-step1-error');

    const tabs = Array.from(submitContactDetailsForm.querySelectorAll('.contact-tab'));
    const tabPanels = Array.from(submitContactDetailsForm.querySelectorAll('.contact-tab-panel'));
    const callPanel = submitContactDetailsForm.querySelector('[data-tab-panel="call"]');
    const messagePanel = submitContactDetailsForm.querySelector('[data-tab-panel="message"]');
    const callSlots = callPanel ? callPanel.querySelector('.call-slots') : null;
    const callAddSlotBtn = callPanel ? callPanel.querySelector('.call-add-slot') : null;
    const callTzSelect = callPanel ? callPanel.querySelector('.call-timezone') : null;
    const callTzHint = callPanel ? callPanel.querySelector('.call-tz-hint') : null;
    const callTzMineOption = callPanel ? callPanel.querySelector('.call-tz-mine') : null;
    const callDialCode = callPanel ? callPanel.querySelector('.call-dial-code') : null;
    const callPhone = callPanel ? callPanel.querySelector('.call-phone') : null;
    const callError = callPanel ? callPanel.querySelector('.call-error') : null;

    const confirmBtn = document.querySelector('.contact-confirm-btn');

    const MAX_SLOTS = 5;
    const MIN_SLOTS = 2;
    const MIN_FREEHAND_CHARS = 20;
    let activeTab = 'message';

    // Restore in-progress message across refreshes.
    const PILLS_KEY = 'parent-message-pills';
    const savedMessage = localStorage.getItem('parent-message') || '';
    if (savedMessage) message.value = savedMessage;

    message.addEventListener('input', () => {
        localStorage.setItem('parent-message', message.value);
        if (message.value.trim().length > 0 && stepError) stepError.classList.add('hidden');
    });

    // Remove `paragraph` from `text` if it's still verbatim. Returns the new
    // string, or null if not found (i.e. parent edited it — leave it alone).
    function removeParagraph(text, paragraph) {
        const idx = text.indexOf(paragraph);
        if (idx === -1) return null;
        let before = text.slice(0, idx).replace(/\n+$/, '');
        let after = text.slice(idx + paragraph.length).replace(/^\n+/, '');
        if (before && after) return before + '\n\n' + after;
        return before + after;
    }

    // Persist the set of pill-paragraphs the parent has toggled on. Without
    // this, the textarea reloads its content from localStorage but the pills
    // all start unselected — clicking one then appends a duplicate paragraph
    // that's already in the message.
    const activePills = (() => {
        try {
            const raw = localStorage.getItem(PILLS_KEY);
            if (!raw) return new Set();
            const arr = JSON.parse(raw);
            return new Set(Array.isArray(arr) ? arr : []);
        } catch (_) { return new Set(); }
    })();
    function saveActivePills() {
        try { localStorage.setItem(PILLS_KEY, JSON.stringify(Array.from(activePills))); } catch (_) {}
    }
    function activateChip(btn) {
        btn.dataset.added = '1';
        btn.classList.add('border-tertiary', 'bg-blue-50', 'font-bold');
    }
    function deactivateChip(btn) {
        btn.dataset.added = '0';
        btn.classList.remove('border-tertiary', 'bg-blue-50', 'font-bold');
    }

    // On load, mark each pill active iff its paragraph was previously toggled
    // on AND is still verbatim in the message. If the parent has since edited
    // the paragraph out of the textarea, drop it from the persisted set so we
    // don't keep a stale chip selected.
    quickPickBtns.forEach(btn => {
        const paragraph = btn.dataset.paragraph || '';
        if (!paragraph) return;
        if (activePills.has(paragraph)) {
            if (message.value.includes(paragraph)) activateChip(btn);
            else activePills.delete(paragraph);
        }
    });
    saveActivePills();

    // Toggle: first click APPENDS the paragraph; second click removes it
    // (only if the exact paragraph text is still in the textarea — if the
    // parent edited it, we just deactivate the chip and leave their words alone).
    quickPickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const paragraph = btn.dataset.paragraph || '';
            const topic = (btn.textContent || '').trim();
            let action;
            if (btn.dataset.added === '1') {
                const updated = removeParagraph(message.value, paragraph);
                if (updated !== null) {
                    message.value = updated;
                    localStorage.setItem('parent-message', message.value);
                }
                deactivateChip(btn);
                activePills.delete(paragraph);
                action = 'remove';
            } else {
                const current = message.value;
                const sep = current.trim().length === 0 ? '' : (current.endsWith('\n') ? '\n' : '\n\n');
                message.value = current + sep + paragraph;
                localStorage.setItem('parent-message', message.value);
                activateChip(btn);
                activePills.add(paragraph);
                if (stepError) stepError.classList.add('hidden');
                action = 'add';
            }
            saveActivePills();
            if (window.doris && typeof window.doris.trackEvent === 'function') {
                window.doris.trackEvent('school_profile_contact_quick_pick', {
                    school_id: schoolId,
                    topic,
                    action,
                });
            }
        });
    });

    if (showMoreLink) {
        showMoreLink.addEventListener('click', () => {
            const extraTopics = submitContactDetailsForm.querySelector('.contact-extra-topics');
            if (extraTopics) extraTopics.classList.remove('hidden');
            showMoreLink.classList.add('hidden');
        });
    }

    // ----- Tab switching -----
    function setActiveTab(tabName) {
        activeTab = tabName;
        tabs.forEach(t => {
            const isActive = t.dataset.tab === tabName;
            t.classList.toggle('bg-white', isActive);
            t.classList.toggle('shadow-sm', isActive);
            t.classList.toggle('text-gray-900', isActive);
            t.classList.toggle('text-gray-600', !isActive);
        });
        tabPanels.forEach(p => p.classList.toggle('hidden', p.dataset.tabPanel !== tabName));
        // The submit button's verb tracks the active tab so the parent sees
        // what action they're about to take.
        confirmBtn.textContent = tabName === 'call' ? 'Request call' : 'Send';
        updateSendButtonValidity();
    }
    tabs.forEach(t => t.addEventListener('click', () => {
        const tabName = t.dataset.tab;
        setActiveTab(tabName);
        if (window.doris && typeof window.doris.trackEvent === 'function') {
            window.doris.trackEvent('school_profile_contact_tab', {
                school_id: schoolId,
                tab: tabName,
            });
        }
    }));

    // ----- Call-tab: time slot helpers (mirror book-tour.js) -----
    function generateSchoolSlots() {
        const out = [];
        for (let h = 9; h <= 16; h++) {
            out.push({h, m: 0});
            if (h < 16) out.push({h, m: 30});
        }
        return out;
    }

    function to12h(h, m) {
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${h12}:${m < 10 ? '0' + m : m} ${period}`;
    }

    function pad2(n) { return n < 10 ? '0' + n : '' + n; }

    function tzOffsetMinutes(utcMs, tz) {
        const dtf = new Intl.DateTimeFormat('en-US', {
            timeZone: tz, hourCycle: 'h23',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
        const parts = dtf.formatToParts(new Date(utcMs)).reduce((acc, p) => {
            if (p.type !== 'literal') acc[p.type] = p.value;
            return acc;
        }, {});
        const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
        return Math.round((asUtc - utcMs) / 60000);
    }

    function convertSchoolToUser(dateStr, timeStr, userTz) {
        if (!dateStr || !timeStr || !userTz || userTz === schoolTz) return null;
        const [Y, Mo, D] = dateStr.split('-').map(Number);
        const [hh, mm] = timeStr.split(':').map(Number);
        const guessUtcMs = Date.UTC(Y, Mo - 1, D, hh, mm);
        const offset = tzOffsetMinutes(guessUtcMs, schoolTz);
        const actualUtcMs = guessUtcMs - offset * 60000;
        const dtf = new Intl.DateTimeFormat('en-GB', {
            timeZone: userTz, hour: 'numeric', minute: '2-digit', hour12: true,
        });
        return dtf.format(new Date(actualUtcMs));
    }

    function populateCallTimeOptions(row) {
        if (!callTzSelect) return;
        const dateSelect = row.querySelector('.call-slot-date');
        const timeSelect = row.querySelector('.call-slot-time');
        const date = dateSelect.value;
        const userTz = callTzSelect.value;
        const previous = timeSelect.value;

        const takenOnThisDate = new Set();
        callSlots.querySelectorAll('.call-slot').forEach(other => {
            if (other === row) return;
            const d = other.querySelector('.call-slot-date').value;
            const t = other.querySelector('.call-slot-time').value;
            if (d && t && d === date) takenOnThisDate.add(t);
        });

        const opts = [`<option value="">Time</option>`];
        for (const slot of generateSchoolSlots()) {
            const schoolTime = `${pad2(slot.h)}:${pad2(slot.m)}`;
            const schoolTimeLabel = to12h(slot.h, slot.m);
            let label = `${schoolTimeLabel} school time`;
            if (date && userTz && userTz !== schoolTz) {
                const converted = convertSchoolToUser(date, schoolTime, userTz);
                if (converted) label = `${converted} your time (${schoolTimeLabel} school)`;
            } else if (!date) {
                label = schoolTimeLabel;
            }
            const taken = takenOnThisDate.has(schoolTime);
            const disabledAttr = taken ? ' disabled' : '';
            const displayLabel = taken ? `${label} (already picked)` : label;
            opts.push(`<option value="${schoolTime}"${disabledAttr}>${displayLabel}</option>`);
        }
        timeSelect.innerHTML = opts.join('');
        if (previous) {
            const match = Array.from(timeSelect.options).find(o => o.value === previous);
            if (match && !match.disabled) timeSelect.value = previous;
            else timeSelect.value = '';
        }
    }

    function refreshAllCallTimeOptions() {
        if (!callSlots) return;
        callSlots.querySelectorAll('.call-slot').forEach(populateCallTimeOptions);
    }

    function updateCallTzHint() {
        if (!callTzHint || !callTzSelect) return;
        const userTz = callTzSelect.value;
        if (userTz && userTz !== schoolTz) {
            callTzHint.textContent = `School is in ${schoolTz}. Slots below show your local time alongside the school's.`;
        } else {
            callTzHint.textContent = `School is in ${schoolTz}.`;
        }
    }

    function updateCallRemoveButtons() {
        if (!callSlots || !callAddSlotBtn) return;
        const rows = callSlots.querySelectorAll('.call-slot');
        rows.forEach(row => {
            const btn = row.querySelector('.call-slot-remove');
            if (rows.length > MIN_SLOTS) btn.classList.remove('hidden');
            else btn.classList.add('hidden');
        });
        if (rows.length >= MAX_SLOTS) callAddSlotBtn.classList.add('hidden');
        else callAddSlotBtn.classList.remove('hidden');
    }

    function wireCallSlotRow(row) {
        const dateSelect = row.querySelector('.call-slot-date');
        const timeSelect = row.querySelector('.call-slot-time');
        const removeBtn = row.querySelector('.call-slot-remove');
        dateSelect.addEventListener('change', () => {
            refreshAllCallTimeOptions();
            updateSendButtonValidity();
        });
        timeSelect.addEventListener('change', () => {
            refreshAllCallTimeOptions();
            updateSendButtonValidity();
            // Fire only when both date and time are set. Multiple changes
            // on the same row will fire multiple events — dedupe downstream
            // by session + slot if needed.
            if (dateSelect.value && timeSelect.value
                && window.doris && typeof window.doris.saveEvent === 'function') {
                const rows = Array.from(callSlots.querySelectorAll('.call-slot'));
                // DB-only analytics — the callback request itself is the conversion.
                window.doris.saveEvent({name: 'contact_call_slot_chosen', data: {
                    school_id: schoolId,
                    school_name: schoolName ? schoolName.value : '',
                    slot_index: rows.indexOf(row),
                    date: dateSelect.value,
                    time: timeSelect.value,
                    school_tz: schoolTz,
                    user_tz: callTzSelect ? callTzSelect.value : '',
                }});
            }
        });
        removeBtn.addEventListener('click', () => {
            row.remove();
            updateCallRemoveButtons();
            refreshAllCallTimeOptions();
            updateSendButtonValidity();
        });
        populateCallTimeOptions(row);
    }

    function addCallSlotRow() {
        if (!callSlots) return;
        const rows = callSlots.querySelectorAll('.call-slot');
        if (rows.length >= MAX_SLOTS) return;
        const template = rows[0];
        const clone = template.cloneNode(true);
        clone.querySelector('.call-slot-date').value = '';
        clone.querySelector('.call-slot-time').innerHTML = '<option value="">Time</option>';
        callSlots.appendChild(clone);
        wireCallSlotRow(clone);
        updateCallRemoveButtons();
        updateSendButtonValidity();
    }

    if (callSlots) {
        callSlots.querySelectorAll('.call-slot').forEach(wireCallSlotRow);
        updateCallRemoveButtons();
        updateCallTzHint();
    }
    if (callTzSelect) {
        callTzSelect.addEventListener('change', () => {
            updateCallTzHint();
            refreshAllCallTimeOptions();
        });
    }
    if (callAddSlotBtn) {
        callAddSlotBtn.addEventListener('click', addCallSlotRow);
    }
    if (callPhone) {
        callPhone.addEventListener('input', updateSendButtonValidity);
    }

    // ----- Pre-fill timezone + dial code + phone from /api/me -----
    (function prefillFromApi() {
        // Auto-detect the user's browser timezone first; /api/me will refine.
        const detectedTz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || '';
        if (callTzMineOption && detectedTz) {
            const knownOption = Array.from(callTzSelect.options).find(o => o.value === detectedTz && o !== callTzMineOption);
            if (knownOption) {
                callTzMineOption.value = detectedTz;
                callTzMineOption.textContent = `My timezone (${detectedTz})`;
            } else {
                callTzMineOption.textContent = `My timezone (${detectedTz})`;
            }
            callTzSelect.value = detectedTz;
            updateCallTzHint();
            refreshAllCallTimeOptions();
        }
        function applyMe(me) {
            if (!me) return;
            // Preselect dial code: saved phone country > ipCountry > browser locale.
            let dialIso = (me.phoneCountryCode && parseIsoFromDial(me.phoneCountryCode))
                || me.ipCountry
                || guessIsoFromBrowser();
            if (dialIso && callDialCode) {
                const opt = Array.from(callDialCode.options).find(o => o.dataset.iso === dialIso.toUpperCase());
                if (opt) callDialCode.value = opt.value;
            }
            if (me.phone && callPhone && !callPhone.value) callPhone.value = me.phone;
        }
        // Reuse the single /api/me fetch doris.js makes on every page
        // (window.doris.user) instead of issuing a duplicate request.
        if (window.doris && window.doris.waitFor) {
            window.doris.waitFor(() => window.doris.user, applyMe);
        } else {
            fetch('/api/me', {credentials: 'same-origin'})
                .then(r => r.ok ? r.json() : null)
                .then(applyMe)
                .catch(() => {/* silent */});
        }
    })();

    function parseIsoFromDial(dialFromProfile) {
        // The saved value is the dial code string (e.g. "+44"). Map back to ISO
        // by searching the options' data-iso for a matching dial.
        if (!callDialCode) return undefined;
        const match = Array.from(callDialCode.options).find(o => o.value === dialFromProfile);
        return match ? match.dataset.iso : undefined;
    }

    function guessIsoFromBrowser() {
        // Browser locale like "en-GB" → "GB". A blunt fallback.
        try {
            const locale = (navigator.language || '').toUpperCase();
            const parts = locale.split('-');
            return parts.length > 1 ? parts[1] : undefined;
        } catch (_) { return undefined; }
    }

    // ----- Validity / submit button enabling -----
    function messageTabValid() {
        const hasChip = Array.from(quickPickBtns).some(b => b.dataset.added === '1');
        const trimmed = message.value.trim();
        if (hasChip) return trimmed.length > 0;
        return trimmed.length >= MIN_FREEHAND_CHARS;
    }
    function callTabValid() {
        if (!callSlots || !callPhone || !callDialCode) return false;
        const slots = collectCallSlots();
        if (slots.length < MIN_SLOTS) return false;
        const phone = callPhone.value.replace(/[^0-9]/g, '');
        if (phone.length < 6) return false;
        if (!callDialCode.value) return false;
        return true;
    }
    function collectCallSlots() {
        return Array.from(callSlots.querySelectorAll('.call-slot')).map(row => ({
            date: row.querySelector('.call-slot-date').value,
            time: row.querySelector('.call-slot-time').value,
        })).filter(s => s.date && s.time);
    }

    function updateSendButtonValidity() {
        const ok = activeTab === 'call' ? callTabValid() : messageTabValid();
        confirmBtn.classList.toggle('opacity-50', !ok);
    }
    quickPickBtns.forEach(btn => btn.addEventListener('click', updateSendButtonValidity));
    message.addEventListener('input', updateSendButtonValidity);
    updateSendButtonValidity();

    function showSheet(sheet) {
        sheet.style.height = '100dvh';
        sheet.classList.remove('invisible');
        document.body.style.overflow = 'hidden';
    }

    function hideSheet(sheet) {
        sheet.style.height = '0';
        sheet.classList.add('invisible');
    }

    function closeAll() {
        hideSheet(contactStep1);
        contactSuccess.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // After a successful submit the confirm button gets stuck on "Sent" with
    // pointer-events:none and the success panel stays visible. Reset that
    // state every time the parent reopens the sheet so they can immediately
    // send the *other* kind of contact (message → call or vice versa) in the
    // same page session, without having to refresh.
    function resetContactSheetForReopen() {
        confirmBtn.textContent = activeTab === 'call' ? 'Request call' : 'Send';
        confirmBtn.style.pointerEvents = '';
        contactSuccess.classList.add('hidden');
        if (callError) callError.classList.add('hidden');
        if (stepError) stepError.classList.add('hidden');
        updateSendButtonValidity();
    }

    messageBtns.forEach(btn => btn.addEventListener('click', () => {
        // compare2: adopt the clicked button's school so the shared modal
        // sends to the right column. Profile pages have no data attrs here,
        // so the meta-tag identity above stays in force.
        if (btn.dataset.schoolId) {
            schoolId = btn.dataset.schoolId;
            schoolTz = btn.dataset.schoolTz || 'UTC';
            if (schoolName && btn.dataset.schoolName) schoolName.value = btn.dataset.schoolName;
            updateCallTzHint();
            refreshAllCallTimeOptions();
        }
        // Fetch the "next steps" suggestions for the school this sheet now
        // targets (compare2 retargets schoolId above). Done at open rather
        // than page load so the request stays out of the critical path.
        if (nextStepsLoadedFor !== schoolId) {
            nextStepsLoadedFor = schoolId;
            preloadNextSteps();
        }
        resetContactSheetForReopen();
        showSheet(contactStep1);
        // No trackEvent here — the CTA pill's data-name="school_profile_open_contact_form"
        // already fires that event on click via doris.js's tracked-class handler.
    }));
    contactCloseBtns.forEach(btn => btn.addEventListener('click', closeAll));

    // ?ask=1 opens the sheet on arrival. Doris AI's contact card links here for
    // the email channel: the drawer is the destination, but it lives on this
    // page rather than at a URL of its own, so the chat sends the parent to the
    // profile with this flag instead of dropping them at the top of it.
    //
    // Implemented as a synthetic click on the real trigger so every branch above
    // (school retargeting, next-steps preload, reset) runs exactly as it would
    // for a tap. The flag is then stripped from the address bar, so a refresh or
    // a shared link does not reopen the sheet.
    // Deferred to the next tick, NOT called inline: the click handler above
    // reads `nextStepsLoadedFor`, which is declared with `let` further down this
    // same function. Clicking synchronously from here hits its temporal dead
    // zone, the handler throws before it can open the sheet, and the only
    // visible symptom is that nothing happens.
    if (messageBtns.length > 0 && /[?&]ask=1(&|$)/.test(window.location.search)) {
        setTimeout(function () {
            messageBtns[0].click();
            if (window.history && window.history.replaceState) {
                const cleaned = window.location.search.replace(/([?&])ask=1(&|$)/, '$1').replace(/[?&]$/, '');
                window.history.replaceState({}, '', window.location.pathname + cleaned + window.location.hash);
            }
        }, 0);
    }

    // ----- After-send: offer to resend the same message/call request to
    // other shortlisted (or recently-viewed) schools, mirroring the book-tour
    // success flow. The cards are pre-rendered when the sheet opens so they
    // appear immediately when the success screen opens — no async wait.
    let lastSubmittedPayload = null;
    let nextStepsLoadedFor = null;
    function preloadNextSteps() {
        const container = contactSuccess.querySelector('.contact-next-steps');
        if (!container) return;
        fetch('/schools/book-tour/suggestions?exclude=' + encodeURIComponent(schoolId), {
            credentials: 'same-origin',
        }).then(r => r.ok ? r.json() : null).then(data => {
            if (!data) return;
            const list = (data.shortlisted && data.shortlisted.length > 0)
                ? {schools: data.shortlisted, label: 'shortlisted'}
                : (data.recentlyViewed && data.recentlyViewed.length > 0)
                    ? {schools: data.recentlyViewed, label: 'recentlyViewed'}
                    : null;
            if (!list) return;
            const heading = list.label === 'shortlisted'
                ? 'Other schools on your shortlist'
                : 'Schools you\'ve recently viewed';
            // Title/subheading vary by what was just submitted. For the
            // phone-call tab we say "request"; for the message tab we say
            // "question". Default (preloaded, before submit) is the neutral
            // "Send the same…" copy.
            const tabSent = (lastSubmittedPayload && lastSubmittedPayload.type === 'request_callback')
                ? 'call'
                : (lastSubmittedPayload ? 'message' : null);
            const title = tabSent === 'call'
                ? 'Request the same call from other schools?'
                : tabSent === 'message'
                    ? 'Send the same question to other schools?'
                    : 'Send the same to other schools?';
            const subheading = list.label === 'shortlisted'
                ? 'One tap sends this to other schools on your shortlist.'
                : 'Send the same to a school you\'ve recently viewed.';
            const cards = list.schools.map(s => `
                <div class="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm" data-school-id="${escAttr(s.id)}" data-school-name="${escAttr(s.name)}">
                    <div class="flex items-center gap-x-3 min-w-0 sm:flex-1">
                        <img alt="${escAttr(s.name)}" src="${escAttr(s.logo || '/images/doris-inquisitive.svg')}" class="w-20 h-20 rounded-lg object-contain shrink-0 bg-gray-50" />
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold truncate">${escHtml(s.name)}</div>
                            <div class="text-xs text-gray-500 truncate">${escHtml(s.location || '')}</div>
                        </div>
                    </div>
                    <button type="button" class="contact-resend bg-tertiary text-white rounded-full px-3 py-2 text-xs font-semibold cursor-pointer hover:opacity-90 w-full mx-auto sm:w-auto sm:max-w-none sm:mx-0 sm:shrink-0">Send same to this school</button>
                </div>`).join('');
            container.innerHTML = `
                <div class="mt-8 pt-6 border-t border-gray-100">
                    <div class="font-bold text-lg mb-1">${escHtml(title)}</div>
                    <p class="text-sm text-gray-600 mb-4">${escHtml(subheading)}</p>
                    <div class="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">${escHtml(heading)}</div>
                    <div class="contact-suggestions flex flex-col gap-y-4">${cards}</div>
                </div>
            `;
            container.querySelectorAll('.contact-resend').forEach(btn => {
                btn.addEventListener('click', () => resendToSchool(btn));
            });
        }).catch(() => {/* silent */});
    }

    function escHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
    }
    function escAttr(s) { return escHtml(s); }

    function resendToSchool(btn) {
        const row = btn.closest('[data-school-id]');
        const targetId = row && row.dataset.schoolId;
        const targetName = row && row.dataset.schoolName;
        if (!targetId || !lastSubmittedPayload) return;
        btn.disabled = true;
        btn.textContent = 'Sending…';
        btn.classList.add('opacity-60', 'pointer-events-none');
        // Same payload shape; just swap the school_id/name target.
        const info = Object.assign({}, lastSubmittedPayload, {
            school_id: targetId,
            school_name: targetName || '',
        });
        fetch('/schools/' + targetId + '/contact', {
            method: 'POST',
            credentials: 'same-origin',
            body: JSON.stringify(info),
        }).then(res => res.json().then(result => ({status: res.status, result}))).then(({status, result}) => {
            if (status === 200) {
                btn.textContent = '✓ Sent';
                btn.classList.remove('opacity-60', 'bg-tertiary');
                btn.classList.add('bg-emerald-500');
                window.doris && window.doris.trackEvent && window.doris.trackEvent('school_profile_lead', {
                    target: info.type === 'request_callback' ? 'request_callback' : 'have_school_contact_parent',
                    ...info,
                });
            } else {
                btn.disabled = false;
                btn.textContent = 'Retry';
                btn.classList.remove('opacity-60', 'pointer-events-none');
                console.error('Failed to send to ' + targetId, result);
            }
        }).catch(err => {
            btn.disabled = false;
            btn.textContent = 'Retry';
            btn.classList.remove('opacity-60', 'pointer-events-none');
            console.error(err);
        });
    }

    function showMessageError(text) {
        if (!stepError) return;
        stepError.textContent = text;
        stepError.classList.remove('hidden');
        stepError.scrollIntoView({behavior: 'smooth', block: 'center'});
    }

    function showCallError(text) {
        if (!callError) return;
        callError.textContent = text;
        callError.classList.remove('hidden');
        callError.scrollIntoView({behavior: 'smooth', block: 'center'});
    }

    // Hide any previous call-tab error whenever the parent edits the inputs,
    // otherwise a stale "Please pick at least 2 slots" message stays on screen
    // even after they've fixed it.
    function hideCallError() {
        if (callError) callError.classList.add('hidden');
    }
    if (callPhone) callPhone.addEventListener('input', hideCallError);
    if (callDialCode) callDialCode.addEventListener('change', hideCallError);
    if (callTzSelect) callTzSelect.addEventListener('change', hideCallError);
    if (callSlots) callSlots.addEventListener('change', hideCallError);

    confirmBtn.addEventListener('click', () => {
        // Guard rail: any uncaught throw inside submit* would otherwise be
        // swallowed by the browser's event-handler error boundary, leaving
        // the parent staring at a non-responsive button with no error.
        try {
            if (activeTab === 'call') {
                submitCallRequest();
            } else {
                submitMessage();
            }
        } catch (e) {
            console.error('contact submit threw', e);
            if (activeTab === 'call') showCallError('Something went wrong submitting your request. Please refresh and try again.');
            else showMessageError('Something went wrong sending your message. Please refresh and try again.');
        }
    });

    function submitMessage() {
        const hasChip = Array.from(quickPickBtns).some(b => b.dataset.added === '1');
        const trimmed = message.value.trim();
        if (!hasChip && trimmed.length === 0) {
            showMessageError('Pick a topic above or write a message.');
            return;
        }
        if (!hasChip && trimmed.length < MIN_FREEHAND_CHARS) {
            showMessageError(`Please write at least ${MIN_FREEHAND_CHARS} characters so the school knows what you're asking.`);
            return;
        }

        const info = {
            email: email.value,
            name: name.value,
            phone: '',
            countryCode: '',
            message: message.value,
            type: 'general',
            school_id: schoolId,
            school_name: schoolName.value,
        };
        sendContact(info);
    }

    function submitCallRequest() {
        if (!callSlots || !callPhone || !callDialCode || !callTzSelect) {
            // Should never happen — call panel is server-rendered. But if the
            // markup changes and one element disappears, surface it instead of
            // throwing silently and leaving the parent confused.
            showCallError('Phone-call form failed to load. Please refresh and try again.');
            return;
        }
        const slots = collectCallSlots();
        if (slots.length < MIN_SLOTS) {
            showCallError(`Please pick at least ${MIN_SLOTS} preferred call slots.`);
            return;
        }
        const phoneDigits = callPhone.value.replace(/[^0-9]/g, '');
        if (phoneDigits.length < 6) {
            showCallError('Please enter a valid phone number.');
            return;
        }
        const dial = callDialCode.value;
        if (!dial) {
            showCallError('Please pick your dialling code.');
            return;
        }
        const tz = callTzSelect.value;
        // Build a structured message so the school sees the call request in plain text.
        const slotsText = slots
            .map(s => `• ${s.date} at ${s.time} (${schoolTz})`)
            .join('\n');
        const composedMessage = `Phone-call request\n\nPreferred slots:\n${slotsText}\n\nMy timezone: ${tz}\nPhone: ${dial} ${phoneDigits}`;
        const info = {
            email: email.value,
            name: name.value,
            phone: phoneDigits,
            countryCode: dial,
            message: composedMessage,
            type: 'request_callback',
            school_id: schoolId,
            school_name: schoolName.value,
        };
        sendContact(info);
    }

    function showSubmitError(text) {
        if (activeTab === 'call') showCallError(text);
        else showMessageError(text);
    }

    function sendContact(info) {
        lastSubmittedPayload = info;
        const originalLabel = activeTab === 'call' ? 'Request call' : 'Send';
        confirmBtn.textContent = 'Sending...';
        confirmBtn.style.pointerEvents = 'none';
        fetch('/schools/' + schoolId + '/contact', {
            method: 'POST',
            body: JSON.stringify(info),
        })
            .then(res => res.text().then(text => {
                let parsed = null;
                try { parsed = text ? JSON.parse(text) : null; } catch (_) { /* not JSON */ }
                return {status: res.status, result: parsed, rawText: text};
            }))
            .then(({status, result, rawText}) => {
                if (status === 200) {
                    window.doris && window.doris.trackEvent && window.doris.trackEvent('school_profile_lead', {
                        target: info.type === 'request_callback' ? 'request_callback' : 'have_school_contact_parent',
                        ...info,
                    });
                    hideSheet(contactStep1);
                    contactSuccess.classList.remove('hidden');
                    confirmBtn.textContent = 'Sent';
                    // The preloaded "Next steps" title was neutral; now that we
                    // know which tab the parent used, update it in place.
                    const titleEl = contactSuccess.querySelector('.contact-next-steps .font-bold.text-lg');
                    if (titleEl) {
                        titleEl.textContent = info.type === 'request_callback'
                            ? 'Request the same call from other schools?'
                            : 'Send the same question to other schools?';
                    }
                    return;
                }
                console.error('Failed to save contact', status, (result === null || result === undefined) ? rawText : result);
                confirmBtn.textContent = originalLabel;
                confirmBtn.style.pointerEvents = '';
                if (status === 401) {
                    showSubmitError('Your session has expired. Please sign in again, then resend this.');
                } else if (status === 400) {
                    showSubmitError((result && result.error) || 'We couldn\'t accept that — please double-check your details and try again.');
                } else {
                    showSubmitError('Something went wrong on our end. Please try again in a moment.');
                }
            })
            .catch(err => {
                console.error(err);
                confirmBtn.textContent = originalLabel;
                confirmBtn.style.pointerEvents = '';
                showSubmitError('We couldn\'t reach the server. Check your connection and try again.');
            });
    }
}
