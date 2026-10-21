import { addMoney, fromCents, toCents } from './money-math.js';
import { isInvoicePayment, invoiceItemCents } from './financial-ledger.js';
import { calculateReconciliation, invoiceReconciliationKey, listInvoiceTransactions } from './reconciliation.js';
import { cardInvoiceDueDate } from './invoice-provisioning.js';

export const invoiceCycleForDate = (card, date) => {
    const d = new Date(`${date}T12:00:00`);
    if (Number.isNaN(d.getTime())) throw new Error('Informe uma data válida.');
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const closing = Math.min(Number(card.fechamento || card.diaFechamento || 31), last);
    const cycle = new Date(d.getFullYear(), d.getMonth() + (d.getDate() > closing ? 1 : 0), 1, 12);
    return invoiceReconciliationKey(card.id, cycle.getFullYear(), cycle.getMonth());
};

export const invoicePaymentKey = (tx, card, schedules = []) => {
    if (tx.invoiceReconciliationKey) return tx.invoiceReconciliationKey.slice(0, tx.invoiceReconciliationKey.lastIndexOf(':')) === String(card.id) ? tx.invoiceReconciliationKey : null;
    const schedule = schedules.find(s => String(s.id) === String(tx.invoicePaymentAgendamentoId));
    if (!schedule || String(schedule.cartaoId) !== String(card.id)) return null;
    const [year, month] = String(schedule.mesReferencia || schedule.dataVencimento).split('-').map(Number);
    const closing = Number(card.fechamento || card.diaFechamento || 31);
    const due = Number(card.vencimento || card.diaVencimento || 1);
    const cycle = new Date(year, month - 1 - (due <= closing ? 1 : 0), 1, 12);
    return invoiceReconciliationKey(card.id, cycle.getFullYear(), cycle.getMonth());
};

export const invoiceModel = (database, card, year, month) => {
    const key = invoiceReconciliationKey(card.id, year, month);
    const record = (database.conciliacoesFaturas || []).find(r => r.chave === key);
    const items = listInvoiceTransactions(database.transacoes, card, year, month);
    const reconciliation = calculateReconciliation(items, record?.valorFaturaReal, record?.ajustes || [], record);
    const payments = (database.transacoes || []).filter(t => isInvoicePayment(t) && invoicePaymentKey(t, card, database.agendamentos) === key);
    const paid = fromCents(payments.reduce((sum, t) => sum + toCents(t.valor), 0));
    const total = reconciliation.realInvoiceAmount ?? reconciliation.explainedTotal;
    const outstanding = Math.max(0, addMoney(total, -paid));
    return { ...reconciliation, key, items, record, total, paid, outstanding, payments,
        dueDate: cardInvoiceDueDate(card, year, month), paymentStatus: outstanding === 0 && paid > 0 ? 'paga' : paid > 0 ? 'parcialmente paga' : 'não paga' };
};

export const cardCreditUsed = (database, card) => {
    const purchaseCents = (database.transacoes || []).filter(t => t.isCartao && String(t.bancoId) === String(card.id))
        .reduce((sum, t) => sum + invoiceItemCents(t), 0);
    const paidCents = (database.transacoes || []).filter(t => isInvoicePayment(t) && invoicePaymentKey(t, card, database.agendamentos))
        .reduce((sum, t) => sum + toCents(t.valor), 0);
    const unpostedCents = (database.conciliacoesFaturas || []).filter(r => String(r.cardId) === String(card.id))
        .flatMap(r => r.ajustes || []).filter(a => !a.transactionId || !(database.transacoes || []).some(t => String(t.id) === String(a.transactionId) && t.isCartao))
        .reduce((sum, a) => sum + toCents(a.amount) * (a.effect === 'credit' ? -1 : 1), 0);
    return Math.max(0, fromCents(purchaseCents + unpostedCents - paidCents));
};
