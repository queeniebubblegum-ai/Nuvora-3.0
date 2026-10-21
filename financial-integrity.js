import { isExpense, isIncome, isInvoicePayment, isTransfer } from './financial-ledger.js';
import { fromCents, toCents } from './money-math.js';
import { parseLocalDate } from './util-date.js';

const ARRAY_COLLECTIONS = [
    'transacoes', 'bancos', 'cartoes', 'conciliacoesFaturas', 'metas', 'reservas',
    'orcamentos', 'notificacoes', 'agendamentos', 'categorias', 'contatos',
    'historicoMentoria', 'receitasFuturas', 'assinaturas', 'investimentos'
];

const moneyFields = new Set(['valor', 'saldo', 'saldoInicial', 'limite', 'limiteTotal', 'alvo', 'atual', 'valorAtual', 'rendaMensalMedia']);
const dateFields = new Set(['data', 'dataVencimento', 'dataPagamento', 'dataCriacao', 'proximaCobranca', 'dataProximaCobranca']);
const transferKinds = new Set(['transferencia', 'interna']);

const issue = (severity, code, path, message) => ({ severity, code, path, message });
const asNumber = value => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};
const asId = value => value === null || value === undefined || String(value).trim() === '' ? null : String(value);
const hasId = value => asId(value) !== null;
const validDate = value => {
    if (value === '' || value === null || value === undefined) return true;
    return Boolean(parseLocalDate(value));
};
const collection = (database, key) => Array.isArray(database?.[key]) ? database[key] : [];
const ids = records => new Set(records.map(item => asId(item?.id)).filter(Boolean));

/** Validate one record without mutating it. Errors are safe to show in an audit report. */
export const validateEntity = (collectionName, record, index = 0) => {
    const path = `${collectionName}[${index}]`;
    const errors = [];
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
        return [issue('error', 'record.invalid', path, 'O registro precisa ser um objeto.')];
    }
    if (ARRAY_COLLECTIONS.includes(collectionName) && !hasId(record.id)) {
        errors.push(issue('error', 'id.missing', `${path}.id`, 'O registro não possui um identificador.'));
    }
    for (const [key, value] of Object.entries(record)) {
        if (moneyFields.has(key) && value !== '' && value !== null && asNumber(value) === null) {
            errors.push(issue('error', 'money.invalid', `${path}.${key}`, 'O valor precisa ser numérico.'));
        }
        if (dateFields.has(key) && !validDate(value)) {
            errors.push(issue('error', 'date.invalid', `${path}.${key}`, 'A data não é válida.'));
        }
    }
    if (collectionName === 'bancos') {
        if (!String(record.nome || '').trim()) errors.push(issue('error', 'bank.name', `${path}.nome`, 'A conta precisa ter um nome.'));
        if (asNumber(record.saldo) === null) errors.push(issue('error', 'bank.balance', `${path}.saldo`, 'A conta precisa ter saldo numérico.'));
    }
    if (collectionName === 'cartoes') {
        const limit = asNumber(record.limite ?? record.limiteTotal);
        if (!String(record.nome || '').trim()) errors.push(issue('error', 'card.name', `${path}.nome`, 'O cartão precisa ter um nome.'));
        if (limit === null || limit < 0) errors.push(issue('error', 'card.limit', `${path}.limite`, 'O limite do cartão precisa ser maior ou igual a zero.'));
        for (const key of ['fechamento', 'diaFechamento', 'vencimento', 'diaVencimento']) {
            if (record[key] !== undefined && (!Number.isInteger(Number(record[key])) || Number(record[key]) < 1 || Number(record[key]) > 31)) {
                errors.push(issue('error', 'card.day', `${path}.${key}`, 'O dia precisa estar entre 1 e 31.'));
            }
        }
    }
    if (collectionName === 'transacoes') {
        const amount = asNumber(record.valor);
        if (amount === null || amount < 0) errors.push(issue('error', 'transaction.amount', `${path}.valor`, 'O lançamento precisa ter um valor maior ou igual a zero.'));
        if (!validDate(record.data)) errors.push(issue('error', 'transaction.date', `${path}.data`, 'O lançamento precisa ter uma data válida.'));
        const kind = String(record.tipo || '').trim().toLowerCase();
        if (kind && !['receita', 'despesa', 'estorno-cartao', 'pagamento-fatura', ...transferKinds].includes(kind)) {
            errors.push(issue('error', 'transaction.type', `${path}.tipo`, 'Tipo de lançamento desconhecido.'));
        }
    }
    if (collectionName === 'metas') {
        const target = asNumber(record.alvo);
        if (!String(record.nome || '').trim()) errors.push(issue('error', 'goal.name', `${path}.nome`, 'A meta precisa ter um nome.'));
        if (target === null || target <= 0) errors.push(issue('error', 'goal.target', `${path}.alvo`, 'A meta precisa ter um valor-alvo maior que zero.'));
        if (asNumber(record.atual) !== null && asNumber(record.atual) < 0) errors.push(issue('error', 'goal.progress', `${path}.atual`, 'O valor acumulado não pode ser negativo.'));
    }
    if (collectionName === 'orcamentos') {
        if (!String(record.categoria || '').trim()) errors.push(issue('error', 'budget.category', `${path}.categoria`, 'O orçamento precisa estar ligado a uma categoria.'));
        if (asNumber(record.limite) === null || asNumber(record.limite) < 0) errors.push(issue('error', 'budget.limit', `${path}.limite`, 'O limite do orçamento precisa ser maior ou igual a zero.'));
    }
    return errors;
};

const accountDeltaCents = transaction => {
    const amount = toCents(transaction?.valor);
    if (amount === 0 || transaction?.isCartao || transaction?.saldoIncluidoNoSaldoDoExtrato === true || transaction?.alocacaoMetaVirtual === true) return 0;
    if (isTransfer(transaction)) return transaction.transferenciaEntrada === true ? amount : -amount;
    if (isIncome(transaction)) return amount;
    if (isExpense(transaction) || isInvoicePayment(transaction)) return -amount;
    return 0;
};

/** Reconciles persisted account balances against their opening balance and ledger movements. */
export const reconcileBalances = database => {
    const transactions = collection(database, 'transacoes');
    return collection(database, 'bancos').map(bank => {
        const opening = asNumber(bank?.saldoInicial);
        const actual = asNumber(bank?.saldo);
        const movements = transactions.filter(item => !item?.isCartao && String(item?.bancoId) === String(bank?.id));
        const anchored = movements.some(item => item?.saldoIncluidoNoSaldoDoExtrato === true);
        const deltaCents = movements.reduce((sum, item) => sum + accountDeltaCents(item), 0);
        const expected = opening === null || anchored ? null : fromCents(toCents(opening) + deltaCents);
        const difference = expected === null || actual === null ? null : fromCents(toCents(actual) - toCents(expected));
        return {
            id: bank?.id,
            name: bank?.nome || 'Conta sem nome',
            status: opening === null || actual === null ? 'unverifiable' : anchored ? 'anchored' : difference === 0 ? 'reconciled' : 'difference',
            openingBalance: opening,
            actualBalance: actual,
            expectedBalance: expected,
            difference,
            movementCount: movements.length,
            anchoredMovementCount: movements.filter(item => item?.saldoIncluidoNoSaldoDoExtrato === true).length,
        };
    });
};

const checkReferences = (database, warnings) => {
    const bankIds = ids(collection(database, 'bancos'));
    const cardIds = ids(collection(database, 'cartoes'));
    const reserveIds = ids(collection(database, 'reservas'));
    const scheduleIds = ids(collection(database, 'agendamentos'));
    const goalIds = ids(collection(database, 'metas'));
    collection(database, 'transacoes').forEach((item, index) => {
        const targetIds = item?.isCartao ? cardIds : new Set([...bankIds, ...reserveIds]);
        if (hasId(item?.bancoId) && !targetIds.has(asId(item.bancoId))) warnings.push(issue('warning', 'reference.account', `transacoes[${index}].bancoId`, 'O lançamento aponta para uma conta ou cartão que não existe mais.'));
        if (hasId(item?.invoicePaymentAgendamentoId) && !scheduleIds.has(asId(item.invoicePaymentAgendamentoId))) warnings.push(issue('warning', 'reference.invoice', `transacoes[${index}].invoicePaymentAgendamentoId`, 'O pagamento aponta para uma fatura que não existe mais.'));
    });
    collection(database, 'cartoes').forEach((item, index) => {
        if (hasId(item?.bancoId) && !bankIds.has(asId(item.bancoId))) warnings.push(issue('warning', 'reference.card-bank', `cartoes[${index}].bancoId`, 'O cartão não está ligado a uma conta existente.'));
    });
    collection(database, 'metas').forEach((item, index) => {
        if (hasId(item?.reservaId) && !reserveIds.has(asId(item.reservaId))) warnings.push(issue('warning', 'reference.goal-reserve', `metas[${index}].reservaId`, 'A meta não encontrou sua reserva virtual.'));
        if (hasId(item?.id) && !goalIds.has(asId(item.id))) return;
    });
};

const checkTransfers = (database, warnings) => {
    const groups = new Map();
    collection(database, 'transacoes').filter(isTransfer).forEach(item => {
        const key = asId(item?.transferenciaId);
        if (!key || isInvoicePayment(item)) return;
        const list = groups.get(key) || [];
        list.push(item);
        groups.set(key, list);
    });
    groups.forEach((legs, transferId) => {
        const amounts = new Set(legs.map(item => toCents(item?.valor)));
        const hasEntry = legs.some(item => item.transferenciaEntrada === true);
        const hasExit = legs.some(item => item.transferenciaEntrada === false);
        if (legs.length !== 2 || amounts.size !== 1 || !hasEntry || !hasExit) {
            warnings.push(issue('warning', 'transfer.incomplete', `transferencia:${transferId}`, 'A transferência interna não possui duas pernas válidas com o mesmo valor.'));
        }
    });
};

/** Returns a non-mutating report that can be shown before repairing or importing data. */
export const auditDatabase = (database, { includeWarnings = true } = {}) => {
    const errors = [];
    const warnings = [];
    ARRAY_COLLECTIONS.forEach(name => {
        const records = collection(database, name);
        const seen = new Set();
        records.forEach((record, index) => {
            errors.push(...validateEntity(name, record, index));
            const id = asId(record?.id);
            if (id && seen.has(id)) errors.push(issue('error', 'id.duplicate', `${name}[${index}].id`, `O ID ${id} aparece mais de uma vez nesta coleção.`));
            if (id) seen.add(id);
        });
    });
    checkReferences(database, warnings);
    checkTransfers(database, warnings);
    const balances = reconcileBalances(database);
    balances.filter(item => item.status === 'difference').forEach(item => warnings.push(issue('warning', 'balance.difference', `bancos:${item.id}`, `Saldo divergente em ${item.name}: esperado ${item.expectedBalance}, encontrado ${item.actualBalance}.`)));
    if (!includeWarnings) warnings.length = 0;
    return {
        ok: errors.length === 0,
        errors,
        warnings,
        balances,
        summary: {
            collections: ARRAY_COLLECTIONS.reduce((total, name) => total + collection(database, name).length, 0),
            errors: errors.length,
            warnings: warnings.length,
            reconciledAccounts: balances.filter(item => item.status === 'reconciled').length,
            accountsWithDifferences: balances.filter(item => item.status === 'difference').length,
        }
    };
};

export const formatIntegritySummary = report => {
    const summary = report?.summary || {};
    if (!report?.ok) return `Integridade: ${summary.errors || 0} erro(s) que precisam de atenção.`;
    if ((summary.warnings || 0) > 0) return `Integridade: dados válidos, mas ${summary.warnings} aviso(s) foram encontrados.`;
    return 'Integridade: dados financeiros consistentes.';
};

