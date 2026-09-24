# Token consolidation contract

`input.css` is the authoritative source and `styles.css` is the checked-in runtime output consumed by `index.html`. Regenerate runtime CSS with `npm run build`; never hand-edit it when Tailwind is available. In environments without Node/npm, the runtime token block must still be kept synchronized before handoff (the P2 pass includes that fallback update).

## Contract

The `:root` and `.dark` blocks preserve the approved off-white/grafite and charcoal/sage/purple identity while centralizing:

- typography: Inter family, type scale, weights, line heights and label tracking;
- spacing: `--space-1` through `--space-8`;
- shape: control, panel, card and pill radii;
- surfaces/elevation: page/card/muted/overlay aliases and three elevation levels;
- semantic states: positive, negative, attention, informative and neutral foreground/surface aliases.

Existing `--c-*`, `--radius-*`, `--shadow-*`, and Tailwind aliases remain backwards-compatible. Light/dark values continue to be driven by the existing semantic color palette; the new aliases do not introduce a separate theme.

Representative shared surfaces now consume the aliases: Dashboard cards use `surface-card`, `space-5`, and `elevation-1`; modal shells use `surface-overlay` and `elevation-overlay`; report comparison and skeleton surfaces use the shared shape/spacing/elevation tokens; financial positive/negative values use semantic state aliases. Legacy classes remain untouched unless they are part of a shared representative surface.

`token-contract.test.js` verifies source declarations, runtime presence/value parity for stable tokens, theme aliases, and representative component usage. Run it with:

```sh
npm test -- token-contract.test.js
```

Financial calculations, routes, persistence, and data-driven bank/category colors are intentionally outside this token contract.
