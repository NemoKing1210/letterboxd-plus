import { loadSettings } from '../core/settings.js';
import { configureLocale, t } from '../i18n/index.js';
import { ensureEnhancedCast } from './cast/index.js';
import { scheduleFilmMiniProfiles } from './film-mini-profile/index.js';
import { hidePopover } from './film-mini-profile/popover.js';
import {
  ensureAverageRating,
  ensureFilmRating,
  ensureMetacriticRating,
} from './ratings/index.js';
import { configureToastPosition } from './toast/index.js';
import { syncTranslateUi } from './translate/index.js';

function refreshSettingsNav() {
  const link = document.querySelector('#lbp-nav-settings a');
  if (link) link.title = t('openSettingsTitle');
}

/**
 * Apply persisted settings to the live page without a full reload.
 */
export function applyRuntimeSettings(settings) {
  const next = settings || loadSettings();
  configureLocale(next.uiLocale);
  configureToastPosition(next.toastPosition);
  refreshSettingsNav();

  if (next.showFilmMiniProfile === false) {
    hidePopover({ immediate: true });
  }

  ensureEnhancedCast(next);
  scheduleFilmMiniProfiles(next);
  void ensureFilmRating(next);
  void ensureMetacriticRating(next);
  ensureAverageRating();
  syncTranslateUi(next);
}
