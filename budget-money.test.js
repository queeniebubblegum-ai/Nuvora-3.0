import { beforeEach, describe, expect, it } from 'vitest';
import { db, Database } from './db.js';
import { PageComponents } from './cmp-pages.js';

describe('valores monetários de orçamento', () => {
    beforeEach(() => {
        db.bancos = [];
        db.transacoes = [];
        db.orcamentos = [];
    });

    it('normaliza os limites e agrega orçamento/gastos em centavos inteiros', () => {
        Database.add('orcamentos', {
            id: 'budget-1', categoria: 'Compras', limite: 0.1 + 0.2, ano: 2026, mes: 8
        });
        Database.add('orcamentos', {
            id: 'budget-2', categoria: 'Transporte', limite: 0.3, ano: 2026, mes: 8
        });
        Database.add('transacoes', {
            id: 'expense-1', categoria: 'Compras', valor: 0.1, tipo: 'despesa', data: '2026-09-10'
        });
        Database.add('transacoes', {
            id: 'expense-2', categoria: 'Compras', valor: 0.2, tipo: 'despesa', data: '2026-09-11'
        });

        const summary = PageComponents.budgetSummary(db.orcamentos, db.transacoes, {
            budgetYear: 2026,
            budgetMonth: 8
        });

        expect(summary.totalOrcado).toBe(0.6);
        expect(summary.gastosPorCat.Compras).toBe(0.3);
        expect(summary.totalGastoMes).toBe(0.3);
        expect(summary.disponivelGeral).toBe(0.3);
    });
});
