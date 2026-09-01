import { CATEGORIAS_PADRAO } from './categorias-padrao.js';
import { calculateReconciliation, invoiceReconciliationKey, listInvoiceTransactions, normalizeAdjustment } from './reconciliation.js';
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
    investimentos: []
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
    })
};

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

    if (db.categorias.length === 0) {
        db.categorias = CATEGORIAS_PADRAO.map(c => ({ ...c }));
        await IDB.set('categorias', db.categorias);
    }

    if (db.categorias.length > 0) {
        const padraoPorNome = new Map(CATEGORIAS_PADRAO.map(c => [String(c.nome).toLowerCase(), c]));
        db.categorias = db.categorias.map(c => {
            const padrao = padraoPorNome.get(String(typeof c === 'string' ? c : c.nome || '').toLowerCase());
            if (!padrao || typeof c === 'string') return typeof c === 'string' ? { ...padrao, id: 'cat_' + Date.now() + Math.random() } : c;
            return { ...c, grupo: c.grupo || padrao.grupo, subgrupo: c.subgrupo || padrao.subgrupo, tipo: c.tipo || padrao.tipo, fixa: c.fixa ?? padrao.fixa, icone: c.icone || padrao.icone, cor: c.cor || padrao.cor };
        });
        await IDB.set('categorias', db.categorias);
        const categoryDefaults = {
            'Alimentação': { icone: 'fa-utensils', cor: '#F97316' },
            'Moradia': { icone: 'fa-house', cor: '#8B5CF6' },
            'Transporte': { icone: 'fa-car', cor: '#3B82F6' },
            'Lazer': { icone: 'fa-gamepad', cor: '#EC4899' },
            'Saúde': { icone: 'fa-heart-pulse', cor: '#F43F5E' },
            'Salário': { icone: 'fa-money-bill-wave', cor: '#10B981' },
            'Serviços': { icone: 'fa-bolt', cor: '#06B6D4' },
            'Educação': { icone: 'fa-graduation-cap', cor: '#6366F1' },
            'Compras': { icone: 'fa-bag-shopping', cor: '#F59E0B' }
        };
        
        db.categorias = db.categorias.map((c, index) => {
            if (typeof c === 'string') {
                const def = categoryDefaults[c] || { icone: 'fa-tag', cor: '#9CA3AF' };
                return { id: 'cat_' + Date.now() + index, nome: c, icone: def.icone, cor: def.cor };
            } else if (typeof c === 'object' && c !== null) {
                return {
                    id: c.id || 'cat_' + Date.now() + index,
                    nome: c.nome || 'Categoria ' + (index + 1),
                    icone: c.icone || 'fa-tag',
                    cor: c.cor || '#9CA3AF',
                    paiId: c.paiId || null,
                    grupo: c.grupo || null,
                    subgrupo: c.subgrupo || c.nome || null,
                    tipo: c.grupo === 'Renda' ? 'receita' : (c.tipo || 'despesa')
                };
            }
            return null;
        }).filter(c => c !== null);
        
        IDB.set('categorias', db.categorias).catch(console.error);
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

const applyBalanceDelta = (t, isReverse = false) => {
    if (t.isCartao) return; 
    const b = db.bancos.find(x => String(x.id) === String(t.bancoId));
    if (b) {
        // Internal transfers have a debit and credit leg; never classify them as expense/income.
        const amount = t.transferenciaInterna ? (t.transferenciaEntrada ? t.valor : -t.valor) : (t.tipo === 'receita' && !t.transferenciaInterna ? t.valor : -t.valor);
        b.saldo += isReverse ? -amount : amount;
        persist('bancos');
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
        const t = { ...item };
        if (!t.codigoRef) t.codigoRef = `TX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        db.transacoes.unshift(t);
        applyBalanceDelta(t);
        persist('transacoes');
        return true;
    },
    
    addRecurrent: (t, parcelas) => {
        const dataOriginal = new Date(t.data + 'T12:00:00');
        const diaOriginal = dataOriginal.getDate();
        const grupoId = Date.now();
        const baseRef = `TX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        for (let i = 0; i < parcelas; i++) {
            let dataParcela = new Date(dataOriginal);
            dataParcela.setMonth(dataOriginal.getMonth() + i);
            if (dataParcela.getDate() !== diaOriginal) dataParcela.setDate(0); 

            const newT = {
                ...t,
                id: grupoId + i,
                data: dataParcela.toISOString().split('T')[0],
                parcelaAtual: i + 1,
                totalParcelas: parcelas,
                grupoId: grupoId,
                codigoRef: `${baseRef}-${i + 1}`
            };
            db.transacoes.unshift(newT);
            applyBalanceDelta(newT);
        }
        persist('transacoes');
    },
    
    addCardExpense: (compra) => {
        const valorBaseParcela = Math.round((compra.total / compra.parcelas) * 100) / 100;
        const diferenca = parseFloat((compra.total - (valorBaseParcela * compra.parcelas)).toFixed(2));
        
        const dataOriginal = new Date(compra.data + 'T12:00:00');
        const diaOriginal = dataOriginal.getDate();
        const grupoId = Date.now();
        const baseRef = `TX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        for (let i = 0; i < compra.parcelas; i++) {
            let dataParcela = new Date(dataOriginal);
            dataParcela.setMonth(dataOriginal.getMonth() + i);
            if (dataParcela.getDate() !== diaOriginal) dataParcela.setDate(0); 
            
            let valorFinal = valorBaseParcela;
            if (i === 0) valorFinal = parseFloat((valorFinal + diferenca).toFixed(2));

            db.transacoes.unshift({
                id: grupoId + i,
                desc: compra.desc,
                valor: valorFinal,
                tipo: 'despesa',
                categoria: compra.categoria,
                bancoId: compra.cartaoId,
                isCartao: true,
                formaPagamento: 'Cartão de Crédito',
                data: dataParcela.toISOString().split('T')[0],
                parcelaAtual: i + 1,
                totalParcelas: compra.parcelas,
                recorrente: compra.parcelas > 1,
                grupoId: compra.id || grupoId,
                codigoRef: compra.parcelas > 1 ? `${baseRef}-${i + 1}` : baseRef,
                contatoId: compra.contatoId || null
            });
        }
        persist('transacoes');
    },
    
    update: (id, newData) => {
        const index = db.transacoes.findIndex(t => t.id.toString() === id.toString());
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
        let changed = 0;
        db.transacoes = db.transacoes.map(t => {
            if (!ids.has(String(t.id))) return t;
            changed += 1;
            return { ...t, categoria };
        });
        if (changed) persist('transacoes');
        return changed;
    },
    
    delete: (id) => {
        const strId = id.toString();
        const target = db.transacoes.find(item => item.id.toString() === strId);
        if (target) applyBalanceDelta(target, true); 
        
        db.transacoes = db.transacoes.filter(item => item.id.toString() !== strId);
        persist('transacoes');
    },
    
    deleteMultiple: (idsArray) => {
        if (!idsArray || idsArray.length === 0) return;
        const strIds = idsArray.map(id => id.toString());
        
        strIds.forEach(strId => {
            const target = db.transacoes.find(t => t.id.toString() === strId);
            if (target) applyBalanceDelta(target, true); 
        });

        db.transacoes = db.transacoes.filter(t => !strIds.includes(t.id.toString()));
        persist('transacoes');
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
        const index = db.conciliacoesFaturas.findIndex(r => r.chave === chave);
        const current = index >= 0 ? db.conciliacoesFaturas[index] : { chave, cardId, ano: year, mes: month };
        const value = { ...current, valorFaturaReal: Number.isFinite(numeric) ? numeric : null, statusConciliacao: Number.isFinite(numeric) ? 'aguardando conferência' : 'em aberto', atualizadoEm: new Date().toISOString() };
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
    add: (item) => { db.metas.unshift(item); persist('metas'); return true; },
    remove: (id) => { db.metas = db.metas.filter(i => i.id.toString() !== id.toString()); persist('metas'); },
    deposit: (id, val) => {
        const g = db.metas.find(x => String(x.id) === String(id));
        if(g) { g.atual += val; persist('metas'); }
    }
};

export const BudgetRepo = {
    add: (item) => { db.orcamentos.unshift(item); persist('orcamentos'); return true; },
    remove: (id) => { db.orcamentos = db.orcamentos.filter(i => i.id.toString() !== id.toString()); persist('orcamentos'); },
    updateLimit: (categoria, limite, ano = null, mes = null) => {
        const existe = db.orcamentos.findIndex(o => o.categoria === categoria && o.ano === ano && o.mes === mes);
        if (existe >= 0) db.orcamentos[existe].limite = limite;
        else db.orcamentos.push({ id: Date.now(), categoria, limite, ano, mes });
        persist('orcamentos');
    }
};

export const CategoryRepo = {
    add: (item) => {
        if (!db.categorias.some(c => c.nome.toLowerCase() === item.nome.toLowerCase())) {
            db.categorias.push(item); 
            persist('categorias'); 
            return true;
        }
        return false;
    },
    rename: (id, novoNome) => {
        const categoria = db.categorias.find(c => String(c.id) === String(id));
        const nome = String(novoNome || '').trim();
        if (!categoria || !nome || db.categorias.some(c => c !== categoria && String(c.nome).toLowerCase() === nome.toLowerCase())) return false;
        const antigo = categoria.nome;
        categoria.nome = nome;
        db.transacoes.forEach(t => { if (t.categoria === antigo) t.categoria = nome; });
        db.orcamentos.forEach(o => { if (o.categoria === antigo) o.categoria = nome; });
        db.agendamentos.forEach(a => { if (a.categoria === antigo) a.categoria = nome; });
        persist('categorias'); persist('transacoes'); persist('orcamentos'); persist('agendamentos');
        return true;
    },

    remove: (id) => { 
        const categoria = db.categorias.find(c => String(c.id) === String(id));
        if (!categoria) return false;
        if (categoria.fixa) return false;
        const usada = db.transacoes.some(t => t.categoria === categoria.nome) ||
            db.orcamentos.some(o => o.categoria === categoria.nome) ||
            db.agendamentos.some(a => a.categoria === categoria.nome);
        if (usada) return false;
        db.categorias = db.categorias.filter(c => c.id.toString() !== id.toString()); 
        persist('categorias');
        return true;
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
    replaceAll: async (data) => {
        if (!data || typeof data !== 'object') throw new Error('Backup inválido');

        for (const col of collections) {
            if (Array.isArray(initialDB[col])) {
                if (data[col] !== undefined && !Array.isArray(data[col])) {
                    throw new Error(`Coleção inválida: ${col}`);
                }
                if (data[col] !== undefined) db[col] = data[col];
            } else if (data[col] !== undefined) {
                if (typeof data[col] !== 'object' || data[col] === null || Array.isArray(data[col])) {
                    throw new Error(`Registro inválido: ${col}`);
                }
                db[col] = data[col];
            }
        }

        await Promise.all(collections.map(col => IDB.set(col, db[col])));
        clearCache();
        if (typeof document !== 'undefined') document.dispatchEvent(new Event('db-updated'));
        return true;
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
        if (col === 'transacoes') TransactionsRepo.deleteMultiple(ids);
    },
    updateTransaction: TransactionsRepo.update,
    updateTransactionCategories: TransactionsRepo.updateCategories,
    updateAgendamento: ScheduleRepo.update,
    updateReceitaFutura: FutureIncomeRepo.update,
    addCardExpense: TransactionsRepo.addCardExpense,
    updateConfig: NotificationRepo.updateConfig,
    updateBudget: BudgetRepo.updateLimit,
    renameCategory: CategoryRepo.rename,
    depositGoal: GoalRepo.deposit,
    updateUser: UserRepo.update,
    markNotificationRead: NotificationRepo.markRead,
    markAllNotificationsRead: NotificationRepo.markAllRead,
    getTotals: () => ({
        receitas: db.transacoes.filter(t => !t.transferenciaInterna && t.tipo === 'receita' && !t.transferenciaInterna).reduce((a, b) => a + (b.valor || 0), 0),
        despesas: db.transacoes.filter(t => !t.transferenciaInterna && t.tipo === 'despesa' && !t.transferenciaInterna).reduce((a, b) => a + (b.valor || 0), 0),
        saldo: db.bancos.reduce((a, b) => a + (b.saldo || 0), 0)
    })
};