export const HOVER_ATTR = 'data-lbp-fmp-hover';
export const MARK_ATTR = 'data-lbp-fmp';
export const PRELOAD_ATTR = 'data-lbp-fmp-preload';
export const POPOVER_ID = 'lbp-film-mini-profile';
/** Native Letterboxd posters on the page. */
export const PAGE_POSTER_SELECTOR =
  '.react-component[data-component-class="LazyPoster"][data-item-slug], .film-poster';
/** Favorite/recent thumbs inside the user mini-profile card. */
export const UMP_POSTER_SELECTOR = 'a.lbp-ump__poster:not(.is-skeleton)';
export const POSTER_SELECTOR = `${PAGE_POSTER_SELECTOR}, ${UMP_POSTER_SELECTOR}`;
/** Skip FMP chrome / settings; UMP posters are intentionally eligible. */
export const FMP_SKIP = `#${POPOVER_ID}, .lbp-fmp, .lbp-settings-backdrop`;
export const UMP_POPOVER_SELECTOR = '#lbp-user-mini-profile, .lbp-ump';
