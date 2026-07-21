import pkg from '../package.json' with { type: 'json' };

export const SCRIPT_VERSION = pkg.version;
export const ROOT_ATTR = 'data-lbp-root';
export const SETTINGS_KEY = 'lbp_settings';
export const CACHE_PREFIX = 'lbp_rt_v1:';
export const ROTTEN_TOMATOES_ORIGIN = 'https://www.rottentomatoes.com';
export const REQUEST_TIMEOUT_MS = 12_000;
export const CACHE_HOURS_MAX = 168;
export const CACHE_SOFT_LIMIT_BYTES = 5 * 1024 * 1024;

export const DEFAULT_SETTINGS = Object.freeze({
  uiLocale: 'auto',
  showRottenTomatoes: true,
  showAudienceScore: true,
  cacheHours: 24,
});
