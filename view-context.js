export const VIEW_CONTEXT_PREFIX = 'avenera:view:';

const hasSessionStorage = () => typeof sessionStorage !== 'undefined' && sessionStorage !== null;

/**
 * Reads short-lived view context without ever allowing malformed storage to
 * break boot. Persistent preferences (including transaction filters) stay in
 * their existing localStorage contract and must not be copied here.
 */
export const loadViewContext = (key, fallback, validate = value => value !== undefined) => {
    if (!hasSessionStorage()) return fallback;
    try {
        const raw = sessionStorage.getItem(`${VIEW_CONTEXT_PREFIX}${key}`);
        if (raw === null) return fallback;
        const value = JSON.parse(raw);
        if (validate(value)) return value;
        try { sessionStorage.removeItem(`${VIEW_CONTEXT_PREFIX}${key}`); } catch (_removeError) { /* optional storage */ }
        return fallback;
    } catch (_error) {
        try { sessionStorage.removeItem(`${VIEW_CONTEXT_PREFIX}${key}`); } catch (_removeError) { /* optional storage */ }
        return fallback;
    }
};

export const saveViewContext = (key, value, validate = input => input !== undefined) => {
    if (!hasSessionStorage() || !validate(value)) return value;
    try { sessionStorage.setItem(`${VIEW_CONTEXT_PREFIX}${key}`, JSON.stringify(value)); } catch (_error) { /* optional storage */ }
    return value;
};

export const removeViewContext = key => {
    if (!hasSessionStorage()) return;
    try { sessionStorage.removeItem(`${VIEW_CONTEXT_PREFIX}${key}`); } catch (_error) { /* optional storage */ }
};

export const isValidViewContextTab = value => ['fluxo', 'compare', 'cartoes', 'patrimonio'].includes(value);
export const isValidReportPeriod = value => [3, 6, 12].includes(Number(value));
export const isValidCashflowPeriod = value => [1, 3, 6, 12].includes(Number(value));
export const isValidPage = value => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 10000;
export const isValidPlanningPeriod = value => value && Number.isInteger(Number(value.month)) && Number(value.month) >= 0 && Number(value.month) <= 11 && Number.isInteger(Number(value.year)) && Number(value.year) >= 1970 && Number(value.year) <= 9999;
