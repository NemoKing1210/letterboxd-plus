import { GM_getValue, GM_setValue } from '$';
import {
  CACHE_HOURS_MAX,
  DEFAULT_SETTINGS,
  FMP_OPEN_MODES,
  SETTINGS_KEY,
  TOAST_POSITIONS,
  TRANSLATE_DISPLAY_MODES,
} from './constants.js';
import { SUPPORTED_LOCALES } from '../i18n/meta.js';

function normalizeSettings(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const cacheHours = Number(raw.cacheHours);
  const uiLocale =
    raw.uiLocale === 'auto' || SUPPORTED_LOCALES.includes(raw.uiLocale)
      ? raw.uiLocale
      : DEFAULT_SETTINGS.uiLocale;
  const toastPosition = TOAST_POSITIONS.includes(raw.toastPosition)
    ? raw.toastPosition
    : DEFAULT_SETTINGS.toastPosition;
  const fmpOpenMode = FMP_OPEN_MODES.includes(raw.fmpOpenMode)
    ? raw.fmpOpenMode
    : DEFAULT_SETTINGS.fmpOpenMode;
  const translateTargetLocale =
    raw.translateTargetLocale === 'auto' ||
    SUPPORTED_LOCALES.includes(raw.translateTargetLocale)
      ? raw.translateTargetLocale
      : DEFAULT_SETTINGS.translateTargetLocale;
  const translateDisplayMode = TRANSLATE_DISPLAY_MODES.includes(
    raw.translateDisplayMode,
  )
    ? raw.translateDisplayMode
    : DEFAULT_SETTINGS.translateDisplayMode;

  return {
    uiLocale,
    toastPosition,
    showRottenTomatoes: raw.showRottenTomatoes !== false,
    showAudienceScore: raw.showAudienceScore !== false,
    showMetacritic: raw.showMetacritic !== false,
    showMetacriticUserScore: raw.showMetacriticUserScore !== false,
    enhanceCast: raw.enhanceCast !== false,
    showFilmMiniProfile: raw.showFilmMiniProfile !== false,
    fmpOpenMode,
    preloadFilmMiniProfile: raw.preloadFilmMiniProfile === true,
    fmpShowCommunityRating: raw.fmpShowCommunityRating !== false,
    fmpShowUserStatus: raw.fmpShowUserStatus !== false,
    fmpShowCast: raw.fmpShowCast !== false,
    fmpShowDirectors: raw.fmpShowDirectors !== false,
    fmpShowGenres: raw.fmpShowGenres !== false,
    fmpShowTagline: raw.fmpShowTagline !== false,
    fmpShowRuntime: raw.fmpShowRuntime !== false,
    fmpShowDescription: raw.fmpShowDescription !== false,
    fmpShowStats: raw.fmpShowStats === true,
    fmpShowExternalScores: raw.fmpShowExternalScores !== false,
    fmpShowQuickLinks: raw.fmpShowQuickLinks !== false,
    showTranslate: raw.showTranslate !== false,
    translateTargetLocale,
    translateDisplayMode,
    translateDescription: raw.translateDescription !== false,
    translateReviews: raw.translateReviews !== false,
    translateReviewsAuto: raw.translateReviewsAuto === true,
    cacheHours: Number.isFinite(cacheHours)
      ? Math.max(0, Math.min(CACHE_HOURS_MAX, cacheHours))
      : DEFAULT_SETTINGS.cacheHours,
    cacheFilmMiniProfile: raw.cacheFilmMiniProfile !== false,
    cacheRottenTomatoes: raw.cacheRottenTomatoes !== false,
    cacheMetacritic: raw.cacheMetacritic !== false,
    cacheTranslations: raw.cacheTranslations !== false,
  };
}

export function loadSettings() {
  try {
    return normalizeSettings(GM_getValue(SETTINGS_KEY, DEFAULT_SETTINGS));
  } catch (error) {
    console.warn('[Letterboxd Plus] Failed to load settings.', error);
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(value) {
  const settings = normalizeSettings(value);
  GM_setValue(SETTINGS_KEY, settings);
  return settings;
}

export function resetSettings() {
  return saveSettings({ ...DEFAULT_SETTINGS });
}
