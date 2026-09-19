# Dashboard refinements — manual checklist

## Dashboard hierarchy and actions

- [ ] Confirm the header has one primary **Novo lançamento** action. It toggles the existing speed dial and exposes Receita, Transferência and Despesa; no duplicate transaction CTAs appear in the header.
- [ ] Confirm **Fechar mês** and **Simular** remain secondary actions and retain their existing delegated `data-action`/modal contracts.
- [ ] Confirm the period selector is adjacent to the header and the section order is: summary metrics; Contas e cartões; Anora; Agenda financeira/Categorias; Pilares.
- [ ] Confirm the large financial summary area is transparent and does not create a nested card, while the three actionable/informational metric cards remain visible.

## Financial semantics

- [ ] Select a period and confirm **Saldo atual** equals the global balance (not the selected period).
- [ ] Confirm **Resultado do período** equals filtered period receitas minus filtered period despesas.
- [ ] Confirm **Próximos vencimentos** keeps the existing pending-account calculation through the end of the current month.
- [ ] Confirm no transaction or total calculation changes when switching periods.

## Onboarding Anora

- [ ] With no bank and no transactions, open Dashboard and confirm the Anora onboarding panel and its existing CTA still appear and open the correct setup flow.
- [ ] Add a bank and confirm the onboarding guidance updates without losing existing data or changing summary calculations.
- [ ] Add the first transaction and confirm the CTA and guidance update again.
- [ ] With existing data, confirm Anora appears after Contas e cartões as a compact recommendation/most relevant insight.
- [ ] Activate **Ver diagnóstico** with keyboard and pointer and confirm native details expansion reveals all existing insights without a dead button.
- [ ] Confirm the responsive order remains usable on narrow and wide viewports and the onboarding CTA remains at least 40px high.

## Agenda calendar

- [ ] Confirm the calendar uses Monday-first weekday labels and always renders six rows (42 cells), including outside-month days.
- [ ] Navigate to the previous and next month; confirm month/year labels and real agenda items stay aligned to their dates.
- [ ] Select a day and confirm its selected styling, accessible pressed state, and the existing day-detail modal/action remain functional.
- [ ] Confirm today has its today styling and `aria-current="date"`; use **Hoje** and confirm the view returns to the current month/day.
- [ ] Add or inspect an upcoming commitment and confirm the commitment and due-date dots/legend; mark an item complete and confirm the completed indicator.
- [ ] Confirm previous/next controls retain `data-action="changeAgendaMonth"` and inline `App.showAgendaDay(...)` compatibility.
- [ ] Check light and dark themes, keyboard focus-visible states, and mobile layout at a narrow width; confirm the reduced day cells remain easy to tap (at least ~40px high) and the 42-cell grid does not overflow.

## Contas e cartões no Dashboard

- [ ] Confirm the Dashboard renders **Contas** and **Cartões** as two independent neutral-surface cards, with the account card first and the card card second.
- [ ] With sample data, confirm account balances remain correct and use the healthy sage treatment; confirm each card keeps its available amount, limit, utilization calculation, progress state, and linked bank identity color.
- [ ] Confirm cards sit side by side when the viewport has room and stack without horizontal overflow on a narrow viewport; check light and dark themes.
- [ ] Confirm the existing Contas page still exposes each card's **Faturas** and **Lançar** actions and that each action opens the same existing flow.

## Regression boundaries

- [ ] Confirm financial totals, filters, transaction actions, and unrelated pages are unchanged.
- [ ] Run the automated test suite when dependencies are available. No browser or npm validation is implied by this checklist alone.
