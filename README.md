# Letterboxd Plus

[![CI](https://github.com/NemoKing1210/letterboxd-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/NemoKing1210/letterboxd-plus/actions/workflows/ci.yml)
[![Install userscript](https://img.shields.io/badge/Install-userscript-00e054?style=for-the-badge&labelColor=14181c)](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/letterboxd-plus.user.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-40bcf4?style=for-the-badge&labelColor=14181c)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.3.2-ff8000?style=for-the-badge&labelColor=14181c)](package.json)

A lightweight userscript that extends
[Letterboxd](https://letterboxd.com/) with external film ratings and useful
interface improvements — while keeping the site familiar.

Letterboxd Plus currently adds Rotten Tomatoes scores directly to film pages
and provides a native-looking settings panel for controlling the integration.
It requires no API key and runs entirely in your browser.

Compatible with [Tampermonkey](https://www.tampermonkey.net/),
[Violentmonkey](https://violentmonkey.github.io/),
[Greasemonkey](https://www.greasespot.net/),
[ScriptCat](https://scriptcat.org/), and other managers that support the
`// ==UserScript==` metadata block.

> **Status:** early development. The current release focuses on a reliable
> foundation, settings, and Rotten Tomatoes ratings. More Letterboxd
> enhancements can be added as independent feature modules.

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

1. Open [`letterboxd-plus.user.js`](letterboxd-plus.user.js).
2. Copy the complete file.
3. Create a new script in your userscript manager.
4. Paste the file, save it, and reload Letterboxd.

## Features

### Rotten Tomatoes ratings

On Letterboxd film pages, the script adds a compact ratings section to the
native sidebar:

- **Tomatometer** critic score;
- **Certified Fresh** status when available;
- optional **Popcornmeter** audience score;
- critic review and audience rating counts;
- direct link to the matched Rotten Tomatoes film page;
- loading skeletons and non-blocking empty/error states.

The script uses the film title and release year to disambiguate search results.
Letterboxd's TMDB identifier is used as the local cache key.

### Settings

Open **Letterboxd Plus** from:

- the Letterboxd account dropdown, immediately after the native **Settings**
  item;
- the userscript manager menu through **Letterboxd Plus settings**.

The accessible tabbed panel follows Letterboxd's visual language and contains:

- **General** — interface language;
- **Film page** — Rotten Tomatoes and Popcornmeter visibility;
- **Cache** — storage meter, active and expired entry statistics, cache
  duration, and manual cleanup;
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

- Successful Rotten Tomatoes responses are cached through userscript storage.
- Cache duration is configurable from `0` to `168` hours.
- A duration of `0` always requests fresh data.
- The cache tab shows current usage against a conservative 5 MB advisory
  budget.
- Active and expired ratings are measured separately and can be cleared
  without resetting settings.
- Requests have a fixed timeout and errors never prevent Letterboxd from
  loading.
- Failed requests and missing matches are not stored as successful ratings.

## Supported pages

| Site | URL pattern | Behavior |
|------|-------------|----------|
| Letterboxd | `https://letterboxd.com/*` | Navigation settings entry and film-page enhancements |
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
        └── Rotten Tomatoes search
                    │
                    ├── match movie by title and release year
                    ├── fetch the canonical film page
                    └── read Tomatometer and Popcornmeter scorecard data
                                      │
                                      ▼
                            render in Letterboxd sidebar
```

The page scanner is idempotent and observes dynamic DOM changes, so React
navigation updates can restore the account-menu entry without creating
duplicates.

## Data source and limitations

Rotten Tomatoes does not provide a free public API for this use case.
Letterboxd Plus reads publicly available Rotten Tomatoes search and film pages
through `GM_xmlhttpRequest`.

This has several practical consequences:

- Rotten Tomatoes markup changes can temporarily break score extraction.
- Some new, obscure, or unreleased titles may not have a matching page.
- A title can exist without critic or audience scores.
- Availability can vary by network or region.

These cases are handled as reduced functionality rather than Letterboxd page
failures. The script does not submit ratings, modify Rotten Tomatoes data, or
require account credentials.

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
│   ├── constants.js                  # Settings defaults, keys, URLs, timeouts
│   ├── cache.js                      # Cache reads, writes, statistics, cleanup
│   ├── settings.js                   # Settings validation and persistence
│   ├── api/
│   │   └── rotten-tomatoes.js        # Search, scorecard parsing, cache access
│   ├── features/
│   │   ├── film-rating.js            # Film context and sidebar rendering
│   │   └── settings-panel.js         # Account-menu entry and settings dialog
│   └── styles/
│       └── main.css                  # Namespaced Letterboxd-style UI
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
├── CLAUDE.md                         # Claude entry point for AGENTS.md
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
| `@connect` | `rottentomatoes.com`, `www.rottentomatoes.com` |
| `@run-at` | `document-idle` |
| `@license` | MIT |
| `@updateURL` / `@downloadURL` | Raw GitHub userscript on `main` |

| Grant | Purpose |
|-------|---------|
| `GM_xmlhttpRequest` | Request Rotten Tomatoes pages across origins |
| `GM_getValue` / `GM_setValue` | Persist settings and successful rating cache |
| `GM_listValues` / `GM_deleteValue` | Measure and clear cached rating entries |
| `GM_addStyle` | Inject the bundled interface styles |
| `GM_registerMenuCommand` | Open settings from the userscript manager |

No access tokens, API keys, passwords, or Letterboxd session data are stored.

## Development

Requires [Node.js 22](https://nodejs.org/) as specified by [`.nvmrc`](.nvmrc).

```bash
npm install
npm run dev                # Serve an installable "dev:" userscript
npm run build              # Build dist/ and refresh root artifacts
npm run verify:artifacts   # Verify dist and root artifacts are identical
npm run ci                 # Build and run all repository checks
```

Edit source files under [`src/`](src/). Userscript metadata is defined in
[`vite.config.js`](vite.config.js), and the version comes from
[`package.json`](package.json).

After every change:

1. update the version using Semantic Versioning;
2. run `npm run ci`;
3. include the regenerated `.user.js` and `.meta.js` artifacts.

Do not edit minified generated artifacts directly and do not commit temporary
localhost update URLs.

## Affiliation

Letterboxd Plus is an independent community project. It is **not affiliated
with or endorsed by Letterboxd, Rotten Tomatoes, Fandango, or their owners**.
All product names and trademarks belong to their respective owners.

## License

[MIT](LICENSE) — Copyright © 2026 NemoKing
