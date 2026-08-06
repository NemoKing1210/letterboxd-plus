# Profile page DOM map

Reference for Letterboxd **member profile** pages (`/{username}/`).

| | |
|--|--|
| **URL** | `https://letterboxd.com/{username}/` |
| **`body` markers** | Live-verify `body[data-type]` (not in `#content`-only captures) |
| **Sample** | `swjerr` (display name “jer ☘️”), person `12132330` |
| **Captured** | 2026-08-07 (main `#content` fragment) |
| **Consumers** | — (none yet); poster islands share [poster-card.md](./poster-card.md) |

Subpages linked from the profile nav (films, diary, reviews, watchlist, lists,
likes, tags, network, stats, activity) are **separate URLs**. This doc covers
the profile **home** overview only. Review card markup reuses
`article.production-viewing` — same contract as [film-page.md](./film-page.md)
§13 / [review-page.md](./review-page.md).

---

## 1. Page identity

| Field | Preferred source | Fallback | Stability | Notes |
|-------|------------------|----------|-----------|-------|
| Page kind | URL `/{username}/` (no `/film/`) | `section.profile-header` | high | Profile home |
| Username | `section.profile-header[data-person]` | `.js-follow-button-wrapper[data-username]`, `[data-owner]` | high | e.g. `swjerr` |
| Display name | `h1.person-display-name .displayname .label` | avatar `img[alt]`, `.displayname[data-original-title]` is username | high | May include emoji |
| Username tooltip | `.displayname[data-original-title]` | — | high | Often the handle |
| Person numeric id | bio `data-full-text-url` `/s/full-text/person:{id}/` | report `data-report-url` `/ajax/person:{id}/report-form` | high | e.g. `12132330` |
| Profile short link | clipboard menuitem `data-clipboard-text` | — | medium | e.g. `https://boxd.it/8d3Jx` |
| Patron / badge | `h1 .badge` (e.g. `-patron`) | — | medium | Optional |

### Follow / relationship controls

```html
<section class="profile-header js-profile-header …" data-person="swjerr">
  …
  <div class="follow-button-wrapper js-follow-button-wrapper"
       data-username="swjerr"
       data-profile="true">
    <a … data-action="/swjerr/unfollow/" class="… -following js-button-following">…
    <a … data-action="/swjerr/follow/" class="… -follow js-button-follow">…
    <a … data-action="/swjerr/unblock/" class="… -blocked js-button-blocked">…
    <span class="follows-message">Follows you</span>
  </div>
</section>
```

| Field | Selector | Stability |
|-------|----------|-----------|
| Follow wrapper | `.js-follow-button-wrapper[data-username]` | high |
| Follow / unfollow / block actions | `a[data-action]` paths `/{user}/follow|unfollow|block|unblock/` | high |
| Mutual follow hint | `.follows-message` (may be `hidden`) | medium |

Overflow menu (copy link, QR, close friends, block, report) lives under
`.profile-actions-menu` / `[data-js-profile-actions-menu]`. Items marked
`hide-for-owner` / `[data-owner]` are hidden on the owner’s own profile.

---

## 2. Layout skeleton

```
#content.site-body.-backdrop
  .content-wrap
    section.profile-header.js-profile-header[data-person]
      .profile-summary.js-profile-summary
        .profile-avatar
        .profile-name-and-actions   ← display name, follow, overflow menu
        .profile-info
          .profile-stats            ← Films / This year / Lists / Following / Followers
          .bio.js-bio
          .profile-metadata         ← optional location / custom metadatum
      nav.profile-navigation
    .cols-2
      .col-16                       ← main column
        #favourites                 ← Favorite films
        #recent-activity            ← Recent activity posters
        section … Pinned reviews
        section … Recent reviews
        section … Popular reviews
        .cols-2                     ← Tags | Following avatars
      aside.wide-sidebar
        .profile-person-yir-promo   ← Year in review / year stats link
        .watchlist-aside
        section … Diary summary
        section.ratings-histogram-chart
        section … Pinned lists
        section … Recent lists
        section.timeline            ← Activity feed snippet
```

| Landmark | Selector | Stability |
|----------|----------|-----------|
| Profile header | `section.profile-header` / `.js-profile-header` | high |
| Profile summary | `.profile-summary` / `.js-profile-summary` | high |
| Profile nav | `nav.profile-navigation` | high |
| Main column | `.cols-2 > .col-16` | low (layout) |
| Sidebar | `aside.wide-sidebar` | medium |
| Favorites | `#favourites` | high |
| Recent activity | `#recent-activity` | high |

---

## 3. Avatar

| Field | Preferred source | Fallback | Stability |
|-------|------------------|----------|-----------|
| Avatar root | `.profile-avatar` | — | high |
| Small image | `.profile-avatar .avatar img` (often `-a110`) | — | high |
| Large lightbox | `#avatar-large .avatar img` (often `-a500`) | `#avatar-zoom` href `#avatar-large` | high |
| Alt text | `img[alt]` | display name | high |

---

## 4. Profile statistics

**Root:** `.profile-stats.js-profile-stats` inside `.profile-info`.

```html
<h4 class="profile-statistic statistic">
  <a href="/{user}/films/" class="thousands">
    <span class="value">1,344</span>
    <span class="definition title-all-caps -small">Films</span>
  </a>
</h4>
```

| Stat | Link pattern | Stability |
|------|--------------|-----------|
| Films | `/{user}/films/` | high |
| This year | `/{user}/diary/for/{yyyy}/` | high |
| Lists | `/{user}/lists/` | high |
| Following | `/{user}/following/` | high |
| Followers | `/{user}/followers/` | high |

Prefer `.value` text (may include thousands separators / `thousands` class on
the link). Definition labels are localized UI copy — match by `href` path, not
by English label text.

---

## 5. Bio & profile metadata

| Field | Preferred selector | Fallback | Stability |
|-------|--------------------|----------|-----------|
| Bio block | `.bio.js-bio` / `.js-bio-content` | — | high |
| Bio text | `.js-bio-content p` | — | high |
| Full bio URL | `.js-bio-content[data-full-text-url]` | `/s/full-text/person:{id}/` | high |
| Metadata row | `.profile-metadata.js-profile-metadata` | — | medium |
| Metadatum label | `.metadatum .label` | — | medium | e.g. location / freeform |

Bio may be empty or omitted. Metadata items are optional (location pin glyph +
`.label` in the sample).

---

## 6. Profile navigation

**Root:** `nav.profile-navigation ul.navlist`

| Tab | Navitem class / hint | `href` |
|-----|----------------------|--------|
| Profile (active) | `.js-page-profile.-active` | `/{user}/` |
| Activity | `.js-page-activity` | `/{user}/activity/` |
| Films | `.js-page-films` | `/{user}/films/` |
| Diary | `.js-page-diary` | `/{user}/diary/` |
| Reviews | `.js-page-reviews` | `/{user}/reviews/` |
| Watchlist | `.js-page-watchlist` | `/{user}/watchlist/` |
| Lists | `.js-page-lists` | `/{user}/lists/` |
| Likes | `.js-page-likes` | `/{user}/likes/films/` |
| Tags | `.js-page-tags` | `/{user}/tags/` |
| Network | `.js-page-network` | `/{user}/following/` |
| Stats | (no `js-page-*` in sample) | `/{user}/stats/` |
| Search | `#profile-search` | `data-search-prefix="m:{user}"` on link |
| RSS | `.navitem.-rss` | `/{user}/rss/` |

Some items use `hide-for-owner` / `[data-owner]` (e.g. Activity when viewing
someone else). Prefer `js-page-*` and `href` prefixes over visible labels.

---

## 7. Favorite films (`#favourites`)

| Field | Preferred source | Stability |
|-------|------------------|-----------|
| Section | `#favourites.section` | high |
| Grid | `#favourites ul.grid` / `.poster-grid` | medium |
| Item wrapper | `.favourite-production-poster-container` | high |
| Owner | `[data-owner]` | high |
| Object id | `[data-object-id]` e.g. `favouriteFilm:202473733` | high |
| Object name | `[data-object-name="favorite film"]` | high |
| Poster island | `[data-component-class="LazyPoster"]` | high |

Empty slots may be `.poster.-placeholder.-dummy`. Favorite poster
`data-target-link` often points at the member’s film reviews path
(`/{user}/film/{slug}/reviews/`), while `data-item-link` remains `/film/{slug}/`.

LazyPoster fields: same as [poster-card.md](./poster-card.md)
(`data-item-slug`, `data-item-name`, `data-postered-identifier`,
`data-details-endpoint`, …).

Optional: `data-customise-object-backdrop="true"` on a favorite container when
that film drives the profile backdrop.

---

## 8. Recent activity (`#recent-activity`)

Poster grid of recent logs/reviews (not the text activity timeline).

| Field | Preferred source | Stability |
|-------|------------------|-----------|
| Section | `#recent-activity` | high |
| Heading link | `h2 a[href*="/activity/"]` | high |
| All films link | `a.all-link[href*="/films/"]` | medium |
| Item wrapper | `.viewing-poster-container` | high |
| Viewing id | `[data-object-id="viewing:…"]` | high |
| Kind | `[data-object-name]` → `"review"` or `"entry"` | high |
| Owner | `[data-owner]` | high |

### Under-poster viewing chrome

```html
<p class="poster-viewingdata" data-item-uid="film:1086">
  <span class="rating rated-9"> ★★★★½ </span>
  <span class="rating liked"></span>
  <span class="has-icon icon-rewatch …"></span>
  <a href="/{user}/film/{slug}/" class="… icon-review …"></a>
</p>
```

| Field | Selector | Stability |
|-------|----------|-----------|
| Rating | `.poster-viewingdata .rating.rated-{N}` | high | N = half-stars × 2 (e.g. `rated-9` = ★★★★½) |
| Liked | `.poster-viewingdata .rating.liked` | high |
| Rewatch | `.icon-rewatch` / `.rewatch-small` | high |
| Has review | `a.icon-review` | high |
| Film uid | `[data-item-uid]` on `.poster-viewingdata` | high |

---

## 9. Review sections (main column)

Three sibling sections share the same review-card markup:

| Section | Heading `href` pattern | Notes |
|---------|------------------------|-------|
| Pinned reviews | `/{user}/tag/profile/reviews/` | Optional; uses tag `profile` |
| Recent reviews | `/{user}/reviews/by/added/` | |
| Popular reviews | `/{user}/reviews/by/activity/` | |

**List:** `.viewing-list` → `.listitem` → `article.production-viewing.js-production-viewing`

| Field | Preferred source | Stability |
|-------|------------------|-----------|
| Viewing | `article[data-object-id^="viewing:"]` | high |
| Owner | `[data-owner]` | high |
| Object name | `[data-object-name="review"]` | high |
| Poster | `[data-component-class="LazyPoster"]` (often 70×105) | high |
| Title / year | `.inline-production-masthead .primaryname a`, `.releasedate a` | high |
| Member review URL | `.primaryname a[href^="/{user}/film/"]` | high |
| Film page URL | LazyPoster `data-item-link` / frame `href` `/film/{slug}/` | high |
| Rating | `.content-reactions-strip .glyph.-rating[aria-label]` | high |
| Liked | `.glyph.inline-liked` / `aria-label="Liked"` | high |
| Context | `a.context` (“Watched”, “Rewatched”, …) | medium |
| Date | `time.timestamp[datetime]` | high |
| Comment count | `a.metadata .label` near comment glyph | medium |
| Body | `.js-review-body` / `[data-full-text-url]` | high |
| Spoilers | `.js-spoiler-container` + body `data-js-reveal-on-trigger="spoiler.reveal"` | high |
| Like count | LikeComponent `data-count` / `data-likeable-identifier` | high |

Full-text expand: `data-full-text-url="/s/full-text/viewing:{id}/"`.
Translatable bodies may set `data-is-translatable="true"` and `lang`.

Identifier JSON on LikeComponent matches review pages:

```json
{
  "lid": "fGqHKB",
  "uid": "viewing:1436896330",
  "type": "viewing",
  "typeName": "review"
}
```

---

## 10. Tags & following (main column footer)

Nested `.cols-2` under the main column:

| Block | Heading link | List | Stability |
|-------|--------------|------|-----------|
| Tags | `/{user}/tags/` | `ul.tags a[href*="/tag/"]` | high |
| Tag count (all-link) | `a.all-link` → often `/{user}/tags/films/` | medium |
| Following | `/{user}/following/` | `ul.avatar-list a.avatar[href^="/"]` | high |

Tag `href`s: `/{user}/tag/{tag-slug}/films/`. Display text may include emoji /
HTML entities (`&lt;3`). Avatar links: username from path; display name from
`img[alt]` or `data-original-title`.

---

## 11. Sidebar: year stats promo

```html
<section class="section profile-person-yir-promo">
  <div class="yir-selector">
    <h2 class="section-heading -omitdivider">
      Stats for
      <a href="/{user}/year/{yyyy}/" class="styled-number">{yyyy}</a>
      …
    </h2>
  </div>
</section>
```

| Field | Selector | Stability |
|-------|----------|-----------|
| Promo root | `.profile-person-yir-promo` | medium |
| Year link | `a[href*="/year/"]` | high |

---

## 12. Sidebar: watchlist

| Field | Preferred source | Stability |
|-------|------------------|-----------|
| Section | `section.watchlist-aside` | high |
| Count | `a.all-link` next to heading | medium |
| List island | `section.list.js-list[data-film-list-id][data-person]` | high |
| Overlapped posters | `.poster-list-overlapped` / `ul.posterlist` | medium |
| List link | `a.poster-list-link[href*="/watchlist/"]` | high |

Poster islands: standard LazyPoster; `data-hide-tooltip="true"` common in
sidebar stacks. Frame may be a non-link `<span class="frame">` inside the
overlapped list.

---

## 13. Sidebar: diary summary

| Field | Preferred source | Stability |
|-------|------------------|-----------|
| Section | `aside … h2 a[href$="/diary/"]` parent `section.section` | medium |
| Count | `a.all-link` | medium |
| By month | `.diary-summary-by-month ul.diarylist` | high |
| Month | `h3.month` | medium |
| Day | `dt.day` | high |
| Title link | `dd.title a[href^="/{user}/film/"]` | high |

Multiple entries can share the same day. Entry URLs may include a viewing
index (`/{user}/film/{slug}/1/`).

---

## 14. Sidebar: ratings histogram

**Root:** `section.ratings-histogram-chart`

| Field | Preferred source | Stability |
|-------|------------------|-----------|
| Heading / films-by-rating | `a[href*="/films/by/entry-rating/"]` | high |
| Rated count | `.section-accessories .accessory` or nearby count link | medium |
| Chart | `table.chart` / `.rating-histogram` | high |
| Bucket | `tr.column` → `a.barcolumn[href*="/films/ratings/rated/"]` | high |
| Height | `tr.column[style*="--value:"]` | medium | CSS custom property 0–1 |
| Tooltip counts | `a.barcolumn[data-original-title]` / `._sr-only` | medium |

Rating path segments use URL-encoded stars (`rated/4%C2%BD/`, `rated/%C2%BD/`,
etc.).

---

## 15. Sidebar: pinned & recent lists

| Section | Heading `href` | Notes |
|---------|----------------|-------|
| Pinned lists | `/{user}/tag/profile/lists/` | Optional |
| Recent lists | `/{user}/lists/` | Grid `.list-grid` |

Each list card:

```html
<section class="list js-list …"
         data-film-list-id="78182815"
         data-person="swjerr">
  <div class="poster-list-overlapped -p70" style="--poster-count: 5;">
    <a href="/{user}/list/{list-slug}/" class="poster-list-link">…</a>
  </div>
  <h3 class="title-3">
    <a href="/{user}/list/{list-slug}/">…</a>
    <small class="value">89 films</small>
  </h3>
</section>
```

| Field | Preferred source | Stability |
|-------|------------------|-----------|
| List id | `[data-film-list-id]` | high |
| Owner | `[data-person]` | high |
| Slug / URL | `a.poster-list-link[href*="/list/"]` | high |
| Title | `h2.title-2 a` / `h3.title-3 a` | high |
| Film count | `small.value` | medium |
| Preview posters | LazyPoster inside `.posteritem` | high |

Watchlist aside reuses the same `section.list.js-list` pattern with
`href` → `/{user}/watchlist/`.

---

## 16. Sidebar: activity timeline

**Root:** `section.timeline` (distinct from `#recent-activity` posters).

| Field | Preferred source | Stability |
|-------|------------------|-----------|
| Heading | `h2 a[href*="/activity/"]` | high |
| Feed | `ul.activity-timeline` | high |
| Item summary | `.activity-summary` | medium |
| Actor | `a.name[href^="/"]` | high |
| Target | `a.target[href]` | medium |
| Time | `time.timeago[datetime]` | high |

Copy inside summaries is freeform (“liked … review of …”, “commented on …”).
Prefer `href`s and `datetime` over parsing English phrases.

---

## 17. Shared poster / film identity

Everywhere posters appear (favorites, activity, reviews, watchlist, lists),
reuse the LazyPoster / `data-postered-identifier` contract from
[poster-card.md](./poster-card.md) and [film-page.md](./film-page.md) §6.

```json
{
  "lid": "2axs",
  "uid": "film:51717",
  "type": "film",
  "typeName": "film"
}
```

`data-details-endpoint` → `/film/{slug}/json/` for structured film payload.

---

## Notes for scrapers

1. Prefer `data-person` / `data-username` / `data-owner` over display-name text.
2. Prefer `href` path prefixes and `js-page-*` / section `id`s over localized
   headings (“Films”, “This year”, …).
3. `#content`-only saves omit `body[data-type]`, head metas, and JSON-LD — live
   pages may expose additional identity; verify on a full document if needed.
4. Ignore Letterboxd Plus injections (`data-lbp-*`, `.lbp-translate-*`) when
   documenting upstream DOM.
5. Profile sections are optional (no favorites, no pinned reviews/lists, empty
   bio, private/blocked profiles). Mounting must tolerate missing blocks.
6. Owner vs visitor: many nodes use `hide-for-owner` / `data-owner`; follow /
   block / report UI differs by relationship state (`hidden` buttons).

---

*Sample captured 2026-08-07 from `/{username}/` (`swjerr`). Update this file
when Letterboxd changes profile markup.*
