# Transactions page redesign — manual checklist

Run from `index.html` with the app's normal local/static serving setup.

## Visual and responsive

- [ ] Open **Transações** and confirm the shared eyebrow/title/subtitle header, summary cards, single transactions panel, prominent search, and exactly one primary **Nova transação** action.
- [ ] Confirm **Exportar**, **Importar OFX**, and **Importar CSV** are secondary utility actions and do not compete visually with the primary CTA.
- [ ] Confirm all visible values come from the current data (no placeholder/example transaction values).
- [ ] Check desktop widths: income/expense/balance values are easy to scan and amounts are right-aligned.
- [ ] Check a narrow mobile viewport: the header actions remain usable, filters stack, rows remain readable, and Editar/Apagar actions are not hover-only.
- [ ] Check light and dark themes; verify text, borders, semantic income/expense colors, focus rings, and category icons remain legible.

## Filters, tabs, and pagination

- [ ] Search by part of a description and by a transaction identifier; clear it with **Limpar filtros**.
- [ ] Use **Todas**, **Receitas**, **Despesas**, and **Transferências** tabs; confirm the selected tab and results update.
- [ ] Use the Período/month and Tipo controls and confirm they remain synchronized with the tabs.
- [ ] Open **Mais filtros** and test category, account/card, start date, end date, and reset behavior. Count active values across search, category, account/card, month, type, start date and end date; confirm the clear action is hidden with zero active filters and reads **Limpar N filtros** when filters are active.
- [ ] Change rows per page, move between pages, and verify page 1 is restored after changing a filter.

## Data actions and semantics

- [ ] Create a new income and expense through the existing modal; confirm the new row and real summary update. The success confirmation keeps its original message and exposes an accessible **Ver lançamento** action that navigates to **Transações**.
- [ ] Confirm **Ver lançamento** is a real toast button handled by the existing `navigate` contract, not a `data-action` string embedded in toast text; destructive/delete confirmations do not receive this action.
- [ ] Create a transfer; confirm both transfer legs remain visible under **Transferências**, show the correct `+`/`−` direction, and are excluded from income/expense/balance totals.
- [ ] Select one row, select the visible page, deselect it, classify selected rows where available, and use bulk deletion; verify the existing selection hooks still work.
- [ ] Edit a transaction from the visible **Editar** action and confirm its data and metadata persist.
- [ ] Delete a transaction from **Apagar** and confirm it is removed after the existing confirmation flow.
- [ ] Export the filtered transactions to CSV; confirm the export uses the existing action and current filters.
- [ ] Start OFX import from the existing **Importar OFX** action and confirm the normal import flow opens.
- [ ] Start CSV import from the existing **Importar CSV** action and confirm the normal import flow opens.
- [ ] Verify descriptions, categories, account names, contact names, payment methods, identifiers, and other user-controlled metadata render escaped.

## Phase 1 responsive acceptance

- [ ] At 375px and 400px wide, keep the primary CTA readable, keep utility actions keyboard/touch reachable, and keep the search field prominent without horizontal overflow.
- [ ] At 375px and 400px wide, keep **Mais filtros** compact/collapsible while category, account/card, date range, and clear-filter controls remain usable when expanded.
- [ ] Repeat the header, filter, selection, pagination, import/export, and row-action checks in light and dark themes.
