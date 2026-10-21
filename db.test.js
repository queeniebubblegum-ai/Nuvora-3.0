import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, Database, BankRepo, CardRepo, CategoryRepo, TransactionsRepo, BudgetRepo, GoalRepo } from './db.js';
import { toCents } from './money-math.js';

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
        db.metas = [];
        db.reservas = [];
    });

    it('usa o razão central para receitas e despesas agregadas sem contar transferência ou pagamento de fatura como despesa comum', () => {
        db.transacoes = [
            { tipo: 'receita', valor: 1000 },
            { tipo: 'despesa', valor: 200 },
            { tipo: 'despesa', valor: 300, transferenciaInterna: true },
            { tipo: 'pagamento-fatura', valor: 100, transferenciaInterna: true },
            { tipo: 'despesa', valor: 70, categoria: 'Pagamento de Fatura', formaPagamento: 'Automático (Agendamento)' },
        ];

        expect(Database.getTotals()).toMatchObject({ receitas: 1000, despesas: 200, saldo: 1000 });
    });

    it('Deve manter limites de orçamento separados por mês', () => {
        BudgetRepo.updateLimit('Alimentação', 800, 2026, 7);
        BudgetRepo.updateLimit('Alimentação', 1000, 2026, 8);
        expect(db.orcamentos).toHaveLength(2);
        expect(db.orcamentos.find(o => o.mes === 7).limite).toBe(800);
        expect(db.orcamentos.find(o => o.mes === 8).limite).toBe(1000);
        BudgetRepo.updateLimit('Serviços', 0.1 + 0.2, 2026, 8);
        expect(toCents(db.orcamentos.find(o => o.categoria === 'Serviços').limite)).toBe(30);
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

    it('não reaplica nem reverte transações já incluídas no saldo final confirmado do OFX', () => {
        TransactionsRepo.add({
            id: 'ofx-anchored-1', desc: 'Compra do extrato', valor: 100, tipo: 'despesa', bancoId: 1,
            isCartao: false, saldoIncluidoNoSaldoDoExtrato: true, data: '2026-08-02'
        });
        expect(db.bancos[0].saldo).toBe(1000);

        TransactionsRepo.update('ofx-anchored-1', { valor: 150 });
        expect(db.bancos[0].saldo).toBe(1000);

        TransactionsRepo.delete('ofx-anchored-1');
        expect(db.bancos[0].saldo).toBe(1000);
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
    it('divide valores pequenos de compra no cartão sem perder centavos', () => {
        TransactionsRepo.addCardExpense({
            id: 'small-purchase', desc: 'Compra pequena', total: 0.1, parcelas: 3,
            cartaoId: 99, categoria: 'Compras', data: '2026-08-10'
        });
        const parcelas = db.transacoes
            .filter(t => t.grupoId === 'small-purchase')
            .sort((a, b) => a.parcelaAtual - b.parcelaAtual);

        expect(parcelas.map(t => t.valor)).toEqual([0.04, 0.03, 0.03]);
        expect(parcelas.reduce((sum, t) => sum + toCents(t.valor), 0)).toBe(10);
    });

    it('repete o valor por ocorrência da recorrência, normalizado em centavos', () => {
        TransactionsRepo.addRecurrent({
            desc: 'Mensalidade', valor: 0.1, tipo: 'despesa', bancoId: 1,
            isCartao: false, data: '2026-08-31'
        }, 3);
        const parcelas = db.transacoes.filter(t => t.desc === 'Mensalidade');

        expect(parcelas).toHaveLength(3);
        expect(parcelas.map(t => t.valor)).toEqual([0.1, 0.1, 0.1]);
        expect(parcelas.reduce((sum, t) => sum + toCents(t.valor), 0)).toBe(30);
        expect(db.bancos[0].saldo).toBe(999.7);
    });

    it('registra aporte como reserva virtual sem transferir nem reduzir o saldo bancário', async () => {
        db.bancos[0].saldo = 1000;
        GoalRepo.add({ id: 'goal-cents', nome: 'Reserva', atual: 0, alvo: 2.345 });
        const beforeTotals = Database.getTotals();
        await GoalRepo.deposit('goal-cents', 1, 0.2, '2026-09-23');

        const goal = db.metas.find(item => item.id === 'goal-cents');
        const reserve = db.reservas.find(item => item.id === goal.reservaId);
        expect(toCents(goal.atual)).toBe(20);
        expect(toCents(goal.alvo)).toBe(235);
        expect(toCents(db.bancos[0].saldo)).toBe(100000);
        expect(toCents(reserve.saldo)).toBe(20);
        expect(reserve.movimentos).toHaveLength(1);
        expect(reserve.movimentos[0]).toMatchObject({ tipo: 'aporte', contaId: '1', valor: 0.2, data: '2026-09-23' });
        expect(db.transacoes).toHaveLength(0);
        expect(Database.getTotals()).toMatchObject({ receitas: beforeTotals.receitas, despesas: beforeTotals.despesas, saldo: 1000, saldoBancario: 1000, saldoDisponivel: 999.8, saldoReservado: 0.2, saldoTotal: 1000 });
        await expect(Database.addTransfer({ sourceAccountId: 1, destinationAccountId: goal.reservaId, amount: 1, date: '2026-09-24' })).rejects.toThrow('Reservas de metas são virtuais');
    });

    it('recusa aporte acima do disponível sem alterar saldo ou reserva', async () => {
        db.bancos[0].saldo = 100;
        GoalRepo.add({ id: 'goal-cap', nome: 'Reserva limitada', atual: 0, alvo: 100 });
        await GoalRepo.deposit('goal-cap', 1, 80, '2026-09-23');
        await expect(GoalRepo.deposit('goal-cap', 1, 21, '2026-09-24')).rejects.toThrow('saldo disponível');
        expect(db.bancos[0].saldo).toBe(100);
        expect(db.reservas[0].saldo).toBe(80);
        expect(db.reservas[0].movimentos).toHaveLength(1);
    });

    it('resgata a alocação sem movimentar saldo bancário e preserva o histórico da meta', async () => {
        GoalRepo.add({ id: 'goal-history', nome: 'Meta com histórico', atual: 0, alvo: 100 });
        await GoalRepo.deposit('goal-history', 1, 25, '2026-09-23');
        await GoalRepo.release('goal-history', 25, '2026-09-24');
        const goal = db.metas.find(item => item.id === 'goal-history');
        const reserve = db.reservas.find(item => item.id === goal.reservaId);
        expect(toCents(goal.atual)).toBe(0);
        expect(toCents(reserve.saldo)).toBe(0);
        expect(toCents(db.bancos[0].saldo)).toBe(100000);
        expect(reserve.movimentos.map(item => item.tipo)).toEqual(['aporte', 'resgate']);
        expect(GoalRepo.remove('goal-history')).toBe(false);
        expect(db.reservas.some(item => item.id === goal.reservaId)).toBe(true);
        expect(BankRepo.remove(1)).toBe(false);
    });

    it('mantém o saldo conciliado intacto ao editar, excluir e restaurar aportes antigos', async () => {
        const reserveId = 'reserve-legacy';
        const shared = {
            transferenciaId: 'legacy-transfer-1',
            transferenciaInterna: true,
            valor: 100,
            data: '2026-09-23',
            desc: 'Aporte legado',
            categoria: 'Transferência',
            contaOrigemId: 1,
            contaDestinoId: reserveId
        };
        await Database.replaceAll({
            bancos: [{ id: 1, nome: 'Conta conciliada', saldo: 4100 }],
            metas: [{ id: 'goal-legacy', nome: 'Reserva antiga', atual: 100, alvo: 500, reservaId: reserveId }],
            reservas: [{ id: reserveId, goalId: 'goal-legacy', nome: 'Reserva antiga', saldo: 100 }],
            transacoes: [
                { ...shared, id: 'legacy-out', tipo: 'despesa', transferenciaEntrada: false, bancoId: 1 },
                { ...shared, id: 'legacy-in', tipo: 'receita', transferenciaEntrada: true, bancoId: reserveId }
            ]
        });

        expect(db.bancos[0].saldo).toBe(4100);
        expect(Database.getTotals()).toMatchObject({ saldoBancario: 4100, saldoReservado: 100, saldoDisponivel: 4000, saldoTotal: 4100 });
        expect(db.transacoes.every(item => item.alocacaoMetaVirtual === true)).toBe(true);
        await expect(Database.updateTransaction('legacy-out', { valor: 125 })).resolves.toBe(true);
        expect(db.bancos[0].saldo).toBe(4100);
        expect(db.reservas[0].saldo).toBe(125);
        expect(db.metas[0].atual).toBe(125);

        const removed = await Database.removeMultiple('transacoes', ['legacy-out']);
        expect(db.bancos[0].saldo).toBe(4100);
        expect(db.reservas[0].saldo).toBe(0);
        expect(db.metas[0].atual).toBe(0);

        await Database.restoreTransactions(removed);
        expect(db.transacoes.filter(item => item.transferenciaId === 'legacy-transfer-1')).toHaveLength(2);
        expect(db.transacoes.every(item => item.alocacaoMetaVirtual === true)).toBe(true);
        expect(db.bancos[0].saldo).toBe(4100);
        expect(db.reservas[0].saldo).toBe(125);
        expect(db.metas[0].atual).toBe(125);
    });

    it('cria transferência entre bancos de forma atômica, conserva o total e sincroniza a edição pelas duas pernas', async () => {
        db.bancos.push({ id: 2, nome: 'Conta secundária', saldo: 200 });
        const beforeTotal = Database.getTotals().saldoTotal;
        const result = await Database.addTransfer({ sourceAccountId: 1, destinationAccountId: 2, amount: 125.45, date: '2026-09-23', description: 'Transferência inicial' });
        expect(result.transactions).toHaveLength(2);
        expect(result.transactions[0]).toMatchObject({ tipo: 'despesa', transferenciaEntrada: false, bancoId: 1, valor: 125.45 });
        expect(result.transactions[1]).toMatchObject({ tipo: 'receita', transferenciaEntrada: true, bancoId: 2, valor: 125.45 });
        expect(result.transactions[0].transferenciaId).toBe(result.transactions[1].transferenciaId);
        expect(db.bancos.map(bank => bank.saldo)).toEqual([874.55, 325.45]);
        expect(Database.getTotals()).toMatchObject({ receitas: 0, despesas: 0, saldoTotal: beforeTotal });

        const incomingId = result.transactions[1].id;
        await expect(Database.updateTransaction(incomingId, { desc: 'Transferência alterada', valor: 100, data: '2026-09-22', categoria: 'Transferência revisada' })).resolves.toBe(true);
        const updatedLegs = db.transacoes.filter(item => item.transferenciaId === result.transferId);
        expect(updatedLegs).toHaveLength(2);
        expect(updatedLegs.map(item => item.desc)).toEqual(['Transferência alterada', 'Transferência alterada']);
        expect(updatedLegs.map(item => item.valor)).toEqual([100, 100]);
        expect(updatedLegs.map(item => item.data)).toEqual(['2026-09-22', '2026-09-22']);
        expect(updatedLegs.map(item => item.categoria)).toEqual(['Transferência revisada', 'Transferência revisada']);
        expect(db.bancos.map(bank => bank.saldo)).toEqual([900, 300]);
        expect(Database.getTotals().saldoTotal).toBe(beforeTotal);
    });

    it('permite remover pagamento de fatura de uma perna sem confundi-lo com transferência órfã', async () => {
        TransactionsRepo.add({ id: 'invoice-payment-row', tipo: 'pagamento-fatura', transferenciaInterna: true, valor: 75, bancoId: 1, data: '2026-09-23' });
        expect(db.bancos[0].saldo).toBe(925);
        await Database.remove('transacoes', 'invoice-payment-row');
        expect(db.transacoes).toHaveLength(0);
        expect(db.bancos[0].saldo).toBe(1000);
    });

    it('excluir qualquer perna remove o par completo e desfaz os dois saldos juntos', async () => {
        db.bancos.push({ id: 2, nome: 'Conta secundária', saldo: 200 });
        const { transferId, transactions } = await Database.addTransfer({ sourceAccountId: 1, destinationAccountId: 2, amount: 100, date: '2026-09-23' });
        await Database.remove('transacoes', transactions[0].id);
        expect(db.transacoes.filter(item => item.transferenciaId === transferId)).toHaveLength(0);
        expect(db.bancos.map(bank => bank.saldo)).toEqual([1000, 200]);
    });

    it('remove uma seleção mista de transferências e lançamentos comuns e restaura todo o snapshot', async () => {
        db.bancos.push({ id: 2, nome: 'Conta secundária', saldo: 200 });
        TransactionsRepo.add({ id: 'ordinary-row', desc: 'Despesa', valor: 25, tipo: 'despesa', bancoId: 1, data: '2026-09-23' });
        const transfer = await Database.addTransfer({ sourceAccountId: 1, destinationAccountId: 2, amount: 100, date: '2026-09-23' });
        const originalBalancesAfterAdds = db.bancos.map(bank => bank.saldo);
        const removed = await Database.removeMultiple('transacoes', ['ordinary-row', transfer.transactions[0].id]);
        expect(removed).toHaveLength(3);
        expect(db.transacoes).toHaveLength(0);
        expect(db.bancos.map(bank => bank.saldo)).toEqual([1000, 200]);

        await Database.restoreTransactions(removed);
        expect(db.transacoes).toHaveLength(3);
        expect(db.bancos.map(bank => bank.saldo)).toEqual(originalBalancesAfterAdds);
    });

    it('rejeita uma transferência inválida sem alterar transações ou saldos e bloqueia lançamentos de uma perna', async () => {
        const previousTransactions = [...db.transacoes];
        const previousBalances = db.bancos.map(bank => bank.saldo);
        await expect(Database.addTransfer({ sourceAccountId: 1, destinationAccountId: 1, amount: 5, date: '2026-09-23' })).rejects.toThrow();
        expect(TransactionsRepo.add({ id: 'orphan-add', transferenciaId: 'transfer-orphan-add', transferenciaInterna: true, tipo: 'despesa', transferenciaEntrada: false, bancoId: 1, valor: 5 })).toBe(false);
        expect(db.transacoes).toEqual(previousTransactions);
        expect(db.bancos.map(bank => bank.saldo)).toEqual(previousBalances);
    });

    it('recusa editar ou apagar transferência órfã antes de qualquer mutação', async () => {
        db.bancos.push({ id: 2, nome: 'Conta secundária', saldo: 0 });
        db.transacoes = [{ id: 'orphan', transferenciaId: 'transfer-orphan', transferenciaInterna: true, transferenciaEntrada: false, tipo: 'despesa', bancoId: 1, contaOrigemId: 1, contaDestinoId: 2, valor: 10, data: '2026-09-23' }];
        const before = db.bancos.map(bank => bank.saldo);
        expect(await Database.updateTransaction('orphan', { valor: 12 })).toBe(false);
        await expect(Database.remove('transacoes', 'orphan')).rejects.toThrow('incompleta');
        expect(db.transacoes).toHaveLength(1);
        expect(db.bancos.map(bank => bank.saldo)).toEqual(before);
    });

    it('migra metas de backup legado preservando saldo bancário e separando o valor reservado', async () => {
        db.reservas = [{ id: 'stale-reserve', goalId: 'deleted-goal', nome: 'Antiga', saldo: 500 }];
        await Database.replaceAll({
            bancos: [{ id: 'bank-legacy', nome: 'Conta antiga', saldo: 999 }],
            transacoes: [{ id: 'legacy-deposit', desc: 'Depósito antigo', valor: 1, tipo: 'despesa', bancoId: 'bank-legacy', data: '2026-09-01' }],
            metas: [{ id: 'legacy-goal', nome: 'Viagem', atual: 1, alvo: 10 }]
        });
        expect(db.reservas).toHaveLength(1);
        expect(db.reservas[0]).toMatchObject({ goalId: 'legacy-goal', saldo: 1 });
        expect(db.metas[0].reservaId).toBe(db.reservas[0].id);
        expect(Database.getTotals()).toMatchObject({ saldo: 999, saldoBancario: 999, saldoDisponivel: 998, saldoReservado: 1, saldoTotal: 999 });
    });

    it('restaura o histórico de movimentos da reserva uma única vez e preserva saldos bancários', async () => {
        const movement = { id: 'movement-backup', tipo: 'aporte', contaId: 'bank-restore', valor: 1500, data: '2026-09-20' };
        await Database.replaceAll({
            bancos: [{ id: 'bank-restore', nome: 'Conta conciliada', saldo: 4200 }],
            metas: [{ id: 'goal-restore', reservaId: 'reserve-restore', nome: 'Emergência', atual: 1500, alvo: 5000 }],
            // Legacy backups may omit goalId; the matching reserve must not also
            // be retained as an unlinked reserve during normalization.
            reservas: [{ id: 'reserve-restore', nome: 'Reserva: Emergência', saldo: 1500, movimentos: [movement] }],
            transacoes: []
        });

        expect(db.bancos[0].saldo).toBe(4200);
        expect(db.reservas).toHaveLength(1);
        expect(db.reservas[0]).toMatchObject({ goalId: 'goal-restore', saldo: 1500, movimentos: [movement] });
        expect(Database.getTotals()).toMatchObject({ saldoBancario: 4200, saldoReservado: 1500, saldoDisponivel: 2700, saldoTotal: 4200 });
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