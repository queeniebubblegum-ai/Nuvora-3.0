import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    buildInvoicePaymentTransaction,
    isInvoiceSchedulePending,
    isValidInvoicePaymentDate,
    preferredInvoicePaymentBankId,
} from './invoice-payment.js';
import { calculatePeriodTotals, isInvoicePayment, isExpense, isTransfer } from './financial-ledger.js';

const read = file => readFileSync(resolve(process.cwd(), file), 'utf8');

const schedule = {
    id: 'invoice:card-7:2026-09',
    desc: 'Fatura Visa',
    valor: 87.256,
    categoria: 'Fatura Cartão',
    cartaoId: 'card-7',
    status: 'pendente',
    dataVencimento: '2026-09-25',
};

const banks = [
    { id: 'bank-1', nome: 'Conta A' },
    { id: 'bank-2', nome: 'Conta B' },
];

describe('registro local de pagamento de fatura', () => {
    it('prioritizes the card-linked account, then a valid schedule account', () => {
        expect(preferredInvoicePaymentBankId({ bancoId: 'bank-2' }, { bancoId: 'bank-1' }, banks)).toBe('bank-2');
        expect(preferredInvoicePaymentBankId({ bancoId: 'deleted-bank' }, { bancoId: 'bank-1' }, banks)).toBe('bank-1');
    });

    it('auto-selects a sole bank but never arbitrarily chooses among multiple banks', () => {
        expect(preferredInvoicePaymentBankId(null, schedule, [{ id: 'only-bank' }])).toBe('only-bank');
        expect(preferredInvoicePaymentBankId(null, schedule, banks)).toBeNull();
        expect(preferredInvoicePaymentBankId(null, schedule, [{ nome: 'Sem identificador' }])).toBeNull();
        expect(preferredInvoicePaymentBankId(null, schedule, [])).toBeNull();
    });

    it('normalizes money to cents and creates a stable traceable payment transaction', () => {
        const transaction = buildInvoicePaymentTransaction({ schedule, bankId: 'bank-2', paymentDate: '2026-09-24' });
        expect(transaction).toMatchObject({
            id: 'invoice-payment-invoice%3Acard-7%3A2026-09',
            invoicePaymentAgendamentoId: schedule.id,
            valor: 87.26,
            bancoId: 'bank-2',
            data: '2026-09-24',
            tipo: 'pagamento-fatura',
            transferenciaInterna: true,
            afetaReceita: false,
            afetaDespesa: false,
        });
        expect(isInvoicePayment(transaction)).toBe(true);
        expect(isTransfer(transaction)).toBe(true);
        expect(isExpense(transaction)).toBe(false);
        expect(calculatePeriodTotals([transaction])).toMatchObject({ income: 0, expense: 0, transfers: 87.26, invoicePayments: 87.26 });
        expect(buildInvoicePaymentTransaction({ schedule, bankId: 'bank-2', paymentDate: '2026-09-24' }).id).toBe(transaction.id);
    });

    it('accepts real calendar dates and rejects malformed or impossible dates', () => {
        expect(isValidInvoicePaymentDate('2024-02-29')).toBe(true);
        expect(isValidInvoicePaymentDate('2026-02-29')).toBe(false);
        expect(isValidInvoicePaymentDate('2026-04-31')).toBe(false);
        expect(isValidInvoicePaymentDate('2026-13-01')).toBe(false);
        expect(isValidInvoicePaymentDate('2026-9-01')).toBe(false);
        expect(buildInvoicePaymentTransaction({ schedule, bankId: 'bank-1', paymentDate: '2026-02-30' })).toBeNull();
    });

    it('only treats explicitly pending invoices as eligible for payment registration', () => {
        expect(isInvoiceSchedulePending({ status: 'pendente' })).toBe(true);
        for (const status of ['pago', 'cancelado', 'cancelada', 'em revisão', undefined]) {
            expect(isInvoiceSchedulePending({ status })).toBe(false);
        }
    });

    it('wires account/date validation, duplicate protection, cancellation, and visible payment entry points', () => {
        const app = read('app.js');
        const pages = read('cmp-pages.js');
        const modal = read('cmp-modals.js');
        const clicks = read('evt-click.js');
        const sw = read('service-worker.js');
        const open = app.slice(app.indexOf('openInvoicePayment:'), app.indexOf('confirmInvoicePayment:'));
        const confirm = app.slice(app.indexOf('confirmInvoicePayment:'), app.indexOf('cancelInvoicePayment:'));
        const payment = app.slice(app.indexOf('markAgendamentoPaid:'), app.indexOf('markCloseAgendaPaid:'));
        const invoiceBranch = payment.slice(0, payment.indexOf("if (agendamento.status !== 'pendente')"));
        const cancellation = app.slice(app.indexOf('cancelInvoicePayment:'), app.indexOf('markAgendamentoPaid:'));

        expect(open).toMatch(/isInvoiceSchedulePending\(agendamento\)/);
        expect(open.indexOf('scheduleId.value =')).toBeLessThan(open.indexOf("App.openModal('modal-pagar-fatura')"));
        expect(open.indexOf('paymentDate.value =')).toBeLessThan(open.indexOf("App.openModal('modal-pagar-fatura')"));
        expect(confirm).toContain('isValidInvoicePaymentDate(paymentDate)');
        expect(confirm).toContain('db.bancos.some');
        expect(payment).toContain('invoicePaymentAgendamentoId');
        expect(payment).toContain('transactionIdCollision');
        expect(payment).toContain("status: 'pago', bancoId: bank.id, dataPagamento: transaction.data");
        expect(invoiceBranch).not.toContain('db.bancos[0]');
        expect(cancellation).not.toContain('Database.');
        expect(app).toContain("cancelInvoicePayment: () => App.closeModal(false, 'modal-pagar-fatura')");
        expect(app).not.toMatch(/onclick="App\.markAgendamentoPaid\('[^']+'\); this\.parentElement/);
        expect(app).toContain("data-action=\"${a.categoria === 'Fatura Cartão' ? 'openInvoicePayment' : 'markCloseAgendaPaid'}\"");
        expect(pages.match(/data-action="openInvoicePayment"/g)).toHaveLength(2);
        expect(pages).toContain('data-action="openInvoicePaymentForCard"');
        expect(app).toContain('openInvoicePaymentForCard:');
        expect(clicks).toContain("'openInvoicePaymentForCard': () => App.openInvoicePaymentForCard(btn.getAttribute('data-id'))");
        expect(pages).toContain('Registrar pagamento da fatura');
        expect(modal).toContain('id="invoice-payment-bank"');
        expect(modal).toContain('id="invoice-payment-date"');
        expect(modal).toContain('não inicia uma transferência bancária');
        expect(clicks).toContain("'confirmInvoicePayment': () => App.confirmInvoicePayment()");
        expect(clicks).toContain("'cancelInvoicePayment': () => App.cancelInvoicePayment()");
        expect(sw).toContain("'./invoice-payment.js'");
        expect(sw).toContain('avenera-app-shell-v14');
    });
});
