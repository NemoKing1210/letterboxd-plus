import './film-mini-profile.css';
import { peekCachedFilmMiniProfile } from '../../api/film-profile.js';
import {
  FILM_HOVER_CLOSE_MS,
  FILM_HOVER_OPEN_MS,
} from '../../core/constants.js';
import { debounce } from '../../utils/debounce.js';
import {
  FMP_SKIP,
  HOVER_ATTR,
  POSTER_SELECTOR,
} from './constants.js';
import { ensureProfileFetch, ensureScoreEnrich } from './enrich.js';
import {
  ensurePopover,
  hidePopover,
  openPopover,
  positionPopover,
  setPopoverLeaveHandler,
} from './popover.js';
import {
  clearAllPosterMarks,
  isEligiblePoster,
  markPoster,
} from './posters.js';
import { scheduleFilmPreload, stopFilmPreload } from './preload.js';
import { renderCard, renderError } from './render.js';
import { currentSettings, setSettingsRef, state } from './state.js';

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
  state.activePoster = poster;
  state.activeSlug = slug;
  const seq = ++state.fetchSeq;
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
    if (seq !== state.fetchSeq || state.activeSlug !== slug) return;
    await paintCard(poster, ctx({ loadingProfile: !profile }), { soft: true });
  };

  enrichPromise.then(async (result) => {
    if (seq !== state.fetchSeq || state.activeSlug !== slug) return;
    enrichState = result;
    scoresDone = true;
    await maybeRepaint();
  });

  profile = await profilePromise;
  if (seq !== state.fetchSeq || state.activeSlug !== slug) return;

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
    if (seq !== state.fetchSeq || state.activeSlug !== slug) return;
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
  window.clearTimeout(state.closeTimer);
  window.clearTimeout(state.openTimer);
  if (state.popoverEl?.classList.contains('is-leaving')) {
    state.popoverEl.classList.remove('is-leaving');
  }
  state.openTimer = window.setTimeout(() => {
    showForPoster(poster, hit);
  }, FILM_HOVER_OPEN_MS);
}

function scheduleClose() {
  window.clearTimeout(state.openTimer);
  window.clearTimeout(state.closeTimer);
  state.closeTimer = window.setTimeout(() => {
    hidePopover();
  }, FILM_HOVER_CLOSE_MS);
}

setPopoverLeaveHandler(scheduleClose);

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
  if (
    hit.poster === state.activePoster &&
    state.popoverEl?.classList.contains('is-open')
  ) {
    window.clearTimeout(state.closeTimer);
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
    (hit.poster.contains(related) || state.popoverEl?.contains(related))
  ) {
    return;
  }
  hit.poster.removeAttribute(HOVER_ATTR);
  scheduleClose();
}

function onScrollOrResize() {
  if (!state.popoverEl?.classList.contains('is-open') || !state.activePoster) {
    return;
  }
  if (!document.contains(state.activePoster)) {
    hidePopover({ immediate: true });
    return;
  }
  positionPopover(state.activePoster);
}

function bindFilmMiniProfiles() {
  if (currentSettings().showFilmMiniProfile === false) {
    hidePopover({ immediate: true });
    clearAllPosterMarks();
    stopFilmPreload();
    return;
  }
  if (state.bound) return;
  state.bound = true;
  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointerout', onPointerOut, true);
  window.addEventListener('scroll', onScrollOrResize, true);
  window.addEventListener('resize', onScrollOrResize);
}

export function scheduleFilmMiniProfiles(settings) {
  setSettingsRef(settings || currentSettings());
  bindFilmMiniProfiles();
  decoratePostersSoon();
}
