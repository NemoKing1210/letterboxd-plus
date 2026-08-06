import './toast.css';
import { DEFAULT_SETTINGS, TOAST_POSITIONS } from '../../core/constants.js';
import { t } from '../../i18n/index.js';
import { loadSettings } from '../../core/settings.js';

const HOST_CLASS = 'lbp-toast-host';
const QUEUE_KEY = 'lbp_pending_toasts';
const MAX_QUEUED = 3;
const DEFAULT_DURATION = 4500;
const LEAVE_MS = 200;

let nextId = 1;
const activeToasts = new Map();
let escapeBound = false;
let currentPosition = DEFAULT_SETTINGS.toastPosition;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function normalizePosition(position) {
  return TOAST_POSITIONS.includes(position)
    ? position
    : DEFAULT_SETTINGS.toastPosition;
}

function isTopPosition(position) {
  return String(position).startsWith('top-');
}

function ensureHost() {
  let host = document.querySelector(`.${HOST_CLASS}`);
  if (!host) {
    host = document.createElement('div');
    host.className = HOST_CLASS;
    host.setAttribute('aria-live', 'polite');
    host.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(host);
  }
  applyHostPosition(host, currentPosition);
  return host;
}

function applyHostPosition(host, position) {
  const next = normalizePosition(position);
  currentPosition = next;
  host.dataset.position = next;
}

/**
 * @param {string} [position]
 */
export function configureToastPosition(position) {
  currentPosition = normalizePosition(position);
  const host = document.querySelector(`.${HOST_CLASS}`);
  if (host) applyHostPosition(host, currentPosition);
}

function readQueue() {
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items) {
  try {
    if (!items.length) {
      sessionStorage.removeItem(QUEUE_KEY);
      return;
    }
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUED)));
  } catch (error) {
    console.warn('[Letterboxd Plus] Failed to persist toast queue.', error);
  }
}

function clearTimer(entry) {
  if (entry.timer) {
    window.clearTimeout(entry.timer);
    entry.timer = 0;
  }
}

function setProgressPaused(entry, paused) {
  const progress = entry.progressEl;
  if (!progress) return;
  progress.style.animationPlayState = paused ? 'paused' : 'running';
}

function scheduleHide(entry) {
  clearTimer(entry);
  if (!entry.duration || entry.paused) return;
  entry.timer = window.setTimeout(() => {
    dismissToast(entry.id);
  }, entry.remaining);
  entry.startedAt = Date.now();
  setProgressPaused(entry, false);
}

function pauseTimer(entry) {
  if (!entry.duration || entry.paused) return;
  entry.paused = true;
  if (entry.timer) {
    entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.startedAt));
    clearTimer(entry);
  }
  setProgressPaused(entry, true);
}

function resumeTimer(entry) {
  if (!entry.duration || !entry.paused) return;
  entry.paused = false;
  scheduleHide(entry);
}

function bindEscape() {
  if (escapeBound) return;
  escapeBound = true;
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape') return;
      if (document.querySelector('.lbp-settings-backdrop')) return;
      const top = [...activeToasts.keys()].at(-1);
      if (top == null) return;
      event.preventDefault();
      dismissToast(top);
    },
    true,
  );
}

function removeToastElement(entry) {
  clearTimer(entry);
  activeToasts.delete(entry.id);
  const { el } = entry;
  if (!el.isConnected) return;

  if (prefersReducedMotion()) {
    el.remove();
    return;
  }

  el.classList.remove('is-open');
  el.classList.add('is-leaving');
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    el.remove();
  };
  el.addEventListener('transitionend', (event) => {
    if (event.target === el && event.propertyName === 'opacity') settle();
  });
  window.setTimeout(settle, LEAVE_MS);
}

/**
 * @param {{
 *   title: string,
 *   message?: string,
 *   duration?: number,
 *   onClick?: () => void,
 *   action?: { label: string, onClick: () => void },
 * }} options
 * @returns {number} toast id
 */
export function showToast(options = {}) {
  const title = String(options.title ?? '').trim();
  if (!title) return 0;

  const message =
    options.message == null || options.message === ''
      ? ''
      : String(options.message);
  const duration =
    options.duration === 0
      ? 0
      : Math.max(0, Number(options.duration) || DEFAULT_DURATION);
  const onClick = typeof options.onClick === 'function' ? options.onClick : null;
  const action =
    options.action &&
    typeof options.action.label === 'string' &&
    typeof options.action.onClick === 'function'
      ? options.action
      : null;

  const id = nextId++;
  const host = ensureHost();
  bindEscape();

  const el = document.createElement('div');
  el.className = 'lbp-toast';
  el.dataset.toastId = String(id);
  el.setAttribute('role', 'status');

  const body = document.createElement('div');
  body.className = 'lbp-toast__body';

  const titleEl = document.createElement('strong');
  titleEl.className = 'lbp-toast__title';
  titleEl.textContent = title;
  body.appendChild(titleEl);

  if (message) {
    const messageEl = document.createElement('p');
    messageEl.className = 'lbp-toast__message';
    messageEl.textContent = message;
    body.appendChild(messageEl);
  }

  if (action) {
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'lbp-toast__action';
    actionBtn.textContent = action.label;
    actionBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      action.onClick();
      dismissToast(id);
    });
    body.appendChild(actionBtn);
  }

  el.appendChild(body);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'lbp-toast__close';
  closeBtn.setAttribute('aria-label', t('dismissToast'));
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    dismissToast(id);
  });
  el.appendChild(closeBtn);

  let progressEl = null;
  if (duration > 0) {
    progressEl = document.createElement('span');
    progressEl.className = 'lbp-toast__progress';
    progressEl.setAttribute('aria-hidden', 'true');
    progressEl.style.setProperty('--lbp-toast-ms', `${duration}ms`);
    el.appendChild(progressEl);
  }

  if (onClick) {
    el.classList.add('is-clickable');
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    const activate = () => {
      onClick();
      dismissToast(id);
    };
    el.addEventListener('click', (event) => {
      if (event.target.closest('.lbp-toast__close, .lbp-toast__action')) return;
      activate();
    });
    el.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      activate();
    });
  }

  const entry = {
    id,
    el,
    progressEl,
    duration,
    remaining: duration,
    startedAt: 0,
    timer: 0,
    paused: false,
  };

  el.addEventListener('mouseenter', () => pauseTimer(entry));
  el.addEventListener('mouseleave', () => resumeTimer(entry));
  el.addEventListener('focusin', () => pauseTimer(entry));
  el.addEventListener('focusout', () => {
    if (!el.contains(document.activeElement)) resumeTimer(entry);
  });

  activeToasts.set(id, entry);
  if (isTopPosition(currentPosition)) {
    host.prepend(el);
  } else {
    host.appendChild(el);
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.add('is-open');
      scheduleHide(entry);
    });
  });

  return id;
}

export function dismissToast(id) {
  const entry = activeToasts.get(id);
  if (!entry) return;
  removeToastElement(entry);
}

export function dismissAllToasts() {
  for (const id of [...activeToasts.keys()]) {
    dismissToast(id);
  }
}

/**
 * Queue a serializable toast for the next page load (e.g. after settings reload).
 * @param {{ title: string, message?: string, duration?: number }} toast
 */
export function queueToast(toast) {
  const title = String(toast?.title ?? '').trim();
  if (!title) return;
  const payload = { title };
  if (toast.message != null && toast.message !== '') {
    payload.message = String(toast.message);
  }
  if (toast.duration === 0) {
    payload.duration = 0;
  } else if (Number.isFinite(Number(toast.duration)) && Number(toast.duration) > 0) {
    payload.duration = Number(toast.duration);
  }
  writeQueue([...readQueue(), payload]);
}

export function flushQueuedToasts() {
  configureToastPosition(loadSettings().toastPosition);
  const queued = readQueue();
  writeQueue([]);
  for (const item of queued) {
    showToast(item);
  }
}
