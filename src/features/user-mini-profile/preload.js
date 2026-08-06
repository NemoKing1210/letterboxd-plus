import { peekCachedUserMiniProfile } from '../../api/user-profile.js';
import { USER_PRELOAD_ROOT_MARGIN } from '../../core/constants.js';
import {
  usernameFromDataAttrs,
  usernameFromProfileHref,
} from '../../utils/letterboxd-username.js';
import { MARK_ATTR, PRELOAD_ATTR } from './constants.js';
import { ensureProfileFetch } from './enrich.js';
import { currentSettings, state } from './state.js';

export function stopUserPreload() {
  state.preloadObserver?.disconnect();
  state.preloadObserver = null;
}

function resolveMarkedUsername(el) {
  return (
    usernameFromProfileHref(el.getAttribute('href') || '') ||
    usernameFromDataAttrs(el)
  );
}

function preloadUsername(username) {
  const key = String(username || '')
    .trim()
    .toLowerCase();
  if (!key) return;
  const settings = currentSettings();
  if (
    peekCachedUserMiniProfile(key, settings.cacheHours) ||
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
        const el = entry.target;
        state.preloadObserver.unobserve(el);
        const username = resolveMarkedUsername(el);
        if (!username) continue;
        preloadUsername(username);
      }
    },
    { rootMargin: USER_PRELOAD_ROOT_MARGIN, threshold: 0.01 },
  );
  return state.preloadObserver;
}

export function scheduleUserPreload() {
  const settings = currentSettings();
  if (
    settings.showUserMiniProfile === false ||
    settings.preloadUserMiniProfile !== true
  ) {
    stopUserPreload();
    return;
  }
  const obs = ensurePreloadObserver();
  document.querySelectorAll(`[${MARK_ATTR}]`).forEach((el) => {
    if (el.getAttribute(PRELOAD_ATTR) === '1') return;
    const username = resolveMarkedUsername(el);
    if (!username) return;
    if (peekCachedUserMiniProfile(username, settings.cacheHours)) {
      el.setAttribute(PRELOAD_ATTR, '1');
      return;
    }
    el.setAttribute(PRELOAD_ATTR, '1');
    obs.observe(el);
  });
}
