const DEFAULT_SETTINGS_FALLBACK = {
  showUserMiniProfile: true,
  fmpOpenMode: 'hover',
  preloadUserMiniProfile: false,
  umpShowBio: true,
  umpShowStats: true,
  umpShowLocation: true,
  umpShowFavorites: true,
  umpShowRecent: true,
  umpShowLevels: true,
  cacheHours: 24,
  cacheUserMiniProfile: true,
};

export const state = {
  settingsRef: null,
  bound: false,
  openTimer: 0,
  closeTimer: 0,
  leaveTimer: 0,
  leaveHandler: null,
  activeTarget: null,
  activeUsername: '',
  popoverEl: null,
  fetchSeq: 0,
  inFlightFetches: 0,
  fetchQueue: [],
  preloadObserver: null,
  preloadQueued: new Set(),
  profileFetches: new Map(),
};

export function currentSettings() {
  return state.settingsRef || DEFAULT_SETTINGS_FALLBACK;
}

export function setSettingsRef(settings) {
  state.settingsRef = settings || currentSettings();
}
