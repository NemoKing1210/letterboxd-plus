# DESIGN.md — Letterboxd Plus visual language

Reference for injected UI. Letterboxd Plus should feel native to
[Letterboxd](https://letterboxd.com/), not like a separate product skin.
Prefer matching the live site and the existing settings panel over inventing
new visual language.

When in doubt: open Letterboxd, compare against this document and
`src/styles/main.css` (especially `.lbp-settings*`), then reuse those tokens.

## Design goal

Look like Letterboxd grew an extra panel — dark charcoal surfaces, sharp small
radii, Graphik UI type, green action accents, blue links/focus, restrained
motion. Avoid glossy “game UI” effects: large blurs, foil shines, heavy scale
pops, neon gradients, pill-heavy chrome, multi-layer glow.

## Palette

Canonical tokens already live on `:root` in `src/styles/main.css`:

| Token / role | Hex / value | Use |
|--------------|-------------|-----|
| Page / deep bg | `#14181c` | Page chrome, modal headers, deep panels |
| Panel | `#2c3440` | Primary floating surfaces (settings dialog) |
| Panel secondary | `#242b33` / `#242c34` | Nested cards, score rows, footers, tabs strip |
| Raised hover | `#303840` / `#37414c` | Hovered rows and secondary buttons |
| Hairline / divider | `#456` | Section rules, modal borders, footer separators |
| Soft border | `#3d4854` / `#445566` | Card outlines |
| Text primary | `#fff` / `#f3f6f8` | Titles, strong labels |
| Text secondary | `#c8d4dc` / `#def` | Body emphasis |
| Text muted | `#9ab` | Hints, eyebrows, meta |
| Text quiet | `#789` / `#678` | Fine print, empty states |
| Brand green | `#00e054` | Primary actions, active tab underline, success |
| Link / focus blue | `#40bcf4` | Links, focus rings |
| Accent orange | `#ff8000` | Secondary meters, RT critic accent |
| Metascore bands | `#66cc33` / `#fc0` / `#e54b4b` | Provider score tone only |

External provider colors (RT orange/red, Metacritic green/yellow/red) are
allowed as **compact semantic accents** on scores, never as whole-panel themes.

## Typography

Letterboxd UI is Graphik-led; editorial titles use Tiempos.

- **UI stack:** `'Graphik Web', 'GraphikWeb', Arial, Helvetica, sans-serif`
- **Body size:** ~12–14px, line-height ~1.4–1.5
- **Titles:** white, slightly tight tracking (`-0.015em` to `-0.03em`), weight 700
- **Eyebrows / kickers:** 9–10px, weight 800, `letter-spacing: 0.12em–0.14em`,
  `text-transform: uppercase`, color `#9ab` or `#789`
- **Meta / hints:** 10–11px muted (`#9ab` / `#789`)
- **Numeric scores:** tabular nums, weight 700, letter-spacing slightly tight
- Prefer sentence case for controls; uppercase is for micro-labels and tab
  labels, not whole paragraphs

Injected UI should inherit Letterboxd’s loaded Graphik when available; do not
bundle a new display font.

## Shape and elevation

- **Radius:** mostly `3px`–`4px`. Almost never large “app card” radii (12px+)
  or fully rounded marketing pills for containers.
- **Borders:** 1px solid `#456` / `#3d4854` / `#445566`
- **Shadow:** one soft drop, e.g. `0 18px 50px rgba(0, 0, 0, 0.72)` for modals;
  avoid stacked neon glows
- **Surfaces:** flat fills. Prefer solid `#2c3440` / `#242b33` over decorative
  radial gradients and shine overlays
- **Dividers:** 1px `#456` between stacked rows and before footers

## Layout patterns

Reuse Letterboxd / settings structure before inventing new ones:

1. **Section block** — heading with bottom border `#456`, compact body below
   (sidebar ratings).
2. **Modal / dialog** — dark header `#14181c`, content on `#2c3440`, optional
   footer bar `#242b33` with right-aligned actions (settings).
3. **Nested card** — `#242b33` fill, `#3d4854` border, `3px` radius, internal
   row dividers (settings switches, about cards).
4. **Score row** — `#242c34` grid with value + label/meta; left accent bar for
   provider tone; hover to `#303840`.
5. **Hover popover / mini-card** — same panel language as settings (flat
   `#2c3440`, `4px` radius, `#445566` border), compact width (~280–320px),
   poster thumbnail + meta, quiet footer CTA. No foil/shine layer.

Spacing is tight and editorial: 8–16px gaps, 14–24px panel padding. Avoid large
empty “dashboard” padding.

## Color roles in interaction

- **Primary CTA:** green fill `#00e054`, near-black text `#07160c` / `#0b1512`
- **Secondary control:** `#37414c` / panel-2 with light border
- **Links:** `#40bcf4` on hover/focus for textual links
- **Focus:** visible `outline: 2px solid` blue (or `rgba(64, 188, 244, 0.55)`),
  never remove focus styles
- **Active tab:** white label + inset underline in green (`inset 0 -3px`)

## Motion

Letterboxd motion is short and functional:

- Opacity / small translate (`~8–12px`) over **0.15–0.2s** `ease`
- Prefer simple open/close over staged child stagger, blur-in, or scale from
  0.9
- Honor `prefers-reduced-motion: reduce` by disabling animation/transition

Hover feedback is usually a light background shift, not brightness filters on
large regions.

## Iconography and imagery

- Prefer Letterboxd-native density: small 14–16px favicons next to headings
- Posters keep Letterboxd’s 2:3 crop and modest corner radius (`~3–6px`)
- Do not invent mascots, emoji ornament, or badge stickers on hero media

## Accessibility

- Keep text contrast on dark panels (white / `#f3f6f8` on `#14181c`–`#2c3440`)
- Visible keyboard focus on every control and interactive card
- Preserve ARIA roles used by dialogs, tabs, switches, and live regions
- Do not rely on color alone for score meaning when a text label exists

## Anti-patterns (do not ship)

- Purple/indigo gradient “AI SaaS” themes
- Cream/serif editorial kits unrelated to Letterboxd
- Glassmorphism, heavy backdrop-blur on floating cards
- Shine/foil overlays and dramatic drop-shadow blurs
- Oversized rounded pills as the main layout system
- Custom display fonts that override Graphik/Tiempos
- Visual language that would still read as “another product” after removing
  Letterboxd page chrome

## Reference implementations in this repo

| Surface | Where to copy from |
|---------|--------------------|
| Tokens | `:root` in `src/styles/main.css` |
| Dialog / cards / switches / footer CTA | `.lbp-settings*` |
| Sidebar score rows | `.lbp-rating*` |
| Compact grid cards | `.lbp-cast-*` |
| Hover film mini-card | `.lbp-fmp*` in `src/styles/film-mini-profile.css` |

Before finishing UI work, compare the result to Letterboxd’s own modals,
section headings, and the settings panel side by side.
