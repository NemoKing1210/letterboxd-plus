import { REQUEST_TIMEOUT_MS } from '../core/constants.js';
import { readCache, writeCache } from '../core/cache.js';

const DESC_MAX = 180;
const TAGLINE_MAX = 120;
const DIRECTORS_MAX = 4;
const GENRES_MAX = 8;
const CAST_MAX = 4;
const USER_STATE_TTL_MS = 5 * 60 * 1000;

const inFlight = new Map();
const userStateCache = new Map();
const userStateInFlight = new Map();

export function filmMiniCacheKey(slug) {
  return `film:mini:v2:${String(slug || '')
    .trim()
    .toLowerCase()}`;
}

export function peekCachedFilmMiniProfile(slug, cacheHours) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key) return null;
  const cached = readCache(
    filmMiniCacheKey(key),
    Math.max(0, Number(cacheHours) || 0) * 60 * 60 * 1000,
  );
  return cached?.slug ? cached : null;
}

export function peekCachedUserState(slug) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key) return null;
  const entry = userStateCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > USER_STATE_TTL_MS) {
    userStateCache.delete(key);
    return null;
  }
  return entry.user;
}

export function rememberUserState(slug, user) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key || !user) return;
  userStateCache.set(key, { at: Date.now(), user });
}

function textOf(el) {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim();
}

function absUrl(url, base = window.location.origin) {
  const raw = String(url || '').trim();
  if (!raw || raw.startsWith('data:')) return '';
  try {
    return new URL(raw, base).href;
  } catch {
    return '';
  }
}

function truncateText(value, max = DESC_MAX) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function parseCompactCount(raw) {
  const text = String(raw || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  const match = text.replace(/,/g, '').match(/([\d.]+)\s*([KMB])?/i);
  if (!match) return null;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  const suffix = (match[2] || '').toUpperCase();
  const mult =
    suffix === 'B' ? 1e9 : suffix === 'M' ? 1e6 : suffix === 'K' ? 1e3 : 1;
  return Math.round(base * mult);
}

function readJsonLd(doc) {
  for (const script of doc.querySelectorAll(
    'script[type="application/ld+json"]',
  )) {
    try {
      const raw = script.textContent
        ?.replace(/^\s*\/\*\s*<!\[CDATA\[\s*/, '')
        .replace(/\s*\]\]>\s*\*\/\s*$/, '')
        .trim();
      if (!raw) continue;
      const data = JSON.parse(raw);
      if (data?.['@type'] === 'Movie') return data;
      if (Array.isArray(data)) {
        const movie = data.find((item) => item?.['@type'] === 'Movie');
        if (movie) return movie;
      }
    } catch {
      /* ignore invalid JSON-LD blocks */
    }
  }
  return null;
}

function parseTitle(doc, jsonLd) {
  const fromMeta =
    doc.querySelector('meta[name="production:name"]')?.content?.trim() || '';
  if (fromMeta) return fromMeta;
  if (jsonLd?.name) return String(jsonLd.name).trim();
  const h1 = doc.querySelector('h1.headline-1 .name, h1 .film-title, h1');
  const title = textOf(h1).replace(/\s+\(\d{4}\)\s*$/, '').trim();
  return title;
}

function parseYear(doc, jsonLd) {
  const titleAndYear =
    doc.querySelector('meta[name="production:name-and-year"]')?.content || '';
  const yearMatch = titleAndYear.match(/\((\d{4})\)\s*$/);
  if (yearMatch) return yearMatch[1];
  if (jsonLd?.datePublished || jsonLd?.dateCreated) {
    const match = String(
      jsonLd.datePublished || jsonLd.dateCreated,
    ).match(/\b(19|20)\d{2}\b/);
    if (match) return match[0];
  }
  return '';
}

function parsePosterUrl(doc, jsonLd) {
  if (jsonLd?.image) {
    const image = Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image;
    const href = absUrl(typeof image === 'string' ? image : image?.url || '');
    if (href) return href;
  }
  const posterImg =
    doc.querySelector('#js-poster-col img.image[src]') ||
    doc.querySelector('.poster.film-poster img[src]');
  const src =
    posterImg?.getAttribute('src') ||
    posterImg?.getAttribute('data-src') ||
    '';
  if (src && !/empty-poster/i.test(src)) return absUrl(src);
  return absUrl(
    doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
      '',
  );
}

function clampRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(0, Math.min(5, Math.round(n * 100) / 100));
}

function parseRatingFromHistogram(doc) {
  const el = doc.querySelector(
    '.rating-histogram a.averagerating, a.averagerating.tooltip, a.averagerating',
  );
  if (!el) return { rating: null, ratingCount: null };

  const tip =
    el.getAttribute('data-original-title') ||
    el.getAttribute('title') ||
    '';
  // "Weighted average of 4.40 based on 2,307,162 ratings"
  const tipMatch = tip.match(
    /(?:weighted\s+)?average\s+of\s+([\d.]+)\s+based\s+on\s+([\d,.\s]+)\s*ratings/i,
  );
  let rating = tipMatch ? Number(tipMatch[1]) : null;
  let ratingCount = tipMatch
    ? Number(String(tipMatch[2]).replace(/[,\s]/g, ''))
    : null;

  if (!Number.isFinite(rating) || rating <= 0) {
    const textMatch = textOf(el).match(/([\d]+(?:[.,]\d+)?)/);
    if (textMatch) {
      rating = Number(String(textMatch[1]).replace(',', '.'));
    }
  }

  return {
    rating: clampRating(rating),
    ratingCount:
      Number.isFinite(ratingCount) && ratingCount > 0
        ? Math.round(ratingCount)
        : null,
  };
}

function parseRatingFromMeta(doc) {
  const twitter =
    doc.querySelector('meta[name="twitter:data2"]')?.getAttribute('content') ||
    '';
  // "4.45 out of 5"
  const match = twitter.match(/([\d.]+)\s*out\s*of\s*5/i);
  return clampRating(match ? match[1] : null);
}

function parseRating(doc, jsonLd) {
  const fromJson = clampRating(jsonLd?.aggregateRating?.ratingValue);
  if (fromJson != null) return fromJson;
  const fromHistogram = parseRatingFromHistogram(doc).rating;
  if (fromHistogram != null) return fromHistogram;
  return parseRatingFromMeta(doc);
}

function parseRatingCount(doc, jsonLd) {
  const value = Number(jsonLd?.aggregateRating?.ratingCount);
  if (Number.isFinite(value) && value > 0) return Math.round(value);
  return parseRatingFromHistogram(doc).ratingCount;
}

function parseRuntimeMins(jsonLd) {
  const duration = String(jsonLd?.duration || '').trim();
  if (!duration) return null;
  const match = duration.match(
    /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i,
  );
  if (!match) return null;
  const hours = Number(match[1] || 0);
  const mins = Number(match[2] || 0);
  const secs = Number(match[3] || 0);
  const total = hours * 60 + mins + (secs >= 30 ? 1 : 0);
  return total > 0 ? total : null;
}

function parseTagline(doc) {
  const el = doc.querySelector(
    '.production-synopsis h4.tagline, h4.tagline',
  );
  return truncateText(textOf(el), TAGLINE_MAX);
}

function parseDirectors(doc, jsonLd) {
  const out = [];
  const seen = new Set();

  const push = (name, href = '') => {
    const label = String(name || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!label) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ name: label, href: absUrl(href) || href || '' });
  };

  if (Array.isArray(jsonLd?.director)) {
    for (const director of jsonLd.director) {
      push(director?.name, director?.sameAs || '');
      if (out.length >= DIRECTORS_MAX) return out;
    }
  } else if (jsonLd?.director?.name) {
    push(jsonLd.director.name, jsonLd.director.sameAs || '');
  }

  for (const anchor of doc.querySelectorAll(
    '.contributorlist a[href*="/director/"], a.text-slug[href*="/director/"]',
  )) {
    push(textOf(anchor), anchor.getAttribute('href') || '');
    if (out.length >= DIRECTORS_MAX) break;
  }
  return out;
}

function parseGenres(doc) {
  const out = [];
  const seen = new Set();
  const root =
    doc.querySelector('#tab-panel-genres .text-sluglist') ||
    doc.querySelector('.text-sluglist.capitalize');
  if (!root) return out;
  for (const anchor of root.querySelectorAll('a[href*="/films/genre/"]')) {
    const label = textOf(anchor);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= GENRES_MAX) break;
  }
  return out;
}

function parseCast(doc, jsonLd) {
  const out = [];
  const seen = new Set();

  const push = (name, href = '', role = '') => {
    const label = String(name || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!label) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      name: label,
      href: absUrl(href) || href || '',
      role: String(role || '')
        .replace(/\s+/g, ' ')
        .trim(),
    });
  };

  const root =
    doc.querySelector('#tab-panel-cast .cast-list') ||
    doc.querySelector('#tab-panel-cast .text-sluglist') ||
    doc.querySelector('.cast-list');

  if (root) {
    for (const anchor of root.querySelectorAll('a[href*="/actor/"]')) {
      const name =
        anchor.getAttribute('data-lbp-cast-name') ||
        textOf(anchor.querySelector('strong')) ||
        textOf(anchor);
      const role =
        anchor.getAttribute('data-original-title') ||
        anchor.getAttribute('title') ||
        textOf(anchor.querySelector('small')) ||
        '';
      push(name, anchor.getAttribute('href') || '', role);
      if (out.length >= CAST_MAX) return out;
    }
  }

  if (out.length) return out;

  const actors = Array.isArray(jsonLd?.actor)
    ? jsonLd.actor
    : jsonLd?.actor
      ? [jsonLd.actor]
      : [];
  for (const actor of actors) {
    push(actor?.name, actor?.sameAs || '', '');
    if (out.length >= CAST_MAX) break;
  }
  return out;
}

function parseDescription(doc, jsonLd) {
  const truncate = doc.querySelector('.truncate[data-truncate] p, .truncate p');
  const fromDom = truncateText(textOf(truncate));
  if (fromDom) return fromDom;
  return truncateText(jsonLd?.description || '');
}

function parseStats(doc) {
  const watchesEl = doc.querySelector(
    '.production-statistic.-watches[aria-label], .production-statistic.-watches',
  );
  const likesEl = doc.querySelector(
    '.production-statistic.-likes[aria-label], .production-statistic.-likes',
  );
  const watches =
    parseCompactCount(watchesEl?.getAttribute('aria-label')) ||
    parseCompactCount(textOf(watchesEl?.querySelector('.label'))) ||
    null;
  const likes =
    parseCompactCount(likesEl?.getAttribute('aria-label')) ||
    parseCompactCount(textOf(likesEl?.querySelector('.label'))) ||
    null;
  if (watches == null && likes == null) return null;
  return { watches, likes };
}

function parseUserRating(root) {
  if (!root) return null;

  const selected = root.querySelectorAll(
    '[data-component-class="InstantRatingInput"] label[data-state="selected"], [data-component-class="InstantRatingInput"] [class*="star-trigger"][data-state="selected"]',
  );
  let maxStars = 0;
  for (const label of selected) {
    const aria = label.getAttribute('aria-label') || '';
    const ariaMatch = aria.match(/([\d.]+)\s*Stars?/i);
    if (ariaMatch) {
      const stars = Number(ariaMatch[1]);
      if (Number.isFinite(stars) && stars > maxStars) maxStars = stars;
      continue;
    }

    const forId = label.getAttribute('for');
    let input = null;
    if (forId) {
      try {
        input = root.querySelector(`#${CSS.escape(forId)}`);
      } catch {
        input = null;
      }
    }
    if (!input) input = label.previousElementSibling;
    const half = Number(input?.value);
    if (Number.isFinite(half) && half > 0) {
      const stars = half / 2;
      if (stars > maxStars) maxStars = stars;
    }
  }
  if (maxStars > 0) return maxStars;

  const checked = root.querySelector(
    '[data-component-class="InstantRatingInput"] input[type="radio"]:checked',
  );
  const checkedHalf = Number(checked?.value);
  if (Number.isFinite(checkedHalf) && checkedHalf > 0) {
    return checkedHalf / 2;
  }
  return null;
}

function findUserActionsRoot(doc) {
  return (
    doc.querySelector(
      '#userpanel, .js-actions-panel, ul.js-actions-panel, .actions-panel',
    ) || doc
  );
}

function hasUserActionSignals(root) {
  return Boolean(
    root.querySelector(
      '[data-component-class="WatchLink"], [data-component-class="LikeComponent"], [data-component-class="InstantRatingInput"], [data-component-class="Watchlist"], [data-component-class="MemberActivity"]',
    ),
  );
}

export function parseUserStateFromDoc(doc, slugHint = '') {
  if (!doc) return null;
  const root = findUserActionsRoot(doc);
  if (!hasUserActionSignals(root) && root === doc) {
    // Nothing user-specific in the document.
    if (!hasUserActionSignals(doc)) return null;
  }

  const searchRoot = hasUserActionSignals(root) ? root : doc;

  const watchEl =
    searchRoot.querySelector(
      '[data-component-class="WatchLink"][data-is-watched]',
    ) || searchRoot.querySelector('[data-component-class="WatchLink"]');
  const likeEl =
    searchRoot.querySelector(
      '[data-component-class="LikeComponent"][data-is-liked]',
    ) || searchRoot.querySelector('[data-component-class="LikeComponent"]');

  const watchedAttr = watchEl?.getAttribute('data-is-watched');
  const likedAttr = likeEl?.getAttribute('data-is-liked');
  const watched =
    watchedAttr === 'true' ||
    Boolean(searchRoot.querySelector('.action.-watch.-on, .watch-link .action.-on'));
  const liked =
    likedAttr === 'true' ||
    Boolean(searchRoot.querySelector('.action.-like.-on, .like-link .action.-on'));

  // If attributes explicitly say false, keep false even without -on class.
  const watchedState =
    watchedAttr === 'false' ? false : watchedAttr === 'true' ? true : watched;
  const likedState =
    likedAttr === 'false' ? false : likedAttr === 'true' ? true : liked;

  const addWatchlist = searchRoot.querySelector(
    '.add-to-watchlist, a.action.-watchlist.add-to-watchlist',
  );
  const removeWatchlist = searchRoot.querySelector(
    '.remove-from-watchlist, a.action.-watchlist.remove-from-watchlist, .action.-watchlist.-on',
  );
  let inWatchlist = null;
  if (removeWatchlist) inWatchlist = true;
  else if (addWatchlist) inWatchlist = false;

  const activityEl = searchRoot.querySelector(
    '[data-component-class="MemberActivity"]',
  );
  const activity =
    activityEl?.getAttribute('data-members-activity-page-url') || '';
  const username = activityEl?.getAttribute('data-member-username') || '';

  const rating = parseUserRating(searchRoot);
  const slug =
    String(slugHint || '')
      .trim()
      .toLowerCase() ||
    (
      doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || ''
    ).match(/\/film\/([^/?#]+)/i)?.[1]?.toLowerCase() ||
    '';

  if (
    !watchEl &&
    !likeEl &&
    rating == null &&
    inWatchlist == null &&
    !activity
  ) {
    return null;
  }

  return {
    watched: watchedState,
    liked: likedState,
    inWatchlist,
    rating,
    activityUrl: absUrl(activity) || activity || '',
    username: String(username || '').trim(),
    logUrl: slug ? `/film/${encodeURIComponent(slug)}/` : '',
  };
}

function normalizeHalfOrStars(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Letterboxd forms often use 1–10 (half-stars); API uses 0.5–5.
  if (n > 5) return Math.max(0.5, Math.min(5, n / 2));
  return Math.max(0.5, Math.min(5, n));
}

export function parseUserStateFromFilmJson(data, slugHint = '') {
  if (!data || typeof data !== 'object') return null;

  const candidates = [
    data.relationship,
    data.memberRelationship,
    data.filmRelationship,
    data.memberFilmRelationship,
    data.viewing,
    data.entry,
    Array.isArray(data.entries) ? data.entries[0] : null,
    Array.isArray(data.viewings) ? data.viewings[0] : null,
    data,
  ].filter(Boolean);

  let rating = null;
  let watched = null;
  let liked = null;
  let inWatchlist = null;

  for (const item of candidates) {
    if (rating == null) {
      rating = normalizeHalfOrStars(
        item.rating ?? item.memberRating ?? item.rate ?? item.score,
      );
    }
    if (watched == null && typeof item.watched === 'boolean') {
      watched = item.watched;
    }
    if (liked == null && typeof item.liked === 'boolean') {
      liked = item.liked;
    }
    if (inWatchlist == null && typeof item.inWatchlist === 'boolean') {
      inWatchlist = item.inWatchlist;
    }
  }

  if (rating != null && watched == null) watched = true;

  if (rating == null && watched == null && liked == null && inWatchlist == null) {
    return null;
  }

  const slug = String(slugHint || '')
    .trim()
    .toLowerCase();
  return {
    watched: watched === true,
    liked: liked === true,
    inWatchlist,
    rating,
    activityUrl: '',
    username: '',
    logUrl: slug ? `/film/${encodeURIComponent(slug)}/` : '',
  };
}

function parseTmdbId(doc) {
  const raw =
    doc.body?.getAttribute('data-tmdb-id') ||
    doc.querySelector('[data-tmdb-id]')?.getAttribute('data-tmdb-id');
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? String(id) : null;
}

function resolveSlug(doc, slugHint) {
  const hint = String(slugHint || '')
    .trim()
    .toLowerCase();
  if (hint) return hint;
  const canon =
    doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
  const match = canon.match(/\/film\/([^/?#]+)/i);
  return match ? match[1].toLowerCase() : '';
}

function toPublicProfile(profile) {
  if (!profile) return null;
  const { user: _user, ...publicProfile } = profile;
  return publicProfile;
}

export function parseFilmMiniProfileDoc(doc, slugHint = '') {
  if (!doc) return null;
  const jsonLd = readJsonLd(doc);
  const slug = resolveSlug(doc, slugHint);
  const title = parseTitle(doc, jsonLd) || (slug ? slug.replace(/-/g, ' ') : '');
  if (!slug && !title) return null;
  if (!slug) return null;

  const user = parseUserStateFromDoc(doc, slug);
  if (user) rememberUserState(slug, user);

  return {
    slug,
    title,
    year: parseYear(doc, jsonLd),
    posterUrl: parsePosterUrl(doc, jsonLd),
    rating: parseRating(doc, jsonLd),
    ratingCount: parseRatingCount(doc, jsonLd),
    runtimeMins: parseRuntimeMins(jsonLd),
    tagline: parseTagline(doc),
    directors: parseDirectors(doc, jsonLd),
    cast: parseCast(doc, jsonLd),
    genres: parseGenres(doc),
    description: parseDescription(doc, jsonLd),
    stats: parseStats(doc),
    tmdbId: parseTmdbId(doc),
    filmUrl: `/film/${encodeURIComponent(slug)}/`,
    user: user || null,
  };
}

export function parseFilmMiniProfileHtml(html, slugHint = '') {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  return parseFilmMiniProfileDoc(doc, slugHint);
}

async function requestFilmHtml(slug) {
  const url = new URL(
    `/film/${encodeURIComponent(slug)}/`,
    window.location.origin,
  );
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );
  try {
    const response = await fetch(url.href, {
      cache: 'default',
      credentials: 'same-origin',
      headers: { Accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Letterboxd returned HTTP ${response.status}.`);
    }
    return await response.text();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function requestFilmJson(slug) {
  const url = new URL(
    `/film/${encodeURIComponent(slug)}/json/`,
    window.location.origin,
  );
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );
  try {
    const response = await fetch(url.href, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json, text/javascript, */*;q=0.1' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function mergeUserStates(primary, secondary) {
  if (!primary && !secondary) return null;
  if (!primary) return secondary;
  if (!secondary) return primary;
  return {
    watched: Boolean(primary.watched || secondary.watched),
    liked: Boolean(primary.liked || secondary.liked),
    inWatchlist:
      primary.inWatchlist != null
        ? primary.inWatchlist
        : secondary.inWatchlist,
    rating: primary.rating ?? secondary.rating ?? null,
    activityUrl: primary.activityUrl || secondary.activityUrl || '',
    username: primary.username || secondary.username || '',
    logUrl: primary.logUrl || secondary.logUrl || '',
  };
}

export async function fetchFilmMiniProfile(slug, cacheHours) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key) return null;

  const cached = peekCachedFilmMiniProfile(key, cacheHours);
  if (cached) return cached;
  if (inFlight.has(key)) return inFlight.get(key);

  const task = (async () => {
    const html = await requestFilmHtml(key);
    const profile = parseFilmMiniProfileHtml(html, key);
    if (!profile) return null;
    writeCache(filmMiniCacheKey(key), toPublicProfile(profile));
    return toPublicProfile(profile);
  })()
    .catch((error) => {
      console.warn('[Letterboxd Plus] Failed to load film mini-profile.', {
        slug: key,
        error,
      });
      return null;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, task);
  return task;
}

export async function fetchFilmUserState(slug) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key) return null;

  const cached = peekCachedUserState(key);
  if (cached) return cached;
  if (userStateInFlight.has(key)) return userStateInFlight.get(key);

  const task = (async () => {
    let fromHtml = null;
    try {
      const html = await requestFilmHtml(key);
      const doc = new DOMParser().parseFromString(
        String(html || ''),
        'text/html',
      );
      fromHtml = parseUserStateFromDoc(doc, key);
    } catch (error) {
      console.warn('[Letterboxd Plus] Failed to parse film user HTML.', {
        slug: key,
        error,
      });
    }

    let fromJson = null;
    if (!fromHtml || fromHtml.rating == null) {
      const json = await requestFilmJson(key);
      fromJson = parseUserStateFromFilmJson(json, key);
    }

    const user = mergeUserStates(fromHtml, fromJson);
    if (user) rememberUserState(key, user);
    return user;
  })()
    .catch((error) => {
      console.warn('[Letterboxd Plus] Failed to load film user state.', {
        slug: key,
        error,
      });
      return null;
    })
    .finally(() => {
      userStateInFlight.delete(key);
    });

  userStateInFlight.set(key, task);
  return task;
}

/**
 * Ensure user state is available. Uses memory cache; on miss fetches HTML.
 * If cached state has no personal rating yet, also tries /film/{slug}/json/.
 */
export async function ensureFilmUserState(slug, { force = false } = {}) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key) return null;

  if (force) {
    userStateCache.delete(key);
    return fetchFilmUserState(key);
  }

  const cached = peekCachedUserState(key);
  if (cached?.rating != null) return cached;

  if (cached) {
    const json = await requestFilmJson(key);
    const fromJson = parseUserStateFromFilmJson(json, key);
    const merged = mergeUserStates(cached, fromJson);
    if (merged) rememberUserState(key, merged);
    return merged;
  }

  return fetchFilmUserState(key);
}
