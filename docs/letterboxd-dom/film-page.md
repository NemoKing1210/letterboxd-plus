# Film page DOM map

Reference for Letterboxd **film** pages (`/film/{slug}/`).

| | |
|--|--|
| **URL** | `https://letterboxd.com/film/{slug}/` |
| **`body` markers** | `data-type="film"`, often `data-tmdb-type="movie"`, `data-tmdb-id="{id}"` |
| **Sample** | *The Odyssey* (2026), slug `the-odyssey-2026` |
| **Captured** | 2026-07-29 (saved HTML; some assets local/empty) |
| **Consumers** | `src/api/film-profile.js`, `src/features/film-mini-profile/`, `src/features/ratings/`, `src/features/cast/` |

Tab deep-links (`/cast/`, `/crew/`, `/details/`, `/genres/`, `/releases/`) render the
same panels on the film page (`#tab-panel-*`). Prefer panel IDs over relying on
the URL path alone when parsing a full film HTML response.

---

## 1. Page identity

| Field | Preferred source | Fallback | Stability | Notes |
|-------|------------------|----------|-----------|-------|
| Page type | `body[data-type="film"]` | — | high | Gate for film-only features |
| TMDB type | `body[data-tmdb-type]` | — | high | `"movie"` or `"tv"` |
| TMDB id | `body[data-tmdb-id]` | `[data-tmdb-id]` | high | String digits, e.g. `1368337` |
| Letterboxd film uid | `meta[name="production:identifier"]` → JSON `uid` | `data-postered-identifier` / `data-watchable` JSON `uid` | high | e.g. `film:1255394` |
| Letterboxd lid | same meta → `lid` | same data-JSON | high | e.g. `QFQU` |
| Numeric film id | parse `uid` (`film:1255394` → `1255394`) | `#url-field-film-{id}`, `#related-news-{id}` | medium | Useful for sharing widgets |
| Slug | `#js-poster-col [data-item-slug]` | `meta[property="og:url"]` / `link[rel="canonical"]` path `/film/{slug}/` | high | Canonical may be missing in offline saves |
| Film URL | `meta[property="og:url"]` | `/film/{slug}/` | high | Absolute on live site |

### `meta[name="production:identifier"]` shape

```json
{
  "lid": "QFQU",
  "uid": "film:1255394",
  "type": "film",
  "typeName": "film"
}
```

Same shape appears on React islands: `data-watchable`, `data-likeable-identifier`,
`data-watchlistable-identifier`, `data-viewingable-identifier`,
`data-postered-identifier`.

---

## 2. Head metas (fast path)

| Field | Selector / attribute | Example | Stability |
|-------|----------------------|---------|-----------|
| Title | `meta[name="production:name"]` | `The Odyssey` | high |
| Title + year | `meta[name="production:name-and-year"]` | `The Odyssey (2026)` | high |
| Description | `meta[name="description"]` or `meta[property="og:description"]` | synopsis text | high |
| Share image (backdrop-ish) | `meta[property="og:image"]` | landscape crop URL | high |
| Twitter director | `meta[name="twitter:data1"]` (label `twitter:label1` = Directed by) | `Christopher Nolan` | medium |
| Twitter average rating | `meta[name="twitter:data2"]` | `4.40 out of 5` | high |
| Open Graph type | `meta[property="og:type"]` | `video.movie` | high |

---

## 3. JSON-LD (`Movie`)

```html
<script type="application/ld+json">…</script>
```

Letterboxd often wraps the payload in a CDATA comment; strip
`/* <![CDATA[ */` … `/* ]]> */` (and stray leading `*/`) before `JSON.parse`.
Select the object with `@type === "Movie"`.

| Field | JSON-LD path | Notes |
|-------|--------------|-------|
| Title | `name` | |
| Description | `description` | Full synopsis text |
| Poster image | `image` | Film poster URL (prefer over og:image for portrait) |
| URL | `url` / `@id` | |
| Year / date | `dateCreated` | ISO date, e.g. `2026-07-06` |
| Runtime | `duration` | ISO-8601, e.g. `PT2H53M` |
| Genres | `genre[]` | Strings |
| Directors | `director[]` → `name`, `sameAs` | |
| Actors | `actor[]` → `name`, `sameAs` | No character roles here |
| Studios | `productionCompany[]` → `name`, `sameAs` | |
| Countries | `countryOfOrigin[]` → `name` | |
| Languages | `inLanguage[]` | BCP-47 codes (`en`) |
| Average rating | `aggregateRating.ratingValue` | 0.5–5 scale |
| Rating count | `aggregateRating.ratingCount` | |
| Review count | `aggregateRating.reviewCount` | Distinct from rating count |

**Used by:** `src/api/film-profile.js` (`readJsonLd`, rating/runtime/cast/directors).

---

## 4. Layout skeleton

```
#content
  .content-wrap
    #poster-modal
    #film-page-wrapper.cols-3
      #js-poster-col          ← poster + stats + where-to-watch
      .col-main (approx)      ← masthead, synopsis, tabs, reviews, lists
      aside.sidebar           ← #userpanel, ratings histogram, extras
#backdrop                     ← page backdrop image
```

| Landmark | Selector | Stability |
|----------|----------|-----------|
| Film wrapper | `#film-page-wrapper` | high |
| Poster column | `#js-poster-col` | high |
| Sidebar | `#film-page-wrapper aside.sidebar` | high |
| Backdrop root | `#backdrop` | high |
| User actions | `#userpanel` / `ul.js-actions-panel` | high |

---

## 5. Title, year, directors (masthead)

**Root:** `section.production-masthead`

| Field | Preferred selector | Fallback | Stability |
|-------|--------------------|----------|-----------|
| Title | `section.production-masthead h1.headline-1 .name` | `meta[name="production:name"]` | high |
| Year (display) | `section.production-masthead .releasedate a[href*="/films/year/"]` | year from `production:name-and-year` | high |
| Exact release tooltip | `.releasedate[data-original-title]` | — | medium | e.g. `16 Jul 2026` |
| Directors | `.production-masthead .contributorlist a[href*="/director/"]` | JSON-LD `director` | high |

Avoid bare `h1` — the site logo is also an `h1.site-logo`.

---

## 6. Poster

| Field | Preferred source | Fallback | Stability |
|-------|------------------|----------|-----------|
| Poster island | `#js-poster-col [data-component-class="LazyPoster"]` | `.poster.film-poster` | high |
| Slug | `[data-item-slug]` on LazyPoster | — | high |
| Display name | `[data-item-full-display-name]` / `[data-item-name]` | — | high |
| Link | `[data-item-link]` | `/film/{slug}/` | high |
| Details JSON endpoint | `[data-details-endpoint]` | `/film/{slug}/json/` | high |
| Image URL | JSON-LD `image` | `#js-poster-col img.image[src]` (skip `empty-poster`) → `og:image` | high |

### Important LazyPoster `data-*`

| Attribute | Purpose |
|-----------|---------|
| `data-item-slug` | Film slug |
| `data-item-link` | Relative film URL |
| `data-item-name` / `data-item-full-display-name` | Title (+ year) |
| `data-postered-identifier` | `{lid,uid,type,…}` JSON |
| `data-poster-url` | Poster image route, e.g. `/film/{slug}/image-150/` |
| `data-details-endpoint` | `/film/{slug}/json/` |
| `data-empty-poster-src` | Placeholder when no art |
| `data-image-width` / `data-image-height` | Requested size |

Offline “Save page” captures often leave `img.image` pointing at
`empty-poster-*.png`. Always prefer JSON-LD `image` or live network src.

**Used by:** `parsePosterUrl` in `film-profile.js`; poster hover in
`film-mini-profile/posters.js`.

---

## 7. Tagline & synopsis

| Field | Preferred selector | Fallback | Stability |
|-------|--------------------|----------|-----------|
| Tagline | `h4.tagline` (inside production synopsis block) | — | high |
| Synopsis | `.truncate[data-truncate] p` or `.truncate p` | JSON-LD `description` / meta description | high |

Example tagline: `Defy the gods.`

**Used by:** `parseTagline`, `parseDescription` in `film-profile.js`.

---

## 8. Production statistics (under poster)

Container: elements with class `production-statistic` inside `#js-poster-col`.

| Variant class | Meaning | Count source | Link pattern |
|---------------|---------|--------------|--------------|
| `-watches` | Watches | `aria-label` (“Watched by N members”) or `.label` (`2.6M`) | `/film/{slug}/members/` |
| `-lists` | List appearances | `aria-label` / `.label` | `/film/{slug}/lists/by/popular/` |
| `-likes` | Likes | `aria-label` / `.label` | `/film/{slug}/likes/` |
| `-topFilms` | Official Top 500 rank | `aria-label` / `.label` | official list URL |
| `imdb-ranking` / `extras-ranking` | Extra ranking (e.g. IMDb Top 250) | `.label` | member list URL |

Compact labels use `K` / `M` suffixes; full integers live in `aria-label`.

**Used by:** `parseStats` (watches + likes only today).

---

## 9. Where to watch & trailer

**Root:** `section.watch-panel.js-watch-panel` (also `#watch` inside)

| Field | Selector | Stability |
|-------|----------|-----------|
| Panel | `section.watch-panel` / `.js-watch-panel` | high |
| Trailer link | `.trailer-link a[data-track-category="Trailer"]` or `a.play.js-video-zoom` | medium |
| Trailer embed href | that `<a href>` (YouTube embed URL) | medium |
| Showtimes | `#watch .js-ticketing` / `a.js-buy-tickets-link` | medium |
| Ticketing check API | `[data-check-url]` on `.js-ticketing` | medium | uses TMDB id |
| Services list | `section.services` inside `#watch` | medium |

---

## 10. Tabs: Cast / Crew / Details / Genres / Releases

### Tab triggers

| Tab | Trigger id | Panel id | Deep link |
|-----|------------|----------|-----------|
| Cast | `#tab-cast` | `#tab-panel-cast` | `/film/{slug}/cast/` |
| Crew | `#tab-crew` | `#tab-panel-crew` | `/film/{slug}/crew/` |
| Details | `#tab-details` | `#tab-panel-details` | `/film/{slug}/details/` |
| Genres | `#tab-genres` | `#tab-panel-genres` | `/film/{slug}/genres/` |
| Releases | `#tab-releases` | `#tab-panel-releases` | `/film/{slug}/releases/` |

Triggers use `role="tab"`; panels use `role="tabpanel"` and may be
`hidden="until-found"` until opened — content is still present in HTML.

### Cast (`#tab-panel-cast`)

| Field | Selector | Stability |
|-------|----------|-----------|
| List | `#tab-panel-cast .cast-list` (often `.cast-list.text-sluglist`) | high |
| Actor link | `a.text-slug[href*="/actor/"]` | high |
| Name | link text | high |
| Character / role | `data-original-title` or `title` on the link | high |
| Overflow | `#cast-overflow`, trigger `#has-cast-overflow` | medium |

**Used by:** `parseCast` (`film-profile.js`), `src/features/cast/`.

### Crew (`#tab-panel-crew`)

Structure: repeated blocks of:

```html
<h3>
  <span class="crewrole -full">Director</span>
  <span class="crewrole -short" aria-hidden="true">Director</span>
</h3>
<div class="text-sluglist">
  <a class="text-slug" href="/director/…">…</a>
</div>
```

| Field | Selector | Stability |
|-------|----------|-----------|
| Role label | `#tab-panel-crew h3 .crewrole.-full` | high |
| People | following `.text-sluglist a.text-slug` | high |
| Role from URL | `/director/`, `/producer/`, `/writer/`, … | high |

Observed roles on sample: Director, Producers, Writer, Original Writer,
Casting, Editor, Cinematography, Assistant Directors, Executive Producer,
Lighting, Camera Operator, Production Design, Art Direction, Set Decoration,
Visual Effects, Title Design, Stunts, Composers, Songs, Sound, Costume Design,
Makeup, Hairstyling.

Masthead directors are the short path; full crew is in this tab.

### Details (`#tab-panel-details`)

Each subsection is `h3` + `.text-sluglist` (or text for alt titles / budget).

| Subsection | Links / content | Href pattern |
|------------|-----------------|--------------|
| Studios | studio names | `/studio/{slug}/` |
| Countries | country names | `/films/country/{slug}/` |
| Language | language names | `/films/language/{slug}/` |
| Alternative Titles | plain text list | — |
| Budget | amount text (when present) | — |

Also available via JSON-LD `productionCompany`, `countryOfOrigin`, `inLanguage`.

### Genres (`#tab-panel-genres`)

| Field | Selector | Stability |
|-------|----------|-----------|
| Genre links | `#tab-panel-genres a[href*="/films/genre/"]` | high |
| Themes (when present) | `#tab-panel-genres a[href*="/films/theme/"]` | high |

Sample genres: Adventure, Action, Fantasy. Themes may be absent.

**Used by:** `parseGenres` in `film-profile.js`.

### Releases (`#tab-panel-releases`)

Nested tabs:

| View | Trigger | Panel |
|------|---------|-------|
| By date | `#tab-releases-by-date` | `#tab-panel-releases-by-date` |
| By country | `#tab-releases-by-country` | `#tab-panel-releases-by-country` |

By-date structure:

- Group titles: `h3.release-table-title` (Premiere, Theatrical limited, Theatrical, …)
- Rows: `.release-table.-bydate .listitem`
- Date: `h5.date`
- Country: `.release-country .name`
- Certification: `.release-certification-badge .label`
- Note (venue): `.release-note`

---

## 11. Community ratings (sidebar)

**Letterboxd histogram:** `aside.sidebar section.ratings-histogram-chart`
(without extras modifiers).

| Field | Selector / attribute | Stability |
|-------|----------------------|-----------|
| Section | `aside.sidebar section.ratings-histogram-chart` | high |
| Average display | `a.averagerating` text (`4.4`) | high |
| Weighted average + count | `a.averagerating[data-original-title]` | high |
| Fans accessory | `.section-accessories a[href*="/fans/"]` | medium |
| Ratings page | `a.averagerating[href*="/ratings/"]` | high |

Tooltip pattern:

`Weighted average of 4.40 based on 2,383,553 ratings`

### Extra rating blocks (Pro / extras)

Sibling sections under the sidebar:

| Modifier classes | Content |
|------------------|---------|
| `.imdb-ratings.ratings-extras` | IMDb-style extras rating |
| `.tomato-ratings.ratings-extras` | Rotten Tomatoes extras |
| `.cinemascore.ratings-extras` | CinemaScore grade, e.g. `a.cinema-grade` → `A` |

**Mount point for LBP ratings:** after `.ratings-histogram-chart` in the sidebar
(`src/features/ratings/`).

**Used by:** `parseRating` / `parseRatingCount` in `film-profile.js`;
`src/features/ratings/average.js`.

---

## 12. User relationship panel

**Root:** `#userpanel.actions-panel` → `ul.js-actions-panel`

Only meaningful when logged in (`body.logged-in`). Guest pages omit or reduce
these React islands.

| Concern | Component | Key attributes / classes | Stability |
|---------|-----------|--------------------------|-----------|
| Watched | `[data-component-class="WatchLink"]` | `data-is-watched="true|false"`; visual `.action.-watch.-on` | high |
| Liked | `[data-component-class="LikeComponent"]` | `data-is-liked`; `.action.-like.-on` | high |
| Watchlist | `[data-component-class="Watchlist"]` | `.add-to-watchlist` vs `.remove-from-watchlist` / `.action.-watchlist.-on` | high |
| Personal rating | `[data-component-class="InstantRatingInput"]` | `label[data-state="selected"]`, `input[type="radio"]:checked` (`value` is half-stars 1–10) | high |
| Member activity | `[data-component-class="MemberActivity"]` | `data-member-username`, `data-members-activity-page-url`, `data-member-display-name` | high |
| Log / review form bits | `#frm-rating`, `#frm-review`, `#frm-rewatch` | form plumbing | medium |

Also: `AddMenu`, `AddToListModalTrigger`, `MenuLogEntry` React components.

Letterboxd Plus prefers `#userpanel` HTML when attributes are definitive
(`data-is-watched`, selected rating, etc.). Empty React shells are ignored;
`GET /film/{slug}/json/` fills relationship / personal rating when HTML is
incomplete.

**Used by:** `parseUserStateFromDoc`, `fetchFilmUserState` in `film-profile.js`.

---

## 13. Reviews, mentions, lists

| Section | Selector | Stability |
|---------|----------|-----------|
| Popular reviews | `section.film-reviews.js-popular-reviews` | high |
| Recent reviews | `section.film-reviews.js-recent-reviews` | high |
| Mentioned by | `#film-hq-mentions` | high |
| Popular lists | `#production-popular-lists` | high |

Review entries are nested list markup inside those sections (avatars, ratings,
review text). Detail mapping can be expanded when a feature needs them.

---

## 14. Backdrop

| Field | Source | Stability |
|-------|--------|-----------|
| Backdrop root | `#backdrop` | high |
| Body flags | `body.backdropped`, `body.backdrop-loaded` | medium |
| Image | `#backdrop` background / child `img`, or `og:image` | medium |

---

## 15. Mini-profile field cheat sheet

What `parseFilmMiniProfileDoc` already pulls vs what the page still offers:

| Mini-profile field | On film page? | Primary DOM / meta path |
|--------------------|---------------|-------------------------|
| `slug` | yes | LazyPoster / URL |
| `title` | yes | `production:name` / masthead / JSON-LD |
| `year` | yes | `production:name-and-year` / masthead |
| `posterUrl` | yes | JSON-LD `image` / poster img |
| `rating` | yes | JSON-LD / `a.averagerating` / twitter:data2 |
| `ratingCount` | yes | JSON-LD / averagerating tooltip |
| `runtimeMins` | yes | JSON-LD `duration` only |
| `tagline` | yes | `h4.tagline` |
| `directors` | yes | masthead / JSON-LD |
| `cast` (+ roles) | yes | `#tab-panel-cast` (roles from tooltip) |
| `genres` | yes | `#tab-panel-genres` |
| `description` | yes | `.truncate p` / JSON-LD |
| `stats.watches/likes` | yes | `.production-statistic.-watches/-likes` |
| `tmdbId` | yes | `body[data-tmdb-id]` |
| `user.*` | yes (logged-in) | `#userpanel` components |
| Lists count / Top 500 rank | available, unused | `.production-statistic.-lists/-topFilms` |
| Studios / countries / languages | available, unused | details tab / JSON-LD |
| Trailer URL | available, unused | `.watch-panel` trailer link |
| CinemaScore / extras | available, unused | sidebar extras sections |
| Releases / certifications | available, unused | `#tab-panel-releases-*` |
| Full crew by role | available, unused | `#tab-panel-crew` |
| Themes | sometimes | `#tab-panel-genres a[href*="/films/theme/"]` |
| Budget / alt titles | sometimes | `#tab-panel-details` |

---

## 16. Recommended selector priority (parsing)

When fetching `/film/{slug}/` HTML for the mini card (Letterboxd Plus):

1. **Identity:** `body[data-type]`, `data-tmdb-id`, slug from LazyPoster / `og:url`.
2. **DOM / metas first:** masthead, histogram, cast tab (+ roles), genres tab,
   tagline, synopsis, production stats, `#userpanel`.
3. **JSON-LD `Movie` as fallback:** runtime (primary), and any field missing from DOM.
4. **User relationship:** definitive `#userpanel` attributes first; if shells are
   empty or personal rating is missing, use `/film/{slug}/json/`.

---

## 17. Caveats

- Saved “Complete webpage” HTML rewrites asset URLs and may show empty posters;
  treat network live DOM or JSON-LD as source of truth for images.
- `link[rel="canonical"]` can be absent in offline saves; `og:url` usually remains.
- Rating half-star inputs use values `1…10` (= `0.5…5` stars).
- Multiple `a.averagerating` nodes can exist (Letterboxd + extras); scope to
  `aside.sidebar section.ratings-histogram-chart:not(.ratings-extras)` or the
  first non-extras chart.
- Cast overflow / “show all” may hide nodes visually but keep them in DOM
  (`#cast-overflow`).
- Do not imply affiliation with Letterboxd when surfacing scraped fields.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-29 | Initial map from *The Odyssey* (2026) film page HTML |
| 2026-07-29 | LBP mini-profile: DOM-first parsing; JSON only for user relationship |
