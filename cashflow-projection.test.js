import { describe, expect, it } from 'vitest';
import { buildDailyCashflowProjection, cashflowProjectionFromDatabase } from './cashflow-projection.js';

const reference = new Date(2026, 8, 23, 12);

describe('projeção diária conservadora do fluxo de caixa', () => {
    it('projeta receitas e compromissos datados por dia, sem recontar realizados ou transferências', () => {
        const projection = buildDailyCashflowProjection({
            currentBalance: 1000,
            now: reference,
            horizonDays: 7,
            futureIncome: [
                { id: 'salary', desc: 'Salário', valor: 300, data: '2026-09-25', status: 'prevista' },
                { id: 'paid-income', valor: 500, data: '2026-09-24', status: 'recebida' },
                { id: 'outside-income', valor: 999, data: '2026-10-30', status: 'prevista' },
            ],
            pendingMovements: [
                { id: 'rent', desc: 'Aluguel', valor: 250, dataVencimento: '2026-09-24', status: 'pendente', tipo: 'despesa' },
                { id: 'overdue', desc: 'Conta atrasada', valor: 50, dataVencimento: '2026-09-22', status: 'pendente', tipo: 'despesa' },
                { id: 'refund', desc: 'Reembolso', valor: 75, dataVencimento: '2026-09-27', status: 'pendente', tipo: 'receita' },
                { id: 'paid-bill', valor: 400, dataVencimento: '2026-09-26', status: 'pago', tipo: 'despesa' },
                { id: 'internal-transfer', valor: 800, dataVencimento: '2026-09-25', status: 'pendente', tipo: 'despesa', transferenciaInterna: true },
            ],
            recurringForecasts: [
                { id: 'streaming', nome: 'Streaming', valor: 60, periodicidade: 'mensal', proximaCobranca: '2026-09-26', ativa: true },
                { id: 'without-date', nome: 'Sem vencimento', valor: 900, periodicidade: 'mensal', ativa: true },
            ],
        });

        expect(projection.available).toBe(true);
        expect(projection.expectedIncome).toBe(375);
        expect(projection.pendingExpenses).toBe(360);
        expect(projection.endingBalance).toBe(1015);
        expect(projection.minimumClosingBalance).toBe(700);
        expect(projection.days.find(day => day.dateKey === '2026-09-23').movements[0]).toMatchObject({ description: 'Conta atrasada', overdue: true });
        expect(projection.days.find(day => day.dateKey === '2026-09-25').closingBalance).toBe(1000);
    });

    it('não fabrica projeção sem eventos datados e ignora compromissos fora do horizonte', () => {
        const projection = buildDailyCashflowProjection({
            currentBalance: 1000,
            now: reference,
            horizonDays: 7,
            futureIncome: [{ id: 'outside', valor: 100, data: '2026-10-30', status: 'prevista' }],
            pendingMovements: [],
            recurringForecasts: [{ id: 'no-date', valor: 50, periodicidade: 'mensal', ativa: true }],
        });
        expect(projection).toMatchObject({ available: false, currentBalance: 1000, expectedIncome: 0, pendingExpenses: 0 });
        expect(projection.endingBalance).toBeUndefined();
    });

    it('repete assinaturas mensais com segurança e não duplica a ocorrência já agendada', () => {
        const projection = buildDailyCashflowProjection({
            currentBalance: 500,
            now: reference,
            horizonDays: 45,
            pendingMovements: [{ id: 'schedule-streaming', assinaturaId: 'streaming', valor: 10, dataVencimento: '2026-09-30', status: 'pendente', tipo: 'despesa' }],
            recurringForecasts: [{ id: 'streaming', nome: 'Streaming', valor: 10, periodicidade: 'mensal', proximaCobranca: '2026-08-31', ativa: true }],
        });
        expect(projection.available).toBe(true);
        expect(projection.pendingExpenses).toBe(20);
        expect(projection.movements.filter(item => item.description === 'Streaming')).toHaveLength(1);
        expect(projection.movements.filter(item => item.description === 'Streaming')[0].dateKey).toBe('2026-10-31');
        expect(projection.movements.filter(item => item.description === 'Movimentação prevista')).toHaveLength(1);
        expect(projection.movements.filter(item => item.description === 'Movimentação prevista')[0].dateKey).toBe('2026-09-30');
    });

    it('mantém os centavos e sinaliza o primeiro saldo negativo projetado', () => {
        const projection = buildDailyCashflowProjection({
            currentBalance: 0.3,
            now: reference,
            horizonDays: 3,
            pendingMovements: [{ id: 'bill', valor: 0.4, dataVencimento: '2026-09-24', status: 'pendente', tipo: 'despesa' }],
        });
        expect(projection.endingBalance).toBe(-0.1);
        expect(projection.minimumClosingBalance).toBe(-0.1);
        expect(projection.minimumDate).toBe('2026-09-24');
        expect(projection.firstNegativeDate).toBe('2026-09-24');
    });

    it('usa apenas os saldos bancários disponíveis e deixa o estado neutro sem conta', () => {
        const projection = cashflowProjectionFromDatabase({
            bancos: [{ saldo: 1000 }],
            reservas: [{ saldo: 700 }],
            agendamentos: [{ id: 'bill', valor: 100, dataVencimento: '2026-09-24', status: 'pendente', tipo: 'despesa' }],
        }, { now: reference, horizonDays: 2 });
        expect(projection.currentBalance).toBe(1000);
        expect(projection.endingBalance).toBe(900);

        const noAccount = cashflowProjectionFromDatabase({
            bancos: [],
            agendamentos: [{ id: 'bill', valor: 100, dataVencimento: '2026-09-24', status: 'pendente', tipo: 'despesa' }],
        }, { now: reference });
        expect(noAccount).toMatchObject({ available: false, reason: 'Saldo atual ou data de referência indisponível.' });
    });
});
