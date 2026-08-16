window.addEventListener('DOMContentLoaded', () => {
    applyInterestFlow();
});

function applyInterestFlow() {
    const form = document.querySelector('.apply-interest-form');
    if (!form) {
        if (document.querySelector('.have-apply-interest')) {
            console.warn('[apply-interest] .apply-interest-form not found but .have-apply-interest trigger is present — modal will not open.');
        }
        return;
    }
    const schoolId = form.dataset.schoolId;
    const applyNowHref = form.dataset.applyNowHref || '';

    const step = document.querySelector('.apply-interest-step');
    const success = document.querySelector('.apply-interest-success');
    const triggers = document.querySelectorAll('.have-apply-interest');
    const closes = document.querySelectorAll('.apply-interest-close');
    const submitBtn = form.querySelector('.apply-interest-submit');
    const errorBox = form.querySelector('.apply-interest-error');
    const numChildren = form.querySelector('.apply-interest-num-children');
    const nationality = form.querySelector('.apply-interest-nationality');
    const startYear = form.querySelector('.apply-interest-start-year');
    const startMonth = form.querySelector('.apply-interest-start-month');
    const messageEl = form.querySelector('.apply-interest-message');

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

    triggers.forEach(t => t.addEventListener('click', e => {
        // cta-shortcut-gate.js handles the anonymous case (register popup);
        // for logged-in parents we just open.
        if (t.classList.contains('cta-shortcut-blocked')) return;
        e.preventDefault();
        clearError();
        open();
    }));

    closes.forEach(c => c.addEventListener('click', closeAll));

    // "Book a tour instead" link on the success step: close the apply tray
    // first, then in the next tick open the book-tour modal so the body-scroll
    // lock is reapplied after closeAll resets it. We dispatch a synthetic click
    // on the existing `.have-book-tour` trigger rather than poking the book-
    // tour modal directly, so the gating logic in book-tour.js still applies.
    document.querySelectorAll('.apply-interest-switch-to-book-tour').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            closeAll();
            setTimeout(() => {
                const trigger = document.querySelector('.have-book-tour');
                if (trigger) trigger.click();
            }, 0);
        });
    });

    submitBtn.addEventListener('click', () => {
        clearError();
        const nc = numChildren.value;
        if (!nc) {
            showError('Please tell us how many children are applying.');
            return;
        }
        const payload = {
            num_children: parseInt(nc, 10),
            nationality: (nationality.value || '').trim() || null,
            expected_start_year: startYear.value ? parseInt(startYear.value, 10) : null,
            expected_start_month: startMonth && startMonth.value ? parseInt(startMonth.value, 10) : null,
            message: (messageEl.value || '').trim() || null,
        };
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-60', 'pointer-events-none');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending…';
        fetch('/schools/' + schoolId + '/apply-interest', {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            credentials: 'same-origin',
            body: JSON.stringify(payload),
        }).then(res => res.json().then(result => ({status: res.status, result}))).then(({status, result}) => {
            if (status === 200) {
                showSuccess();
            } else if (status === 401) {
                // Anonymous parents shouldn't be able to reach this — the
                // CTA gate covers them — but if a session expired mid-form,
                // surface a clear next step.
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
