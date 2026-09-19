# Transactions page redesign — manual checklist

Run from `index.html` with the app's normal local/static serving setup.

## Visual and responsive

- [ ] Open **Transações** and confirm the eyebrow, title/subtitle, summary cards, single transactions panel, visible search, and primary **Nova transação** action.
- [ ] Confirm all visible values come from the current data (no placeholder/example transaction values).
- [ ] Check desktop widths: income/expense/balance values are easy to scan and amounts are right-aligned.
- [ ] Check a narrow mobile viewport: the header actions remain usable, filters stack, rows remain readable, and Editar/Apagar actions are not hover-only.
- [ ] Check light and dark themes; verify text, borders, semantic income/expense colors, focus rings, and category icons remain legible.

## Filters, tabs, and pagination

- [ ] Search by part of a description and by a transaction identifier; clear it with **Limpar filtros**.
- [ ] Use **Todas**, **Receitas**, **Despesas**, and **Transferências** tabs; confirm the selected tab and results update.
- [ ] Use the Período/month and Tipo controls and confirm they remain synchronized with the tabs.
- [ ] Open **Mais filtros** and test category, account/card, start date, end date, and reset behavior.
- [ ] Change rows per page, move between pages, and verify page 1 is restored after changing a filter.

## Data actions and semantics

- [ ] Create a new income and expense through the existing modal; confirm the new row and real summary update.
- [ ] Create a transfer; confirm both transfer legs remain visible under **Transferências**, show the correct `+`/`−` direction, and are excluded from income/expense/balance totals.
- [ ] Select one row, select the visible page, deselect it, classify selected rows where available, and use bulk deletion; verify the existing selection hooks still work.
- [ ] Edit a transaction from the visible **Editar** action and confirm its data and metadata persist.
- [ ] Delete a transaction from **Apagar** and confirm it is removed after the existing confirmation flow.
- [ ] Export the filtered transactions to CSV; confirm the export uses the existing action and current filters.
- [ ] Start OFX import from the existing **Importar OFX** action and confirm the normal import flow opens.
- [ ] Verify descriptions, categories, account names, contact names, payment methods, identifiers, and other user-controlled metadata render escaped.
