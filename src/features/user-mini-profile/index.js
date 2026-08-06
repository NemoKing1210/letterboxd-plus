import './user-mini-profile.css';
import { peekCachedUserMiniProfile } from '../../api/user-profile.js';
import {
  FILM_HOVER_CLOSE_MS,
  FILM_HOVER_OPEN_MS,
} from '../../core/constants.js';
import { debounce } from '../../utils/debounce.js';
import { hidePopover as hideFilmPopover } from '../film-mini-profile/popover.js';
import { HOVER_ATTR, UMP_SKIP } from './constants.js';
import { ensureProfileFetch } from './enrich.js';
import {
  ensurePopover,
  hidePopover,
  openPopover,
  positionPopover,
  setPopoverLeaveHandler,
} from './popover.js';
import { scheduleUserPreload, stopUserPreload } from './preload.js';
import { renderCard, renderError } from './render.js';
import { currentSettings, setSettingsRef, state } from './state.js';
import {
  clearAllTargetMarks,
  decorateTargets,
  resolveTarget,
} from './targets.js';

function decorateSoonRoot(root = document) {
  if (currentSettings().showUserMiniProfile === false) {
    clearAllTargetMarks();
    stopUserPreload();
    return;
  }
  decorateTargets(root);
  scheduleUserPreload();
}

const decorateTargetsSoon = debounce(() => decorateSoonRoot(), 120);

async function paintCard(anchor, ctx, { soft = false } = {}) {
  const el = ensurePopover();
  el.classList.toggle('is-loading', Boolean(ctx.loadingProfile && !ctx.profile));
  if (soft) el.classList.remove('is-ready');
  el.innerHTML = renderCard(ctx);
  openPopover(el);
  if (soft) {
    void el.offsetWidth;
    requestAnimationFrame(() => {
      el.classList.add('is-ready');
      positionPopover(anchor);
    });
  } else {
    positionPopover(anchor);
    requestAnimationFrame(() => positionPopover(anchor));
  }
}

async function showForTarget(anchor, { username, displayNameHint, avatarHint }) {
  hideFilmPopover({ immediate: true });
  const el = ensurePopover();
  state.activeTarget = anchor;
  state.activeUsername = username;
  const seq = ++state.fetchSeq;
  const settings = currentSettings();

  let profile = peekCachedUserMiniProfile(username, settings.cacheHours);

  const ctx = (extra = {}) => ({
    username,
    displayNameHint,
    avatarHint,
    profile,
    loadingProfile: !profile,
    ...extra,
  });

  await paintCard(anchor, ctx());

  const profilePromise = ensureProfileFetch(username);

  const maybeRepaint = async () => {
    if (seq !== state.fetchSeq || state.activeUsername !== username) return;
    await paintCard(anchor, ctx({ loadingProfile: !profile }), { soft: true });
  };

  profile = await profilePromise;
  if (seq !== state.fetchSeq || state.activeUsername !== username) return;

  el.classList.remove('is-loading');
  if (!profile) {
    el.classList.remove('is-ready');
    el.innerHTML = renderError(username, displayNameHint);
    void el.offsetWidth;
    requestAnimationFrame(() => {
      el.classList.add('is-ready');
      positionPopover(anchor);
    });
    return;
  }

  await maybeRepaint();
}

function isContextMenuMode() {
  return currentSettings().fmpOpenMode === 'contextmenu';
}

function scheduleOpen(anchor, hit) {
  window.clearTimeout(state.closeTimer);
  window.clearTimeout(state.openTimer);
  if (state.popoverEl?.classList.contains('is-leaving')) {
    state.popoverEl.classList.remove('is-leaving');
  }
  state.openTimer = window.setTimeout(() => {
    showForTarget(anchor, hit);
  }, FILM_HOVER_OPEN_MS);
}

function scheduleClose() {
  if (isContextMenuMode()) return;
  window.clearTimeout(state.openTimer);
  window.clearTimeout(state.closeTimer);
  state.closeTimer = window.setTimeout(() => {
    hidePopover();
  }, FILM_HOVER_CLOSE_MS);
}

setPopoverLeaveHandler(scheduleClose);

function warmTarget(hit) {
  if (!peekCachedUserMiniProfile(hit.username, currentSettings().cacheHours)) {
    ensureProfileFetch(hit.username);
  }
}

function onPointerOver(event) {
  if (currentSettings().showUserMiniProfile === false) return;
  if (event.target?.closest?.(UMP_SKIP)) return;
  const hit = resolveTarget(event.target);
  if (!hit) return;
  warmTarget(hit);
  if (isContextMenuMode()) return;
  if (
    hit.target === state.activeTarget &&
    state.popoverEl?.classList.contains('is-open')
  ) {
    window.clearTimeout(state.closeTimer);
    return;
  }
  hit.target.setAttribute(HOVER_ATTR, '1');
  scheduleOpen(hit.target, hit);
}

function onPointerOut(event) {
  if (isContextMenuMode()) return;
  const hit = resolveTarget(event.target);
  if (!hit) return;
  const related = event.relatedTarget;
  if (
    related &&
    (hit.target.contains(related) ||
      hit.target === related ||
      state.popoverEl?.contains(related))
  ) {
    return;
  }
  hit.target.removeAttribute(HOVER_ATTR);
  scheduleClose();
}

function onContextMenu(event) {
  if (currentSettings().showUserMiniProfile === false) return;
  if (!isContextMenuMode()) return;
  const hit = resolveTarget(event.target);
  if (!hit) return;
  event.preventDefault();
  event.stopPropagation();
  warmTarget(hit);
  window.clearTimeout(state.openTimer);
  window.clearTimeout(state.closeTimer);
  if (state.popoverEl?.classList.contains('is-leaving')) {
    state.popoverEl.classList.remove('is-leaving');
  }
  if (state.activeTarget && state.activeTarget !== hit.target) {
    state.activeTarget.removeAttribute(HOVER_ATTR);
  }
  hit.target.setAttribute(HOVER_ATTR, '1');
  if (
    hit.target === state.activeTarget &&
    state.popoverEl?.classList.contains('is-open')
  ) {
    return;
  }
  showForTarget(hit.target, hit);
}

function onDocumentPointerDown(event) {
  if (!isContextMenuMode()) return;
  if (!state.popoverEl?.classList.contains('is-open')) return;
  if (state.popoverEl.contains(event.target)) return;
  if (event.button === 2 && resolveTarget(event.target)) return;
  hidePopover();
}

function onDocumentKeydown(event) {
  if (!isContextMenuMode()) return;
  if (event.key !== 'Escape') return;
  if (!state.popoverEl?.classList.contains('is-open')) return;
  event.preventDefault();
  hidePopover();
}

function onScrollOrResize() {
  if (!state.popoverEl?.classList.contains('is-open') || !state.activeTarget) {
    return;
  }
  if (!document.contains(state.activeTarget)) {
    hidePopover({ immediate: true });
    return;
  }
  positionPopover(state.activeTarget);
}

function bindUserMiniProfiles() {
  if (currentSettings().showUserMiniProfile === false) {
    hidePopover({ immediate: true });
    clearAllTargetMarks();
    stopUserPreload();
    return;
  }
  if (state.bound) return;
  state.bound = true;
  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointerout', onPointerOut, true);
  document.addEventListener('contextmenu', onContextMenu, true);
  document.addEventListener('pointerdown', onDocumentPointerDown, true);
  document.addEventListener('keydown', onDocumentKeydown, true);
  window.addEventListener('scroll', onScrollOrResize, true);
  window.addEventListener('resize', onScrollOrResize);
}

export function scheduleUserMiniProfiles(settings) {
  setSettingsRef(settings || currentSettings());
  bindUserMiniProfiles();
  decorateTargetsSoon();
}
