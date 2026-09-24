import { fromCents, toCents } from './money-math.js';

const defaultIdFactory = () => globalThis.crypto?.randomUUID?.()
    || `id-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export const isValidTransferDate = value => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1) return false;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return day <= daysInMonth;
};

/** Build the paired ledger rows for one internal transfer. */
export const createTransfer = ({
    sourceAccountId,
    destinationAccountId,
    amount,
    date,
    description = 'Transferência entre contas',
    transferId,
    idFactory = defaultIdFactory,
} = {}) => {
    const sourceId = sourceAccountId == null ? '' : String(sourceAccountId).trim();
    const destinationId = destinationAccountId == null ? '' : String(destinationAccountId).trim();
    const valueCents = toCents(amount);
    const transferDate = String(date || '').trim();

    if (!sourceId || !destinationId || sourceId === destinationId || valueCents <= 0 || !isValidTransferDate(transferDate)) {
        throw new Error('Transferência inválida.');
    }

    const idTransfer = String(transferId || `transfer-${idFactory()}`);
    const sourceTransactionId = String(idFactory());
    const destinationTransactionId = String(idFactory());
    if (!idTransfer || !sourceTransactionId || !destinationTransactionId || sourceTransactionId === destinationTransactionId) {
        throw new Error('Não foi possível gerar identificadores únicos para a transferência.');
    }
    const desc = String(description || 'Transferência entre contas').trim() || 'Transferência entre contas';
    const value = fromCents(valueCents);
    const shared = {
        transferenciaId: idTransfer,
        transferenciaInterna: true,
        valor: value,
        data: transferDate,
        desc,
        categoria: 'Transferência entre contas',
        isCartao: false,
        formaPagamento: 'Transferência interna',
        contaOrigemId: sourceAccountId,
        contaDestinoId: destinationAccountId,
    };

    return [
        {
            ...shared,
            id: sourceTransactionId,
            bancoId: sourceAccountId,
            tipo: 'despesa',
            transferenciaEntrada: false,
        },
        {
            ...shared,
            id: destinationTransactionId,
            bancoId: destinationAccountId,
            tipo: 'receita',
            transferenciaEntrada: true,
        },
    ];
};
