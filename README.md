# Avenera

Avenera is a local-first personal finance interface. `input.css` is the Tailwind source and `styles.css` is the checked-in runtime stylesheet consumed by `index.html`.

## Development

```sh
npm install
npm run build       # regenerate runtime CSS from input.css
npm test            # Vitest unit/contract suite
npm run dev         # watch input.css -> styles.css
```

The token contract is documented in `TOKEN_CONSOLIDATION_PROPOSAL.md` and checked by `token-contract.test.js`. Keep source/runtime CSS synchronized; do not hand-edit `styles.css`.

## Deterministic demo data

See `DEMO_FIXTURES.md`. Scenarios are pure, detached, and opt-in; they never load into or mutate the real database.

## Responsive visual checks

See `VISUAL_TESTING.md`. Playwright is intentionally optional and excluded from `npm test`:

```sh
npm install --save-dev @playwright/test
npx playwright install chromium
npm run test:visual
```

Visual output, traces, browser caches, and reports are ignored by `.gitignore` and should not be committed. For the release checklist, see `P2_P3_VALIDATION_MANUAL.md`.
