/** Fase 1: conciliação de faturas de cartão.
 * Mantém a conferência separada do status de pagamento da fatura/agendamento.
 */
import { addMoney, fromCents, toCents } from './money-math.js';
import { invoiceItemCents } from './financial-ledger.js';

export const RECONCILIATION_STATUS = Object.freeze({
    OPEN: 'em aberto',
    PENDING: 'aguardando conferência',
    DIFFERENCE: 'diferença encontrada',
    RECONCILED: 'conciliada'
});

const asDate = value => new Date(`${value}T12:00:00`);

/** Período de uma fatura: dia seguinte ao fechamento anterior até o fechamento atual. */
export function getInvoicePeriod(card, year, month) {
    const closingDay = Math.max(1, Math.min(31, Number(card?.fechamento || card?.diaFechamento || 31)));
    const currentMonthLastDay = new Date(year, month + 1, 0).getDate();
    const previousMonthLastDay = new Date(year, month, 0).getDate();
    const end = new Date(year, month, Math.min(closingDay, currentMonthLastDay), 12);
    const previousClosingDay = Math.min(closingDay, previousMonthLastDay);
    const start = new Date(year, month - 1, previousClosingDay + 1, 12);
    return { start, end };
}

export function listInvoiceTransactions(transactions, card, year, month) {
    const { start, end } = getInvoicePeriod(card, year, month);
    return (transactions || []).filter(t => {
        if (!t || !t.isCartao || t.transferenciaInterna) return false;
        if (String(t.bancoId) !== String(card?.id)) return false;
        if (t.faturaChave) return t.faturaChave === invoiceReconciliationKey(card.id, year, month);
        const date = asDate(t.data);
        return !Number.isNaN(date.getTime()) && date >= start && date <= end;
    });
}

export const RECONCILIATION_ADJUSTMENT_TYPES = Object.freeze({
    INTEREST: 'interest', FINE: 'fine', FEES: 'fees', IOF: 'iof', MISSING_PURCHASE: 'missing_purchase',
    UNRECOGNIZED_PURCHASE: 'unrecognized_purchase', REFUND: 'refund', MANUAL: 'manual'
});

const roundCurrency = value => fromCents(toCents(value));
export { roundCurrency };

/**
 * Adjustments are explanations only: they never create transactions or alter balances.
 * `amount` is always a positive magnitude; `effect`/`sign` express its impact.
 */
export function normalizeAdjustment(adjustment = {}) {
    const amount = fromCents(Math.abs(toCents(adjustment.amount ?? adjustment.valor)));
    const effect = adjustment.effect === 'credit' || adjustment.sign === -1 || adjustment.sign === '-' || adjustment.sign === '-1'
        ? 'credit' : 'charge';
    return { ...adjustment, amount: roundCurrency(amount), effect, sign: effect === 'credit' ? -1 : 1 };
}

export function calculateAdjustmentTotal(adjustments = []) {
    const totalCents = (adjustments || []).reduce((sum, adjustment) => {
        const item = normalizeAdjustment(adjustment);
        const amountCents = toCents(item.amount);
        return sum + (item.effect === 'credit' ? -amountCents : amountCents);
    }, 0);
    return fromCents(totalCents);
}

export const reconciliationFingerprint = (transactions = [], amount = null, adjustments = []) => JSON.stringify({
    amount: amount === null ? null : toCents(amount),
    items: transactions.map(t => [String(t.id), t.data, t.tipo, toCents(t.valor), t.desc]).sort((a, b) => a[0].localeCompare(b[0])),
    adjustments: adjustments.map(a => [String(a.id), a.effect, toCents(a.amount), a.description, a.transactionId || null]).sort((a, b) => a[0].localeCompare(b[0]))
});

export const transactionFingerprint = t => JSON.stringify([String(t.id), t.data, t.tipo, toCents(t.valor), t.desc, String(t.bancoId)]);

export function calculateReconciliation(transactions, realInvoiceAmount = null, adjustments = [], evidence = {}) {
    const totalRecordedCents = (transactions || []).reduce((sum, t) => sum + invoiceItemCents(t), 0);
    const totalRecorded = fromCents(totalRecordedCents);
    const postedIds = new Set((transactions || []).map(t => String(t.id)));
    const totalAdjustments = calculateAdjustmentTotal(adjustments.filter(a => !a.transactionId || !postedIds.has(String(a.transactionId))));
    const explainedTotal = addMoney(totalRecorded, totalAdjustments);
    const hasRealAmount = realInvoiceAmount !== null && realInvoiceAmount !== undefined && realInvoiceAmount !== '' && Number.isFinite(Number(realInvoiceAmount));
    const realAmount = hasRealAmount ? roundCurrency(realInvoiceAmount) : null;
    const difference = realAmount === null ? null : addMoney(realAmount, -explainedTotal);
    let status;
    if (realAmount === null) status = totalRecorded > 0 || adjustments.length ? RECONCILIATION_STATUS.PENDING : RECONCILIATION_STATUS.OPEN;
    else if (toCents(difference) !== 0) status = RECONCILIATION_STATUS.DIFFERENCE;
    else status = evidence.confirmedAt && evidence.confirmedFingerprint === reconciliationFingerprint(transactions, realAmount, adjustments)
        ? RECONCILIATION_STATUS.RECONCILED : RECONCILIATION_STATUS.PENDING;
    return { totalRecorded, totalAdjustments, explainedTotal, realInvoiceAmount: realAmount, difference, status, totalMatches: realAmount !== null && toCents(difference) === 0 };
}

export function invoiceReconciliationKey(cardId, year, month) {
    return `${String(cardId)}:${Number(year)}-${String(Number(month) + 1).padStart(2, '0')}`;
}
