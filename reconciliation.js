/** Fase 1: conciliação de faturas de cartão.
 * Mantém a conferência separada do status de pagamento da fatura/agendamento.
 */
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

const roundCurrency = (value) => Math.round((Number(value || 0) + 1e-9) * 100) / 100;

export function calculateReconciliation(transactions, realInvoiceAmount = null) {
    const totalRecorded = roundCurrency((transactions || []).reduce((sum, t) => sum + (Number(t.valor) || 0), 0));
    const hasRealAmount = realInvoiceAmount !== null && realInvoiceAmount !== undefined && realInvoiceAmount !== '' && Number.isFinite(Number(realInvoiceAmount));
    const realAmount = hasRealAmount ? Number(realInvoiceAmount) : null;
    const difference = realAmount === null ? null : roundCurrency(realAmount - totalRecorded);
    let status;
    if (realAmount === null) status = totalRecorded > 0 ? RECONCILIATION_STATUS.PENDING : RECONCILIATION_STATUS.OPEN;
    else status = Math.abs(difference) <= 0.01 ? RECONCILIATION_STATUS.RECONCILED : RECONCILIATION_STATUS.DIFFERENCE;
    return { totalRecorded, realInvoiceAmount: realAmount, difference, status };
}

export function invoiceReconciliationKey(cardId, year, month) {
    return `${cardId}:${year}-${String(Number(month) + 1).padStart(2, '0')}`;
}
