# Accounts and cards redesign — manual checklist

## Page composition and data

- [ ] Open **Contas** with existing data and confirm the header reads **Contas e cartões**, includes the subtitle, import actions, and a single **Adicionar** action.
- [ ] Open **Adicionar** and confirm **Conta** opens the existing `modal-banco` and **Cartão** opens the existing `modal-cartao`; confirm no duplicate registration flow was introduced.
- [ ] Confirm the overview shows the real sum of `bancos[].saldo` and the current open invoice total from persisted card transactions/reconciliation data; confirm the next due date is derived from the card due day.
- [ ] Confirm there is no invoice-payment action anywhere on this page.

## Accounts

- [ ] Confirm **Contas** is a separate section and each account card shows alias/name, institution, type, balance, and active/inactive status.
- [ ] On a sample account, run both **OFX** and **CSV** imports from the card and confirm the existing import flow and selected bank are preserved.
- [ ] Delete a safe account and confirm the existing deletion guard/behavior remains intact; do not delete an account with linked transactions/cards during this check.
- [ ] With no accounts, confirm the account empty state opens the existing bank modal; the cards CTA remains a real enabled button, says **Adicionar conta primeiro**, opens `modal-banco`, and shows the prerequisite message without creating an unlinked card.

## Cards

- [ ] Confirm **Cartões** is a separate section and each card shows name, linked institution, last digits when present (otherwise “Final não informado”), closing day, due day, next due date, open invoice, committed amount, available limit, total limit, and utilization.
- [ ] Confirm **Abrir fatura** opens the existing invoice details modal for the same card.
- [ ] Confirm **Lançar despesa** opens the existing card-expense flow with the card ID/name, and installment calculations remain unchanged.
- [ ] Confirm card deletion keeps the existing guard when card transactions exist.
- [ ] Confirm missing optional limit/final-digit data renders a neutral fallback rather than fabricated values.

## Responsive and visual checks

- [ ] Check wide viewport: summary cards and account/card collections use a readable two-column layout without excessive empty space.
- [ ] Check narrow viewport: sections stack, action labels remain tappable, the Add menu stays within the viewport, and no horizontal overflow appears.
- [ ] Check light and dark themes, focus-visible states, disabled states, and reduced-motion behavior.

## Regression boundaries

- [ ] Confirm existing transaction editing/deletion, OFX/CSV import, invoice opening, card expense flow, and financial calculations are unchanged.
- [ ] Run the automated test suite when dependencies are available. No browser or npm validation is implied by this checklist alone.
