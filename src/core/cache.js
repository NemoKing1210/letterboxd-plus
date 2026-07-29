import {
  GM_deleteValue,
  GM_getValue,
  GM_listValues,
  GM_setValue,
} from '$';
import { CACHE_PREFIX, CACHE_SOFT_LIMIT_BYTES } from './constants.js';

export const CACHE_TYPES = Object.freeze(['film', 'rt', 'metacritic']);

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

function logicalKeyFromStorage(storageKeyValue) {
  return String(storageKeyValue || '').startsWith(CACHE_PREFIX)
    ? storageKeyValue.slice(CACHE_PREFIX.length)
    : String(storageKeyValue || '');
}

export function classifyCacheKey(logicalKey) {
  const key = String(logicalKey || '');
  if (key.startsWith('film:mini:v2:')) return 'film';
  if (key.startsWith('rt:')) return 'rt';
  if (key.startsWith('metacritic:')) return 'metacritic';
  return null;
}

function emptyTypeStats() {
  return {
    count: 0,
    bytes: 0,
    expiredCount: 0,
    expiredBytes: 0,
    activeCount: 0,
    activeBytes: 0,
  };
}

function filmTitleMap(entries) {
  const byTmdb = new Map();
  const bySlug = new Map();
  for (const entry of entries) {
    if (entry.type !== 'film') continue;
    const title = String(entry.value?.title || '').trim();
    if (!title) continue;
    const year = entry.value?.year ? ` (${entry.value.year})` : '';
    const label = `${title}${year}`;
    if (entry.value?.tmdbId) byTmdb.set(String(entry.value.tmdbId), label);
    if (entry.value?.slug) bySlug.set(String(entry.value.slug).toLowerCase(), label);
  }
  return { byTmdb, bySlug };
}

function labelForEntry(type, logicalKey, value, titles) {
  if (type === 'film') {
    const title = String(value?.title || '').trim();
    if (title) {
      return value?.year ? `${title} (${value.year})` : title;
    }
    const slug = logicalKey.replace(/^film:mini:v2:/, '');
    return slug || logicalKey;
  }

  const idMatch = logicalKey.match(/^(?:rt|metacritic):tmdb:(\d+)$/i);
  if (idMatch) {
    return titles.byTmdb.get(idMatch[1]) || `TMDB ${idMatch[1]}`;
  }
  const slugMatch = logicalKey.match(/^(?:rt|metacritic):slug:(.+)$/i);
  if (slugMatch) {
    const slug = slugMatch[1].toLowerCase();
    return titles.bySlug.get(slug) || slug;
  }
  return logicalKey;
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
    console.warn('[Letterboxd Plus] Failed to cache external rating.', error);
  }
}

export function listCacheEntries(cacheHours) {
  const maxAgeMs = Math.max(0, Number(cacheHours) || 0) * 60 * 60 * 1000;
  const now = Date.now();
  const raw = [];

  for (const fullKey of cacheKeys()) {
    try {
      const entry = GM_getValue(fullKey, null);
      if (!entry) continue;
      const logicalKey = logicalKeyFromStorage(fullKey);
      const type = classifyCacheKey(logicalKey);
      if (!type) continue;
      const bytes = entryBytes(fullKey, entry);
      const savedAt = Number(entry.savedAt || 0);
      const expired = maxAgeMs <= 0 || now - savedAt > maxAgeMs;
      raw.push({
        storageKey: fullKey,
        logicalKey,
        type,
        savedAt,
        expired,
        bytes,
        value: entry.value || null,
      });
    } catch (error) {
      console.warn('[Letterboxd Plus] Failed to inspect cache entry.', {
        key: fullKey,
        error,
      });
    }
  }

  const titles = filmTitleMap(raw);
  return raw
    .map((entry) => ({
      ...entry,
      label: labelForEntry(entry.type, entry.logicalKey, entry.value, titles),
    }))
    .sort((a, b) => {
      if (a.type !== b.type) {
        return CACHE_TYPES.indexOf(a.type) - CACHE_TYPES.indexOf(b.type);
      }
      return b.savedAt - a.savedAt;
    });
}

export function getCacheStatsByType(cacheHours) {
  const entries = listCacheEntries(cacheHours);
  const byType = {
    film: emptyTypeStats(),
    rt: emptyTypeStats(),
    metacritic: emptyTypeStats(),
  };

  for (const entry of entries) {
    const bucket = byType[entry.type];
    if (!bucket) continue;
    bucket.count += 1;
    bucket.bytes += entry.bytes;
    if (entry.expired) {
      bucket.expiredCount += 1;
      bucket.expiredBytes += entry.bytes;
    } else {
      bucket.activeCount += 1;
      bucket.activeBytes += entry.bytes;
    }
  }

  const usedBytes =
    byType.film.bytes + byType.rt.bytes + byType.metacritic.bytes;
  const activeCount =
    byType.film.activeCount +
    byType.rt.activeCount +
    byType.metacritic.activeCount;
  const expiredCount =
    byType.film.expiredCount +
    byType.rt.expiredCount +
    byType.metacritic.expiredCount;

  return {
    byType,
    entries,
    activeCount,
    expiredCount,
    totalCount: entries.length,
    usedBytes,
    limitBytes: CACHE_SOFT_LIMIT_BYTES,
    fillPercent: Math.min(
      100,
      Math.round((usedBytes / CACHE_SOFT_LIMIT_BYTES) * 100),
    ),
  };
}

export function getCacheStats(cacheHours) {
  const typed = getCacheStatsByType(cacheHours);
  let activeBytes = 0;
  let expiredBytes = 0;
  for (const type of CACHE_TYPES) {
    activeBytes += typed.byType[type].activeBytes;
    expiredBytes += typed.byType[type].expiredBytes;
  }
  return {
    activeCount: typed.activeCount,
    activeBytes,
    expiredCount: typed.expiredCount,
    expiredBytes,
    totalCount: typed.totalCount,
    usedBytes: typed.usedBytes,
    limitBytes: typed.limitBytes,
    fillPercent: typed.fillPercent,
  };
}

export function clearCacheByType(type) {
  const target = String(type || '');
  if (!CACHE_TYPES.includes(target)) return 0;
  let removed = 0;
  for (const fullKey of cacheKeys()) {
    const logicalKey = logicalKeyFromStorage(fullKey);
    if (classifyCacheKey(logicalKey) !== target) continue;
    try {
      GM_deleteValue(fullKey);
      removed += 1;
    } catch (error) {
      console.warn('[Letterboxd Plus] Failed to delete cache entry.', {
        key: fullKey,
        error,
      });
    }
  }
  return removed;
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

export function formatCacheAge(savedAt, now = Date.now()) {
  const ageMs = Math.max(0, now - Number(savedAt || 0));
  const mins = Math.floor(ageMs / 60_000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
