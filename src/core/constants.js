import pkg from '../../package.json' with { type: 'json' };

export const SCRIPT_VERSION = pkg.version;
export const ROOT_ATTR = 'data-lbp-root';
export const SETTINGS_KEY = 'lbp_settings';
export const CACHE_PREFIX = 'lbp_rt_v1:';
export const ROTTEN_TOMATOES_ORIGIN = 'https://www.rottentomatoes.com';
export const METACRITIC_ORIGIN = 'https://www.metacritic.com';
export const METACRITIC_API_ORIGIN = 'https://backend.metacritic.com';
export const REQUEST_TIMEOUT_MS = 12_000;
export const CACHE_HOURS_MAX = 168;
export const CACHE_SOFT_LIMIT_BYTES = 5 * 1024 * 1024;
export const FILM_HOVER_OPEN_MS = 280;
export const FILM_HOVER_CLOSE_MS = 180;
export const FILM_LEAVE_MS = 300;
export const FILM_FETCH_CONCURRENCY = 2;
export const FILM_PRELOAD_ROOT_MARGIN = '160px 0px';
export const FILM_POSTER_SKIP_ANCESTOR =
  '#js-poster-col, .modal-dialog, .lbp-settings-backdrop';
export const USER_MINI_SKIP_ANCESTOR =
  '#header, .main-nav, .modal-dialog, .lbp-settings-backdrop, #lbp-film-mini-profile, .lbp-fmp';
export const USER_FETCH_CONCURRENCY = 2;
export const USER_PRELOAD_ROOT_MARGIN = '160px 0px';
export const REPO_URL = 'https://github.com/NemoKing1210/letterboxd-plus';
export const AUTHOR_NAME = 'NemoKing';
export const AUTHOR_HANDLE = 'NemoKing1210';
export const AUTHOR_URL = 'https://github.com/NemoKing1210';
export const AUTHOR_EMAIL = 'nemoking1210@gmail.com';
export const AUTHOR_AVATAR_URL =
  'https://avatars.githubusercontent.com/u/58397369?s=112&v=4';

export const DEFAULT_SETTINGS = Object.freeze({
  uiLocale: 'auto',
  toastPosition: 'top-right',
  showRottenTomatoes: true,
  showAudienceScore: true,
  showMetacritic: true,
  showMetacriticUserScore: true,
  enhanceCast: true,
  enhanceCrew: true,
  showFilmMiniProfile: true,
  fmpOpenMode: 'hover',
  preloadFilmMiniProfile: false,
  fmpShowCommunityRating: true,
  fmpShowUserStatus: true,
  fmpShowCast: true,
  fmpShowDirectors: true,
  fmpShowGenres: true,
  fmpShowTagline: true,
  fmpShowRuntime: true,
  fmpShowDescription: true,
  fmpShowStats: true,
  fmpShowExternalScores: true,
  fmpShowQuickLinks: true,
  showUserMiniProfile: true,
  preloadUserMiniProfile: false,
  umpShowBio: true,
  umpShowStats: true,
  umpShowLocation: true,
  umpShowFavorites: true,
  umpShowRecent: true,
  showTranslate: true,
  translateTargetLocale: 'auto',
  translateDisplayMode: 'replace',
  translateDescription: true,
  translateReviews: true,
  translateReviewsAuto: false,
  translateComments: true,
  cacheHours: 24,
  cacheFilmMiniProfile: true,
  cacheUserMiniProfile: true,
  cacheRottenTomatoes: true,
  cacheMetacritic: true,
  cacheTranslations: true,
});

export const TOAST_POSITIONS = Object.freeze([
  'top-right',
  'top-left',
  'top-center',
  'bottom-right',
  'bottom-left',
  'bottom-center',
]);

export const FMP_OPEN_MODES = Object.freeze(['hover', 'contextmenu']);

export const TRANSLATE_DISPLAY_MODES = Object.freeze(['replace', 'below']);

export const TRANSLATE_REQUEST_TIMEOUT_MS = 20_000;

export const GOOGLE_TRANSLATE_ORIGIN = 'https://translate.googleapis.com';
