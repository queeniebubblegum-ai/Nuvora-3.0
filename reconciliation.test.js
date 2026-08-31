import { describe, it, expect } from 'vitest';
import { calculateReconciliation, listInvoiceTransactions, getInvoicePeriod, RECONCILIATION_STATUS } from './reconciliation.js';

describe('Conciliação de faturas (fase 1)', () => {
  const card = { id: 7, fechamento: 10 };
  it('lista somente transações do cartão dentro do período de fechamento', () => {
    const tx = [
      { id: 1, isCartao: true, bancoId: 7, data: '2026-07-11', valor: 20 },
      { id: 2, isCartao: true, bancoId: 7, data: '2026-08-10', valor: 30 },
      { id: 3, isCartao: true, bancoId: 7, data: '2026-08-11', valor: 99 },
      { id: 4, isCartao: true, bancoId: 8, data: '2026-08-01', valor: 50 },
      { id: 5, isCartao: true, bancoId: 7, data: '2026-08-01', valor: 80, transferenciaInterna: true }
    ];
    expect(listInvoiceTransactions(tx, card, 2026, 7).map(t => t.id)).toEqual([1, 2]);
  });
  it('calcula total, diferença e estados sem alterar o status de pagamento', () => {
    const tx = [{ valor: 10 }, { valor: 20.005 }];
    expect(calculateReconciliation(tx)).toMatchObject({ totalRecorded: 30.01, realInvoiceAmount: null, difference: null, status: RECONCILIATION_STATUS.PENDING });
    expect(calculateReconciliation(tx, 31)).toMatchObject({ difference: 0.99, status: RECONCILIATION_STATUS.DIFFERENCE });
    expect(calculateReconciliation(tx, 30.01).status).toBe(RECONCILIATION_STATUS.RECONCILED);
    expect(calculateReconciliation([], null).status).toBe(RECONCILIATION_STATUS.OPEN);
  });
  it('mantém o período inclusivo, inclusive no fechamento', () => {
    const { start, end } = getInvoicePeriod(card, 2026, 7);
    expect(start.toISOString().slice(0, 10)).toBe('2026-07-11');
    expect(end.toISOString().slice(0, 10)).toBe('2026-08-10');
  });
});
