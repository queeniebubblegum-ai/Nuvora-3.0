import { isExpense, isIncome } from './financial-ledger.js';

const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const transactionDate = transaction => {
    const rawValue = transaction?.data || transaction?.id;
    const date = typeof rawValue === 'number'
        ? new Date(rawValue)
        : new Date(`${String(rawValue || '').slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
};

const isCashflowMovement = transaction => isIncome(transaction) || isExpense(transaction);

/**
 * Builds the one source of truth for Cash Flow's cards, chart and table.
 * A one-month view keeps daily precision; longer views use calendar-month
 * buckets so the selected period remains legible without inventing values.
 */
export const buildCashflowModel = (db, period = 1, referenceDate = new Date()) => {
    const months = Math.max(1, Number.parseInt(period, 10) || 1);
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const start = new Date(year, month - (months - 1), 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const allMovements = (db?.transacoes || []).filter(isCashflowMovement);
    const movements = allMovements.filter(transaction => {
        const date = transactionDate(transaction);
        return date && date >= start && date <= end;
    });
    const isDaily = months === 1;
    const bucketCount = isDaily ? new Date(year, month + 1, 0).getDate() : months;
    const buckets = [];

    for (let index = 0; index < bucketCount; index += 1) {
        const bucketDate = isDaily
            ? new Date(year, month, index + 1, 12, 0, 0)
            : new Date(year, month - (months - 1) + index, 1, 12, 0, 0);
        const bucketMovements = movements.filter(transaction => {
            const date = transactionDate(transaction);
            return isDaily
                ? date.getDate() === bucketDate.getDate()
                : date.getFullYear() === bucketDate.getFullYear() && date.getMonth() === bucketDate.getMonth();
        });
        const entradas = bucketMovements
            .filter(isIncome)
            .reduce((total, transaction) => total + (Number(transaction.valor) || 0), 0);
        const saidas = bucketMovements
            .filter(isExpense)
            .reduce((total, transaction) => total + (Number(transaction.valor) || 0), 0);
        buckets.push({
            date: bucketDate,
            label: isDaily
                ? `${String(bucketDate.getDate()).padStart(2, '0')}/${String(bucketDate.getMonth() + 1).padStart(2, '0')}`
                : `${monthNames[bucketDate.getMonth()]}/${String(bucketDate.getFullYear()).slice(-2)}`,
            entradas,
            saidas,
            liquido: entradas - saidas
        });
    }

    let acumulado = 0;
    buckets.forEach(bucket => {
        acumulado += bucket.liquido;
        bucket.acumulado = acumulado;
    });

    return {
        period: months,
        isDaily,
        start,
        end,
        movements,
        buckets,
        activeBuckets: buckets.filter(bucket => bucket.entradas > 0 || bucket.saidas > 0),
        entradas: movements.filter(isIncome).reduce((total, transaction) => total + (Number(transaction.valor) || 0), 0),
        saidas: movements.filter(isExpense).reduce((total, transaction) => total + (Number(transaction.valor) || 0), 0),
        hasMovement: movements.length > 0
    };
};

/**
 * Returns a signed period-over-period percentage only when both values and a
 * non-zero previous baseline exist.  Zero baselines intentionally stay neutral
 * instead of implying an invented percentage.
 */
export const signedPeriodVariation = (current, previous) => {
    const currentValue = Number(current);
    const previousValue = Number(previous);
    if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue === 0) {
        return { value: null, label: 'Sem comparação anterior', direction: 'neutral', tone: 'neutral', isNeutral: true };
    }
    const variation = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    const direction = variation > 0 ? 'up' : variation < 0 ? 'down' : 'neutral';
    const tone = direction === 'up' ? 'positive' : direction === 'down' ? 'negative' : 'neutral';
    return {
        value: variation,
        label: `${variation > 0 ? '+' : ''}${variation.toFixed(1)}%`,
        direction,
        tone,
        isNeutral: false
    };
};

export const reportPeriodLabel = period => {
    const months = Number.parseInt(period, 10) || 1;
    return months === 1 ? 'Mês atual' : `Últimos ${months} meses`;
};

export const formatReportDateRange = (model, locale = 'pt-BR') => {
    if (!model) return '';
    return `${model.start.toLocaleDateString(locale)} – ${model.end.toLocaleDateString(locale)}`;
};
