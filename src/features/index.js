import { ensureEnhancedCast } from './cast/index.js';
import { scheduleFilmMiniProfiles } from './film-mini-profile/index.js';
import {
  ensureAverageRating,
  ensureFilmRating,
  ensureMetacriticRating,
} from './ratings/index.js';
import { ensureSettingsButton } from './settings/index.js';
import { syncTranslateUi } from './translate/index.js';

export { openSettings } from './settings/index.js';
export {
  configureToastPosition,
  flushQueuedToasts,
} from './toast/index.js';

/** Page-scan hooks invoked on init and MutationObserver rescans. */
export const pageFeatures = [
  { scan: () => ensureSettingsButton() },
  { scan: (settings) => ensureEnhancedCast(settings) },
  { scan: (settings) => scheduleFilmMiniProfiles(settings) },
  { scan: (settings) => void ensureFilmRating(settings) },
  { scan: (settings) => void ensureMetacriticRating(settings) },
  { scan: () => ensureAverageRating() },
  { scan: (settings) => syncTranslateUi(settings) },
];
