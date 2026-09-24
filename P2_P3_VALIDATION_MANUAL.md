# P2/P3 validation checklist

## P2 tokens

- [ ] Confirm `input.css` is the source of truth and regenerate `styles.css` with `npm run build`.
- [ ] Review light and dark surfaces, semantic states, focus rings, and overlay elevation at desktop and mobile widths.
- [ ] Verify representative Dashboard cards, report comparison, skeleton, and modal surfaces use contract aliases without changing financial behavior.
- [ ] Run `npm test -- token-contract.test.js` and inspect generated CSS diff before release.

## P3 fixtures and renderers

- [ ] Run `npm test -- demo-fixtures.test.js` and verify all seven deterministic scenarios.
- [ ] Confirm no fixture is imported by `app.js`, `db.js`, or the index bootstrap.
- [ ] Review empty, normal, overdue, negative balance, over-budget, high card utilization, and combined priority output in the renderer test.

## Responsive visual review

- [ ] Install the optional Playwright dependency and Chromium as described in `VISUAL_TESTING.md`.
- [ ] Run `npm run test:visual` at all four viewport projects.
- [ ] Inspect generated screenshots for clipping, horizontal overflow, hidden primary actions, and unreadable tables/cards. Do not commit artifacts.
