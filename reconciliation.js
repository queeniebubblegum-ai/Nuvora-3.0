/** Fase 1: conciliação de faturas de cartão.
 * Mantém a conferência separada do status de pagamento da fatura/agendamento.
 */
import { addMoney, fromCents, toCents } from './money-math.js';

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
    const end = new Date(year, month, closingDay, 12);
    // Date(year, month - 1, closingDay + 1) também trata meses curtos corretamente.
    const start = new Date(year, month - 1, closingDay + 1, 12);
    return { start, end };
}

export function listInvoiceTransactions(transactions, card, year, month) {
    const { start, end } = getInvoicePeriod(card, year, month);
    return (transactions || []).filter(t => {
        if (!t || !t.isCartao || t.transferenciaInterna) return false;
        if (String(t.bancoId) !== String(card?.id)) return false;
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

export function calculateReconciliation(transactions, realInvoiceAmount = null, adjustments = []) {
    const totalRecordedCents = (transactions || []).reduce((sum, t) => sum + toCents(t?.valor), 0);
    const totalRecorded = fromCents(totalRecordedCents);
    const totalAdjustments = calculateAdjustmentTotal(adjustments);
    const explainedTotal = addMoney(totalRecorded, totalAdjustments);
    const hasRealAmount = realInvoiceAmount !== null && realInvoiceAmount !== undefined && realInvoiceAmount !== '' && Number.isFinite(Number(realInvoiceAmount));
    const realAmount = hasRealAmount ? roundCurrency(realInvoiceAmount) : null;
    const difference = realAmount === null ? null : addMoney(realAmount, -explainedTotal);
    let status;
    if (realAmount === null) status = totalRecorded > 0 || adjustments.length ? RECONCILIATION_STATUS.PENDING : RECONCILIATION_STATUS.OPEN;
    else status = Math.abs(difference) <= 0.01 ? RECONCILIATION_STATUS.RECONCILED : RECONCILIATION_STATUS.DIFFERENCE;
    return { totalRecorded, totalAdjustments, explainedTotal, realInvoiceAmount: realAmount, difference, status };
}

export function invoiceReconciliationKey(cardId, year, month) {
    return `${String(cardId)}:${Number(year)}-${String(Number(month) + 1).padStart(2, '0')}`;
}
