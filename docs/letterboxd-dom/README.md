# Letterboxd DOM reference

Canonical notes on how Letterboxd pages expose data in the DOM.
Use these docs when extending the userscript (mini film card, cast UI,
ratings sidebar, etc.) so agents and humans know **what can be read** and
**which selectors are stable**.

## How to use

1. Find the page type below.
2. Open its markdown file for field → selector / attribute maps.
3. Prefer **IDs**, **`data-*` attributes**, and **semantic URL patterns**
   (`/film/…`, `/actor/…`, `/films/genre/…`) over cosmetic class names.
4. Prefer **JSON-LD** (`application/ld+json`) and **meta tags** when the
   visual DOM is lazy-loaded or empty in saved HTML.
5. Cross-check live Letterboxd if a selector fails — the site evolves.

## Page catalog

| Page | URL pattern | Doc | Status |
|------|-------------|-----|--------|
| Film | `/film/{slug}/` | [film-page.md](./film-page.md) | Documented |
| Review / viewing | `/{username}/film/{slug}/` | [review-page.md](./review-page.md) | Documented |
| Member profile | `/{username}/` | [profile-page.md](./profile-page.md) | Documented |
| Film poster card | lists / grids / similar | [poster-card.md](./poster-card.md) | Documented |
| Film cast (tab / deep link) | `/film/{slug}/cast/` | Same tabs as film page | Covered in film-page |
| Film crew | `/film/{slug}/crew/` | Same | Covered in film-page |
| Film details | `/film/{slug}/details/` | Same | Covered in film-page |
| Film genres | `/film/{slug}/genres/` | Same | Covered in film-page |
| Film releases | `/film/{slug}/releases/` | Same | Covered in film-page |
| Film JSON | `/film/{slug}/json/` | Mentioned in film-page / poster-card | Endpoint only |
| List / diary / search | — | — | TODO (send HTML) |

## Conventions in these docs

| Column | Meaning |
|--------|---------|
| **Field** | Logical data useful to the script |
| **Preferred source** | Most reliable place to read first |
| **Fallback** | Secondary source if preferred is missing |
| **Stability** | `high` / `medium` / `low` for selector longevity |
| **Used by** | Existing Letterboxd Plus module, if any |

### Stability guide

- **high** — `id`, `data-component-class`, `meta[name|property]`, JSON-LD `@type`, `href` path prefixes.
- **medium** — Letterboxd BEM-like classes that appear across many pages (`text-slug`, `production-statistic`, `averagerating`).
- **low** — Layout / presentational classes (`col-6`, `-spaced-loose`), inline styles, generated React ids.

## Related project docs

- [`AGENTS.md`](../../AGENTS.md) — architecture and agent rules
- [`DESIGN.md`](../../DESIGN.md) — visual tokens for injected UI
- `src/api/film-profile.js` — current film HTML/JSON parsers
- `src/features/film-mini-profile/` — mini card consumers
- `src/features/film-mini-profile/posters.js` — poster card identity + user hints
- `src/features/ratings/` — film sidebar rating mounts
- `src/features/cast/` — cast list enhancement
- `src/features/translate/` — synopsis, review cards, review page body + comments

## Adding a new page

When the user provides a saved Letterboxd HTML page:

1. Identify `body[data-type]` (and related `data-*` on `body`).
2. Inventory stable `id`s, `data-component-class` values, metas, JSON-LD.
3. Add or update a page file under this folder.
4. Link it from this README table.
5. Note sample film/page and capture date in the page doc footer.
