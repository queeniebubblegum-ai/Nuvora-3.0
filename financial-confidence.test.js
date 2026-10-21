import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { db, Database, ReconciliationRepo, BankConferenceRepo, __setTransactionPersistenceWriterForTests } from './db.js';
import { invoiceModel, cardCreditUsed } from './invoice-model.js';
import { calculateReconciliation } from './reconciliation.js';
import { getReviewState } from './conferencing-model.js';
import { buildCashflowModel } from './report-data.js';

beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-21T16:00:00Z'));
    __setTransactionPersistenceWriterForTests();
    await Database.replaceAll({ bancos: [{ id: 'a', nome: 'Conta', saldo: 1000, saldoInicial: 1000, dataCriacao: '2026-01-01' }], cartoes: [{ id: 'c', bancoId: 'a', nome: 'Cartão', limite: 1000, fechamento: 25, vencimento: 5 }], transacoes: [], agendamentos: [] }, { mode: 'exact' });
});
afterEach(() => { __setTransactionPersistenceWriterForTests(); vi.useRealTimers(); });
const purchase = () => Database.addCardExpense({ id: 'purchase', desc: 'Compra', total: 100, parcelas: 1, cartaoId: 'c', categoria: 'Compras', data: '2026-10-18' });
const schedule = () => Database.add('agendamentos', { id: 'invoice', categoria: 'Fatura Cartão', cartaoId: 'c', mesReferencia: '2026-11', dataVencimento: '2026-11-05', valor: 100, status: 'pendente' });
const pay = (amount, operationId) => Database.recordInvoicePayment({ scheduleId: 'invoice', bankId: 'a', paymentDate: '2026-11-05', amount, operationId });

describe('garantias financeiras da experiência Avenera', () => {
    it('aplica uma única vez duas confirmações concorrentes do mesmo pagamento', async () => {
        await purchase(); await schedule();
        const results = await Promise.all([pay(100, 'same-operation'), pay(100, 'same-operation')]);
        expect(results.filter(r => r.alreadyExists)).toHaveLength(1);
        expect(db.transacoes.filter(t => t.tipo === 'pagamento-fatura')).toHaveLength(1);
        expect(db.bancos[0].saldo).toBe(900);
        expect(db.agendamentos[0].status).toBe('pago');
        expect(Database.getTotals().despesas).toBe(100);
    });
    it('mantém o restante após parcial e libera o comprometimento ao liquidar', async () => {
        await purchase(); await schedule(); await pay(40, 'partial-a');
        expect(invoiceModel(db, db.cartoes[0], 2026, 9)).toMatchObject({ paid: 40, outstanding: 60, paymentStatus: 'parcialmente paga' });
        expect(cardCreditUsed(db, db.cartoes[0])).toBe(60);
        await pay(60, 'partial-b'); await pay(60, 'partial-b');
        expect(db.bancos[0].saldo).toBe(900);
        expect(invoiceModel(db, db.cartoes[0], 2026, 9).outstanding).toBe(0);
        expect(cardCreditUsed(db, db.cartoes[0])).toBe(0);
    });
    it('recusa pagamento acima do devedor e reutilização do ID com outros dados', async () => {
        await schedule();
        await expect(pay(101, 'over')).rejects.toThrow('saldo devedor');
        await pay(40, 'partial');
        await expect(pay(50, 'partial')).rejects.toThrow('outros dados');
        expect(db.bancos[0].saldo).toBe(960);
    });
    it('recusa IDs de lançamento repetidos antes de aplicar novamente o saldo', async () => {
        const tx = { id: 'tx', desc: 'Despesa', tipo: 'despesa', valor: 10, bancoId: 'a', data: '2026-10-21' };
        await Database.add('transacoes', tx);
        await expect(Database.add('transacoes', tx)).rejects.toThrow('duplicata');
        expect(db.transacoes).toHaveLength(1); expect(db.bancos[0].saldo).toBe(990);
    });
    it('não confirma cadastro nem referência quando a persistência falha', async () => {
        __setTransactionPersistenceWriterForTests(() => Promise.reject(new Error('quota')));
        await expect(Database.add('bancos', { id: 'lost', nome: 'Conta', saldo: 50 })).rejects.toThrow('quota');
        await expect(ReconciliationRepo.saveAmount('c', 2026, 9, 100)).rejects.toThrow('quota');
        expect(db.bancos).toHaveLength(1); expect(db.conciliacoesFaturas).toEqual([]);
    });
    it('salva tarifa na obrigação, uma vez, com vencimento correto e sem débito bancário', async () => {
        await purchase();
        const adj = await ReconciliationRepo.saveAdjustment('c', 2026, 9, { id: 'fee', description: 'Tarifa', amount: 35, effect: 'charge' });
        await Promise.all([ReconciliationRepo.createAdjustmentTransaction('c', 2026, 9, adj.id), ReconciliationRepo.createAdjustmentTransaction('c', 2026, 9, adj.id)]);
        expect(db.bancos[0].saldo).toBe(1000);
        expect(invoiceModel(db, db.cartoes[0], 2026, 9).total).toBe(135);
        expect(db.transacoes.find(t => t.reconciliationAdjustmentId === 'fee')).toMatchObject({ isCartao: true, data: '2026-11-05', bancoId: 'c' });
    });
    it('estorno de fatura reduz obrigação e consumo, sem criar depósito ou receita', async () => {
        await purchase(); await ReconciliationRepo.saveAdjustment('c', 2026, 9, { id: 'credit', description: 'Estorno', amount: 20, effect: 'credit' });
        await ReconciliationRepo.createAdjustmentTransaction('c', 2026, 9, 'credit');
        expect(db.bancos[0].saldo).toBe(1000);
        expect(Database.getTotals()).toMatchObject({ receitas: 0, despesas: 80 });
        expect(invoiceModel(db, db.cartoes[0], 2026, 9).total).toBe(80);
    });
    it('totais iguais não aprovam conferência e um centavo continua divergente', () => {
        expect(calculateReconciliation([{ id: 'x', valor: 100 }], 100).status).toBe('aguardando conferência');
        expect(calculateReconciliation([{ id: 'x', valor: 100 }], 100.01).status).toBe('diferença encontrada');
    });
    it('exige conferência individual e reabre evidência após editar o lançamento', async () => {
        await purchase(); await ReconciliationRepo.saveAmount('c', 2026, 9, 100);
        await expect(ReconciliationRepo.confirm('c', 2026, 9)).rejects.toThrow('individualmente');
        await ReconciliationRepo.checkItem('c', 2026, 9, 'purchase-1');
        await ReconciliationRepo.confirm('c', 2026, 9);
        expect(invoiceModel(db, db.cartoes[0], 2026, 9).status).toBe('conciliada');
        await Database.updateTransaction('purchase-1', { desc: 'Descrição corrigida' });
        expect(invoiceModel(db, db.cartoes[0], 2026, 9).status).toBe('aguardando conferência');
        expect(getReviewState(db, db.transacoes[0])).toBe('nao-conferido');
    });
    it('conclui conferência de conta por referência, itens e ação explícita', async () => {
        await Database.add('transacoes', { id: 'cash', desc: 'Mercado', valor: 100, tipo: 'despesa', bancoId: 'a', data: '2026-10-20' });
        const record = await BankConferenceRepo.save({ bankId: 'a', period: '2026-10', asOf: '2026-10-21', reference: 900, source: 'Extrato consultado' });
        await expect(BankConferenceRepo.complete(record.id)).rejects.toThrow('pendentes');
        await BankConferenceRepo.decide({ id: record.id, transactionId: 'cash', status: 'conferido' });
        await BankConferenceRepo.complete(record.id);
        expect(getReviewState(db, db.transacoes[0])).toBe('conciliado');
    });
    it('mantém centavos e o valor original da compra parcelada', async () => {
        await Database.addCardExpense({ id: 'split', desc: 'Compra', total: 100, parcelas: 3, cartaoId: 'c', data: '2026-10-18' });
        expect(db.transacoes.map(t => t.valor).sort()).toEqual([33.33,33.33,33.34]);
        expect(db.transacoes.every(t => t.valorOriginal === 100 && t.faturaChave)).toBe(true);
    });
    it('redistribui somente as parcelas a partir da selecionada, mantendo total e datas', async () => {
        await Database.addCardExpense({ id: 'split', desc: 'Compra', total: 100, parcelas: 3, cartaoId: 'c', data: '2026-10-18' });
        const beforeDates = db.transacoes.map(t => t.data);
        await Database.updateTransaction('split-2', { scope: 'remaining', purchaseTotal: 90, data: '2026-11-18', desc: 'Compra revisada' });
        expect(db.transacoes.find(t => t.id === 'split-1').valor).toBe(33.34);
        expect(db.transacoes.filter(t => t.id !== 'split-1').map(t => t.valor)).toEqual([45,45]);
        expect(db.transacoes.map(t => t.data)).toEqual(beforeDates);
        expect(db.transacoes.every(t => t.valorOriginal === 100)).toBe(true);
    });
    it('recusa redistribuir parcelas de uma fatura que já recebeu pagamento', async () => {
        await Database.addCardExpense({ id: 'split', desc: 'Compra', total: 100, parcelas: 3, cartaoId: 'c', data: '2026-10-18' });
        await Database.add('agendamentos', { id: 'paid', categoria: 'Fatura Cartão', cartaoId: 'c', mesReferencia: '2026-11', valor: 33.34, status: 'pago' });
        await expect(Database.updateTransaction('split-1', { scope: 'remaining', purchaseTotal: 120, data: '2026-10-18' })).rejects.toThrow('pagamento');
        expect(db.transacoes.reduce((sum,t) => sum + Math.round(t.valor * 100), 0)).toBe(10000);
    });
    it('edição de transferência pela API do formulário conserva o par e o consolidado', async () => {
        await Database.add('bancos', { id: 'b', nome: 'Reserva', saldo: 0 });
        const transfer = await Database.addTransfer({ sourceAccountId: 'a', destinationAccountId: 'b', amount: 50, date: '2026-10-21' });
        await Database.updateTransaction(transfer.transactions[0].id, { scope: 'one', purchaseTotal: '', valor: 60, data: '2026-10-21', desc: 'Transferência corrigida' });
        expect(db.transacoes.every(t => t.valor === 60)).toBe(true);
        expect(db.bancos.map(b => b.saldo).sort((a,b)=>a-b)).toEqual([60,940]);
        expect(Database.getTotals()).toMatchObject({ saldo: 1000, receitas: 0, despesas: 0 });
    });
    it('alterar fechamento preserva ciclos anteriores e aplica a regra às novas compras', async () => {
        await purchase();
        const key = db.transacoes[0].faturaChave;
        await Database.updateCard('c', { bancoId: 'a', fechamento: 15, vencimento: 5 });
        expect(db.transacoes[0].faturaChave).toBe(key);
        await Database.addCardExpense({ id: 'new', desc: 'Nova', total: 10, parcelas: 1, cartaoId: 'c', data: '2026-10-18' });
        expect(db.transacoes.find(t => t.id === 'new-1').faturaChave).toBe('c:2026-11');
    });
    it('recusa migrar silenciosamente o mês de vencimento de faturas com histórico', async () => {
        await purchase();
        await expect(Database.updateCard('c', { bancoId: 'a', fechamento: 2, vencimento: 5 })).rejects.toThrow('revisão dos ciclos');
        expect(db.cartoes[0].fechamento).toBe(25);
        expect(db.transacoes[0].faturaChave).toBe('c:2026-10');
    });
    it('relatório de caixa segue pagamento, e não o mês da compra no cartão', async () => {
        await purchase(); await schedule(); await pay(100, 'pay');
        expect(buildCashflowModel(db, 1, new Date(2026, 9, 21)).saidas).toBe(0);
        expect(buildCashflowModel(db, 1, new Date(2026, 10, 21)).saidas).toBe(100);
    });
    it('registra antes, depois e data de uma correção na mesma operação', async () => {
        await purchase(); await Database.updateTransaction('purchase-1', { valor: 110 });
        expect(db.historicoAlteracoes.find(c => c.entityId === 'purchase-1' && c.before?.valor === 100)).toMatchObject({ before: { valor: 100 }, after: { valor: 110 }, at: expect.any(String) });
    });
    it('salva referência de arquivo sem criar movimentos e exige vínculo para concluir', async () => {
        await Database.add('transacoes', { id: 'cash', desc: 'Mercado', valor: 100, tipo: 'despesa', bancoId: 'a', data: '2026-10-20' });
        const record = await BankConferenceRepo.save({ bankId: 'a', period: '2026-10', asOf: '2026-10-21', reference: 900, source: 'Extrato' });
        await Database.updateConferenceReference({ recordId: record.id, fileName: 'extrato.csv', rows: [{ desc: 'Mercado', valor: 100, tipo: 'despesa', data: '2026-10-20' }] });
        expect(db.transacoes).toHaveLength(1); expect(db.bancos[0].saldo).toBe(900);
        await expect(BankConferenceRepo.decide({ id: record.id, transactionId: 'cash', status: 'conferido' })).rejects.toThrow('linha de referência');
        await BankConferenceRepo.decide({ id: record.id, transactionId: 'cash', status: 'conferido', referenceId: 'reference-1' });
        await BankConferenceRepo.complete(record.id);
        await Database.remove('transacoes', 'cash');
        expect(db.conferencias[0].decisions.cash).toBeUndefined();
        expect(db.conferencias[0].confirmedAt).toBeNull();
    });
});
