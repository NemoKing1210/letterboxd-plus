import { REQUEST_TIMEOUT_MS } from '../constants.js';

const MAX_CONCURRENT_REQUESTS = 3;
const ALLOWED_IMAGE_HOSTS = new Set(['a.ltrbxd.com', 'image.tmdb.org']);

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

function validatedActorUrl(value) {
  const url = new URL(value, window.location.origin);
  if (
    url.origin !== window.location.origin ||
    !url.pathname.startsWith('/actor/')
  ) {
    throw new Error('Invalid Letterboxd actor URL.');
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

async function requestPortrait(actorUrl) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );
  try {
    const response = await fetch(actorUrl.href, {
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
  let actorUrl;
  try {
    actorUrl = validatedActorUrl(value);
  } catch (error) {
    console.warn('[Letterboxd Plus] Invalid actor portrait request.', error);
    return Promise.resolve(null);
  }

  const key = actorUrl.pathname;
  if (portraitCache.has(key)) return Promise.resolve(portraitCache.get(key));
  if (inFlightRequests.has(key)) return inFlightRequests.get(key);

  const request = enqueue(() => requestPortrait(actorUrl))
    .then((portraitUrl) => {
      if (portraitUrl) portraitCache.set(key, portraitUrl);
      return portraitUrl;
    })
    .catch((error) => {
      console.warn('[Letterboxd Plus] Failed to load actor portrait.', {
        actor: key,
        error,
      });
      return null;
    })
    .finally(() => inFlightRequests.delete(key));
  inFlightRequests.set(key, request);
  return request;
}
