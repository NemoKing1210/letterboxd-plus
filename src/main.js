import { GM_registerMenuCommand } from '$';
import './styles/main.css';
import './styles/film-mini-profile.css';
import { ROOT_ATTR } from './constants.js';
import { ensureAverageRating } from './features/average-rating.js';
import { ensureEnhancedCast } from './features/enhanced-cast.js';
import { ensureFilmRating } from './features/film-rating.js';
import { scheduleFilmMiniProfiles } from './features/film-mini-profile.js';
import { ensureMetacriticRating } from './features/metacritic-rating.js';
import {
  ensureSettingsButton,
  openSettings,
} from './features/settings-panel.js';
import { flushQueuedToasts, configureToastPosition } from './features/toast.js';
import { configureLocale, t } from './i18n/index.js';
import { loadSettings } from './settings.js';

const IGNORE_MUTATION_SELECTOR =
  '#lbp-film-mini-profile, .lbp-fmp, .lbp-settings-backdrop, .lbp-toast-host';

let scanTimer = 0;

function shouldIgnoreMutation(mutation) {
  const nodes = [
    mutation.target,
    ...mutation.addedNodes,
    ...mutation.removedNodes,
  ];
  return nodes.some((node) => {
    if (!node || node.nodeType !== 1) {
      return node?.parentElement?.closest?.(IGNORE_MUTATION_SELECTOR);
    }
    return Boolean(
      node.closest?.(IGNORE_MUTATION_SELECTOR) ||
        node.id === 'lbp-film-mini-profile' ||
        node.classList?.contains('lbp-fmp') ||
        node.classList?.contains('lbp-settings-backdrop') ||
        node.classList?.contains('lbp-toast-host') ||
        node.classList?.contains('lbp-toast'),
    );
  });
}

function scanPage() {
  const settings = loadSettings();
  configureLocale(settings.uiLocale);
  ensureSettingsButton();
  ensureEnhancedCast(settings);
  scheduleFilmMiniProfiles(settings);
  void ensureFilmRating(settings);
  void ensureMetacriticRating(settings);
  ensureAverageRating();
}

function scheduleScan(mutations) {
  if (
    Array.isArray(mutations) &&
    mutations.length > 0 &&
    mutations.every(shouldIgnoreMutation)
  ) {
    return;
  }
  window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(scanPage, 180);
}

function init() {
  if (document.documentElement.hasAttribute(ROOT_ATTR)) return;
  document.documentElement.setAttribute(ROOT_ATTR, '1');

  const settings = loadSettings();
  configureLocale(settings.uiLocale);
  configureToastPosition(settings.toastPosition);
  flushQueuedToasts();

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand(t('menuSettings'), openSettings);
  }

  scanPage();
  new MutationObserver(scheduleScan).observe(document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
