window.addEventListener('DOMContentLoaded', () => {
    availabilityFlow();
    availabilityTeaserFlow();
});

// Non-partner profiles: the greyed at-a-glance availability cell opens a
// "not shared on this profile" tray (availabilityTeaserTray) instead of the
// ask-the-school form.
function availabilityTeaserFlow() {
    const step = document.querySelector('.availability-teaser-step');
    if (!step) return;
    const triggers = document.querySelectorAll('.have-availability-teaser');
    const closes = document.querySelectorAll('.availability-teaser-close');

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

function availabilityFlow() {
    const form = document.querySelector('.availability-form');
    if (!form) {
        if (document.querySelector('.have-availability-check')) {
            console.warn('[availability] .availability-form not found but trigger present — modal will not open.');
        }
        return;
    }
    const schoolId = form.dataset.schoolId;
    const step = document.querySelector('.availability-step');
    const success = document.querySelector('.availability-success');
    const triggers = document.querySelectorAll('.have-availability-check');
    const closes = document.querySelectorAll('.availability-close');
    const submitBtn = form.querySelector('.availability-submit');
    const errorBox = form.querySelector('.availability-error');
    const agesContainer = form.querySelector('.availability-ages');
    const addAgeBtn = form.querySelector('.availability-add-age');
    const startMonthEl = form.querySelector('.availability-start-month');
    const startYearEl = form.querySelector('.availability-start-year');
    const extraEl = form.querySelector('.availability-extra');
    const nationalityEl = form.querySelector('.availability-nationality');

    const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const MAX_CHILDREN = 6;

    // When the parent picks the current year, months that have already passed
    // aren't valid starts. Disable them. Re-enable for any other year. If the
    // currently-selected month becomes disabled, clear it so we don't submit
    // a stale value.
    const currentYear = parseInt(form.dataset.currentYear || '0', 10);
    const currentMonth = parseInt(form.dataset.currentMonth || '0', 10);
    function updateMonthAvailability() {
        const chosenYear = parseInt(startYearEl.value || '0', 10);
        const blockBefore = chosenYear === currentYear ? currentMonth : 0;
        Array.from(startMonthEl.options).forEach(opt => {
            if (!opt.value) return;
            const m = parseInt(opt.value, 10);
            const disabled = m < blockBefore;
            opt.disabled = disabled;
            opt.style.color = disabled ? '#9ca3af' : '';
        });
        const selectedMonth = parseInt(startMonthEl.value || '0', 10);
        if (selectedMonth && selectedMonth < blockBefore) startMonthEl.value = '';
    }
    if (startYearEl && startMonthEl && currentYear && currentMonth) {
        startYearEl.addEventListener('change', updateMonthAvailability);
        updateMonthAvailability();
    }

    function open() {
        step.style.height = '100dvh';
        step.classList.remove('invisible');
        document.body.style.overflow = 'hidden';
    }
    function closeAll() {
        step.style.height = '0';
        step.classList.add('invisible');
        success.classList.add('hidden');
        document.body.style.overflow = '';
    }
    function showSuccess() {
        step.style.height = '0';
        step.classList.add('invisible');
        success.classList.remove('hidden');
    }
    function showError(msg) {
        errorBox.textContent = msg;
        errorBox.classList.remove('hidden');
    }
    function clearError() {
        errorBox.textContent = '';
        errorBox.classList.add('hidden');
    }

    function ageRows() {
        return Array.from(agesContainer.querySelectorAll('.availability-age-row'));
    }

    function updateRemoveButtons() {
        const rows = ageRows();
        rows.forEach((row) => {
            const btn = row.querySelector('.availability-age-remove');
            if (rows.length > 1) btn.classList.remove('hidden');
            else btn.classList.add('hidden');
        });
        if (rows.length >= MAX_CHILDREN) addAgeBtn.classList.add('hidden');
        else addAgeBtn.classList.remove('hidden');
    }

    function wireAgeRow(row) {
        const removeBtn = row.querySelector('.availability-age-remove');
        removeBtn.addEventListener('click', () => {
            if (ageRows().length <= 1) return; // never remove the last row
            row.remove();
            updateRemoveButtons();
        });
    }

    function addAgeRow() {
        const rows = ageRows();
        if (rows.length >= MAX_CHILDREN) return;
        const clone = rows[0].cloneNode(true);
        clone.querySelector('select.availability-age').value = '';
        agesContainer.appendChild(clone);
        wireAgeRow(clone);
        updateRemoveButtons();
    }

    // Wire the initial row + add button.
    ageRows().forEach(wireAgeRow);
    addAgeBtn.addEventListener('click', addAgeRow);
    updateRemoveButtons();

    triggers.forEach(t => {
        t.addEventListener('click', e => {
            if (t.classList.contains('cta-shortcut-blocked')) return;
            e.preventDefault();
            clearError();
            open();
        });
        t.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                t.click();
            }
        });
    });

    closes.forEach(c => c.addEventListener('click', closeAll));

    submitBtn.addEventListener('click', () => {
        clearError();
        const ages = ageRows()
            .map(r => r.querySelector('select.availability-age').value)
            .filter(v => v !== '');
        const month = startMonthEl.value;
        const year = startYearEl.value;
        const extra = (extraEl.value || '').trim();
        const nationality = (nationalityEl && nationalityEl.value || '').trim();

        // Build a structured message so the school sees the question framed
        // the same way every time. Empty fields are omitted.
        const parts = ["I'd like to ask about availability."];
        if (ages.length > 0) {
            const labelled = ages.map(a => a === '0' ? 'newborn' : a === '0.5' ? '6 months' : a === '1' ? '1 year' : `${a} years`);
            parts.push(`Children's ages: ${labelled.join(', ')}`);
        }
        if (month && year) {
            parts.push(`Earliest start: ${MONTH_NAMES[parseInt(month, 10)]} ${year}`);
        } else if (year) {
            parts.push(`Earliest start: ${year}`);
        }
        if (nationality) parts.push(`Where the family is from: ${nationality}`);
        if (extra) parts.push(`\n${extra}`);
        const message = parts.join('\n');

        const payload = {
            message,
            type: 'availability',
        };
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending…';
        submitBtn.classList.add('opacity-60', 'pointer-events-none');

        fetch('/schools/' + schoolId + '/contact', {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            credentials: 'same-origin',
            body: JSON.stringify(payload),
        }).then(res => res.json().then(result => ({status: res.status, result}))).then(({status, result}) => {
            if (status === 200) {
                if (window.doris && typeof window.doris.trackEvent === 'function') {
                    window.doris.trackEvent('school_profile_lead', {
                        target: 'availability_check',
                        school_id: schoolId,
                    });
                }
                showSuccess();
            } else if (status === 401) {
                showError('Please sign in to send this. Refresh the page and try again.');
            } else {
                showError((result && result.error) || 'Something went wrong — please try again.');
            }
        }).catch(err => {
            console.error(err);
            showError('Network error — please try again.');
        }).finally(() => {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-60', 'pointer-events-none');
            submitBtn.textContent = originalText;
        });
    });
}
