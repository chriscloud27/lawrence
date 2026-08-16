// Doris AI chat overlay. Opens from any [data-doris-ai-open] element, talks
// to /api/doris-ai/* and renders the SSE stream. Openers may carry
// data-thread-id (resume that conversation — used by the dashboard thread
// list) or data-doris-ai-new (always start a fresh thread).
(function () {
    var overlay = document.getElementById('doris-ai-overlay');
    if (!overlay) return;

    var messagesScroller = document.getElementById('doris-ai-messages');
    var messagesColumn = messagesScroller.querySelector('div');
    var emptyState = document.getElementById('doris-ai-empty');
    var form = document.getElementById('doris-ai-form');
    var input = document.getElementById('doris-ai-input');
    var sendBtn = document.getElementById('doris-ai-send');
    var stopBtn = document.getElementById('doris-ai-stop');
    var closeBtn = document.getElementById('doris-ai-close');
    var voiceBtn = document.getElementById('doris-ai-voice');
    var voiceLabel = document.getElementById('doris-ai-voice-label');

    var standalone = overlay.hasAttribute('data-doris-ai-standalone');
    var context = readContext();
    var threadKey = 'doris-ai-thread:' + JSON.stringify(context);
    var threadId = null;
    try { threadId = sessionStorage.getItem(threadKey); } catch (e) { /* private mode */ }
    var historyLoaded = false;
    var streaming = false;
    // Aborts the turn in flight, from the Stop button. Aborting also closes the
    // response socket, which is how the server learns to stop generating (see
    // the `unpipe` hook in src/chat/dorisAiRoutes.ts).
    var streamController = null;
    // Set once the server returns a register wall (403 register_required) — the
    // input stays locked from then on, so no further sends are attempted.
    var registrationRequired = false;
    // What the parent was reaching for when we sent them off to register.
    // Set by maybeResumeAfterAuth on the way back in, consumed by
    // announceResume once history has replayed. Null on an ordinary load.
    var pendingIntent = null;

    // ---- open / close ----

    document.querySelectorAll('[data-doris-ai-open]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (btn.hasAttribute('data-doris-ai-new')) switchThread(null);
            else if (btn.getAttribute('data-thread-id')) switchThread(btn.getAttribute('data-thread-id'));
            openOverlay();
        });
    });
    if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !standalone && !overlay.classList.contains('hidden')) closeOverlay();
    });
    // Runs before the standalone load below: it may switch the thread we are
    // about to replay, and it has to set pendingIntent while history is still
    // unloaded, or announceResume has nothing left to announce.
    maybeResumeAfterAuth();
    // Standalone (/chat): the overlay IS the page — load any resumed thread
    // straight away; Close navigates away instead of hiding.
    if (standalone) {
        loadHistoryOnce();
        input.focus();
    }

    function switchThread(newThreadId) {
        if (newThreadId === threadId) return;
        threadId = newThreadId;
        historyLoaded = false;
        clearMessages();
        try {
            if (newThreadId) sessionStorage.setItem(threadKey, newThreadId);
            else sessionStorage.removeItem(threadKey);
        } catch (e) { /* private mode */ }
    }

    function clearMessages() {
        Array.prototype.slice.call(messagesColumn.children).forEach(function (child) {
            if (child !== emptyState) messagesColumn.removeChild(child);
        });
        if (emptyState) emptyState.classList.remove('hidden');
        input.value = '';
        autosize();
        input.focus();
    }

    function openOverlay() {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        document.body.style.overflow = 'hidden';
        loadHistoryOnce();
        input.focus();
        if (window.doris && window.doris.saveEvent) window.doris.saveEvent({name: 'doris-ai/open', data: context});
    }

    function closeOverlay() {
        if (standalone) {
            // go back to wherever they came from; if back() doesn't navigate
            // (opened directly / same-page history), fall through to home
            if (window.history.length > 1) {
                window.history.back();
                setTimeout(function () { window.location.href = '/'; }, 400);
            } else {
                window.location.href = '/';
            }
            return;
        }
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        document.body.style.overflow = '';
    }

    // ---- history replay ----

    function loadHistoryOnce() {
        if (historyLoaded || !threadId) return;
        historyLoaded = true;
        fetch('/api/doris-ai/threads/' + encodeURIComponent(threadId) + '/messages')
            .then(function (res) {
                if (!res.ok) throw new Error('gone');
                return res.json();
            })
            .then(function (data) {
                if (!data.messages || data.messages.length === 0) return;
                hideEmptyState();
                data.messages.forEach(function (m) {
                    if (m.role === 'user') appendUserBubble(m.text);
                    else if (m.card) appendCard(m.html);
                    else appendAssistantHtml(m.html);
                });
                // the conversation's final follow-up chips survive refreshes
                if (data.suggestions) renderFollowups(data.suggestions);
                scrollToBottom(true);
                announceResume();
            })
            .catch(function () {
                // expired/foreign thread — start fresh
                threadId = null;
                try { sessionStorage.removeItem(threadKey); } catch (e) {}
            });
    }

    // ---- coming back from registering ----

    // Reopen the conversation a parent left to go and register.
    //
    // doris.js has already bounced them back to this page (it owns the keys
    // rememberReturn writes). What is left is chat-specific: reopen the overlay
    // on the right thread, and then, once history has replayed, point at the
    // thing they registered for. Runs on every load and is single-shot, so a
    // record left by an abandoned attempt cannot hijack a later visit.
    function maybeResumeAfterAuth() {
        var raw = null;
        try {
            raw = localStorage.getItem('doris-ai-resume');
            if (raw) localStorage.removeItem('doris-ai-resume');
        } catch (e) { return; }
        if (!raw) return;
        var saved;
        try { saved = JSON.parse(raw); } catch (e) { return; }
        if (!saved || typeof saved.ts !== 'number' || Date.now() - saved.ts > 30 * 60 * 1000) return;
        // Only resume into the conversation it was saved from. A school profile
        // and the country listing are different threads; landing the wrong one
        // would be more confusing than not resuming at all.
        if (JSON.stringify(saved.context) !== JSON.stringify(context)) return;
        pendingIntent = saved.intent || null;
        if (saved.threadId && saved.threadId !== threadId) switchThread(saved.threadId);
        // Standalone (/chat) loads history for itself a few lines below; every
        // other surface keeps the overlay hidden until something opens it, and
        // coming back from registering is exactly such a something.
        if (!standalone) openOverlay();
    }

    // Say what changed, and point at it. Deliberately not a model turn: this
    // has to be true and instant, and a round trip could paraphrase it into
    // something vaguer or drop it entirely.
    function announceResume() {
        var intent = pendingIntent;
        pendingIntent = null;
        if (!intent || intent.kind !== 'contacts') return;
        // UUID-shaped only. The value round-tripped through localStorage, so it
        // is not trusted straight into a selector.
        var id = intent.schoolId;
        if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
        var card = messagesColumn.querySelector('.doris-ai-contacts[data-school-id="' + id + '"]');
        // Still gated means they did not finish. Better to say nothing than to
        // announce an unlock that did not happen.
        if (!card || card.querySelector('.doris-ai-register-gate')) return;
        var who = intent.schoolName ? ' for ' + intent.schoolName : '';
        messagesColumn.appendChild(dorisBubble("You're all set. Here are those contact options" + who + " — pick whichever suits you."));
        card.classList.add('ring-2', 'ring-primary');
        setTimeout(function () { card.classList.remove('ring-2', 'ring-primary'); }, 4000);
        scrollToBottom(true);
    }

    // ---- sending ----

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        send();
    });
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    });
    if (stopBtn) stopBtn.addEventListener('click', function () {
        if (streamController) streamController.abort();
    });
    input.addEventListener('input', autosize);
    messagesColumn.addEventListener('click', function (e) {
        var chip = e.target.closest('.doris-ai-suggestion');
        if (chip) {
            // language chips send a different message than their label
            // ("Hablemos en español" → "Me gustaría hablar en español")
            input.value = (chip.getAttribute('data-doris-ai-send') || chip.textContent).trim();
            send();
        }
        var locBtn = e.target.closest('.doris-ai-share-location');
        if (locBtn) shareLocation(locBtn);
        // Anonymous parent tapped a locked contact channel (get_school_contacts):
        // nudge them to register with the same in-chat CTAs, without hard-locking
        // the composer (they can keep chatting).
        var gate = e.target.closest('.doris-ai-register-gate');
        if (gate) promptRegisterForContact(gate.getAttribute('data-school'), gate.getAttribute('data-school-id'));
    });

    // "Schools near me": browser geolocation → /api/doris-ai/nearest-city →
    // the city becomes the parent's next message. Every failure path lands
    // on the card's note, pointing back at the typed-city fallback.
    function shareLocation(btn) {
        var note = btn.parentElement ? btn.parentElement.querySelector('.doris-ai-location-note') : null;
        function fallback(message) {
            if (note) note.textContent = message;
            btn.disabled = false;
            input.focus();
        }
        if (!navigator.geolocation) {
            fallback("Location isn't available in this browser — just type your city.");
            return;
        }
        btn.disabled = true;
        if (note) note.textContent = 'Finding your nearest schools…';
        navigator.geolocation.getCurrentPosition(function (pos) {
            fetch('/api/doris-ai/nearest-city?lat=' + encodeURIComponent(pos.coords.latitude) + '&lng=' + encodeURIComponent(pos.coords.longitude))
                .then(function (res) {
                    if (!res.ok) throw new Error('status ' + res.status);
                    return res.json();
                })
                .then(function (data) {
                    // >150km from any doris city: naming the "nearest" one would mislead
                    if (!data.found || data.distance_km > 150) {
                        fallback("We don't seem to cover schools near you yet — type the city you're interested in instead.");
                        return;
                    }
                    btn.disabled = false;
                    var city = titleCaseWords(data.city);
                    var country = titleCaseWords(data.country);
                    input.value = city === country ? "I'm in " + city : "I'm near " + city + ', ' + country;
                    send();
                })
                .catch(function () {
                    fallback('Something went wrong — just type your city.');
                });
        }, function () {
            fallback('No problem — just type your city or country.');
        }, {timeout: 10000, maximumAge: 600000});
    }

    function titleCaseWords(s) {
        return String(s || '').replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
    }

    // "Chatting to Doris AI" as a conversion means a real exchange, not a single
    // one-off question — so we fire doris_ai_chat once, when the visitor sends
    // their SECOND message in this conversation. Counted per widget instance.
    var parentMessageCount = 0;
    var firedChatEvent = false;

    function send() {
        var message = input.value.trim();
        if (!message || streaming || registrationRequired) return;
        parentMessageCount += 1;
        if (parentMessageCount === 2 && !firedChatEvent && window.doris && window.doris.trackEvent) {
            firedChatEvent = true;
            window.doris.trackEvent('doris_ai_chat', {context: context, source_page: location.pathname});
        }
        // Sending mid-recording: stop the mic and discard pending
        // transcription results — an interim/final pass landing after this
        // would repopulate the input we're about to clear.
        abortRecording();
        setComposerStreaming(true);
        input.value = '';
        autosize();
        hideEmptyState();
        clearFollowups(); // stale follow-ups belong to the previous answer
        var userRow = appendUserBubble(message);
        var assistant = beginAssistantBubble();
        scrollToBottom(true); // sending is an explicit "take me to the bottom"

        var payload = {message: message};
        if (threadId) payload.threadId = threadId;
        else {
            payload.context = context;
            // where the conversation started — lets us see how chat use
            // differs between school profiles, listing pages, /chat, etc.
            payload.sourcePage = location.pathname;
        }

        // Did the server answer AT ALL? Set the moment response headers land,
        // not on the first frame: headers mean the route has already returned,
        // and it fires the agent off before it does. So once this is true the
        // message has been saved and a model turn is running, and sending it
        // again would charge for two and show the parent their own message
        // twice. Only a fetch that rejects outright leaves it false.
        var gotResponse = false;

        function attempt(isRetry) {
            streamController = new AbortController();
            return fetch('/api/doris-ai/message', {
                method: 'POST',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify(payload),
                signal: streamController.signal,
            }).then(function (res) {
                gotResponse = true;
                if (!res.ok) {
                    // Register wall: roll the un-processed exchange back (the
                    // server saved nothing), restore what they typed, and show
                    // the gate.
                    if (res.status === 403) {
                        return res.json().then(function (d) {
                            if (d && d.error === 'register_required') {
                                if (userRow) userRow.remove();
                                assistant.wrap.remove();
                                input.value = message;
                                autosize();
                                showRegisterGate(d.message);
                            } else {
                                assistantError(assistant, 'Something went wrong — please try again.');
                            }
                        }).catch(function () {
                            assistantError(assistant, 'Something went wrong — please try again.');
                        });
                    }
                    return res.text().then(function (t) {
                        assistantError(assistant, res.status === 429 ? t : 'Something went wrong — please try again.');
                    });
                }
                return readSse(res.body, function (event, data) {
                    handleFrame(assistant, event, data);
                });
            }).catch(function (err) {
                // The parent pressed Stop. Not an error: keep what streamed.
                if (stoppedByParent(err)) {
                    noteStopped(assistant);
                    return;
                }
                // A parent who leaves the chat open while they talk it over with
                // family comes back to a connection the browser pooled and the
                // other end has long since dropped, and the first send after that
                // fails instantly with no response at all. That is not a
                // connectivity problem and should never have been reported as
                // one: open a fresh connection and send it again. Once only, and
                // only when nothing came back, so a turn can never be charged or
                // saved twice.
                if (!isRetry && !gotResponse && navigator.onLine !== false) return attempt(true);
                assistantError(assistant, navigator.onLine === false
                    ? "You seem to be offline — I'll be right here when you're back."
                    : 'Connection lost — please try again.');
                // The request never landed, so nothing of theirs survived on our
                // side either: hand back what they typed rather than making them
                // write it out again.
                if (!gotResponse) {
                    input.value = message;
                    autosize();
                }
            });
        }

        attempt(false).finally(function () {
            streamController = null;
            setComposerStreaming(false);
            input.focus();
        });
    }

    // A fetch aborted by us, told apart from a real network failure. Safari 12
    // reports the DOMException without the name in some builds, so the
    // controller's own state is the fallback.
    function stoppedByParent(err) {
        if (err && err.name === 'AbortError') return true;
        return !!(streamController && streamController.signal.aborted);
    }

    // Swaps Send for Stop. The composer keeps the same footprint either way, so
    // nothing under the parent's thumb moves as a reply starts and ends.
    function setComposerStreaming(on) {
        streaming = on;
        sendBtn.disabled = on;
        if (on) sendBtn.classList.add('hidden');
        else sendBtn.classList.remove('hidden');
        if (!stopBtn) return;
        if (on) {
            stopBtn.classList.remove('hidden');
            stopBtn.classList.add('flex');
        } else {
            stopBtn.classList.add('hidden');
            stopBtn.classList.remove('flex');
        }
    }

    function noteStopped(assistant) {
        stopThinking(assistant);
        if (assistant.textBuffer === '' && assistant.textEl.innerHTML === '') {
            assistant.bubble.classList.add('hidden');
        }
        if (assistant.wrap.querySelector('.doris-ai-stopped-note')) return;
        var note = document.createElement('div');
        note.className = 'doris-ai-stopped-note text-xs text-gray-400 pl-9';
        note.textContent = 'Stopped';
        assistant.wrap.appendChild(note);
        scrollToBottom();
    }

    function handleFrame(assistant, event, data) {
        if (event === 'thread') {
            threadId = data.id;
            try { sessionStorage.setItem(threadKey, threadId); } catch (e) {}
            countMessageAndMaybeShowConsent();
        } else if (event === 'text') {
            stopThinking(assistant);
            assistant.textBuffer += data.delta;
            // re-render the whole buffer as markdown on every delta — the
            // buffer is always valid markdown-so-far, so tags stay balanced
            // and lists/bold appear live instead of jumping in at the end
            assistant.textEl.classList.remove('whitespace-pre-wrap');
            assistant.textEl.innerHTML = dorisMarkdown(assistant.textBuffer);
            assistant.textEl.classList.remove('hidden');
            scrollToBottom();
        } else if (event === 'html') {
            var card = document.createElement('div');
            card.innerHTML = data.content;
            assistant.wrap.insertBefore(card, assistant.bubble);
            wireCardTracking(card);
            scrollToBottom();
        } else if (event === 'message_html') {
            stopThinking(assistant);
            // rendered HTML brings its own block layout — pre-wrap would
            // turn the markup's newlines into blank lines
            assistant.textEl.classList.remove('whitespace-pre-wrap');
            assistant.textEl.innerHTML = data.content;
            assistant.textEl.classList.remove('hidden');
            scrollToBottom();
        } else if (event === 'suggestions') {
            renderFollowups(data.items);
        } else if (event === 'error') {
            stopThinking(assistant);
            assistantError(assistant, data.message);
        } else if (event === 'done') {
            stopThinking(assistant);
            if (assistant.textBuffer === '' && assistant.textEl.innerHTML === '') {
                assistant.bubble.classList.add('hidden');
            }
        }
    }

    // ---- rendering ----

    function hideEmptyState() {
        if (emptyState) emptyState.classList.add('hidden');
    }

    function appendUserBubble(text) {
        var row = document.createElement('div');
        row.className = 'flex justify-end';
        var bubble = document.createElement('div');
        bubble.className = 'bg-blue-600 text-white text-sm rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%] whitespace-pre-wrap break-words';
        bubble.textContent = text;
        row.appendChild(bubble);
        messagesColumn.appendChild(row);
        return row;
    }

    function beginAssistantBubble() {
        var wrap = document.createElement('div');
        wrap.className = 'flex flex-col gap-y-2';
        var row = document.createElement('div');
        row.className = 'flex items-end gap-x-2';
        var avatar = document.createElement('img');
        avatar.src = '/images/doris-inquisitive.svg';
        avatar.alt = '';
        // pulse while thinking — stopThinking() calms her down
        avatar.className = 'w-7 h-7 rounded-full bg-blue-100 p-0.5 shrink-0 animate-pulse';
        var bubble = document.createElement('div');
        bubble.className = 'bg-blue-50 text-gray-800 text-sm rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]';
        // the same bouncing dots as the v1 chat, sitting where the text will
        // appear until the first token (or card/error/done) arrives
        // items-end + h-7: the loader keyframe bounces dots 1rem upward, so
        // they need ~16px of headroom or they clip the bubble's top edge
        var typing = document.createElement('div');
        typing.className = 'doris-ai-typing flex items-end h-7';
        typing.innerHTML = '<span class="loading-dot animate-loader"></span>'
            + '<span class="loading-dot animate-loader animation-delay-200"></span>'
            + '<span class="loading-dot animate-loader animation-delay-400"></span>';
        var textEl = document.createElement('div');
        textEl.className = 'hidden doris-ai-prose whitespace-pre-wrap break-words';
        bubble.appendChild(typing);
        bubble.appendChild(textEl);
        row.appendChild(avatar);
        row.appendChild(bubble);
        wrap.appendChild(row);
        messagesColumn.appendChild(wrap);
        return {wrap: wrap, bubble: row, textEl: textEl, textBuffer: '', typing: typing, avatar: avatar};
    }

    function stopThinking(assistant) {
        if (assistant.typing) {
            assistant.typing.remove();
            assistant.typing = null;
        }
        assistant.avatar.classList.remove('animate-pulse');
    }

    function appendAssistantHtml(html) {
        var assistant = beginAssistantBubble();
        stopThinking(assistant);
        assistant.textEl.classList.remove('whitespace-pre-wrap');
        assistant.textEl.innerHTML = html;
        assistant.textEl.classList.remove('hidden');
    }

    // Tool-result cards replayed from history — standalone blocks, exactly
    // like live `html` frames (never inside a pre-wrap chat bubble).
    function appendCard(html) {
        var card = document.createElement('div');
        card.innerHTML = html;
        messagesColumn.appendChild(card);
        wireCardTracking(card);
    }

    // Outbound CTA cards (get_school_links) carry the same `.tracked` markup a
    // school-profile CTA does. doris.js's page-load trackClicks() only wired
    // elements present at DOMContentLoaded, so cards injected later need their
    // click handler attached here — that's what fires school_profile_lead and
    // makes an apply-now / book-a-tour click from the chat a High-Intent Parent.
    function wireCardTracking(container) {
        if (!container || !window.doris || typeof window.doris.trackClick !== 'function') return;
        container.querySelectorAll('.tracked').forEach(function (el) {
            window.doris.trackClick(el);
        });
    }

    // Quick-tap follow-ups under the latest reply. Items are structured:
    //   {kind:'message', label}                 → sends the label (reuses the
    //                                             .doris-ai-suggestion delegation)
    //   {kind:'open_profiles', label, urls:[]}  → opens the profiles in tabs
    //   {kind:'auth', label}                    → Google login + email register
    function renderFollowups(items) {
        if (!items || !items.length) return;
        clearFollowups();
        var row = document.createElement('div');
        row.className = 'doris-ai-followups flex flex-wrap items-center gap-2 pl-9';
        // chips read like statements without a cue that they're tappable
        var label = document.createElement('div');
        label.className = 'w-full text-[10px] font-semibold uppercase tracking-wider text-gray-400';
        label.textContent = 'Suggestions';
        row.appendChild(label);
        items.slice(0, 7).forEach(function (item) {
            if (typeof item === 'string') item = {kind: 'message', label: item};
            if (item.kind === 'auth') {
                row.appendChild(authChip());
            } else if (item.kind === 'open_profiles' && item.urls && item.urls.length) {
                row.appendChild(openProfilesChip(item));
            } else if (item.label) {
                var chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'doris-ai-suggestion cursor-pointer bg-white border border-gray-200 hover:border-blue-500 text-gray-700 text-xs rounded-full px-3 py-1.5 shadow-sm transition';
                chip.textContent = item.label;
                row.appendChild(chip);
            }
        });
        messagesColumn.appendChild(row);
        scrollToBottom();
    }

    function openProfilesChip(item) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'cursor-pointer flex items-center gap-x-1 bg-white border border-blue-200 hover:border-blue-500 text-blue-700 text-xs font-medium rounded-full px-3 py-1.5 shadow-sm transition';
        chip.textContent = '↗ ' + item.label;
        chip.addEventListener('click', function () {
            // browsers may allow only the first window.open per gesture —
            // the rest open if the user permits popups; harmless either way
            item.urls.forEach(function (url) {
                if (/^https?:\/\//.test(url) || url.indexOf('/') === 0) window.open(url, '_blank');
            });
        });
        return chip;
    }

    // Sign in with Google right here, or register by email. `label` sets the
    // Google button text — the anon nudge sells "save conversation"; the
    // free-limit wall sells "keep chatting" (see showRegisterGate).
    //
    // `intent` is what the parent was trying to do when we interrupted them. It
    // is stashed before they leave, so the conversation (and whatever they were
    // reaching for) is waiting when they come back. Google cannot be done in
    // place — GIS was removed deliberately, since a FedCM dialog has nowhere to
    // ask for age or marketing consent — so leaving is unavoidable and the job
    // is to make the return seamless instead.
    function authChip(label, intent) {
        var wrap = document.createElement('span');
        wrap.className = 'flex items-center gap-x-2';
        var google = document.createElement('a');
        google.href = '/parent/google/login';
        google.className = 'cursor-pointer flex items-center gap-x-1.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-xs font-medium rounded-full px-3 py-1.5 shadow-sm transition';
        google.innerHTML = '<svg width="13" height="13" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.7 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.4 6.9-17.7z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.2z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.6l-7.7-6c-2.1 1.4-4.8 2.3-7.5 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z"/></svg>';
        google.appendChild(document.createTextNode(label || 'Register to save conversation'));
        var email = document.createElement('a');
        email.href = '/parent/register';
        email.className = 'cursor-pointer text-xs text-gray-500 underline hover:text-gray-700';
        email.textContent = 'or register with email';
        google.addEventListener('click', function () { rememberReturn(intent); });
        email.addEventListener('click', function () { rememberReturn(intent); });
        wrap.appendChild(google);
        wrap.appendChild(email);
        return wrap;
    }

    // Stash where we are and what the parent was after, just before an auth
    // link takes them away.
    //
    // The first two keys are doris.js's existing return-to-page mechanism
    // (bindRegisterRedirectCapture / maybeRedirectAfterRegister): it already
    // handles the bounce off /parent/dashboard, the 30-minute arming window and
    // the cache-buster that stops a logged-out cached page being served back.
    // Writing the same keys means the chat rides that proven path rather than
    // inventing a third one. The third key is ours, and carries the bit doris.js
    // has no reason to know: which conversation, and which card in it.
    function rememberReturn(intent) {
        var now = Date.now();
        try {
            var here = location.pathname + location.search;
            // /parent/* pages are where auth LANDS, so returning to one would
            // either loop or fight the dashboard's own redirect.
            if (here.indexOf('/parent/') !== 0) {
                localStorage.setItem('register-redirect-to', JSON.stringify({url: here, ts: now}));
                localStorage.setItem('register-redirect-armed', String(now));
            }
            localStorage.setItem('doris-ai-resume', JSON.stringify({
                threadId: threadId, context: context, intent: intent || null, ts: now,
            }));
        } catch (e) { /* private mode — they just land on the dashboard */ }
    }

    function clearFollowups() {
        document.querySelectorAll('.doris-ai-followups').forEach(function (el) { el.remove(); });
    }

    // Soft register nudge for the contact-channel gate: a doris bubble plus the
    // same Google / email CTAs as the wall, but the composer stays open so the
    // parent can keep chatting if they're not ready to register.
    function promptRegisterForContact(schoolName, schoolId) {
        var wrap = dorisBubble(schoolName
            ? 'Righto — a free doris account and I can put you straight through to ' + schoolName + '. It takes a moment, and I will bring you back here.'
            : 'Righto — a free doris account and I can put you straight through. It takes a moment, and I will bring you back here.');
        var cta = document.createElement('div');
        cta.className = 'pl-9';
        cta.appendChild(authChip('Register free to get in touch',
            {kind: 'contacts', schoolId: schoolId || null, schoolName: schoolName || null}));
        wrap.appendChild(cta);
        messagesColumn.appendChild(wrap);
        scrollToBottom(true);
    }

    // A doris-voiced message that did not come from the model: the register
    // nudge, and the welcome back after one. Same shape as a streamed reply so
    // it does not read as chrome bolted onto the conversation.
    function dorisBubble(text) {
        var wrap = document.createElement('div');
        wrap.className = 'flex flex-col gap-y-2';
        var row = document.createElement('div');
        row.className = 'flex items-end gap-x-2';
        var avatar = document.createElement('img');
        avatar.src = '/images/doris-inquisitive.svg';
        avatar.alt = '';
        avatar.className = 'w-7 h-7 rounded-full bg-blue-100 p-0.5 shrink-0';
        var bubble = document.createElement('div');
        bubble.className = 'bg-blue-50 text-gray-800 text-sm rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]';
        bubble.textContent = text;
        row.appendChild(avatar);
        row.appendChild(bubble);
        wrap.appendChild(row);
        return wrap;
    }

    // Register wall: a doris bubble explaining the free limit plus the same
    // Google / email CTAs as the anon nudge, then the composer locks so no more
    // sends fire until they register (server enforces it regardless).
    function showRegisterGate(message) {
        registrationRequired = true;
        clearFollowups();
        var wrap = document.createElement('div');
        wrap.className = 'flex flex-col gap-y-2';
        var row = document.createElement('div');
        row.className = 'flex items-end gap-x-2';
        var avatar = document.createElement('img');
        avatar.src = '/images/doris-inquisitive.svg';
        avatar.alt = '';
        avatar.className = 'w-7 h-7 rounded-full bg-blue-100 p-0.5 shrink-0';
        var bubble = document.createElement('div');
        bubble.className = 'bg-blue-50 text-gray-800 text-sm rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]';
        bubble.textContent = message || "That's your free messages used up. Register — it's free — to carry on chatting with doris.";
        row.appendChild(avatar);
        row.appendChild(bubble);
        wrap.appendChild(row);
        var cta = document.createElement('div');
        cta.className = 'pl-9';
        cta.appendChild(authChip('Register free to keep chatting', {kind: 'continue'}));
        wrap.appendChild(cta);
        messagesColumn.appendChild(wrap);

        input.disabled = true;
        input.value = '';
        input.placeholder = 'Register to keep chatting →';
        sendBtn.disabled = true;
        if (voiceBtn) voiceBtn.disabled = true;
        scrollToBottom(true);
    }

    // A broken stream (server restart, dropped connection) must never eat
    // what already arrived: keep any partial reply and add a quiet note
    // under it. Only an empty bubble shows the error as the message itself.
    function assistantError(assistant, message) {
        stopThinking(assistant);
        var hasPartialReply = assistant.textBuffer !== '' || assistant.textEl.innerHTML !== '';
        if (hasPartialReply) {
            if (assistant.wrap.querySelector('.doris-ai-error-note')) return;
            var note = document.createElement('div');
            note.className = 'doris-ai-error-note text-xs text-red-500 pl-9';
            note.textContent = 'Connection hiccup — this reply may have been cut short.';
            assistant.wrap.appendChild(note);
        } else {
            assistant.textEl.textContent = message;
            assistant.textEl.classList.remove('hidden');
            assistant.textEl.classList.add('text-red-600');
        }
        scrollToBottom();
    }

    // ---- scroll behaviour ----
    // Auto-scroll only while the reader is already at (or near) the bottom.
    // Scrolling up to re-read pins the view; a "Jump to latest" pill appears
    // above the input until they come back down (or tap it).
    var jumpBtn = document.getElementById('doris-ai-jump');
    var stickToBottom = true;

    messagesScroller.addEventListener('scroll', function () {
        var distanceFromBottom = messagesScroller.scrollHeight - messagesScroller.scrollTop - messagesScroller.clientHeight;
        stickToBottom = distanceFromBottom < 100;
        if (jumpBtn) jumpBtn.classList.toggle('hidden', stickToBottom);
    });

    if (jumpBtn) {
        jumpBtn.addEventListener('click', function () {
            stickToBottom = true;
            jumpBtn.classList.add('hidden');
            messagesScroller.scrollTo({top: messagesScroller.scrollHeight, behavior: 'smooth'});
        });
    }

    function scrollToBottom(force) {
        if (force) {
            stickToBottom = true;
            if (jumpBtn) jumpBtn.classList.add('hidden');
        }
        if (!stickToBottom) return;
        messagesScroller.scrollTop = messagesScroller.scrollHeight;
    }

    function autosize() {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 130) + 'px';
    }

    // ---- chat-terms consent (standalone /chat page) ----
    // Mirrors the /schools chat: after the visitor's 4th submitted message,
    // pop the terms modal (same modal, same /api/v1/consent persistence via
    // consent-modal-chat-terms.js). Counted per successful send; once
    // localStorage says consented, never again.
    var consentShownThisLoad = false;

    function countMessageAndMaybeShowConsent() {
        var count = 0;
        try {
            count = Number(localStorage.getItem('doris-ai-msgs') || '0') + 1;
            localStorage.setItem('doris-ai-msgs', String(count));
        } catch (e) { return; }
        var modal = document.querySelector('.modal-consent-chat-terms');
        if (!modal || consentShownThisLoad) return;
        if (localStorage.getItem('consent-chat') === 'true') return;
        if (count < 4) return;
        consentShownThisLoad = true;
        var wrapper = document.getElementById('view-terms');
        // remove only `hidden` — the modal-container overrides the wrapper's
        // `invisible` itself (same trick as the /schools chat)
        if (wrapper) wrapper.classList.remove('hidden');
        var openButton = modal.querySelector('.modal-open-button');
        if (openButton) openButton.click();
    }

    // ---- markdown (client mirror of src/chat/dorisMarkdown.ts) ----
    // Used for live re-rendering while deltas stream; the server's
    // message_html frame remains the canonical render and swaps in at the
    // end (visually identical). Keep the two in sync when changing either.

    function mdEscape(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function appendNested(out, liIndex, nestedType, itemHtml) {
        var closer = nestedType === 'ul' ? '</ul></li>' : '</ol></li>';
        var li = out[liIndex];
        if (li.slice(-closer.length) === closer) {
            out[liIndex] = li.slice(0, -closer.length) + '<li>' + itemHtml + '</li>' + closer;
        } else {
            var openTag = nestedType === 'ul'
                ? '<ul class="list-disc pl-4 mt-1 space-y-0.5">'
                : '<ol class="list-decimal pl-4 mt-1 space-y-0.5">';
            out[liIndex] = li.replace(/<\/li>$/, openTag + '<li>' + itemHtml + '</li>' + closer);
        }
    }

    // Mirrors isDorisUrl in src/chat/dorisMarkdown.ts. The server strips
    // off-host links from the final message_html, but THIS is the live-typing
    // path, so without the same check a planted link would be clickable for the
    // second or two before the final frame swaps in. Anchored both ends: a bare
    // endsWith would clear doris.school.evil.example.
    function mdIsDorisUrl(url) {
        var host = url.match(/^https?:\/\/([^/?#]+)/);
        var bare = host ? host[1].toLowerCase().replace(/:\d+$/, '') : '';
        return bare === 'doris.school' || /\.doris\.school$/.test(bare) || bare === 'localhost';
    }

    function mdAnchor(url, label) {
        if (!mdIsDorisUrl(url)) return label;
        return '<a href="' + url.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener" class="underline text-blue-700">' + label + '</a>';
    }

    function mdInline(escaped) {
        return escaped
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
            .replace(/`([^`]+)`/g, '<code class="bg-gray-100 rounded px-1 text-[0.9em]">$1</code>')
            // markdown links and bare URLs in one alternation — see LINK_PATTERN
            // in src/chat/dorisMarkdown.ts for why it must be a single pass
            .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>"')]+)/g, function (m, label, url, plain) {
                if (plain === undefined) return mdAnchor(url, label);
                var trailing = (plain.match(/[.,:!?]+$/) || [''])[0];
                var bare = plain.slice(0, plain.length - trailing.length);
                if (!mdIsDorisUrl(bare)) return plain;
                return mdAnchor(bare, bare.replace(/^https?:\/\//, '')) + trailing;
            });
    }

    function dorisMarkdown(text) {
        var lines = mdEscape(text).split('\n');
        var out = [];
        var listType = null;
        var lastLiIndex = -1;
        var previousBlank = false;
        function closeList() {
            if (listType) {
                out.push(listType === 'ul' ? '</ul>' : '</ol>');
                listType = null;
                lastLiIndex = -1;
            }
        }
        function isBullet(l) { return l.match(/^\s*[-•]\s+(.*)$/) || l.match(/^\s*\*\s+(.*)$/); }
        function isNumbered(l) { return l.match(/^\s*\d+[.)]\s+(.*)$/); }
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].replace(/\s+$/, '');
            var bullet = isBullet(line);
            var numbered = isNumbered(line);
            var heading = line.match(/^\s*#{1,4}\s+(.*)$/);
            if (bullet && listType === 'ol' && lastLiIndex >= 0) {
                // bullet inside a numbered list = nested note under the item
                appendNested(out, lastLiIndex, 'ul', mdInline(bullet[1]));
                previousBlank = false;
            } else if (numbered && listType === 'ul' && lastLiIndex >= 0) {
                appendNested(out, lastLiIndex, 'ol', mdInline(numbered[1]));
                previousBlank = false;
            } else if (bullet) {
                if (listType !== 'ul') {
                    closeList();
                    out.push('<ul class="list-disc pl-5 my-1.5 space-y-1">');
                    listType = 'ul';
                }
                out.push('<li>' + mdInline(bullet[1]) + '</li>');
                lastLiIndex = out.length - 1;
                previousBlank = false;
            } else if (numbered) {
                if (listType !== 'ol') {
                    closeList();
                    out.push('<ol class="list-decimal pl-5 my-1.5 space-y-1">');
                    listType = 'ol';
                }
                out.push('<li>' + mdInline(numbered[1]) + '</li>');
                lastLiIndex = out.length - 1;
                previousBlank = false;
            } else if (heading) {
                closeList();
                out.push('<p class="font-bold mt-2 mb-1">' + mdInline(heading[1]) + '</p>');
                previousBlank = false;
            } else if (line.trim() === '') {
                // blank between items of the same list is just spacing —
                // closing here restarts the numbering for every item
                if (listType) {
                    var j = i + 1;
                    while (j < lines.length && lines[j].trim() === '') j++;
                    var next = j < lines.length ? lines[j].replace(/\s+$/, '') : '';
                    var continues = listType === 'ul' ? !!isBullet(next) : !!isNumbered(next);
                    if (continues) continue;
                    closeList();
                }
                if (!previousBlank) out.push('<div class="h-2"></div>');
                previousBlank = true;
            } else if (listType && lastLiIndex >= 0) {
                // lazy continuation: a plain line under a list item is part of it
                out[lastLiIndex] = out[lastLiIndex].replace(/<\/li>$/, '<br/>' + mdInline(line) + '</li>');
                previousBlank = false;
            } else {
                out.push('<p class="my-0.5">' + mdInline(line) + '</p>');
                previousBlank = false;
            }
        }
        closeList();
        return out.join('');
    }

    // ---- SSE over fetch ----

    function readSse(stream, onFrame) {
        var reader = stream.getReader();
        var decoder = new TextDecoder();
        var buffer = '';
        function pump() {
            return reader.read().then(function (chunk) {
                if (chunk.done) return;
                buffer += decoder.decode(chunk.value, {stream: true});
                var parts = buffer.split('\n\n');
                buffer = parts.pop();
                parts.forEach(function (frame) {
                    var event = null, data = '';
                    frame.split('\n').forEach(function (line) {
                        if (line.indexOf('event: ') === 0) event = line.slice(7);
                        else if (line.indexOf('data: ') === 0) data += line.slice(6);
                    });
                    if (event && data) {
                        try { onFrame(event, JSON.parse(data)); } catch (e) { /* skip bad frame */ }
                    }
                });
                return pump();
            });
        }
        return pump();
    }

    function readContext() {
        var kind = overlay.getAttribute('data-context-kind') || 'general';
        if (kind === 'school') return {kind: 'school', slug: overlay.getAttribute('data-context-slug')};
        if (kind === 'country') return {kind: 'country', country: overlay.getAttribute('data-context-country')};
        return {kind: kind};
    }

    // ---- voice input ----
    // MediaRecorder -> POST /api/doris-ai/transcribe (base64 JSON) ->
    // transcript into the textarea. While recording: a level meter + timer
    // show the mic is live, and every few seconds the audio-so-far is
    // re-transcribed so the words appear as they're understood; the final
    // pass on stop replaces them. OpenAI does the speech-to-text.
    var recordingStrip = document.getElementById('doris-ai-recording');
    var recTimeEl = document.getElementById('doris-ai-rec-time');
    var recStatusEl = document.getElementById('doris-ai-rec-status');
    var meterBars = document.getElementById('doris-ai-meter');
    meterBars = meterBars ? Array.prototype.slice.call(meterBars.children) : [];

    var recorder = null;
    var recordedChunks = [];
    var recSeq = 0;            // invalidates in-flight interim results after stop
    var baseText = '';         // input text present before recording started
    var interimTimer = null;
    var interimInFlight = false;
    var interimBroken = false; // some containers (Safari mp4) can't be decoded mid-file
    var meterRaf = null;
    var timerInterval = null;
    var audioCtx = null;

    if (voiceBtn) {
        voiceBtn.addEventListener('click', function () {
            if (recorder && recorder.state === 'recording') stopRecording();
            else startRecording();
        });
    }

    function startRecording() {
        if (!navigator.mediaDevices || !window.MediaRecorder) {
            voiceLabel.textContent = 'Unavailable';
            return;
        }
        navigator.mediaDevices.getUserMedia({audio: true}).then(function (mediaStream) {
            recordedChunks = [];
            recSeq++;
            var seq = recSeq;
            baseText = input.value.trim();
            interimInFlight = false;
            interimBroken = false;
            recorder = new MediaRecorder(mediaStream);
            recorder.addEventListener('dataavailable', function (e) {
                if (e.data && e.data.size > 0) recordedChunks.push(e.data);
            });
            recorder.addEventListener('stop', function () {
                mediaStream.getTracks().forEach(function (t) { t.stop(); });
                transcribeSoFar(seq, true);
            });
            recorder.start(1000); // 1s chunks so interim passes have audio to send

            voiceBtn.classList.add('border-red-400', 'text-red-600');
            voiceLabel.textContent = 'Stop';
            showRecordingStrip(mediaStream);
            interimTimer = setInterval(function () { transcribeSoFar(seq, false); }, 3000);
        }).catch(function () {
            voiceLabel.textContent = 'Mic blocked';
        });
    }

    function stopRecording() {
        if (recorder && recorder.state === 'recording') recorder.stop();
        voiceBtn.classList.remove('border-red-400', 'text-red-600');
        voiceLabel.textContent = '…';
        hideRecordingStrip();
    }

    // Stop recording WITHOUT a final transcription pass — the recorder's
    // stop handler still fires transcribeSoFar, but bumping recSeq first
    // makes it (and any in-flight interim result) return early.
    function abortRecording() {
        if (!recorder || recorder.state !== 'recording') return;
        recSeq++;
        recorder.stop();
        voiceBtn.classList.remove('border-red-400', 'text-red-600');
        voiceLabel.textContent = 'Voice';
        hideRecordingStrip();
    }

    // One transcription of everything recorded so far. Interim passes are
    // best-effort: skipped while one is in flight, abandoned for the session
    // if the server can't decode a partial container, ignored if stale.
    function transcribeSoFar(seq, isFinal) {
        if (seq !== recSeq) return;
        if (!isFinal && (interimInFlight || interimBroken || recordedChunks.length === 0)) return;
        var blob = new Blob(recordedChunks, {type: recordedChunks[0] ? recordedChunks[0].type : 'audio/webm'});
        if (blob.size === 0) { if (isFinal) voiceLabel.textContent = 'Voice'; return; }
        if (blob.size > 15 * 1024 * 1024) {
            if (isFinal) voiceLabel.textContent = 'Too long';
            else stopRecording();
            return;
        }
        interimInFlight = true;
        blobToBase64(blob).then(function (base64) {
            return fetch('/api/doris-ai/transcribe', {
                method: 'POST',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify({audio: base64, mime_type: blob.type || 'audio/webm'}),
            });
        }).then(function (res) {
            if (!res.ok) throw new Error('status ' + res.status);
            return res.json();
        }).then(function (data) {
            // final result may land after the user started a new recording
            if (seq !== recSeq && !isFinal) return;
            if (data.text) {
                input.value = baseText ? baseText + ' ' + data.text : data.text;
                autosize();
            }
            if (isFinal) {
                voiceLabel.textContent = 'Voice';
                input.focus();
            }
        }).catch(function () {
            if (isFinal) voiceLabel.textContent = 'Voice';
            else interimBroken = true; // stop hammering; the final pass still runs
        }).finally(function () {
            interimInFlight = false;
        });
    }

    // ---- recording strip: timer + live level meter (Web Audio analyser) ----

    function showRecordingStrip(mediaStream) {
        if (!recordingStrip) return;
        recordingStrip.classList.remove('hidden');
        recordingStrip.classList.add('flex');
        if (recStatusEl) recStatusEl.textContent = "Listening — your words appear above as they're understood";
        var startedAt = Date.now();
        if (recTimeEl) recTimeEl.textContent = '0:00';
        timerInterval = setInterval(function () {
            var s = Math.floor((Date.now() - startedAt) / 1000);
            if (recTimeEl) recTimeEl.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        }, 500);

        try {
            var Ctx = window.AudioContext || window.webkitAudioContext;
            audioCtx = new Ctx();
            var analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            audioCtx.createMediaStreamSource(mediaStream).connect(analyser);
            var samples = new Uint8Array(analyser.frequencyBinCount);
            var animate = function () {
                analyser.getByteFrequencyData(samples);
                var bucket = Math.floor(samples.length / meterBars.length) || 1;
                meterBars.forEach(function (bar, i) {
                    var sum = 0;
                    for (var j = i * bucket; j < (i + 1) * bucket && j < samples.length; j++) sum += samples[j];
                    var level = sum / bucket / 255;
                    bar.style.height = Math.max(3, Math.round(level * 20)) + 'px';
                });
                meterRaf = requestAnimationFrame(animate);
            };
            meterRaf = requestAnimationFrame(animate);
        } catch (e) { /* meter is decoration — recording works without it */ }
    }

    function hideRecordingStrip() {
        if (recordingStrip) {
            recordingStrip.classList.add('hidden');
            recordingStrip.classList.remove('flex');
        }
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        if (interimTimer) { clearInterval(interimTimer); interimTimer = null; }
        if (meterRaf) { cancelAnimationFrame(meterRaf); meterRaf = null; }
        if (audioCtx) { audioCtx.close().catch(function () {}); audioCtx = null; }
        meterBars.forEach(function (bar) { bar.style.height = '3px'; });
    }

    function blobToBase64(blob) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onloadend = function () {
                var dataUrl = reader.result || '';
                resolve(String(dataUrl).split(',')[1] || '');
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
})();
