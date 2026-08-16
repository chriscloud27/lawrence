document.addEventListener('DOMContentLoaded', function () {
    submitInfo();
    setupGoogleOAuth();
});

function submitInfo() {
    const submit = document.getElementById('submit-register');
    const error = document.getElementById('error');
    const name = document.querySelector('#register-form input[name="name"]');
    const email = document.querySelector('#register-form input[name="email"]');
    const password = document.querySelector('#register-form input[name="password"]');
    const terms = document.querySelector('#register-form input[name="agreement"]');
    const emailRegex = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{1,63}$/

    submit.addEventListener('click', e => {
        const pw = password.value;
        const emailClean = email.value.toLowerCase().replace(/\s+/g, '');
        const nameClean = name.value.toLowerCase().trim();

        if (!emailClean || !emailRegex.test(emailClean)) {
            error.classList.remove('hidden');
            error.innerText = 'Email is invalid';
            return;
        }
        if (!pw || pw.length < 8) {
            error.classList.remove('hidden');
            error.innerText = 'Password must be at least 8 characters';
            return;
        }
        if (!nameClean || nameClean.length < 2) {
            error.classList.remove('hidden');
            error.innerText = 'Name must be at least 2 characters';
            return;
        }
        if (!(terms.checked)) {
            error.classList.remove('hidden');
            error.innerText = 'To continue, please agree to the terms';
            return;
        }

        var ageBandInput = document.querySelector('select[name="age-band"]');
        var ageBand = ageBandInput ? ageBandInput.value : '';
        if (!ageBand) {
            error.classList.remove('hidden');
            error.innerText = 'Please choose your age range';
            return;
        }

        // Disable the button to prevent multiple submissions
        submit.disabled = true;
        submit.classList.add('opacity-50', 'cursor-not-allowed');

        const marketingInput = document.querySelector('input[name="marketing-emails"]');
        const marketing = marketingInput ? marketingInput.checked : undefined;

        fetch('/parent/register', {
            method: 'POST',
            // `agreement` is now sent and verified server-side. The client check
            // above stays as the friendly message, but it was previously the ONLY
            // check: the value was never posted, so a direct POST could create an
            // account having agreed to nothing.
            body: JSON.stringify({name: nameClean, email: emailClean, password: pw, marketing, agreement: terms.checked, 'age-band': ageBand}),
            headers: {"content-type": "application/json"},
        })
            .then(res => {
                res.text().then(msg => {
                    if (res.status === 200) {
                        localStorage.setItem('registering-email', emailClean);
                        const alreadyTracked = localStorage.getItem('oauth-reg');
                        if (!alreadyTracked) {
                            window.doris.trackEvent('parent_registered', {email: emailClean});
                        }
                        setTimeout(() => window.location = '/parent/confirm', 10);
                    } else {
                        error.classList.remove('hidden');
                        error.innerHTML = msg;

                        submit.disabled = false;
                        submit.classList.remove('opacity-50', 'cursor-not-allowed');
                    }
                })
            })
            .catch(err => {
                console.error(err);
            });
    });
}


// Google and the email form now share ONE consent block (there used to be a
// duplicate pair per path, and the JS read the first of each for both). The block
// sits below this button, so when terms aren't agreed we scroll it into view and
// flash it rather than showing an error the parent can't see the cause of.
function setupGoogleOAuth() {
    const googleButton = document.getElementById('google-oauth');
    if (!googleButton) return;

    const consent = document.querySelector('#register-form input[name="agreement"]');
    const marketing = document.querySelector('#register-form input[name="marketing-emails"]');
    const consentError = document.getElementById('oauth-consent-error');
    const consentBlock = document.getElementById('consent-block');

    googleButton.addEventListener('click', () => {
        if (consent && consent.checked) {
            const wantsMarketing = marketing ? marketing.checked === true : false;
            window.location.href = `/parent/google/login?marketing=${wantsMarketing}`;
            return;
        }
        if (consentError) consentError.classList.remove('hidden');
        if (consentBlock) {
            consentBlock.scrollIntoView({behavior: 'smooth', block: 'center'});
            consentBlock.classList.add('bg-secondary');
            setTimeout(() => consentBlock.classList.remove('bg-secondary'), 1200);
        }
        if (consent) consent.focus();
    });
}
