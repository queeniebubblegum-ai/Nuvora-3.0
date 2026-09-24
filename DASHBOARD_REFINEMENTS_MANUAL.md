# Dashboard refinements — manual checklist

## Dashboard hierarchy and actions

- [ ] Confirm the header has one primary **Novo lançamento** action. On desktop it opens a real accessible type selector with Receita, Despesa and Transferência; on mobile the fixed FAB keeps the quick speed-dial access.
- [ ] Confirm **Fechar mês** and **Simular** remain secondary actions and retain their existing delegated `data-action`/modal contracts.
- [ ] Confirm the period selector is adjacent to the header and the section order is: summary metrics; one prioritized **Próxima decisão** or non-duplicative **Atenção agora** signal; Contas e cartões; Anora; Agenda financeira/Categorias; Pilares.
- [ ] On the mobile speed dial, open with the FAB and confirm its first item receives focus on the next frame, all items are tabbable only while open, and Escape closes the menu, restores `tabindex="-1"`, synchronizes `aria-hidden`/`aria-expanded`, and returns focus to the FAB. Confirm the desktop hidden behavior is unchanged.
- [ ] Confirm the large financial summary area is transparent and does not create a nested card, while the three actionable/informational metric cards remain visible. The heading reads **Visão de [período]** and **Resultado financeiro**, with a separate **Saldo atual: ...** context.

## Period context and empty states

- [ ] Switch among **Este mês**, **Mês passado**, **Trimestre** and **Este ano**; confirm the heading uses the selected period and unknown/stale values safely fall back to **este ano**.
- [ ] Select a period with no expenses and confirm Principais Categorias shows the chart-pie empty state, explanatory text, and a working **Adicionar despesa** CTA that opens `modal-transacao` with `data-type="despesa"`.
- [ ] Confirm category rows remain unchanged when the selected period contains expenses.
- [ ] Confirm period labels and balances remain safe with unusual/stale local-state values.

## Financial semantics

- [ ] Select a period and confirm **Saldo atual** equals the global balance (not the selected period).
- [ ] Confirm **Resultado do período** equals filtered period receitas minus filtered period despesas.
- [ ] Confirm **Próximos vencimentos** includes only pending expense accounts due from today through the end of the current month; an overdue account is not included in this card.
- [ ] Confirm overdue pending accounts remain available in Planning/Agenda for follow-up.
- [ ] Confirm no transaction or total calculation changes when switching periods.

## Prioridade global

- [ ] Quando houver mais de um sinal, confirme que apenas a decisão vencedora conduz a ação principal, nesta ordem: contas vencidas; saldo global negativo; orçamento ultrapassado; uso alto de cartão (80% ou mais); recomendação acionável da Anora; sinal informativo.
- [ ] Confirme que os blocos **Próxima decisão**, **Atenção agora**, CTA do cabeçalho e ação compacta da Anora não repetem a mesma urgência nem competem por rotas diferentes.
- [ ] Valores ausentes, limites inválidos/zerados, cartões sem compras e recomendação de retorno ao Dashboard não devem criar alertas.

## Atenção agora

- [ ] With no overdue account, card at/above 80% utilization, exceeded category budget, or negative global balance, confirm the strip is not rendered (no empty placeholder).
- [ ] Add an overdue pending expense with a valid date and confirm one prioritized **Próxima decisão** block renders before secondary alerts; activate **Ver contas vencidas** and confirm it navigates to **Agendamentos** without a duplicate overdue action.
- [ ] With no overdue account but one or more valid pending expenses due today through month-end, confirm the decision block says **Antecipe os próximos vencimentos** and its **Ver próximos vencimentos** action opens **Agendamentos**.
- [ ] Confirm overdue accounts are excluded from **Próximos vencimentos**, while pending expenses due today through month-end remain included; invalid/missing dates do not create either alert or total.
- [ ] Test a card with real transactions at exactly 80% and above its limit threshold; confirm one consolidated card alert and **Ver cartões** opens **Contas**. Confirm missing limit/transactions do not create a false alert.
- [ ] With a current-month budget exceeded in one or more categories, confirm one consolidated **Orçamento ultrapassado** alert and **Revisar orçamento** opens **Orcamento**.
- [ ] Confirm a negative global account balance creates one **Saldo global negativo** alert, with a keyboard-visible action and no duplicate balance alert.
- [ ] Check the strip in light/dark themes and at narrow width: text wraps without horizontal overflow, actions remain keyboard reachable, icons are decorative, and each action has an accessible label.

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
