# Responsive visual validation

The normal unit suite remains Vitest-only. Responsive checks are opt-in because this repository does not vendor a browser binary or `@playwright/test` by default.

## Setup and run

```sh
npm install --save-dev @playwright/test
npx playwright install chromium
npm run test:visual
```

The suite starts a local Python HTTP server and covers Dashboard, Transactions, Planning, Accounts/Cards, Reports, and Categories at 1440px, 768px, 400px, and 375px. It asserts that the rendered main content is visible and that document/main scroll width does not exceed the viewport. Each run writes named screenshots into Playwright's ignored test output; screenshots are evidence for manual review, not fake pixel assertions.

To run one viewport or route:

```sh
npx playwright test -c playwright.config.js --project=mobile-375 --grep Categories
```

No screenshots or browser caches belong in source control. The spec does not load demo fixtures automatically; use `demo-fixtures.js` explicitly in a dedicated test/dev adapter if a populated visual state is required.
