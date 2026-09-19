import { describe, expect, it } from 'vitest';
import { buildCashflowModel, reportPeriodLabel } from './report-data.js';

describe('modelo do relatório de Fluxo de Caixa', () => {
    const referenceDate = new Date('2026-09-19T12:00:00');

    it('usa o mesmo período para métricas e buckets sem inventar movimentações', () => {
        const model = buildCashflowModel({ transacoes: [
            { data: '2026-09-03', tipo: 'receita', valor: 1000 },
            { data: '2026-09-05', tipo: 'despesa', valor: 250 },
            { data: '2026-08-20', tipo: 'receita', valor: 999 },
            { data: '2026-09-08', tipo: 'transferencia', valor: 700, transferenciaInterna: true }
        ] }, 1, referenceDate);

        expect(model.entradas).toBe(1000);
        expect(model.saidas).toBe(250);
        expect(model.activeBuckets).toHaveLength(2);
        expect(model.buckets.at(-1).acumulado).toBe(750);
    });

    it('agrega períodos longos por mês e mantém meses sem movimento honestos', () => {
        const model = buildCashflowModel({ transacoes: [
            { data: '2026-07-14', tipo: 'receita', valor: 500 },
            { data: '2026-09-02', tipo: 'despesa', valor: 100 }
        ] }, 3, referenceDate);

        expect(model.isDaily).toBe(false);
        expect(model.buckets).toHaveLength(3);
        expect(model.activeBuckets).toHaveLength(2);
        expect(model.buckets[1].entradas).toBe(0);
        expect(model.buckets[2].saidas).toBe(100);
    });

    it('identifica corretamente o estado vazio', () => {
        const model = buildCashflowModel({ transacoes: [] }, 1, referenceDate);
        expect(model.hasMovement).toBe(false);
        expect(reportPeriodLabel(1)).toBe('Mês atual');
    });
});
