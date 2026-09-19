# Dashboard refinements — manual checklist

## Onboarding Anora

- [ ] With no bank and no transactions, open Dashboard and confirm the Anora onboarding panel appears immediately after the greeting/header, before the financial summary, without needing to scroll.
- [ ] Confirm the onboarding CTA opens the existing bank or first-transaction modal according to the displayed setup step.
- [ ] Add a bank and confirm the onboarding guidance updates without losing existing data or changing summary calculations.
- [ ] Add the first transaction and confirm the CTA and guidance update again.
- [ ] With existing data, confirm the financial summary/accounts remain first and Anora appears afterward as contextual insight.
- [ ] Confirm the responsive order remains usable on narrow and wide viewports.
- [ ] Confirm the compact Anora panel keeps the score, insights, recommendation, and onboarding CTA readable without excessive empty space; the CTA remains visually prominent and at least 40px high.

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
