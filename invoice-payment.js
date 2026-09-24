import { fromCents, toCents } from './money-math.js';

const hasId = value => value !== null && value !== undefined && String(value).trim() !== '';

export const isValidInvoicePaymentDate = value => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1 || month < 1 || month > 12) return false;
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    return day >= 1 && day <= daysInMonth;
};

export const isInvoiceSchedulePending = schedule =>
    String(schedule?.status || '').trim().toLowerCase() === 'pendente';

/** Prefer the card-linked account, then the schedule's account; auto-select only when unambiguous. */
export const preferredInvoicePaymentBankId = (card, schedule, banks = []) => {
    const accounts = (Array.isArray(banks) ? banks : []).filter(bank => hasId(bank?.id));
    const candidates = [card?.bancoId, schedule?.bancoId].filter(hasId);
    for (const candidate of candidates) {
        const match = accounts.find(bank => String(bank?.id) === String(candidate));
        if (match) return match.id;
    }
    return accounts.length === 1 ? accounts[0].id : null;
};

/** Build a traceable local payment entry; this records a payment but does not send money. */
export const buildInvoicePaymentTransaction = ({ schedule, bankId, paymentDate, transactionId = null } = {}) => {
    if (!schedule || !hasId(schedule.id) || !hasId(bankId) || !isValidInvoicePaymentDate(paymentDate)) return null;
    const value = fromCents(toCents(schedule.valor));
    if (value <= 0) return null;
    const scheduleId = String(schedule.id);
    return {
        id: transactionId || `invoice-payment-${encodeURIComponent(scheduleId)}`,
        invoicePaymentAgendamentoId: scheduleId,
        desc: schedule.desc || 'Pagamento de fatura',
        valor: value,
        tipo: 'pagamento-fatura',
        categoria: 'Pagamento de Fatura',
        bancoId: bankId,
        isCartao: false,
        formaPagamento: 'Pagamento registrado no Avenera',
        data: String(paymentDate),
        transferenciaInterna: true,
        afetaReceita: false,
        afetaDespesa: false,
    };
};
