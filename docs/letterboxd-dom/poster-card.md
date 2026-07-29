# Film poster card DOM map

Reference for Letterboxd **poster cards** used in lists, grids, similar films,
diary, popular, etc. (not the main film page hero poster column).

| | |
|--|--|
| **Where** | Browse / lists / diary / popular / “Similar films” grids |
| **Root** | `.react-component[data-component-class="LazyPoster"]` |
| **Inner** | `.poster.film-poster` |
| **Sample** | *Project Hail Mary* (2026), slug `project-hail-mary` |
| **Captured** | 2026-07-29 (live hover markup) |
| **Consumers** | `src/features/film-mini-profile/posters.js` (slug, title, year, image, user hints) |

Poster metadata for the signed-in member (`data-watched`, likes, etc.) is often
loaded **after** the base page (`data-request-poster-metadata="true"`). Read
relationship attributes at hover time, not only on first paint.

---

## 1. Layout skeleton

```
.react-component[data-component-class="LazyPoster"]   ← React island + film identity
  .poster.film-poster                                 ← image + member relationship attrs
    img.image
    a.frame.has-menu
      span.frame-title
      span.overlay
      span.overlay-actions.-w150
        span.watch-link-target → .watch-link / .icon-watched
        span.like-link-target  → .like-link / .icon-like | .icon-liked
        span.menu-link.icon
```

| Landmark | Selector | Stability |
|----------|----------|-----------|
| LazyPoster island | `.react-component[data-component-class="LazyPoster"]` | high |
| Film identity attrs | `[data-item-slug]`, `[data-item-link]`, `[data-item-name]` | high |
| Visual poster | `.poster.film-poster` | high |
| Member relationship attrs | `.film-poster[data-watched]`, `[data-in-watchlist]` | high (after metadata) |
| Details JSON | `[data-details-endpoint]` → `/film/{slug}/json/` | high |
| Overlay actions | `.overlay-actions` | medium |

---

## 2. Film identity (LazyPoster `data-*`)

| Field | Preferred attribute | Example | Stability |
|-------|---------------------|---------|-----------|
| Slug | `data-item-slug` | `project-hail-mary` | high |
| Relative URL | `data-item-link` / `data-target-link` | `/film/project-hail-mary/` | high |
| Title | `data-item-name` | `Project Hail Mary (2026)` | high |
| Title + year display | `data-item-full-display-name` | same | high |
| Poster image route | `data-poster-url` | `/film/{slug}/image-150/` | high |
| Empty poster placeholder | `data-empty-poster-src` | CDN empty-poster PNG | high |
| Linked? | `data-is-linked` | `"true"` | medium |
| Show poster menu | `data-show-menu` | `"true"` | medium |
| Request member metadata | `data-request-poster-metadata` | `"true"` | high |
| Capabilities | `data-likeable`, `data-watchable`, `data-rateable` | `"true"` | medium |
| Image size | `data-image-width` / `data-image-height` | `150` / `225` | medium |
| Details JSON endpoint | `data-details-endpoint` | `/film/{slug}/json/` | high |

### `data-postered-identifier` / `data-resolvable-poster-path`

JSON (HTML-escaped in the attribute). Same lid/uid shape as film page:

```json
{
  "lid": "pEeQ",
  "uid": "film:611288",
  "type": "film",
  "typeName": "film"
}
```

`data-resolvable-poster-path` also includes `posteredBaseLink`, `isAdultThemed`,
`hasDefaultPoster`, `cacheBustingKey`.

Numeric film id ≈ parse `uid` (`film:611288` → `611288`).

---

## 3. Image

| Field | Preferred source | Fallback | Stability |
|-------|------------------|----------|-----------|
| Poster URL | `img.image[src]` (skip empty-poster) | `srcset` 2x / `data-src` | high |
| Alt text | `img[alt]` | often `Poster for {title}` | medium |

Offline / pre-metadata captures may still show `data-empty-poster-src`. Prefer a
real `img.image` src that does not match `/empty-poster/i`.

---

## 4. Member relationship (signed-in)

Loaded asynchronously when `data-request-poster-metadata="true"`. After load,
relationship flags appear on the **inner** `.film-poster` (not always on LazyPoster).

| Field | Preferred source | Fallback | Stability |
|-------|------------------|----------|-----------|
| Watched | `.film-poster[data-watched="true\|false"]` | `.icon-watched` / “You watched this film” | high |
| In watchlist | `.film-poster[data-in-watchlist="true\|false"]` | watchlist overlay `-on` class | high |
| Liked | `data-liked` / `data-is-liked` (when present) | `.icon-liked` vs `.icon-like` | medium |
| Personal rating | `.rating.rated-{n}` (n = 1…10 half-stars) | film JSON / film page | medium |

### Overlay action markup (sample)

```html
<span class="overlay-actions -w150">
  <span class="watch-link-target">
    <span class="watch-link">
      <span class="has-icon icon-16 icon-watched">
        <span class="icon"></span>You watched this film
      </span>
    </span>
  </span>
  <span class="like-link-target">
    <span class="has-icon icon-16 like-link icon-like">
      <span class="icon"></span>
    </span>
  </span>
  <span class="replace menu-link icon"></span>
</span>
```

| Signal | Liked | Not liked |
|--------|-------|-----------|
| Like icon class | `icon-liked` | `icon-like` |

Hover frame color (site UX, not required for parsing): green ≈ watched,
blue ≈ watchlist, white ≈ neither (see Letterboxd help). Watchlist blue can
override watched green visually.

---

## 5. Frame / link

| Field | Selector | Stability |
|-------|----------|-----------|
| Film link | `a.frame[href*="/film/"]` | high |
| Tooltip title | `a.frame[data-original-title]` | medium |
| Visible title | `span.frame-title` | medium |

---

## 6. Mini-profile field cheat sheet

What `parsePosterUserHints` / `markPoster` can take from the card vs film page:

| Mini-card field | On poster card? | Primary path |
|-----------------|-----------------|--------------|
| `slug` | yes | `data-item-slug` |
| `title` / `year` | yes | `data-item-full-display-name` |
| `posterUrl` | yes | `img.image[src]` |
| `user.watched` | yes (after metadata) | `data-watched` / `.icon-watched` |
| `user.inWatchlist` | yes (after metadata) | `data-in-watchlist` |
| `user.liked` | sometimes | `.icon-liked` / `data-liked` |
| `user.rating` | sometimes (diary / rated grids) | `.rating.rated-{n}` |
| Community rating, cast, tagline, … | no | fetch `/film/{slug}/` |
| Full relationship + rating | partial | `/film/{slug}/json/` via `data-details-endpoint` |

**Used by:** `src/features/film-mini-profile/posters.js` → `userHint` merged into
mini-card user state before/with film-page fetch.

---

## 7. Recommended read order (hover mini-card)

1. Resolve poster: closest `LazyPoster[data-item-slug]` or `.film-poster`.
2. Identity: slug, title, year, image from LazyPoster / img.
3. Member hints from `.film-poster` attrs + overlay icons (if present).
4. Enrich from film HTML / JSON as needed (community data, missing rating).

Do not treat empty overlay shells (no `data-watched` yet) as `watched: false`.

---

## 8. Caveats

- Member metadata arrives late; re-read attrs on hover, not only at decorate time.
- Nested match: both LazyPoster and inner `.film-poster` match
  `POSTER_SELECTOR` — prefer the hovered/closest node and walk both for attrs.
- `data-watched="false"` is definitive; missing attribute means “unknown”, not false.
- Rating class `rated-8` means **4.0★** (half-star integer 1–10).
- Guest sessions omit relationship attrs; overlay may still show generic controls.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-29 | Initial map from *Project Hail Mary* poster card markup |
