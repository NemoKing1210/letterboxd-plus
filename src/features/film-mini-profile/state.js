const DEFAULT_SETTINGS_FALLBACK = {
  showFilmMiniProfile: true,
  preloadFilmMiniProfile: false,
  showRottenTomatoes: true,
  showMetacritic: true,
  cacheHours: 24,
};

export const state = {
  settingsRef: null,
  bound: false,
  openTimer: 0,
  closeTimer: 0,
  leaveTimer: 0,
  leaveHandler: null,
  activePoster: null,
  activeSlug: '',
  popoverEl: null,
  fetchSeq: 0,
  inFlightFetches: 0,
  fetchQueue: [],
  preloadObserver: null,
  preloadQueued: new Set(),
  profileFetches: new Map(),
  enrichFetches: new Map(),
};

export function currentSettings() {
  return state.settingsRef || DEFAULT_SETTINGS_FALLBACK;
}

export function setSettingsRef(settings) {
  state.settingsRef = settings || currentSettings();
}
