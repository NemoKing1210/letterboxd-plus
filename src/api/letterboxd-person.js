import { REQUEST_TIMEOUT_MS } from '../core/constants.js';

const MAX_CONCURRENT_REQUESTS = 3;
const ALLOWED_IMAGE_HOSTS = new Set(['a.ltrbxd.com', 'image.tmdb.org']);

/**
 * First path segments that are never Letterboxd person credit pages
 * (`/actor/{slug}/`, `/director/{slug}/`, `/writer/{slug}/`, …).
 * Do not reuse member-username reserved roots here: those intentionally
 * include credit types like `actor` / `writer` / `crew`.
 */
const NON_PERSON_ROOTS = new Set([
  'about',
  'activity',
  'api',
  'apps',
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
  'year',
  'years',
]);

const portraitCache = new Map();
const inFlightRequests = new Map();
const requestQueue = [];
let activeRequestCount = 0;

function drainQueue() {
  while (
    activeRequestCount < MAX_CONCURRENT_REQUESTS &&
    requestQueue.length > 0
  ) {
    const { task, resolve, reject } = requestQueue.shift();
    activeRequestCount += 1;
    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        activeRequestCount -= 1;
        drainQueue();
      });
  }
}

function enqueue(task) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ task, resolve, reject });
    drainQueue();
  });
}

function validatedPersonUrl(value) {
  const url = new URL(value, window.location.origin);
  const parts = url.pathname.split('/').filter(Boolean);
  const root = parts[0]?.toLowerCase() || '';
  if (
    url.origin !== window.location.origin ||
    parts.length !== 2 ||
    NON_PERSON_ROOTS.has(root) ||
    !/^[a-z0-9-]+$/i.test(parts[0]) ||
    !/^[a-z0-9-]+$/i.test(parts[1])
  ) {
    throw new Error('Invalid Letterboxd person URL.');
  }
  return url;
}

function parsePortraitUrl(html) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const rawUrl = document.querySelector('.js-tmdb-person[data-image]')?.dataset
    .image;
  if (!rawUrl) return null;

  const url = new URL(rawUrl, window.location.origin);
  if (url.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.has(url.hostname)) {
    return null;
  }
  return url.href;
}

async function requestPortrait(personUrl) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );
  try {
    const response = await fetch(personUrl.href, {
      cache: 'default',
      credentials: 'same-origin',
      headers: { Accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Letterboxd returned HTTP ${response.status}.`);
    }
    return parsePortraitUrl(await response.text());
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function getLetterboxdPersonPortrait(value) {
  let personUrl;
  try {
    personUrl = validatedPersonUrl(value);
  } catch (error) {
    console.warn('[Letterboxd Plus] Invalid person portrait request.', error);
    return Promise.resolve(null);
  }

  const key = personUrl.pathname;
  if (portraitCache.has(key)) return Promise.resolve(portraitCache.get(key));
  if (inFlightRequests.has(key)) return inFlightRequests.get(key);

  const request = enqueue(() => requestPortrait(personUrl))
    .then((portraitUrl) => {
      if (portraitUrl) portraitCache.set(key, portraitUrl);
      return portraitUrl;
    })
    .catch((error) => {
      console.warn('[Letterboxd Plus] Failed to load person portrait.', {
        person: key,
        error,
      });
      return null;
    })
    .finally(() => inFlightRequests.delete(key));
  inFlightRequests.set(key, request);
  return request;
}
