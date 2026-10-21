import { fromCents, toCents } from './money-math.js';
import { isCashflowMovement, isCashInflow } from './financial-ledger.js';
import { transactionFingerprint, reconciliationFingerprint, listInvoiceTransactions } from './reconciliation.js';

export const cashDeltaCents = tx => isCashflowMovement(tx) || (!tx.isCartao && tx.transferenciaId)
    ? toCents(tx.valor) * (isCashInflow(tx) ? 1 : -1) : 0;

export const bankBalanceAtDate = (database, bank, date, today) => {
    if (!bank || !date || date > today) return null;
    const rows = (database.transacoes || []).filter(t => !t.isCartao && String(t.bancoId) === String(bank.id));
    // Old absolute statement anchors have no date. Never fabricate a historic
    // bank balance from those incomplete references.
    if (date < today && rows.some(t => t.saldoIncluidoNoSaldoDoExtrato)) return null;
    if (bank.dataCriacao && date < bank.dataCriacao) return null;
    const after = rows.filter(t => t.data > date && !t.saldoIncluidoNoSaldoDoExtrato && !t.alocacaoMetaVirtual);
    return fromCents(toCents(bank.saldo) - after.reduce((sum, t) => sum + cashDeltaCents(t), 0));
};

export const bankConferenceFingerprint = (items, balance, reference, asOf) => JSON.stringify({
    balance: toCents(balance), reference: toCents(reference), asOf,
    items: items.map(transactionFingerprint).sort()
});

export const getReviewState = (database, tx) => {
    const fingerprint = transactionFingerprint(tx);
    const records = tx.isCartao ? database.conciliacoesFaturas || [] : database.conferencias || [];
    for (const record of records) {
        const decision = (tx.isCartao ? record.verificacoes : record.decisions)?.[String(tx.id)];
        if (decision?.fingerprint !== fingerprint) continue;
        if (decision.status === 'ignorado') return 'ignorado';
        if (decision.status === 'divergente') return 'divergente';
        if (record.confirmedAt) {
            if (!tx.isCartao) {
                const bank = database.bancos?.find(b => String(b.id) === String(record.bankId));
                const items = (database.transacoes || []).filter(t => !t.isCartao && String(t.bancoId) === String(record.bankId) && t.data?.startsWith(record.period) && t.data <= record.asOf);
                const balance = bankBalanceAtDate(database, bank, record.asOf, new Date().toLocaleDateString('en-CA'));
                if (balance !== null && record.confirmedFingerprint === bankConferenceFingerprint(items, balance, record.reference, record.asOf)) return 'conciliado';
                return 'conferido';
            }
            const card = database.cartoes?.find(c => String(c.id) === String(tx.bancoId));
            if (card && record.confirmedFingerprint === reconciliationFingerprint(listInvoiceTransactions(database.transacoes, card, record.ano, record.mes), record.valorFaturaReal, record.ajustes || [])) return 'conciliado';
        }
        return 'conferido';
    }
    return 'nao-conferido';
};

export const reviewLabels = Object.freeze({ 'nao-conferido': 'Não conferido', conferido: 'Conferido manualmente', conciliado: 'Conciliado', divergente: 'Divergente', ignorado: 'Ignorado com justificativa' });
