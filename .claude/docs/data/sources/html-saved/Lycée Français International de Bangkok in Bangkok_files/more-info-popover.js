// Toggle the "More info" popover that hosts Visit Website + Download
// Prospectus links — the de-emphasised outbound CTAs.
//
// The popover lives inside the horizontally-scrolling CTA row, which
// `overflow-x:auto` clips. We detach it on first open and re-parent it to
// <body>, then position it with `fixed` coordinates anchored to the trigger
// pill's getBoundingClientRect. The popover follows the trigger on scroll
// / resize while it's open.
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.more-info-trigger').forEach(trigger => {
        const popover = trigger.parentElement && trigger.parentElement.querySelector('.more-info-popover');
        if (!popover) return;

        // One-time: lift the popover out of the overflow-clipped scroller
        // into <body> so it can render above everything. We also force
        // fixed positioning so the parent's relative wrapper no longer
        // anchors it.
        function detach() {
            if (popover.dataset.detached === '1') return;
            popover.dataset.detached = '1';
            popover.style.position = 'fixed';
            popover.style.left = '-9999px';
            popover.style.top = '-9999px';
            document.body.appendChild(popover);
        }

        function position() {
            const r = trigger.getBoundingClientRect();
            const popW = popover.offsetWidth || 288; // 18rem fallback
            const popH = popover.offsetHeight || 120;
            const margin = 6;
            // Preferred: anchored to the bottom-right of the trigger.
            let left = r.right - popW;
            let top = r.bottom + margin;
            // If we'd overflow the right, slide left.
            if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
            if (left < 8) left = 8;
            // If we'd overflow the bottom, flip above the trigger.
            if (top + popH > window.innerHeight - 8) {
                top = Math.max(8, r.top - popH - margin);
            }
            popover.style.left = left + 'px';
            popover.style.top = top + 'px';
        }

        const chevron = trigger.querySelector('.more-info-chevron');

        function open() {
            // Close any other open popovers first
            document.querySelectorAll('.more-info-popover').forEach(p => {
                if (p !== popover) p.classList.add('hidden');
            });
            // Reset other triggers' chevrons.
            document.querySelectorAll('.more-info-trigger .more-info-chevron').forEach(c => {
                if (c !== chevron) c.style.transform = '';
            });
            detach();
            popover.classList.remove('hidden');
            if (chevron) chevron.style.transform = 'rotate(180deg)';
            position();
            window.addEventListener('scroll', position, true);
            window.addEventListener('resize', position);
        }

        function close() {
            var wasOpen = !popover.classList.contains('hidden');
            popover.classList.add('hidden');
            if (chevron) chevron.style.transform = '';
            window.removeEventListener('scroll', position, true);
            window.removeEventListener('resize', position);
            // Opt-in: a popover can name an event to fire when it closes.
            // The school search filter bar uses this to emit the same
            // `doris:filters-closed` the filter drawer emits, so closing a
            // filter popover still records schools/search_criteria. Opt-in
            // rather than hardcoded because this file also drives the
            // unrelated "More info" / "Contact options" popovers, which have
            // nothing to say about filters.
            var emit = popover.getAttribute('data-emit-on-close');
            if (wasOpen && emit) document.dispatchEvent(new CustomEvent(emit));
        }

        trigger.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            if (popover.classList.contains('hidden')) {
                open();
            } else {
                close();
            }
        });

        // Click outside closes the popover.
        document.addEventListener('click', e => {
            if (popover.classList.contains('hidden')) return;
            if (popover.contains(e.target) || trigger.contains(e.target)) return;
            close();
        });

        // Esc closes too.
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') close();
        });
    });
});
