/**
 * First path segments that are never Letterboxd member profile homes.
 * Shared by person-credit URL validation and user mini-profile targets.
 */
export const RESERVED_ROOT_SEGMENTS = Object.freeze(
  new Set([
    'about',
    'actor',
    'activity',
    'api',
    'apps',
    'crew',
    'film',
    'films',
    'genre',
    'genres',
    'invite',
    'journal',
    'list',
    'lists',
    'members',
    'news',
    'pro',
    'reviews',
    'search',
    'settings',
    'sign-in',
    'sign-up',
    'stories',
    'studio',
    'studios',
    'tag',
    'tags',
    'theme',
    'themes',
    'user',
    'users',
    'welcome',
    'writer',
    'year',
    'years',
  ]),
);

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/i;

/**
 * Normalize a candidate username handle.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/**
 * Whether a single path segment can be a member username.
 * @param {string} segment
 * @returns {boolean}
 */
export function isValidUsernameSegment(segment) {
  const key = normalizeUsername(segment);
  if (!key || key.length > 30) return false;
  if (RESERVED_ROOT_SEGMENTS.has(key)) return false;
  return USERNAME_RE.test(key);
}

/**
 * Extract a member username from a profile-home URL / path.
 * Only exact `/{username}/` (single segment) qualifies — not reviews,
 * diary, films tabs, etc.
 * @param {string} hrefOrPath
 * @param {string} [base]
 * @returns {string} lowercase username or ''
 */
export function usernameFromProfileHref(hrefOrPath, base = window.location.origin) {
  const raw = String(hrefOrPath || '').trim();
  if (!raw || raw.startsWith('#') || raw.startsWith('javascript:')) return '';

  try {
    const url = new URL(raw, base);
    if (url.origin !== window.location.origin) return '';
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 1) return '';
    return isValidUsernameSegment(parts[0]) ? normalizeUsername(parts[0]) : '';
  } catch {
    return '';
  }
}

/**
 * Read a username hint from nearby Letterboxd data attributes.
 * @param {Element | null | undefined} el
 * @returns {string}
 */
export function usernameFromDataAttrs(el) {
  if (!el || el.nodeType !== 1) return '';
  const candidates = [
    el.getAttribute?.('data-person'),
    el.getAttribute?.('data-owner'),
    el.getAttribute?.('data-username'),
    el.closest?.('[data-person]')?.getAttribute('data-person'),
    el.closest?.('[data-owner]')?.getAttribute('data-owner'),
    el.closest?.('[data-username]')?.getAttribute('data-username'),
  ];
  for (const candidate of candidates) {
    const key = normalizeUsername(candidate);
    if (isValidUsernameSegment(key)) return key;
  }
  return '';
}
