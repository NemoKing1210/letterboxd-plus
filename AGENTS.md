# AGENTS.md — Letterboxd Plus

Instructions for AI coding agents working in this repository.

## Project

Letterboxd Plus is a vanilla JavaScript userscript that augments
[Letterboxd](https://letterboxd.com/) with external film ratings and
quality-of-life features. It is built with Vite and `vite-plugin-monkey` for
Tampermonkey, Violentmonkey, Greasemonkey, ScriptCat, and compatible managers.

- Source entry point: `src/main.js`
- Version source of truth: `package.json`
- Generated install artifacts: `letterboxd-plus.user.js` and
  `letterboxd-plus.meta.js`
- License: MIT

Edit files under `src/`. Never hand-edit generated `.user.js` or `.meta.js`
files; regenerate them with `npm run build`.

## Architecture

- `src/main.js` initializes the userscript, registers the settings command,
  and rescans dynamic Letterboxd pages.
- `src/constants.js` contains storage keys, defaults, URLs, and timeouts.
- `src/cache.js` owns rating cache persistence, usage statistics, and cleanup.
- `src/settings.js` validates and persists settings through GM storage.
- `src/api/` contains external integrations. Cross-origin requests use
  `GM_xmlhttpRequest`.
- `src/features/` contains DOM integrations and settings UI.
- `src/styles/main.css` contains namespaced injected styles.
- `scripts/` copies and verifies generated install artifacts.

Rotten Tomatoes and Metacritic data is read from their public web endpoints
without user credentials. Treat both as unreliable external boundaries: use
timeouts, cache successful results, tolerate missing scores, and never block
Letterboxd when either source fails.

## Conventions

- Use vanilla JavaScript ESM; do not introduce a framework or TypeScript unless
  explicitly requested.
- Import userscript APIs from `$`.
- Keep all classes, attributes, and storage keys in the `lbp` namespace.
- Make DOM mounting idempotent because Letterboxd may replace navigation or
  page sections dynamically.
- Prefer stable semantic selectors and data attributes over generated CSS
  module class names.
- Make every injected interface look and behave as close to Letterboxd's
  native UI as possible. Reuse its established colors, typography, spacing,
  section structure, control shapes, states, and interaction patterns before
  introducing custom visual language.
- Preserve keyboard navigation, visible focus, ARIA relationships, responsive
  behavior, and `prefers-reduced-motion`.
- Escape or safely assign external text and URLs before inserting them into the
  DOM.
- Keep `@connect`, `@match`, and GM grants restricted to actual requirements.
- Do not imply affiliation with Letterboxd, Rotten Tomatoes, or Metacritic.

## Settings

Settings are stored under `lbp_settings`. The settings entry belongs in the
account dropdown immediately after Letterboxd's native `/settings/` item and is
also available through `GM_registerMenuCommand`.

Add defaults to `DEFAULT_SETTINGS`, normalize persisted values in
`src/settings.js`, and expose user-facing controls in
`src/features/settings-panel.js`.

## Localization

Supported UI locales are `en`, `ru`, `es`, `pt-BR`, `de`, `fr`, and `zh-CN`;
`auto` detects the browser language and falls back to English. Keep every
user-facing string in `src/i18n/index.js` and add each new key to all seven
translation maps. Do not hardcode interface copy in feature modules.

## Versioning

Update the project version with every completed change. Follow Semantic
Versioning and choose the increment according to the scope:

- **Major** (`X.0.0`) for incompatible behavior, storage migrations, or
  breaking changes that require user action.
- **Minor** (`0.X.0`) for new backward-compatible features or substantial
  enhancements.
- **Patch** (`0.0.X`) for bug fixes, styling adjustments, documentation,
  maintenance, and other backward-compatible small changes.

Keep the version synchronized in `package.json` and `package-lock.json`.
The userscript metadata and `SCRIPT_VERSION` are generated from
`package.json`; run `npm run build` after bumping the version to refresh both
root artifacts.

## Build and verification

Requires Node.js 22.

```bash
npm install
npm run dev
npm run build
npm run verify:artifacts
npm run ci
```

After every source, style, metadata, or version change, run `npm run build` so
the root install artifacts stay synchronized. Before finishing, run
`npm run ci` and check diagnostics for edited files.

## Do not

- Hand-edit `letterboxd-plus.user.js` or `letterboxd-plus.meta.js`.
- Commit `node_modules/`, `dist/`, or development-only update URLs.
- Scrape aggressively, retry indefinitely, or cache request failures as valid
  ratings.
- Break Letterboxd navigation, account menus, rating controls, or responsive
  layout.
