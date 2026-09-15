# epaRadar brand assets

Pure SVG, no build chain, no dependencies beyond `svgo` (dev-only, for the optimize step below).
All shapes are `currentColor` — none of these files hardcode a color. The consumer sets color via
CSS/`tintColor`/`fill` on the wrapping element.

Part of the `@eparadar/theme` workspace package (`packages/theme/`) — imported by both `apps/mobile`
(via `packages/theme/src/colors.ts`, re-exported through `apps/mobile/src/constants/theme.ts`) and
`apps/web` (`@eparadar/theme/assets/*.svg`, via Vite's `?raw` import), so the mark and the palette
have exactly one source of truth across both apps. These SVGs moved here from
`apps/mobile/src/assets/brand/` when that sharing was set up.

## Files

| File | Use | Detail level |
| --- | --- | --- |
| `icon-minimal.svg` | Favicon, tab icons, anywhere ≤ ~24px | Ring + center dot only (2 shapes) |
| `icon.svg` | General web/UI icon | Ring + center dot + sweep line + one trailing wedge |
| `icon-app.svg` | App Store / Play Store icon source (1024px master) | Splits the single trailing wedge into two overlapping wedges of different opacity for a smoother fade — no other added elements |
| `lockup.svg` | Icon + wordmark lockup (EPA / RADAR stacked) | Icon reused verbatim from `icon.svg`; text is a placeholder — see TODO below |

All four share the same `viewBox="0 0 64 64"` icon geometry (center `32,32`, outer ring radius `24`,
stroke weight `6.5`), so they scale together and swapping one variant for another at a given size
never requires repositioning.

This is the second pass on the icon: the first draft also had a secondary range ring and four
cardinal tick marks on `icon-app.svg`, which read as more technical/instrument-panel than intended.
Both were cut — everything now is just the ring, the dot, the sweep line, and the trailing wedge, at
a heavier stroke weight than the original draft (`6.5` vs. the original `3.5`) so the mark reads as
confident rather than diagrammatic.

## Why three icon variants, not one

The full icon (`icon.svg`) uses a sweep line and a low-opacity trailing wedge to suggest rotation.
Both degrade at small sizes for different reasons:

- The sweep line's stroke, while heavier than the ring in early drafts, still reads as a thin
  diagonal at 16px and can alias into a smear rather than a clean line.
- The trailing wedge relies on partial opacity (`0.2`) to read as a "just swept" trail rather than
  a solid pie slice; at 16px that opacity difference isn't perceptible against most backgrounds, so
  it just looks like a smudge on the ring.

Rather than ship an icon that degrades unpredictably, `icon-minimal.svg` drops both and keeps only
the outer ring and the center dot — the two shapes that stay crisp and legible down to 16×16 (a
concentric ring + dot still reads as "radar/target," which is the same motif, just without the
motion cue). Use `icon-minimal.svg` for anything at or below ~24px; use `icon.svg` above that.

`icon-app.svg` goes the other direction: at 1024px there's room for a bit more depth without harming
legibility, so it splits the single trailing wedge into two overlapping wedges of different opacity
for a smoother fade — still nothing but circles, arcs, and lines, and still no secondary ring or
tick marks.

## Lockup notes

`lockup.svg` places the icon (unmodified, still `0–64` in both axes) to the left of two stacked
`<text>` lines: `EPA` (regular weight, top) and `RADAR` (weight 900/black, bottom), at `font-size 30`
with tight baseline spacing (`24.5` between baselines) so the two lines read as one block — larger
and tighter than the first draft (`font-size 24`, `~20.4` baseline spacing), which read as more
tentative than intended once set next to the heavier icon. Both lines are set in the same font size
— the distinction is weight, not case (both are already caps) or size.

`EPA`'s width is forced to match `RADAR`'s natural rendered width using SVG's `textLength="116"
lengthAdjust="spacing"` (letting the renderer compute the exact per-letter spacing needed) rather
than a hand-guessed `letter-spacing` value. This is honored correctly by browsers (verified in
Chromium — see below) but **not** by every SVG renderer; some minimal renderers (e.g. certain
`librsvg`/`rsvg-convert` versions) ignore `textLength` and render `EPA` at its natural, unstretched
width instead. This is a renderer limitation, not a bug in the file, and doesn't matter for
production since the text will be replaced entirely (see TODO below).

**`lockup.svg` contains a `TODO` comment**: the `<text>` elements are a structural placeholder for
layout only. Before this ships anywhere real, replace both `<text>` elements with actual letterform
outlines exported from Figma (Archivo Regular for `EPA`, Archivo Black for `RADAR`) — do not hand-draw
or approximate letterforms in code, and do not ship live `<text>` relying on the `Archivo` font being
installed on the viewer's system.

## Color

These files are intentionally monochrome (`currentColor` throughout) — the brand mark has to work
as a single flat color for print and for monochrome app icon variants (Android's `monochromeImage`,
for instance), so no color is baked into the SVGs themselves.

**Intended primary color: `#2F6FED`** — the `brand` token in
[`packages/theme/src/colors.ts`](../src/colors.ts) (`Colors.light.brand` and `Colors.dark.brand`).
It's the only color in that file that's identical between the light and dark theme objects, and it's
independently reused as the background-location notification color in
[`apps/mobile/src/lib/location-task.ts`](../../../apps/mobile/src/lib/location-task.ts) (via
`Colors.dark.brand`, imported from `@/constants/theme`) — both signals that it's treated as the fixed
brand identity color rather than a theme-adaptive UI color.

Full color inventory found in the repo (for reference — nothing here besides `#2F6FED` is a brand
color, the rest are functional UI tokens):

| Token | Light | Dark |
| --- | --- | --- |
| `background` | `#FFFFFF` | `#0B0E14` |
| `gradientTop` | `#F6F8FC` | `#151B28` |
| `backgroundElement` | `#F0F0F3` | `#171B23` |
| `backgroundSelected` | `#E4E6EC` | `#232833` |
| `border` | `#7B8291` | `#67738A` |
| `text` | `#10131A` | `#F4F6F9` |
| `textSecondary` | `#5B6472` | `#A2AAB8` |
| **`brand`** | **`#2F6FED`** | **`#2F6FED`** |
| `brandOnSurface` | `#1B54D6` | `#7EA6FF` |
| `brandText` | `#FFFFFF` | `#FFFFFF` |
| `accent` | `#C15A1A` | `#FF8A3D` |
| `success` | `#16A34A` | `#22C55E` |
| `danger` | `#C22F35` | `#FF6B6B` |

No NativeWind/Tailwind config exists in `apps/mobile` (`global.css` is empty, no `tailwind.config.*`
file) — this table is the single source of truth, consumed by `apps/mobile/src/constants/theme.ts`
and, via `apps/web/src/layouts/BaseLayout.astro`'s `define:vars`, exposed as CSS custom properties on
`apps/web` too. `apps/mobile/app.json`'s `#0B0E14` (Android adaptive-icon background, splash
background) is `Colors.dark.background` but stays a plain string literal there since JSON can't
import TS — a documented, accepted exception, not a candidate for the brand mark's color regardless.

## Regenerating / optimizing

```sh
npx svgo --config=./svgo.config.mjs -i <file>.svg -o <file>.svg
```

`svgo.config.mjs` overrides `preset-default` to keep `removeComments: false` — the default preset
strips all XML comments, which would delete the Figma-outline TODO in `lockup.svg`. Everything else
uses `preset-default` unmodified.
