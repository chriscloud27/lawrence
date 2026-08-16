function htmlEscape(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function safeImgUrl(u) {
    if (!u) return '';
    try {
        const url = new URL(u, location.origin);
        return (url.protocol === 'http:' || url.protocol === 'https:') ? u : '';
    } catch { return ''; }
}

window.addEventListener('DOMContentLoaded', () => {
    const nameMeta = document.querySelector('meta[name="app:school-name"]');
    const name = nameMeta ? nameMeta.content : undefined;

    openPartOfGroup();
    window.doris.saveSchoolToShortlist();
    window.doris.shareButtons();
    backBtn();
    backToTopBtn();
    handleCarousels();
    handleShowMoreVibes();
    window.doris.handleCollapsibleSections();
    handleScrollArrowIndicator();
    handleClampedText();
    handleMobileNavVisibility();
    handleFaqTracking();
    handleAlumniReadMore();
    handleShowMoreAlumni();
    // observeRecommendations() and handlePlacementSection() are invoked by
    // school-recommendations.js after the async fragment is injected.
})

window.handlePlacementSection = handlePlacementSection;
window.observeRecommendations = observeRecommendations;

function handleMobileNavVisibility() {
    const nav = document.getElementById('mobile-nav');
    const stickyHeader = document.getElementById('school-sticky-header');
    if (!nav) return;

    let lastScrollY = window.scrollY;

    const isMobile = () => window.innerWidth < 768;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        if (currentScrollY > lastScrollY && currentScrollY > 48) {
            nav.style.transform = 'translateY(-100%)';
            if (stickyHeader && isMobile()) stickyHeader.style.top = '0';
        } else {
            nav.style.transform = 'translateY(0)';
            if (stickyHeader && isMobile()) stickyHeader.style.top = '48px';
        }
        lastScrollY = currentScrollY;
    }, { passive: true });
}

function handlePlacementSection() {
    const section = document.getElementById('placement-section');
    if (!section) return;

    const schoolIdMeta = document.querySelector('meta[name="app:school-id"]');
    const schoolId = schoolIdMeta ? schoolIdMeta.content : undefined;

    // Track view for each ad card (only after 2s in viewport)
    var viewedAdIds = new Set();
    var viewTimers = new Map();
    var viewObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            var card = entry.target;
            var adId = card.dataset.adId;
            if (viewedAdIds.has(adId)) return;
            if (entry.isIntersecting) {
                var timer = setTimeout(function () {
                    if (!viewedAdIds.has(adId)) {
                        viewedAdIds.add(adId);
                        if (window.doris) window.doris.saveEvent({
                            name: 'school/retargeting/view',
                            data: {school_id: schoolId, ad_id: adId, ad_name: card.dataset.adTitle}
                        });
                    }
                }, 1000);
                viewTimers.set(adId, timer);
            } else {
                if (viewTimers.has(adId)) {
                    clearTimeout(viewTimers.get(adId));
                    viewTimers.delete(adId);
                }
            }
        });
    }, {root: null, rootMargin: '0px', threshold: 0.5});
    section.querySelectorAll('.retargeting-card').forEach(function (card) {
        viewObserver.observe(card);
    });

    // Track clicks on CTA buttons
    section.querySelectorAll('.retargeting-cta-button').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var card = btn.closest('.retargeting-card');
            var adTitle = card ? card.dataset.adTitle : '';
            var adId = card ? card.dataset.adId : '';
            if (window.doris) window.doris.saveEvent({
                name: 'school/retargeting/click',
                data: {school_id: schoolId, ad_id: adId, ad_name: adTitle}
            });
        });
    });

    // Image carousels within each ad card
    section.querySelectorAll('.retargeting-carousel').forEach(function (carousel) {
        var wrapper = carousel.parentElement;
        var dots = wrapper.querySelectorAll('.retargeting-dot');
        var leftArrow = wrapper.querySelector('.retargeting-arrow-left');
        var rightArrow = wrapper.querySelector('.retargeting-arrow-right');
        var card = carousel.closest('.retargeting-card');
        var adTitle = card ? card.dataset.adTitle : '';
        var adId = card ? card.dataset.adId : '';
        var imageCount = carousel.querySelectorAll('img').length;
        var lastTrackedIndex = 0;
        if (dots.length < 2) return;

        function updateArrows(currentIndex) {
            if (leftArrow) leftArrow.style.display = currentIndex > 0 ? 'flex' : 'none';
            if (rightArrow) rightArrow.style.display = currentIndex < imageCount - 1 ? 'flex' : 'none';
        }

        carousel.addEventListener('scroll', function () {
            var scrollLeft = carousel.scrollLeft;
            var width = carousel.offsetWidth;
            var currentIndex = Math.round(scrollLeft / width);
            dots.forEach(function (dot, idx) {
                dot.classList.toggle('bg-tertiary', idx === currentIndex);
                dot.classList.toggle('bg-gray-300', idx !== currentIndex);
            });
            updateArrows(currentIndex);
            if (currentIndex !== lastTrackedIndex) {
                lastTrackedIndex = currentIndex;
                if (window.doris) window.doris.saveEvent({
                    name: 'school/retargeting/image-scroll',
                    data: {school_id: schoolId, ad_id: adId, image_index: currentIndex}
                });
            }
        });

        if (leftArrow) leftArrow.addEventListener('click', function () {
            carousel.scrollBy({ left: -carousel.offsetWidth, behavior: 'smooth' });
        });
        if (rightArrow) rightArrow.addEventListener('click', function () {
            carousel.scrollBy({ left: carousel.offsetWidth, behavior: 'smooth' });
        });
    });

    // Dismiss menu
    var dismissBtn = document.getElementById('placement-dismiss-btn');
    var dismissMenu = document.getElementById('placement-dismiss-menu');
    if (dismissBtn && dismissMenu) {
        dismissBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            dismissMenu.classList.toggle('hidden');
        });
        document.addEventListener('click', function () {
            dismissMenu.classList.add('hidden');
        });
    }

    var dontShowBtn = document.getElementById('placement-dont-show');
    if (dontShowBtn) dontShowBtn.addEventListener('click', function () {
        var card = section.querySelector('.retargeting-card');
        var adId = card ? card.dataset.adId : '';
        if (window.doris) window.doris.saveEvent({
            name: 'school/retargeting/dismiss',
            data: {school_id: schoolId, ad_id: adId}
        });
        fetch('/api/v1/preferences', {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({feature: 'retargeting_ads', feature_on: false})
        });
        section.style.display = 'none';
    });
}

function handleClampedText() {
    document.querySelectorAll('[data-clamp]').forEach(el => {
        el.addEventListener('click', () => {
            const isExpanded = el.dataset.expanded === 'true';
            if (isExpanded) {
                el.style.webkitLineClamp = '';
                el.style.overflow = '';
                el.style.display = '';
                el.dataset.expanded = 'false';
            } else {
                el.style.webkitLineClamp = 'unset';
                el.style.overflow = 'visible';
                el.style.display = 'block';
                el.dataset.expanded = 'true';
            }
        });
    });
}

function openPartOfGroup() {
    const partOfGroup = document.querySelector('.part-of-group');
    if (partOfGroup) partOfGroup.addEventListener('click', event => {
        const openGroup = document.querySelector('.open-group');
        if (openGroup) openGroup.click();
    });
}

function newMapLibreMap(element, center = [101, 3], zoom = 12) {
    if (!window.maplibregl) return;
    if (!element) return;

    return new maplibregl.Map({
        container: element,
        style: {
            version: 8,
            sources: {
                'osm': {
                    type: 'raster',
                    tiles: ['https://a.tile.openstreetmap.de/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '© OpenStreetMap contributors'
                }
            },
            layers: [{
                id: 'osm',
                type: 'raster',
                source: 'osm',
                minzoom: 0,
                maxzoom: 19
            }]
        },
        center: center, // [lng, lat]
        zoom: zoom,
        attributionControl: true
    });
}

function handleCarousels() {
    document.querySelectorAll('.carousel').forEach(carousel => {
        const dots = carousel.parentElement.querySelectorAll('.dot');

        carousel.addEventListener('scroll', () => {
            const scrollLeft = carousel.scrollLeft;
            const width = carousel.offsetWidth;
            const currentIndex = Math.round(scrollLeft / width);

            dots.forEach((dot, idx) => {
                dot.classList.toggle('w-3', idx === currentIndex);
                dot.classList.toggle('w-2', idx !== currentIndex);
                dot.classList.toggle('h-3', idx === currentIndex);
                dot.classList.toggle('h-2', idx !== currentIndex);
            });
        });
    });
}

function handleAlumniReadMore() {
    document.querySelectorAll('.alum-read-more').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const row = btn.closest('.alum-row');
            if (!row) return;
            const clamped = row.querySelector('.alum-desc-clamped');
            const full = row.querySelector('.alum-desc-full');
            if (clamped) clamped.classList.add('hidden');
            if (full) full.classList.remove('hidden');
            btn.classList.add('hidden');
        });
    });
}

function handleShowMoreAlumni() {
    const btn = document.getElementById('show-more-alumni-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
        document.querySelectorAll('.alum-extra').forEach(function (row) {
            row.classList.remove('hidden');
        });
        btn.parentElement.classList.add('hidden');
    });
}

function handleShowMoreVibes() {
    const showMoreBtn = document.getElementById('show-more-vibes-btn');
    const showLessBtn = document.getElementById('show-less-vibes-btn');
    const showMoreContainer = document.getElementById('show-more-container');
    const moreVibes = document.getElementById('more-vibes');
    const schoolId = document.querySelector('meta[name="app:school-id"]').content;

    if (showMoreBtn && showLessBtn && showMoreContainer && moreVibes) {
        showMoreBtn.addEventListener('click', () => {
            window.doris.saveEvent({name: 'view-section/school/profile', data: {name: 'vibes', school_id: schoolId}})
            moreVibes.classList.remove('hidden');
            showMoreContainer.classList.add('hidden');
        });

        showLessBtn.addEventListener('click', () => {
            moreVibes.classList.add('hidden');
            showMoreContainer.classList.remove('hidden');
            // Scroll back to the vibes section
            const vibesSection = document.getElementById('vibes-and-culture');
            if (vibesSection) vibesSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }
}

function handleFaqTracking() {
    const faqItems = document.querySelectorAll('.faq-item');
    const schoolIdMeta = document.querySelector('meta[name="app:school-id"]');
    const schoolId = schoolIdMeta ? schoolIdMeta.content : undefined;

    faqItems.forEach(item => {
        item.addEventListener('toggle', () => {
            if (item.open) {
                window.doris.saveEvent({name: 'view-section/school/profile', data: {name: 'faq', school_id: schoolId}})
            }
        });
    });
}

function backBtn() {
    const backBtns = document.querySelectorAll('.back-btn')
    backBtns.forEach(backBtn => {
        backBtn.addEventListener('click', e => {
            const parts = window.location.pathname.split('/').filter(Boolean);
            window.location.href = '/' + parts.slice(0, 2).join('/');
        });
    })
}

function backToTopBtn() {
    const scrollBtn = document.getElementById('scrollToTop');

    window.addEventListener('scroll', () => {
        // Show button after scrolling down 300px
        if (window.scrollY > 300) {
            scrollBtn.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
            scrollBtn.classList.add('opacity-100', 'translate-y-0');
        } else {
            scrollBtn.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
            scrollBtn.classList.remove('opacity-100', 'translate-y-0');
        }
    });

    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

}

// called by google map on load on school profile page
window.setupSchoolOnMap = setupSchoolOnMap;

// ---- commute home pin -------------------------------------------------
//
// The commute tool (school-profile-tools.js) drops a pin where it geocoded the
// parent's home, so they can SEE the point the travel time was measured from and
// judge for themselves whether the estimate is sensible. A geocode that landed
// in the wrong suburb is obvious on a map and invisible in a "23 min" figure.
//
// Cross-file, and the map is injected ~1.5s after load, so the two can arrive in
// either order: whichever lands second does the work. The home is held in a
// module variable rather than passed through, because the map instances are
// created deep inside setupSchoolOnMap's async callback.
let profileMaps = [];
let profileSchoolBounds = null;
let commuteHome = null;
let commuteHomeMarkers = [];

window.showCommuteHomeOnMap = showCommuteHomeOnMap;

function showCommuteHomeOnMap(home) {
    // A null/incomplete home clears the pin (the parent cleared their address).
    commuteHome = (home && isFinite(home.lat) && isFinite(home.lng)) ? home : null;
    renderCommuteHome();
}

function renderCommuteHome() {
    commuteHomeMarkers.forEach(m => m.remove());
    commuteHomeMarkers = [];
    if (!commuteHome || !window.maplibregl || profileMaps.length === 0) return;

    profileMaps.forEach(map => {
        const markerEl = document.createElement('div');
        markerEl.innerHTML = createHomePinSVG();
        markerEl.style.width = '20px';
        markerEl.style.height = '28px';
        // Native tooltip via the property (never innerHTML) — the label is a
        // Google-formatted address, i.e. untrusted text.
        if (commuteHome.label) markerEl.title = 'Your home: ' + commuteHome.label;

        commuteHomeMarkers.push(
            new maplibregl.Marker({element: markerEl})
                .setLngLat([commuteHome.lng, commuteHome.lat])
                .addTo(map));

        // Widen the view to hold home AND school, so the whole journey is on
        // screen. maxZoom keeps a home a few streets away from zooming to rooftops.
        const bounds = profileSchoolBounds
            ? new maplibregl.LngLatBounds(profileSchoolBounds.getSouthWest(), profileSchoolBounds.getNorthEast())
            : new maplibregl.LngLatBounds();
        bounds.extend([commuteHome.lng, commuteHome.lat]);
        if (!bounds.isEmpty()) {
            // Two separate reasons the pins sat on the frame:
            //  - fitBounds pads in PIXELS and anchors the box corners at that
            //    inset, so a 28px-tall pin on a 40px inset still overhangs. Hence
            //    56px.
            //  - the box was exactly home-to-school, so there was no map around
            //    the journey at all. HALF_EXTRA_SPAN grows it by 10% per side,
            //    i.e. 20% more area on each axis.
            map.fitBounds(padBounds(bounds, HALF_EXTRA_SPAN), {padding: 56, maxZoom: 14});
        }
    });
}

// Applied to EACH side, so the total span grows by twice this — 0.1 here means
// the view shows 20% more ground than the home-to-school box alone.
var HALF_EXTRA_SPAN = 0.1;

// Grow a bounds box by `fraction` of its own span on each side, so fitBounds
// leaves breathing room around the outermost pins instead of putting them on the
// frame. Latitude is clamped to the projection's limits; longitude is not
// wrapped, because a home and its school are never on opposite sides of the
// antimeridian.
function padBounds(bounds, fraction) {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    // Floor the span so a home geocoded onto the school itself still produces a
    // box rather than a point. It stays tiny (~100m once padded) and maxZoom caps
    // the zoom anyway, but a zero-span box makes fitBounds' maths degenerate.
    const lngSpan = Math.max(ne.lng - sw.lng, 0.005);
    const latSpan = Math.max(ne.lat - sw.lat, 0.005);
    const lngPad = lngSpan * fraction;
    const latPad = latSpan * fraction;
    return new maplibregl.LngLatBounds(
        [sw.lng - lngPad, Math.max(sw.lat - latPad, -85)],
        [ne.lng + lngPad, Math.min(ne.lat + latPad, 85)],
    );
}

// Deliberately distinct from the school pin: doris pink with a house glyph, so
// "you" and "the school" are never confused at a glance.
function createHomePinSVG() {
    return `
        <svg width="20" height="28" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 24 16 24s16-15.2 16-24C32 7.2 24.8 0 16 0z"
                  fill="#DB2955" stroke="#151C3F" stroke-width="2"/>
            <path d="M16 9l7 6h-2v7h-4v-5h-2v5h-4v-7H9l7-6z" fill="#FFFFFF"/>
        </svg>
    `;
}

function getMapElements() {
    // ONLY `.map-profile`. The multi-campus map (`.map-multi-campus`) has
    // its own setup in `setupMultiCampusMap()` — including it here too
    // caused a maplibre instance to be attached twice to the same DOM
    // container on group-school profiles (e.g. BME International in
    // Hungary). The two instances would fight over the resize observer /
    // render frame, mutually-recursing through maplibre's internal render
    // pipeline until the call stack blew. Sentry would surface it as
    // RangeError: Maximum call stack size exceeded inside setTimeout,
    // with the trace looping kl ↔ il at the same minified line.
    return Array.from(document.querySelectorAll('.map-profile'));
}

function setupSchoolOnMap() {
    // The `school-profile-script` tag carries the school's lat_lng in its
    // src query string. It's `defer`, so it's normally in the DOM by the
    // time maplibre fires this — but be tolerant: on some satellite/preview
    // pages the tag is absent entirely. Bail to group-derived center rather
    // than null-throwing.
    const script = document.getElementById('school-profile-script');
    let latLng = null;
    if (script && script.src) {
        try { latLng = new URL(script.src).searchParams.get('lat_lng'); } catch (e) {}
    }
    const schoolIdMeta = document.querySelector('meta[name="app:school-id"]');
    const schoolId = schoolIdMeta ? schoolIdMeta.content : undefined;

    if (!window.maplibregl) return;
    const ownPins = latLngPins(latLng);
    const [lat, lng] = ownPins[0] || [undefined, undefined];

    waitFor(() => getMapElements(), async (mapElements) => {
        // Fetch all schools in the group first. The app:school-id meta is
        // absent on some pages — skip the fetch rather than requesting
        // /groups/undefined (the map still renders from the school's own pins).
        let groupSchools = [];
        if (schoolId) {
            try {
                const response = await fetch('/groups/' + schoolId, {method: 'GET'});
                const data = await response.json();
                if (data.groupSchools && data.groupSchools.length > 0) {
                    groupSchools = data.groupSchools;
                }
            } catch (err) {
                console.error('Error loading group schools:', err);
            }
        } else if (document.querySelector('.map-multi-campus')) {
            // Only report when the school is part of a group — that's the
            // only case where the missing meta costs anything (the group
            // map). The multi-campus div renders solely for group schools,
            // so it doubles as the group indicator when the meta is gone.
            waitFor(() => window.Sentry, () => {
                const nameMeta = document.querySelector('meta[name="app:school-name"]');
                window.Sentry.captureMessage('school-profile map: app:school-id meta missing on a group school', {
                    level: 'error',
                    extra: {
                        page: window.location.href,
                        schoolName: nameMeta ? nameMeta.content : null,
                    },
                });
            });
        }

        mapElements.forEach(elementId => {
            let centerLng, centerLat, initialZoom;

            // Calculate center before creating map to avoid loading unnecessary tiles
            if (groupSchools.length > 0) {
                // Calculate average center from group schools
                const {totalLat, totalLng, count} = groupSchools.reduce((acc, school) => {
                    const [pin] = latLngPins(school.lat_lng);
                    if (pin) {
                        return {
                            totalLat: acc.totalLat + pin[0],
                            totalLng: acc.totalLng + pin[1],
                            count: acc.count + 1
                        };
                    }
                    return acc;
                }, {totalLat: 0, totalLng: 0, count: 0});

                centerLat = count > 0 ? totalLat / count : Number(lat);
                centerLng = count > 0 ? totalLng / count : Number(lng);
                initialZoom = 11;
            } else {
                // Single school
                centerLat = Number(lat);
                centerLng = Number(lng);
                initialZoom = 12;
            }

            // Create map with correct center from the start
            const map = newMapLibreMap(elementId, [centerLng, centerLat], initialZoom);
            if (!map) return;
            // Remembered so the commute tool can drop a home pin on it later
            // (see showCommuteHomeOnMap).
            profileMaps.push(map);

            // Add navigation controls
            map.addControl(
                new maplibregl.NavigationControl({
                    showZoom: true,
                    showCompass: true,
                    visualizePitch: true
                }),
                'top-right'
            );

            // If we have group schools, place markers and fit bounds
            if (groupSchools.length > 0) {
                const bounds = new maplibregl.LngLatBounds();

                // Place markers for all schools in the group (every campus
                // pin of each) and extend bounds
                groupSchools.forEach(school => {
                    latLngPins(school.lat_lng).forEach(([lat, lng]) => {
                        bounds.extend([lng, lat]); // MapLibre uses [lng, lat]
                    });
                    placeSchoolMarker(map, school, schoolId);
                });

                // Fit map to show all markers
                if (!bounds.isEmpty()) {
                    profileSchoolBounds = bounds;
                    map.fitBounds(bounds, {
                        padding: 50,
                        maxZoom: groupSchools.length <= 2 ? 15 : 22
                    });
                }
            } else {
                // No group — one marker per campus pin (a merged multi-campus
                // school carries several pins in its own lat_lng)
                if (!window.maplibregl) return;

                const bounds = new maplibregl.LngLatBounds();
                ownPins.forEach(([pinLat, pinLng]) => {
                    const markerEl = document.createElement('div');
                    markerEl.innerHTML = createPinSVG(false, true); // isCurrentSchool = true
                    markerEl.style.cursor = 'pointer';
                    markerEl.style.width = '20px';
                    markerEl.style.height = '28px';

                    new maplibregl.Marker({
                        element: markerEl
                    })
                    .setLngLat([pinLng, pinLat]) // MapLibre uses [lng, lat]
                    .addTo(map);
                    bounds.extend([pinLng, pinLat]);
                });
                if (!bounds.isEmpty()) profileSchoolBounds = bounds;
                if (ownPins.length > 1) {
                    map.fitBounds(bounds, {padding: 50, maxZoom: 15});
                }
            }
            // A commute result may have arrived before maplibre finished loading
            // (the script is injected ~1.5s after load) — apply any pending home.
            renderCommuteHome();
        })
        // Also setup multi-campus map if needed
        setupMultiCampusMap();
    }, 100, 5000);
}

function setupMultiCampusMap() {
    if (!window.maplibregl) return;

    const schoolIdMeta = document.querySelector('meta[name="app:school-id"]');
    const schoolId = schoolIdMeta ? schoolIdMeta.content : undefined;
    if (!schoolId) return;

    fetch('/groups/' + schoolId, {method: 'GET'})
        .then(res => res.json().then(response => {
            const schools = response.groupSchools;
            if (response.groupSchools == null) return;

            // Calculate center before creating map to avoid loading unnecessary tiles
            const schoolLatLngs = schools
                .map(s => latLngPins(s.lat_lng)[0])
                .filter(Boolean);
            const totalLat = schoolLatLngs.map(it => it[0]).reduce((sum, n) => sum += n, 0)
            const totalLng = schoolLatLngs.map(it => it[1]).reduce((sum, n) => sum += n, 0)
            const averageLat = totalLat / schoolLatLngs.length;
            const averageLng = totalLng / schoolLatLngs.length;

            // Create map with correct center from the start
            const mapName = document.querySelector('.map-multi-campus');
            const mapMultiCampus = newMapLibreMap(mapName, [averageLng, averageLat], 11);
            if (!mapMultiCampus) return;

            // Add navigation controls
            mapMultiCampus.addControl(
                new maplibregl.NavigationControl({
                    showZoom: true,
                    showCompass: true,
                    visualizePitch: true
                }),
                'top-right'
            );

            const markers = schools
                .filter(s => !!s.lat_lng)
                .map(s => placeSchoolMarker(mapMultiCampus, s, schoolId));

            const schoolListName = `school-list-multi-campus-mobile`;
            document.getElementById(schoolListName).innerHTML = schools.map(s => schoolGroupListItem(s)).join('');
        }))
        .catch(err => console.error('Error loading multi-campus map:', err));
}

// Mirror of hideCityForCountries in src/domain/school.ts — countries small enough that
// the city label adds nothing over the country label, so we suppress the city.
// Keep in sync with the domain list; test/schools/citiesByCountry.spec.ts pins
// the two together.
const HIDE_CITY_FOR_COUNTRIES = new Set([
    'singapore', 'brunei', 'hong kong', 'macau', 'andorra',
    'monaco', 'liechtenstein', 'san marino', 'luxembourg',
]);

function schoolGroupListItem(school) {
    const regionSlug = String(school.region || '').replace(/\s+/g, '-');
    const href = `/schools/${encodeURIComponent(regionSlug)}/${encodeURIComponent(String(school.slug || ''))}`;
    const titleCase = (s) => s.replace(/\b\w/g, c => c.toUpperCase());
    const hideCity = HIDE_CITY_FOR_COUNTRIES.has((school.region || '').toLowerCase());
    const locationBits = (hideCity
        ? [school.region]
        : [school.city, school.region]).filter(Boolean).map(titleCase).join(', ');
    const logo = school.logo
        ? `<img src="${htmlEscape(safeImgUrl(school.logo))}" alt="${htmlEscape(school.name)} logo" class="h-12 w-12 rounded-lg object-contain bg-white border border-gray-200 shrink-0">`
        : `<div class="h-12 w-12 rounded-lg bg-tertiary/40 text-primary font-bold text-lg flex items-center justify-center shrink-0">${htmlEscape((school.name || '?').charAt(0))}</div>`;
    const curriculumPill = school.curriculum
        ? `<span class="inline-flex items-center text-xs font-medium bg-tertiary/30 text-primary rounded-full px-2.5 py-0.5">${htmlEscape(school.curriculum)}</span>`
        : '';
    const agesPill = school.age_min != null && school.age_max != null
        ? `<span class="inline-flex items-center text-xs font-medium bg-gray-100 text-gray-700 rounded-full px-2.5 py-0.5">Ages ${htmlEscape(niceAge(school.age_min))} to ${htmlEscape(school.age_max)}</span>`
        : '';

    return `<a target="_blank" href="${htmlEscape(href)}"
   class="group flex items-start gap-4 bg-white p-4 rounded-xl border border-gray-200 hover:border-primary hover:shadow-md transition-all text-left">
    ${logo}
    <div class="flex flex-col gap-y-1.5 flex-1 min-w-0 text-left">
        <div class="name font-bold text-base sm:text-lg text-primary line-clamp-2" data-name="${htmlEscape(school.name)}" data-id="${htmlEscape(school.id)}">
            ${htmlEscape(school.name)}
        </div>
        ${locationBits ? `<div class="text-sm text-primary/60 truncate text-left">${htmlEscape(locationBits)}</div>` : ''}
        <div class="flex flex-wrap gap-1.5 mt-1 justify-start">
            ${curriculumPill}
            ${agesPill}
        </div>
    </div>
    <svg class="w-5 h-5 text-primary/30 group-hover:text-primary shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
    </svg>
</a>`;
}

function niceAge(age) {
    if (!age) return ''
    const ageSplit = age.toString().split('.');
    return ageSplit.length === 2
        ? (ageSplit[0] === '0' ? '6 months' : (ageSplit[0] + '½'))
        : age;
}

function createPinSVG(favourited, isCurrentSchool = false) {
    // Determine colors based on state
    let bgColor, dotColor;

    if (isCurrentSchool) {
        // Current school: navy background, white dot
        bgColor = '#151C3F';
        dotColor = '#FFFFFF';
    } else if (favourited) {
        // Favorited: pink background, navy dot
        bgColor = '#DB2955';
        dotColor = '#151C3F';
    } else {
        // Normal: blue background, navy dot
        bgColor = '#9EB9ED';
        dotColor = '#151C3F';
    }

    const borderColor = '#151C3F';

    return `
        <svg width="20" height="28" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
            <path class="pin-bg" d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 24 16 24s16-15.2 16-24C32 7.2 24.8 0 16 0z"
                  fill="${bgColor}" stroke="${borderColor}" stroke-width="2"/>
            <circle class="pin-dot" cx="16" cy="16" r="5" fill="${dotColor}"/>
        </svg>
    `;
}

function placeSchoolMarker(map, school, currentSchoolId) {
    if (!window.maplibregl) return;
    const pins = latLngPins(school.lat_lng);
    if (pins.length === 0) return;

    const isCurrentSchool = school.id === currentSchoolId;

    // One marker per campus pin (merged multi-campus schools carry several)
    const markers = pins.map(([lat, lng]) => {
        const markerEl = document.createElement('div');
        markerEl.innerHTML = createPinSVG(false, isCurrentSchool);
        markerEl.style.cursor = 'pointer';
        markerEl.style.width = '20px';
        markerEl.style.height = '28px';

        return new maplibregl.Marker({
            element: markerEl
        })
        .setLngLat([lng, lat]) // MapLibre uses [lng, lat]
        .addTo(map);
    });

    return markers[0];
}

// A school's lat_lng may hold several campus pins ("lat,lng;lat,lng" —
// merged multi-campus schools). Returns [[lat, lng], ...], primary first.
function latLngPins(latLngStr) {
    if (!latLngStr) return [];
    return latLngStr.split(';')
        .map(p => p.trim()).filter(Boolean)
        .map(p => p.split(',').map(Number))
        .filter(pin => isFinite(pin[0]) && isFinite(pin[1]));
}

function handleScrollArrowIndicator() {
    const scrollContainer = document.getElementById('sticky-top-scroll-container');
    const arrowIndicator = document.getElementById('scroll-arrow-indicator');

    if (!scrollContainer || !arrowIndicator) {
        return;
    }

    function updateArrowVisibility() {
        // Check if scrolled to the end
        const isScrolledToEnd = scrollContainer.scrollLeft + scrollContainer.clientWidth >= scrollContainer.scrollWidth - 1;

        if (isScrolledToEnd) {
            arrowIndicator.style.opacity = '0';
        } else {
            arrowIndicator.style.opacity = '1';
        }
    }

    // Check on scroll
    scrollContainer.addEventListener('scroll', updateArrowVisibility);

    // Check on load (in case content doesn't overflow)
    updateArrowVisibility();

    // Check on resize
    window.addEventListener('resize', updateArrowVisibility);
}

function observeRecommendations() {
    const recommendationsContainer = document.getElementById('recommendations');
    if (!recommendationsContainer) return;

    const impressions = [];

    function reportImpressions() {
        if (impressions.length > 0) {
            window.doris.saveEvent({
                name: 'impression/school_profile/recommend',
                data: {ids: impressions}
            });
        }
    }

    // Send impressions when navigating away
    window.addEventListener('pagehide', reportImpressions);
    window.addEventListener('beforeunload', reportImpressions);

    // Check visibility every 1 second
    const recommendations = recommendationsContainer.querySelectorAll('.school-list-item');
    setInterval(() => {
        recommendations.forEach(school => {
            const schoolId = school.getAttribute('data-school-id');

            // Skip if already tracked
            if (impressions.includes(schoolId)) {
                return;
            }

            // Check if school is visible (at least 50% in viewport)
            const rect = school.getBoundingClientRect();
            const windowHeight = window.innerHeight || document.documentElement.clientHeight;
            const windowWidth = window.innerWidth || document.documentElement.clientWidth;

            const verticalVisible = rect.top < windowHeight && rect.bottom > 0;
            const horizontalVisible = rect.left < windowWidth && rect.right > 0;
            const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
            const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
            const visibleArea = visibleHeight * visibleWidth;
            const totalArea = rect.height * rect.width;
            const visibilityRatio = totalArea > 0 ? visibleArea / totalArea : 0;

            // Record impression if at least 50% visible
            if (verticalVisible && horizontalVisible && visibilityRatio >= 0.5) {
                impressions.push(schoolId);
            }
        });
    }, 1000);
}