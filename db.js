import { CATEGORIAS_PADRAO, getCategoriaIcon, isCategoriaPadrao } from './categorias-padrao.js';
import { calculateReconciliation, invoiceReconciliationKey, listInvoiceTransactions, normalizeAdjustment } from './reconciliation.js';
import { calculatePeriodTotals, isIncome, isInvoicePayment, isTransfer } from './financial-ledger.js';
import { addMoney, fromCents, splitInstallments, toCents } from './money-math.js';
import { createTransfer, isValidTransferDate } from './financial-transfers.js';
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
    metas: [],
    reservas: [],
    orcamentos: [],
    notificacoes: [],
    agendamentos: [], 
    categorias: CATEGORIAS_PADRAO,
    configNotificacoes: {
        contasAtivo: true, contasDias: 3,
        orcamentoAtivo: true, orcamentoPct: 80,
        metasAtivo: true
    },
    contatos: [],
    historicoMentoria: [],
    receitasFuturas: [],
    assinaturas: [],
    investimentos: [],
    // Persisted write timestamp; null means freshness is not trustworthy yet.
    metadados: { ultimaAtualizacao: null }
};

export let db = {};
export const collections = Object.keys(initialDB);

let Cache = {
    transacoesPorMes: null
};

const IDB_NAME = 'NuvoraDB';
const IDB_STORE = 'keyval';
const IDB_VERSION = 1;

const IDB = {
    _db: null,
    _memoryStore: {}, 
    init: () => new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') return resolve(); 
        if (IDB._db) return resolve();
        
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = (e) => {
            if (!e.target.result.objectStoreNames.contains(IDB_STORE)) {
                e.target.result.createObjectStore(IDB_STORE);
            }
        };
        req.onsuccess = (e) => {
            IDB._db = e.target.result;
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
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    }),
    setMany: entries => new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            try {
                const nextStore = { ...IDB._memoryStore };
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
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Falha ao salvar transferência.'));
        tx.onabort = () => reject(tx.error || new Error('Transação interrompida ao salvar transferência.'));
        try {
            entries.forEach(([key, value]) => store.put(value, key));
        } catch (error) {
            try { tx.abort(); } catch (_) {}
            reject(error);
        }
    })
};

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

const clearCache = () => {
    Cache.transacoesPorMes = null;
};

const buildMonthlyCache = () => {
    Cache.transacoesPorMes = {};
    db.transacoes.forEach(t => {
        const dt = new Date(t.data || t.id);
        const key = `${dt.getFullYear()}-${dt.getMonth()}`;
        if (!Cache.transacoesPorMes[key]) Cache.transacoesPorMes[key] = [];
        Cache.transacoesPorMes[key].push(t);
    });
};

const loadData = async () => {
    await IDB.init();

    for (const col of collections) {
        let data = await IDB.get(col);

        if (!data) {
            let stored = null;
            if (typeof localStorage !== 'undefined') {
                stored = localStorage.getItem(DB_PREFIX + col);
            }

            if (stored) {
                try {
                    data = JSON.parse(stored);
                    await IDB.set(col, data); 
                    if (typeof localStorage !== 'undefined') localStorage.removeItem(DB_PREFIX + col); 
                } catch (error) {
                    data = initialDB[col];
                    await IDB.set(col, data); 
                }
            } else {
                data = initialDB[col];
                await IDB.set(col, data); 
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

    let goalsChanged = false;
    let reservesChanged = false;
    db.metas.forEach(meta => {
        const fallbackReserveId = meta.reservaId || `reserva-meta-${String(meta.id)}`;
        let reserve = db.reservas.find(item => String(item.id) === String(fallbackReserveId))
            || db.reservas.find(item => String(item.goalId) === String(meta.id));
        const reserveId = reserve?.id || fallbackReserveId;
        if (meta.reservaId !== reserveId) { meta.reservaId = reserveId; goalsChanged = true; }
        if (!reserve) {
            reserve = { id: reserveId, goalId: meta.id, nome: `Reserva: ${meta.nome || 'Meta'}`, saldo: fromCents(toCents(meta.atual)) };
            db.reservas.push(reserve);
            reservesChanged = true;
        } else {"}...commentary -------------- code 424? Let's invoke properly. We must edit existing? Code displays entry. Need tool call. I have syntax weird. Let's actually call. Earlier commentary above is analysis internal? It looks tool? no tag. Need use. I notice meta variable currently after using `meta.reservaId` fallback but no ID reserve. Let's patch. Wait tool call was malformed due my content not namespace. We'll call now. Option: no need. But it'd robust. Do it.*** UNKNOWN? We need only tool calls as assistant. Continue.*** Hmm as the current assistant context, tool namespace available but commentary tag syntax. Let's resume with valid. Ensure no stray message inadvertently.*** We need produce commentary invocation. We'll make call. (Analysis content only.)*** I apparently wrote 
            if (String(reserve.goalId) !== String(meta.id)) { reserve.goalId = meta.id; reservesChanged = true; }
            if (!reserve.nome) { reserve.nome = `Reserva: ${meta.nome || 'Meta'}`; reservesChanged = true; }
            const normalizedBalance = fromCents(toCents(reserve.saldo));
            if (reserve.saldo !== normalizedBalance) { reserve.saldo = normalizedBalance; reservesChanged = true; }
        }
        const reserveBalance = fromCents(toCents(reserve.saldo));
        if (toCents(meta.atual) !== toCents(reserveBalance)) { meta.atual = reserveBalance; goalsChanged = true; }
    });
    if (goalsChanged || reservesChanged) {
        await IDB.setMany([['metas', db.metas], ['reservas', db.reservas]]);
    }

    if (db.categorias.length === 0) {
        db.categorias = CATEGORIAS_PADRAO.map(c => ({ ...c }));
        await IDB.set('categorias', db.categorias);
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
        await IDB.set('categorias', db.categorias);
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
                db.transacoes.sort((a,b) => new Date(b.data) - new Date(a.data));
                IDB.set('transacoes', db.transacoes).catch(console.error);
            }
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(DB_PREFIX + 'comprasCartao');
            }
        } catch(e) {
            console.error('Erro na normalização de cartões:', e);
        }
    }
};

await loadData();

// Migra o caminho antigo do avatar para o asset atual.
if (db.usuario && db.usuario.fotoUrl === 'assets/perfil.png') {
    db.usuario.fotoUrl = 'assets/perfil.svg';
    IDB.set('usuario', db.usuario).catch(console.error);
}

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

const persist = (col) => {
    // This timestamp is written only from mutation paths, never from render.
    // It therefore remains a trustworthy freshness signal across reloads.
    db.metadados = { ...(db.metadados || {}), ultimaAtualizacao: new Date().toISOString() };
    IDB.set('metadados', db.metadados).catch(console.error);
    if (col && db[col] !== undefined) {
        IDB.set(col, db[col]).catch(console.error);
    } else {
        collections.forEach(c => IDB.set(c, db[c]).catch(console.error));
    }
    clearCache();
    if (typeof document !== 'undefined') {
        document.dispatchEvent(new Event('db-updated'));
    }
};

const persistAtomically = async cols => {
    const uniqueCols = [...new Set([...(cols || []), 'metadados'])];
    const previousMetadata = db.metadados;
    db.metadados = { ...(db.metadados || {}), ultimaAtualizacao: new Date().toISOString() };
    try {
        await IDB.setMany(uniqueCols.filter(col => db[col] !== undefined).map(col => [col, db[col]]));
    } catch (error) {
        db.metadados = previousMetadata;
        throw error;
    }
    clearCache();
    if (typeof document !== 'undefined') document.dispatchEvent(new Event('db-updated'));
};

const transferStateSnapshot = () => ({
    transacoes: db.transacoes.map(item => ({ ...item })),
    bancos: db.bancos.map(item => ({ ...item })),
    reservas: (db.reservas || []).map(item => ({ ...item })),
    metas: db.metas.map(item => ({ ...item })),
    metadados: { ...(db.metadados || {}) }
});

const restoreTransferState = snapshot => {
    db.transacoes = snapshot.transacoes;
    db.bancos = snapshot.bancos;
    db.reservas = snapshot.reservas;
    db.metas = snapshot.metas;
    db.metadados = snapshot.metadados;
    clearCache();
};

const applyBalanceDelta = (t, isReverse = false, shouldPersist = true) => {
    // A confirmed statement balance is an absolute anchor that already includes
    // these imported ledger rows. Keep their history without applying them twice.
    if (t.isCartao || t.saldoIncluidoNoSaldoDoExtrato === true) return;
    const bank = db.bancos.find(account => String(account.id) === String(t.bancoId));
    const reserve = (db.reservas || []).find(account => String(account.id) === String(t.bancoId));
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

const TRANSFER_PERSIST_COLLECTIONS = ['transacoes', 'bancos', 'reservas', 'metas'];

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
    add: async ({ sourceAccountId, destinationAccountId, amount, date, description, goalId = null } = {}) => {
        const source = resolveTransferAccount(sourceAccountId);
        const destination = resolveTransferAccount(destinationAccountId);
        if ((!source.bank && !source.reserve) || (!destination.bank && !destination.reserve)) {
            throw new Error('A conta de origem ou destino não existe.');
        }
        if ((source.bank && source.reserve) || (destination.bank && destination.reserve)) {
            throw new Error('Identificador de conta ambíguo para transferência.');
        }
        if (source.reserve && goalId != null) throw new Error('A origem do aporte deve ser uma conta bancária.');
        if (goalId != null && (!source.bank || !destination.reserve || String(destination.reserve.goalId) !== String(goalId) || !db.metas.some(item => String(item.id) === String(goalId)))) {
            throw new Error('A reserva não pertence à meta selecionada.');
        }

        const legs = createTransfer({ sourceAccountId, destinationAccountId, amount, date, description });
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
            await persistAtomically(TRANSFER_PERSIST_COLLECTIONS);
            return { ok: true, transferId: legs[0].transferenciaId, transactions: legs };
        } catch (error) {
            restoreTransferState(snapshot);
            throw error;
        }
    },

    update: async (transactionId, newData = {}) => {
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
            await persistAtomically(TRANSFER_PERSIST_COLLECTIONS);
            return true;
        } catch (error) {
            restoreTransferState(snapshot);
            throw error;
        }
    },

    deleteByIds: async ids => {
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
            await persistAtomically(TRANSFER_PERSIST_COLLECTIONS);
            return removed;
        } catch (error) {
            restoreTransferState(snapshot);
            throw error;
        }
    },

    restoreMany: async items => {
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
            await persistAtomically(TRANSFER_PERSIST_COLLECTIONS);
            return candidates.length;
        } catch (error) {
            restoreTransferState(snapshot);
            throw error;
        }
    }
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
        const novoBanco = {
            ...item,
            saldo: fromCents(toCents(item.saldo)),
            dataCriacao: item.dataCriacao || new Date().toISOString().split('T')[0]
        };
        db.bancos.unshift(novoBanco); 
        persist('bancos'); 
        return true; 
    },
    remove: (id) => { 
        const hasTransactions = db.transacoes.some(t => !t.isCartao && String(t.bancoId) === String(id));
        const hasCards = db.cartoes.some(c => String(c.bancoId) === String(id));
        if (hasTransactions || hasCards) return false;
        db.bancos = db.bancos.filter(i => i.id.toString() !== id.toString()); 
        persist('bancos'); 
        return true;
    },
    recalculateAll: () => {}
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
    
    add: (item) => {
        if (item?.transferenciaId || isUnpairedTransfer(item)) return false;
        const t = { ...item };
        if (!t.codigoRef) t.codigoRef = `TX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        db.transacoes.unshift(t);
        applyBalanceDelta(t);
        persist('transacoes');
        return true;
    },
    
    addRecurrent: (t, parcelas) => {
        if (t?.transferenciaId || isTransfer(t)) return false;
        const dataOriginal = new Date(t.data + 'T12:00:00');
        const diaOriginal = dataOriginal.getDate();
        const grupoId = Date.now();
        const baseRef = `TX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const quantidade = Math.max(1, Number.parseInt(parcelas, 10) || 1);
        const valorParcela = fromCents(toCents(t.valor));

        for (let i = 0; i < quantidade; i++) {
            let dataParcela = new Date(dataOriginal);
            dataParcela.setMonth(dataOriginal.getMonth() + i);
            if (dataParcela.getDate() !== diaOriginal) dataParcela.setDate(0); 

            const newT = {
                ...t,
                id: grupoId + i,
                valor: valorParcela,
                data: dataParcela.toISOString().split('T')[0],
                parcelaAtual: i + 1,
                totalParcelas: quantidade,
                grupoId: grupoId,
                codigoRef: `${baseRef}-${i + 1}`
            };
            db.transacoes.unshift(newT);
            applyBalanceDelta(newT);
        }
        persist('transacoes');
    },
    
    addCardExpense: (compra) => {
        const quantidade = Math.max(1, Number.parseInt(compra.parcelas, 10) || 1);
        const valoresParcelas = splitInstallments(compra.total, quantidade);
        const dataOriginal = new Date(compra.data + 'T12:00:00');
        const diaOriginal = dataOriginal.getDate();
        const grupoId = Date.now();
        const baseRef = `TX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        for (let i = 0; i < quantidade; i++) {
            let dataParcela = new Date(dataOriginal);
            dataParcela.setMonth(dataOriginal.getMonth() + i);
            if (dataParcela.getDate() !== diaOriginal) dataParcela.setDate(0); 
            
            db.transacoes.unshift({
                id: grupoId + i,
                desc: compra.desc,
                valor: valoresParcelas[i],
                tipo: 'despesa',
                categoria: compra.categoria,
                bancoId: compra.cartaoId,
                isCartao: true,
                formaPagamento: 'Cartão de Crédito',
                data: dataParcela.toISOString().split('T')[0],
                parcelaAtual: i + 1,
                totalParcelas: quantidade,
                recorrente: quantidade > 1,
                grupoId: compra.id || grupoId,
                codigoRef: quantidade > 1 ? `${baseRef}-${i + 1}` : baseRef,
                contatoId: compra.contatoId || null
            });
        }
        persist('transacoes');
    },
    
    update: (id, newData) => {
        const index = db.transacoes.findIndex(t => String(t.id) === String(id));
        if (index >= 0 && db.transacoes[index].transferenciaId) return TransferRepo.update(id, newData);
        if (index >= 0 && isUnpairedTransfer(db.transacoes[index])) return false;
        if (newData && (newData.transferenciaId || newData.transferenciaInterna === true || newData.tipo === 'transferencia' || newData.tipoTransferencia === 'interna')) return false;
        if (index !== -1) {
            const oldT = db.transacoes[index];
            applyBalanceDelta(oldT, true); 
            db.transacoes[index] = { ...oldT, ...newData };
            applyBalanceDelta(db.transacoes[index]); 
            persist('transacoes');
            return true;
        }
        return false;
    },

    // Category-only bulk updates are persisted once and never touch balances/totals.
    updateCategories: (idsArray, categoria) => {
        const ids = new Set((idsArray || []).map(id => String(id)));
        if (!ids.size || !categoria) return 0;
        const selectedTransfers = db.transacoes.filter(item => ids.has(String(item.id)) && (item.transferenciaId || isUnpairedTransfer(item)));
        if (selectedTransfers.some(item => !item.transferenciaId)) return 0;
        const transferIds = new Set(selectedTransfers.map(item => String(item.transferenciaId)));
        const selectedPairs = [...transferIds].map(id => db.transacoes.filter(item => String(item.transferenciaId) === id));
        if (selectedPairs.some(legs => !isValidTransferPair(legs))) return 0;
        const idsToUpdate = new Set(ids);
        db.transacoes.filter(item => item.transferenciaId && transferIds.has(String(item.transferenciaId))).forEach(item => idsToUpdate.add(String(item.id)));
        let changed = 0;
        db.transacoes = db.transacoes.map(t => {
            if (!idsToUpdate.has(String(t.id))) return t;
            changed += 1;
            return { ...t, categoria };
        });
        if (changed) persist('transacoes');
        return changed;
    },
    
    delete: id => TransactionsRepo.deleteMultiple([id]),

    deleteMultiple: idsArray => {
        if (!idsArray || idsArray.length === 0) return;
        const strIds = new Set(idsArray.map(String));
        const includesTransfer = db.transacoes.some(item => strIds.has(String(item.id)) && (item.transferenciaId || isUnpairedTransfer(item)));
        if (includesTransfer) return TransferRepo.deleteByIds(idsArray);

        const removed = db.transacoes.filter(item => strIds.has(String(item.id)));
        db.transacoes = db.transacoes.filter(item => !strIds.has(String(item.id)));
        removed.forEach(item => applyBalanceDelta(item, true));
        persist('transacoes');
        return removed;
    }
};

export const CardRepo = {
    add: (item) => { db.cartoes.unshift(item); persist('cartoes'); return true; },
    remove: (id) => {
        const hasTransactions = db.transacoes.some(t => t.isCartao && String(t.bancoId) === String(id));
        if (hasTransactions) return false;
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
        const current = index >= 0 ? db.conciliacoesFaturas[index] : { chave, cardId, ano: year, mes: month };
        const ajustes = Array.isArray(current.ajustes) ? [...current.ajustes] : [];
        const normalized = normalizeAdjustment({ ...input, id: input.id || `aj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: input.createdAt || new Date().toISOString() });
        const adjustmentIndex = ajustes.findIndex(a => String(a.id) === String(normalized.id));
        if (adjustmentIndex >= 0) ajustes[adjustmentIndex] = { ...ajustes[adjustmentIndex], ...normalized };
        else ajustes.push(normalized);
        const value = { ...current, ajustes, atualizadoEm: new Date().toISOString() };
        if (index >= 0) db.conciliacoesFaturas[index] = value; else db.conciliacoesFaturas.unshift(value);
        persist('conciliacoesFaturas'); return normalized;
    },
    /** Post an explicit invoice adjustment as one idempotent history transaction. */
    createAdjustmentTransaction: (cardId, year, month, adjustmentId) => {
        const chave = invoiceReconciliationKey(cardId, year, month);
        const record = ReconciliationRepo.get(cardId, year, month);
        const ajustes = record?.ajustes || [];
        const index = ajustes.findIndex(a => String(a.id) === String(adjustmentId));
        if (index < 0) return { ok: false, reason: 'adjustment-not-found' };
        const adjustment = normalizeAdjustment(ajustes[index]);
        if (adjustment.transactionId) {
            const linked = db.transacoes.find(t => String(t.id) === String(adjustment.transactionId));
            if (linked) return { ok: true, transaction: linked, alreadyExists: true };
        }
        const linked = db.transacoes.find(t => String(t.reconciliationAdjustmentId) === String(adjustment.id) && String(t.invoiceReconciliationKey) === chave);
        if (linked) {
            ajustes[index] = { ...ajustes[index], transactionId: String(linked.id), postedAt: ajustes[index].postedAt || new Date().toISOString(), lancamentoCriado: true };
            persist('conciliacoesFaturas');
            return { ok: true, transaction: linked, alreadyExists: true };
        }
        const card = db.cartoes.find(c => String(c.id) === String(cardId));
        const dueDay = Number(card?.vencimento || card?.diaVencimento || 0);
        const dueDate = dueDay > 0 ? new Date(Number(year), Number(month), dueDay, 12) : null;
        const periodEnd = new Date(Number(year), Number(month), Math.max(1, Math.min(31, Number(card?.fechamento || card?.diaFechamento || 31))), 12);
        const date = (dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : periodEnd).toISOString().split('T')[0];
        const isCredit = adjustment.effect === 'credit';
        const categoryNames = adjustment.type === 'interest' ? ['Juros', 'Encargos financeiros'] : adjustment.type === 'fine' ? ['Multas', 'Multa'] : adjustment.type === 'fees' ? ['Taxas', 'Tarifas'] : adjustment.type === 'iof' ? ['IOF', 'Impostos'] : ['Outras despesas', 'Outros'];
        const category = categoryNames.find(name => (db.categorias || []).some(c => String(c?.nome || c) === name)) || categoryNames[categoryNames.length - 1];
        let txId = `tx-conciliacao-${encodeURIComponent(chave)}-${encodeURIComponent(String(adjustment.id))}`;
        if (db.transacoes.some(t => String(t.id) === txId)) txId = `${txId}-${Date.now()}`;
        const transaction = { id: String(txId), desc: adjustment.description || 'Ajuste de fatura', valor: adjustment.amount, tipo: isCredit ? 'receita' : 'despesa', categoria: isCredit ? 'Reembolso / estorno' : category, bancoId: card?.bancoId ?? null, isCartao: false, formaPagamento: 'Ajuste de fatura', data: date, parcelaAtual: 1, totalParcelas: 1, recorrente: false, invoiceReconciliationKey: chave, reconciliationAdjustmentId: String(adjustment.id), origem: 'conciliacao_fatura' };
        TransactionsRepo.add(transaction);
        ajustes[index] = { ...ajustes[index], transactionId: String(transaction.id), postedAt: new Date().toISOString(), lancamentoCriado: true };
        const updated = { ...record, ajustes, atualizadoEm: new Date().toISOString() };
        const recordIndex = db.conciliacoesFaturas.findIndex(r => r.chave === chave);
        db.conciliacoesFaturas[recordIndex] = updated;
        persist('conciliacoesFaturas');
        return { ok: true, transaction, alreadyExists: false };
    },
    deleteAdjustment: (cardId, year, month, id) => {
        const record = ReconciliationRepo.get(cardId, year, month); if (!record) return false;
        record.ajustes = (record.ajustes || []).filter(a => String(a.id) !== String(id));
        record.atualizadoEm = new Date().toISOString(); persist('conciliacoesFaturas'); return true;
    },
    saveAmount: (cardId, year, month, realInvoiceAmount) => {
        if (!Array.isArray(db.conciliacoesFaturas)) db.conciliacoesFaturas = [];
        const chave = invoiceReconciliationKey(cardId, year, month);
        const numeric = realInvoiceAmount === '' || realInvoiceAmount === null ? null : Number(realInvoiceAmount);
        const validAmount = Number.isFinite(numeric);
        const normalizedAmount = validAmount ? fromCents(toCents(numeric)) : null;
        const index = db.conciliacoesFaturas.findIndex(r => r.chave === chave);
        const current = index >= 0 ? db.conciliacoesFaturas[index] : { chave, cardId, ano: year, mes: month };
        const value = { ...current, valorFaturaReal: normalizedAmount, statusConciliacao: validAmount ? 'aguardando conferência' : 'em aberto', atualizadoEm: new Date().toISOString() };
        if (index >= 0) db.conciliacoesFaturas[index] = value;
        else db.conciliacoesFaturas.unshift(value);
        persist('conciliacoesFaturas');
        return value;
    },
    calculate: (transactions, card, year, month) => {
        const items = listInvoiceTransactions(transactions, card, year, month);
        const record = ReconciliationRepo.get(card.id, year, month);
        return { ...calculateReconciliation(items, record?.valorFaturaReal, record?.ajustes), transacoes: items, ajustes: record?.ajustes || [] };
    }
};

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
        if (!(db.reservas || []).some(reserve => String(reserve.id) === String(reserveId))) {
            db.reservas.unshift({ id: reserveId, goalId, nome: `Reserva: ${goal.nome || 'Meta'}`, saldo: goal.atual });
        }
        persist();
        return true;
    },
    remove: id => {
        const goal = db.metas.find(item => String(item.id) === String(id));
        if (!goal) return false;
        const reserve = (db.reservas || []).find(item => String(item.id) === String(goal.reservaId));
        if (reserve && Math.abs(toCents(reserve.saldo)) > 0) return false;
        const reserveIsReferenced = db.transacoes.some(item => [item.bancoId, item.contaOrigemId, item.contaDestinoId].some(accountId => String(accountId) === String(goal.reservaId)));
        if (reserveIsReferenced) return false;
        db.metas = db.metas.filter(item => String(item.id) !== String(id));
        db.reservas = (db.reservas || []).filter(item => String(item.id) !== String(goal.reservaId));
        persist();
        return true;
    },
    deposit: (goalId, sourceAccountId, amount, date = new Date().toISOString().slice(0, 10), description = null) => {
        const goal = db.metas.find(item => String(item.id) === String(goalId));
        if (!goal) return Promise.reject(new Error('Meta não encontrada.'));
        return TransferRepo.add({
            sourceAccountId,
            destinationAccountId: goal.reservaId,
            amount,
            date,
            description: description || `Depósito em meta: ${goal.nome || 'Meta'}`,
            goalId: goal.id
        });
    }
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
    add: (item) => { db.contatos.unshift(item); persist('contatos'); return true; },
    remove: (id) => { db.contatos = db.contatos.filter(i => i.id.toString() !== id.toString()); persist('contatos'); }
};

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

export const Database = {
    getTransacoesPorMes: TransactionsRepo.getByMonth,
    getComprasCartaoPorMes: TransactionsRepo.getCardExpensesByMonth,
    save: persist,
    getLastUpdated: () => db.metadados?.ultimaAtualizacao || null,
    replaceAll: async (data) => {
        if (!data || typeof data !== 'object') throw new Error('Backup inválido');

        for (const col of collections) {
            if (!hasOwn(data, col)) continue;
            if (Array.isArray(initialDB[col])) {
                if (!Array.isArray(data[col])) throw new Error(`Coleção inválida: ${col}`);
            } else if (typeof data[col] !== 'object' || data[col] === null || Array.isArray(data[col])) {
                throw new Error(`Registro inválido: ${col}`);
            }
        }

        const snapshot = Object.fromEntries(collections.map(col => [
            col,
            Array.isArray(db[col]) ? db[col].map(item => item && typeof item === 'object' ? { ...item } : item)
                : (db[col] && typeof db[col] === 'object' ? { ...db[col] } : db[col])
        ]));
        try {
            for (const col of collections) {
                if (!hasOwn(data, col)) continue;
                db[col] = Array.isArray(initialDB[col])
                    ? data[col].map(item => item && typeof item === 'object' ? { ...item } : item)
                    : { ...data[col] };
            }

            if (hasOwn(data, 'metas') && !hasOwn(data, 'reservas')) {
                // Legacy backups recorded goal progress after deducting deposits
                // from bank balances. Reconstruct reserves once, without keeping
                // stale reserve entries from the database being replaced.
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
                        reserve = { id: fallbackId, goalId: meta.id, nome: `Reserva: ${meta.nome || 'Meta'}`, saldo: fromCents(toCents(meta.atual)) };
                    }
                    reserve.id = reserve.id || fallbackId;
                    reserve.goalId = meta.id;
                    reserve.nome = reserve.nome || `Reserva: ${meta.nome || 'Meta'}`;
                    reserve.saldo = fromCents(toCents(reserve.saldo));
                    goalReserves.push(reserve);
                    return { ...meta, reservaId: reserve.id, atual: reserve.saldo };
                });
                db.reservas = [...goalReserves, ...unlinkedReserves];
            }

            db.metadados = { ...(db.metadados || {}), ultimaAtualizacao: new Date().toISOString() };
            await IDB.setMany(collections.map(col => [col, db[col]]));
            clearCache();
            if (typeof document !== 'undefined') document.dispatchEvent(new Event('db-updated'));
            return true;
        } catch (error) {
            collections.forEach(col => { db[col] = snapshot[col]; });
            clearCache();
            throw error;
        }
    },
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
    removeMultiple: (col, ids) => {
        if (col === 'transacoes') return TransactionsRepo.deleteMultiple(ids);
    },
    addTransfer: TransferRepo.add,
    restoreTransactions: TransferRepo.restoreMany,
    updateTransaction: TransactionsRepo.update,
    updateTransactionCategories: TransactionsRepo.updateCategories,
    updateAgendamento: ScheduleRepo.update,
    updateReceitaFutura: FutureIncomeRepo.update,
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
    updateUser: UserRepo.update,
    markNotificationRead: NotificationRepo.markRead,
    markAllNotificationsRead: NotificationRepo.markAllRead,
    getTotals: () => {
        const totals = calculatePeriodTotals(db.transacoes);
        const saldoDisponivel = db.bancos.reduce((total, bank) => addMoney(total, bank.saldo), 0);
        const saldoReservado = (db.reservas || []).reduce((total, reserve) => addMoney(total, reserve.saldo), 0);
        return {
            receitas: totals.income,
            despesas: totals.expense,
            saldo: saldoDisponivel,
            saldoDisponivel,
            saldoReservado,
            saldoTotal: addMoney(saldoDisponivel, saldoReservado)
        };
    }
};