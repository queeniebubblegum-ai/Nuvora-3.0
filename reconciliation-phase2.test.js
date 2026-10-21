import { describe, expect, it } from 'vitest';
import { calculateReconciliation, RECONCILIATION_STATUS, calculateAdjustmentTotal } from './reconciliation.js';

describe('Conciliação fase 2 — ajustes explicativos', () => {
  it('soma encargos e subtrai créditos sem alterar compras', () => {
    const result = calculateReconciliation([{ valor: 100 }], 105, [
      { type: 'interest', description: 'Juros', amount: 3, effect: 'charge' },
      { type: 'refund', description: 'Estorno', amount: 1, sign: -1 }
    ]);
    expect(result).toMatchObject({ totalRecorded: 100, totalAdjustments: 2, explainedTotal: 102, difference: 3, status: RECONCILIATION_STATUS.DIFFERENCE });
  });
  it('concilia quando ajustes explicam exatamente a diferença, inclusive ID do cartão textual', () => {
    const result = calculateReconciliation([{ valor: 100 }], 102, [{ amount: 2, effect: 'charge' }]);
    expect(result.status).toBe(RECONCILIATION_STATUS.RECONCILED);
    expect(calculateAdjustmentTotal([{ amount: 2, sign: -1 }, { amount: 1, effect: 'charge' }])).toBe(-1);
  });
});
