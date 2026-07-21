import { GM_xmlhttpRequest } from '$';
import {
  REQUEST_TIMEOUT_MS,
  ROTTEN_TOMATOES_ORIGIN,
} from '../constants.js';
import { readCache, writeCache } from '../cache.js';

function requestText(url) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
      onload: (response) => {
        if (response.status >= 200 && response.status < 300) {
          resolve(response.responseText);
          return;
        }
        reject(new Error(`Rotten Tomatoes returned HTTP ${response.status}.`));
      },
      onerror: () => reject(new Error('Rotten Tomatoes request failed.')),
      ontimeout: () => reject(new Error('Rotten Tomatoes request timed out.')),
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

function readCandidate(row) {
  const anchor = row.matches('a[href]') ? row : row.querySelector('a[href]');
  const title =
    row.getAttribute('title') ||
    row.getAttribute('name') ||
    row.querySelector('[data-qa*="title"], [slot="title"]')?.textContent ||
    anchor?.textContent ||
    '';
  const href = row.getAttribute('url') || anchor?.getAttribute('href') || '';
  const year = Number(row.getAttribute('release-year'));

  return {
    row,
    title: title.trim(),
    normalizedTitle: normalizeTitle(title),
    year: Number.isFinite(year) ? year : null,
    href,
  };
}

function findMovieUrl(html, title, year) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const rows = [
    ...document.querySelectorAll(
      'search-page-media-row, [tomatometer-score][release-year], [release-year] a[href*="/m/"]',
    ),
  ];
  const candidates = rows.map((row) => readCandidate(row.closest('[release-year]') || row));
  const expectedTitle = normalizeTitle(title);
  const exact = candidates.find(
    (candidate) =>
      candidate.year === year && candidate.normalizedTitle === expectedTitle,
  );
  const sameYear = candidates.find((candidate) => candidate.year === year);
  const sameTitle = candidates.find(
    (candidate) => candidate.normalizedTitle === expectedTitle,
  );
  const match = exact || sameYear || sameTitle || candidates[0];

  if (!match?.href) return null;
  return new URL(match.href, ROTTEN_TOMATOES_ORIGIN).href;
}

function parseScorecard(html, url) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const raw = document.querySelector('#media-scorecard-json')?.textContent;
  if (!raw) return null;

  const scorecard = JSON.parse(raw);
  const critics = scorecard.criticsScore || {};
  const audience = scorecard.audienceScore || {};
  const criticsScore = Number(critics.score);
  const audienceScore = Number(audience.score);

  return {
    url,
    criticsScore: Number.isFinite(criticsScore) ? criticsScore : null,
    audienceScore: Number.isFinite(audienceScore) ? audienceScore : null,
    isCertifiedFresh: critics.certified === true,
    criticsCount: Number(critics.reviewCount || critics.ratingCount) || 0,
    audienceCount: Number(audience.reviewCount || audience.ratingCount) || 0,
  };
}

export async function getRottenTomatoesRating({ cacheHours, key, title, year }) {
  const cached = readCache(key, cacheHours * 60 * 60 * 1000);
  if (cached) return cached;

  const query = encodeURIComponent(`${title} ${year || ''}`.trim());
  const searchHtml = await requestText(
    `${ROTTEN_TOMATOES_ORIGIN}/search?search=${query}`,
  );
  const movieUrl = findMovieUrl(searchHtml, title, year);
  if (!movieUrl) return null;

  const movieHtml = await requestText(movieUrl);
  const rating = parseScorecard(movieHtml, movieUrl);
  if (rating) writeCache(key, rating);
  return rating;
}
