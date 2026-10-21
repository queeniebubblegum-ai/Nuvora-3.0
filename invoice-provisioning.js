import { fromCents, toCents } from './money-math.js';
import { calculateReconciliation, invoiceReconciliationKey, listInvoiceTransactions } from './reconciliation.js';

const localDate = value => {
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12);
    }
    const raw = String(value || '').trim();
    if (!raw) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const date = new Date(year, month - 1, day, 12);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12);
};

const dayNumber = (...values) => {
    for (const value of values) {
        if (value === null || value === undefined || String(value).trim() === '') continue;
        const day = Number(value);
        if (Number.isInteger(day) && day >= 1 && day <= 31) return day;
    }
    return null;
};

const monthKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const shiftMonth = (date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
const dueDateForMonth = (month, dueDay) => {
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return new Date(month.getFullYear(), month.getMonth(), Math.min(dueDay, lastDay), 12);
};
const isPendingSchedule = item => String(item?.status || '').trim().toLowerCase() === 'pendente';

export const cardInvoiceDueDate = (card, year, month) => {
    const closingDay = dayNumber(card?.fechamento, card?.diaFechamento);
    const dueDay = dayNumber(card?.vencimento, card?.diaVencimento);
    const invoiceYear = Number(year);
    const invoiceMonth = Number(month);
    if (closingDay === null || dueDay === null || !Number.isInteger(invoiceYear) || !Number.isInteger(invoiceMonth) || invoiceMonth < 0 || invoiceMonth > 11) return null;
    const statementMonth = new Date(invoiceYear, invoiceMonth, 1, 12);
    const dueMonth = dueDay > closingDay ? statementMonth : shiftMonth(statementMonth, 1);
    return dueDateForMonth(dueMonth, dueDay);
};

/**
 * Builds a pure plan for automatic card-invoice schedules. `mesReferencia`
 * remains the due month for compatibility with existing scheduled invoices;
 * the invoice amount is calculated from the card's actual closing cycle.
 */
export const planCardInvoiceSchedules = ({
    cards = [],
    transactions = [],
    existingSchedules = [],
    reconciliations = [],
    now = new Date(),
    monthsAhead = 6,
} = {}) => {
    const today = localDate(now);
    if (!today) return [];
    const monthCount = Math.min(12, Math.max(1, Number.parseInt(monthsAhead, 10) || 6));
    const firstDueMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
    const plans = [];
    const seenCards = new Set();

    (Array.isArray(cards) ? cards : []).forEach(card => {
        if (!card || card.ativa === false || card.id === null || card.id === undefined) return;
        const cardId = String(card.id);
        if (seenCards.has(cardId)) return;
        seenCards.add(cardId);

        const closingDay = dayNumber(card.fechamento, card.diaFechamento);
        const dueDay = dayNumber(card.vencimento, card.diaVencimento);
        if (closingDay === null || dueDay === null) return;

        for (let offset = 0; offset < monthCount; offset += 1) {
            const dueMonth = shiftMonth(firstDueMonth, offset);
            // A due date later than the closing day belongs to the same month;
            // otherwise the card allows the invoice to be paid next month.
            const statementMonth = dueDay > closingDay ? dueMonth : shiftMonth(dueMonth, -1);
            const dueDate = cardInvoiceDueDate(card, statementMonth.getFullYear(), statementMonth.getMonth());
            if (!dueDate) continue;
            const invoiceTransactions = listInvoiceTransactions(
                Array.isArray(transactions) ? transactions : [],
                card,
                statementMonth.getFullYear(),
                statementMonth.getMonth()
            );
            const reconciliationKey = invoiceReconciliationKey(card.id, statementMonth.getFullYear(), statementMonth.getMonth());
            const reconciliationRecord = (Array.isArray(reconciliations) ? reconciliations : [])
                .find(record => record?.chave === reconciliationKey);
            const reconciliation = calculateReconciliation(
                invoiceTransactions,
                reconciliationRecord?.valorFaturaReal,
                reconciliationRecord?.ajustes || []
            );
            const hasRealAmount = reconciliation.realInvoiceAmount !== null;
            const rawTotal = hasRealAmount ? reconciliation.realInvoiceAmount : reconciliation.explainedTotal;
            const amountCents = Math.max(0, toCents(rawTotal));
            const hasInvoiceEvidence = invoiceTransactions.length > 0 || hasRealAmount || (reconciliationRecord?.ajustes || []).length > 0;
            if (!hasInvoiceEvidence) continue;

            const dueMonthReference = monthKey(dueMonth);
            const matchingSchedules = (Array.isArray(existingSchedules) ? existingSchedules : []).filter(item =>
                String(item?.cartaoId) === cardId &&
                String(item?.mesReferencia || '') === dueMonthReference &&
                String(item?.categoria || '') === 'Fatura Cartão'
            );
            // Update only an explicitly pending schedule. Any other existing record
            // prevents recreation, so paid/cancelled/unknown states remain untouched.
            const existing = matchingSchedules.find(isPendingSchedule) || matchingSchedules[0];
            if (existing && !isPendingSchedule(existing)) continue;
            if (amountCents === 0 && !existing) continue;

            const value = fromCents(amountCents);
            const dueDateValue = dateKey(dueDate);
            const action = existing ? 'update' : 'create';
            if (existing && toCents(existing.valor) === amountCents && String(existing.dataVencimento || '').slice(0, 10) === dueDateValue) continue;

            plans.push({
                action,
                cardId: card.id,
                cardName: String(card.nome || 'Cartão'),
                mesReferencia: dueMonthReference,
                invoiceYear: statementMonth.getFullYear(),
                invoiceMonth: statementMonth.getMonth(),
                dataVencimento: dueDateValue,
                valor: value,
                existingId: existing?.id ?? null,
                transactionCount: invoiceTransactions.length,
                usesRealInvoiceAmount: hasRealAmount,
            });
        }
    });

    return plans.sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento) || String(a.cardId).localeCompare(String(b.cardId)));
};
