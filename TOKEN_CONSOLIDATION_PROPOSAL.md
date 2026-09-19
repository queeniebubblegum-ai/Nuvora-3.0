# Token consolidation proposal (pre-redesign)

This is documentation only; no visual token values were changed in this pass.

## Current source tokens

`input.css:7-29` is the current CSS-variable block:

- `:root`: `--c-bg`, `--c-surface`, `--c-border`, `--c-text-primary`, `--c-text-secondary`, `--c-brand-deep`, `--c-brand-dark`, `--c-brand-medium`, and `--c-brand-soft`.
- `.dark`: the same nine variables for dark mode.

`tailwind.config.js:15-28` maps the same variables to the utility color names `bg`, `surface`, `border`, `text-primary`, `text-secondary`, `brand-deep`, `brand-dark`, `brand-medium`, and `brand-soft`. Its semantic colors (`success`, `danger`, `reserve`, `credit`, and `investment`) are currently literal values and are separate from the CSS-variable palette.

## Build relationship that must be resolved first

The package scripts define Tailwind's source/output relationship:

- `npm run build`: `tailwindcss -i ./input.css -o ./styles.css --minify`
- `npm run dev`: the same input/output pair in watch mode.

`index.html` consumes `styles.css`. However, the checked-in generated file does not currently match the source token block: its generated `:root` has `--c-brand-deep: #543B75` and `--c-brand-dark: #3F2A56`, while `input.css` has `#1F0F42` and `#2E1760`; its `.dark` values also differ. Therefore `styles.css` must not be hand-edited and visual token values should not be changed until the project confirms whether `styles.css` is expected to be regenerated/committed and which source revision is authoritative.

## Safe next step for the redesign

1. Decide whether `input.css` or the current generated `styles.css` represents the intended palette, then regenerate `styles.css` from that source using the existing script and review the resulting diff.
2. Keep the nine CSS variables as the single palette source; keep Tailwind aliases pointing to them.
3. Move only fixed brand literals used as UI fallbacks (`cmp-core.js`, `cmp-pages.js`, and `index.html` theme color) to the approved semantic token. Do not fold data-driven bank/category colors into the global palette.
4. Re-scan arbitrary Tailwind color literals in the components and classify them as palette tokens, semantic status colors, or intentionally data-driven colors before changing them.
5. After the source/build relationship is confirmed, update the light/dark variable block and regenerate `styles.css` together; do not make a broad page redesign as part of token consolidation.
