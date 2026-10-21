export const TRANSACTION_FILTERS_STORAGE_KEY = 'avenera:transaction-filters';
export const TRANSACTION_FILTER_KEYS = ['desc', 'categoria', 'bancoId', 'mes', 'tipo', 'dataInicio', 'dataFim', 'ano', 'conferencia'];

export const getDefaultTransactionFilters = () => ({
    desc: '', categoria: '', bancoId: '', mes: '', tipo: '', dataInicio: '', dataFim: '', ano: String(new Date().getFullYear()), conferencia: ''
});

const isValidISODate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4)) &&
        date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10));
};

export const normalizeTransactionFilter = (key, value, fallback) => {
    if (typeof value !== 'string') return fallback;
    if (key === 'ano') return value === '' || /^(19|20|21)\d{2}$/.test(value) ? value : fallback;
    if (key === 'conferencia') return ['', 'nao-conferido', 'conferido', 'conciliado', 'divergente', 'ignorado'].includes(value) ? value : fallback;
    if (key === 'mes') return value === '' || /^(?:[0-9]|1[0-1])$/.test(value) ? value : fallback;
    if (key === 'tipo') return ['', 'despesa', 'receita', 'transferencia'].includes(value) ? value : fallback;
    if (key === 'bancoId') return value === '' || /^(?:banco|cartao)_[A-Za-z0-9_.:-]+$/.test(value) ? value : fallback;
    if (key === 'dataInicio' || key === 'dataFim') return value === '' || isValidISODate(value) ? value : fallback;
    return value.length <= 200 ? value : fallback;
};

export const loadTransactionFilters = () => {
    const defaults = getDefaultTransactionFilters();
    if (typeof localStorage === 'undefined') return defaults;
    try {
        const parsed = JSON.parse(localStorage.getItem(TRANSACTION_FILTERS_STORAGE_KEY) || 'null');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return defaults;
        return TRANSACTION_FILTER_KEYS.reduce((filters, key) => {
            filters[key] = normalizeTransactionFilter(key, parsed[key], defaults[key]);
            return filters;
        }, defaults);
    } catch (_error) {
        return defaults;
    }
};

export const persistTransactionFilters = filters => {
    if (typeof localStorage === 'undefined') return;
    const defaults = getDefaultTransactionFilters();
    const safe = TRANSACTION_FILTER_KEYS.reduce((result, key) => {
        result[key] = normalizeTransactionFilter(key, filters?.[key], defaults[key]);
        return result;
    }, defaults);
    try { localStorage.setItem(TRANSACTION_FILTERS_STORAGE_KEY, JSON.stringify(safe)); } catch (_error) { /* optional storage */ }
    return safe;
};
import { parseLocalDate } from './util-date.js';
import { isTransfer } from './financial-ledger.js';
import { getReviewState } from './conferencing-model.js';


// One contract for the list AND CSV export. IDs are opaque, including underscores.
export const filterTransactions = (transactions, filters = {}, database = {}) => (transactions || []).filter(tx => {
    const f = filters, date = parseLocalDate(tx.data);
    const query = String(f.desc || '').toLocaleLowerCase('pt-BR');
    if (query && !String(tx.desc || '').toLocaleLowerCase('pt-BR').includes(query) && !String(tx.codigoRef || `tx-${String(tx.id).slice(0, 8)}`).toLocaleLowerCase('pt-BR').includes(query)) return false;
    if (f.categoria && tx.categoria !== f.categoria) return false;
    if (f.tipo && (f.tipo === 'transferencia' ? !isTransfer(tx) : tx.tipo !== f.tipo)) return false;
    if (f.ano && date?.getFullYear() !== Number(f.ano)) return false;
    if (f.mes !== '' && f.mes != null && date?.getMonth() !== Number(f.mes)) return false;
    if (f.dataInicio && String(tx.data || '') < f.dataInicio) return false;
    if (f.dataFim && String(tx.data || '') > f.dataFim) return false;
    if (f.conferencia && getReviewState(database, tx) !== f.conferencia) return false;
    if (f.bancoId) {
        const separator = f.bancoId.indexOf('_'), type = f.bancoId.slice(0, separator), id = f.bancoId.slice(separator + 1);
        if (String(tx.bancoId) !== id || (type === 'cartao') !== Boolean(tx.isCartao)) return false;
    }
    return true;
});
