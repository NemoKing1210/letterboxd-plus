import { REQUEST_TIMEOUT_MS } from '../core/constants.js';
import { readCache, writeCache } from '../core/cache.js';

const DESC_MAX = 180;
const DIRECTORS_MAX = 4;
const GENRES_MAX = 8;
const inFlight = new Map();

export function filmMiniCacheKey(slug) {
  return `film:mini:${String(slug || '')
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

function truncateText(value) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= DESC_MAX) return text;
  return `${text.slice(0, DESC_MAX - 1).trimEnd()}…`;
}

function readJsonLd(doc) {
  for (const script of doc.querySelectorAll(
    'script[type="application/ld+json"]',
  )) {
    try {
      const raw = script.textContent?.replace(/^\s*\/\*\s*<!\[CDATA\[\s*/, '')
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
  if (jsonLd?.datePublished) {
    const match = String(jsonLd.datePublished).match(/\b(19|20)\d{2}\b/);
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

function parseRating(jsonLd) {
  const value = Number(jsonLd?.aggregateRating?.ratingValue);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.max(0, Math.min(5, Math.round(value * 100) / 100));
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

function parseDescription(doc, jsonLd) {
  const truncate = doc.querySelector('.truncate[data-truncate] p, .truncate p');
  const fromDom = truncateText(textOf(truncate));
  if (fromDom) return fromDom;
  return truncateText(jsonLd?.description || '');
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
  const canon = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
  const match = canon.match(/\/film\/([^/?#]+)/i);
  return match ? match[1].toLowerCase() : '';
}

export function parseFilmMiniProfileDoc(doc, slugHint = '') {
  if (!doc) return null;
  const jsonLd = readJsonLd(doc);
  const slug = resolveSlug(doc, slugHint);
  const title = parseTitle(doc, jsonLd) || (slug ? slug.replace(/-/g, ' ') : '');
  if (!slug && !title) return null;
  if (!slug) return null;

  return {
    slug,
    title,
    year: parseYear(doc, jsonLd),
    posterUrl: parsePosterUrl(doc, jsonLd),
    rating: parseRating(jsonLd),
    directors: parseDirectors(doc, jsonLd),
    genres: parseGenres(doc),
    description: parseDescription(doc, jsonLd),
    tmdbId: parseTmdbId(doc),
    filmUrl: `/film/${encodeURIComponent(slug)}/`,
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
    writeCache(filmMiniCacheKey(key), profile);
    return profile;
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
