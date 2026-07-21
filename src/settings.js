import { GM_getValue, GM_setValue } from '$';
import { CACHE_HOURS_MAX, DEFAULT_SETTINGS, SETTINGS_KEY } from './constants.js';
import { SUPPORTED_LOCALES } from './i18n/index.js';

function normalizeSettings(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const cacheHours = Number(raw.cacheHours);
  const uiLocale =
    raw.uiLocale === 'auto' || SUPPORTED_LOCALES.includes(raw.uiLocale)
      ? raw.uiLocale
      : DEFAULT_SETTINGS.uiLocale;

  return {
    uiLocale,
    showRottenTomatoes: raw.showRottenTomatoes !== false,
    showAudienceScore: raw.showAudienceScore !== false,
    cacheHours: Number.isFinite(cacheHours)
      ? Math.max(0, Math.min(CACHE_HOURS_MAX, cacheHours))
      : DEFAULT_SETTINGS.cacheHours,
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
