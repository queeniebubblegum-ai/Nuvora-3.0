# Interaction regression checklist — accounts/cards and transactions

## Accounts and cards

- [ ] Open **Contas** with at least one existing bank account and no cards.
- [ ] In the cards empty state, click **Adicionar cartão**. The existing `modal-cartao` must open; the account select must contain the linked bank.
- [ ] Fill and submit the card form. Confirm the card is created, the page rerenders, and the card remains linked to the selected bank (including when the persisted bank ID is a string).
- [ ] With no bank accounts, confirm the bottom card CTA says **Adicionar conta primeiro**, opens the existing `modal-banco`, and shows the prerequisite message without creating an unlinked card.
- [ ] With at least one bank, confirm the bottom **Adicionar cartão** CTA is enabled and opens the existing `modal-cartao` (the account select contains the linked bank).
- [ ] On a narrow viewport, scroll until the bottom CTA is near the floating speed-dial button and confirm the CTA still receives the click; its hit area must remain above the fixed speed-dial layer.
- [ ] With at least one bank, open the header **Adicionar** menu and confirm its **Cartão** action opens the same `modal-cartao`; without a bank it follows the same safe account-first path.

## Transactions

- [ ] Open **Transações** with at least one transaction whose ID is numeric and one whose ID is a string, if available.
- [ ] Click the visible **Editar** icon/text in a row (including directly on its icon). The existing `modal-editar-transacao` must open for that exact row.
- [ ] Unlock, change a value, save, and confirm the row updates without changing its ID or financial type.
- [ ] Click **Apagar** in a row. Confirm the existing confirmation prompt appears; cancel once and verify the row remains, then confirm and verify the existing soft-delete/undo behavior.
- [ ] Repeat edit/delete on a card transaction and a transfer only if safe test data is available; verify the existing installment/transfer safeguards remain unchanged.

## Regression boundaries

- [ ] Confirm no duplicate modal or inline registration flow was introduced.
- [ ] Confirm card, transaction, invoice, import, and destructive-action confirmations continue to use the existing handlers/controllers.
- [ ] Automated static assertions are in `interaction-regressions.test.js` and cover action names, modal IDs, string IDs, and the disabled no-bank guard.
