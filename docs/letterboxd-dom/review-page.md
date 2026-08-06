# Review page DOM map

Reference for Letterboxd **standalone review / viewing** pages
(`/{username}/film/{slug}/`).

Distinct from the film page (`/film/{slug}/`): one member’s log/review for a
film, with comments and a film poster sidebar. Review *cards* on the film page
are covered in [film-page.md](./film-page.md) §13 (`article.production-viewing`).

| | |
|--|--|
| **URL** | `https://letterboxd.com/{username}/film/{slug}/` |
| **`body` markers** | Live-verify `body[data-type]` (not in `#content`-only captures) |
| **Sample** | eely → *On the Waterfront* (1954), slug `on-the-waterfront`, viewing `69042779` |
| **Captured** | 2026-08-07 (main `#content` fragment) |
| **Consumers** | `src/features/translate/` (review body + comments) |

Fragment deep-links: `#comments`, `#comment-{id}`.

---

## 1. Page identity

| Field | Preferred source | Fallback | Stability | Notes |
|-------|------------------|----------|-----------|-------|
| Page kind | URL `/{username}/film/{slug}/` | presence of `section.col-12.review.js-review` | high | Not `/film/{slug}/` |
| Author username | `.person-summary a.name[href^="/"]` path | `data-owner` on poster / like / comments | high | e.g. `eely` |
| Film slug | LazyPoster `[data-item-slug]` | masthead `a[href^="/film/"]` | high | e.g. `on-the-waterfront` |
| Film uid / lid | LazyPoster `data-postered-identifier` JSON | sidebar `data-watchable` / `data-likeable-identifier` (film) | high | e.g. `film:51470`, lid `29TC` |
| Viewing uid | `section.viewing-poster-container[data-object-id]` | review LikeComponent `data-likeable-identifier` → `uid` | high | e.g. `viewing:69042779` |
| Viewing lid | LikeComponent / share `boxd.it/{lid}` | `#url-field-viewing-{numericId}` nearby | high | e.g. `KIXO7` |
| Object name | `[data-object-name="review"]` on poster container | — | high | Confirms review (vs bare log) |
| Numeric viewing id | parse `viewing:{id}` | `#url-field-viewing-{id}`, `#sharing-toggle-body-viewing-{id}` | high | |

### Viewing / film identifier shapes

Poster container:

```html
<section
  class="… viewing-poster-container"
  data-owner="eely"
  data-object-id="viewing:69042779"
  data-object-name="review"
>
```

Like (review):

```json
{
  "lid": "KIXO7",
  "uid": "viewing:69042779",
  "type": "viewing",
  "typeName": "review"
}
```

Film islands (sidebar / poster) reuse the same film shape as [film-page.md](./film-page.md)
(`type` / `typeName`: `film`).

---

## 2. Layout skeleton

```
#content.site-body
  .content-wrap
    .cols-2
      section.section.col-17.col-main
        .col-4                     ← poster + where-to-watch
          section.viewing-poster-container
            [data-component-class="LazyPoster"]
          section.watch-panel.js-watch-panel
        section.col-12.review.js-review
          section.film-viewing-info-wrapper   ← author, title, rating, date
          .review → .body-text → .js-review-body
          .viewing-actions / .review-actions
          ul.tags
          section.liked-reviews                 ← optional
          #comments.js-comments-panel
      aside.sidebar
        #userpanel.actions-panel
        section … author’s other films
```

| Landmark | Selector | Stability |
|----------|----------|-----------|
| Main column | `section.col-17.col-main` | medium (layout) |
| Review column | `section.col-12.review.js-review` | high (`js-review`) |
| Poster column | `section.viewing-poster-container` | high |
| Comments panel | `#comments` | high |
| Sidebar | `aside.sidebar` | high |
| User actions | `#userpanel` / `ul.js-actions-panel` | high |

---

## 3. Film poster (left column)

Same LazyPoster contract as [poster-card.md](./poster-card.md) / film page.

| Field | Preferred source | Stability |
|-------|------------------|-----------|
| Poster island | `.viewing-poster-container [data-component-class="LazyPoster"]` | high |
| Slug / name / link | `data-item-slug`, `data-item-name`, `data-item-link` | high |
| Details JSON | `data-details-endpoint` → `/film/{slug}/json/` | high |
| Target link | `data-target-link` | high | Usually `/film/{slug}/` |
| Image | `img.image[src]` (skip `empty-poster`) | high |

---

## 4. Where to watch

| Field | Selector | Stability |
|-------|----------|-----------|
| Panel | `section.watch-panel.js-watch-panel` | high |
| Trailer | `.js-watch-panel-trailer a.js-video-zoom[href]` | high |
| Services | `#watch section.services p.service` | medium |
| All services | `a.js-film-availability-link` | high |

Availability is film-scoped (same film as the review), not viewing-specific.

---

## 5. Review header (author, film, rating, date)

**Root:** `section.film-viewing-info-wrapper` inside `section.js-review`.

| Field | Preferred selector | Fallback | Stability |
|-------|--------------------|----------|-----------|
| Author avatar | `.person-summary a.avatar img` | — | high |
| Author name | `.person-summary h1 a.name` | `data-owner` | high |
| “Review by” chrome | `small.context` | — | medium |
| Film title | `.inline-production-masthead .primaryname a[href^="/film/"]` | LazyPoster name | high |
| Year | `.releasedate a[href*="/films/year/"]` | year in title text | high |
| Star rating | `.content-reactions-strip .inline-rating svg[aria-label]` | SVG `<title>` | high | e.g. `★★★` |
| Watch date | `.view-date a[href*="/diary/for/"]` | — | high | Day / month / year links |

Masthead here is `.inline-production-masthead`, **not** `section.production-masthead`
from the film page.

---

## 6. Review body

| Field | Preferred selector | Notes | Stability |
|-------|--------------------|-------|-----------|
| Prose wrap | `.body-text.-prose` inside `.review` | — | medium |
| Translatable body | `.js-review-body` | Also `[data-is-translatable="true"]` | high |
| Language | `.js-review-body[lang]` | BCP-47, e.g. `en` | high |
| Full text URL | `data-full-text-url` on body | Same-origin expand when truncated | high |
| Hidden SEO heading | `h3.hidden` | “{user}’s review published on Letterboxd:” | low |

Unlike film-page cards (`article.production-viewing`), the standalone page uses
`section.col-12.review.js-review` as the host. Prefer `.js-review-body` over
layout classes.

**Used by:** `src/features/translate/` (kind `review`).

---

## 7. Actions and tags

| Field | Preferred selector | Notes | Stability |
|-------|--------------------|-------|-----------|
| Actions wrap | `.viewing-actions` | — | high |
| Like / review actions | `.review-actions` | Nested under viewing-actions | high |
| Like island | `[data-component-class="LikeComponent"]` with viewing identifier | `data-count`, `data-likes-page` | high |
| Report / block | `.block-flag-wrapper` | Owner-hidden | medium |
| Tags | `ul.tags li a[href*="/tag/"]` | Member tag film links | high |

---

## 8. Liked these reviews (optional)

| Field | Selector | Stability |
|-------|----------|-----------|
| Section | `section.liked-reviews.film-rating-group` | medium |
| List | `#liked-reviews` | high |
| Item | `li.listitem a.watchedstate-avatar` | medium |
| Linked review | `a[href*="/film/"]` under member path | high |
| Nano rating | `.rating.-nano` | medium |

---

## 9. Comments

**Root:** `#comments.comments-panel.js-comments-panel`

| Field | Preferred source | Stability | Notes |
|-------|------------------|-----------|-------|
| Comments AJAX | `#comments[data-url]` | high | `/ajax/viewing:{id}/comments/` |
| Reports URLs | `data-reports-url`, `data-report-url` | high | |
| Heading | `#comments h2.section-heading` | medium | “N Comments”; `data-comments-link` |
| Subscribe | `#join-audience` / `.button-subscribe` | medium | |
| List | `ul.comment-list.js-comment-list` | high | `data-commentable-type="review"`, `data-owner`, `data-num-comments` |

### Comment item

| Field | Preferred selector | Stability | Notes |
|-------|--------------------|-----------|-------|
| Item | `li.comment` | high | `id="comment-{id}"` |
| Comment id | `data-comment-id` | high | Also in `id` |
| Author | `data-person` | high | Username |
| Edit / delete | `data-edit-url`, `data-delete-url` | high | Logged-in owner |
| Timestamps | `data-creation-timestamp`, `data-timestamp` | high | ms epoch |
| Author UI | `.js-comment-person` | high | Avatar + name |
| Permalink | `a.comment-permalink[href*="#comment-"]` | high | |
| Time | `time[datetime]` | high | ISO |
| Body | `.comment-body` | high | Often `.body-text.-small.js-collapsible-text` |
| Full text | `.comment-body[data-full-text-url]` | high | `/s/full-text/viewingComment:{id}/` |

### Compose

| Field | Selector | Stability |
|-------|----------|-----------|
| Form wrap | `#comment-form` | high |
| Form | `#post-comment-form` | high | `action="/s/viewing:{id}/add-comment"` |
| CSRF | `input[name="__csrf"]` | high | |
| Textarea | `textarea[name="comment"]` | high | |

**Used by:** `src/features/translate/` (kind `comment` on `.comment-body`).

---

## 10. Sidebar

Film-scoped actions (watch / like / watchlist / rate / log) mirror the film page
`#userpanel` — see [film-page.md](./film-page.md) §12. Identifiers are the **film**,
not the viewing.

| Extra | Selector | Notes | Stability |
|-------|----------|-------|-----------|
| Share toggle | `.js-actions-panel-sharing` | Review share | high |
| Short URL field | `#url-field-viewing-{numericId}` | `https://boxd.it/{lid}` | high |
| Author’s other films | sidebar `.poster-list` / prev-next LazyPosters | Links may be `/{user}/film/{slug}/` | medium |

---

## 11. Recommended selector priority

For features on this page (translation, future tooling):

1. **Viewing identity:** `data-object-id` / LikeComponent viewing JSON / URL path.
2. **Film identity:** LazyPoster `data-item-slug` + `data-postered-identifier`.
3. **Review text:** `.js-review-body` / `[data-is-translatable="true"]` inside `section.js-review`.
4. **Comments:** `#comments li.comment` → `.comment-body` (+ `data-full-text-url`).
5. Avoid layout-only classes (`col-12`, `col-17`) as the sole gate when a `js-*`
   or `id` exists.

---

## 12. Relation to film-page reviews

| | Film page card | Standalone review page |
|--|----------------|------------------------|
| Host | `article.production-viewing` | `section.col-12.review.js-review` |
| Body | `.js-review-body` | `.js-review-body` (same) |
| Viewing id | `data-viewing-id` on article | `data-object-id="viewing:…"` / like JSON |
| Comments | Usually not inline | `#comments` panel |
| Translate kind | `review` | `review` + `comment` |
