/**
 * Shared, pure priority resolver for actionable dashboard signals.
 *
 * This module deliberately only inspects already-calculated values. It does
 * not calculate balances, budgets, or card totals, so presentation priority
 * cannot change financial semantics.
 */

export const PRIORITY_KEYS = Object.freeze({
    OVERDUE: 'overdue',
    NEGATIVE_BALANCE: 'negative-balance',
    OVER_BUDGET: 'over-budget',
    HIGH_CARD_USAGE: 'high-card-usage',
    ANORA_RECOMMENDATION: 'anora-recommendation',
    INFORMATIONAL: 'informational'
});

export const PRIORITY_ORDER = Object.freeze([
    PRIORITY_KEYS.OVERDUE,
    PRIORITY_KEYS.NEGATIVE_BALANCE,
    PRIORITY_KEYS.OVER_BUDGET,
    PRIORITY_KEYS.HIGH_CARD_USAGE,
    PRIORITY_KEYS.ANORA_RECOMMENDATION,
    PRIORITY_KEYS.INFORMATIONAL
]);

const asArray = value => Array.isArray(value) ? value.filter(Boolean) : [];
const asFiniteNumber = value => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const overdueItems = context => asArray(context.contasAtrasadas || context.overdueAccounts);
const upcomingItems = context => asArray(context.proximosVencimentos || context.upcomingDue);

const budgetItems = context => {
    const budget = context.orcamento || context.budget || {};
    if (Array.isArray(budget.orcamentos)) return budget.orcamentos.filter(Boolean);
    return asArray(context.orcamentos);
};

export const getOverBudgetItems = (context = {}) => {
    const budget = context.orcamento || context.budget || {};
    const spentByCategory = budget.gastosPorCat || context.gastosPorCat || {};
    return budgetItems(context).filter(item => {
        const limit = asFiniteNumber(item.limite ?? item.limit);
        const spent = asFiniteNumber(item.gasto ?? item.gastoMes ?? item.spent ?? spentByCategory[item.categoria]);
        // A missing/invalid limit or spend is not evidence of an exceeded budget.
        return limit !== null && limit > 0 && spent !== null && spent > limit;
    });
};

const explicitCardUsage = context => {
    const model = context.cardUtilization || context.cartoesUtilizacao || context.cardUsage;
    if (Array.isArray(model)) return model.filter(Boolean);
    if (model && typeof model === 'object') {
        return Object.entries(model).map(([id, value]) => typeof value === 'number'
            ? { id, percentual: value }
            : { id, ...(value || {}) });
    }
    return [];
};

export const getHighCardUsageItems = (context = {}) => {
    const highUsage = [];
    explicitCardUsage(context).forEach(card => {
        let percentage = asFiniteNumber(card.percentual ?? card.pct ?? card.utilizacao ?? card.percentage);
        const limit = asFiniteNumber(card.limite ?? card.limit ?? card.limiteTotal);
        const used = asFiniteNumber(card.utilizado ?? card.used ?? card.gasto);
        if (percentage === null && limit !== null && limit > 0 && used !== null) percentage = (used / limit) * 100;
        if (percentage !== null && percentage >= 80) highUsage.push({ ...card, percentual: percentage });
    });

    const cards = asArray(context.cartoes || context.cards);
    const purchases = asArray(context.comprasCartao || context.compras);
    cards.forEach(card => {
        const limit = asFiniteNumber(card.limite ?? card.limiteTotal);
        if (limit === null || limit <= 0) return;
        const cardPurchases = purchases.filter(item => String(item.cartaoId ?? item.bancoId ?? '') === String(card.id));
        if (!cardPurchases.length) return;
        const used = cardPurchases.reduce((sum, item) => sum + (asFiniteNumber(item.valor) || 0), 0);
        const percentage = (used / limit) * 100;
        if (percentage >= 80) highUsage.push({ ...card, percentual: percentage });
    });
    return highUsage;
};

const isActionableRecommendation = recommendation => {
    if (!recommendation || typeof recommendation !== 'object') return false;
    if (recommendation.action === 'openModal') return Boolean(recommendation.modal);
    if (recommendation.action === 'navigate') {
        // Dashboard is a safe fallback, not an Anora recommendation signal.
        return Boolean(recommendation.payload) && recommendation.payload !== 'Dashboard';
    }
    return false;
};

export const getAnoraRecommendation = (context = {}) => {
    const candidates = [
        context.anoraRecommendation,
        context.anoraAction,
        context.onboardingAction,
        context.actionableAction
    ];
    return candidates.find(isActionableRecommendation) || null;
};

/**
 * Resolve one winner using the product-wide priority order. The returned
 * evidence is useful to render a single alert without repeating calculations.
 */
export const resolvePriority = (context = {}) => {
    const overdue = overdueItems(context);
    const overBudget = getOverBudgetItems(context);
    const highCardUsage = getHighCardUsageItems(context);
    const balance = asFiniteNumber(context.saldoGlobal ?? context.saldo);
    const negativeBalance = balance !== null && balance < 0;
    const anoraRecommendation = getAnoraRecommendation(context);
    const upcoming = upcomingItems(context);

    let priority = null;
    if (overdue.length) priority = PRIORITY_KEYS.OVERDUE;
    else if (negativeBalance) priority = PRIORITY_KEYS.NEGATIVE_BALANCE;
    else if (overBudget.length) priority = PRIORITY_KEYS.OVER_BUDGET;
    else if (highCardUsage.length) priority = PRIORITY_KEYS.HIGH_CARD_USAGE;
    else if (anoraRecommendation) priority = PRIORITY_KEYS.ANORA_RECOMMENDATION;
    else if (upcoming.length || context.informational) priority = PRIORITY_KEYS.INFORMATIONAL;

    return {
        priority,
        overdue,
        upcoming,
        overBudget,
        highCardUsage,
        balance,
        anoraRecommendation
    };
};

// Small string-only facade for callers that need the winner, while UI code can
// use resolvePriority() when it also needs the supporting evidence.
export const getPriority = (context = {}) => resolvePriority(context).priority;
