(function () {
    // Targets that get 2 free uses per browser before we ask the parent to
    // sign up. They're all "lead the parent OFF doris" actions where a small
    // amount of free use builds trust before the gate.
    var FREE_TARGETS = ['visit_website', 'download_prospectus', 'virtual_tour', 'apply_now'];
    // The school's own social profiles, which are outbound links in exactly the
    // same sense. Matched by prefix because the target is `social-<network>`
    // and the list of networks changes; `share-*` is deliberately NOT included,
    // since that is a parent promoting the school rather than leaving for it.
    function isFreeTarget(target) {
        return FREE_TARGETS.indexOf(target) !== -1 || /^social-/.test(target || '');
    }
    var FREE_LIMIT = 2;
    var STORAGE_KEY = 'doris-cta-free-uses';

    function getUseCount() {
        try {
            var raw = window.localStorage && window.localStorage.getItem(STORAGE_KEY);
            var n = parseInt(raw || '0', 10);
            return isNaN(n) ? 0 : n;
        } catch (_) { return 0; }
    }

    function incrementUseCount() {
        try {
            if (window.localStorage) {
                window.localStorage.setItem(STORAGE_KEY, String(getUseCount() + 1));
            }
        } catch (_) { /* private mode etc. — silently ignore */ }
    }

    // Prefer the hydrated /api/me result (set by doris.js → window.doris.user).
    // Fall back to the server-rendered <meta name="app:email"> tag for the brief
    // pre-hydration window (~50–200ms after page load).
    function isLoggedIn() {
        if (window.doris && window.doris.user) return !!window.doris.user.email;
        return !!document.querySelector('meta[name="app:email"]');
    }

    function promptSignUp(message, source) {
        var popup = document.querySelector('#register-popup');
        if (!popup) {
            // Track the fallback path so the funnel still has data even when
            // the popup isn't on the page.
            if (window.doris && typeof window.doris.saveEvent === 'function') {
                window.doris.saveEvent({name: 'register_popup_shown', data: {
                    source: source || 'unknown',
                    via: 'redirect',
                }});
            }
            window.location.href = '/parent/register';
            return;
        }
        var msg = popup.querySelector('.parent-message');
        if (msg && message) msg.textContent = message;
        var btn = popup.querySelector('.modal-open-button');
        if (btn) btn.click();
        // Conversion-rate denominator — fires every time the popup is shown.
        // DB-only analytics, not an ad-pixel conversion.
        if (window.doris && typeof window.doris.saveEvent === 'function') {
            window.doris.saveEvent({name: 'register_popup_shown', data: {
                source: source || 'unknown',
                via: 'modal',
            }});
        }
    }

    // Free/unlicensed schools gate contact channels: the first registered
    // parent to open one unlocks it (and keeps working for them); everyone else
    // is gated. For a registered parent we ask /connect for the verdict via JSON
    // (?intent=1) so we can act without a page reload — open the channel, or
    // show the "channels not open yet" popup. The server records the click
    // (opened|gated) either way, for demand analysis.
    function decideGatedChannel(el) {
        var url = el.getAttribute('href');
        if (!url) { openChannelsClosedPopup(); return; }
        var sep = url.indexOf('?') === -1 ? '?' : '&';
        fetch(url + sep + 'intent=1', {headers: {accept: 'application/json'}, credentials: 'same-origin'})
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d && d.ok && d.href) { window.location.href = d.href; return; }
                if (d && d.reason === 'register') { promptSignUp('Register to use doris shortcuts', 'connect_gated'); return; }
                openChannelsClosedPopup();
            })
            // Network error: fall back to the plain /connect navigation, which
            // 302s to the channel or back with ?channels_closed (handled below).
            .catch(function () { window.location.href = url; });
    }

    function openChannelsClosedPopup() {
        var popup = document.querySelector('#channels-closed-popup');
        var btn = popup && popup.querySelector('.modal-open-button');
        if (btn) { btn.click(); return; }
        // No popup rendered (shouldn't happen once a gated channel is on the
        // page) — fall back to a sign-up nudge so the click isn't a dead end.
        promptSignUp("This school's contact channels aren't open yet", 'channels_closed');
    }

    // When the register popup is opened from a click that ALSO opened a
    // book-tour / contact modal, we want closing the register to also close
    // the underlying modal — otherwise the parent sees a half-filled form
    // and no clear next step. Track which sheet (if any) we opened together
    // and dismiss it when the register modal closes.
    var sheetsToCloseWithRegister = [];
    var registerObserverWired = false;

    function closeSheet(sheet) {
        if (!sheet) return;
        // Mirror what book-tour.js / contact-school.js do in their own
        // close handlers (sheet height collapsed + invisible).
        sheet.style.height = '0';
        sheet.classList.add('invisible');
        document.body.style.overflow = '';
    }

    // The register popup uses .modal-exit / .modal-background / Escape to
    // close — there's no single "close" event. We observe its
    // .modal-content's class list instead: doris.js's show()/hide() toggles
    // the `invisible` class. When it goes back to invisible, the user has
    // dismissed; we then close any sheets coupled to this open cycle.
    function wireRegisterObserver() {
        if (registerObserverWired) return;
        var popup = document.querySelector('#register-popup');
        if (!popup) return;
        var content = popup.querySelector('.modal-content');
        if (!content) return;
        var wasVisible = !content.classList.contains('invisible');
        var observer = new MutationObserver(function () {
            var nowVisible = !content.classList.contains('invisible');
            if (wasVisible && !nowVisible) {
                // Transition from visible → invisible = user dismissed.
                while (sheetsToCloseWithRegister.length) {
                    closeSheet(sheetsToCloseWithRegister.pop());
                }
            }
            wasVisible = nowVisible;
        });
        observer.observe(content, {attributes: true, attributeFilter: ['class']});
        registerObserverWired = true;
    }

    document.addEventListener('click', function (e) {
        var pill = e.target.closest('.cta-pill');
        var contactTrigger = e.target.closest('.have-school-contact-you');
        var bookTourTrigger = e.target.closest('.have-book-tour');
        var availabilityTrigger = e.target.closest('.have-availability-check');
        var applyInterestTrigger = e.target.closest('.have-apply-interest');
        var eventRegisterTrigger = e.target.closest('.have-event-register');
        // Contact-channel links (WhatsApp/LINE/Messenger via /connect, plus
        // mailto/tel) rendered in the "Get in touch" band + Contact-School
        // dropdown. These are HARD-walled: no free uses — anonymous parents
        // must register before any channel opens.
        var connectChannel = e.target.closest('.connect-channel');
        // The inline website link on the school profile (rendered by
        // schoolProfile.ts) carries `school-profile-website-link` so the
        // 2-free-uses-then-register gate also applies — same UX as the
        // removed "Visit Website" CTA pill it replaces.
        var websiteLink = e.target.closest('.school-profile-website-link');
        // The social icons beside it. Same treatment and the same shared free
        // counter: they are outbound links off doris, and they used to match
        // none of the selectors here, so they were the one exit from a profile
        // that never asked an anonymous parent for anything.
        var socialLink = e.target.closest('.school-profile-social-link');
        // Items rendered inside the "More info" popover — anchors carrying
        // outbound-link targets (visit_website / download_prospectus /
        // virtual_tour). They are NOT `.cta-pill`s, so they need their own
        // path through the gate or the 2-free-uses rule wouldn't apply.
        var popoverItem = e.target.closest('.more-info-popover [data-target]');
        if (!pill && !contactTrigger && !bookTourTrigger && !availabilityTrigger && !applyInterestTrigger && !eventRegisterTrigger && !websiteLink && !socialLink && !popoverItem && !connectChannel) return;

        var target = (pill && pill.dataset && pill.dataset.target)
            || (websiteLink && websiteLink.dataset && websiteLink.dataset.target)
            || (socialLink && socialLink.dataset && socialLink.dataset.target)
            || (popoverItem && popoverItem.dataset && popoverItem.dataset.target)
            || (connectChannel && connectChannel.dataset && connectChannel.dataset.target)
            || '';

        // The "More info" trigger itself opens a popover — that's not a CTA
        // the parent is "using", so it shouldn't burn a free use or gate the
        // anonymous parent. The popover items inside it are gated separately
        // when clicked, via the FREE_TARGETS branch below.
        // "open_contact_teaser" is the non-partner FOMO pill (contactTeaserCta)
        // — it's a `.cta-pill` for visual consistency but opens an explainer
        // tray, not a real lead form, so it shouldn't gate anonymous parents
        // either. Same treatment as the availability teaser (which skips this
        // handler entirely by not carrying the `.cta-pill` class).
        if (target === 'open_more_info' || target === 'open_contact_teaser') return;

        // Free/unlicensed schools: a REGISTERED parent's channel click is
        // decided server-side (first opener unlocks + keeps working; everyone
        // else gated). Intercept to keep them on-page — no reload. Anonymous
        // parents fall through to the hard register wall below.
        if (connectChannel && connectChannel.dataset && connectChannel.dataset.gated === '1' && isLoggedIn()) {
            e.preventDefault();
            e.stopPropagation();
            decideGatedChannel(connectChannel);
            return;
        }

        if (isLoggedIn()) return;

        // Contact-channel links are hard-walled — no free uses. Block the
        // navigation and show the register popup so the parent signs up before
        // being handed off to WhatsApp/LINE/Messenger/email/phone. (The
        // /connect endpoint also bounces anonymous hits server-side.)
        if (connectChannel) {
            e.preventDefault();
            e.stopPropagation();
            promptSignUp('Register to use doris shortcuts', 'connect_' + (target || 'channel'));
            return;
        }

        // Contact, Book Tour, Availability and Apply Now: let the modal OPEN
        // so the parent can preview the flow, but also show the register
        // popup on top. Backend rejects anonymous POSTs with 401 so the gate
        // is real even if you escape the popup.
        var isContactCta = !!contactTrigger
            || target === 'open_contact_form';
        var isBookTourCta = !!bookTourTrigger
            || target === 'book_tour'
            || target === 'open_book_tour_form';
        var isAvailabilityCta = !!availabilityTrigger
            || target === 'open_availability_form';
        var isApplyInterestCta = !!applyInterestTrigger
            || target === 'open_apply_interest_form';
        var isEventRegisterCta = !!eventRegisterTrigger
            || target === 'register_for_event';

        if (isContactCta || isBookTourCta || isAvailabilityCta || isApplyInterestCta || isEventRegisterCta) {
            // Don't preventDefault — let the existing book-tour.js /
            // contact-school.js / availability.js / apply-interest.js /
            // event-register-modal.js click handlers open the underlying
            // sheet. After the click loop settles, remember which sheet is
            // now visible so we can close it when the register popup closes.
            setTimeout(function () {
                var sheet = isBookTourCta
                    ? document.querySelector('.book-tour-step')
                    : isAvailabilityCta
                        ? document.querySelector('.availability-step')
                        : isApplyInterestCta
                            ? document.querySelector('.apply-interest-step')
                            : isEventRegisterCta
                                ? document.querySelector('.event-register-step')
                                : document.querySelector('.contact-step-1');
                if (sheet && !sheet.classList.contains('invisible')) {
                    if (sheetsToCloseWithRegister.indexOf(sheet) === -1) {
                        sheetsToCloseWithRegister.push(sheet);
                    }
                }
            }, 0);
            // Make sure we'll catch the register popup's close, then delay
            // showing it by 2s so the parent can see the form in the
            // background and understand what they'd be doing.
            wireRegisterObserver();
            var message = isBookTourCta
                ? 'Sign up to book tours through doris with ease'
                : isAvailabilityCta
                    ? 'Sign up to ask schools about live availability through doris'
                    : isApplyInterestCta
                        ? 'Sign up to send your interest to schools through doris'
                        : isEventRegisterCta
                            ? 'Sign up to register for school events through doris'
                            : 'Sign up to contact schools through doris';
            var source = isBookTourCta ? 'book_tour'
                : isAvailabilityCta ? 'availability'
                : isApplyInterestCta ? 'apply_interest'
                : isEventRegisterCta ? 'event_register'
                : 'contact';
            setTimeout(function () { promptSignUp(message, source); }, 2000);
            return;
        }

        // Free for the first N uses across the whole browser, then gated. We
        // only ungate the four targets listed in FREE_TARGETS — anything else
        // falls through to the always-gated branch below.
        if (isFreeTarget(target)) {
            var uses = getUseCount();
            if (uses < FREE_LIMIT) {
                incrementUseCount();
                return; // allow navigation
            }
            e.preventDefault();
            e.stopPropagation();
            promptSignUp('Join the doris community and continue using doris shortcuts', 'cta_free_limit_' + target);
            return;
        }

        // Anything else (call, whatsapp, open_house, share-*…) stays gated.
        e.preventDefault();
        e.stopPropagation();
        promptSignUp('Sign up to keep using doris', 'cta_gated_' + (target || 'unknown'));
    }, true);

    // Fallback path: a direct /connect hit (or the decideGatedChannel network
    // fallback) 302s back to the profile with ?channels_closed=<channel>. Open
    // the popup once the DOM (and doris.js modals wiring) has settled.
    function maybeShowChannelsClosed() {
        try {
            if (/[?&]channels_closed=/.test(window.location.search)) {
                setTimeout(openChannelsClosedPopup, 400);
            }
        } catch (_) { /* ignore */ }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', maybeShowChannelsClosed);
    } else {
        maybeShowChannelsClosed();
    }
})();
