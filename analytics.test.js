import { describe, it, expect } from 'vitest';
import { FinancialAnalytics } from './analytics.js';

const tx = [
    { data: '2026-08-05', tipo: 'receita', valor: 3000, categoria: 'Salário' },
    { data: '2026-08-06', tipo: 'despesa', valor: 100, categoria: 'Alimentação' },
    { data: '2026-08-07', tipo: 'despesa', valor: 200, categoria: 'Lazer', isCartao: true },
    { data: '2026-08-08', tipo: 'despesa', valor: 200, categoria: 'Pagamento de Fatura', formaPagamento: 'Automático (Agendamento)' },
    { data: '2026-08-09', tipo: 'transferencia', valor: 500, categoria: 'Transferência' }
];

describe('Análises financeiras', () => {
    it('não deve contar pagamento de fatura como nova despesa', () => {
        expect(FinancialAnalytics.totals(tx, 2026, 7)).toMatchObject({ receitas: 3000, despesas: 300, pagamentosFatura: 200 });
    });
    it('deve consolidar gastos por categoria', () => {
        expect(FinancialAnalytics.categoryTotals(tx, 2026, 7)).toEqual({ Alimentação: 100, Lazer: 200 });
    });
    it('deve gerar um dia por posição no mapa de calor', () => {
        const heat = FinancialAnalytics.heatmap(tx, 2026, 7);
        expect(heat).toHaveLength(31);
        expect(heat[5].valor).toBe(100);
    });
    it('deve comparar categorias e ordenar pela maior diferença', () => {
        const result = FinancialAnalytics.categoryComparison(tx, { year: 2026, month: 7 }, { year: 2026, month: 6 });
        expect(result[0]).toMatchObject({ categoria: 'Lazer', atual: 200, anterior: 0, variacao: null });
    });
    it('deve comparar meses sem inventar percentual quando o anterior é zero', () => {
        const result = FinancialAnalytics.compareMonths(tx, { year: 2026, month: 7 }, { year: 2026, month: 6 });
        expect(result.variacaoDespesas).toBeNull();
    });
});
