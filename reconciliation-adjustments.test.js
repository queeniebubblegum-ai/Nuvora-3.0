import { describe, expect, it, beforeEach } from 'vitest';
import { db, ReconciliationRepo, __setTransactionPersistenceWriterForTests } from './db.js';

describe('Postagem idempotente dos ajustes de fatura', () => {
  beforeEach(() => {
    __setTransactionPersistenceWriterForTests();
    db.transacoes = [];
    db.bancos = [{ id: 'bank-1', saldo: 1000 }];
    db.cartoes = [{ id: 'card-1', bancoId: 'bank-1', fechamento: 20, vencimento: 10 }];
    db.conciliacoesFaturas = [];
    db.categorias = [{ nome: 'Encargos financeiros' }, { nome: 'Reembolso / estorno' }];
  });

  it('creates a linked expense on the due date and does not duplicate on repeat', async () => {
    const a = await ReconciliationRepo.saveAdjustment('card-1', 2026, 7, { id: 'aj-1', type: 'interest', description: 'Juros', amount: 12, effect: 'charge' });
    const first = await ReconciliationRepo.createAdjustmentTransaction('card-1', 2026, 7, a.id);
    const second = await ReconciliationRepo.createAdjustmentTransaction('card-1', 2026, 7, a.id);
    expect(first.ok).toBe(true);
    expect(second.alreadyExists).toBe(true);
    expect(db.transacoes).toHaveLength(1);
    expect(db.transacoes[0]).toMatchObject({ id: expect.any(String), tipo: 'despesa', bancoId: 'card-1', isCartao: true, data: '2026-09-10', reconciliationAdjustmentId: 'aj-1' });
    expect(ReconciliationRepo.listAdjustments('card-1', 2026, 7)[0].lancamentoCriado).toBe(true);
  });

  it('posts a refund as a credit in the invoice without inventing bank income', async () => {
    await ReconciliationRepo.saveAdjustment('card-1', 2026, 7, { id: 'aj-ref', type: 'refund', description: 'Estorno', amount: 5, effect: 'credit' });
    const result = await ReconciliationRepo.createAdjustmentTransaction('card-1', 2026, 7, 'aj-ref');
    expect(result.transaction).toMatchObject({ tipo: 'estorno-cartao', valor: 5, isCartao: true, origem: 'conciliacao_fatura' });
    expect(db.bancos[0].saldo).toBe(1000);
  });

  it('normalizes saved invoice amounts and adjustments to exact cents before posting', async () => {
    await ReconciliationRepo.saveAmount('card-1', 2026, 7, 0.1 + 0.2);
    const saved = await ReconciliationRepo.saveAdjustment('card-1', 2026, 7, {
      id: 'aj-cents', type: 'interest', description: 'Juros', amount: 0.1 + 0.2, effect: 'charge'
    });

    expect(ReconciliationRepo.get('card-1', 2026, 7).valorFaturaReal).toBe(0.3);
    expect(saved.amount).toBe(0.3);
    const posted = await ReconciliationRepo.createAdjustmentTransaction('card-1', 2026, 7, 'aj-cents');
    expect(posted.transaction.valor).toBe(0.3);
    expect(db.bancos[0].saldo).toBe(1000);
  });
});
