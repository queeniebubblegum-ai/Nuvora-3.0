import { describe, expect, it, beforeEach } from 'vitest';
import { db, ReconciliationRepo } from './db.js';

describe('Postagem idempotente dos ajustes de fatura', () => {
  beforeEach(() => {
    db.transacoes = [];
    db.bancos = [{ id: 'bank-1', saldo: 1000 }];
    db.cartoes = [{ id: 'card-1', bancoId: 'bank-1', fechamento: 20, vencimento: 10 }];
    db.conciliacoesFaturas = [];
    db.categorias = [{ nome: 'Encargos financeiros' }, { nome: 'Reembolso / estorno' }];
  });

  it('creates a linked expense on the due date and does not duplicate on repeat', () => {
    const a = ReconciliationRepo.saveAdjustment('card-1', 2026, 7, { id: 'aj-1', type: 'interest', description: 'Juros', amount: 12, effect: 'charge' });
    const first = ReconciliationRepo.createAdjustmentTransaction('card-1', 2026, 7, a.id);
    const second = ReconciliationRepo.createAdjustmentTransaction('card-1', 2026, 7, a.id);
    expect(first.ok).toBe(true);
    expect(second.alreadyExists).toBe(true);
    expect(db.transacoes).toHaveLength(1);
    expect(db.transacoes[0]).toMatchObject({ id: expect.any(String), tipo: 'despesa', bancoId: 'bank-1', data: '2026-08-10', reconciliationAdjustmentId: 'aj-1' });
    expect(ReconciliationRepo.listAdjustments('card-1', 2026, 7)[0].lancamentoCriado).toBe(true);
  });

  it('posts a refund as positive income and links it without touching card purchases', () => {
    ReconciliationRepo.saveAdjustment('card-1', 2026, 7, { id: 'aj-ref', type: 'refund', description: 'Estorno', amount: 5, effect: 'credit' });
    const result = ReconciliationRepo.createAdjustmentTransaction('card-1', 2026, 7, 'aj-ref');
    expect(result.transaction).toMatchObject({ tipo: 'receita', valor: 5, isCartao: false, origem: 'conciliacao_fatura' });
    expect(db.bancos[0].saldo).toBe(1005);
  });
});
