import { GM_registerMenuCommand } from '$';
import './styles/tokens.css';
import { ROOT_ATTR } from './core/constants.js';
import { loadSettings } from './core/settings.js';
import {
  configureToastPosition,
  flushQueuedToasts,
  openSettings,
  pageFeatures,
} from './features/index.js';
import { configureLocale, t } from './i18n/index.js';

const IGNORE_MUTATION_SELECTOR =
  '#lbp-film-mini-profile, .lbp-fmp, .lbp-settings-backdrop, .lbp-toast-host, .lbp-translate-btn, .lbp-translate-result, .lbp-translate-desc-slot, .lbp-translate-review-slot';

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
        node.classList?.contains('lbp-toast') ||
        node.classList?.contains('lbp-translate-btn') ||
        node.classList?.contains('lbp-translate-result') ||
        node.classList?.contains('lbp-translate-desc-slot') ||
        node.classList?.contains('lbp-translate-review-slot'),
    );
  });
}

function scanPage() {
  const settings = loadSettings();
  configureLocale(settings.uiLocale);
  for (const feature of pageFeatures) {
    feature.scan(settings);
  }
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
