import { peekCachedFilmMiniProfile } from '../../api/film-profile.js';
import { FILM_PRELOAD_ROOT_MARGIN } from '../../core/constants.js';
import { MARK_ATTR, PRELOAD_ATTR } from './constants.js';
import { ensureProfileFetch } from './enrich.js';
import { parsePosterSlug } from './posters.js';
import { currentSettings, state } from './state.js';

export function stopFilmPreload() {
  state.preloadObserver?.disconnect();
  state.preloadObserver = null;
}

function preloadSlug(slug) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key) return;
  const settings = currentSettings();
  if (
    peekCachedFilmMiniProfile(key, settings.cacheHours) ||
    state.preloadQueued.has(key)
  ) {
    return;
  }
  state.preloadQueued.add(key);
  ensureProfileFetch(key);
}

function ensurePreloadObserver() {
  if (state.preloadObserver) return state.preloadObserver;
  state.preloadObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const poster = entry.target;
        state.preloadObserver.unobserve(poster);
        const slug = parsePosterSlug(poster);
        if (!slug) continue;
        preloadSlug(slug);
      }
    },
    { rootMargin: FILM_PRELOAD_ROOT_MARGIN, threshold: 0.01 },
  );
  return state.preloadObserver;
}

export function scheduleFilmPreload() {
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
