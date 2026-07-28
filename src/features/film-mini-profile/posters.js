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
  };
}

export function clearAllPosterMarks() {
  state.profileFetches.clear();
  document
    .querySelectorAll(`[${MARK_ATTR}], [${HOVER_ATTR}], [${PRELOAD_ATTR}]`)
    .forEach((el) => clearPosterMark(el));
}
