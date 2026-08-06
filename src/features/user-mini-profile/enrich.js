import {
  fetchUserMiniProfile,
  peekCachedUserMiniProfile,
} from '../../api/user-profile.js';
import { enqueueFetch } from './fetch-queue.js';
import { currentSettings, state } from './state.js';

export function ensureProfileFetch(username) {
  const key = String(username || '')
    .trim()
    .toLowerCase();
  if (!key) return Promise.resolve(null);
  const settings = currentSettings();
  const persistCache = settings.cacheUserMiniProfile !== false;
  if (persistCache) {
    const cached = peekCachedUserMiniProfile(key, settings.cacheHours);
    if (cached) return Promise.resolve(cached);
  }
  let pending = state.profileFetches.get(key);
  if (pending) return pending;
  pending = enqueueFetch(() =>
    fetchUserMiniProfile(key, settings.cacheHours, { persistCache }),
  ).finally(() => {
    state.profileFetches.delete(key);
  });
  state.profileFetches.set(key, pending);
  return pending;
}
