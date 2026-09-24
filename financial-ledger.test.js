import { describe, expect, it } from 'vitest';
import {
    calculatePeriodTotals,
    isExpense,
    isIncome,
    isInvoicePayment,
    isTransfer,
} from './financial-ledger.js';

describe('regras centrais do razão financeiro', () => {
    it('classifica receitas, despesas, transferências e pagamentos de fatura sem duplicidade', () => {
        const transactions = [
            { tipo: 'receita', valor: 1000 },
            { tipo: 'despesa', valor: 200 },
            { tipo: 'pagamento-fatura', valor: 100, transferenciaInterna: true },
            { tipo: 'despesa', valor: 70, categoria: 'Pagamento de Fatura', formaPagamento: 'Automático (Agendamento)' },
            { tipo: 'transferencia', valor: 300 },
            { tipo: 'receita', valor: 50, transferenciaInterna: true },
        ];

        expect(calculatePeriodTotals(transactions)).toEqual({
            income: 1000,
            expense: 200,
            transfers: 450,
            invoicePayments: 170,
        });
    });

    it('transferência não altera receitas nem despesas e pagamento de fatura não duplica a despesa do cartão', () => {
        const before = calculatePeriodTotals([
            { tipo: 'receita', valor: 900 },
            { tipo: 'despesa', valor: 100, isCartao: true },
        ]);
        const after = calculatePeriodTotals([
            { tipo: 'receita', valor: 900 },
            { tipo: 'despesa', valor: 100, isCartao: true },
            { tipo: 'despesa', valor: 500, transferenciaInterna: true },
            { tipo: 'receita', valor: 500, transferenciaInterna: true, transferenciaEntrada: true },
            { tipo: 'pagamento-fatura', valor: 100, transferenciaInterna: true },
        ]);

        expect(after.income).toBe(before.income);
        expect(after.expense).toBe(before.expense);
        expect(after.invoicePayments).toBe(100);
    });

    it('mantém pagamentos de fatura fora de receitas e despesas comuns', () => {
        const payment = { tipo: 'pagamento-fatura', valor: 100 };
        const scheduledPayment = {
            tipo: 'despesa',
            valor: 100,
            categoria: 'Pagamento de Fatura',
            formaPagamento: 'Automático (Agendamento)',
        };

        expect(isInvoicePayment(payment)).toBe(true);
        expect(isInvoicePayment(scheduledPayment)).toBe(true);
        expect(isTransfer(payment)).toBe(false);
        expect(isTransfer({ ...payment, transferenciaInterna: true })).toBe(true);
        expect(isIncome(payment)).toBe(false);
        expect(isExpense(payment)).toBe(false);
        expect(isExpense(scheduledPayment)).toBe(false);
    });

    it('reconhece as formas atuais e legadas de transferência', () => {
        expect(isTransfer({ tipo: 'transferencia' })).toBe(true);
        expect(isTransfer({ transferenciaInterna: true })).toBe(true);
        expect(isTransfer({ tipoTransferencia: 'interna' })).toBe(true);
        expect(isIncome({ tipo: 'receita', transferenciaInterna: true })).toBe(false);
        expect(isExpense({ tipo: 'despesa', transferenciaInterna: true })).toBe(false);
    });

    it('não falha com uma entrada inválida nem inventa valor para valor não numérico', () => {
        expect(calculatePeriodTotals([null, { tipo: 'despesa', valor: 'inválido' }])).toEqual({
            income: 0,
            expense: 0,
            transfers: 0,
            invoicePayments: 0,
        });
        expect(calculatePeriodTotals(null)).toEqual({
            income: 0,
            expense: 0,
            transfers: 0,
            invoicePayments: 0,
        });
    });
});
