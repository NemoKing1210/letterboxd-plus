import { GM_xmlhttpRequest } from '$';
import {
  METACRITIC_API_ORIGIN,
  METACRITIC_ORIGIN,
  REQUEST_TIMEOUT_MS,
} from '../constants.js';
import { readCache, writeCache } from '../cache.js';

const MOVIE_TYPE_ID = 2;
const MAX_YEAR_DIFFERENCE = 1;

function requestJson(url) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Accept: 'application/json',
        Referer: `${METACRITIC_ORIGIN}/`,
      },
      onload: (response) => {
        if (response.status < 200 || response.status >= 300) {
          reject(new Error(`Metacritic returned HTTP ${response.status}.`));
          return;
        }
        try {
          resolve(JSON.parse(response.responseText));
        } catch {
          reject(new Error('Metacritic returned invalid JSON.'));
        }
      },
      onerror: () => reject(new Error('Metacritic request failed.')),
      ontimeout: () => reject(new Error('Metacritic request timed out.')),
    });
  });
}

function normalizeTitle(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function componentData(response, name) {
  return response?.components?.find(
    (component) => component?.meta?.componentName === name,
  )?.data;
}

function findMovie(searchResponse, title, year) {
  const items = componentData(searchResponse, 'search')?.items;
  if (!Array.isArray(items)) return null;

  const expectedTitle = normalizeTitle(title);
  const candidates = items
    .filter(
      (item) =>
        item?.typeId === MOVIE_TYPE_ID &&
        normalizeTitle(item.title) === expectedTitle &&
        typeof item.slug === 'string' &&
        /^[a-z0-9][a-z0-9-]*$/.test(item.slug),
    )
    .map((item) => ({
      ...item,
      yearDifference: Number.isFinite(year)
        ? Math.abs(Number(item.premiereYear) - year)
        : 0,
    }))
    .filter(
      (item) =>
        !Number.isFinite(year) ||
        (Number.isFinite(Number(item.premiereYear)) &&
          item.yearDifference <= MAX_YEAR_DIFFERENCE),
    )
    .sort((left, right) => left.yearDifference - right.yearDifference);

  return candidates[0] || null;
}

function parseScore(item) {
  const score = item?.score;
  const numericScore =
    score === null || score === undefined || score === '' ? null : Number(score);
  return {
    score: Number.isFinite(numericScore) ? numericScore : null,
    count: Math.max(0, Number(item?.reviewCount) || 0),
  };
}

function parseRating(detailResponse, movie) {
  const product = componentData(detailResponse, 'product')?.item;
  if (!product || product.slug !== movie.slug) return null;

  const critics = parseScore(
    componentData(detailResponse, 'critic-score-summary')?.item,
  );
  const users = parseScore(
    componentData(detailResponse, 'user-score-summary')?.item,
  );

  return {
    url: `${METACRITIC_ORIGIN}/movie/${movie.slug}/`,
    criticsScore: critics.score,
    criticsCount: critics.count,
    userScore: users.score,
    userCount: users.count,
  };
}

export async function getMetacriticRating({ cacheHours, key, title, year }) {
  const cacheKey = `metacritic:${key}`;
  const cached = readCache(cacheKey, cacheHours * 60 * 60 * 1000);
  if (cached) return cached;

  const searchUrl =
    `${METACRITIC_API_ORIGIN}/composer/metacritic/pages/search/` +
    `${encodeURIComponent(title)}/web?mcoTypeId=${MOVIE_TYPE_ID}`;
  const searchResponse = await requestJson(searchUrl);
  const movie = findMovie(searchResponse, title, year);
  if (!movie) return null;

  const detailUrl =
    `${METACRITIC_API_ORIGIN}/composer/metacritic/pages/movies/` +
    `${movie.slug}/web`;
  const detailResponse = await requestJson(detailUrl);
  const rating = parseRating(detailResponse, movie);
  if (rating) writeCache(cacheKey, rating);
  return rating;
}
