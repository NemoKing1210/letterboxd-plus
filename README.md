# Letterboxd Plus

[![CI](https://github.com/NemoKing1210/letterboxd-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/NemoKing1210/letterboxd-plus/actions/workflows/ci.yml)
[![Install userscript](https://img.shields.io/badge/Install-userscript-00e054?style=for-the-badge&labelColor=14181c)](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/letterboxd-plus.user.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-40bcf4?style=for-the-badge&labelColor=14181c)](https://github.com/NemoKing1210/letterboxd-plus/blob/main/LICENSE)
[![Version](https://img.shields.io/badge/version-0.23.1-ff8000?style=for-the-badge&labelColor=14181c)](https://github.com/NemoKing1210/letterboxd-plus/blob/main/package.json)

**English** · [Русский](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.ru.md) · [Español](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.es.md) · [Português (Brasil)](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.pt-BR.md) · [Deutsch](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.de.md) · [Français](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.fr.md) · [简体中文](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.zh-CN.md)

A lightweight userscript that extends
[Letterboxd](https://letterboxd.com/) with external film ratings, richer cast
and crew lists, hover mini-cards, and on-page translation — while keeping the
site familiar.

Letterboxd Plus adds Rotten Tomatoes and Metacritic scores to film pages,
enriches Cast and Crew with portraits, shows detailed mini-cards for films and
members, translates synopses, reviews, and comments, and provides a
native-looking settings panel. It requires no API key and runs entirely in your
browser.

Compatible with [Tampermonkey](https://www.tampermonkey.net/),
[Violentmonkey](https://violentmonkey.github.io/),
[Greasemonkey](https://www.greasespot.net/),
[ScriptCat](https://scriptcat.org/), and other managers that support the
`// ==UserScript==` metadata block.

> **Status:** `0.23.1`. Ratings, enhanced Cast and Crew, film and member
> mini-cards, translation, cache controls, and a seven-language interface are
> available. More Letterboxd enhancements can be added as independent feature
> modules.

> The script's `@updateURL` / `@downloadURL` point at GitHub `main` — the raw
> install URL below is always the newest build.

## Screenshots

The real userscript running on live Letterboxd pages.

![Letterboxd Plus settings panel with General, Film, User card, Translation, Cache, and About tabs](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/settings-panel.png)

| | |
|---|---|
| ![Rotten Tomatoes, Metacritic, and average rating sections in the film sidebar](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/ratings.png)<br>**External ratings** — Tomatometer, Popcornmeter, Metascore, User Score, and a combined average | ![Cast list with actor portraits and roles](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/enhanced-cast.png)<br>**Enhanced cast** — portraits, names, and roles, loaded as cards approach the viewport |
| ![Crew page with portraits for directors, producers, and writers](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/crew.png)<br>**Enhanced crew** — the same portrait treatment for directors, producers, writers, and the rest of the crew | ![Film mini-card on a poster hover showing ratings, cast, genres, and a synopsis](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/film-mini-card.png)<br>**Film mini-cards** — ratings, cast, genres, runtime, synopsis, quick links, and a Translate button on poster hover |
| ![Member mini-card showing level, stats, location, favorite films, and recent activity](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/user-mini-card.png)<br>**Member mini-cards** — level and tier progress, stats, location, favorites, and recent activity | ![A film synopsis with the Spanish translation shown below the original](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/translation.png)<br>**Translation** — synopses, reviews, and comments, shown below the original or replacing it |

## Quick install

1. Install a userscript manager. Tampermonkey, Violentmonkey, or ScriptCat is
   recommended.
2. Open the raw userscript URL below.
3. Confirm installation in your userscript manager.

**Latest GitHub build:**

```text
https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/letterboxd-plus.user.js
```

[![Install Letterboxd Plus](https://img.shields.io/badge/⬇_Install-Letterboxd_Plus-14181c?style=for-the-badge&labelColor=00e054)](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/letterboxd-plus.user.js)

### Install from a manager dashboard

| Manager | Installation path |
|---------|-------------------|
| Tampermonkey | Dashboard → **Utilities** → **Install from URL** |
| Violentmonkey | Dashboard → **+** → **Install from URL** |
| Greasemonkey | Add-on menu → **New User Script** → paste the script |
| ScriptCat | Dashboard → install from URL, then paste the raw GitHub link |

### Manual install

1. Open
   [`letterboxd-plus.user.js`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/letterboxd-plus.user.js)
   in this repository (or run `npm run build` after cloning).
2. Copy the complete file.
3. Create a new script in your userscript manager.
4. Paste the file, save it, and reload Letterboxd.

## Features

### External ratings

On Letterboxd film pages, the script adds compact sections to the native
sidebar:

- **Rotten Tomatoes** — Tomatometer critic score, Certified Fresh status when
  available, optional Popcornmeter audience score, critic review and audience
  rating counts, and a direct link to the matched film page.
- **Metacritic** — Metascore with critic review count, optional User Score
  with rating count, score-band accents, and a direct link to the matched movie
  page.
- **Average rating** — combines the Letterboxd rating with every enabled,
  available external score. Values are normalized to Letterboxd's five-point
  scale and averaged equally; unavailable scores are omitted.

Both providers use the film title and release year to disambiguate results, and
Letterboxd's TMDB identifier is used as the local cache key. Loading skeletons
and non-blocking empty/error states keep the page usable when a provider is
slow or unavailable.

### Enhanced cast and crew

The Cast section can display compact cards with each actor's portrait, name,
and role. The Crew page receives the same treatment for directors, producers,
writers, and other crew members.

Portraits are read from public Letterboxd person pages only as cards approach
the viewport, with a small request limit. The first ten cast members are shown
initially; the rest remain unloaded until **Show All** is selected and their
cards approach the viewport. Results are kept in memory only.

### Film mini-cards

Hovering a poster in lists, browse, diary, watchlists, search, and similar-film
grids opens a compact mini-card with:

- poster, title, year, Letterboxd community rating, and your own status
  (watched, liked, watchlist, rating);
- directors, cast, genre chips, tagline, runtime, and a short synopsis;
- Tomatometer and Metascore pills when those providers are enabled;
- rating-level hints, quick links, and a direct link to the film page;
- a **Translate** button for the synopsis.

The main poster on a film page is excluded. Loading is progressive and
non-blocking, with optional viewport preload controlled from settings. The card
can open on hover or on right-click, depending on your preference.

### Member mini-cards

Hovering a member avatar or profile link anywhere on Letterboxd opens a member
mini-card with:

- display name, username, avatar, and a link to the full profile;
- **level and tier** — a progress bar with points and the next tier;
- stats for films, films this year, lists, following, and followers;
- bio, location, favorite films, and recent activity when the profile exposes
  them.

The card is skipped inside the site header and inside other mini-cards. Like
film cards, it can open on hover or on right-click and can preload as avatars
approach the viewport.

### Translation

The built-in translation feature can translate:

- **film synopses** on film pages and inside film mini-cards;
- **reviews** on review cards and standalone review pages;
- **comments** under reviews.

Translation targets one of the seven interface languages or follows the
interface language. Choose whether translated text **replaces** the original
(with a toggle back) or appears **below** it. Reviews can also translate
automatically as they scroll into view, off by default.

Translation uses Google's free endpoint — no API key. Each block has its own
Translate button, and every scope can be switched off in settings.

### Settings

Open **Letterboxd Plus** from:

- the Letterboxd account dropdown, immediately after the native **Settings**
  item (highlighted in brand green);
- the userscript manager menu through **Letterboxd Plus settings**.

The accessible tabbed panel follows Letterboxd's visual language and contains:

- **General** — interface language and toast position;
- **Film** — rating-provider visibility, enhanced Cast and Crew, film
  mini-card behavior and content;
- **User card** — member mini-card behavior and content;
- **Translation** — target language, display mode, and translation scopes;
- **Cache** — storage meter, per-type statistics, retention, per-source cache
  switches, and manual cleanup;
- **About** — project description, version, license, repository, and author
  information.

The dialog supports keyboard tab navigation, arrow keys, Escape to close,
visible focus states, mobile layouts, and reduced-motion preferences.

### Interface languages

The interface is available in seven languages:

- English;
- Русский;
- Español;
- Português (Brasil);
- Deutsch;
- Français;
- 简体中文.

The default **Auto** mode checks the browser's preferred language list and
selects the first supported language. Regional variants such as `es-MX`,
`pt-PT`, and `zh-Hans` are mapped to the corresponding available translation.
Unsupported or missing browser locales fall back to English. A fixed language
can be selected under **Settings → General → Interface language**.

### Caching and resilience

- Successful Rotten Tomatoes and Metacritic responses are cached through
  userscript storage with separate provider keys.
- Film and member mini-card scrapes, and translations, use their own cache
  keys and can each be switched off on the Cache tab.
- Cache duration is configurable from `0` to `168` hours.
- A duration of `0` always requests fresh data.
- The cache tab shows current usage against a conservative 5 MB advisory
  budget.
- Active and expired entries are measured separately and can be cleared per
  type without resetting settings.
- Requests have a fixed timeout and errors never prevent Letterboxd from
  loading.
- Failed requests and missing matches are not stored as successful ratings.

## Supported pages

| Site | URL pattern | Behavior |
|------|-------------|----------|
| Letterboxd | `https://letterboxd.com/*` | Navigation settings entry, ratings, cast and crew, mini-cards, and translation |
| Letterboxd (`www`) | `https://www.letterboxd.com/*` | Same behavior for the alternate host |

Ratings are mounted only when the page exposes film metadata through
`body[data-type="film"][data-tmdb-id]`.

## How it works

```text
Letterboxd film page
        │
        ├── read title, year, and TMDB ID from page metadata
        │
        ├── check GM-backed cache
        │
        ├── Rotten Tomatoes search and scorecard
        │
        └── Metacritic JSON search and movie detail
                    │
                    ├── strictly match title and release year
                    ├── read critic and audience/user scores
                    └── cache each provider independently
                                      │
                                      ▼
                            render in Letterboxd sidebar
```

Mini-cards request the public Letterboxd film or member page through
same-origin browser requests and read the data already present there. The page
scanner is idempotent and observes dynamic DOM changes, so React navigation
updates can restore the account-menu entry and feature mounts without creating
duplicates.

## Data sources and limitations

Rotten Tomatoes and Metacritic do not provide supported public APIs for this
use case. Letterboxd Plus reads publicly available Rotten Tomatoes pages and
the JSON endpoints used by Metacritic's own website through
`GM_xmlhttpRequest`.

Enhanced Cast and Crew read public Letterboxd person pages through same-origin
browser requests and display the portrait URL already supplied there. Results
are kept only in memory; no person biography or portrait data is persisted.

Translation sends the selected text to Google's public translation endpoint.
Translated text is cached locally in userscript storage unless the translation
cache is switched off.

This has several practical consequences:

- Provider markup or JSON schema changes can temporarily break score
  extraction.
- Some new, obscure, or unreleased titles may not have a matching page.
- A title can exist without critic or audience scores.
- Availability can vary by network or region.

These cases are handled as reduced functionality rather than Letterboxd page
failures. The script does not submit ratings, modify Rotten Tomatoes or
Metacritic data, or require account credentials.

## Updates

The userscript metadata contains `@updateURL` and `@downloadURL` values pointing
to the raw GitHub artifact on `main`. Compatible managers can therefore check
for new releases automatically.

To publish a release:

1. Select a Semantic Versioning increment:
   - **major** for incompatible or migration-requiring changes;
   - **minor** for backward-compatible features;
   - **patch** for fixes, styling, documentation, and maintenance.
2. Synchronize the version in `package.json` and `package-lock.json`.
3. Run `npm run ci` to rebuild and verify the root artifacts.
4. Push the updated source and generated files.

## Repository layout

```text
letterboxd-plus/
├── src/
│   ├── main.js                       # Bootstrap and DOM observer
│   ├── core/
│   │   ├── constants.js              # Settings defaults, keys, URLs, timeouts
│   │   ├── cache.js                  # Cache reads, writes, statistics, cleanup
│   │   └── settings.js               # Settings validation and persistence
│   ├── api/
│   │   ├── normalize-title.js        # Shared title normalization
│   │   ├── film-profile.js           # Film page scrape for mini-cards
│   │   ├── user-profile.js           # Member page scrape for mini-cards
│   │   ├── letterboxd-person.js      # Lazy Letterboxd portrait lookup
│   │   ├── rotten-tomatoes.js        # RT search and scorecard parsing
│   │   ├── metacritic.js             # Metacritic search and score parsing
│   │   └── google-translate.js       # Translation request and cache
│   ├── features/
│   │   ├── index.js                  # Page-scan feature registry
│   │   ├── apply-settings.js         # Live settings application
│   │   ├── ratings/                  # Sidebar RT / Metacritic / average
│   │   ├── cast/                     # Enhanced cast portraits
│   │   ├── crew/                     # Enhanced crew portraits
│   │   ├── film-mini-profile/        # Poster hover mini-cards
│   │   ├── user-mini-profile/        # Member hover mini-cards
│   │   ├── settings/                 # Account-menu entry and settings dialog
│   │   ├── translate/                # Synopses, reviews, comments
│   │   └── toast/                    # Toast notifications
│   ├── i18n/
│   │   ├── meta.js                   # Locale lists, names, flags, aliases
│   │   ├── locales/                  # One message map per locale
│   │   └── index.js                  # t(), configureLocale, formatNumber
│   ├── utils/
│   │   ├── debounce.js               # Shared debounce helper
│   │   ├── html.js                   # HTML attribute/text escaping
│   │   └── letterboxd-username.js    # Username parsing helpers
│   └── styles/
│       └── tokens.css                # Shared design tokens and media queries
├── docs/
│   ├── letterboxd-dom/               # Stable selectors and page data maps
│   └── screenshots/                  # README screenshots
├── scripts/
│   ├── copy-dist.mjs                 # Copy dist artifacts to repository root
│   ├── verify-artifacts.mjs          # Verify dist and root files match
│   └── lib/artifacts.mjs             # Shared artifact names
├── .github/workflows/ci.yml          # Build and artifact verification
├── letterboxd-plus.user.js           # Installable generated userscript
├── letterboxd-plus.meta.js           # Metadata-only generated artifact
├── vite.config.js                    # Build and userscript metadata
├── package.json                      # Version, dependencies, npm scripts
├── AGENTS.md                         # Repository guidance for coding agents
├── DESIGN.md                         # Visual language and Letterboxd UI tokens
├── CLAUDE.md                         # Claude entry point for AGENTS.md
├── SECURITY.md                       # Vulnerability reporting policy
├── README.md                         # English README
├── README.ru.md                      # Localized READMEs
└── LICENSE                           # MIT license
```

| Path | Purpose |
|------|---------|
| `src/` | Readable source of truth; make product changes here |
| `dist/` | Local Vite output; generated and gitignored |
| `letterboxd-plus.user.js` | Full install/update artifact |
| `letterboxd-plus.meta.js` | Lightweight metadata used by update checks |
| `vite.config.js` | `@match`, `@connect`, names, URLs, and build configuration |

## Script metadata and permissions

| Field | Value |
|-------|-------|
| `@namespace` | `https://github.com/NemoKing1210/letterboxd-plus` |
| `@match` | Letterboxd apex and `www` hosts |
| `@connect` | Rotten Tomatoes hosts, `backend.metacritic.com`, and `translate.googleapis.com` |
| `@run-at` | `document-idle` |
| `@license` | MIT |
| `@updateURL` / `@downloadURL` | Raw GitHub userscript on `main` |

| Grant | Purpose |
|-------|---------|
| `GM_xmlhttpRequest` | Request external rating providers and the translation endpoint |
| `GM_getValue` / `GM_setValue` | Persist settings, rating cache, and translations |
| `GM_listValues` / `GM_deleteValue` | Measure and clear cached entries |
| `GM_addStyle` | Inject the bundled interface styles |
| `GM_registerMenuCommand` | Open settings from the userscript manager |

No access tokens, API keys, passwords, or Letterboxd session data are stored.

## Development

Requires [Node.js 22](https://nodejs.org/) as specified by
[`.nvmrc`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/.nvmrc).

```bash
npm install
npm run dev                # Serve an installable "dev:" userscript
npm run build              # Build dist/ and refresh root artifacts
npm run verify:artifacts   # Verify dist and root artifacts are identical
npm run ci                 # Build and run all repository checks
```

Edit source files under `src/`. Userscript metadata is defined in
[`vite.config.js`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/vite.config.js),
and the version comes from
[`package.json`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/package.json).

After every change:

1. update the version using Semantic Versioning;
2. run `npm run ci`;
3. include the regenerated `.user.js` and `.meta.js` artifacts.

Do not edit minified generated artifacts directly and do not commit temporary
localhost update URLs.

See also:

- [`AGENTS.md`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/AGENTS.md) — architecture notes for AI coding agents
- [`DESIGN.md`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/DESIGN.md) — visual language and Letterboxd UI tokens
- [`docs/letterboxd-dom/`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/docs/letterboxd-dom/README.md) — stable page selectors and data maps
- [`SECURITY.md`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/SECURITY.md) — how to report a vulnerability

## Affiliation

Letterboxd Plus is an independent community project. It is **not affiliated
with or endorsed by Letterboxd, Rotten Tomatoes, Metacritic, Fandango, Google,
or their owners**. All product names and trademarks belong to their respective
owners.

## License

[MIT](https://github.com/NemoKing1210/letterboxd-plus/blob/main/LICENSE) —
Copyright © 2026 NemoKing
