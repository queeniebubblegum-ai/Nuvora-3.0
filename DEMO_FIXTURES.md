# Demo fixtures (opt-in only)

`demo-fixtures.js` provides deterministic scenarios for component tests and local visual tooling:

- `empty`
- `normal`
- `overdueAccounts`
- `negativeBalance`
- `overBudget`
- `highCardUtilization`
- `combinedPriority`

```js
import { buildDemoFixture, DEMO_SCENARIOS } from './demo-fixtures.js';

const fixture = buildDemoFixture('combinedPriority');
// fixture.db is shaped like the application database; the other fields are
// dashboard/priority context and a deterministic rendering state.
```

`buildDemoFixture` and `buildDemoDatabase` return detached clones. The module does not import the database and never reads or writes `localStorage`, IndexedDB, the DOM, or globals. Do not wire it into the app bootstrap or production route; fixtures are test/dev inputs only.

Run the fixture and renderer contracts with:

```sh
npm test -- demo-fixtures.test.js
```
