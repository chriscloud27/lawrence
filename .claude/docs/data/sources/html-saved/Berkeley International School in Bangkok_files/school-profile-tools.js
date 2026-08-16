// The two inline parent tools on a school page: the commute estimator (under the
// map) and the first-year fee calculator (top of the Fees section).
//
// Both render their results with textContent / createElement only, never
// innerHTML, because the strings they display come from Google (a formatted
// address) and from school-admin-editable fee rows.
(function () {
    if (window.__schoolProfileToolsInit) return;
    window.__schoolProfileToolsInit = true;

    function ready(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    // ---- shared helpers ----

    function show(el, text) {
        if (!el) return;
        el.textContent = text;
        el.classList.remove('hidden');
    }

    function hide(el) {
        if (!el) return;
        el.textContent = '';
        el.classList.add('hidden');
    }

    function line(parent, text, className) {
        var div = document.createElement('div');
        if (className) div.className = className;
        div.textContent = text;
        parent.appendChild(div);
        return div;
    }

    // Anonymous parents get the standard doris register popup rather than an
    // error. Mirrors the shortlist gate in schoolListAndMap.js.
    function promptRegister(message) {
        var opener = document.querySelector('#register-popup .modal-open-button');
        var msg = document.querySelector('#register-popup .parent-message');
        if (msg) msg.innerText = message;
        if (opener) opener.click();
    }

    function track(name, data) {
        if (window.doris && typeof window.doris.saveEvent === 'function') {
            window.doris.saveEvent({name: name, data: data || {}});
        }
    }

    // ---- remembering the fee-calculator inputs ----
    //
    // The children's ages belong to the family, not to a school, so they are
    // stored once and reused on every school page rather than retyped. Kept in
    // localStorage (like the currency selection and the compare view mode): it
    // works for signed-out parents, needs no request, and adds no write to a
    // public page load. Ages of minors, so nothing is sent anywhere it isn't
    // needed; the estimate itself is computed from them per request and not
    // stored server-side by this widget.
    var FEE_INPUTS_KEY = 'doris-fee-inputs';

    function readFeeInputs() {
        try {
            var raw = localStorage.getItem(FEE_INPUTS_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            var ages = (parsed && parsed.ages || [])
                .map(Number)
                .filter(function (n) { return isFinite(n) && n >= 0 && n <= 25; })
                .slice(0, 6);
            if (!ages.length) return null;
            return {ages: ages, boarding: !!(parsed && parsed.boarding)};
        } catch (e) {
            // Disabled localStorage, or something else wrote junk under the key.
            return null;
        }
    }

    function saveFeeInputs(ages, boarding) {
        try {
            localStorage.setItem(FEE_INPUTS_KEY, JSON.stringify({ages: ages, boarding: !!boarding}));
        } catch (e) {
            // Private mode: the calculator still works, it just won't prefill.
        }
    }

    // ---- commute: "How long is the school run?" ----

    function initCommute() {
        var root = document.querySelector('.doris-commute');
        if (!root) return;

        var addressInput = root.querySelector('.commute-address');
        var modeSelect = root.querySelector('.commute-mode');
        var arriveSelect = root.querySelector('.commute-arrive');
        var calcBtn = root.querySelector('.commute-calc');
        var resultEl = root.querySelector('.commute-result');
        var errorEl = root.querySelector('.commute-error');
        var summaryEl = root.querySelector('.commute-summary');
        var schoolId = root.getAttribute('data-school-id');
        var countryLabel = root.getAttribute('data-country-label') || '';
        var authed = root.getAttribute('data-authed') === 'true';

        var MODE_WORDS = {DRIVE: 'by car', TRANSIT: 'by public transport', WALK: 'on foot'};

        // The widget is shut by default, so a result that only exists inside it is
        // a result the parent never sees. Mirror the headline onto the summary
        // line; anything other than a real estimate leaves it blank rather than
        // putting an error in a heading.
        function setSummary(text) {
            if (!summaryEl) return;
            summaryEl.textContent = text || '';
            summaryEl.classList.toggle('hidden', !text);
        }

        var ERRORS = {
            not_found: 'We could not find that address. Try a postcode, or add the city.',
            lookup_failed: 'Address lookup is temporarily unavailable. Please try again shortly.',
            unavailable: 'Travel times are temporarily unavailable.',
            no_country: 'We could not tell which country this school is in.',
        };

        // Pin where we geocoded the parent's home onto the profile map, so they can
        // see the point the estimate was measured FROM and judge it themselves. A
        // geocode that landed in the wrong suburb is obvious on a map and
        // completely invisible in a "23 min" figure.
        function pinHomeOnMap(home) {
            if (typeof window.showCommuteHomeOnMap !== 'function') return false;
            window.showCommuteHomeOnMap(home || null);
            return !!home;
        }

        function renderResult(data) {
            var r = data.result;
            var pinned = pinHomeOnMap(data.home);
            resultEl.textContent = '';
            resultEl.classList.remove('hidden');
            if (!r || r.status !== 'ok') {
                var messages = {
                    no_school_location: 'We do not have this school pinned on the map yet.',
                    no_route: 'We could not find a route between there and the school.',
                    country_mismatch: 'That address is in a different country to this school.',
                    unavailable: 'Travel times are temporarily unavailable.',
                };
                line(resultEl, (r && messages[r.status]) || messages.unavailable, 'text-xs text-dorisgrey');
                setSummary('');
                return;
            }
            setSummary(r.durationText + (MODE_WORDS[data.mode] ? ' ' + MODE_WORDS[data.mode] : ''));
            var headline = document.createElement('div');
            headline.className = 'font-bold text-primary';
            headline.textContent = r.durationText + (r.distanceText ? ' · ' + r.distanceText : '');
            resultEl.appendChild(headline);
            if (r.leaveByText) {
                var suffix = r.startText && r.startText !== r.arriveByText
                    ? ' to arrive by ' + r.arriveByText + ' (school starts ' + r.startText + ')'
                    : ' to arrive by ' + r.arriveByText;
                line(resultEl, 'Leave by ' + r.leaveByText + suffix, 'text-xs text-dorisgrey mt-0.5');
            }
            if (data.label) line(resultEl, 'From ' + data.label, 'text-xs text-dorisgrey mt-0.5');
            line(resultEl,
                pinned
                    ? 'Estimate for a typical weekday morning. Your home is pinned on the map above.'
                    : 'Estimate for a typical weekday morning.',
                'text-[10px] text-dorisgrey mt-1');
        }

        // Pull whatever the parent already told us for this country, so a second
        // school in the same market needs no typing at all.
        function loadSaved() {
            fetch('/parent/commute/school/' + encodeURIComponent(schoolId), {credentials: 'same-origin'})
                .then(function (res) { return res.ok ? res.json() : null; })
                .then(function (data) {
                    if (!data || !data.hasHome) return;
                    if (addressInput) addressInput.value = data.address || '';
                    if (modeSelect && data.mode) modeSelect.value = data.mode;
                    if (arriveSelect && typeof data.arriveBeforeMins === 'number') arriveSelect.value = String(data.arriveBeforeMins);
                    renderResult(data);
                })
                .catch(function () { /* the tool just stays empty */ });
        }

        function calculate() {
            var address = (addressInput && addressInput.value || '').trim();
            hide(errorEl);
            if (!authed) {
                promptRegister('Sign up for free to see your commute to every school');
                return;
            }
            if (!address) {
                show(errorEl, 'Enter your postcode or address first.');
                return;
            }
            calcBtn.disabled = true;
            show(resultEl, 'Calculating…');
            fetch('/parent/commute/home', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify({
                    address: address,
                    country: root.getAttribute('data-country'),
                    mode: modeSelect ? modeSelect.value : 'DRIVE',
                    arriveBeforeMins: arriveSelect ? Number(arriveSelect.value) : 15,
                }),
            })
                .then(function (res) {
                    if (res.status === 401) {
                        promptRegister('Sign up for free to see your commute to every school');
                        return null;
                    }
                    return res.json();
                })
                .then(function (saved) {
                    if (!saved) return null;
                    if (!saved.ok) {
                        hide(resultEl);
                        // The address they just typed did not resolve, so the
                        // previous school's number in the summary is now a lie.
                        setSummary('');
                        if (saved.error === 'wrong_country') {
                            show(errorEl, saved.resolvedCountry
                                ? 'That looks like an address in ' + saved.resolvedCountry + '. This school is in ' + countryLabel + '.'
                                : 'That address is not in ' + countryLabel + '.');
                        } else {
                            show(errorEl, ERRORS[saved.error] || ERRORS.lookup_failed);
                        }
                        return null;
                    }
                    track('school/commute-calculated', {school_id: schoolId, mode: saved.mode});
                    return fetch('/parent/commute/school/' + encodeURIComponent(schoolId), {credentials: 'same-origin'})
                        .then(function (res) { return res.ok ? res.json() : null; });
                })
                .then(function (data) {
                    if (data) renderResult(data);
                })
                .catch(function () {
                    hide(resultEl);
                    setSummary('');
                    show(errorEl, ERRORS.lookup_failed);
                })
                .then(function () { calcBtn.disabled = false; });
        }

        if (calcBtn) calcBtn.addEventListener('click', calculate);
        if (addressInput) {
            addressInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    calculate();
                }
            });
        }
        // Changing mode / arrival after a result is showing should re-run rather
        // than leave a stale number on screen.
        [modeSelect, arriveSelect].forEach(function (sel) {
            if (!sel) return;
            sel.addEventListener('change', function () {
                if (authed && addressInput && addressInput.value.trim()) calculate();
            });
        });

        if (authed) loadSaved();
    }

    // ---- fee calculator: "What would my first year cost?" ----

    function initFeeCalc() {
        var roots = document.querySelectorAll('.doris-fee-calc');
        Array.prototype.forEach.call(roots, function (root) {
            var agesInput = root.querySelector('.fee-ages');
            var calcBtn = root.querySelector('.fee-calc');
            var resultEl = root.querySelector('.fee-result');
            var errorEl = root.querySelector('.fee-error');
            var schoolId = root.getAttribute('data-school-id');

            // Money is emitted in the SAME structured shape the fee table on this
            // page uses (.convert-me + data-original-* + value/currency spans), so
            // doris.js's currency walker converts these figures exactly as it
            // converts the table. That means the estimate always reads in the
            // currency the parent picked, and follows the selector afterwards,
            // instead of sitting in the school's local currency next to a
            // converted table. Value before currency, matching the table's order.
            function moneyEl(currency, amount) {
                var wrap = document.createElement('span');
                wrap.className = 'convert-me';
                wrap.dataset.originalValue = String(amount);
                if (currency) wrap.dataset.originalCurrency = currency;
                var value = document.createElement('span');
                value.className = 'convert-me-value';
                value.textContent = amount.toLocaleString();
                wrap.appendChild(value);
                if (currency) {
                    // A real space, not just the margin: without it the copied
                    // text and screen readers get "25,788USD".
                    wrap.appendChild(document.createTextNode(' '));
                    var cur = document.createElement('span');
                    cur.className = 'convert-me-currency text-[10px] text-gray-400 font-normal';
                    cur.textContent = currency;
                    wrap.appendChild(cur);
                }
                return wrap;
            }

            // A breakdown row: "<label>: <money>". The label is school-authored, so
            // it goes in via textContent, never innerHTML.
            function moneyLine(parent, label, currency, amount) {
                var row = document.createElement('div');
                row.appendChild(document.createTextNode(label + ': '));
                row.appendChild(moneyEl(currency, amount));
                parent.appendChild(row);
                return row;
            }

            // The figures were added after page load, so nothing has converted them
            // yet. Safe to re-run: doris.js converts from a cached original per
            // node, so repeated calls are idempotent, and it no-ops when the parent
            // has never picked a currency (figures stay school-local).
            function convertMoney() {
                if (window.doris && typeof window.doris.convertFeesToSelectedCurrency === 'function') {
                    window.doris.convertFeesToSelectedCurrency();
                }
            }

            // One option's total and what went into it.
            function renderBreakdown(parent, estimate, ages) {
                // Not one child could be priced, so there is no total — the school
                // publishes fees, just not for these ages. Showing the arithmetic
                // result (a confident "0") reads as "this school is free".
                if (!estimate.tuition.length) {
                    line(parent, ages.length === 1
                        ? 'This school publishes no fee for age ' + ages[0] + '.'
                        : 'This school publishes no fee for ages ' + ages.join(', ') + '.',
                        'text-sm text-dorisgrey');
                    return;
                }
                var total = document.createElement('div');
                total.className = 'font-bold text-primary text-base';
                total.appendChild(moneyEl(estimate.currency, estimate.total));
                // Count the children actually PRICED, not the ages asked for: when
                // the school publishes no fee for one of them the total covers
                // fewer children, and saying "for 2 children" would overstate what
                // the number includes.
                var children = estimate.tuition.length;
                var qualifier = document.createElement('span');
                qualifier.className = 'font-normal text-xs text-dorisgrey';
                qualifier.textContent = ' estimated first year'
                    + (children > 1 ? ' for ' + children + ' children' : '')
                    + (children < ages.length ? ' (' + children + ' of ' + ages.length + ')' : '');
                total.appendChild(qualifier);
                parent.appendChild(total);

                var breakdown = document.createElement('div');
                breakdown.className = 'text-xs text-dorisgrey mt-1';
                estimate.tuition.forEach(function (t) {
                    var row = moneyLine(breakdown, 'Age ' + t.age + ' · ' + t.label, estimate.currency, t.amount);
                    // This child was priced off a row outside the chosen track,
                    // because that track publishes nothing for their age (a
                    // 9-year-old at a school that only splits ICSE from IB at
                    // Grade 6). Say so rather than letting the total imply the
                    // track covers them.
                    if (t.offTrack) {
                        var note = document.createElement('span');
                        note.className = 'text-[10px] text-dorisgrey';
                        note.textContent = ' (priced from another track)';
                        row.appendChild(note);
                    }
                });
                estimate.oneOff.concat(estimate.boarding).forEach(function (f) {
                    moneyLine(breakdown, f.label + (children > 1 ? ' ×' + children : ''),
                        estimate.currency, f.amount * children);
                });
                parent.appendChild(breakdown);

                if (estimate.missingAges && estimate.missingAges.length) {
                    line(parent, 'No published fee for age' + (estimate.missingAges.length === 1 ? '' : 's')
                        + ' ' + estimate.missingAges.join(', '), 'text-xs text-amber-600 mt-1');
                }
            }

            // Every option at once. The parent never ticks "boarding" or picks a
            // curriculum: they see what each one costs and pick with the numbers in
            // front of them. Tapping a card swaps the breakdown underneath.
            function renderVariants(variants, ages) {
                var selected = 0;

                var tabs = document.createElement('div');
                tabs.className = 'flex flex-wrap gap-2';
                var detail = document.createElement('div');
                detail.className = 'mt-3';

                // Only the priced cards, held by reference: paint() rewrites
                // className, and iterating tabs.children swept up the unavailable
                // "Starts at age 8" cards too, restyling them as solid selectable
                // ones that do nothing when clicked.
                var pricedCards = [];

                function paint() {
                    pricedCards.forEach(function (card, i) {
                        card.className = i === selected
                            ? 'fee-variant text-left rounded-xl border-2 border-tertiary bg-white px-3 py-2 cursor-pointer transition max-w-[13rem]'
                            : 'fee-variant text-left rounded-xl border border-gray-200 bg-white px-3 py-2 cursor-pointer hover:border-gray-300 transition max-w-[13rem]';
                        card.setAttribute('aria-pressed', i === selected ? 'true' : 'false');
                    });
                    detail.textContent = '';
                    renderBreakdown(detail, variants[selected].estimate, ages);
                    convertMoney();
                }

                // Track and stay go on separate lines rather than in one
                // "Track · Boarding" string: scraped track names run long
                // ("Bilingual / fusion (Lower secondary - reported example)"), so
                // a single truncated line clipped the Day / Boarding half and left
                // four cards looking identical.
                var hasBoardingAxis = variants.some(function (v) { return v.boarding; });

                variants.forEach(function (v, i) {
                    var card = document.createElement('button');
                    card.type = 'button';
                    card.dataset.variantKey = v.key;
                    card.title = v.label;
                    if (v.track) {
                        var trackLine = document.createElement('div');
                        trackLine.className = 'text-[11px] font-semibold uppercase tracking-wide text-dorisgrey truncate';
                        trackLine.textContent = v.track;
                        card.appendChild(trackLine);
                    }
                    if (hasBoardingAxis) {
                        var stayLine = document.createElement('div');
                        stayLine.className = 'text-[11px] font-semibold uppercase tracking-wide text-primary';
                        stayLine.textContent = v.boarding ? 'Boarding' : 'Day place';
                        card.appendChild(stayLine);
                    }
                    if (!v.track && !hasBoardingAxis) {
                        // Happens when only one programme covers this child's age:
                        // the estimate is real but has no axis to name it by, and a
                        // bare figure beside a labelled card reads as a glitch.
                        var plain = document.createElement('div');
                        plain.className = 'text-[11px] font-semibold uppercase tracking-wide text-dorisgrey';
                        plain.textContent = 'Estimated';
                        card.appendChild(plain);
                    }
                    var amount = document.createElement('div');
                    amount.className = 'font-bold text-primary text-sm';
                    amount.appendChild(moneyEl(v.estimate.currency, v.estimate.total));
                    card.appendChild(amount);
                    card.addEventListener('click', function () {
                        if (selected === i) return;
                        selected = i;
                        paint();
                        track('school/fees-variant-viewed', {school_id: schoolId, variant: v.key});
                    });
                    pricedCards.push(card);
                    tabs.appendChild(card);
                });

                // Programmes the school teaches but does not price at these ages get
                // a box too, saying when they start, rather than just being absent.
                // Not a <button>: there is no estimate behind it to select.
                (variants[0].tracksNotPriced || []).forEach(function (t) {
                    var card = document.createElement('div');
                    card.className = 'fee-variant-unavailable text-left rounded-xl border border-dashed border-gray-300 bg-transparent px-3 py-2 max-w-[13rem]';
                    card.title = t.track;
                    var label = document.createElement('div');
                    label.className = 'text-[11px] font-semibold uppercase tracking-wide text-gray-400 truncate';
                    label.textContent = t.track;
                    var when = document.createElement('div');
                    when.className = 'text-sm font-semibold text-gray-400';
                    when.textContent = availabilityText(t, ages);
                    card.appendChild(label);
                    card.appendChild(when);
                    tabs.appendChild(card);
                });

                resultEl.appendChild(tabs);
                resultEl.appendChild(detail);
                paint();

                var omitted = variants[0].tracksOmitted;
                if (omitted > 0) {
                    line(resultEl, omitted === 1
                        ? 'This school publishes one more programme. See the full table below.'
                        : 'This school publishes ' + omitted + ' more programmes. See the full table below.',
                        'text-[10px] text-dorisgrey mt-1');
                }
            }

            // Why this programme has no price for these children. Too young is by
            // far the common case (CIS Foundation starts at Grade 3), so lead with
            // it; too old and the awkward straddle both fall back to stating the
            // range, which is always true.
            function availabilityText(notPriced, ages) {
                var youngest = Math.min.apply(null, ages);
                var oldest = Math.max.apply(null, ages);
                if (youngest < notPriced.fromAge && oldest < notPriced.fromAge) {
                    return 'Starts at age ' + notPriced.fromAge;
                }
                if (youngest > notPriced.toAge) {
                    return 'Up to age ' + notPriced.toAge;
                }
                return notPriced.fromAge === notPriced.toAge
                    ? 'Age ' + notPriced.fromAge + ' only'
                    : 'Ages ' + notPriced.fromAge + '-' + notPriced.toAge;
            }

            function renderResult(variants, ages) {
                resultEl.textContent = '';
                resultEl.classList.remove('hidden');
                if (!variants || !variants.length) {
                    line(resultEl, 'This school has not published fees we can total up.', 'text-xs text-dorisgrey');
                    return;
                }
                // One option and nothing unavailable is the common case: no cards to
                // choose between, just the number.
                var unavailable = (variants[0].tracksNotPriced || []).length;
                if (variants.length === 1 && unavailable === 0) {
                    renderBreakdown(resultEl, variants[0].estimate, ages);
                    convertMoney();
                } else {
                    renderVariants(variants, ages);
                }
                line(resultEl, 'Estimate only. Confirm with the school.', 'text-[10px] text-dorisgrey mt-1');
            }

            function calculate(opts) {
                var silent = opts && opts.silent;
                hide(errorEl);
                var raw = (agesInput && agesInput.value || '').trim();
                if (!raw) {
                    if (!silent) show(errorEl, 'Enter your children\'s ages, e.g. 7, 10.');
                    return;
                }
                calcBtn.disabled = true;
                show(resultEl, 'Working it out…');
                fetch('/api/schools/' + encodeURIComponent(schoolId) + '/fee-estimate.json?ages=' + encodeURIComponent(raw),
                    {credentials: 'same-origin'})
                    .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
                    .then(function (data) {
                        renderResult(data.variants, data.ages || []);
                        // Remember only inputs the server accepted, so junk never
                        // gets replayed on the next page. Boarding is no longer a
                        // family preference here — every school quotes both where it
                        // can — but the stored flag is left alone because the
                        // compare board still uses it.
                        if ((data.ages || []).length) saveFeeInputs(data.ages, rememberedBoarding);
                        if (!silent) {
                            track('school/fees-estimated', {
                                school_id: schoolId,
                                children: (data.ages || []).length,
                                variants: (data.variants || []).length,
                            });
                        }
                    })
                    .catch(function (status) {
                        hide(resultEl);
                        // A silent prefill run must never shout at the parent about
                        // input they did not just type.
                        if (!silent) {
                            show(errorEl, status === 400
                                ? 'Enter ages as numbers, e.g. 7, 10.'
                                : 'We could not work that out just now. Please try again.');
                        }
                    })
                    .then(function () { calcBtn.disabled = false; });
            }

            if (calcBtn) calcBtn.addEventListener('click', function () { calculate(); });
            if (agesInput) {
                agesInput.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        calculate();
                    }
                });
            }

            // A family's children don't change between schools, so the ages are
            // asked for once and then reused on every school page. Restored and
            // re-run on load, so a returning parent sees the estimate for THIS
            // school without touching anything.
            var remembered = readFeeInputs();
            var rememberedBoarding = !!(remembered && remembered.boarding);
            if (remembered && remembered.ages.length) {
                if (agesInput) agesInput.value = remembered.ages.join(', ');
                calculate({silent: true});
            }
        });
    }

    // ---- contact band: hide the "scrolls right" hint once you reach the end ----
    //
    // Progressive enhancement only. The fade + chevron are rendered server-side
    // and stay put without JS, which is still truthful for a school with more
    // cards than fit; this just removes them when there is genuinely nothing more
    // to see.
    function updateBandHint(root) {
        var track = root.querySelector('.contact-band-track');
        var hint = root.querySelector('.contact-band-hint');
        if (!track || !hint) return;
        var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
        var noOverflow = track.scrollWidth <= track.clientWidth + 4;
        hint.classList.toggle('hidden', atEnd || noOverflow);
    }

    function initContactBandHint() {
        document.querySelectorAll('.contact-band-scroller').forEach(function (root) {
            var track = root.querySelector('.contact-band-track');
            if (!track || track.dataset.bandBound === '1') return;
            track.dataset.bandBound = '1';
            var update = function () { updateBandHint(root); };
            track.addEventListener('scroll', update, {passive: true});
            window.addEventListener('resize', update);
            update();
        });
    }

    // Delegated, so it also works for a band swapped in later (the school-admin
    // contact-preferences preview re-renders itself via innerHTML, which would
    // discard a directly-bound listener).
    document.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('.contact-band-next');
        if (!btn) return;
        // The button sits over a contact card, and both `.connect-channel` and
        // `tracked` are handled by delegated document listeners, so a bubbling
        // click would fire that card's action as well as scrolling.
        e.preventDefault();
        e.stopPropagation();
        var root = btn.closest('.contact-band-scroller');
        var track = root && root.querySelector('.contact-band-track');
        if (!track) return;
        // Just under a viewport, so the card you were reading stays partly in view.
        track.scrollBy({left: Math.round(track.clientWidth * 0.85), behavior: 'smooth'});
        // scroll events update the hint, but nudge it in case smooth scrolling is
        // disabled (reduced-motion) and no scroll event follows.
        setTimeout(function () { updateBandHint(root); }, 400);
    }, true);

    // ---- fee table: narrow the tuition rows to what this family would pay ----
    //
    // One dropdown per axis the school varies on (programme, day/boarding,
    // local/foreign, session length), ANDed together. The server renders only the
    // axes with two or more values, so most schools get no controls at all.
    function initFeeAxisFilters() {
        var selects = document.querySelectorAll('.fee-axis-select');
        if (!selects.length) return;
        var rows = document.querySelectorAll('tr[data-fee-track]');
        var emptyNote = null;

        function apply() {
            var wanted = {};
            var anyChosen = false;
            Array.prototype.forEach.call(selects, function (sel) {
                var axis = sel.getAttribute('data-fee-axis');
                if (sel.value) { wanted[axis] = sel.value; anyChosen = true; }
            });
            var shown = 0;
            Array.prototype.forEach.call(rows, function (row) {
                var visible = true;
                for (var axis in wanted) {
                    if (!Object.prototype.hasOwnProperty.call(wanted, axis)) continue;
                    var rowValue = row.getAttribute('data-fee-' + axis) || '';
                    // A row with nothing recorded for this axis stays visible: at a
                    // school that only tags some of its rows, that row may be the
                    // family's actual fee, and hiding a published fee from a parent
                    // is worse than showing one extra.
                    if (rowValue !== '' && rowValue !== wanted[axis]) { visible = false; break; }
                }
                row.classList.toggle('hidden', !visible);
                if (visible) shown++;
            });
            // Every combination the school publishes is reachable, but a parent can
            // still pick a pair it does not offer. Say so rather than showing an
            // empty table.
            if (shown === 0 && !emptyNote && rows.length) {
                emptyNote = document.createElement('tr');
                var cell = document.createElement('td');
                cell.colSpan = 8;
                cell.className = 'py-3 text-sm text-gray-500';
                cell.textContent = 'This school does not publish a fee for that combination.';
                emptyNote.appendChild(cell);
                rows[0].parentNode.appendChild(emptyNote);
            }
            if (emptyNote) emptyNote.classList.toggle('hidden', shown > 0);
            if (anyChosen && window.doris && typeof window.doris.saveEvent === 'function') {
                window.doris.saveEvent({name: 'school/fees-filtered', data: {axes: wanted, rows: shown}});
            }
        }

        Array.prototype.forEach.call(selects, function (sel) {
            sel.addEventListener('change', apply);
        });
    }

    ready(function () {
        initCommute();
        initFeeCalc();
        initFeeAxisFilters();
        initContactBandHint();
    });
})();
