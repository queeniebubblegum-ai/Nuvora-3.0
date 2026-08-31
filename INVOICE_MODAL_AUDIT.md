# Nuvora 3.0 — consolidated invoice-modal audit

## Root cause

The installed code had cumulative Fase 1/2 changes, but modal ownership was still global: the delegated `closeModal` action called `App.closeModal(true)` without identifying its source. `UI.closeModal` then hid and reset every modal and cleared `activeCardId`. When invoice details opened an edit modal, closing edit could therefore destroy the invoice state as well. In addition, the service worker used stale-while-revalidate for the local shell, so a freshly installed deployment could keep serving old JS/CSS/HTML until a reload.

The consolidated fix keeps the existing delegated actions and reconciliation/category behavior, but makes close source-aware for nested modal flows. Global close remains unchanged for route changes and resets. Local shell caching is network-first with offline cache fallback and a bumped cache name.

## Installation list

Copy these files over the matching files in the Nuvora deployment:

- `app.js`
- `ui.js`
- `evt-click.js`
- `service-worker.js`
- `invoice-modal.test.js` (targeted regression contract test)

No database, reconciliation, category, or invoice-rendering data files were changed.

## Validation

Static audit completed across modal markup, delegated events, open/close lifecycle, DOM insertion, z-index values, renderer, controller calls, service worker, and cumulative `.orig*` snapshots. JavaScript syntax/runtime/browser tests could not be executed in this environment because `node`/`npm` are unavailable. No browser validation is claimed.
