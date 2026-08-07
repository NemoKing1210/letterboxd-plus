import { REQUEST_TIMEOUT_MS } from '../core/constants.js';
import { readCache, writeCache } from '../core/cache.js';
import {
  isValidUsernameSegment,
  normalizeUsername,
} from '../utils/letterboxd-username.js';

const BIO_MAX = 180;
const LOCATION_MAX = 80;
const POSTER_STRIP_LIMIT = 4;
const POSTER_RESOLVE_TIMEOUT_MS = 8_000;
const CDN_POSTER_HOSTS = new Set(['a.ltrbxd.com', 'image.tmdb.org']);

const inFlight = new Map();

export function userMiniCacheKey(username) {
  return `user:mini:v7:${normalizeUsername(username)}`;
}

export function peekCachedUserMiniProfile(username, cacheHours) {
  const key = normalizeUsername(username);
  if (!key) return null;
  const cached = readCache(
    userMiniCacheKey(key),
    Math.max(0, Number(cacheHours) || 0) * 60 * 60 * 1000,
  );
  return cached?.username ? cached : null;
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

function truncateText(value, max) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function pickFromSrcset(srcset) {
  const raw = String(srcset || '').trim();
  if (!raw) return '';
  let best = '';
  let bestW = -1;
  for (const part of raw.split(',')) {
    const bits = part.trim().split(/\s+/);
    const url = bits[0] || '';
    if (!url) continue;
    const descriptor = bits[1] || '';
    const widthMatch = descriptor.match(/^(\d+)w$/i);
    const width = widthMatch ? Number(widthMatch[1]) : 0;
    if (width >= bestW) {
      bestW = width;
      best = url;
    } else if (!best) {
      best = url;
    }
  }
  return best;
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

function profileUrlFor(username) {
  return `/${encodeURIComponent(username)}/`;
}

function classifyStatHref(href, username) {
  const path = String(href || '');
  const user = encodeURIComponent(username);
  if (path.includes(`/${user}/followers`)) return 'followers';
  if (path.includes(`/${user}/following`)) return 'following';
  if (path.includes(`/${user}/lists`)) return 'lists';
  if (path.includes(`/${user}/diary/for/`)) return 'thisYear';
  if (path.includes(`/${user}/films`)) return 'films';
  // Relative without leading username sometimes appears as /films/ under profile.
  if (/\/followers\/?$/i.test(path)) return 'followers';
  if (/\/following\/?$/i.test(path)) return 'following';
  if (/\/lists\/?$/i.test(path)) return 'lists';
  if (/\/diary\/for\//i.test(path)) return 'thisYear';
  if (/\/films\/?$/i.test(path) || /\/films\//i.test(path)) return 'films';
  return '';
}

function parseAvatarUrl(doc) {
  const large =
    doc.querySelector('#avatar-large .avatar img') ||
    doc.querySelector('#avatar-large img');
  const small =
    doc.querySelector('.profile-avatar .avatar img') ||
    doc.querySelector('.profile-avatar img');
  const img = large || small;
  if (!img) return '';
  const candidates = [
    img.getAttribute('src'),
    pickFromSrcset(img.getAttribute('srcset')),
    img.getAttribute('data-src'),
    pickFromSrcset(img.getAttribute('data-srcset')),
  ];
  for (const candidate of candidates) {
    const url = absUrl(candidate);
    if (url) return url;
  }
  return '';
}

function parseDisplayName(doc, username) {
  const label = textOf(
    doc.querySelector('h1.person-display-name .displayname .label') ||
      doc.querySelector('h1.person-display-name .displayname') ||
      doc.querySelector('h1 .displayname .label'),
  );
  if (label) return label;
  const alt =
    doc.querySelector('.profile-avatar img[alt]')?.getAttribute('alt') ||
    doc.querySelector('#avatar-large img[alt]')?.getAttribute('alt') ||
    '';
  return String(alt).trim() || username;
}

function parsePatron(doc) {
  return Boolean(
    doc.querySelector(
      'h1.person-display-name .badge.-patron, h1 .badge.-patron',
    ),
  );
}

function parseBio(doc) {
  const paras = doc.querySelectorAll(
    '.js-bio-content p, .bio.js-bio .js-bio-content p, .bio p',
  );
  const chunks = [];
  for (const p of paras) {
    const text = textOf(p);
    if (text) chunks.push(text);
  }
  return truncateText(chunks.join(' '), BIO_MAX);
}

function parseLocation(doc) {
  const labels = doc.querySelectorAll(
    '.profile-metadata .metadatum .label, .js-profile-metadata .metadatum .label',
  );
  for (const label of labels) {
    const text = textOf(label);
    if (text) return truncateText(text, LOCATION_MAX);
  }
  return '';
}

function parseStats(doc, username) {
  const stats = {
    films: null,
    filmsUrl: '',
    thisYear: null,
    thisYearUrl: '',
    lists: null,
    listsUrl: '',
    following: null,
    followingUrl: '',
    followers: null,
    followersUrl: '',
  };

  const root =
    doc.querySelector('.profile-stats.js-profile-stats') ||
    doc.querySelector('.profile-stats');
  if (!root) return stats;

  for (const anchor of root.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href') || '';
    const kind = classifyStatHref(href, username);
    if (!kind) continue;
    const valueEl = anchor.querySelector('.value');
    const count = parseCompactCount(textOf(valueEl) || textOf(anchor));
    const abs = absUrl(href);
    if (kind === 'films' && stats.films == null) {
      stats.films = count;
      stats.filmsUrl = abs || profileUrlFor(username) + 'films/';
    } else if (kind === 'thisYear' && stats.thisYear == null) {
      stats.thisYear = count;
      stats.thisYearUrl = abs;
    } else if (kind === 'lists' && stats.lists == null) {
      stats.lists = count;
      stats.listsUrl = abs || profileUrlFor(username) + 'lists/';
    } else if (kind === 'following' && stats.following == null) {
      stats.following = count;
      stats.followingUrl = abs || profileUrlFor(username) + 'following/';
    } else if (kind === 'followers' && stats.followers == null) {
      stats.followers = count;
      stats.followersUrl = abs || profileUrlFor(username) + 'followers/';
    }
  }

  return stats;
}

function resolveUsername(doc, hint) {
  const fromHeader =
    doc
      .querySelector('section.profile-header[data-person], .js-profile-header[data-person]')
      ?.getAttribute('data-person') ||
    doc
      .querySelector('.js-follow-button-wrapper[data-username]')
      ?.getAttribute('data-username') ||
    '';
  const candidate = normalizeUsername(fromHeader || hint);
  return isValidUsernameSegment(candidate) ? candidate : '';
}

function isUsablePosterSrc(src) {
  const value = String(src || '').trim();
  if (!value) return false;
  if (/empty-poster/i.test(value)) return false;
  if (/\/film\/[^/]+\/image-\d+\/?$/i.test(value)) return false;
  return true;
}

function isCdnPosterUrl(url) {
  const href = absUrl(url);
  if (!href || !isUsablePosterSrc(href)) return false;
  try {
    const host = new URL(href).hostname.toLowerCase();
    if (CDN_POSTER_HOSTS.has(host)) return true;
    // Accept same-origin static assets that are actual image files.
    if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(href)) return true;
  } catch {
    return false;
  }
  return false;
}

function filmUrlForSlug(slug) {
  return `/film/${encodeURIComponent(slug)}/`;
}

function slugFromPath(href) {
  const raw = String(href || '').trim();
  if (!raw) return '';
  try {
    const path = new URL(raw, window.location.origin).pathname;
    const match = path.match(/\/film\/([^/]+)\//i);
    return match ? decodeURIComponent(match[1]) : '';
  } catch {
    const match = raw.match(/\/film\/([^/?#]+)/i);
    return match ? decodeURIComponent(match[1]) : '';
  }
}

function titleFromItemName(raw, slug) {
  const text = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return slug || '';
  const withoutYear = text.replace(/\s*\(\d{4}\)\s*$/, '').trim();
  return withoutYear || text;
}

function parseRatedHalfStars(container) {
  if (!container?.querySelector) return null;
  const rated =
    container.querySelector(
      ':scope > .poster-viewingdata .rating[class*="rated-"], .poster-viewingdata .rating[class*="rated-"]',
    ) || null;
  const className = rated?.className || '';
  const match = String(className).match(/\brated-(\d+)\b/);
  if (!match) return null;
  const half = Number(match[1]);
  if (!Number.isFinite(half) || half <= 0) return null;
  return Math.max(0.5, Math.min(5, half / 2));
}

function resolveLazyPosterRoot(el) {
  if (!el) return null;
  if (
    el.matches?.(
      '.react-component[data-component-class="LazyPoster"], [data-item-slug]',
    )
  ) {
    return el;
  }
  return (
    el.querySelector?.(
      '.react-component[data-component-class="LazyPoster"][data-item-slug], [data-item-slug]',
    ) ||
    el.closest?.(
      '.react-component[data-component-class="LazyPoster"], [data-item-slug]',
    ) ||
    null
  );
}

function parseJsonAttr(root, name) {
  if (!root?.getAttribute) return null;
  const raw =
    root.getAttribute(name) ||
    root.querySelector?.(`[${name}]`)?.getAttribute(name) ||
    '';
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readPosterCacheKey(root) {
  const fromPath = parseJsonAttr(root, 'data-resolvable-poster-path');
  if (fromPath?.cacheBustingKey) return String(fromPath.cacheBustingKey).trim();
  return String(
    root?.getAttribute?.('data-cache-busting-key') ||
      root?.querySelector?.('[data-cache-busting-key]')?.getAttribute(
        'data-cache-busting-key',
      ) ||
      '',
  ).trim();
}

function readPosterSize(root) {
  const width = Number(
    root?.getAttribute?.('data-image-width') ||
      root?.querySelector?.('[data-image-width]')?.getAttribute('data-image-width') ||
      150,
  );
  const height = Number(
    root?.getAttribute?.('data-image-height') ||
      root?.querySelector?.('[data-image-height]')?.getAttribute(
        'data-image-height',
      ) ||
      225,
  );
  return {
    width: Number.isFinite(width) && width > 0 ? width : 150,
    height: Number.isFinite(height) && height > 0 ? height : 225,
  };
}

/** Only real CDN img URLs from the profile markup — never invent paths. */
function posterImageUrl(root) {
  if (!root) return '';
  const img =
    root.querySelector?.('img.image') || root.querySelector?.('img') || null;
  if (!img) return '';
  const candidates = [
    img.getAttribute('src'),
    pickFromSrcset(img.getAttribute('srcset')),
    img.getAttribute('data-src'),
    pickFromSrcset(img.getAttribute('data-srcset')),
  ];
  for (const candidate of candidates) {
    const url = absUrl(candidate);
    if (isCdnPosterUrl(url)) return url;
  }
  return '';
}

function viewingContainerFor(item) {
  if (!item) return null;
  if (item.matches?.('.viewing-poster-container')) return item;
  return item.closest?.('.viewing-poster-container') || null;
}

function parsePosterEntry(item, { includeRating = false } = {}) {
  if (!item || item.querySelector?.('.poster.-placeholder, .poster.-dummy')) {
    return null;
  }
  if (
    item.classList?.contains('-placeholder') ||
    item.classList?.contains('-dummy')
  ) {
    return null;
  }

  const root = resolveLazyPosterRoot(item);
  if (!root) return null;

  const slug =
    root.getAttribute('data-item-slug') ||
    root.getAttribute('data-film-slug') ||
    slugFromPath(root.getAttribute('data-item-link')) ||
    slugFromPath(root.getAttribute('data-target-link')) ||
    '';
  if (!slug) return null;

  const title = titleFromItemName(
    root.getAttribute('data-item-name') ||
      root.getAttribute('data-item-full-display-name') ||
      root.querySelector?.('img[alt]')?.getAttribute('alt') ||
      '',
    slug,
  );
  const itemLink = root.getAttribute('data-item-link') || '';
  const linkSlug = slugFromPath(itemLink);
  const size = readPosterSize(root);
  const entry = {
    slug,
    title,
    filmUrl: filmUrlForSlug(linkSlug || slug),
    posterUrl: posterImageUrl(root),
    posterKey: readPosterCacheKey(root),
    posterWidth: size.width,
    posterHeight: size.height,
  };

  if (includeRating) {
    const container = viewingContainerFor(item);
    entry.rating = container ? parseRatedHalfStars(container) : null;
  }

  return entry;
}

function collectPosterItems(section, itemSelector, { allowLazyFallback = true } = {}) {
  if (!section) return [];
  const items = section.querySelectorAll(itemSelector);
  if (items.length) return [...items];
  if (!allowLazyFallback) return [];
  return [
    ...section.querySelectorAll(
      '.react-component[data-component-class="LazyPoster"][data-item-slug], [data-item-slug]',
    ),
  ];
}

function parseFavorites(doc) {
  const section = doc.querySelector('#favourites');
  if (!section) return [];
  const items = collectPosterItems(
    section,
    '.favourite-production-poster-container, li.posteritem, li.griditem',
  );
  const out = [];
  const seen = new Set();
  for (const item of items) {
    if (out.length >= POSTER_STRIP_LIMIT) break;
    const entry = parsePosterEntry(item);
    if (!entry || seen.has(entry.slug)) continue;
    seen.add(entry.slug);
    out.push(entry);
  }
  return out;
}

function parseRecentActivity(doc) {
  const section = doc.querySelector('#recent-activity');
  if (!section) return [];
  const containers = collectPosterItems(
    section,
    '.viewing-poster-container',
    { allowLazyFallback: false },
  );
  const items = containers.length
    ? containers
    : collectPosterItems(section, 'li.posteritem, li.griditem', {
        allowLazyFallback: true,
      });
  const out = [];
  const seen = new Set();
  for (const item of items) {
    if (out.length >= POSTER_STRIP_LIMIT) break;
    const hasViewingContainer = Boolean(viewingContainerFor(item));
    const entry = parsePosterEntry(item, {
      includeRating: hasViewingContainer,
    });
    if (!entry || seen.has(entry.slug)) continue;
    seen.add(entry.slug);
    out.push(entry);
  }
  return out;
}

function stripPosterResolveMeta(film) {
  if (!film) return;
  delete film.posterKey;
  delete film.posterWidth;
  delete film.posterHeight;
}

function profileNeedsPosterEnrichment(profile) {
  if (!profile) return false;
  const strips = [
    ...(Array.isArray(profile.favorites) ? profile.favorites : []),
    ...(Array.isArray(profile.recent) ? profile.recent : []),
  ];
  if (!strips.length) return false;
  return strips.some((film) => film?.slug && !isCdnPosterUrl(film.posterUrl));
}

function extractCdnFromPosterHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  const imgs = doc.querySelectorAll('img.image[src], img[src]');
  for (const img of imgs) {
    const candidates = [
      img.getAttribute('src'),
      pickFromSrcset(img.getAttribute('srcset')),
      img.getAttribute('data-src'),
      pickFromSrcset(img.getAttribute('data-srcset')),
    ];
    for (const candidate of candidates) {
      const url = absUrl(candidate);
      if (isCdnPosterUrl(url)) return url;
    }
  }
  return '';
}

function parseJsonLdImage(doc) {
  for (const script of doc.querySelectorAll(
    'script[type="application/ld+json"]',
  )) {
    const raw = String(script.textContent || '');
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) continue;
    try {
      const data = JSON.parse(raw.slice(start, end + 1));
      const image = Array.isArray(data?.image) ? data.image[0] : data?.image;
      const href = absUrl(typeof image === 'string' ? image : image?.url || '');
      if (isCdnPosterUrl(href)) return href;
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }
  return '';
}

function parsePosterUrlFromFilmDoc(doc) {
  if (!doc?.querySelector) return '';
  const fromImg = posterImageUrl(
    doc.querySelector('#js-poster-col') ||
      doc.querySelector('.poster.film-poster') ||
      doc,
  );
  if (fromImg) return fromImg;
  const fromLd = parseJsonLdImage(doc);
  if (fromLd) return fromLd;
  const og = absUrl(
    doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
      '',
  );
  return isCdnPosterUrl(og) ? og : '';
}

async function fetchSameOriginText(path, {
  accept = 'text/html,application/xhtml+xml,*/*',
  timeoutMs = POSTER_RESOLVE_TIMEOUT_MS,
} = {}) {
  const url = new URL(path, window.location.origin);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url.href, {
      method: 'GET',
      cache: 'default',
      credentials: 'same-origin',
      headers: { Accept: accept },
      signal: controller.signal,
    });
    if (!response.ok) return '';
    return await response.text();
  } catch {
    return '';
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * LazyPoster hydrates via this endpoint after SPA boot.
 * Try a few size variants — Letterboxd is picky about the path.
 */
async function resolvePosterViaAjax(film) {
  const slug = String(film?.slug || '').trim();
  if (!slug) return '';
  const key = String(film.posterKey || '').trim();
  const qs = key ? `?k=${encodeURIComponent(key)}` : '';
  const width = film.posterWidth || 150;
  const height = film.posterHeight || 225;
  const sizes = [
    `${width}x${height}`,
    '150x225',
    '70x105',
    '100x150',
  ];
  const uniqueSizes = [...new Set(sizes)];

  for (const size of uniqueSizes) {
    const html = await fetchSameOriginText(
      `/ajax/poster/film/${encodeURIComponent(slug)}/std/${size}/${qs}`,
    );
    const cdn = extractCdnFromPosterHtml(html);
    if (cdn) return cdn;
  }
  return '';
}

/**
 * Film pages embed the real CDN poster in JSON-LD / og:image even when
 * LazyPoster is not hydrated — same source film mini-cards use.
 */
async function resolvePosterViaFilmPage(slug) {
  const key = String(slug || '').trim();
  if (!key) return '';
  const html = await fetchSameOriginText(`/film/${encodeURIComponent(key)}/`, {
    accept: 'text/html,application/xhtml+xml',
    timeoutMs: REQUEST_TIMEOUT_MS,
  });
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return parsePosterUrlFromFilmDoc(doc);
}

async function resolvePosterUrl(film) {
  if (isCdnPosterUrl(film?.posterUrl)) return film.posterUrl;
  const viaAjax = await resolvePosterViaAjax(film);
  if (viaAjax) return viaAjax;
  return resolvePosterViaFilmPage(film?.slug);
}

/** Prefer hydrated poster imgs when the open page is already this member's profile. */
function overlayLiveProfilePosters(profile) {
  if (!profile?.username || typeof document === 'undefined') return profile;
  const livePerson =
    document
      .querySelector(
        'section.profile-header[data-person], .js-profile-header[data-person]',
      )
      ?.getAttribute('data-person') || '';
  if (normalizeUsername(livePerson) !== normalizeUsername(profile.username)) {
    return profile;
  }
  const liveFavorites = parseFavorites(document);
  const liveRecent = parseRecentActivity(document);
  if (liveFavorites.some((f) => isCdnPosterUrl(f.posterUrl))) {
    profile.favorites = liveFavorites;
  }
  if (liveRecent.some((f) => isCdnPosterUrl(f.posterUrl))) {
    profile.recent = liveRecent;
  }
  return profile;
}

async function enrichPosterUrls(profile) {
  if (!profile) return profile;
  overlayLiveProfilePosters(profile);

  const strips = [
    ...(Array.isArray(profile.favorites) ? profile.favorites : []),
    ...(Array.isArray(profile.recent) ? profile.recent : []),
  ];
  const missing = strips.filter(
    (film) => film?.slug && !isCdnPosterUrl(film.posterUrl),
  );

  if (missing.length) {
    await Promise.all(
      missing.map(async (film) => {
        film.posterUrl = (await resolvePosterUrl(film)) || '';
      }),
    );
  }

  for (const film of strips) stripPosterResolveMeta(film);
  return profile;
}

/**
 * @param {Document} doc
 * @param {string} [usernameHint]
 */
export function parseUserMiniProfileDoc(doc, usernameHint = '') {
  if (!doc?.querySelector) return null;
  const header =
    doc.querySelector('section.profile-header') ||
    doc.querySelector('.js-profile-header') ||
    doc.querySelector('.profile-summary');
  if (!header && !doc.querySelector('.profile-stats')) return null;

  const username = resolveUsername(doc, usernameHint);
  if (!username) return null;

  const displayName = parseDisplayName(doc, username);
  const avatarUrl = parseAvatarUrl(doc);
  const stats = parseStats(doc, username);

  return {
    username,
    displayName,
    avatarUrl,
    isPatron: parsePatron(doc),
    bio: parseBio(doc),
    location: parseLocation(doc),
    stats,
    favorites: parseFavorites(doc),
    recent: parseRecentActivity(doc),
    profileUrl: profileUrlFor(username),
  };
}

export function parseUserMiniProfileHtml(html, usernameHint = '') {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  return parseUserMiniProfileDoc(doc, usernameHint);
}

async function requestProfileHtml(username) {
  const url = new URL(
    `/${encodeURIComponent(username)}/`,
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

/**
 * Fetch member profile page HTML once and parse a mini-card payload.
 * @param {string} username
 * @param {number} cacheHours
 * @param {{ persistCache?: boolean }} [options]
 */
export async function fetchUserMiniProfile(
  username,
  cacheHours,
  { persistCache = true } = {},
) {
  const key = normalizeUsername(username);
  if (!isValidUsernameSegment(key)) return null;

  if (persistCache) {
    const cached = peekCachedUserMiniProfile(key, cacheHours);
    if (cached && !profileNeedsPosterEnrichment(cached)) return cached;
    // Stale cache with missing poster URLs: fall through and re-enrich.
  }
  if (inFlight.has(key)) return inFlight.get(key);

  const task = (async () => {
    let profile = persistCache
      ? peekCachedUserMiniProfile(key, cacheHours)
      : null;
    if (!profile) {
      const html = await requestProfileHtml(key);
      profile = parseUserMiniProfileHtml(html, key);
    }
    if (!profile?.username) return null;
    await enrichPosterUrls(profile);
    if (persistCache) writeCache(userMiniCacheKey(key), profile);
    return profile;
  })()
    .catch((error) => {
      console.warn('[Letterboxd Plus] Failed to load user mini-profile.', {
        username: key,
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
