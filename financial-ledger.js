import { fromCents, toCents } from './money-math.js';

// Canonical definitions for realized financial movements. Keep calculations and
// analytics on these predicates so transfers and invoice payments are not
// counted as ordinary income/expense in one screen but not another.
export const isInvoicePayment = tx =>
    tx?.tipo === 'pagamento-fatura' ||
    (tx?.categoria === 'Pagamento de Fatura' &&
     tx?.formaPagamento === 'Automático (Agendamento)');

export const isTransfer = tx =>
    tx?.transferenciaInterna === true ||
    tx?.tipo === 'transferencia' ||
    // Retain compatibility with legacy rows recognized by older analytics.
    tx?.tipoTransferencia === 'interna';

export const isIncome = tx =>
    !isTransfer(tx) && !isInvoicePayment(tx) && tx?.tipo === 'receita';

export const isExpense = tx =>
    !isTransfer(tx) && !isInvoicePayment(tx) && tx?.tipo === 'despesa';

export const isConsumptionExpense = tx => isExpense(tx) || isCardRefund(tx);
export const consumptionExpense = tx => fromCents(isCardRefund(tx) ? -toCents(tx.valor) : isExpense(tx) ? toCents(tx.valor) : 0);
export const isCardRefund = tx => tx?.isCartao === true && tx?.tipo === 'estorno-cartao';
export const invoiceItemCents = tx => toCents(tx?.valor) * (isCardRefund(tx) ? -1 : 1);
export const isCashflowMovement = tx => !tx?.isCartao &&
    !tx?.alocacaoMetaVirtual && (isIncome(tx) || isExpense(tx) || isInvoicePayment(tx));
export const isCashInflow = tx => isTransfer(tx) && !isInvoicePayment(tx)
    ? tx.transferenciaEntrada === true : isIncome(tx);

export const calculatePeriodTotals = transactions => {
    const items = Array.isArray(transactions) ? transactions : [];
    const cents = items.reduce((result, tx) => {
        const value = toCents(tx?.valor);

        if (isIncome(tx)) result.income += value;
        if (isExpense(tx)) result.expense += value;
        if (isCardRefund(tx)) result.expense -= value;
        if (isTransfer(tx)) result.transfers += value;
        if (isInvoicePayment(tx)) result.invoicePayments += value;

        return result;
    }, {
        income: 0,
        expense: 0,
        transfers: 0,
        invoicePayments: 0,
    });

    return {
        income: fromCents(cents.income),
        expense: fromCents(cents.expense),
        transfers: fromCents(cents.transfers),
        invoicePayments: fromCents(cents.invoicePayments),
    };
};
