# Avenera 3.0 — consolidated invoice-modal audit

## Root cause

The current source already contains the source-aware close and network-first changes from the prior modal fix. The remaining deployed symptom was cache identity: `service-worker.js` still used the old `avenera-app-shell-v1` cache name, so an existing registration could retain the pre-fix shell (including the transient backdrop/line behavior) while the source comments and files appeared fixed. The modal also had no visible recovery if invoice data/rendering threw after the backdrop opened. The fix bumps the shell cache and makes rendering failure visible while preserving the modal's close action.

The consolidated fix keeps the existing delegated actions and reconciliation/category behavior, but makes close source-aware for nested modal flows. Global close remains unchanged for route changes and resets. Local shell caching is network-first with offline cache fallback and a bumped cache name.

## Installation list

Copy these files over the matching files in the Avenera deployment:

- `app.js`
- `rnd-ui.js`
- `cmp-modals.js`
- `service-worker.js`
- `invoice-modal.test.js` (targeted regression contract test)

No database, reconciliation, category, or invoice-rendering data files were changed.

## Validation

Static audit completed across modal markup, delegated events, open/close lifecycle, DOM insertion, z-index values, renderer, controller calls, service worker, and cumulative `.orig*` snapshots. JavaScript syntax/runtime/browser tests could not be executed in this environment because `node`/`npm` are unavailable. No browser validation is claimed.
