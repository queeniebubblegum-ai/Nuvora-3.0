import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, BankRepo, CardRepo, CategoryRepo, TransactionsRepo, BudgetRepo } from './db.js';

// Mock do localStorage para garantir um ambiente limpo isolado do navegador real
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: vi.fn(key => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Lógica Matemática e Repositórios - db.js', () => {
    
    beforeEach(() => {
        // Limpa o mock e reseta o banco de dados na memória antes de cada teste
        window.localStorage.clear();
        db.transacoes = [];
        db.bancos = [
            { id: 1, nome: 'Conta Principal', saldo: 1000, saldoInicial: 1000, cor: 'blue' }
        ];
        db.cartoes = [];
        db.orcamentos = [];
    });

    it('Deve manter limites de orçamento separados por mês', () => {
        BudgetRepo.updateLimit('Alimentação', 800, 2026, 7);
        BudgetRepo.updateLimit('Alimentação', 1000, 2026, 8);
        expect(db.orcamentos).toHaveLength(2);
        expect(db.orcamentos.find(o => o.mes === 7).limite).toBe(800);
        expect(db.orcamentos.find(o => o.mes === 8).limite).toBe(1000);
    });

    it('Deve recalcular corretamente o saldo da conta bancária (Soma de Receitas e Despesas)', () => {
        TransactionsRepo.add({
            id: 1, desc: 'Salário', valor: 5000, tipo: 'receita', bancoId: 1, isCartao: false, data: new Date().toISOString().split('T')[0]
        });
        
        TransactionsRepo.add({
            id: 2, desc: 'Aluguel', valor: 1500, tipo: 'despesa', bancoId: 1, isCartao: false, data: new Date().toISOString().split('T')[0]
        });

        // O saldo esperado deve ser: 1000 (Inicial) + 5000 (Receita) - 1500 (Despesa) = 4500
        expect(db.bancos[0].saldo).toBe(4500);
    });

    it('Deve isolar transações de cartão de crédito do recálculo de saldo da conta corrente', () => {
        TransactionsRepo.add({
            id: 3, desc: 'Compra Cartão', valor: 300, tipo: 'despesa', bancoId: 99, isCartao: true, data: new Date().toISOString().split('T')[0]
        });

        // O saldo esperado deve permanecer apenas o saldo inicial
        expect(db.bancos[0].saldo).toBe(1000);
    });

    it('Deve dividir corretamente o valor das parcelas do cartão de crédito compensando dízimas periódicas', () => {
        const compra = {
            id: 100,
            desc: 'Geladeira',
            total: 1000,
            parcelas: 3,
            cartaoId: 99,
            categoria: 'Moradia',
            data: new Date().toISOString().split('T')[0]
        };

        TransactionsRepo.addCardExpense(compra);

        const transacoesCartao = db.transacoes.filter(t => t.grupoId === 100 || t.id === 100);
        
        expect(transacoesCartao.length).toBe(3);

        const t1 = transacoesCartao.find(t => t.parcelaAtual === 1);
        const t2 = transacoesCartao.find(t => t.parcelaAtual === 2);
        const t3 = transacoesCartao.find(t => t.parcelaAtual === 3);

        expect(t2.valor).toBe(333.33);
        expect(t3.valor).toBe(333.33);
        expect(t1.valor).toBe(333.34);
        
        expect(t1.valor + t2.valor + t3.valor).toBe(1000);
    });
    it('não deve excluir conta bancária que possui dados vinculados', () => {
        db.transacoes = [{ id: 10, bancoId: 1, isCartao: false, valor: 10, tipo: 'despesa' }];
        expect(BankRepo.remove(1)).toBe(false);
        expect(db.bancos).toHaveLength(1);
    });

    it('não deve excluir cartão que possui compras vinculadas', () => {
        db.transacoes = [{ id: 11, bancoId: 99, isCartao: true, valor: 10, tipo: 'despesa' }];
        expect(CardRepo.remove(99)).toBe(false);
    });

    it('não deve excluir categoria usada por uma transação', () => {
        db.transacoes = [{ id: 12, categoria: 'Alimentação', valor: 10, tipo: 'despesa' }];
        expect(CategoryRepo.remove('cat_1')).toBe(false);
    });

});