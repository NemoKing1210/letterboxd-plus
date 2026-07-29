import {
  FILM_POSTER_SKIP_ANCESTOR,
} from '../../core/constants.js';
import {
  FMP_SKIP,
  HOVER_ATTR,
  MARK_ATTR,
  POSTER_SELECTOR,
  PRELOAD_ATTR,
} from './constants.js';
import { state } from './state.js';

export function parsePosterSlug(poster) {
  const roots = [
    poster,
    poster.closest?.('.react-component[data-component-class="LazyPoster"]'),
    poster.closest?.('[data-item-slug], [data-film-slug], [data-item-link]'),
    poster.querySelector?.('[data-item-slug], [data-film-slug], [data-item-link]'),
  ].filter(Boolean);

  for (const root of roots) {
    const slug =
      root.getAttribute?.('data-item-slug') ||
      root.getAttribute?.('data-film-slug') ||
      '';
    if (slug) return slug.trim().toLowerCase();

    const link =
      root.getAttribute?.('data-item-link') ||
      root.getAttribute?.('data-target-link') ||
      '';
    const fromLink = link.match(/\/film\/([^/?#]+)/i);
    if (fromLink) return fromLink[1].toLowerCase();
  }

  const anchor =
    poster.closest?.('a[href*="/film/"]') ||
    poster.querySelector?.('a[href*="/film/"]');
  const href = anchor?.getAttribute?.('href') || '';
  const match = href.match(/\/film\/([^/?#]+)/i);
  return match ? match[1].toLowerCase() : '';
}

export function parsePosterTitle(poster, slug) {
  const roots = [
    poster,
    poster.closest?.('.react-component[data-component-class="LazyPoster"]'),
    poster.querySelector?.('[data-item-name], [data-item-full-display-name]'),
  ].filter(Boolean);

  for (const root of roots) {
    const name =
      root.getAttribute?.('data-item-full-display-name') ||
      root.getAttribute?.('data-item-name') ||
      '';
    if (name) return name.replace(/\s+\(\d{4}\)\s*$/, '').trim() || name.trim();
  }

  const img = poster.querySelector?.('img[alt]');
  if (img?.alt) {
    return img.alt.replace(/\s+\(\d{4}\)\s*$/, '').trim() || img.alt.trim();
  }
  return slug ? slug.replace(/-/g, ' ') : '';
}

export function parsePosterYear(poster) {
  const roots = [
    poster,
    poster.closest?.('.react-component[data-component-class="LazyPoster"]'),
    poster.querySelector?.('[data-item-name], [data-item-full-display-name]'),
  ].filter(Boolean);
  for (const root of roots) {
    const name =
      root.getAttribute?.('data-item-full-display-name') ||
      root.getAttribute?.('data-item-name') ||
      '';
    const match = name.match(/\((\d{4})\)\s*$/);
    if (match) return Number(match[1]);
  }
  return null;
}

export function posterImgUrl(poster) {
  const img = poster?.querySelector?.('img');
  const src = (
    img?.getAttribute?.('src') ||
    img?.getAttribute?.('data-src') ||
    ''
  ).trim();
  if (!src || /empty-poster/i.test(src)) return '';
  return src;
}

function readBoolAttr(el, name) {
  if (!el?.getAttribute) return null;
  const raw = el.getAttribute(name);
  if (raw == null) return null;
  const value = String(raw).trim().toLowerCase();
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return null;
}

function posterRoots(poster) {
  const lazy = poster.closest?.(
    '.react-component[data-component-class="LazyPoster"]',
  );
  const filmPoster =
    poster.matches?.('.poster.film-poster, .film-poster')
      ? poster
      : poster.querySelector?.('.poster.film-poster, .film-poster') ||
        poster.closest?.('.poster.film-poster, .film-poster');
  return [...new Set([poster, lazy, filmPoster].filter(Boolean))];
}

function parsePosterLiked(root) {
  const likedAttr =
    readBoolAttr(root, 'data-liked') ?? readBoolAttr(root, 'data-is-liked');
  if (likedAttr != null) return likedAttr;

  if (
    root.querySelector?.(
      '.icon-liked, .like-link.icon-liked, .like-link.-on, .has-icon.icon-liked',
    )
  ) {
    return true;
  }

  // Only treat bare icon-like as "not liked" once member metadata is present.
  const metadataLoaded = Boolean(
    root.hasAttribute?.('data-watched') ||
      root.hasAttribute?.('data-in-watchlist') ||
      root.querySelector?.('[data-watched], [data-in-watchlist]'),
  );
  if (
    metadataLoaded &&
    root.querySelector?.(
      '.like-link.icon-like, .has-icon.icon-like, .like-link-target .like-link',
    )
  ) {
    return false;
  }
  return null;
}

function parsePosterWatched(root) {
  const watchedAttr = readBoolAttr(root, 'data-watched');
  if (watchedAttr != null) return watchedAttr;

  if (
    root.querySelector?.(
      '.icon-watched, .watch-link .icon-watched, .has-icon.icon-watched',
    )
  ) {
    return true;
  }
  return null;
}

function parsePosterWatchlist(root) {
  const attr = readBoolAttr(root, 'data-in-watchlist');
  if (attr != null) return attr;
  if (
    root.querySelector?.(
      '.icon-watchlist.-on, .watchlist-link.-on, .has-icon.icon-watchlist.-on',
    )
  ) {
    return true;
  }
  return null;
}

function parsePosterRating(root) {
  const rated = root.querySelector?.(
    '.rating[class*="rated-"], .poster-viewingdata .rating[class*="rated-"], [class*="rated-"]',
  );
  const className = rated?.className || '';
  const match = String(className).match(/\brated-(\d+)\b/);
  if (!match) return null;
  const half = Number(match[1]);
  if (!Number.isFinite(half) || half <= 0) return null;
  // Letterboxd poster ratings use 1–10 half-star steps → 0.5–5 stars.
  return Math.max(0.5, Math.min(5, half / 2));
}

/**
 * Instant user relationship hints from a list/grid poster card.
 * Used to paint mini-card status before / without a film-page fetch.
 */
export function parsePosterUserHints(poster) {
  const roots = posterRoots(poster);
  let watched = null;
  let liked = null;
  let inWatchlist = null;
  let rating = null;

  for (const root of roots) {
    if (watched == null) watched = parsePosterWatched(root);
    if (liked == null) liked = parsePosterLiked(root);
    if (inWatchlist == null) inWatchlist = parsePosterWatchlist(root);
    if (rating == null) rating = parsePosterRating(root);
  }

  if (
    watched == null &&
    liked == null &&
    inWatchlist == null &&
    rating == null
  ) {
    return null;
  }

  return { watched, liked, inWatchlist, rating };
}

export function clearPosterMark(poster) {
  if (!poster?.removeAttribute) return;
  poster.removeAttribute(MARK_ATTR);
  poster.removeAttribute(HOVER_ATTR);
  poster.removeAttribute(PRELOAD_ATTR);
}

export function isEligiblePoster(poster) {
  if (!poster || poster.nodeType !== 1) return false;
  if (poster.closest(FMP_SKIP)) return false;
  if (poster.closest(FILM_POSTER_SKIP_ANCESTOR)) return false;
  if (
    !poster.matches?.(POSTER_SELECTOR) &&
    !poster.classList?.contains('film-poster')
  ) {
    return false;
  }
  return Boolean(parsePosterSlug(poster));
}

export function markPoster(poster) {
  if (!isEligiblePoster(poster)) {
    clearPosterMark(poster);
    return null;
  }
  const slug = parsePosterSlug(poster);
  if (!slug) {
    clearPosterMark(poster);
    return null;
  }
  poster.setAttribute(MARK_ATTR, '1');
  return {
    poster,
    slug,
    title: parsePosterTitle(poster, slug),
    year: parsePosterYear(poster),
    posterHint: posterImgUrl(poster),
    userHint: parsePosterUserHints(poster),
  };
}

export function clearAllPosterMarks() {
  state.profileFetches.clear();
  state.userStateFetches.clear();
  document
    .querySelectorAll(`[${MARK_ATTR}], [${HOVER_ATTR}], [${PRELOAD_ATTR}]`)
    .forEach((el) => clearPosterMark(el));
}
