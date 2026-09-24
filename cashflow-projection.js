import { addMoney, fromCents, toCents } from './money-math.js';
import { isInvoicePayment, isTransfer } from './financial-ledger.js';

const completedStatuses = new Set([
    'pago', 'paga', 'recebida', 'recebido', 'concluido', 'concluida',
    'quitado', 'quitada', 'realizado', 'realizada', 'cancelado', 'cancelada',
    'paid', 'received', 'completed', 'done', 'canceled', 'cancelled'
]);

const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);

const parseLocalDate = value => {
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return startOfDay(value);
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
    return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
};

const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (date, days) => {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    result.setDate(result.getDate() + days);
    return result;
};
const daysBetween = (from, to) => Math.round((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 86400000);
const isOpen = item => !completedStatuses.has(String(item?.status || '').trim().toLowerCase());
const amountCents = item => Math.abs(toCents(item?.valor ?? item?.value));
const isInternalMovement = item => Boolean(item?.transferenciaId) || isTransfer(item) || isInvoicePayment(item);
const pendingDate = item => item?.dataVencimento || item?.data || item?.dueDate;
const forecastDate = item => item?.data || item?.dataVencimento || item?.date;
const subscriptionDate = item => item?.proximaCobranca || item?.dataProximaCobranca || item?.dataVencimento || item?.data;

const frequencyFor = value => {
    const periodicity = String(value || '').trim().toLowerCase();
    if (/quinz|fortnight/.test(periodicity)) return { days: 14 };
    if (/seman|weekly/.test(periodicity)) return { days: 7 };
    if (/bimes/.test(periodicity)) return { months: 2 };
    if (/trimes|quarter/.test(periodicity)) return { months: 3 };
    if (/semes/.test(periodicity)) return { months: 6 };
    if (/anual|year/.test(periodicity)) return { months: 12 };
    if (/mens|month/.test(periodicity)) return { months: 1 };
    return null;
};

const monthlyOccurrence = (anchor, index, interval) => {
    const absoluteMonth = anchor.getFullYear() * 12 + anchor.getMonth() + index * interval;
    const year = Math.floor(absoluteMonth / 12);
    const month = absoluteMonth % 12;
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(anchor.getDate(), lastDay), 12);
};

const subscriptionOccurrences = (item, today, endDate) => {
    const anchor = parseLocalDate(subscriptionDate(item));
    if (!anchor || anchor > endDate || amountCents(item) <= 0) return [];
    const frequency = frequencyFor(item.periodicidade);
    if (!frequency) return anchor >= today ? [anchor] : [];

    let index = 0;
    let occurrence = anchor;
    if (frequency.days) {
        const elapsed = Math.max(0, daysBetween(anchor, today));
        index = Math.ceil(elapsed / frequency.days);
        occurrence = addDays(anchor, index * frequency.days);
    } else {
        const monthDelta = Math.max(0, (today.getFullYear() - anchor.getFullYear()) * 12 + today.getMonth() - anchor.getMonth());
        index = Math.floor(monthDelta / frequency.months);
        occurrence = monthlyOccurrence(anchor, index, frequency.months);
        while (occurrence < today) {
            index += 1;
            occurrence = monthlyOccurrence(anchor, index, frequency.months);
        }
    }

    const dates = [];
    for (let count = 0; occurrence <= endDate && count < 32; count += 1) {
        if (occurrence >= today) dates.push(occurrence);
        index += 1;
        occurrence = frequency.days
            ? addDays(anchor, index * frequency.days)
            : monthlyOccurrence(anchor, index, frequency.months);
    }
    return dates;
};

const accountBalance = database => {
    if (!Array.isArray(database?.bancos) || database.bancos.length === 0) return null;
    return database.bancos.reduce((total, bank) => addMoney(total, bank?.saldo), 0);
};

/**
 * Projects end-of-day available bank cash from dated, still-pending records.
 * Realized transactions are intentionally not re-added; goal reserves and
 * internal transfers are not available cash. The forecast stays separate from
 * persisted balances and income/expense totals.
 */
export const buildDailyCashflowProjection = ({
    currentBalance,
    futureIncome = [],
    pendingMovements = [],
    recurringForecasts = [],
    now = new Date(),
    horizonDays = 30,
} = {}) => {
    const balanceNumber = currentBalance === null || currentBalance === undefined || String(currentBalance).trim() === ''
        ? null
        : Number(currentBalance);
    const balanceCents = balanceNumber !== null && Number.isFinite(balanceNumber) ? toCents(balanceNumber) : null;
    const today = parseLocalDate(now);
    const dayCount = Math.min(90, Math.max(1, Number.parseInt(horizonDays, 10) || 30));
    if (balanceCents === null || !today) {
        return { available: false, reason: 'Saldo atual ou data de referência indisponível.', currentBalance: null, horizonDays: dayCount, days: [], movements: [] };
    }

    const endDate = addDays(today, dayCount);
    const grouped = new Map();
    const movements = [];
    const addMovement = ({ item, date, source, direction, overdue = false, occurrence = 0 }) => {
        const cents = amountCents(item);
        if (cents <= 0 || !date || date < today || date > endDate) return;
        const key = dateKey(date);
        const list = grouped.get(key) || [];
        const movement = {
            id: `${source}:${String(item?.id ?? item?.assinaturaId ?? 'sem-id')}:${occurrence}`,
            date,
            dateKey: key,
            description: String(item?.desc || item?.nome || item?.descricao || 'Movimentação prevista'),
            source,
            direction,
            amount: fromCents(cents),
            amountCents: cents,
            overdue,
        };
        list.push(movement);
        grouped.set(key, list);
        movements.push(movement);
    };

    (Array.isArray(futureIncome) ? futureIncome : []).forEach(item => {
        if (!item || !isOpen(item) || item.ativa === false || isInternalMovement(item)) return;
        const date = parseLocalDate(forecastDate(item));
        if (!date || date < today) return;
        addMovement({ item, date, source: 'Receita futura', direction: 'income' });
    });

    const pending = Array.isArray(pendingMovements) ? pendingMovements : [];
    pending.forEach(item => {
        if (!item || !isOpen(item) || item.ativa === false || isInternalMovement(item)) return;
        const originalDate = parseLocalDate(pendingDate(item));
        if (!originalDate || originalDate > endDate) return;
        const income = ['receita', 'income', 'entrada'].includes(String(item.tipo || '').trim().toLowerCase());
        if (income && originalDate < today) return;
        const date = originalDate < today ? today : originalDate;
        addMovement({ item, date, source: income ? 'Receita agendada' : 'Conta pendente', direction: income ? 'income' : 'expense', overdue: originalDate < today });
    });

    const pendingSubscriptionOccurrences = new Set();
    pending.forEach(item => {
        const originalDate = parseLocalDate(pendingDate(item));
        if (!originalDate) return;
        const date = originalDate < today && !['receita', 'income', 'entrada'].includes(String(item.tipo || '').trim().toLowerCase())
            ? today
            : originalDate;
        [item?.id, item?.assinaturaId, item?.origemId]
            .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
            .forEach(value => pendingSubscriptionOccurrences.add(`${String(value)}:${dateKey(date)}`));
    });
    (Array.isArray(recurringForecasts) ? recurringForecasts : []).forEach(item => {
        if (!item || item.ativa === false || !isOpen(item) || isInternalMovement(item)) return;
        subscriptionOccurrences(item, today, endDate).forEach((date, index) => {
            if (pendingSubscriptionOccurrences.has(`${String(item.id)}:${dateKey(date)}`)) return;
            addMovement({ item, date, source: 'Assinatura', direction: 'expense', occurrence: index });
        });
    });

    if (movements.length === 0) {
        return {
            available: false,
            reason: `Nenhuma previsão datada nos próximos ${dayCount} dias; projeção indisponível.`,
            currentBalance: fromCents(balanceCents),
            horizonDays: dayCount,
            startDate: dateKey(today),
            endDate: dateKey(endDate),
            days: [],
            movements: [],
            expectedIncome: 0,
            pendingExpenses: 0,
        };
    }

    const days = [];
    let closingCents = balanceCents;
    let minimumCents = null;
    let minimumDate = dateKey(today);
    let firstNegativeDate = balanceCents < 0 ? dateKey(today) : null;

    for (let index = 0; index <= dayCount; index += 1) {
        const date = addDays(today, index);
        const key = dateKey(date);
        const dayMovements = (grouped.get(key) || []).sort((a, b) => a.description.localeCompare(b.description, 'pt-BR'));
        const incomeCents = dayMovements.filter(item => item.direction === 'income').reduce((sum, item) => sum + item.amountCents, 0);
        const expenseCents = dayMovements.filter(item => item.direction === 'expense').reduce((sum, item) => sum + item.amountCents, 0);
        closingCents += incomeCents - expenseCents;
        if (minimumCents === null || closingCents < minimumCents) { minimumCents = closingCents; minimumDate = key; }
        if (firstNegativeDate === null && closingCents < 0) firstNegativeDate = key;
        days.push({
            date,
            dateKey: key,
            movements: dayMovements,
            expectedIncome: fromCents(incomeCents),
            pendingExpenses: fromCents(expenseCents),
            netMovement: fromCents(incomeCents - expenseCents),
            closingBalance: fromCents(closingCents),
        });
    }

    const expectedIncomeCents = movements.filter(item => item.direction === 'income').reduce((sum, item) => sum + item.amountCents, 0);
    const pendingExpenseCents = movements.filter(item => item.direction === 'expense').reduce((sum, item) => sum + item.amountCents, 0);
    return {
        available: true,
        reason: 'Saldo bancário atual + receitas futuras − contas pendentes e assinaturas datadas. Valores projetados não são movimentações realizadas.',
        currentBalance: fromCents(balanceCents),
        horizonDays: dayCount,
        startDate: dateKey(today),
        endDate: dateKey(endDate),
        expectedIncome: fromCents(expectedIncomeCents),
        pendingExpenses: fromCents(pendingExpenseCents),
        endingBalance: fromCents(closingCents),
        minimumClosingBalance: fromCents(minimumCents),
        minimumDate: minimumDate,
        firstNegativeDate,
        includedCount: movements.length,
        days,
        movements,
    };
};

export const cashflowProjectionFromDatabase = (database, options = {}) => buildDailyCashflowProjection({
    currentBalance: accountBalance(database),
    futureIncome: database?.receitasFuturas,
    pendingMovements: database?.agendamentos,
    recurringForecasts: database?.assinaturas,
    now: options.now || new Date(),
    horizonDays: options.horizonDays ?? 30,
});
