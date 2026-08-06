import { REQUEST_TIMEOUT_MS } from '../core/constants.js';
import { readCache, writeCache } from '../core/cache.js';
import {
  isValidUsernameSegment,
  normalizeUsername,
} from '../utils/letterboxd-username.js';

const BIO_MAX = 180;
const LOCATION_MAX = 80;

const inFlight = new Map();

export function userMiniCacheKey(username) {
  return `user:mini:v1:${normalizeUsername(username)}`;
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
    if (cached) return cached;
  }
  if (inFlight.has(key)) return inFlight.get(key);

  const task = (async () => {
    const html = await requestProfileHtml(key);
    const profile = parseUserMiniProfileHtml(html, key);
    if (!profile?.username) return null;
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
