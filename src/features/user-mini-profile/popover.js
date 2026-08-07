import { FILM_LEAVE_MS } from '../../core/constants.js';
import { HOVER_ATTR, POPOVER_ID } from './constants.js';
import { state } from './state.js';
import { isOpenFromUserCard as isFilmOpenFromUserCard } from '../film-mini-profile/popover.js';

/** @type {(() => void) | null} */
let onPopoverLeave = null;

export function setPopoverLeaveHandler(handler) {
  onPopoverLeave = handler;
}

/** Cancel a pending hover-close without hiding the card. */
export function cancelCloseTimer() {
  window.clearTimeout(state.closeTimer);
  window.clearTimeout(state.openTimer);
}

/** Schedule close via the leave handler (hover mode). */
export function requestClose() {
  onPopoverLeave?.();
}

/**
 * Close only if the pointer is not currently over the user card.
 * Used after a nested film card closes into empty space.
 */
export function requestCloseIfIdle() {
  const el = state.popoverEl;
  if (!el?.classList.contains('is-open')) return;
  if (el.matches?.(':hover')) {
    cancelCloseTimer();
    return;
  }
  onPopoverLeave?.();
}

export function ensurePopover() {
  if (state.popoverEl && document.body.contains(state.popoverEl)) {
    return state.popoverEl;
  }
  state.popoverEl = document.createElement('div');
  state.popoverEl.id = POPOVER_ID;
  state.popoverEl.className = 'lbp-ump';
  state.popoverEl.setAttribute('role', 'dialog');
  state.popoverEl.setAttribute('aria-hidden', 'true');
  state.popoverEl.addEventListener('pointerenter', () => {
    window.clearTimeout(state.closeTimer);
  });
  state.popoverEl.addEventListener('pointerleave', (event) => {
    const related = event.relatedTarget;
    const fmp = document.getElementById('lbp-film-mini-profile');
    if (related && fmp?.contains?.(related)) {
      window.clearTimeout(state.closeTimer);
      return;
    }
    if (isFilmOpenFromUserCard()) {
      window.clearTimeout(state.closeTimer);
      return;
    }
    onPopoverLeave?.();
  });
  document.body.appendChild(state.popoverEl);
  return state.popoverEl;
}

function finishHidePopover() {
  window.clearTimeout(state.leaveTimer);
  if (state.popoverEl && state.leaveHandler) {
    state.popoverEl.removeEventListener('transitionend', state.leaveHandler);
    state.leaveHandler = null;
  }
  if (!state.popoverEl) return;
  state.popoverEl.classList.remove(
    'is-open',
    'is-leaving',
    'is-loading',
    'is-ready',
  );
  state.popoverEl.setAttribute('aria-hidden', 'true');
  state.popoverEl.innerHTML = '';
  state.activeTarget?.removeAttribute?.(HOVER_ATTR);
  state.activeTarget = null;
  state.activeUsername = '';
}

export function hidePopover({ immediate = false } = {}) {
  if (!state.popoverEl) return;
  window.clearTimeout(state.leaveTimer);
  if (state.leaveHandler) {
    state.popoverEl.removeEventListener('transitionend', state.leaveHandler);
    state.leaveHandler = null;
  }

  const wasOpen = state.popoverEl.classList.contains('is-open');
  if (immediate || !wasOpen) {
    finishHidePopover();
    return;
  }

  state.popoverEl.classList.add('is-leaving');
  state.popoverEl.classList.remove('is-open', 'is-loading', 'is-ready');
  state.popoverEl.setAttribute('aria-hidden', 'true');

  state.leaveHandler = (event) => {
    if (event.target !== state.popoverEl) return;
    if (event.propertyName !== 'opacity' && event.propertyName !== 'transform') {
      return;
    }
    finishHidePopover();
  };
  state.popoverEl.addEventListener('transitionend', state.leaveHandler);
  state.leaveTimer = window.setTimeout(finishHidePopover, FILM_LEAVE_MS);
}

export function openPopover(el) {
  window.clearTimeout(state.leaveTimer);
  if (state.leaveHandler) {
    el.removeEventListener('transitionend', state.leaveHandler);
    state.leaveHandler = null;
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

export function positionPopover(anchor) {
  const el = ensurePopover();
  const rect = anchor.getBoundingClientRect();
  const pad = 10;
  const cardW = el.offsetWidth || 340;
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
