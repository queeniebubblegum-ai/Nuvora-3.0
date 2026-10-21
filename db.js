import { validateReferenceLink, pendingReferenceRows } from './reference-matching.js';
import { bankBalanceAtDate, bankConferenceFingerprint } from './conferencing-model.js';
import { CATEGORIAS_PADRAO, getCategoriaIcon, isCategoriaPadrao } from './categorias-padrao.js';
import { calculateReconciliation, invoiceReconciliationKey, listInvoiceTransactions, normalizeAdjustment, getInvoicePeriod } from './reconciliation.js';
import { calculatePeriodTotals, isIncome, isInvoicePayment, isTransfer } from './financial-ledger.js';
import { addMoney, fromCents, splitInstallments, toCents } from './money-math.js';
import { createTransfer, isValidTransferDate } from './financial-transfers.js';
import { parseLocalDate } from './util-date.js';
import { auditDatabase, reconcileBalances } from './financial-integrity.js';
import { CURRENT_SCHEMA_VERSION, migrateDatabaseSnapshot } from './schema-migrations.js';
import { buildInvoicePaymentTransaction, isValidInvoicePaymentDate } from './invoice-payment.js';
import { cardInvoiceDueDate } from './invoice-provisioning.js';
import { invoiceCycleForDate, invoicePaymentKey, invoiceModel } from './invoice-model.js';
import { reconciliationFingerprint, transactionFingerprint } from './reconciliation.js';
const DB_PREFIX = 'nexx_fin_v8_pro_';

const initialDB = {
    usuario: {
        nome: '',
        subtitulo: '',
        fotoUrl: 'assets/perfil.svg',
        objetivoPrincipal: '',
        rendaMensalMedia: '',
        limiteCartaoGlobal: '',
        mentorStyle: 'equilibrado'
    },
    transacoes: [],
    bancos: [], 
    cartoes: [],
    // Conferência é independente de agendamentos/status de pagamento.
    conciliacoesFaturas: [],
    historicoAlteracoes: [],
    conferencias: [],
    metas: [],
    reservas: [],
    orcamentos: [],
    notificacoes: [],
    agendamentos: [], 
    categorias: CATEGORIAS_PADRAO.map(c => ({ ...c, paiId: c.paiId || null, tipo: c.grupo === 'Renda' ? 'receita' : c.tipo })),
    configNotificacoes: {
        contasAtivo: true, contasDias: 3,
        orcamentoAtivo: true, orcamentoPct: 80,
        metasAtivo: true,
        lembretesVencimentoAtivo: true,
        sincronizacaoAutomaticaAtiva: true
    },
    contatos: [],
    historicoMentoria: [],
    receitasFuturas: [],
    assinaturas: [],
    investimentos: [],
    fechamentosMes: [],
    // Persisted write timestamp; null means freshness is not trustworthy yet.
    metadados: { ultimaAtualizacao: null, schemaVersion: CURRENT_SCHEMA_VERSION }
};

export let db = {};
export const collections = Object.keys(initialDB);

let Cache = {
    transacoesPorMes: null
};

const IDB_NAME = 'NuvoraDB';
const IDB_STORE = 'keyval';
// New writes require the revision protocol; an old v2 tab must close before
// it can coexist with this schema. Otherwise its legacy writes bypass CAS.
const IDB_VERSION = 3;
let databaseLoaded = false;
let persistedRevision = 0;
const revisionChannel = typeof indexedDB !== 'undefined' && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('avenera:database-revision') : null;
if (revisionChannel) revisionChannel.onmessage = event => {
    if (Number(event.data) > persistedRevision) document.dispatchEvent(new Event('avenera:data-conflict'));
};

export class DataConflictError extends Error {
    constructor() {
        super('Os dados mudaram em outra aba. Sua alteração não foi salva. Atualize os dados e revise o formulário ou rascunho antes de tentar novamente.');
        this.name = 'DataConflictError';
    }
}

const IDB = {
    _db: null,
    _memoryStore: {},
    snapshot: () => new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') return resolve(structuredClone(IDB._memoryStore));
        const tx = IDB._db.transaction(IDB_STORE, 'readonly');
        const result = {};
        collections.forEach(key => {
            const req = tx.objectStore(IDB_STORE).get(key);
            req.onsuccess = () => { if (req.result !== undefined) result[key] = req.result; };
        });
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Não foi possível ler os dados.'));
    }),
    init: () => new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') return resolve(); 
        if (IDB._db) return resolve();
        
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        let blocked = false;
        req.onblocked = () => {
            blocked = true;
            reject(new Error('Feche as outras abas antigas da Avenera e recarregue esta página para concluir a atualização com segurança. Seus dados foram mantidos.'));
        };
        req.onupgradeneeded = (e) => {
            if (!e.target.result.objectStoreNames.contains(IDB_STORE)) {
                e.target.result.createObjectStore(IDB_STORE);
            }
        };
        req.onsuccess = (e) => {
            if (blocked) { e.target.result.close(); return; }
            IDB._db = e.target.result;
            IDB._db.onversionchange = () => {
                IDB._db.close();
                IDB._db = null;
                document.dispatchEvent(new Event('avenera:data-conflict'));
            };
            resolve();
        };
        req.onerror = () => reject(req.error);
    }),
    get: (key) => new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') return resolve(IDB._memoryStore[key]);
        const tx = IDB._db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }),
    set: (key, value) => new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            IDB._memoryStore[key] = value;
            return resolve();
        }
        const tx = IDB._db.transaction(IDB_STORE, 'readwrite');
        const req = tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error || new Error('Salvamento interrompido.'));
        req.onerror = () => reject(req.error);
    }),
    setMany: (entries, expectedRevision = databaseLoaded ? persistedRevision : null, clearStore = false) => new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            try {
                const nextStore = clearStore ? {} : { ...IDB._memoryStore };
                entries.forEach(([key, value]) => { nextStore[key] = value; });
                IDB._memoryStore = nextStore;
                resolve();
            } catch (error) {
                reject(error);
            }
            return;
        }
        const tx = IDB._db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        let conflict = false;
        let nextRevision;
        tx.oncomplete = () => {
            if (nextRevision !== undefined) {
                persistedRevision = nextRevision;
                db.metadados = { ...db.metadados, revision: nextRevision };
            }
            resolve();
        };
        tx.onerror = () => reject(tx.error || new Error('Falha ao salvar transferência.'));
        tx.onabort = () => reject(conflict ? new DataConflictError() : tx.error || new Error('Transação interrompida ao salvar.'));
        try {
            // The revision comparison and all writes share ONE read/write
            // transaction. Two tabs cannot both commit the same revision.
            const request = store.get('metadados');
            request.onsuccess = () => {
                const currentRevision = Number(request.result?.revision || 0);
                if (expectedRevision !== null && currentRevision !== expectedRevision) {
                    conflict = true;
                    tx.abort();
                    return;
                }
                nextRevision = currentRevision + 1;
                try {
                    if (clearStore) store.clear();
                    entries.filter(([key]) => key !== 'metadados').forEach(([key, value]) => store.put(value, key));
                    const metadata = entries.find(([key]) => key === 'metadados')?.[1] || request.result || {};
                    store.put({ ...metadata, revision: nextRevision }, 'metadados');
                } catch (error) { tx.abort(); reject(error); }
            };
        } catch (error) {
            try { tx.abort(); } catch (_) {}
            reject(error);
        }
    })
};

// Remove all persisted collections in one IndexedDB transaction. Keeping this
// operation in the data layer prevents UI recovery actions from clearing only
// localStorage while the real application data remains in IndexedDB.
IDB.clear = () => new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
        IDB._memoryStore = {};
        resolve();
        return;
    }
    const tx = IDB._db.transaction(IDB_STORE, 'readwrite');
    const request = tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || request.error || new Error('Falha ao limpar os dados persistidos.'));
    tx.onabort = () => reject(tx.error || new Error('Limpeza de dados interrompida.'));
});

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

const clearCache = () => {
    Cache.transacoesPorMes = null;
};

const buildMonthlyCache = () => {
    Cache.transacoesPorMes = {};
    db.transacoes.forEach(t => {
        const dt = parseLocalDate(t?.data || t?.id);
        if (!dt) return;
        const key = `${dt.getFullYear()}-${dt.getMonth()}`;
        if (!Cache.transacoesPorMes[key]) Cache.transacoesPorMes[key] = [];
        Cache.transacoesPorMes[key].push(t);
    });
};

// Legacy goal deposits were stored as bank-to-reserve transfers. Tag them so
// future edits/undo preserve the now-authoritative reconciled bank balances.
const tagLegacyGoalReserveTransfers = () => {
    const goalIds = new Set((db.metas || []).map(goal => String(goal.id)));
    const reserveIds = new Set((db.reservas || [])
        .filter(reserve => reserve?.goalId != null && goalIds.has(String(reserve.goalId)))
        .map(reserve => String(reserve.id)));
    let changed = false;
    db.transacoes = (db.transacoes || []).map(item => {
        if (!item || item.alocacaoMetaVirtual === true || !item.transferenciaId || !isTransfer(item) || isInvoicePayment(item)) return item;
        const touchesGoalReserve = [item.bancoId, item.contaOrigemId, item.contaDestinoId]
            .some(accountId => accountId != null && reserveIds.has(String(accountId)));
        if (!touchesGoalReserve) return item;
        changed = true;
        return { ...item, alocacaoMetaVirtual: true };
    });
    return changed;
};

const loadData = async () => {
    await IDB.init();
    const storedSnapshot = await IDB.snapshot();
    const migratedKeys = [];
    persistedRevision = Number(storedSnapshot.metadados?.revision || 0);

    for (const col of collections) {
        let data = storedSnapshot[col];

        if (!data) {
            let stored = null;
            if (typeof localStorage !== 'undefined') {
                stored = localStorage.getItem(DB_PREFIX + col);
            }

            if (stored) {
                try {
                    data = JSON.parse(stored);

                    if (typeof localStorage !== 'undefined') migratedKeys.push(DB_PREFIX + col);
                } catch (error) {
                    data = initialDB[col];

                }
            } else {
                data = initialDB[col];

            }
        }
        
        db[col] = data;
    }

    collections.forEach(col => {
        if (Array.isArray(initialDB[col])) {
            if (!Array.isArray(db[col])) db[col] = initialDB[col];
            db[col] = db[col].filter(item => item !== null && item !== undefined);
        }
    });

    // Migrations are pure and deterministic. Persist the normalized snapshot
    // once so legacy local data receives the same schema contract as new data.
    const migrated = migrateDatabaseSnapshot(db, { defaults: initialDB });
    if (migrated.changed) {
        collections.forEach(col => {
            if (migrated.database[col] !== undefined) db[col] = migrated.database[col];
        });

    }

    let goalsChanged = false;
    let reservesChanged = false;
    db.metas.forEach(meta => {
        const fallbackReserveId = meta.reservaId || `reserva-meta-${String(meta.id)}`;
        let reserve = db.reservas.find(item => String(item.id) === String(fallbackReserveId))
            || db.reservas.find(item => String(item.goalId) === String(meta.id));
        const reserveId = reserve?.id || fallbackReserveId;
        if (meta.reservaId !== reserveId) { meta.reservaId = reserveId; goalsChanged = true; }
        if (!reserve) {
            reserve = { id: reserveId, goalId: meta.id, nome: `Reserva: ${meta.nome || 'Meta'}`, saldo: fromCents(toCents(meta.atual)), movimentos: [] };
            db.reservas.push(reserve);
            reservesChanged = true;
        } else {
            if (String(reserve.goalId) !== String(meta.id)) { reserve.goalId = meta.id; reservesChanged = true; }
            if (!reserve.nome) { reserve.nome = `Reserva: ${meta.nome || 'Meta'}`; reservesChanged = true; }
            if (!Array.isArray(reserve.movimentos)) { reserve.movimentos = []; reservesChanged = true; }
            const normalizedBalance = fromCents(toCents(reserve.saldo));
            if (reserve.saldo !== normalizedBalance) { reserve.saldo = normalizedBalance; reservesChanged = true; }
        }
        const reserveBalance = fromCents(toCents(reserve.saldo));
        if (toCents(meta.atual) !== toCents(reserveBalance)) { meta.atual = reserveBalance; goalsChanged = true; }
    });
    const legacyGoalTransfersChanged = tagLegacyGoalReserveTransfers();
    if (goalsChanged || reservesChanged) {

    } else if (legacyGoalTransfersChanged) {

    }

    if (db.categorias.length === 0) {
        db.categorias = CATEGORIAS_PADRAO.map(c => ({ ...c }));

    }

    if (db.categorias.length > 0) {
        const padraoPorNome = new Map(CATEGORIAS_PADRAO.map(c => [String(c.nome).toLowerCase(), c]));
        // Fill legacy fields without treating a custom category with the same
        // display name as a default. The stable seed id and explicit fixa flag
        // are the only default signals.
        db.categorias = db.categorias.map((raw, index) => {
            if (typeof raw === 'string') {
                const padrao = padraoPorNome.get(raw.toLowerCase());
                return padrao ? { ...padrao, id: 'cat_' + Date.now() + index, fixa: false } : { id: 'cat_' + Date.now() + index, nome: raw, icone: 'fa-tag', cor: '#9CA3AF', fixa: false };
            }
            const c = raw && typeof raw === 'object' ? raw : {};
            const padrao = padraoPorNome.get(String(c.nome || '').toLowerCase());
            const id = c.id || 'cat_' + Date.now() + index;
            const defaultRecord = isCategoriaPadrao({ ...c, id }, padrao);
            const merged = {
                ...c,
                id,
                nome: c.nome || 'Categoria ' + (index + 1),
                grupo: c.grupo || padrao?.grupo || null,
                subgrupo: c.subgrupo || padrao?.subgrupo || c.nome || null,
                tipo: c.grupo === 'Renda' ? 'receita' : (c.tipo || padrao?.tipo || 'despesa'),
                fixa: defaultRecord,
                icone: c.icone || padrao?.icone || 'fa-tag',
                cor: c.cor || padrao?.cor || '#9CA3AF',
                paiId: c.paiId || null
            };
            return { ...merged, icone: getCategoriaIcon(merged) };
        }).filter(Boolean);

    }

    let oldCardExpensesStr = null;
    if (typeof localStorage !== 'undefined') {
        oldCardExpensesStr = localStorage.getItem(DB_PREFIX + 'comprasCartao');
    }
    
    if (oldCardExpensesStr) {
        try {
            const oldCardExpenses = JSON.parse(oldCardExpensesStr);
            let migrated = false;
            oldCardExpenses.forEach(compra => {
                if (compra && compra.id && !db.transacoes.find(t => t.id === compra.id)) {
                    db.transacoes.push({
                        id: compra.id,
                        desc: compra.desc || 'Despesa de Cartão',
                        valor: compra.valor || 0,
                        tipo: 'despesa',
                        categoria: compra.categoria || 'Outros',
                        bancoId: compra.cartaoId,
                        isCartao: true,
                        formaPagamento: 'Cartão de Crédito',
                        data: compra.data || new Date().toISOString().split('T')[0],
                        parcelaAtual: compra.parcelaAtual || 1,
                        totalParcelas: compra.totalParcelas || 1,
                        recorrente: (compra.totalParcelas || 1) > 1,
                        grupoId: compra.parentId || compra.id,
                        codigoRef: compra.codigoRef,
                        contatoId: compra.contatoId || null
                    });
                    migrated = true;
                }
            });
            if (migrated) {
                db.transacoes.sort((a, b) =>
                    (parseLocalDate(b.data || b.id)?.getTime() ?? -Infinity) -
                    (parseLocalDate(a.data || a.id)?.getTime() ?? -Infinity)
                );

            }
            if (typeof localStorage !== 'undefined') {
                migratedKeys.push(DB_PREFIX + 'comprasCartao');
            }
        } catch(e) {
            console.error('Erro na normalização de cartões:', e);
        }
    }
    if (db.usuario?.fotoUrl === 'assets/perfil.png') db.usuario.fotoUrl = 'assets/perfil.svg';
    if (JSON.stringify(storedSnapshot) !== JSON.stringify(Object.fromEntries(collections.map(col => [col, db[col]])))) {
        await IDB.setMany(collections.map(col => [col, db[col]]), persistedRevision);
    }
    migratedKeys.forEach(key => localStorage.removeItem(key));
    databaseLoaded = true;
};

for (let attempt = 0; ; attempt++) {
    try { await loadData(); break; }
    catch (error) { if (!(error instanceof DataConflictError) || attempt >= 2) throw error; }
}

// Migra o caminho antigo do avatar para o asset atual.


Object.defineProperty(db, 'comprasCartao', {
    get: function() {
        return this.transacoes.filter(t => t.isCartao).map(t => ({
            id: t.id,
            cartaoId: t.bancoId,
            desc: t.desc,
            valor: t.valor,
            categoria: t.categoria,
            parcelaAtual: t.parcelaAtual,
            totalParcelas: t.totalParcelas,
            data: t.data,
            codigoRef: t.codigoRef,
            parentId: t.grupoId,
            contatoId: t.contatoId
        }));
    }
});

let capturingLegacyMutation = false;
const persist = col => {
    if (capturingLegacyMutation) return;
    return enqueueTransactionMutation(() => persistAtomically(col ? [col] : collections));
};

const persistAtomically = async (cols, writer = entries => IDB.setMany(entries)) => {
    const uniqueCols = [...new Set([...(cols || []), 'metadados'])];
    const previousMetadata = db.metadados;
    db.metadados = { ...(db.metadados || {}), ultimaAtualizacao: new Date().toISOString() };
    try {
        await writer(uniqueCols.filter(col => db[col] !== undefined).map(col => [col, db[col]]));
    } catch (error) {
        db.metadados = previousMetadata;
        throw error;
    }
    clearCache();
    revisionChannel?.postMessage(persistedRevision);
    if (typeof document !== 'undefined') document.dispatchEvent(new Event('db-updated'));
};

const TRANSACTION_PERSIST_COLLECTIONS = ['transacoes', 'bancos', 'reservas', 'metas', 'agendamentos'];
const NO_TRANSACTION_MUTATION = Symbol('no-transaction-mutation');
let transactionPersistenceWriter = entries => IDB.setMany(entries);
let transactionMutationQueue = Promise.resolve();

const cloneCollectionForRollback = value => value === undefined ? undefined : structuredClone(value);

const snapshotTransactionState = (cols = TRANSACTION_PERSIST_COLLECTIONS) => Object.fromEntries(
    [...new Set([...TRANSACTION_PERSIST_COLLECTIONS, ...cols, 'metadados'])].map(col => [col, cloneCollectionForRollback(db[col])])
);

const restoreTransactionState = snapshot => {
    Object.entries(snapshot).forEach(([col, value]) => { db[col] = value; });
    clearCache();
};

// Serialize ordinary ledger mutations and commit their affected collections in
// one IndexedDB transaction. A rejected write restores the in-memory snapshot
// and reaches the caller instead of being swallowed by persist().
const enqueueTransactionMutation = run => {
    const operation = transactionMutationQueue.then(run, run);
    transactionMutationQueue = operation.then(() => undefined, () => undefined);
    return operation;
};

const recordFinancialChanges = snapshot => {
    // A local change journal shares the financial commit and rollback.
    const changes = [];
    for (const col of ['transacoes', 'bancos', 'cartoes', 'conciliacoesFaturas', 'conferencias']) {
        const before = new Map((snapshot[col] || []).map(item => [String(item.id ?? item.chave), item]));
        const after = new Map((db[col] || []).map(item => [String(item.id ?? item.chave), item]));
        for (const id of new Set([...before.keys(), ...after.keys()])) {
            if (JSON.stringify(before.get(id)) !== JSON.stringify(after.get(id))) changes.push({
                id: globalThis.crypto?.randomUUID?.() || `change-${Date.now()}-${Math.random()}`,
                collection: col, entityId: id, at: new Date().toISOString(),
                before: before.get(id) || null, after: after.get(id) || null
            });
        }
    }
    const changedTransactionIds = new Set(changes.filter(c => c.collection === 'transacoes').map(c => c.entityId));
    if (changedTransactionIds.size) {
        for (const record of [...(db.conferencias || []), ...(db.conciliacoesFaturas || [])]) {
            for (const field of ['decisions', 'verificacoes']) {
                if (Object.keys(record[field] || {}).some(id => changedTransactionIds.has(id))) {
                    record[field] = Object.fromEntries(Object.entries(record[field]).filter(([id]) => !changedTransactionIds.has(id)));
                    record.confirmedAt = null;
                    record.reopenedAt = new Date().toISOString();
                }
            }
        }
    }
    if (changes.some(change => change.collection === 'transacoes' || change.collection === 'bancos')) {
        db.conferencias = (db.conferencias || []).map(record => {
            if (!record.confirmedAt) return record;
            const bank = db.bancos.find(b => String(b.id) === String(record.bankId));
            const items = db.transacoes.filter(t => !t.isCartao && String(t.bancoId) === String(record.bankId) && t.data?.startsWith(record.period) && t.data <= record.asOf);
            const balance = bankBalanceAtDate(db, bank, record.asOf, new Date().toLocaleDateString('en-CA'));
            return balance !== null && record.confirmedFingerprint === bankConferenceFingerprint(items, balance, record.reference, record.asOf)
                ? record : { ...record, confirmedAt: null, reopenedAt: new Date().toISOString() };
        });
    }
    const removedIds = new Set(changes.filter(c => c.collection === 'transacoes' && !c.after).map(c => c.entityId));
    if (removedIds.size) for (const record of db.conciliacoesFaturas || []) {
        record.ajustes = (record.ajustes || []).map(adjustment => removedIds.has(String(adjustment.transactionId))
            ? { ...adjustment, transactionId: null, lancamentoCriado: false, unpostedAt: new Date().toISOString() } : adjustment);
    }
    if (changes.length) db.historicoAlteracoes = [...changes, ...(db.historicoAlteracoes || [])];
};

const commitTransactionMutation = (mutate, cols = TRANSACTION_PERSIST_COLLECTIONS) => enqueueTransactionMutation(async () => {
    const snapshot = snapshotTransactionState(collections);
    try {
        const result = mutate();
        if (result === NO_TRANSACTION_MUTATION) return false;
        recordFinancialChanges(snapshot);
        await persistAtomically([...cols, 'historicoAlteracoes', 'conferencias', 'conciliacoesFaturas'], transactionPersistenceWriter);
        return result;
    } catch (error) {
        restoreTransactionState(snapshot);
        throw error;
    }
});

// Test seam for deterministic quota/IndexedDB failure coverage. Passing no
// function restores the real IndexedDB writer.
export const __setTransactionPersistenceWriterForTests = writer => {
    transactionPersistenceWriter = typeof writer === 'function' ? writer : entries => IDB.setMany(entries);
};

const transferStateSnapshot = () => snapshotTransactionState(collections);
const restoreTransferState = snapshot => restoreTransactionState(snapshot);

const applyBalanceDelta = (t, isReverse = false, shouldPersist = true) => {
    // A confirmed statement balance is an absolute anchor that already includes
    // these imported ledger rows. Keep their history without applying them twice.
    if (t.isCartao || t.saldoIncluidoNoSaldoDoExtrato === true) return;
    const bank = db.bancos.find(account => String(account.id) === String(t.bancoId));
    const reserve = (db.reservas || []).find(account => String(account.id) === String(t.bancoId));
    if (bank && t.alocacaoMetaVirtual === true) return;
    const account = bank || reserve;
    if (!account) return;

    const amount = isTransfer(t)
        ? (t.transferenciaEntrada ? t.valor : -t.valor)
        : (isIncome(t) ? t.valor : -t.valor);
    account.saldo = addMoney(account.saldo, isReverse ? -amount : amount);
    if (shouldPersist) persist(bank ? 'bancos' : 'reservas');
};

const applyGoalReserveDelta = (transaction, sign = 1) => {
    if (!isTransfer(transaction)) return;
    const reserve = (db.reservas || []).find(item => String(item.id) === String(transaction?.bancoId));
    if (!reserve) return;
    const goal = db.metas.find(item => String(item.id) === String(reserve.goalId));
    if (!goal) return;
    const direction = transaction.transferenciaEntrada ? 1 : -1;
    goal.atual = addMoney(goal.atual, direction * sign * (Number(transaction.valor) || 0));
};

const resolveTransferAccount = id => ({
    bank: db.bancos.find(item => String(item.id) === String(id)) || null,
    reserve: (db.reservas || []).find(item => String(item.id) === String(id)) || null,
});

const isUnpairedTransfer = item => isTransfer(item) && !isInvoicePayment(item) && !item?.transferenciaId;

const TRANSFER_PERSIST_COLLECTIONS = ['transacoes', 'bancos', 'reservas', 'metas', 'historicoAlteracoes', 'conferencias', 'conciliacoesFaturas'];

const isValidTransferPair = legs => {
    if (!Array.isArray(legs) || legs.length !== 2) return false;
    const incoming = legs.filter(item => item.transferenciaEntrada === true);
    const outgoing = legs.filter(item => item.transferenciaEntrada === false);
    if (incoming.length !== 1 || outgoing.length !== 1) return false;
    const [credit] = incoming;
    const [debit] = outgoing;
    const sourceAccount = resolveTransferAccount(debit.contaOrigemId);
    const destinationAccount = resolveTransferAccount(debit.contaDestinoId);
    const sourceIsUnambiguous = Boolean(sourceAccount.bank) !== Boolean(sourceAccount.reserve);
    const destinationIsUnambiguous = Boolean(destinationAccount.bank) !== Boolean(destinationAccount.reserve);
    return Boolean(
        sourceIsUnambiguous && destinationIsUnambiguous &&
        credit.transferenciaInterna === true && debit.transferenciaInterna === true &&
        credit.transferenciaId != null && String(credit.transferenciaId).length > 0 &&
        String(credit.transferenciaId) === String(debit.transferenciaId) &&
        credit.id != null && debit.id != null && String(credit.id) !== String(debit.id) &&
        credit.tipo === 'receita' && debit.tipo === 'despesa' &&
        String(debit.bancoId) === String(debit.contaOrigemId) &&
        String(credit.bancoId) === String(credit.contaDestinoId) &&
        String(debit.contaOrigemId) === String(credit.contaOrigemId) &&
        String(debit.contaDestinoId) === String(credit.contaDestinoId) &&
        String(debit.contaOrigemId) !== String(debit.contaDestinoId) &&
        Boolean(resolveTransferAccount(debit.contaOrigemId).bank || resolveTransferAccount(debit.contaOrigemId).reserve) &&
        Boolean(resolveTransferAccount(debit.contaDestinoId).bank || resolveTransferAccount(debit.contaDestinoId).reserve) &&
        toCents(debit.valor) > 0 && toCents(debit.valor) === toCents(credit.valor) &&
        String(debit.data) === String(credit.data) && isValidTransferDate(debit.data)
    );
};

export const TransferRepo = {
    add: ({ sourceAccountId, destinationAccountId, amount, date, description, goalId = null, transferId } = {}) => enqueueTransactionMutation(async () => {
        const source = resolveTransferAccount(sourceAccountId);
        const destination = resolveTransferAccount(destinationAccountId);
        if ((!source.bank && !source.reserve) || (!destination.bank && !destination.reserve)) {
            throw new Error('A conta de origem ou destino não existe.');
        }
        if ((source.bank && source.reserve) || (destination.bank && destination.reserve)) {
            throw new Error('Identificador de conta ambíguo para transferência.');
        }
        if (source.reserve || destination.reserve) {
            throw new Error('Reservas de metas são virtuais; use o fluxo de aporte ou resgate da meta.');
        }
        if (goalId != null) throw new Error('Aporte em meta deve ser registrado como alocação virtual.');

        const legs = createTransfer({ sourceAccountId, destinationAccountId, amount, date, description, transferId });
        if (!isValidTransferPair(legs) || db.transacoes.some(item => String(item.transferenciaId) === String(legs[0].transferenciaId)) || legs.some(leg => db.transacoes.some(item => String(item.id) === String(leg.id)))) {
            throw new Error('Não foi possível criar um par de transferência íntegro.');
        }
        const snapshot = transferStateSnapshot();
        try {
            db.transacoes = [...legs, ...db.transacoes];
            legs.forEach(leg => {
                applyBalanceDelta(leg, false, false);
                applyGoalReserveDelta(leg, 1);
            });
            recordFinancialChanges(snapshot);
            await persistAtomically(TRANSFER_PERSIST_COLLECTIONS);
            return { ok: true, transferId: legs[0].transferenciaId, transactions: legs };
        } catch (error) {
            restoreTransferState(snapshot);
            throw error;
        }
    }),

    update: (transactionId, newData = {}) => enqueueTransactionMutation(async () => {
        if (!newData || typeof newData !== 'object' || Array.isArray(newData)) return false;
        const target = db.transacoes.find(item => String(item.id) === String(transactionId));
        if (!target?.transferenciaId) return false;
        const legs = db.transacoes.filter(item => String(item.transferenciaId) === String(target.transferenciaId));
        if (!isValidTransferPair(legs)) return false;
        const allowedFields = ['desc', 'data', 'categoria', 'contatoId', 'observacoes', 'valor'];
        if (Object.keys(newData).some(key => !allowedFields.includes(key))) return false;

        const sharedChanges = {};
        ['desc', 'data', 'categoria', 'contatoId', 'observacoes'].forEach(key => {
            if (hasOwn(newData, key)) sharedChanges[key] = newData[key];
        });
        if (hasOwn(newData, 'data') && !isValidTransferDate(newData.data)) return false;
        if (hasOwn(newData, 'valor')) {
            const valueCents = toCents(newData.valor);
            if (valueCents <= 0) return false;
            sharedChanges.valor = fromCents(valueCents);
        }
        const nextLegs = legs.map(leg => ({ ...leg, ...sharedChanges }));
        const snapshot = transferStateSnapshot();
        try {
            legs.forEach(leg => {
                applyBalanceDelta(leg, true, false);
                applyGoalReserveDelta(leg, -1);
            });
            const byId = new Map(nextLegs.map(leg => [String(leg.id), leg]));
            db.transacoes = db.transacoes.map(leg => byId.get(String(leg.id)) || leg);
            nextLegs.forEach(leg => {
                applyBalanceDelta(leg, false, false);
                applyGoalReserveDelta(leg, 1);
            });
            recordFinancialChanges(snapshot);
            await persistAtomically(TRANSFER_PERSIST_COLLECTIONS);
            return true;
        } catch (error) {
            restoreTransferState(snapshot);
            throw error;
        }
    }),

    deleteByIds: ids => enqueueTransactionMutation(async () => {
        const selected = new Set((ids || []).map(String));
        const selectedTransfers = db.transacoes.filter(item => selected.has(String(item.id)) && (item.transferenciaId || isUnpairedTransfer(item)));
        if (selectedTransfers.some(item => !item.transferenciaId)) {
            throw new Error('Não é possível remover uma perna de transferência sem identificador vinculado.');
        }
        const transferIds = new Set(selectedTransfers.map(item => String(item.transferenciaId)));
        if (!transferIds.size) return null;

        const grouped = [...transferIds].map(transferId => db.transacoes.filter(item => String(item.transferenciaId) === transferId));
        if (grouped.some(legs => !isValidTransferPair(legs))) {
            throw new Error('A transferência está incompleta; nenhuma perna foi removida.');
        }
        const removed = db.transacoes.filter(item => selected.has(String(item.id)) || (item.transferenciaId && transferIds.has(String(item.transferenciaId))));
        const snapshot = transferStateSnapshot();
        try {
            removed.forEach(leg => {
                applyBalanceDelta(leg, true, false);
                applyGoalReserveDelta(leg, -1);
            });
            db.transacoes = db.transacoes.filter(item => !selected.has(String(item.id)) && !(item.transferenciaId && transferIds.has(String(item.transferenciaId))));
            recordFinancialChanges(snapshot);
            await persistAtomically(TRANSFER_PERSIST_COLLECTIONS);
            return removed;
        } catch (error) {
            restoreTransferState(snapshot);
            throw error;
        }
    }),

    restoreMany: items => enqueueTransactionMutation(async () => {
        const candidates = (items || []).filter(item => !db.transacoes.some(current => String(current.id) === String(item.id)));
        if (candidates.some(item => isUnpairedTransfer(item))) {
            throw new Error('Não é possível restaurar uma transferência sem identificador vinculado.');
        }
        const grouped = new Map();
        candidates.filter(item => item.transferenciaId || isUnpairedTransfer(item)).forEach(item => {
            const key = String(item.transferenciaId);
            grouped.set(key, [...(grouped.get(key) || []), item]);
        });
        if ([...grouped.values()].some(legs => !isValidTransferPair(legs))) {
            throw new Error('Não é possível restaurar uma transferência incompleta.');
        }
        const snapshot = transferStateSnapshot();
        try {
            db.transacoes = [...candidates, ...db.transacoes];
            candidates.forEach(item => {
                applyBalanceDelta(item, false, false);
                applyGoalReserveDelta(item, 1);
            });
            recordFinancialChanges(snapshot);
            await persistAtomically(TRANSFER_PERSIST_COLLECTIONS);
            return candidates.length;
        } catch (error) {
            restoreTransferState(snapshot);
            throw error;
        }
    })
};

export const UserRepo = {
    update: (newData) => {
        db.usuario = { ...db.usuario, ...newData };
        persist('usuario');
        return true;
    }
};

export const MentoriaRepo = {
    saveSnapshot: (snapshot) => {
        const existe = db.historicoMentoria.findIndex(h => h.mesAno === snapshot.mesAno);
        if (existe >= 0) {
            db.historicoMentoria[existe] = snapshot;
        } else {
            db.historicoMentoria.unshift(snapshot);
        }
        db.historicoMentoria.sort((a,b) => b.timestamp - a.timestamp);
        persist('historicoMentoria');
    }
};

export const BankRepo = {
    add: (item) => { 
        if (!item || typeof item !== 'object' || !String(item.nome || '').trim()) return false;
        if (item.id == null || db.bancos.some(bank => String(bank.id) === String(item.id))) throw new Error('Esta conta já existe ou tem um identificador inválido.');
        if (!Number.isFinite(Number(item.saldo))) return false;
        const novoBanco = {
            ...item,
            nome: String(item.nome).trim(),
            saldo: fromCents(toCents(item.saldo)),
            saldoInicial: fromCents(toCents(item.saldoInicial ?? item.saldo)),
            dataCriacao: item.dataCriacao || new Date().toISOString().split('T')[0]
        };
        db.bancos.unshift(novoBanco); 
        persist('bancos'); 
        return true; 
    },
    remove: (id) => { 
        const hasTransactions = db.transacoes.some(t => !t.isCartao && String(t.bancoId) === String(id));
        const hasCards = db.cartoes.some(c => String(c.bancoId) === String(id));
        const hasForecasts = [...(db.agendamentos || []), ...(db.receitasFuturas || [])].some(item => String(item.bancoId) === String(id));
        const hasGoalAllocationHistory = (db.reservas || []).some(reserve =>
            (reserve.movimentos || []).some(movement => String(movement?.contaId) === String(id))
        );
        if (hasTransactions || hasCards || hasGoalAllocationHistory || hasForecasts) return false;
        db.bancos = db.bancos.filter(i => i.id.toString() !== id.toString()); 
        persist('bancos'); 
        return true;
    },
    recalculateAll: () => commitTransactionMutation(() => {
        const changed = [];
        db.bancos = db.bancos.map(bank => {
            const opening = Number(bank?.saldoInicial);
            if (!Number.isFinite(opening)) return bank;
            const balanceCents = db.transacoes
                .filter(t => !t?.isCartao && t?.saldoIncluidoNoSaldoDoExtrato !== true && String(t?.bancoId) === String(bank.id))
                .reduce((total, t) => {
                    const value = toCents(t?.valor);
                    if (!value) return total;
                    const signed = isTransfer(t)
                        ? (t.transferenciaEntrada ? value : -value)
                        : (isIncome(t) ? value : -value);
                    return total + signed;
                }, toCents(opening));
            const next = fromCents(balanceCents);
            if (next !== bank.saldo) changed.push({ id: bank.id, before: bank.saldo, after: next });
            return { ...bank, saldo: next };
        });
        return changed;
    }, ['bancos'])
};

export const TransactionsRepo = {
    getAll: () => db.transacoes,

    getByMonth: (ano, mes) => {
        if (!Cache.transacoesPorMes) buildMonthlyCache();
        return Cache.transacoesPorMes[`${ano}-${mes}`] || [];
    },

    getCardExpensesByMonth: (ano, mes) => {
        return TransactionsRepo.getByMonth(ano, mes).filter(t => t.isCartao).map(t => ({
            id: t.id, cartaoId: t.bancoId, desc: t.desc, valor: t.valor, categoria: t.categoria,
            parcelaAtual: t.parcelaAtual, totalParcelas: t.totalParcelas, data: t.data, codigoRef: t.codigoRef, parentId: t.grupoId
        }));
    },

    // A batch shares one IndexedDB transaction for ledger rows and affected
    // balances. absoluteBalance is used only by confirmed statement imports.
    addMany: (items, options = {}) => {
        const incoming = Array.isArray(items) ? items.map(item => item && typeof item === 'object' ? { ...item } : item) : [];
        const hasAbsoluteBalance = options.absoluteBalance !== undefined && options.absoluteBalance !== null;
        if (!incoming.length && !hasAbsoluteBalance) return Promise.resolve([]);
        return commitTransactionMutation(() => {
            if (incoming.some(item => !item || typeof item !== 'object' || item.transferenciaId || isUnpairedTransfer(item))) {
                return NO_TRANSACTION_MUTATION;
            }
            if (hasAbsoluteBalance) {
                const bank = db.bancos.find(account => String(account.id) === String(options.bankId));
                const balance = Number(options.absoluteBalance);
                if (!bank || !Number.isFinite(balance)) return NO_TRANSACTION_MUTATION;
                bank.saldo = fromCents(toCents(balance));
            }
            const added = incoming.map(item => {
                if (item.id == null || db.transacoes.some(t => String(t.id) === String(item.id))) {
                    throw new Error('Este identificador de lançamento já existe. Nenhuma duplicata foi salva.');
                }
                if (!Number.isFinite(Number(item.valor)) || !Number.isSafeInteger(toCents(item.valor)) || toCents(item.valor) < 0 || (item.data && !isValidInvoicePaymentDate(item.data))) throw new Error('Confira o valor e a data dos lançamentos.');
                const transaction = { ...item };
                if (!transaction.codigoRef) transaction.codigoRef = `TX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                db.transacoes.unshift(transaction);
                applyBalanceDelta(transaction, false, false);
                return transaction;
            });
            return added;
        });
    },

    add: item => TransactionsRepo.addMany([item]).then(added => Array.isArray(added) && added.length === 1),

    addRecurrent: (transaction, installments) => {
        if (transaction?.transferenciaId || isTransfer(transaction)) return Promise.resolve(false);
        const originalDate = new Date(transaction.data + 'T12:00:00');
        const originalDay = originalDate.getDate();
        const groupId = Date.now();
        const baseRef = `TX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const quantity = Math.max(1, Number.parseInt(installments, 10) || 1);
        const valuePerOccurrence = fromCents(toCents(transaction.valor));
        const rows = [];

        for (let i = 0; i < quantity; i++) {
            const occurrenceDate = new Date(originalDate);
            occurrenceDate.setMonth(originalDate.getMonth() + i);
            if (occurrenceDate.getDate() !== originalDay) occurrenceDate.setDate(0);
            rows.push({
                ...transaction,
                id: groupId + i,
                valor: valuePerOccurrence,
                data: occurrenceDate.toISOString().split('T')[0],
                parcelaAtual: i + 1,
                totalParcelas: quantity,
                grupoId: groupId,
                codigoRef: `${baseRef}-${i + 1}`
            });
        }
        return TransactionsRepo.addMany(rows);
    },

    addCardExpense: purchase => {
        const card = db.cartoes.find(c => String(c.id) === String(purchase.cartaoId));
        if (!card) return Promise.reject(new Error('Cartão não encontrado.'));
        const quantity = Math.max(1, Number.parseInt(purchase.parcelas, 10) || 1);
        const installmentValues = splitInstallments(purchase.total, quantity);
        const originalDate = new Date(purchase.data + 'T12:00:00');
        const originalDay = originalDate.getDate();
        const groupId = Date.now();
        const baseRef = `TX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const rows = [];

        for (let i = 0; i < quantity; i++) {
            const installmentDate = new Date(originalDate);
            installmentDate.setMonth(originalDate.getMonth() + i);
            if (installmentDate.getDate() !== originalDay) installmentDate.setDate(0);
            rows.push({
                id: purchase.id ? `${purchase.id}-${i + 1}` : groupId + i,
                desc: purchase.desc,
                valor: installmentValues[i],
                tipo: 'despesa',
                categoria: purchase.categoria,
                bancoId: purchase.cartaoId,
                isCartao: true,
                formaPagamento: 'Cartão de Crédito',
                data: installmentDate.toISOString().split('T')[0],
                dataCompra: purchase.data,
                valorOriginal: fromCents(toCents(purchase.total)),
                faturaChave: invoiceCycleForDate(card, installmentDate.toISOString().split('T')[0]),
                parcelaAtual: i + 1,
                totalParcelas: quantity,
                recorrente: quantity > 1,
                grupoId: purchase.id || groupId,
                codigoRef: quantity > 1 ? `${baseRef}-${i + 1}` : baseRef,
                contatoId: purchase.contatoId || null
            });
        }
        return TransactionsRepo.addMany(rows).then(added => Array.isArray(added) && added.length === quantity);
    },

    update: (id, newData) => {
        if (!newData || typeof newData !== 'object' || Array.isArray(newData)) return Promise.resolve(false);
        const current = db.transacoes.find(item => String(item.id) === String(id));
        if (current?.transferenciaId) {
            const { scope, purchaseTotal, ...transferData } = newData;
            if (scope && scope !== 'one') return Promise.resolve(false);
            return TransferRepo.update(id, transferData);
        }
        if (current && isUnpairedTransfer(current)) return Promise.resolve(false);
        if (newData && (newData.transferenciaId || newData.transferenciaInterna === true || newData.tipo === 'transferencia' || newData.tipoTransferencia === 'interna')) return Promise.resolve(false);
        return commitTransactionMutation(() => {
            const index = db.transacoes.findIndex(item => String(item.id) === String(id));
            if (index < 0 || db.transacoes[index].transferenciaId || isUnpairedTransfer(db.transacoes[index])) return NO_TRANSACTION_MUTATION;
            const oldTransaction = db.transacoes[index];
            const { scope = 'one', purchaseTotal, ...changes } = newData;
            newData = changes;
            if (scope === 'remaining') {
                if (!oldTransaction.isCartao || !oldTransaction.grupoId) throw new Error('Este lançamento não pertence a uma compra parcelada.');
                const card = db.cartoes.find(c => String(c.id) === String(oldTransaction.bancoId));
                const selected = db.transacoes.filter(t => String(t.grupoId) === String(oldTransaction.grupoId) && t.isCartao && String(t.bancoId) === String(oldTransaction.bancoId) && Number(t.parcelaAtual) >= Number(oldTransaction.parcelaAtual))
                    .sort((a,b) => Number(a.parcelaAtual) - Number(b.parcelaAtual));
                if (!card || !selected.length || !Number.isFinite(Number(purchaseTotal)) || toCents(purchaseTotal) < selected.length || !Number.isSafeInteger(toCents(purchaseTotal))) throw new Error('Informe um total válido para as parcelas selecionadas.');
                if (newData.data && newData.data !== oldTransaction.data) throw new Error('Para corrigir a data, selecione somente esta parcela. A redistribuição preserva as datas de cada fatura.');
                if (selected.some(tx => {
                    const key = tx.faturaChave || invoiceCycleForDate(card, tx.data);
                    const [year,month] = key.slice(key.lastIndexOf(':') + 1).split('-').map(Number);
                    return invoiceModel(db, card, year, month - 1).paid > 0 || db.agendamentos.some(s => s.status === 'pago' && invoicePaymentKey({ invoicePaymentAgendamentoId: s.id }, card, db.agendamentos) === key);
                })) throw new Error('Há pagamento em uma das faturas selecionadas. Revise a parcela individualmente para preservar o histórico de pagamentos.');
                const values = splitInstallments(purchaseTotal, selected.length);
                const byId = new Map(selected.map((tx,i) => [String(tx.id), { ...tx, desc: newData.desc ?? tx.desc, categoria: newData.categoria ?? tx.categoria, contatoId: newData.contatoId ?? tx.contatoId, valor: values[i] }]));
                db.transacoes = db.transacoes.map(tx => byId.get(String(tx.id)) || tx);
                return true;
            }
            if (scope !== 'one') throw new Error('Selecione um escopo de alteração válido.');
            if (oldTransaction.isCartao && newData.data && newData.data !== oldTransaction.data) {
                const card = db.cartoes.find(c => String(c.id) === String(oldTransaction.bancoId));
                if (card) newData = { ...newData, faturaChave: invoiceCycleForDate(card, newData.data) };
            }
            applyBalanceDelta(oldTransaction, true, false);
            db.transacoes[index] = { ...oldTransaction, ...newData };
            if (oldTransaction.isCartao && oldTransaction.reconciliationAdjustmentId) {
                for (const record of db.conciliacoesFaturas || []) record.ajustes = (record.ajustes || []).map(a => String(a.id) === String(oldTransaction.reconciliationAdjustmentId)
                    ? { ...a, amount: db.transacoes[index].valor, description: db.transacoes[index].desc } : a);
            }
            applyBalanceDelta(db.transacoes[index], false, false);
            return true;
        });
    },

    updateCategories: (idsArray, categoria) => commitTransactionMutation(() => {
        const ids = new Set((idsArray || []).map(id => String(id)));
        if (!ids.size || !categoria) return NO_TRANSACTION_MUTATION;
        const selectedTransfers = db.transacoes.filter(item => ids.has(String(item.id)) && (item.transferenciaId || isUnpairedTransfer(item)));
        if (selectedTransfers.some(item => !item.transferenciaId)) return NO_TRANSACTION_MUTATION;
        const transferIds = new Set(selectedTransfers.map(item => String(item.transferenciaId)));
        const selectedPairs = [...transferIds].map(id => db.transacoes.filter(item => String(item.transferenciaId) === id));
        if (selectedPairs.some(legs => !isValidTransferPair(legs))) return NO_TRANSACTION_MUTATION;
        const idsToUpdate = new Set(ids);
        db.transacoes.filter(item => item.transferenciaId && transferIds.has(String(item.transferenciaId))).forEach(item => idsToUpdate.add(String(item.id)));
        let changed = 0;
        db.transacoes = db.transacoes.map(item => {
            if (!idsToUpdate.has(String(item.id))) return item;
            changed += 1;
            return { ...item, categoria };
        });
        return changed ? changed : NO_TRANSACTION_MUTATION;
    }, ['transacoes']),

    delete: id => TransactionsRepo.deleteMultiple([id]),

    deleteMultiple: (idsArray, options = {}) => {
        if ((!idsArray || idsArray.length === 0) && !options.reverseBalanceAdjustment) return Promise.resolve([]);
        const strIds = new Set((idsArray || []).map(String));
        const includesTransfer = db.transacoes.some(item => strIds.has(String(item.id)) && (item.transferenciaId || isUnpairedTransfer(item)));
        if (includesTransfer) return TransferRepo.deleteByIds(idsArray);
        return commitTransactionMutation(() => {
            const removed = db.transacoes.filter(item => strIds.has(String(item.id)));
            const adjustment = options.reverseBalanceAdjustment;
            if (!removed.length && !adjustment) return NO_TRANSACTION_MUTATION;
            if (adjustment) {
                const bank = db.bancos.find(item => String(item.id) === String(adjustment.bankId));
                if (!bank || !Number.isFinite(Number(adjustment.amount))) return NO_TRANSACTION_MUTATION;
                bank.saldo = fromCents(toCents(bank.saldo) - toCents(adjustment.amount));
            }
            db.transacoes = db.transacoes.filter(item => !strIds.has(String(item.id)));
            removed.forEach(item => applyBalanceDelta(item, true, false));
            return removed;
        });
    }
};

// Recurring ledger entries and their future commitments must be committed as
// one mutation. This prevents a successful first occurrence from being left
// behind when one of the scheduled records cannot be persisted.
const addRecurringTransactionAtomically = (transaction, schedules = []) => commitTransactionMutation(() => {
    if (!transaction || typeof transaction !== 'object') return NO_TRANSACTION_MUTATION;
    if (db.transacoes.some(t => String(t.id) === String(transaction.id))) throw new Error('Esta ocorrência já foi registrada. Nenhum débito foi repetido.');
    const normalizedSchedules = (Array.isArray(schedules) ? schedules : []).filter(item => item && typeof item === 'object');
    db.transacoes.unshift({ ...transaction });
    applyBalanceDelta(transaction, false, false);
    db.agendamentos = [...normalizedSchedules.map(item => ({ ...item })), ...db.agendamentos];
    return [{ ...transaction }, ...normalizedSchedules.map(item => ({ ...item }))];
}, ['transacoes', 'bancos', 'reservas', 'metas', 'agendamentos']);

export const CardRepo = {
    add: (item) => {
        if (item.id == null || db.cartoes.some(c => String(c.id) === String(item.id))) throw new Error('Este cartão já existe.');
        db.cartoes.unshift(item); persist('cartoes'); return true;
    },
    update: (id, data) => commitTransactionMutation(() => {
        const card = db.cartoes.find(c => String(c.id) === String(id));
        if (!card || !db.bancos.some(b => String(b.id) === String(data.bancoId))) throw new Error('Cartão ou conta vinculada não encontrado.');
        const hasHistory = db.transacoes.some(t => t.isCartao && String(t.bancoId) === String(id));
        const closing = Number(data.fechamento ?? card.fechamento), due = Number(data.vencimento ?? card.vencimento);
        if (!Number.isInteger(closing) || closing < 1 || closing > 31 || !Number.isInteger(due) || due < 1 || due > 31) throw new Error('Informe fechamento e vencimento entre 1 e 31.');
        if (hasHistory && (due !== Number(card.vencimento) || (due <= closing) !== (Number(card.vencimento) <= Number(card.fechamento)))) {
            throw new Error('Esta mudança altera o mês de vencimento de faturas existentes. Ela exige revisão dos ciclos históricos e foi bloqueada para preservar suas obrigações.');
        }
        // Pin existing cycles before changing the rules used by NEW purchases.
        db.transacoes = db.transacoes.map(t => t.isCartao && String(t.bancoId) === String(id) && !t.faturaChave ? { ...t, faturaChave: invoiceCycleForDate(card, t.data) } : t);
        Object.assign(card, data, { id: card.id });
        return true;
    }, ['cartoes', 'transacoes']),
    remove: (id) => {
        const hasTransactions = db.transacoes.some(t => t.isCartao && String(t.bancoId) === String(id));
        const hasInvoiceHistory = (db.agendamentos || []).some(s => String(s.cartaoId) === String(id)) || (db.conciliacoesFaturas || []).some(r => String(r.cardId) === String(id));
        if (hasTransactions || hasInvoiceHistory) return false;
        db.cartoes = db.cartoes.filter(i => i.id.toString() !== id.toString());
        persist('cartoes');
        return true;
    }
};

export const ReconciliationRepo = {
    get: (cardId, year, month) => (db.conciliacoesFaturas || []).find(r => r.chave === invoiceReconciliationKey(cardId, year, month)) || null,
    listAdjustments: (cardId, year, month) => ReconciliationRepo.get(cardId, year, month)?.ajustes || [],
    saveAdjustment: (cardId, year, month, input) => {
        if (!Array.isArray(db.conciliacoesFaturas)) db.conciliacoesFaturas = [];
        const chave = invoiceReconciliationKey(cardId, year, month);
        const index = db.conciliacoesFaturas.findIndex(r => r.chave === chave);
        const current = index >= 0 ? db.conciliacoesFaturas[index] : { id: chave, chave, cardId, ano: year, mes: month };
        const ajustes = Array.isArray(current.ajustes) ? [...current.ajustes] : [];
        const normalized = normalizeAdjustment({ ...input, id: input.id || `aj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: input.createdAt || new Date().toISOString() });
        const adjustmentIndex = ajustes.findIndex(a => String(a.id) === String(normalized.id));
        if (adjustmentIndex >= 0 && ajustes[adjustmentIndex].transactionId &&
            (toCents(ajustes[adjustmentIndex].amount) !== toCents(normalized.amount) || ajustes[adjustmentIndex].effect !== normalized.effect || ajustes[adjustmentIndex].description !== normalized.description)) throw new Error('Este ajuste já possui lançamento vinculado. Revise o lançamento antes de substituir o ajuste.');
        if (adjustmentIndex >= 0) ajustes[adjustmentIndex] = { ...ajustes[adjustmentIndex], ...normalized };
        else ajustes.push(normalized);
        const value = { ...current, id: current.id || chave, ajustes, atualizadoEm: new Date().toISOString() };
        if (index >= 0) db.conciliacoesFaturas[index] = value; else db.conciliacoesFaturas.unshift(value);
        persist('conciliacoesFaturas'); return normalized;
    },
    /** Post an obligation adjustment, never an immediate bank movement. */
    createAdjustmentTransaction: (cardId, year, month, adjustmentId) => commitTransactionMutation(() => {
        const record = ReconciliationRepo.get(cardId, year, month);
        const adjustment = record?.ajustes?.find(a => String(a.id) === String(adjustmentId));
        const card = db.cartoes.find(c => String(c.id) === String(cardId));
        if (!adjustment || !card) throw new Error('Ajuste ou cartão não encontrado.');
        const existing = db.transacoes.find(t => String(t.reconciliationAdjustmentId) === String(adjustmentId) && t.invoiceReconciliationKey === record.chave);
        if (existing) return { ok: true, transaction: existing, alreadyExists: true };
        const dueDate = cardInvoiceDueDate(card, year, month);
        const date = dueDate ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const transaction = {
            id: `invoice-adjustment-${encodeURIComponent(record.chave)}-${encodeURIComponent(String(adjustment.id))}`,
            desc: adjustment.description, valor: adjustment.amount,
            tipo: adjustment.effect === 'credit' ? 'estorno-cartao' : 'despesa',
            categoria: adjustment.effect === 'credit' ? 'Estorno' : 'Encargos financeiros',
            isCartao: true, bancoId: card.id, data: date, faturaChave: record.chave,
            invoiceReconciliationKey: record.chave, reconciliationAdjustmentId: adjustment.id,
            origem: 'conciliacao_fatura', formaPagamento: 'Ajuste da obrigação do cartão',
            parcelaAtual: 1, totalParcelas: 1
        };
        if (db.transacoes.some(t => String(t.id) === transaction.id)) throw new Error('Este identificador já existe. Revise o ajuste.');
        db.transacoes.unshift(transaction);
        record.ajustes = record.ajustes.map(a => a === adjustment ? { ...a, transactionId: transaction.id, postedAt: new Date().toISOString(), lancamentoCriado: true } : a);
        record.atualizadoEm = new Date().toISOString();
        return { ok: true, transaction, alreadyExists: false };
    }, ['transacoes', 'conciliacoesFaturas']),
    checkItem: (cardId, year, month, transactionId, checked = true, referenceId = null) => commitTransactionMutation(() => {
        const record = ReconciliationRepo.get(cardId, year, month);
        const tx = db.transacoes.find(t => String(t.id) === String(transactionId));
        if (!record || record.valorFaturaReal == null || !tx) throw new Error('Informe primeiro o total de referência da fatura.');
        const card = db.cartoes.find(c => String(c.id) === String(cardId));
        if (!card || !listInvoiceTransactions(db.transacoes, card, year, month).some(t => String(t.id) === String(transactionId))) throw new Error('Este lançamento não pertence à fatura selecionada.');
        const linkedReference = checked ? validateReferenceLink(record, tx, referenceId, record.verificacoes) : null;
        record.verificacoes = { ...record.verificacoes, [String(tx.id)]: checked ? { referenceId: linkedReference, fingerprint: transactionFingerprint(tx), at: new Date().toISOString(), source: 'conferência manual da fatura' } : null };
        record.confirmedAt = null;
        return true;
    }, ['conciliacoesFaturas']),
    confirm: (cardId, year, month, confirmEmpty = false) => commitTransactionMutation(() => {
        const card = db.cartoes.find(c => String(c.id) === String(cardId));
        const record = ReconciliationRepo.get(cardId, year, month);
        if (!card || !record) throw new Error('Informe o total de referência antes de concluir.');
        const items = listInvoiceTransactions(db.transacoes, card, year, month);
        const result = calculateReconciliation(items, record.valorFaturaReal, record.ajustes || [], record);
        if (!result.totalMatches) throw new Error('Resolva a diferença de valores antes de concluir.');
        if (pendingReferenceRows(record, record.verificacoes).length) throw new Error('Há linhas da referência ainda sem correspondência. Revise-as antes de concluir.');
        if (items.some(t => record.verificacoes?.[String(t.id)]?.fingerprint !== transactionFingerprint(t))) throw new Error('Confira individualmente todos os lançamentos antes de concluir.');
        if (!items.length && !confirmEmpty) throw new Error('Confirme que a fatura de referência não contém lançamentos.');
        record.confirmedAt = new Date().toISOString();
        record.confirmedFingerprint = reconciliationFingerprint(items, record.valorFaturaReal, record.ajustes || []);
        return true;
    }, ['conciliacoesFaturas']),
    deleteAdjustment: (cardId, year, month, id) => {
        const record = ReconciliationRepo.get(cardId, year, month); if (!record) return false;
        if (record.ajustes?.find(a => String(a.id) === String(id))?.transactionId) throw new Error('O ajuste possui um lançamento vinculado. Revise esse lançamento para preservar o histórico.');
        record.ajustes = (record.ajustes || []).filter(a => String(a.id) !== String(id));
        record.atualizadoEm = new Date().toISOString(); persist('conciliacoesFaturas'); return true;
    },
    saveAmount: (cardId, year, month, realInvoiceAmount, source = 'Fatura informada manualmente') => {
        if (!Array.isArray(db.conciliacoesFaturas)) db.conciliacoesFaturas = [];
        const chave = invoiceReconciliationKey(cardId, year, month);
        const numeric = realInvoiceAmount === '' || realInvoiceAmount === null ? null : Number(realInvoiceAmount);
        if (numeric !== null && (!Number.isFinite(numeric) || numeric < 0 || !Number.isSafeInteger(toCents(numeric)))) throw new Error('Informe um total de fatura válido, maior ou igual a zero.');
        const validAmount = Number.isFinite(numeric);
        const normalizedAmount = validAmount ? fromCents(toCents(numeric)) : null;
        const index = db.conciliacoesFaturas.findIndex(r => r.chave === chave);
        const current = index >= 0 ? db.conciliacoesFaturas[index] : { id: chave, chave, cardId, ano: year, mes: month };
        const referenceChanged = current.valorFaturaReal !== normalizedAmount || (current.source && current.source !== source);
        const value = { ...current, id: current.id || chave, cardId, ano: year, mes: month, source, verificacoes: referenceChanged ? {} : current.verificacoes, confirmedAt: null, valorFaturaReal: normalizedAmount, statusConciliacao: validAmount ? 'aguardando conferência' : 'em aberto', atualizadoEm: new Date().toISOString() };
        if (index >= 0) db.conciliacoesFaturas[index] = value;
        else db.conciliacoesFaturas.unshift(value);
        persist('conciliacoesFaturas');
        return value;
    },
    calculate: (transactions, card, year, month) => {
        const items = listInvoiceTransactions(transactions, card, year, month);
        const record = ReconciliationRepo.get(card.id, year, month);
        return { ...calculateReconciliation(items, record?.valorFaturaReal, record?.ajustes || [], record), transacoes: items, ajustes: record?.ajustes || [] };
    }
};

const applyGoalAllocation = ({ goalId, accountId = null, amount, date, description = null, type }) => enqueueTransactionMutation(async () => {
    const goal = db.metas.find(item => String(item.id) === String(goalId));
    if (!goal) throw new Error('Meta não encontrada.');
    const reserve = (db.reservas || []).find(item => String(item.id) === String(goal.reservaId));
    if (!reserve || String(reserve.goalId) !== String(goal.id)) throw new Error('Reserva da meta não encontrada.');
    if (type === 'aporte' && !db.bancos.some(bank => String(bank.id) === String(accountId))) {
        throw new Error('Selecione uma conta bancária válida para associar o aporte.');
    }
    const amountCents = toCents(amount);
    if (amountCents <= 0) throw new Error('Informe um valor maior que zero.');
    if (!isValidTransferDate(date)) throw new Error('Data inválida para o movimento da meta.');

    if (type === 'aporte') {
        const bankCents = db.bancos.reduce((total, bank) => total + toCents(bank?.saldo), 0);
        const reservedCents = (db.reservas || []).reduce((total, item) => total + toCents(item?.saldo), 0);
        if (amountCents > bankCents - reservedCents) {
            throw new Error('O aporte ultrapassa o saldo disponível após as reservas atuais.');
        }
    } else if (amountCents > toCents(reserve.saldo)) {
        throw new Error('O resgate não pode ultrapassar o valor reservado na meta.');
    }

    const previous = {
        metas: db.metas.map(item => ({ ...item })),
        reservas: (db.reservas || []).map(item => ({
            ...item,
            movimentos: Array.isArray(item.movimentos) ? item.movimentos.map(movement => ({ ...movement })) : []
        }))
    };
    const movement = {
        id: `meta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tipo: type,
        contaId: accountId == null ? null : String(accountId),
        valor: fromCents(amountCents),
        data: date,
        descricao: String(description || (type === 'aporte' ? `Aporte na meta: ${goal.nome || 'Meta'}` : `Resgate da meta: ${goal.nome || 'Meta'}`))
    };
    try {
        if (!Array.isArray(reserve.movimentos)) reserve.movimentos = [];
        const signedAmount = type === 'aporte' ? fromCents(amountCents) : -fromCents(amountCents);
        reserve.saldo = addMoney(reserve.saldo, signedAmount);
        reserve.movimentos.push(movement);
        goal.atual = reserve.saldo;
        await persistAtomically(['metas', 'reservas']);
        return { ok: true, movement };
    } catch (error) {
        db.metas = previous.metas;
        db.reservas = previous.reservas;
        throw error;
    }
});

export const GoalRepo = {
    add: item => {
        if (!Array.isArray(db.reservas)) db.reservas = [];
        const goalId = item.id ?? `goal-${Date.now()}`;
        const reserveId = item.reservaId || `reserva-meta-${String(goalId)}`;
        const goal = {
            ...item,
            id: goalId,
            reservaId: reserveId,
            atual: 0,
            alvo: fromCents(toCents(item.alvo))
        };
        db.metas.unshift(goal);
        const existingReserve = (db.reservas || []).find(reserve => String(reserve.id) === String(reserveId));
        if (!existingReserve) {
            db.reservas.unshift({ id: reserveId, goalId, nome: `Reserva: ${goal.nome || 'Meta'}`, saldo: goal.atual, movimentos: [] });
        } else if (!Array.isArray(existingReserve.movimentos)) {
            existingReserve.movimentos = [];
        }
        persist();
        return true;
    },
    remove: id => {
        const goal = db.metas.find(item => String(item.id) === String(id));
        if (!goal) return false;
        const reserve = (db.reservas || []).find(item => String(item.id) === String(goal.reservaId));
        if (reserve && Math.abs(toCents(reserve.saldo)) > 0) return false;
        if (Array.isArray(reserve?.movimentos) && reserve.movimentos.length > 0) return false;
        const reserveIsReferenced = db.transacoes.some(item => [item.bancoId, item.contaOrigemId, item.contaDestinoId].some(accountId => String(accountId) === String(goal.reservaId)));
        if (reserveIsReferenced) return false;
        db.metas = db.metas.filter(item => String(item.id) !== String(id));
        db.reservas = (db.reservas || []).filter(item => String(item.id) !== String(goal.reservaId));
        persist();
        return true;
    },
    deposit: (goalId, sourceAccountId, amount, date = new Date().toISOString().slice(0, 10), description = null) =>
        applyGoalAllocation({ goalId, accountId: sourceAccountId, amount, date, description, type: 'aporte' }),
    release: (goalId, amount, date = new Date().toISOString().slice(0, 10), description = null) =>
        applyGoalAllocation({ goalId, amount, date, description, type: 'resgate' })
};

export const BudgetRepo = {
    add: (item) => {
        db.orcamentos.unshift({ ...item, limite: fromCents(toCents(item.limite)) });
        persist('orcamentos');
        return true;
    },
    remove: (id) => { db.orcamentos = db.orcamentos.filter(i => i.id.toString() !== id.toString()); persist('orcamentos'); },
    updateLimit: (categoria, limite, ano = null, mes = null) => {
        const amount = fromCents(toCents(limite));
        const existe = db.orcamentos.findIndex(o => o.categoria === categoria && o.ano === ano && o.mes === mes);
        if (existe >= 0) db.orcamentos[existe].limite = amount;
        else db.orcamentos.push({ id: Date.now(), categoria, limite: amount, ano, mes });
        persist('orcamentos');
    }
};

export const CategoryRepo = {
    _lastError: '',
    _fail: (message) => { CategoryRepo._lastError = message; return false; },
    getLastError: () => CategoryRepo._lastError,
    _find: (id) => db.categorias.find(c => String(c.id) === String(id)),
    _isArchived: (category) => category?.ativo === false || category?.arquivada === true,
    isPrincipal: (category) => {
        if (!category) return false;
        const group = String(category.grupo || '').trim();
        const name = String(category.nome || '').trim();
        return category.tipoCategoria === 'principal' || !group || (group === name && String(category.subgrupo || name) === name);
    },
    _compatibleType: (category, tipo) => !category?.tipo || category.tipo === tipo,
    _sameName: (a, b) => String(a || '').trim().toLocaleLowerCase('pt-BR') === String(b || '').trim().toLocaleLowerCase('pt-BR'),
    _findParent: (group, tipo, excludeId = null, includeArchived = false) => {
        const target = String(group || '').trim();
        if (!target) return null;
        return db.categorias.find(c => String(c.id) !== String(excludeId ?? '') &&
            CategoryRepo._compatibleType(c, tipo) && CategoryRepo.isPrincipal(c) &&
            (includeArchived || !CategoryRepo._isArchived(c)) &&
            CategoryRepo._sameName(c.grupo || c.nome, target));
    },
    _references: (oldName, newName) => {
        ['transacoes', 'orcamentos', 'agendamentos', 'receitasFuturas', 'assinaturas'].forEach(collection => {
            (db[collection] || []).forEach(item => { if (item?.categoria === oldName) item.categoria = newName; });
        });
    },
    usage: (id) => {
        const categoria = CategoryRepo._find(id);
        if (!categoria) return { exists: false, count: 0, references: [] };
        const name = String(categoria.nome);
        const references = [];
        const check = (collection, label) => (db[collection] || []).forEach(item => { if (item && item.categoria === name) references.push(label); });
        check('transacoes', 'lançamentos'); check('orcamentos', 'orçamentos'); check('agendamentos', 'agendamentos'); check('receitasFuturas', 'receitas futuras'); check('assinaturas', 'assinaturas');
        const children = (db.categorias || []).filter(c => String(c.paiId || '') === String(id) || (String(c.grupo || '') === name && String(c.id) !== String(id)));
        if (children.length) references.push(`${children.length} subcategoria(s)`);
        return { exists: true, count: references.length, references, default: isCategoriaPadrao(categoria) };
    },
    add: (item = {}) => {
        CategoryRepo._lastError = '';
        const nome = String(item.nome || '').trim();
        const tipo = String(item.tipo || '').toLowerCase();
        const nivel = item.tipoCategoria === 'subcategoria' ? 'subcategoria' : 'principal';
        if (!nome) return CategoryRepo._fail('Informe um nome para a categoria.');
        if (!['despesa', 'receita'].includes(tipo)) return CategoryRepo._fail('O tipo deve ser Despesa ou Receita.');
        if (db.categorias.some(c => CategoryRepo._sameName(c?.nome, nome))) return CategoryRepo._fail(`Já existe uma categoria chamada “${nome}”.`);

        let grupo = nome;
        let paiId = null;
        if (nivel === 'subcategoria') {
            const parentName = String(item.grupo || '').trim();
            const parent = CategoryRepo._findParent(parentName, tipo);
            if (!parent) return CategoryRepo._fail('Escolha uma categoria principal ativa do mesmo tipo.');
            grupo = String(parent.grupo || parent.nome).trim();
            paiId = parent.id;
        }
        db.categorias.push({
            ...item, nome, tipo, tipoCategoria: nivel, grupo, subgrupo: nome, paiId,
            fixa: false, ativo: true, arquivada: false
        });
        persist('categorias'); return true;
    },
    rename: (id, novoNome) => {
        CategoryRepo._lastError = '';
        const categoria = CategoryRepo._find(id);
        const nome = String(novoNome || '').trim();
        if (!categoria) return CategoryRepo._fail('Categoria não encontrada.');
        if (isCategoriaPadrao(categoria)) return CategoryRepo._fail('Categorias padrão são protegidas.');
        if (!nome) return CategoryRepo._fail('Informe um nome para a categoria.');
        if (db.categorias.some(c => c !== categoria && CategoryRepo._sameName(c.nome, nome))) return CategoryRepo._fail(`Já existe uma categoria chamada “${nome}”.`);
        const antigo = categoria.nome;
        categoria.nome = nome;
        categoria.subgrupo = nome;
        if (CategoryRepo.isPrincipal(categoria)) {
            categoria.grupo = nome;
            db.categorias.forEach(c => { if (c !== categoria && c.grupo === antigo) c.grupo = nome; });
        }
        CategoryRepo._references(antigo, nome);
        persist('categorias'); ['transacoes', 'orcamentos', 'agendamentos', 'receitasFuturas', 'assinaturas'].forEach(persist);
        return true;
    },
    update: (id, data = {}) => {
        CategoryRepo._lastError = '';
        const categoria = CategoryRepo._find(id);
        if (!categoria) return CategoryRepo._fail('Categoria não encontrada.');
        if (isCategoriaPadrao(categoria)) return CategoryRepo._fail('Categorias padrão são protegidas e não podem ser editadas.');
        const nome = String(data.nome || '').trim();
        const tipo = String(data.tipo || categoria.tipo || '').toLowerCase();
        const nivel = data.tipoCategoria === 'subcategoria' ? 'subcategoria' : 'principal';
        if (!nome) return CategoryRepo._fail('Informe um nome para a categoria.');
        if (!['despesa', 'receita'].includes(tipo)) return CategoryRepo._fail('O tipo deve ser Despesa ou Receita.');
        if (db.categorias.some(c => c !== categoria && CategoryRepo._sameName(c.nome, nome))) return CategoryRepo._fail(`Já existe uma categoria chamada “${nome}”.`);

        const oldLevel = CategoryRepo.isPrincipal(categoria) ? 'principal' : 'subcategoria';
        const children = db.categorias.filter(c => c !== categoria && (String(c.paiId || '') === String(categoria.id) || String(c.grupo || '') === String(categoria.nome)));
        if (oldLevel === 'principal' && nivel === 'subcategoria' && children.length) return CategoryRepo._fail('Esta categoria principal possui subcategorias e não pode virar subcategoria.');
        if (oldLevel === 'principal' && children.length && categoria.tipo && categoria.tipo !== tipo) return CategoryRepo._fail('Altere o tipo das subcategorias antes de mudar o tipo desta categoria principal.');

        let grupo = nome;
        let paiId = null;
        if (nivel === 'subcategoria') {
            const requestedGroup = String(data.grupo || '').trim();
            const parent = CategoryRepo._findParent(requestedGroup, tipo, categoria.id) ||
                // An archived category may be edited to repair/display an old
                // record without making its archived parent a new choice.
                (CategoryRepo._isArchived(categoria) && CategoryRepo._findParent(requestedGroup, tipo, categoria.id, true));
            if (!parent) return CategoryRepo._fail('Escolha uma categoria principal ativa e compatível.');
            grupo = String(parent.grupo || parent.nome).trim();
            paiId = parent.id;
        }

        const antigo = categoria.nome;
        const eraPrincipal = oldLevel === 'principal';
        categoria.nome = nome;
        categoria.tipo = tipo;
        categoria.tipoCategoria = nivel;
        categoria.grupo = grupo;
        categoria.subgrupo = nome;
        categoria.paiId = paiId;
        if (data.icone) categoria.icone = data.icone;
        if (data.cor) categoria.cor = data.cor;
        if (Array.isArray(data.palavrasChave)) categoria.palavrasChave = [...new Set(data.palavrasChave
            .map(word => String(word).trim().toLocaleLowerCase('pt-BR')).filter(Boolean))];
        // ativo/arquivada/fixa are lifecycle/protection state, not editable form fields.
        if (eraPrincipal && antigo !== nome) db.categorias.forEach(c => { if (c !== categoria && c.grupo === antigo) c.grupo = nome; });
        if (antigo !== nome) CategoryRepo._references(antigo, nome);
        persist('categorias'); ['transacoes', 'orcamentos', 'agendamentos', 'receitasFuturas', 'assinaturas'].forEach(persist);
        return true;
    },
    archive: (id) => {
        CategoryRepo._lastError = '';
        const categoria = CategoryRepo._find(id);
        if (!categoria) return CategoryRepo._fail('Categoria não encontrada.');
        if (isCategoriaPadrao(categoria)) return CategoryRepo._fail('Categorias padrão não podem ser arquivadas.');
        const activeChildren = db.categorias.filter(c => c !== categoria &&
            (String(c.paiId || '') === String(id) || String(c.grupo || '') === String(categoria.nome)) && !CategoryRepo._isArchived(c));
        if (activeChildren.length) return CategoryRepo._fail('Arquive as subcategorias deste grupo antes de arquivar a categoria principal.');
        categoria.ativo = false; categoria.arquivada = true;
        persist('categorias'); return true;
    },
    restore: (id) => {
        CategoryRepo._lastError = '';
        const categoria = CategoryRepo._find(id);
        if (!categoria) return CategoryRepo._fail('Categoria não encontrada.');
        if (isCategoriaPadrao(categoria)) return CategoryRepo._fail('Categorias padrão não podem ser restauradas.');
        categoria.ativo = true; categoria.arquivada = false;
        persist('categorias'); return true;
    },
    remove: (id) => {
        CategoryRepo._lastError = '';
        const categoria = CategoryRepo._find(id);
        if (!categoria) return CategoryRepo._fail('Categoria não encontrada.');
        if (isCategoriaPadrao(categoria)) return CategoryRepo._fail('Categorias padrão não podem ser excluídas.');
        if (CategoryRepo.usage(id).count) return CategoryRepo._fail('Categoria possui referências; arquive-a para preservar o histórico.');
        db.categorias = db.categorias.filter(c => String(c.id) !== String(id));
        persist('categorias'); return true;
    }
};

export const ContactRepo = {
    add: (item) => {
        if (!item || !String(item.nome || '').trim() || db.contatos.some(contact => String(contact.id) === String(item.id))) return false;
        db.contatos.unshift({ ...item, nome: String(item.nome).trim() });
        persist('contatos'); return true;
    },
    update: (id, data) => {
        const index = db.contatos.findIndex(item => String(item.id) === String(id));
        if (index < 0 || !String(data?.nome || '').trim()) return false;
        const current = db.contatos[index];
        // Contact IDs are foreign keys on transactions and forecasts. Editing
        // the profile must never replace the ID or recreate its financial history.
        db.contatos[index] = { ...current, ...data, id: current.id, nome: String(data.nome).trim() };
        persist('contatos'); return true;
    },
    remove: (id) => { db.contatos = db.contatos.filter(i => i.id.toString() !== id.toString()); persist('contatos'); }
};

const saveContactAtomically = (id, data) => commitTransactionMutation(() => {
    const nome = String(data?.nome || '').trim();
    const email = String(data?.email || '').trim();
    if (!nome || !['pf', 'pj'].includes(data?.tipo || 'pf') || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Confira o nome, tipo e e-mail da pessoa.');
    const index = id ? db.contatos.findIndex(contact => String(contact.id) === String(id)) : -1;
    if (id && index < 0) throw new Error('Esta pessoa não existe mais.');
    const current = index >= 0 ? db.contatos[index] : null;
    const saved = { ...(current || {}), ...data, nome, email,
        id: current?.id ?? data.id ?? globalThis.crypto?.randomUUID?.() ?? `contato-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` };
    if (index >= 0) db.contatos[index] = saved;
    else {
        if (db.contatos.some(contact => String(contact.id) === String(saved.id))) throw new Error('Esta pessoa já está cadastrada.');
        db.contatos.unshift(saved);
    }
    return saved;
}, ['contatos']);

const recordInvoicePayment = ({ scheduleId, bankId, paymentDate, amount, operationId } = {}) => commitTransactionMutation(() => {
    const schedule = db.agendamentos.find(s => String(s.id) === String(scheduleId));
    const bank = db.bancos.find(b => String(b.id) === String(bankId));
    const txId = operationId || `invoice-payment-${encodeURIComponent(String(scheduleId))}`;
    const existing = db.transacoes.find(t => String(t.id) === String(txId));
    if (existing) {
        if (String(existing.invoicePaymentAgendamentoId) !== String(scheduleId) || String(existing.bancoId) !== String(bankId) || existing.data !== paymentDate || (amount != null && toCents(existing.valor) !== toCents(amount))) throw new Error('O identificador deste pagamento já foi utilizado com outros dados.');
        return { alreadyExists: true, transaction: existing };
    }
    if (!schedule || schedule.categoria !== 'Fatura Cartão' || schedule.status !== 'pendente' || !bank || !isValidInvoicePaymentDate(paymentDate)) throw new Error('Confira a fatura pendente, conta e data do pagamento.');
    const card = db.cartoes.find(c => String(c.id) === String(schedule.cartaoId));
    const paid = db.transacoes.filter(t => String(t.invoicePaymentAgendamentoId ?? '') === String(scheduleId)).reduce((sum, t) => sum + toCents(t.valor), 0);
    const total = toCents(schedule.valor);
    const remaining = Math.max(0, total - paid);
    const value = amount == null ? remaining : toCents(amount);
    if (value <= 0 || value > remaining) throw new Error('Informe um pagamento maior que zero e até o saldo devedor da fatura.');
    const transaction = buildInvoicePaymentTransaction({ schedule: { ...schedule, valor: fromCents(value) }, bankId: bank.id, paymentDate, transactionId: txId });
    transaction.invoiceReconciliationKey = card ? invoicePaymentKey(transaction, card, db.agendamentos) : null;
    db.transacoes.unshift(transaction);
    applyBalanceDelta(transaction, false, false);
    schedule.valorPago = fromCents(paid + value);
    schedule.saldoDevedor = fromCents(remaining - value);
    schedule.status = remaining === value ? 'pago' : 'pendente';
    schedule.bancoId = bank.id;
    schedule.dataPagamento = paymentDate;
    return { alreadyExists: false, transaction, remaining: schedule.saldoDevedor };
});

const financialMonthKey = (year, month) => {
    if (!Number.isInteger(year) || year < 1900 || year > 9999 || !Number.isInteger(month) || month < 0 || month > 11) throw new Error('Selecione um mês e ano válidos.');
    return `${year}-${String(month + 1).padStart(2, '0')}`;
};

// Closing is an auditable snapshot. The ledger remains editable until a future
// centrally enforced period-lock feature is implemented; lock:true is rejected.
const closeFinancialMonth = ({ year, month, lock = false } = {}) => commitTransactionMutation(() => {
    const period = financialMonthKey(year, month);
    if (lock) throw new Error('O bloqueio de lançamentos por mês ainda não está disponível. Use fechamento sem bloqueio.');
    if (!Array.isArray(db.fechamentosMes)) db.fechamentosMes = [];
    const index = db.fechamentosMes.findIndex(item => item.periodo === period);
    const current = db.fechamentosMes[index];
    if (current?.status === 'fechado') return current;
    const transactions = db.transacoes.filter(transaction => {
        const date = parseLocalDate(transaction.data);
        return date && date.getFullYear() === year && date.getMonth() === month;
    });
    const totals = calculatePeriodTotals(transactions);
    const capturedAt = new Date().toISOString();
    const bankBalance = (db.bancos || []).reduce((total, bank) => addMoney(total, bank.saldo), 0);
    const reserved = (db.reservas || []).reduce((total, reserve) => addMoney(total, reserve.saldo), 0);
    const pending = [
        ...(db.agendamentos || []).filter(item => !['pago', 'recebida', 'cancelado', 'cancelada'].includes(item.status)),
        ...(db.receitasFuturas || []).filter(item => !['pago', 'recebida', 'cancelado', 'cancelada'].includes(item.status))
    ].filter(item => String(item.dataVencimento || item.data || '').slice(0, 7) === period);
    const record = {
        id: `fechamento-${period}`, periodo: period, year, month, status: 'fechado', locked: false,
        fechadoEm: capturedAt, receitas: totals.income, despesas: totals.expense,
        resultado: addMoney(totals.income, -totals.expense), quantidadeLancamentos: transactions.length,
        pendencias: pending.length, transacoesIds: transactions.map(item => item.id),
        saldoBancario: bankBalance, saldoReservado: reserved, saldoDisponivel: addMoney(bankBalance, -reserved),
        // Account balances are captured at close time. They are not presented
        // as reconstructed historical month-end balances for previous periods.
        saldosReferencia: 'momento-do-fechamento', saldosCapturadosEm: capturedAt,
        contas: (db.bancos || []).map(bank => ({ id: bank.id, nome: bank.nome, saldo: fromCents(toCents(bank.saldo)) })),
        historico: current ? [...(current.historico || []), { fechadoEm: current.fechadoEm, reabertoEm: current.reabertoEm, receitas: current.receitas, despesas: current.despesas, resultado: current.resultado }] : []
    };
    if (index >= 0) db.fechamentosMes[index] = record;
    else db.fechamentosMes.unshift(record);
    return record;
}, ['fechamentosMes']);

const reopenFinancialMonth = ({ year, month } = {}) => commitTransactionMutation(() => {
    const period = financialMonthKey(year, month);
    const index = (db.fechamentosMes || []).findIndex(item => item.periodo === period);
    if (index < 0) throw new Error('Este mês ainda não possui fechamento.');
    const current = db.fechamentosMes[index];
    if (current.status === 'aberto') return current;
    const updated = { ...current, status: 'aberto', locked: false, reabertoEm: new Date().toISOString() };
    db.fechamentosMes[index] = updated;
    return updated;
}, ['fechamentosMes']);

export const NotificationRepo = {
    add: (item) => { db.notificacoes.unshift(item); persist('notificacoes'); return true; },
    remove: (id) => { db.notificacoes = db.notificacoes.filter(i => i.id.toString() !== id.toString()); persist('notificacoes'); },
    markRead: (id) => {
        const n = db.notificacoes.find(x => String(x.id) === String(id));
        if (n) { n.lida = true; persist('notificacoes'); }
    },
    markAllRead: () => { db.notificacoes.forEach(n => n.lida = true); persist('notificacoes'); },
    updateConfig: (key, value) => { db.configNotificacoes[key] = value; persist('configNotificacoes'); }
};

export const ScheduleRepo = {
    add: (item) => { db.agendamentos.unshift(item); persist('agendamentos'); return true; },
    update: (id, newData) => {
        const index = db.agendamentos.findIndex(a => a.id.toString() === id.toString());
        if (index !== -1) {
            db.agendamentos[index] = { ...db.agendamentos[index], ...newData };
            persist('agendamentos');
            return true;
        }
        return false;
    },
    remove: (id) => { db.agendamentos = db.agendamentos.filter(i => i.id.toString() !== id.toString()); persist('agendamentos'); }
};

const normalizedForecast = (item, collection = 'agendamentos') => {
    if (!item || typeof item !== 'object' || item.id == null || String(item.id) === '') throw new Error('Previsão inválida.');
    const desc = String(item.desc || '').trim();
    const date = String(item.dataVencimento || item.data || '');
    const tipo = item.tipo || (collection === 'receitasFuturas' ? 'receita' : 'despesa');
    const value = Number(item.valor);
    if (!desc || !Number.isFinite(value) || toCents(value) <= 0 || !isValidTransferDate(date) || !['receita', 'despesa'].includes(tipo)) {
        throw new Error('Informe descrição, valor, tipo e vencimento válidos.');
    }
    const bank = item.bancoId == null || item.bancoId === '' ? null : db.bancos.find(account => String(account.id) === String(item.bancoId));
    const contact = item.contatoId == null || item.contatoId === '' ? null : db.contatos.find(person => String(person.id) === String(item.contatoId));
    if (item.bancoId != null && item.bancoId !== '' && !bank) throw new Error('A conta selecionada não existe mais.');
    if (item.contatoId != null && item.contatoId !== '' && !contact) throw new Error('A pessoa selecionada não existe mais.');
    return { ...item, desc, valor: fromCents(toCents(value)), tipo, bancoId: bank?.id ?? null,
        contatoId: contact?.id ?? null, dataVencimento: date,
        ...(collection === 'receitasFuturas' ? { data: date } : {}) };
};

// Schedule creation and settlement use the same mutation queue as the ledger.
// One failed write rolls back the complete series, or the balance and its status.
const addSchedulesAtomically = items => commitTransactionMutation(() => {
    if (!Array.isArray(items) || !items.length || items.length > 120) throw new Error('Informe de 1 a 120 ocorrências.');
    const rows = items.map(item => normalizedForecast(item));
    const ids = new Set(db.agendamentos.map(item => String(item.id)));
    rows.forEach(row => {
        if (ids.has(String(row.id))) throw new Error('Esta previsão já está cadastrada.');
        ids.add(String(row.id));
    });
    db.agendamentos = [...rows, ...db.agendamentos];
    return rows;
}, ['agendamentos']);

const saveForecastAtomically = (id, collection, data) => commitTransactionMutation(() => {
    if (!['agendamentos', 'receitasFuturas'].includes(collection)) throw new Error('Origem da previsão inválida.');
    const index = db[collection].findIndex(item => String(item.id) === String(id));
    if (index < 0) throw new Error('Esta previsão não existe mais.');
    const current = db[collection][index];
    if (['pago', 'recebida'].includes(current.status)) throw new Error('Esta previsão já foi realizada. Edite o lançamento no histórico.');
    if (current.categoria === 'Fatura Cartão') throw new Error('Use o fluxo de fatura para alterar este compromisso.');
    const nextCollection = collection === 'receitasFuturas' && data.tipo === 'despesa' ? 'agendamentos' : collection;
    const updated = normalizedForecast({ ...current, ...data, id: current.id, status: current.status || (collection === 'receitasFuturas' ? 'prevista' : 'pendente') }, nextCollection);
    if (nextCollection !== collection) {
        if (db[nextCollection].some(item => String(item.id) === String(id))) throw new Error('Já existe uma previsão com este identificador.');
        db[collection].splice(index, 1);
        updated.status = 'pendente';
        db[nextCollection].unshift(updated);
    } else db[collection][index] = updated;
    return { schedule: updated, collection: nextCollection };
}, ['agendamentos', 'receitasFuturas']);

const settleScheduleAtomically = (id, options = {}) => commitTransactionMutation(() => {
    const collection = options.collection || 'agendamentos';
    if (!['agendamentos', 'receitasFuturas'].includes(collection)) throw new Error('Origem da previsão inválida.');
    const index = db[collection].findIndex(item => String(item.id) === String(id));
    if (index < 0) throw new Error('Esta previsão não existe mais.');
    const current = db[collection][index];
    if (current.categoria === 'Fatura Cartão' || current.pagamentoFaturaAutomatico) throw new Error('Use o pagamento de fatura para este compromisso.');
    const reference = collection === 'receitasFuturas' ? 'receitaFuturaId' : 'agendamentoId';
    const existing = db.transacoes.find(transaction => String(transaction[reference] ?? '') === String(id));
    if (existing) return { transaction: existing, schedule: current, alreadySettled: true };
    if (['pago', 'recebida'].includes(current.status)) throw new Error('Esta previsão já foi realizada. Consulte o histórico antes de lançar novamente.');
    if (['cancelado', 'cancelada'].includes(current.status)) throw new Error('Esta previsão está cancelada.');
    const bank = db.bancos.find(account => String(account.id) === String(options.bankId ?? current.bancoId ?? ''));
    if (!bank) throw new Error('Selecione uma conta válida antes de realizar a previsão.');
    const now = new Date();
    const date = options.date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (!isValidTransferDate(date)) throw new Error('Informe uma data de realização válida.');
    const normalized = normalizedForecast({ ...current, bancoId: bank.id }, collection);
    const transaction = {
        id: `agenda-${collection}-${String(current.id)}`,
        [reference]: current.id, desc: normalized.desc, valor: normalized.valor,
        tipo: collection === 'receitasFuturas' ? 'receita' : normalized.tipo,
        categoria: normalized.categoria || 'Outros', bancoId: bank.id, contatoId: normalized.contatoId,
        isCartao: false, formaPagamento: collection === 'receitasFuturas' ? 'Receita futura recebida' : 'Automático (Agendamento)',
        data: date, parcelaAtual: current.parcelaAtual || 1, totalParcelas: current.totalParcelas || 1,
        recorrente: current.recorrente === true, grupoId: current.grupoId || null,
        codigoRef: `AGENDA-${String(current.id)}`
    };
    if (db.transacoes.some(item => String(item.id) === transaction.id)) throw new Error('O identificador desta realização já existe no histórico.');
    db.transacoes.unshift(transaction);
    applyBalanceDelta(transaction, false, false);
    const schedule = { ...current, bancoId: bank.id, status: collection === 'receitasFuturas' ? 'recebida' : 'pago', transacaoId: transaction.id, dataRealizacao: date };
    db[collection][index] = schedule;
    return { transaction, schedule, alreadySettled: false };
}, ['transacoes', 'bancos', 'agendamentos', 'receitasFuturas']);

export const FutureIncomeRepo = {
    add: (item) => { db.receitasFuturas.unshift({ ...item, status: item.status || 'prevista' }); persist('receitasFuturas'); return true; },
    update: (id, data) => {
        const index = db.receitasFuturas.findIndex(i => String(i.id) === String(id));
        if (index < 0) return false;
        db.receitasFuturas[index] = { ...db.receitasFuturas[index], ...data };
        persist('receitasFuturas'); return true;
    },
    remove: (id) => { db.receitasFuturas = db.receitasFuturas.filter(i => String(i.id) !== String(id)); persist('receitasFuturas'); return true; }
};

export const SubscriptionRepo = {
    add: (item) => { db.assinaturas.unshift({ ...item, ativa: item.ativa !== false }); persist('assinaturas'); return true; },
    update: (id, data) => {
        const index = db.assinaturas.findIndex(i => String(i.id) === String(id));
        if (index < 0) return false;
        db.assinaturas[index] = { ...db.assinaturas[index], ...data };
        persist('assinaturas'); return true;
    },
    remove: (id) => { db.assinaturas = db.assinaturas.filter(i => String(i.id) !== String(id)); persist('assinaturas'); return true; }
};

export const InvestmentRepo = {
    add: (item) => { db.investimentos.unshift(item); persist('investimentos'); return true; },
    update: (id, data) => {
        const index = db.investimentos.findIndex(i => String(i.id) === String(id));
        if (index < 0) return false;
        db.investimentos[index] = { ...db.investimentos[index], ...data };
        persist('investimentos'); return true;
    },
    remove: (id) => { db.investimentos = db.investimentos.filter(i => String(i.id) !== String(id)); persist('investimentos'); return true; }
};

export const BankConferenceRepo = {
    save: ({ bankId, period, asOf, reference, source }) => commitTransactionMutation(() => {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period || '') || !isValidInvoicePaymentDate(asOf) || !String(source || '').trim() || reference === '' || reference == null || !Number.isFinite(Number(reference))) throw new Error('Informe período, data, saldo de referência e sua origem.');
        const bank = db.bancos.find(b => String(b.id) === String(bankId));
        const today = new Date().toLocaleDateString('en-CA');
        if (!bank || asOf > today || !asOf.startsWith(period)) throw new Error('Escolha uma conta e uma data válida dentro do período, até hoje.');
        const id = `bank:${bankId}:${period}`;
        const index = db.conferencias.findIndex(r => r.id === id);
        const current = db.conferencias[index];
        const referenceChanged = current && (current.reference !== fromCents(toCents(reference)) || current.asOf !== asOf || current.source !== String(source).trim());
        const record = { ...current, id, bankId: bank.id, period, asOf, reference: fromCents(toCents(reference)), source: String(source).trim(), sourceType: 'manual', confirmedAt: null, updatedAt: new Date().toISOString(), decisions: referenceChanged ? {} : current?.decisions || {} };
        if (index >= 0) db.conferencias[index] = record; else db.conferencias.unshift(record);
        return record;
    }, ['conferencias']),
    decide: ({ id, transactionId, status, reason = '', referenceId = null }) => commitTransactionMutation(() => {
        const record = db.conferencias.find(r => r.id === id);
        const tx = db.transacoes.find(t => String(t.id) === String(transactionId));
        if (!record || !tx || tx.isCartao || String(tx.bancoId) !== String(record.bankId) || !tx.data?.startsWith(record.period) || tx.data > record.asOf) throw new Error('Referência ou lançamento inválido.');
        if (!['conferido', 'divergente', 'ignorado', 'nao-conferido'].includes(status) || (status === 'ignorado' && !reason.trim())) throw new Error('Informe uma justificativa para ignorar.');
        const linkedReference = status === 'conferido' ? validateReferenceLink(record, tx, referenceId, record.decisions) : null;
        record.decisions = { ...record.decisions, [String(tx.id)]: { status, referenceId: linkedReference, reason: reason.trim(), fingerprint: transactionFingerprint(tx), at: new Date().toISOString() } };
        record.confirmedAt = null;
        return true;
    }, ['conferencias']),
    complete: (id, confirmEmpty = false) => commitTransactionMutation(() => {
        const record = db.conferencias.find(r => r.id === id);
        const bank = db.bancos.find(b => String(b.id) === String(record?.bankId));
        if (!record || !bank) throw new Error('Salve uma referência antes de concluir.');
        const balance = bankBalanceAtDate(db, bank, record.asOf, new Date().toLocaleDateString('en-CA'));
        if (balance === null || toCents(balance) !== toCents(record.reference)) throw new Error('Resolva a diferença do saldo antes de concluir.');
        const items = db.transacoes.filter(t => !t.isCartao && String(t.bancoId) === String(bank.id) && t.data?.startsWith(record.period) && t.data <= record.asOf);
        if (pendingReferenceRows(record, record.decisions).length) throw new Error('Há linhas da referência ainda sem correspondência.');
        if ((!items.length && !confirmEmpty) || items.some(t => !['conferido','ignorado'].includes(record.decisions?.[String(t.id)]?.status) || record.decisions[String(t.id)].fingerprint !== transactionFingerprint(t))) throw new Error('Confira os lançamentos pendentes antes de concluir.');
        record.confirmedAt = new Date().toISOString();
        record.confirmedFingerprint = bankConferenceFingerprint(items, balance, record.reference, record.asOf);
        return true;
    }, ['conferencias'])
};

const updateConferenceReference = ({ recordId, cardId, year, month, rows, ignoreId, reason, fileName }) => commitTransactionMutation(() => {
    const record = recordId ? db.conferencias.find(r => r.id === recordId) : ReconciliationRepo.get(cardId, year, month);
    if (!record) throw new Error('Salve a referência antes de anexar ou revisar um extrato.');
    if (rows) {
        if (!Array.isArray(rows) || !rows.length || rows.length > 20000 || rows.some(r => !isValidInvoicePaymentDate(r.data) || !Number.isFinite(Number(r.valor)) || toCents(r.valor) <= 0 || !['receita','despesa'].includes(r.tipo))) throw new Error('O arquivo contém linhas inválidas. Revise datas, valores e direção.');
        const originalCount = rows.length;
        if (recordId) rows = rows.filter(r => r.data.startsWith(record.period) && r.data <= record.asOf);
        else {
            const card = db.cartoes.find(c => String(c.id) === String(cardId));
            if (!card) throw new Error('Cartão não encontrado.');
            const { start, end } = getInvoicePeriod(card, year, month);
            rows = rows.filter(r => { const d = new Date(`${r.data}T12:00:00`); return d >= start && d <= end; });
        }
        if (!rows.length) throw new Error('O arquivo não contém lançamentos no período desta conferência.');
        record.referenceFile = { name: String(fileName || '').slice(0, 120), at: new Date().toISOString(), outsidePeriod: originalCount - rows.length };
        record.referenceRows = rows.map((r,index) => ({ id: `reference-${index + 1}`, data: r.data, valor: fromCents(toCents(r.valor)), tipo: r.tipo, desc: String(r.desc || ''), identificador: String(r.identificador || '') }));
        record.ignoredReferences = {};
        record.decisions = {};
        record.verificacoes = {};
    } else {
        if (!record.referenceRows?.some(r => r.id === ignoreId) || !String(reason || '').trim()) throw new Error('Informe uma justificativa para ignorar a linha da referência.');
        record.ignoredReferences = { ...record.ignoredReferences, [ignoreId]: { reason: reason.trim(), at: new Date().toISOString() } };
    }
    record.confirmedAt = null;
    return true;
}, ['conferencias', 'conciliacoesFaturas']);

// Adapt the remaining synchronous validators/mutators to the same durable
// boundary. UI callers must await them; a rejected commit never reports success.
const durableLegacy = (repo, methods) => methods.forEach(method => {
    const mutate = repo[method];
    repo[method] = (...args) => commitTransactionMutation(() => {
        capturingLegacyMutation = true;
        try {
            const result = mutate(...args);
            return result === false ? NO_TRANSACTION_MUTATION : (result ?? true);
        } finally { capturingLegacyMutation = false; }
    }, collections);
});
durableLegacy(UserRepo, ['update']);
durableLegacy(MentoriaRepo, ['saveSnapshot']);
durableLegacy(BankRepo, ['add', 'remove']);
durableLegacy(CardRepo, ['add', 'remove']);
durableLegacy(ReconciliationRepo, ['saveAmount', 'saveAdjustment', 'deleteAdjustment']);
durableLegacy(GoalRepo, ['add', 'remove']);
durableLegacy(BudgetRepo, ['add', 'remove', 'updateLimit']);
durableLegacy(CategoryRepo, ['add', 'rename', 'update', 'archive', 'restore', 'remove']);
durableLegacy(ContactRepo, ['add', 'update', 'remove']);
durableLegacy(NotificationRepo, ['add', 'remove', 'markRead', 'markAllRead', 'updateConfig']);
durableLegacy(ScheduleRepo, ['add', 'update', 'remove']);
durableLegacy(FutureIncomeRepo, ['add', 'update', 'remove']);
durableLegacy(SubscriptionRepo, ['add', 'update', 'remove']);
durableLegacy(InvestmentRepo, ['add', 'update', 'remove']);

export const Database = {
    recordInvoicePayment,
    updateConferenceReference,
    updateCard: CardRepo.update,
    getTransacoesPorMes: TransactionsRepo.getByMonth,
    getComprasCartaoPorMes: TransactionsRepo.getCardExpensesByMonth,
    save: persist,
    getLastUpdated: () => db.metadados?.ultimaAtualizacao || null,
    auditIntegrity: (options = {}) => auditDatabase(db, options),
    reconcileBalances: () => reconcileBalances(db),
    getSchemaVersion: () => Number(db.metadados?.schemaVersion || 0),
    replaceAll: (data, options = {}) => enqueueTransactionMutation(async () => {
        if (!data || typeof data !== 'object') throw new Error('Backup inválido');

        const exact = options?.mode === 'exact';
        const source = exact
            ? Object.fromEntries(collections.map(col => [col, hasOwn(data, col) ? data[col] : cloneCollectionForRollback(initialDB[col])]))
            : data;
        // Validate the raw shape before migrations fill missing collections;
        // malformed restore payloads must fail without mutating live data.
        for (const col of (exact ? collections : collections.filter(name => hasOwn(source, name)))) {
            if (Array.isArray(initialDB[col]) && hasOwn(source, col) && !Array.isArray(source[col])) {
                throw new Error(`Coleção inválida: ${col}`);
            }
            if (!Array.isArray(initialDB[col]) && hasOwn(source, col) && (typeof source[col] !== 'object' || source[col] === null || Array.isArray(source[col]))) {
                throw new Error(`Registro inválido: ${col}`);
            }
        }
        const migrated = migrateDatabaseSnapshot(source, { defaults: initialDB });
        const normalizedSource = migrated.database;
        // Non-exact restores are patches: omitted collections must retain their
        // current values instead of being replaced by migration defaults.
        const replaceCollections = exact ? collections : collections.filter(col => hasOwn(data, col));

        for (const col of replaceCollections) {
            if (Array.isArray(initialDB[col])) {
                if (!Array.isArray(normalizedSource[col])) throw new Error(`Coleção inválida: ${col}`);
            } else if (typeof normalizedSource[col] !== 'object' || normalizedSource[col] === null || Array.isArray(normalizedSource[col])) {
                throw new Error(`Registro inválido: ${col}`);
            }
        }

        const snapshot = Object.fromEntries(collections.map(col => [
            col,
            Array.isArray(db[col]) ? db[col].map(item => item && typeof item === 'object' ? { ...item } : item)
                : (db[col] && typeof db[col] === 'object' ? { ...db[col] } : db[col])
        ]));
        try {
            for (const col of replaceCollections) {
                db[col] = Array.isArray(initialDB[col])
                    ? normalizedSource[col].map(item => item && typeof item === 'object' ? { ...item } : item)
                    : { ...normalizedSource[col] };
            }

            if (hasOwn(data, 'metas') && !hasOwn(data, 'reservas')) {
                // Legacy backups may not include the reserve collection. Rebuild
                // the virtual reserve from goal progress, but preserve bank balances:
                // an old backup cannot prove whether they were reconciled later.
                db.reservas = db.metas.map(meta => ({
                    id: meta.reservaId || `reserva-meta-${String(meta.id)}`,
                    goalId: meta.id,
                    nome: `Reserva: ${meta.nome || 'Meta'}`,
                    saldo: fromCents(toCents(meta.atual))
                }));
            }

            if (Array.isArray(db.metas)) {
                const existingReserves = Array.isArray(db.reservas) ? db.reservas : [];
                const unlinkedReserves = existingReserves.filter(reserve => reserve.goalId == null);
                const goalReserves = [];
                db.metas = db.metas.map(meta => {
                    const fallbackId = meta.reservaId || `reserva-meta-${String(meta.id)}`;
                    let reserve = existingReserves.find(item => String(item.id) === String(fallbackId))
                        || existingReserves.find(item => String(item.goalId) === String(meta.id));
                    if (!reserve) {
                        reserve = { id: fallbackId, goalId: meta.id, nome: `Reserva: ${meta.nome || 'Meta'}`, saldo: fromCents(toCents(meta.atual)), movimentos: [] };
                    }
                    reserve.id = reserve.id || fallbackId;
                    reserve.goalId = meta.id;
                    reserve.nome = reserve.nome || `Reserva: ${meta.nome || 'Meta'}`;
                    reserve.saldo = fromCents(toCents(reserve.saldo));
                    if (!Array.isArray(reserve.movimentos)) reserve.movimentos = [];
                    goalReserves.push(reserve);
                    return { ...meta, reservaId: reserve.id, atual: reserve.saldo };
                });
                const linkedReserveObjects = new Set(goalReserves);
                db.reservas = [...goalReserves, ...unlinkedReserves.filter(reserve => !linkedReserveObjects.has(reserve))];
            }
            tagLegacyGoalReserveTransfers();

            db.metadados = { ...(db.metadados || {}), ultimaAtualizacao: new Date().toISOString() };
            await IDB.setMany(collections.map(col => [col, db[col]]));
            clearCache();
            revisionChannel?.postMessage(persistedRevision);
    if (typeof document !== 'undefined') document.dispatchEvent(new Event('db-updated'));
            return true;
        } catch (error) {
            collections.forEach(col => { db[col] = snapshot[col]; });
            clearCache();
            throw error;
        }
    }),
    clearAll: () => enqueueTransactionMutation(async () => {
        const snapshot = Object.fromEntries(collections.map(col => [col, cloneCollectionForRollback(db[col])]));
        try {
            // Replacing every collection in one commit is atomic; never clear first.
            collections.forEach(col => {
                db[col] = cloneCollectionForRollback(initialDB[col]);
            });
            db.metadados = { ultimaAtualizacao: new Date().toISOString() };
            await IDB.setMany(collections.map(col => [col, db[col]]), persistedRevision, true);
            if (typeof localStorage !== 'undefined') collections.forEach(col => localStorage.removeItem(DB_PREFIX + col));
            clearCache();
            revisionChannel?.postMessage(persistedRevision);
    if (typeof document !== 'undefined') document.dispatchEvent(new Event('db-updated'));
            return true;
        } catch (error) {
            collections.forEach(col => { db[col] = snapshot[col]; });

            clearCache();
            throw error;
        }
    }),
    saveMentoriaSnapshot: MentoriaRepo.saveSnapshot,
    add: (col, item) => {
        switch(col) {
            case 'categorias': return CategoryRepo.add(item);
            case 'transacoes': return TransactionsRepo.add(item);
            case 'bancos': return BankRepo.add(item);
            case 'cartoes': return CardRepo.add(item);
            case 'metas': return GoalRepo.add(item);
            case 'receitasFuturas': return FutureIncomeRepo.add(item);
            case 'assinaturas': return SubscriptionRepo.add(item);
            case 'investimentos': return InvestmentRepo.add(item);
            case 'orcamentos': return BudgetRepo.add(item);
            case 'notificacoes': return NotificationRepo.add(item);
            case 'contatos': return ContactRepo.add(item);
            case 'agendamentos': return ScheduleRepo.add(item);
        }
        return false;
    },
    addRecorrente: TransactionsRepo.addRecurrent,
    addRecurringTransactionAtomically,
    addSchedulesAtomically,
    saveForecastAtomically,
    settleScheduleAtomically,
    saveContactAtomically,
    closeFinancialMonth,
    reopenFinancialMonth,
    addTransactionsAtomically: TransactionsRepo.addMany,
    remove: (col, id) => {
        switch(col) {
            case 'transacoes': case 'comprasCartao': return TransactionsRepo.delete(id);
            case 'categorias': return CategoryRepo.remove(id);
            case 'bancos': return BankRepo.remove(id);
            case 'cartoes': return CardRepo.remove(id);
            case 'metas': return GoalRepo.remove(id);
            case 'orcamentos': return BudgetRepo.remove(id);
            case 'notificacoes': return NotificationRepo.remove(id);
            case 'contatos': return ContactRepo.remove(id);
            case 'agendamentos': return ScheduleRepo.remove(id);
            case 'receitasFuturas': return FutureIncomeRepo.remove(id);
            case 'assinaturas': return SubscriptionRepo.remove(id);
            case 'investimentos': return InvestmentRepo.remove(id);
        }
    },
    removeMultiple: (col, ids, options) => {
        if (col === 'transacoes') return TransactionsRepo.deleteMultiple(ids, options);
    },
    addTransfer: TransferRepo.add,
    restoreTransactions: TransferRepo.restoreMany,
    updateTransaction: TransactionsRepo.update,
    updateTransactionCategories: TransactionsRepo.updateCategories,
    updateAgendamento: ScheduleRepo.update,
    updateReceitaFutura: FutureIncomeRepo.update,
    updateContact: ContactRepo.update,
    addCardExpense: TransactionsRepo.addCardExpense,
    updateConfig: NotificationRepo.updateConfig,
    updateBudget: BudgetRepo.updateLimit,
    renameCategory: CategoryRepo.rename,
    updateCategory: CategoryRepo.update,
    archiveCategory: CategoryRepo.archive,
    restoreCategory: CategoryRepo.restore,
    getCategoryUsage: CategoryRepo.usage,
    getCategoryError: CategoryRepo.getLastError,
    depositGoal: GoalRepo.deposit,
    releaseGoal: GoalRepo.release,
    updateUser: UserRepo.update,
    markNotificationRead: NotificationRepo.markRead,
    markAllNotificationsRead: NotificationRepo.markAllRead,
    getTotals: () => {
        const totals = calculatePeriodTotals(db.transacoes);
        const saldoBancario = db.bancos.reduce((total, bank) => addMoney(total, bank.saldo), 0);
        const saldoReservado = (db.reservas || []).reduce((total, reserve) => addMoney(total, reserve.saldo), 0);
        const saldoDisponivel = addMoney(saldoBancario, -saldoReservado);
        return {
            receitas: totals.income,
            despesas: totals.expense,
            saldo: saldoBancario,
            saldoBancario,
            saldoDisponivel,
            saldoReservado,
            // A reservation is a subset of bank cash, not an additional asset.
            saldoTotal: saldoBancario
        };
    }
};
