const asFiniteNumber = value => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const parseDate = value => {
    if (!value) return null;
    const raw = String(value);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? new Date(`${raw}T12:00:00`)
        : new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfMonth = date => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
const amount = item => Math.abs(asFiniteNumber(item?.valor ?? item?.value) || 0);
const dateFrom = item => item?.dataVencimento || item?.data || item?.proximaCobranca || item?.dataProximaCobranca;
const completedStatuses = new Set(['pago', 'recebida', 'recebido', 'concluido', 'concluida', 'quitado', 'quitada', 'realizado', 'realizada', 'cancelado', 'cancelada']);

/**
 * Builds a deliberately conservative end-of-month projection. Only dated,
 * persisted forecasts are included; realized transactions never enter it.
 */
export const calculateEndOfMonthProjection = ({
    currentBalance,
    futureIncome = [],
    pendingExpenses = [],
    recurringForecasts = [],
    now = new Date()
} = {}) => {
    const balance = asFiniteNumber(currentBalance);
    const reference = parseDate(now) || new Date();
    const today = startOfDay(reference);
    const monthEnd = endOfMonth(reference);
    const incomes = (Array.isArray(futureIncome) ? futureIncome : []).filter(item => {
        if (!item || completedStatuses.has(String(item.status || '').toLowerCase())) return false;
        const date = parseDate(dateFrom(item));
        return date && date >= today && date <= monthEnd && amount(item) > 0;
    });
    const expenses = (Array.isArray(pendingExpenses) ? pendingExpenses : []).filter(item => {
        if (!item || completedStatuses.has(String(item.status || '').toLowerCase())) return false;
        const date = parseDate(dateFrom(item));
        return date && date <= monthEnd && amount(item) > 0 && String(item.tipo || 'despesa').toLowerCase() !== 'receita';
    });
    const recurring = (Array.isArray(recurringForecasts) ? recurringForecasts : []).filter(item => {
        if (!item || item.ativa === false || completedStatuses.has(String(item.status || '').toLowerCase())) return false;
        const date = parseDate(dateFrom(item));
        return date && date >= today && date <= monthEnd && amount(item) > 0;
    });

    const expectedIncome = incomes.reduce((sum, item) => sum + amount(item), 0);
    const pendingExpenseTotal = expenses.reduce((sum, item) => sum + amount(item), 0);
    const recurringExpenseTotal = recurring.reduce((sum, item) => sum + amount(item), 0);
    const includedCount = incomes.length + expenses.length + recurring.length;
    const hasData = balance !== null && includedCount > 0;
    const projectedBalance = hasData
        ? Math.round((balance + expectedIncome - pendingExpenseTotal - recurringExpenseTotal) * 100) / 100
        : null;

    return {
        available: hasData,
        value: projectedBalance,
        currentBalance: balance,
        expectedIncome,
        pendingExpenses: pendingExpenseTotal,
        recurringExpenses: recurringExpenseTotal,
        includedCount,
        label: hasData ? 'Saldo estimado no fim do mês' : 'Projeção indisponível',
        explanation: hasData
            ? 'Saldo atual + receitas futuras registradas − despesas pendentes e recorrências datadas. Não inclui transações já realizadas.'
            : 'Cadastre uma previsão futura com data para calcular uma projeção sem inventar valores.'
    };
};

export const getLastUpdatedIndicator = (timestamp, now = new Date()) => {
    const date = parseDate(timestamp);
    if (!date || date > now) return null;
    const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
    let relative;
    if (seconds < 60) relative = 'agora';
    else if (seconds < 3600) {
        const n = Math.floor(seconds / 60);
        relative = `há ${n} ${n === 1 ? 'minuto' : 'minutos'}`;
    } else if (seconds < 86400) {
        const n = Math.floor(seconds / 3600);
        relative = `há ${n} ${n === 1 ? 'hora' : 'horas'}`;
    } else {
        const n = Math.floor(seconds / 86400);
        relative = `há ${n} ${n === 1 ? 'dia' : 'dias'}`;
    }
    return {
        relative: `Atualizado ${relative}`,
        title: `Atualizado em ${date.toLocaleString('pt-BR')}`,
        timestamp: date.toISOString()
    };
};

export const financialValueTone = (value, { zero = 'neutral' } = {}) => {
    const number = asFiniteNumber(value);
    if (number === null || number === 0) return zero;
    return number > 0 ? 'positive' : 'negative';
};

export const financialValueClass = (value, options = {}) => `financial-value financial-value--${financialValueTone(value, options)}`;

export const isShortcutEligibleTarget = target => {
    const element = target?.nodeType === 1 ? target : target?.parentElement;
    if (!element) return true;
    const tag = String(element.tagName || '').toUpperCase();
    return !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && element.isContentEditable !== true && element.closest?.('[contenteditable="true"]') === null;
};

export const isConflictingShortcutContext = document => {
    if (!document) return true;
    const active = document.activeElement;
    if (active && !isShortcutEligibleTarget(active)) return true;
    if (active?.closest?.('[role="menu"], .nv-dashboard-new-menu__popover, .nv-category-actions-popover, .nv-accounts-add-menu')) return true;
    return Boolean(document.querySelector('[aria-modal="true"]:not([aria-hidden="true"]), [role="dialog"]:not([aria-hidden="true"]):not(.hidden), #anora-menu:not(.hidden), details.nv-dashboard-new-menu[open], details.nv-accounts-add[open], #speed-dial-menu:not(.opacity-0)'));
};

export const shouldHandleNewTransactionShortcut = (event, document) => {
    if (!event || event.altKey !== true || String(event.key || '').toLowerCase() !== 'n') return false;
    if (event.defaultPrevented || !isShortcutEligibleTarget(event.target) || isConflictingShortcutContext(document)) return false;
    const viewport = document?.defaultView;
    if (viewport?.matchMedia?.('(max-width: 767px)')?.matches === true || Number(viewport?.innerWidth) > 0 && Number(viewport.innerWidth) <= 767) return false;
    return true;
};

export const markCurrencyValue = (element, value) => {
    if (!element) return;
    const number = asFiniteNumber(value);
    if (number === null) return;
    element.setAttribute('data-currency-value', String(number));
};

const animationValues = new WeakMap();
const animationFrames = new WeakMap();

/** Animates only changed annotated currency nodes; first paint stays static. */
export const animateCurrencyValues = (root, formatMoney, win = globalThis) => {
    if (!root || typeof formatMoney !== 'function') return 0;
    const nodes = root.querySelectorAll?.('[data-currency-value]') || [];
    const reduced = win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    let animated = 0;
    nodes.forEach(node => {
        const target = asFiniteNumber(node.getAttribute('data-currency-value'));
        if (target === null) return;
        const previous = animationValues.get(node);
        animationValues.set(node, target);
        if (previous === undefined || previous === target || reduced) {
            if (animationFrames.has(node)) {
                const cancel = win?.cancelAnimationFrame || globalThis.cancelAnimationFrame;
                if (cancel) cancel(animationFrames.get(node));
                animationFrames.delete(node);
            }
            node.textContent = formatMoney(target);
            return;
        }
        const cancel = win?.cancelAnimationFrame || globalThis.cancelAnimationFrame;
        if (animationFrames.has(node) && cancel) cancel(animationFrames.get(node));
        const request = win?.requestAnimationFrame || globalThis.requestAnimationFrame;
        if (typeof request !== 'function') { node.textContent = formatMoney(target); return; }
        const start = previous;
        const started = Date.now();
        const duration = 360;
        const step = () => {
            const progress = Math.min(1, (Date.now() - started) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            node.textContent = formatMoney(start + (target - start) * eased);
            if (progress < 1 && animationValues.get(node) === target) {
                animationFrames.set(node, request(step));
            } else {
                animationFrames.delete(node);
                node.textContent = formatMoney(target);
            }
        };
        animationFrames.set(node, request(step));
        animated += 1;
    });
    return animated;
};

export const projectionSourcesFromDatabase = (database, now = new Date(), currentBalance) => {
    const agendamentos = Array.isArray(database?.agendamentos) ? database.agendamentos : [];
    const pending = Array.isArray(database?.agendamentos) ? database.agendamentos : [];
    const pendingIds = new Set(pending.flatMap(item => [item?.id, item?.assinaturaId, item?.origemId].filter(Boolean).map(String)));
    const recurring = (Array.isArray(database?.assinaturas) ? database.assinaturas : []).filter(item =>
        item?.ativa !== false && Boolean(dateFrom(item)) && !pendingIds.has(String(item?.id))
    );
    return calculateEndOfMonthProjection({
        currentBalance: currentBalance ?? database?.bancos?.reduce((sum, bank) => sum + (asFiniteNumber(bank?.saldo) || 0), 0),
        futureIncome: database?.receitasFuturas,
        pendingExpenses: agendamentos,
        recurringForecasts: recurring,
        now
    });
};
