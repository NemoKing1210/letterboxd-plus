import { GM_registerMenuCommand } from '$';
import './styles/main.css';
import { ROOT_ATTR } from './constants.js';
import { ensureFilmRating } from './features/film-rating.js';
import {
  ensureSettingsButton,
  openSettings,
} from './features/settings-panel.js';
import { configureLocale, t } from './i18n/index.js';
import { loadSettings } from './settings.js';

let scanTimer = 0;

function scanPage() {
  const settings = loadSettings();
  configureLocale(settings.uiLocale);
  ensureSettingsButton();
  void ensureFilmRating(settings);
}

function scheduleScan() {
  window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(scanPage, 180);
}

function init() {
  if (document.documentElement.hasAttribute(ROOT_ATTR)) return;
  document.documentElement.setAttribute(ROOT_ATTR, '1');

  const settings = loadSettings();
  configureLocale(settings.uiLocale);

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
