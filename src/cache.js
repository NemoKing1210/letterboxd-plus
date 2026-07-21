import {
  GM_deleteValue,
  GM_getValue,
  GM_listValues,
  GM_setValue,
} from '$';
import { CACHE_PREFIX, CACHE_SOFT_LIMIT_BYTES } from './constants.js';

function storageKey(key) {
  return `${CACHE_PREFIX}${key}`;
}

function cacheKeys() {
  try {
    return GM_listValues().filter((key) => key.startsWith(CACHE_PREFIX));
  } catch (error) {
    console.warn('[Letterboxd Plus] Failed to list cache entries.', error);
    return [];
  }
}

function entryBytes(key, entry) {
  try {
    return new TextEncoder().encode(JSON.stringify({ [key]: entry })).byteLength;
  } catch {
    return 0;
  }
}

export function readCache(key, maxAgeMs) {
  if (maxAgeMs <= 0) return null;
  const keyInStorage = storageKey(key);
  try {
    const cached = GM_getValue(keyInStorage, null);
    if (!cached) return null;
    if (Date.now() - Number(cached.savedAt || 0) > maxAgeMs) {
      GM_deleteValue(keyInStorage);
      return null;
    }
    return cached.value || null;
  } catch {
    return null;
  }
}

export function writeCache(key, value) {
  try {
    GM_setValue(storageKey(key), { savedAt: Date.now(), value });
  } catch (error) {
    console.warn('[Letterboxd Plus] Failed to cache Rotten Tomatoes rating.', error);
  }
}

export function getCacheStats(cacheHours) {
  const maxAgeMs = Math.max(0, Number(cacheHours) || 0) * 60 * 60 * 1000;
  const now = Date.now();
  let activeCount = 0;
  let activeBytes = 0;
  let expiredCount = 0;
  let expiredBytes = 0;

  for (const key of cacheKeys()) {
    try {
      const entry = GM_getValue(key, null);
      const bytes = entryBytes(key, entry);
      const isExpired =
        maxAgeMs <= 0 || !entry || now - Number(entry.savedAt || 0) > maxAgeMs;
      if (isExpired) {
        expiredCount += 1;
        expiredBytes += bytes;
      } else {
        activeCount += 1;
        activeBytes += bytes;
      }
    } catch (error) {
      console.warn('[Letterboxd Plus] Failed to inspect cache entry.', {
        key,
        error,
      });
    }
  }

  const usedBytes = activeBytes + expiredBytes;
  return {
    activeCount,
    activeBytes,
    expiredCount,
    expiredBytes,
    totalCount: activeCount + expiredCount,
    usedBytes,
    limitBytes: CACHE_SOFT_LIMIT_BYTES,
    fillPercent: Math.min(
      100,
      Math.round((usedBytes / CACHE_SOFT_LIMIT_BYTES) * 100),
    ),
  };
}

export function clearCache() {
  const keys = cacheKeys();
  for (const key of keys) {
    try {
      GM_deleteValue(key);
    } catch (error) {
      console.warn('[Letterboxd Plus] Failed to delete cache entry.', {
        key,
        error,
      });
    }
  }
  return keys.length;
}

export function formatCacheBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
