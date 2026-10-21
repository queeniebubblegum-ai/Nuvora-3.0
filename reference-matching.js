import { toCents } from './money-math.js';
import { isCardRefund } from './financial-ledger.js';

const normalized = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9 ]/g, ' ').trim();
const direction = tx => isCardRefund(tx) ? 'receita' : tx.tipo === 'pagamento-fatura' ? 'despesa' : tx.tipo;
export const referenceCandidates = (tx, rows = []) => rows.flatMap(row => {
    if (direction(tx) !== row.tipo || toCents(tx.valor) !== toCents(row.valor)) return [];
    const reference = String(row.identificador || '').trim();
    if (reference && reference === String(tx.codigoRef || '').trim()) return [{ referenceId: row.id, reason: 'Identificador, direção e valor coincidem' }];
    const days = Math.abs(new Date(`${tx.data}T12:00:00`) - new Date(`${row.data}T12:00:00`)) / 86400000;
    const a = normalized(tx.desc), b = normalized(row.desc);
    if (days > 2 || !Number.isFinite(days) || !a || !b) return [];
    const similar = a === b || a.split(/\s+/).some(word => word.length > 2 && b.split(/\s+/).includes(word));
    return similar ? [{ referenceId: row.id, reason: `Direção e valor coincidem; descrições relacionadas; diferença de ${days} dia(s)` }] : [];
});

export const validateReferenceLink = (record, transaction, referenceId, decisions) => {
    if (!record.referenceRows?.length) return null;
    const row = record.referenceRows.find(row => String(row.id) === String(referenceId));
    if (!row || direction(transaction) !== row.tipo || toCents(transaction.valor) !== toCents(row.valor)) throw new Error('Escolha uma linha de referência com a mesma direção e valor. Corrija a divergência antes de vincular.');
    if (Object.entries(decisions || {}).some(([id,d]) => id !== String(transaction.id) && d?.referenceId === row.id)) throw new Error('Esta linha da referência já está vinculada a outro lançamento.');
    return row.id;
};

export const pendingReferenceRows = (record, decisions) => (record?.referenceRows || []).filter(row =>
    !record.ignoredReferences?.[String(row.id)]?.reason && !Object.values(decisions || {}).some(d => d?.referenceId === row.id));
