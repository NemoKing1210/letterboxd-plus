import {
  fetchFilmMiniProfile,
  peekCachedFilmMiniProfile,
} from '../api/film-profile.js';
import { getMetacriticRating } from '../api/metacritic.js';
import { getRottenTomatoesRating } from '../api/rotten-tomatoes.js';
import {
  FAVICON_URL,
  FILM_FETCH_CONCURRENCY,
  FILM_HOVER_CLOSE_MS,
  FILM_HOVER_OPEN_MS,
  FILM_LEAVE_MS,
  FILM_POSTER_SKIP_ANCESTOR,
  FILM_PRELOAD_ROOT_MARGIN,
  METACRITIC_ORIGIN,
  ROTTEN_TOMATOES_ORIGIN,
} from '../constants.js';
import { t } from '../i18n/index.js';
import { debounce } from '../utils/debounce.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';

const HOVER_ATTR = 'data-lbp-fmp-hover';
const MARK_ATTR = 'data-lbp-fmp';
const PRELOAD_ATTR = 'data-lbp-fmp-preload';
const POPOVER_ID = 'lbp-film-mini-profile';
const POSTER_SELECTOR =
  '.react-component[data-component-class="LazyPoster"][data-item-slug], .film-poster';
const FMP_SKIP = `#${POPOVER_ID}, .lbp-fmp, .lbp-settings-backdrop`;

let settingsRef = null;
let bound = false;
let openTimer = 0;
let closeTimer = 0;
let leaveTimer = 0;
let leaveHandler = null;
let activePoster = null;
let activeSlug = '';
let popoverEl = null;
let fetchSeq = 0;
let inFlightFetches = 0;
const fetchQueue = [];
let preloadObserver = null;
const preloadQueued = new Set();
const profileFetches = new Map();
const enrichFetches = new Map();

function currentSettings() {
  return (
    settingsRef || {
      showFilmMiniProfile: true,
      preloadFilmMiniProfile: false,
      showRottenTomatoes: true,
      showMetacritic: true,
      cacheHours: 24,
    }
  );
}

function enqueueFetch(fn) {
  return new Promise((resolve) => {
    const run = async () => {
      inFlightFetches += 1;
      try {
        resolve(await fn());
      } finally {
        inFlightFetches -= 1;
        const next = fetchQueue.shift();
        if (next) next();
      }
    };
    if (inFlightFetches < FILM_FETCH_CONCURRENCY) run();
    else fetchQueue.push(run);
  });
}

function favicon(domain) {
  return FAVICON_URL.replace('{domain}', encodeURIComponent(domain));
}

function filmUrlForSlug(slug) {
  return `/film/${encodeURIComponent(slug)}/`;
}

export function parsePosterSlug(poster) {
  const roots = [
    poster,
    poster.closest?.('.react-component[data-component-class="LazyPoster"]'),
    poster.closest?.('[data-item-slug], [data-film-slug], [data-item-link]'),
    poster.querySelector?.('[data-item-slug], [data-film-slug], [data-item-link]'),
  ].filter(Boolean);

  for (const root of roots) {
    const slug =
      root.getAttribute?.('data-item-slug') ||
      root.getAttribute?.('data-film-slug') ||
      '';
    if (slug) return slug.trim().toLowerCase();

    const link =
      root.getAttribute?.('data-item-link') ||
      root.getAttribute?.('data-target-link') ||
      '';
    const fromLink = link.match(/\/film\/([^/?#]+)/i);
    if (fromLink) return fromLink[1].toLowerCase();
  }

  const anchor =
    poster.closest?.('a[href*="/film/"]') ||
    poster.querySelector?.('a[href*="/film/"]');
  const href = anchor?.getAttribute?.('href') || '';
  const match = href.match(/\/film\/([^/?#]+)/i);
  return match ? match[1].toLowerCase() : '';
}

export function parsePosterTitle(poster, slug) {
  const roots = [
    poster,
    poster.closest?.('.react-component[data-component-class="LazyPoster"]'),
    poster.querySelector?.('[data-item-name], [data-item-full-display-name]'),
  ].filter(Boolean);

  for (const root of roots) {
    const name =
      root.getAttribute?.('data-item-full-display-name') ||
      root.getAttribute?.('data-item-name') ||
      '';
    if (name) return name.replace(/\s+\(\d{4}\)\s*$/, '').trim() || name.trim();
  }

  const img = poster.querySelector?.('img[alt]');
  if (img?.alt) {
    return img.alt.replace(/\s+\(\d{4}\)\s*$/, '').trim() || img.alt.trim();
  }
  return slug ? slug.replace(/-/g, ' ') : '';
}

function parsePosterYear(poster) {
  const roots = [
    poster,
    poster.closest?.('.react-component[data-component-class="LazyPoster"]'),
    poster.querySelector?.('[data-item-name], [data-item-full-display-name]'),
  ].filter(Boolean);
  for (const root of roots) {
    const name =
      root.getAttribute?.('data-item-full-display-name') ||
      root.getAttribute?.('data-item-name') ||
      '';
    const match = name.match(/\((\d{4})\)\s*$/);
    if (match) return Number(match[1]);
  }
  return null;
}

function posterImgUrl(poster) {
  const img = poster?.querySelector?.('img');
  const src = (
    img?.getAttribute?.('src') ||
    img?.getAttribute?.('data-src') ||
    ''
  ).trim();
  if (!src || /empty-poster/i.test(src)) return '';
  return src;
}

function ensurePopover() {
  if (popoverEl && document.body.contains(popoverEl)) return popoverEl;
  popoverEl = document.createElement('div');
  popoverEl.id = POPOVER_ID;
  popoverEl.className = 'lbp-fmp';
  popoverEl.setAttribute('role', 'dialog');
  popoverEl.setAttribute('aria-hidden', 'true');
  popoverEl.addEventListener('pointerenter', () => {
    window.clearTimeout(closeTimer);
  });
  popoverEl.addEventListener('pointerleave', () => {
    scheduleClose();
  });
  document.body.appendChild(popoverEl);
  return popoverEl;
}

function finishHidePopover() {
  window.clearTimeout(leaveTimer);
  if (popoverEl && leaveHandler) {
    popoverEl.removeEventListener('transitionend', leaveHandler);
    leaveHandler = null;
  }
  if (!popoverEl) return;
  popoverEl.classList.remove('is-open', 'is-leaving', 'is-loading', 'is-ready');
  popoverEl.setAttribute('aria-hidden', 'true');
  popoverEl.innerHTML = '';
  activePoster = null;
  activeSlug = '';
}

function hidePopover({ immediate = false } = {}) {
  if (!popoverEl) return;
  window.clearTimeout(leaveTimer);
  if (leaveHandler) {
    popoverEl.removeEventListener('transitionend', leaveHandler);
    leaveHandler = null;
  }

  const wasOpen = popoverEl.classList.contains('is-open');
  if (immediate || !wasOpen) {
    finishHidePopover();
    return;
  }

  popoverEl.classList.add('is-leaving');
  popoverEl.classList.remove('is-open', 'is-loading', 'is-ready');
  popoverEl.setAttribute('aria-hidden', 'true');

  leaveHandler = (event) => {
    if (event.target !== popoverEl) return;
    if (event.propertyName !== 'opacity' && event.propertyName !== 'transform') {
      return;
    }
    finishHidePopover();
  };
  popoverEl.addEventListener('transitionend', leaveHandler);
  leaveTimer = window.setTimeout(finishHidePopover, FILM_LEAVE_MS);
}

function openPopover(el) {
  window.clearTimeout(leaveTimer);
  if (leaveHandler) {
    el.removeEventListener('transitionend', leaveHandler);
    leaveHandler = null;
  }
  el.classList.remove('is-leaving');
  if (!el.classList.contains('is-open')) {
    void el.offsetWidth;
  }
  el.classList.add('is-open');
  el.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    el.classList.add('is-ready');
  });
}

function positionPopover(anchor) {
  const el = ensurePopover();
  const rect = anchor.getBoundingClientRect();
  const pad = 10;
  const cardW = el.offsetWidth || 312;
  const cardH = el.offsetHeight || 420;
  let left = rect.right + pad;
  let top = rect.top + rect.height / 2 - cardH / 2;

  if (left + cardW > window.innerWidth - 12) {
    left = rect.left - cardW - pad;
  }
  if (left < 12) {
    left = Math.max(
      12,
      Math.min(
        window.innerWidth - cardW - 12,
        rect.left + rect.width / 2 - cardW / 2,
      ),
    );
    top = rect.bottom + pad;
    if (top + cardH > window.innerHeight - 12) {
      top = rect.top - cardH - pad;
    }
  }
  top = Math.max(12, Math.min(window.innerHeight - cardH - 12, top));
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
}

function skelBone(extraClass = '') {
  return `<span class="lbp-fmp__bone ${extraClass}" aria-hidden="true"></span>`;
}

function mcScoreTier(score) {
  if (!Number.isFinite(score)) return '';
  if (score >= 75) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}

function renderHero(ctx) {
  const profile = ctx.profile;
  const title = profile?.title || ctx.titleHint || ctx.slug;
  const year = profile?.year || ctx.yearHint || '';
  const posterUrl = profile?.posterUrl || ctx.posterHint || '';
  const rating = profile?.rating;
  const filmUrl = profile?.filmUrl || filmUrlForSlug(ctx.slug);
  const img = posterUrl
    ? `<img src="${escapeAttr(posterUrl)}" alt="" loading="lazy" decoding="async">`
    : `<span class="lbp-fmp__cover-ph"></span>`;
  const ratingHtml =
    rating != null
      ? `<span class="lbp-fmp__rating" title="${escapeAttr(t('miniFilmRating'))}">${escapeHtml(String(rating))}★</span>`
      : ctx.loadingProfile
        ? skelBone('lbp-fmp__bone--rating')
        : '';
  const yearHtml = year
    ? `<span class="lbp-fmp__year">${escapeHtml(String(year))}</span>`
    : '';

  return `
    <div class="lbp-fmp__hero">
      <a class="lbp-fmp__cover-link" href="${escapeAttr(filmUrl)}">
        <div class="lbp-fmp__cover">${img}</div>
      </a>
      <div class="lbp-fmp__hero-meta">
        <a class="lbp-fmp__title" href="${escapeAttr(filmUrl)}">${escapeHtml(title)}</a>
        <div class="lbp-fmp__sub">
          ${yearHtml}
          ${ratingHtml}
        </div>
      </div>
    </div>
  `;
}

function renderMeta(ctx) {
  const profile = ctx.profile;
  if (!profile && ctx.loadingProfile) {
    return `
      <div class="lbp-fmp__section" aria-hidden="true">
        ${skelBone('lbp-fmp__bone--line')}
        <div class="lbp-fmp__chips">
          ${skelBone('lbp-fmp__bone--chip')}
          ${skelBone('lbp-fmp__bone--chip')}
          ${skelBone('lbp-fmp__bone--chip')}
        </div>
      </div>
    `;
  }
  if (!profile) return '';

  const directors = (profile.directors || [])
    .map((director) => {
      if (director.href) {
        return `<a class="lbp-fmp__director" href="${escapeAttr(director.href)}">${escapeHtml(director.name)}</a>`;
      }
      return `<span class="lbp-fmp__director">${escapeHtml(director.name)}</span>`;
    })
    .join('<span class="lbp-fmp__sep"> · </span>');

  const chips = (profile.genres || [])
    .map((genre) => `<span class="lbp-fmp__chip">${escapeHtml(genre)}</span>`)
    .join('');

  if (!directors && !chips) return '';

  return `
    <div class="lbp-fmp__section">
      ${directors ? `<div class="lbp-fmp__directors">${directors}</div>` : ''}
      ${chips ? `<div class="lbp-fmp__chips">${chips}</div>` : ''}
    </div>
  `;
}

function scoreRowHtml({ href, value, label, modifier }) {
  return `
    <a class="lbp-fmp__score lbp-fmp__score--${escapeAttr(modifier)}" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">
      <span class="lbp-fmp__score-value">${escapeHtml(value)}</span>
      <span class="lbp-fmp__score-label">${escapeHtml(label)}</span>
    </a>
  `;
}

function renderScores(ctx) {
  const settings = currentSettings();
  const wantsRt = settings.showRottenTomatoes !== false;
  const wantsMc = settings.showMetacritic !== false;
  if (!wantsRt && !wantsMc) return '';

  if (ctx.loadingScores && !ctx.rt && !ctx.mc) {
    return `
      <div class="lbp-fmp__section lbp-fmp__scores" aria-busy="true">
        <span class="lbp-fmp__score is-skeleton" aria-hidden="true">
          ${skelBone('lbp-fmp__bone--score')}
          ${skelBone('lbp-fmp__bone--label')}
        </span>
        <span class="lbp-fmp__score is-skeleton" aria-hidden="true">
          ${skelBone('lbp-fmp__bone--score')}
          ${skelBone('lbp-fmp__bone--label')}
        </span>
      </div>
    `;
  }

  const bits = [];
  if (wantsRt && ctx.rt?.criticsScore != null) {
    bits.push(
      scoreRowHtml({
        href: ctx.rt.url || ROTTEN_TOMATOES_ORIGIN,
        value: `${ctx.rt.criticsScore}%`,
        label: ctx.rt.isCertifiedFresh ? t('certifiedFresh') : t('tomatometer'),
        modifier: 'rt',
      }),
    );
  }
  if (wantsMc && ctx.mc?.criticsScore != null) {
    const tier = mcScoreTier(ctx.mc.criticsScore);
    bits.push(
      scoreRowHtml({
        href: ctx.mc.url || METACRITIC_ORIGIN,
        value: String(ctx.mc.criticsScore),
        label: t('metascore'),
        modifier: tier ? `mc-${tier}` : 'mc',
      }),
    );
  }

  if (!bits.length) return '';
  return `<div class="lbp-fmp__section lbp-fmp__scores">${bits.join('')}</div>`;
}

function renderDescription(ctx) {
  const desc = ctx.profile?.description;
  if (!desc && ctx.loadingProfile) {
    return `
      <div class="lbp-fmp__section" aria-hidden="true">
        ${skelBone('lbp-fmp__bone--desc')}
        ${skelBone('lbp-fmp__bone--desc-short')}
      </div>
    `;
  }
  if (!desc) return '';
  return `<p class="lbp-fmp__desc">${escapeHtml(desc)}</p>`;
}

function renderLinks(ctx) {
  const links = [];

  if (ctx.rt?.url) {
    links.push({
      href: ctx.rt.url,
      label: t('rottenTomatoes'),
      icon: favicon('rottentomatoes.com'),
    });
  }
  if (ctx.mc?.url) {
    links.push({
      href: ctx.mc.url,
      label: t('metacritic'),
      icon: favicon('metacritic.com'),
    });
  }

  if (!links.length) return '';

  const linkHtml = links
    .map((link) => {
      const img = link.icon
        ? `<img class="lbp-fmp__link-icon" src="${escapeAttr(link.icon)}" alt="" width="14" height="14" loading="lazy" referrerpolicy="no-referrer">`
        : '';
      return `<a class="lbp-fmp__link" href="${escapeAttr(link.href)}" target="_blank" rel="noopener noreferrer">${img}<span>${escapeHtml(link.label)}</span></a>`;
    })
    .join('');

  return `<div class="lbp-fmp__section lbp-fmp__links">${linkHtml}</div>`;
}

function renderFooter(ctx) {
  const filmUrl = ctx.profile?.filmUrl || filmUrlForSlug(ctx.slug);
  return `
    <footer class="lbp-fmp__footer">
      <a class="lbp-fmp__cta" href="${escapeAttr(filmUrl)}">${escapeHtml(t('miniFilmOpen'))}</a>
    </footer>
  `;
}

const BODY_SECTIONS = [
  { id: 'hero', render: (ctx) => renderHero(ctx) },
  { id: 'meta', render: (ctx) => renderMeta(ctx) },
  { id: 'scores', render: (ctx) => renderScores(ctx) },
  { id: 'description', render: (ctx) => renderDescription(ctx) },
  { id: 'links', render: (ctx) => renderLinks(ctx) },
];

function renderCard(ctx) {
  const parts = [];
  for (const section of BODY_SECTIONS) {
    const html = section.render(ctx);
    if (html) parts.push(html);
  }
  return `
    <div class="lbp-fmp__card">
      <div class="lbp-fmp__body">${parts.join('')}</div>
      ${renderFooter(ctx)}
    </div>
  `;
}

function renderError(slug, titleHint) {
  const filmUrl = filmUrlForSlug(slug);
  return `
    <div class="lbp-fmp__card">
      <div class="lbp-fmp__body">
        <div class="lbp-fmp__hero">
          <div class="lbp-fmp__cover"><span class="lbp-fmp__cover-ph"></span></div>
          <div class="lbp-fmp__hero-meta">
            <div class="lbp-fmp__title">${escapeHtml(titleHint || slug)}</div>
          </div>
        </div>
        <div class="lbp-fmp__status">${escapeHtml(t('miniFilmError'))}</div>
      </div>
      <footer class="lbp-fmp__footer">
        <a class="lbp-fmp__cta" href="${escapeAttr(filmUrl)}">${escapeHtml(t('miniFilmOpen'))}</a>
      </footer>
    </div>
  `;
}

function ensureProfileFetch(slug) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key) return Promise.resolve(null);
  const settings = currentSettings();
  const cached = peekCachedFilmMiniProfile(key, settings.cacheHours);
  if (cached) return Promise.resolve(cached);
  let pending = profileFetches.get(key);
  if (pending) return pending;
  pending = enqueueFetch(() =>
    fetchFilmMiniProfile(key, settings.cacheHours),
  ).finally(() => {
    profileFetches.delete(key);
  });
  profileFetches.set(key, pending);
  return pending;
}

function ensureScoreEnrich({ slug, title, year, tmdbId }) {
  const settings = currentSettings();
  const wantsRt = settings.showRottenTomatoes !== false;
  const wantsMc = settings.showMetacritic !== false;
  if (!wantsRt && !wantsMc) {
    return Promise.resolve({ rt: null, mc: null });
  }

  const mapKey = String(slug || '')
    .trim()
    .toLowerCase();
  if (!mapKey) return Promise.resolve({ rt: null, mc: null });

  let pending = enrichFetches.get(mapKey);
  if (pending) return pending;

  pending = (async () => {
    const filmTitle = String(title || '').trim();
    if (!filmTitle) return { rt: null, mc: null };
    const key = tmdbId ? `tmdb:${tmdbId}` : `slug:${mapKey}`;
    const payload = {
      cacheHours: settings.cacheHours,
      key,
      title: filmTitle,
      year: Number.isFinite(year) ? year : year ? Number(year) : null,
    };

    const [rt, mc] = await Promise.all([
      wantsRt
        ? getRottenTomatoesRating(payload).catch(() => null)
        : Promise.resolve(null),
      wantsMc
        ? getMetacriticRating(payload).catch(() => null)
        : Promise.resolve(null),
    ]);
    return { rt, mc };
  })().finally(() => {
    enrichFetches.delete(mapKey);
  });

  enrichFetches.set(mapKey, pending);
  return pending;
}

function clearPosterMark(poster) {
  if (!poster?.removeAttribute) return;
  poster.removeAttribute(MARK_ATTR);
  poster.removeAttribute(HOVER_ATTR);
  poster.removeAttribute(PRELOAD_ATTR);
}

function isEligiblePoster(poster) {
  if (!poster || poster.nodeType !== 1) return false;
  if (poster.closest(FMP_SKIP)) return false;
  if (poster.closest(FILM_POSTER_SKIP_ANCESTOR)) return false;
  if (
    !poster.matches?.(POSTER_SELECTOR) &&
    !poster.classList?.contains('film-poster')
  ) {
    return false;
  }
  return Boolean(parsePosterSlug(poster));
}

function markPoster(poster) {
  if (!isEligiblePoster(poster)) {
    clearPosterMark(poster);
    return null;
  }
  const slug = parsePosterSlug(poster);
  if (!slug) {
    clearPosterMark(poster);
    return null;
  }
  poster.setAttribute(MARK_ATTR, '1');
  return {
    poster,
    slug,
    title: parsePosterTitle(poster, slug),
    year: parsePosterYear(poster),
    posterHint: posterImgUrl(poster),
  };
}

function clearAllPosterMarks() {
  profileFetches.clear();
  document
    .querySelectorAll(`[${MARK_ATTR}], [${HOVER_ATTR}], [${PRELOAD_ATTR}]`)
    .forEach((el) => clearPosterMark(el));
}

function stopFilmPreload() {
  preloadObserver?.disconnect();
  preloadObserver = null;
}

function preloadSlug(slug) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key) return;
  const settings = currentSettings();
  if (
    peekCachedFilmMiniProfile(key, settings.cacheHours) ||
    preloadQueued.has(key)
  ) {
    return;
  }
  preloadQueued.add(key);
  ensureProfileFetch(key);
}

function ensurePreloadObserver() {
  if (preloadObserver) return preloadObserver;
  preloadObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const poster = entry.target;
        preloadObserver.unobserve(poster);
        const slug = parsePosterSlug(poster);
        if (!slug) continue;
        preloadSlug(slug);
      }
    },
    { rootMargin: FILM_PRELOAD_ROOT_MARGIN, threshold: 0.01 },
  );
  return preloadObserver;
}

function scheduleFilmPreload() {
  const settings = currentSettings();
  if (
    settings.showFilmMiniProfile === false ||
    settings.preloadFilmMiniProfile !== true
  ) {
    stopFilmPreload();
    return;
  }
  const obs = ensurePreloadObserver();
  document.querySelectorAll(`[${MARK_ATTR}]`).forEach((poster) => {
    if (poster.getAttribute(PRELOAD_ATTR) === '1') return;
    const slug = parsePosterSlug(poster);
    if (!slug) return;
    if (peekCachedFilmMiniProfile(slug, settings.cacheHours)) {
      poster.setAttribute(PRELOAD_ATTR, '1');
      return;
    }
    poster.setAttribute(PRELOAD_ATTR, '1');
    obs.observe(poster);
  });
}

function decoratePosters(root = document) {
  if (currentSettings().showFilmMiniProfile === false) {
    clearAllPosterMarks();
    stopFilmPreload();
    return;
  }
  const scope = root.querySelectorAll ? root : document;
  scope.querySelectorAll(POSTER_SELECTOR).forEach((poster) => {
    markPoster(poster);
  });
  scheduleFilmPreload();
}

const decoratePostersSoon = debounce(() => decoratePosters(), 120);

async function paintCard(poster, ctx, { soft = false } = {}) {
  const el = ensurePopover();
  el.classList.toggle('is-loading', Boolean(ctx.loadingProfile && !ctx.profile));
  if (soft) el.classList.remove('is-ready');
  el.innerHTML = renderCard(ctx);
  openPopover(el);
  if (soft) {
    void el.offsetWidth;
    requestAnimationFrame(() => {
      el.classList.add('is-ready');
      positionPopover(poster);
    });
  } else {
    positionPopover(poster);
    requestAnimationFrame(() => positionPopover(poster));
  }
}

async function showForPoster(poster, { slug, title, year, posterHint }) {
  const el = ensurePopover();
  activePoster = poster;
  activeSlug = slug;
  const seq = ++fetchSeq;
  const settings = currentSettings();

  let profile = peekCachedFilmMiniProfile(slug, settings.cacheHours);
  let enrichState = { rt: null, mc: null };
  let scoresDone = false;

  const ctx = (extra = {}) => ({
    slug,
    titleHint: title,
    yearHint: year,
    posterHint,
    profile,
    loadingProfile: !profile,
    loadingScores: !scoresDone,
    ...enrichState,
    ...extra,
  });

  await paintCard(poster, ctx());

  const profilePromise = ensureProfileFetch(slug);
  const enrichPromise = profilePromise.then((loaded) =>
    ensureScoreEnrich({
      slug,
      title: loaded?.title || title,
      year: loaded?.year ? Number(loaded.year) : year,
      tmdbId: loaded?.tmdbId || null,
    }),
  );

  const maybeRepaint = async () => {
    if (seq !== fetchSeq || activeSlug !== slug) return;
    await paintCard(poster, ctx({ loadingProfile: !profile }), { soft: true });
  };

  enrichPromise.then(async (result) => {
    if (seq !== fetchSeq || activeSlug !== slug) return;
    enrichState = result;
    scoresDone = true;
    await maybeRepaint();
  });

  profile = await profilePromise;
  if (seq !== fetchSeq || activeSlug !== slug) return;

  el.classList.remove('is-loading');
  if (!profile) {
    el.classList.remove('is-ready');
    el.innerHTML = renderError(slug, title);
    void el.offsetWidth;
    requestAnimationFrame(() => {
      el.classList.add('is-ready');
      positionPopover(poster);
    });
    const result = await enrichPromise;
    if (seq !== fetchSeq || activeSlug !== slug) return;
    enrichState = result;
    scoresDone = true;
    if (result?.rt || result?.mc) {
      await paintCard(
        poster,
        {
          slug,
          titleHint: title,
          yearHint: year,
          posterHint,
          profile: null,
          loadingProfile: false,
          loadingScores: false,
          ...enrichState,
        },
        { soft: true },
      );
    }
    return;
  }

  await maybeRepaint();
}

function scheduleOpen(poster, hit) {
  window.clearTimeout(closeTimer);
  window.clearTimeout(openTimer);
  if (popoverEl?.classList.contains('is-leaving')) {
    popoverEl.classList.remove('is-leaving');
  }
  openTimer = window.setTimeout(() => {
    showForPoster(poster, hit);
  }, FILM_HOVER_OPEN_MS);
}

function scheduleClose() {
  window.clearTimeout(openTimer);
  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    hidePopover();
  }, FILM_HOVER_CLOSE_MS);
}

function resolvePoster(target) {
  if (!target || target.nodeType !== 1) return null;
  if (target.closest?.(FMP_SKIP)) return null;
  const poster = target.closest?.(POSTER_SELECTOR);
  if (!poster || !isEligiblePoster(poster)) return null;
  return markPoster(poster);
}

function onPointerOver(event) {
  if (currentSettings().showFilmMiniProfile === false) return;
  const hit = resolvePoster(event.target);
  if (!hit) return;
  if (!peekCachedFilmMiniProfile(hit.slug, currentSettings().cacheHours)) {
    ensureProfileFetch(hit.slug);
  }
  if (hit.poster === activePoster && popoverEl?.classList.contains('is-open')) {
    window.clearTimeout(closeTimer);
    return;
  }
  hit.poster.setAttribute(HOVER_ATTR, '1');
  scheduleOpen(hit.poster, hit);
}

function onPointerOut(event) {
  const hit = resolvePoster(event.target);
  if (!hit) return;
  const related = event.relatedTarget;
  if (
    related &&
    (hit.poster.contains(related) || popoverEl?.contains(related))
  ) {
    return;
  }
  hit.poster.removeAttribute(HOVER_ATTR);
  scheduleClose();
}

function onScrollOrResize() {
  if (!popoverEl?.classList.contains('is-open') || !activePoster) return;
  if (!document.contains(activePoster)) {
    hidePopover({ immediate: true });
    return;
  }
  positionPopover(activePoster);
}

export function bindFilmMiniProfiles() {
  if (currentSettings().showFilmMiniProfile === false) {
    hidePopover({ immediate: true });
    clearAllPosterMarks();
    stopFilmPreload();
    return;
  }
  if (bound) return;
  bound = true;
  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointerout', onPointerOut, true);
  window.addEventListener('scroll', onScrollOrResize, true);
  window.addEventListener('resize', onScrollOrResize);
}

export function scheduleFilmMiniProfiles(settings) {
  settingsRef = settings || currentSettings();
  bindFilmMiniProfiles();
  decoratePostersSoon();
}
