window.addEventListener('DOMContentLoaded', () => {
    bookTourFlow();
});

function bookTourFlow() {
    const form = document.querySelector('.book-tour-form');
    if (!form) {
        // Normal on pages that don't render the book-tour modal (home, lists).
        // But if a "Book Tour" trigger exists yet the form is missing, that's
        // a wiring bug we want to see in devtools.
        if (document.querySelector('.have-book-tour')) {
            console.warn('[book-tour] .book-tour-form not found but .have-book-tour trigger is present — modal will not open.');
        }
        return;
    }
    const schoolId = form.dataset.schoolId;
    const schoolTz = form.dataset.schoolTz || 'UTC';
    const schoolNameMeta = document.querySelector('meta[name="app:school-name"]');
    const schoolName = schoolNameMeta ? schoolNameMeta.content : '';

    // If the school has configured a tour-availability grid in their admin
    // (Tour availability tab), use that. Otherwise fall back to the historical
    // 9am-4pm Mon-Fri window so behaviour for unconfigured schools is identical.
    let tourAvailability = null;
    try {
        const raw = form.dataset.tourAvailability;
        tourAvailability = raw ? JSON.parse(raw) : null;
    } catch (e) { tourAvailability = null; }
    const blackouts = new Set((tourAvailability && tourAvailability.blackouts) || []);
    function isDayAllowed(yyyyMmDd) {
        if (!yyyyMmDd) return false;
        if (blackouts.has(yyyyMmDd)) return false;
        if (!tourAvailability || !tourAvailability.weekly) {
            // Default: Mon-Fri.
            const d = new Date(yyyyMmDd + 'T00:00:00Z');
            const dow = d.getUTCDay(); // 0=Sun, 6=Sat
            return dow >= 1 && dow <= 5;
        }
        const d = new Date(yyyyMmDd + 'T00:00:00Z');
        const isoDow = ((d.getUTCDay() + 6) % 7) + 1; // 1=Mon ... 7=Sun
        const hours = tourAvailability.weekly[String(isoDow)] || [];
        return hours.length > 0;
    }
    function allowedHoursFor(yyyyMmDd) {
        if (!yyyyMmDd) return null; // no date picked yet — show all default slots
        if (!tourAvailability || !tourAvailability.weekly) return null;
        const d = new Date(yyyyMmDd + 'T00:00:00Z');
        const isoDow = ((d.getUTCDay() + 6) % 7) + 1;
        const hours = tourAvailability.weekly[String(isoDow)] || [];
        return new Set(hours.map(Number));
    }

    const step = document.querySelector('.book-tour-step');
    const success = document.querySelector('.book-tour-success');
    const triggers = document.querySelectorAll('.have-book-tour');
    const closes = document.querySelectorAll('.book-tour-close');
    const slots = form.querySelector('.book-tour-slots');
    const addSlotBtn = form.querySelector('.book-tour-add-slot');
    const submitBtn = form.querySelector('.book-tour-submit');
    const errorBox = form.querySelector('.book-tour-error');
    const tzSelect = form.querySelector('.book-tour-timezone');
    const tzHint = form.querySelector('.book-tour-tz-hint');
    const myTzOption = form.querySelector('.book-tour-tz-mine');

    // If the form rendered but its inner pieces are missing (Sentry shows
    // this happens occasionally on /fees — likely a content blocker or a
    // truncated response), bail rather than crashing the whole DOMContentLoaded
    // handler. None of the downstream wiring can work without these.
    if (!slots || !addSlotBtn || !submitBtn || !tzSelect || !step || !success) {
        console.warn('[book-tour] form is missing inner elements — skipping init.');
        return;
    }

    const MAX_SLOTS = 5;
    const MIN_SLOTS = 2;

    // Auto-detect browser timezone and re-label the "My timezone" option to
    // include it, e.g. "My timezone (Asia/Singapore)". If the detected tz is
    // a known IANA name and exists as a normal option, use it as the value.
    const detectedTz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || '';
    if (myTzOption) {
        const knownOption = detectedTz
            ? Array.from(tzSelect.options).find(o => o.value === detectedTz && o !== myTzOption)
            : null;
        if (knownOption) {
            myTzOption.value = detectedTz;
            myTzOption.textContent = `My timezone (${detectedTz})`;
        } else if (detectedTz) {
            myTzOption.textContent = `My timezone (${detectedTz})`;
        }
    }

    function open() {
        if (!nextStepsPreloaded) {
            nextStepsPreloaded = true;
            preloadNextSteps();
        }
        step.style.height = '100dvh';
        step.classList.remove('invisible');
        document.body.style.overflow = 'hidden';
        // No trackEvent here — the CTA pill's data-name="school_profile_open_book_tour"
        // already fires that event on click via doris.js's tracked-class handler.
    }

    function closeAll() {
        step.style.height = '0';
        step.classList.add('invisible');
        success.classList.add('hidden');
        document.body.style.overflow = '';
    }

    let lastSubmittedPayload = null;

    function showSuccess() {
        step.style.height = '0';
        step.classList.add('invisible');
        success.classList.remove('hidden');
    }

    // Pre-build the "Next steps" UI when the sheet first opens so it's ready
    // the moment the success screen appears — no async wait, no flicker. Not
    // fetched on page load: most visitors never open the sheet, and the
    // request was showing up in the page's critical-path network chain.
    let nextStepsPreloaded = false;
    function preloadNextSteps() {
        const container = success.querySelector('.book-tour-next-steps');
        if (!container) {
            console.warn('[book-tour] .book-tour-next-steps container missing — stale HTML? Hard-refresh.');
            return;
        }
        fetch('/schools/book-tour/suggestions?exclude=' + encodeURIComponent(schoolId), {
            credentials: 'same-origin',
        }).then(res => {
            if (!res.ok) {
                return null;
            }
            return res.json();
        }).then(data => {
            if (!data) {
                return;
            }
            const list = (data.shortlisted && data.shortlisted.length > 0)
                ? {schools: data.shortlisted, label: 'shortlisted'}
                : (data.recentlyViewed && data.recentlyViewed.length > 0)
                    ? {schools: data.recentlyViewed, label: 'recentlyViewed'}
                    : null;
            if (!list) {
                return;
            }
            const heading = list.label === 'shortlisted'
                ? 'Other schools on your shortlist'
                : 'Schools you\'ve recently viewed';
            const subheading = list.label === 'shortlisted'
                ? 'One tap sends the same tour request — same dates, times and format.'
                : 'Send the same tour request to a school you\'ve been looking at.';
            const cards = list.schools.map(s => `
                <div class="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm" data-school-id="${escAttr(s.id)}">
                    <div class="flex items-center gap-x-3 min-w-0 sm:flex-1">
                        <img alt="${escAttr(s.name)}" src="${escAttr(s.logo || '/images/doris-inquisitive.svg')}" class="w-20 h-20 rounded-lg object-contain shrink-0 bg-gray-50" />
                        <div class="flex-1 min-w-0">
                            <div class="truncate">${escHtml(s.name)}</div>
                            <div class="text-xs text-gray-500 truncate">${escHtml(s.location || '')}</div>
                        </div>
                    </div>
                    <button type="button" class="book-tour-resend bg-tertiary text-white rounded-full sm:rounded-xl px-3 py-2 text-xs cursor-pointer hover:opacity-90 w-full mx-auto sm:w-auto sm:max-w-none sm:mx-0 sm:shrink-0">Request same tour</button>
                </div>`).join('');
            container.innerHTML = `
                <div class="mt-8 pt-6 border-t border-gray-100">
                    <div class="font-bold text-lg mb-1">Next steps</div>
                    <p class="text-sm text-gray-600 mb-4">${escHtml(subheading)}</p>
                    <div class="text-xs uppercase tracking-wide text-gray-500 mb-2">${escHtml(heading)}</div>
                    <div class="book-tour-suggestions flex flex-col gap-y-4">${cards}</div>
                </div>
            `;
            container.querySelectorAll('.book-tour-resend').forEach(btn => {
                btn.addEventListener('click', () => resendTour(btn));
            });
        }).catch(err => {
            console.error('[book-tour] suggestions fetch failed', err);
        });
    }

    function titleCase(s) {
        if (!s) return '';
        return String(s).replace(/\b\w/g, c => c.toUpperCase());
    }

    function escHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
    }
    function escAttr(s) {
        return escHtml(s);
    }

    function resendTour(btn) {
        const row = btn.closest('[data-school-id]');
        const targetId = row && row.dataset.schoolId;
        if (!targetId || !lastSubmittedPayload) return;
        btn.disabled = true;
        btn.textContent = 'Sending…';
        btn.classList.add('opacity-60', 'pointer-events-none');
        fetch('/schools/' + targetId + '/book-tour', {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            credentials: 'same-origin',
            body: JSON.stringify(lastSubmittedPayload),
        }).then(res => res.json().then(result => ({status: res.status, result}))).then(({status, result}) => {
            if (status === 200) {
                btn.textContent = '✓ Sent';
                btn.classList.remove('opacity-60', 'bg-tertiary');
                btn.classList.add('bg-emerald-500');
            } else {
                btn.disabled = false;
                btn.textContent = 'Retry';
                btn.classList.remove('opacity-60', 'pointer-events-none');
                console.error('Failed to request tour at ' + targetId, result);
            }
        }).catch(err => {
            btn.disabled = false;
            btn.textContent = 'Retry';
            btn.classList.remove('opacity-60', 'pointer-events-none');
            console.error(err);
        });
    }

    // Build the 30-minute school-local time slots from 07:00 to 19:00 inclusive.
    // Each value is a pair "schoolDate|schoolTime" (school-local), which is the
    // canonical thing we send to the server. The label optionally annotates the
    // equivalent in the user's selected timezone.
    function generateSchoolSlots(forDateStr) {
        const out = [];
        // The school's saved availability is hour-of-day only (the admin grid
        // picks whole hours). When it's set for the picked date we offer just
        // those hour-starts; otherwise we fall back to the historical 9-16
        // half-hourly default.
        const allowed = allowedHoursFor(forDateStr);
        if (allowed) {
            const sorted = [...allowed].sort((a, b) => a - b);
            sorted.forEach(h => out.push({h, m: 0}));
            return out;
        }
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

    // Take a YYYY-MM-DD date string and a HH:MM time string interpreted in
    // `schoolTz`, and return the equivalent {date, time, dayLabel} in `userTz`.
    function convertSchoolToUser(dateStr, timeStr, userTz) {
        if (!dateStr || !timeStr || userTz === schoolTz) return null;
        // Figure out the actual UTC instant for (dateStr, timeStr) in schoolTz.
        // We do this by computing the schoolTz offset for that instant and
        // applying it. Intl can format from a UTC instant to any tz, but the
        // reverse needs a small dance.
        const [Y, Mo, D] = dateStr.split('-').map(Number);
        const [hh, mm] = timeStr.split(':').map(Number);
        // First guess: treat the wall-clock as UTC, then ask what time that is
        // in schoolTz, and shift by the difference.
        const guessUtcMs = Date.UTC(Y, Mo - 1, D, hh, mm);
        const offset = tzOffsetMinutes(guessUtcMs, schoolTz);
        const actualUtcMs = guessUtcMs - offset * 60000;
        return formatInTz(new Date(actualUtcMs), userTz);
    }

    function tzOffsetMinutes(utcMs, tz) {
        // Offset, in minutes, that the given tz is ahead of UTC at this instant.
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

    function formatInTz(date, tz) {
        const dtf = new Intl.DateTimeFormat('en-GB', {
            timeZone: tz,
            weekday: 'short', day: '2-digit', month: 'short',
            hour: 'numeric', minute: '2-digit', hour12: true,
        });
        const parts = dtf.formatToParts(date).reduce((acc, p) => {
            if (p.type !== 'literal') acc[p.type] = p.value;
            return acc;
        }, {});
        const period = (parts.dayPeriod || '').toUpperCase();
        // e.g. "Mon 12 May, 2:30 PM"
        return {
            date: `${parts.weekday} ${parts.day} ${parts.month}`,
            time: `${parts.hour}:${parts.minute}${period ? ' ' + period : ''}`,
        };
    }

    function pad2(n) { return n < 10 ? '0' + n : '' + n; }

    function populateTimeOptions(row) {
        const dateSelect = row.querySelector('.book-tour-slot-date');
        const timeSelect = row.querySelector('.book-tour-slot-time');
        const date = dateSelect.value;
        const userTz = tzSelect.value;
        const previous = timeSelect.value;

        // (date,time) pairs already picked in OTHER rows — those options
        // should be disabled here so the same instant can't be picked twice.
        const takenOnThisDate = new Set();
        slots.querySelectorAll('.book-tour-slot').forEach(other => {
            if (other === row) return;
            const d = other.querySelector('.book-tour-slot-date').value;
            const t = other.querySelector('.book-tour-slot-time').value;
            if (d && t && d === date) takenOnThisDate.add(t);
        });

        const opts = [`<option value="">Time</option>`];
        for (const slot of generateSchoolSlots(date)) {
            const schoolTime = `${pad2(slot.h)}:${pad2(slot.m)}`;
            const schoolTimeLabel = to12h(slot.h, slot.m);
            let label = `${schoolTimeLabel} school time`;
            if (date && userTz && userTz !== schoolTz) {
                const conv = convertSchoolToUser(date, schoolTime, userTz);
                if (conv) label = `${conv.time} your time (${schoolTimeLabel} school)`;
            } else if (!date) {
                label = schoolTimeLabel;
            }
            const taken = takenOnThisDate.has(schoolTime);
            const disabledAttr = taken ? ' disabled' : '';
            const displayLabel = taken ? `${label} (already picked)` : label;
            opts.push(`<option value="${schoolTime}"${disabledAttr}>${displayLabel}</option>`);
        }
        timeSelect.innerHTML = opts.join('');
        // Restore previous selection if still valid AND not now disabled.
        if (previous) {
            const match = Array.from(timeSelect.options).find(o => o.value === previous);
            if (match && !match.disabled) timeSelect.value = previous;
            else timeSelect.value = '';
        }
    }

    function updateTzHint() {
        if (!tzHint) return;
        const userTz = tzSelect.value;
        if (userTz && userTz !== schoolTz) {
            tzHint.textContent = `School is in ${schoolTz}. Slots below show your local time alongside the school's.`;
        } else {
            tzHint.textContent = `School is in ${schoolTz}.`;
        }
    }

    function collectSlots() {
        return Array.from(slots.querySelectorAll('.book-tour-slot')).map(row => ({
            date: row.querySelector('.book-tour-slot-date').value,
            time: row.querySelector('.book-tour-slot-time').value,
        })).filter(s => s.date && s.time);
    }

    function validate() {
        const mode = (function () {
            const checked = form.querySelector('input[name="book-tour-mode"]:checked');
            return checked ? checked.value : 'in_person';
        })();
        if (mode === 'open_house') {
            const sel = form.querySelector('.book-tour-open-house-event');
            const eventId = sel ? sel.value : '';
            if (!eventId) return {ok: false, msg: 'Please pick an open house date.'};
            return {ok: true, mode: 'open_house', eventId};
        }
        const collected = collectSlots();
        if (collected.length < MIN_SLOTS) {
            return {ok: false, msg: `Please pick at least ${MIN_SLOTS} preferred slots.`};
        }
        return {ok: true, mode, slots: collected};
    }

    function refreshSubmit() {
        const v = validate();
        if (v.ok) {
            submitBtn.classList.remove('opacity-50', 'pointer-events-none');
        } else {
            submitBtn.classList.add('opacity-50', 'pointer-events-none');
        }
    }

    function wireSlotRow(row) {
        const dateSelect = row.querySelector('.book-tour-slot-date');
        const timeSelect = row.querySelector('.book-tour-slot-time');
        const removeBtn = row.querySelector('.book-tour-slot-remove');
        // Any change to date or time in any row can affect which options are
        // available in every other row, so refresh them all.
        dateSelect.addEventListener('change', () => {
            refreshAllTimeOptions();
            refreshSubmit();
        });
        timeSelect.addEventListener('change', () => {
            refreshAllTimeOptions();
            refreshSubmit();
            // Fire a "slot chosen" event whenever the parent picks both a
            // date and time on a row. This will fire multiple times per row
            // if they change their mind — dedupe downstream by session + slot.
            if (dateSelect.value && timeSelect.value
                && window.doris && typeof window.doris.saveEvent === 'function') {
                const rows = Array.from(slots.querySelectorAll('.book-tour-slot'));
                // DB-only analytics — the booking itself is the conversion.
                window.doris.saveEvent({name: 'book_tour_slot_chosen', data: {
                    school_id: schoolId,
                    school_name: schoolName,
                    slot_index: rows.indexOf(row),
                    date: dateSelect.value,
                    time: timeSelect.value,
                    school_tz: schoolTz,
                    user_tz: tzSelect.value,
                }});
            }
        });
        removeBtn.addEventListener('click', () => {
            row.remove();
            updateRemoveButtons();
            refreshAllTimeOptions();
            refreshSubmit();
        });
        populateTimeOptions(row);
    }

    function updateRemoveButtons() {
        const rows = slots.querySelectorAll('.book-tour-slot');
        rows.forEach((row) => {
            const btn = row.querySelector('.book-tour-slot-remove');
            if (rows.length > MIN_SLOTS) btn.classList.remove('hidden');
            else btn.classList.add('hidden');
        });
        if (rows.length >= MAX_SLOTS) addSlotBtn.classList.add('hidden');
        else addSlotBtn.classList.remove('hidden');
    }

    function addSlotRow() {
        const rows = slots.querySelectorAll('.book-tour-slot');
        if (rows.length >= MAX_SLOTS) return;
        const template = rows[0];
        const clone = template.cloneNode(true);
        clone.querySelector('.book-tour-slot-date').value = '';
        clone.querySelector('.book-tour-slot-time').innerHTML = '<option value="">Time</option>';
        slots.appendChild(clone);
        wireSlotRow(clone);
        pruneDateOptions(clone);
        updateRemoveButtons();
        refreshSubmit();
    }

    function refreshAllTimeOptions() {
        slots.querySelectorAll('.book-tour-slot').forEach(populateTimeOptions);
    }

    // Grey out + disable dates the school doesn't accept tours on, so the
    // parent can't even pick them. Applied to every date <select> on the form
    // (each slot row clones from the first, so we apply per-row).
    function pruneDateOptions(row) {
        const dateSelect = row.querySelector('.book-tour-slot-date');
        if (!dateSelect) return;
        Array.from(dateSelect.options).forEach(opt => {
            if (!opt.value) return;
            const ok = isDayAllowed(opt.value);
            opt.disabled = !ok;
            opt.style.color = ok ? '' : '#9ca3af';
        });
        // If the currently selected date is now disabled (e.g. config changed
        // mid-session), clear it.
        if (dateSelect.value && !isDayAllowed(dateSelect.value)) dateSelect.value = '';
    }
    function pruneAllDateOptions() {
        slots.querySelectorAll('.book-tour-slot').forEach(pruneDateOptions);
    }

    // Wire initial row
    slots.querySelectorAll('.book-tour-slot').forEach(wireSlotRow);
    pruneAllDateOptions();
    updateRemoveButtons();
    updateTzHint();
    tzSelect.addEventListener('change', () => {
        updateTzHint();
        refreshAllTimeOptions();
    });

    triggers.forEach(t => t.addEventListener('click', open));
    closes.forEach(c => c.addEventListener('click', closeAll));
    addSlotBtn.addEventListener('click', addSlotRow);

    // Format toggle has 3 options: in_person / virtual / open_house. The
    // first two share the same slot+timezone picker. Switching to open_house
    // hides those and reveals an event-date dropdown instead.
    const modeRadios = form.querySelectorAll('input[name="book-tour-mode"]');
    const privateFields = form.querySelector('.book-tour-private-fields');
    const openHouseFields = form.querySelector('.book-tour-open-house-fields');
    const openHouseSelect = form.querySelector('.book-tour-open-house-event');

    function currentMode() {
        const checked = form.querySelector('input[name="book-tour-mode"]:checked');
        return checked ? checked.value : 'in_person';
    }

    function applyModeUi() {
        const mode = currentMode();
        if (mode === 'open_house' && openHouseFields) {
            if (privateFields) privateFields.classList.add('hidden');
            openHouseFields.classList.remove('hidden');
            submitBtn.textContent = 'Register for open house';
        } else {
            if (privateFields) privateFields.classList.remove('hidden');
            if (openHouseFields) openHouseFields.classList.add('hidden');
            submitBtn.textContent = 'Book Tour';
        }
        refreshSubmit();
    }

    modeRadios.forEach(r => r.addEventListener('change', applyModeUi));
    if (openHouseSelect) {
        openHouseSelect.addEventListener('change', refreshSubmit);
    }
    applyModeUi();

    function showError(msg) {
        errorBox.textContent = msg;
        errorBox.classList.remove('hidden');
        errorBox.scrollIntoView({behavior: 'smooth', block: 'center'});
    }

    submitBtn.addEventListener('click', () => {
        const v = validate();
        if (!v.ok) {
            showError(v.msg);
            return;
        }
        errorBox.classList.add('hidden');

        let payload;
        if (v.mode === 'open_house') {
            payload = {mode: 'open_house', event_id: v.eventId};
        } else {
            const timezone = tzSelect.value;
            payload = {slots: v.slots, timezone, mode: v.mode};
        }
        lastSubmittedPayload = payload;

        const originalSubmitText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.classList.add('opacity-50', 'pointer-events-none');

        fetch('/schools/' + schoolId + '/book-tour', {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify(payload),
        }).then(res => res.json().then(result => ({status: res.status, result}))).then(({status, result}) => {
            if (status === 200) {
                if (window.doris && typeof window.doris.trackEvent === 'function') {
                    window.doris.trackEvent('school_profile_lead', {
                        target: v.mode === 'open_house' ? 'open_house_register' : 'book_tour_request',
                        school_id: schoolId,
                        school_name: schoolName,
                        slots: v.mode !== 'open_house' ? v.slots : undefined,
                        timezone: v.mode !== 'open_house' ? tzSelect.value : undefined,
                        mode: payload.mode,
                        event_id: v.mode === 'open_house' ? v.eventId : undefined,
                    });
                }
                showSuccess();
            } else {
                showError((result && result.error) ? result.error : 'Something went wrong, please try again.');
                submitBtn.textContent = originalSubmitText;
                submitBtn.classList.remove('opacity-50', 'pointer-events-none');
            }
        }).catch(err => {
            console.error(err);
            showError('Something went wrong, please try again.');
            submitBtn.textContent = originalSubmitText;
            submitBtn.classList.remove('opacity-50', 'pointer-events-none');
        });
    });
}
