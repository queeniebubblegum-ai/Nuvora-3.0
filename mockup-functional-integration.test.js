import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { db, Database, __setTransactionPersistenceWriterForTests } from './db.js';
import { ContasController } from './ctrl-contas.js';
import { PlaneamentoController, buildScheduleOccurrences } from './ctrl-planeamento.js';
import { TransacoesController } from './ctrl-transacoes.js';
import { Utils } from './utils.js';
import { App } from './app.js';

vi.mock('./app.js', () => ({ App: {
    closeModal: vi.fn(), updateBankSelect: vi.fn(), updateCategorySelects: vi.fn(),
    updateContatoSelect: vi.fn(), scheduleRender: vi.fn(), viewState: {}, currentPage: 'Dashboard'
} }));

const eventFor = (markup = '') => {
    document.body.innerHTML = `<form id="test-form">${markup}</form>`;
    return { preventDefault: vi.fn(), target: document.getElementById('test-form') };
};

beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    db.bancos = [{ id: 'bank-demo', nome: 'Conta', saldo: 1000, saldoInicial: 1000 }];
    db.cartoes = [];
    db.contatos = [{ id: 'person-demo', nome: 'Maria', tipo: 'pf' }];
    db.transacoes = [];
    db.agendamentos = [];
    db.receitasFuturas = [];
    db.categorias = [];
    db.reservas = [];
    db.metas = [];
    db.fechamentosMes = [];
    db.metadados = { ultimaAtualizacao: null };
    __setTransactionPersistenceWriterForTests(async () => {});
    vi.spyOn(Utils, 'showToast').mockImplementation(() => {});
});

afterEach(() => {
    __setTransactionPersistenceWriterForTests();
    vi.useRealTimers();
});

describe('mockup fields write into the existing financial model', () => {
    it('edits a contact without changing the string ID linked to existing transactions', async () => {
        db.transacoes = [{ id: 'old-tx', contatoId: 'person-demo', valor: 25 }];
        await ContasController.submitContato(eventFor(`
            <input id="contato-id" value="person-demo"><input id="contato-nome" value="Maria atualizada">
            <select id="contato-tipo"><option value="pf" selected>Pessoa física</option></select>
            <input id="contato-email" value="maria@example.com">`));
        expect(db.contatos).toHaveLength(1);
        expect(db.contatos[0]).toMatchObject({ id: 'person-demo', nome: 'Maria atualizada', email: 'maria@example.com' });
        expect(db.transacoes[0].contatoId).toBe('person-demo');
        expect(App.scheduleRender).toHaveBeenCalled();
    });

    it('rejects invalid contact values before saving or closing the form', async () => {
        await ContasController.submitContato(eventFor('<input id="contato-nome" value="  "><input id="contato-email" value="inválido">'));
        expect(db.contatos).toHaveLength(1);
        expect(App.closeModal).not.toHaveBeenCalled();
        expect(Utils.showToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });

    it('retains the old contact and open form when storage rejects the edit', async () => {
        __setTransactionPersistenceWriterForTests(async () => { throw new Error('quota excedida'); });
        await ContasController.submitContato(eventFor('<input id="contato-id" value="person-demo"><input id="contato-nome" value="Nome novo">'));
        expect(db.contatos[0].nome).toBe('Maria');
        expect(App.closeModal).not.toHaveBeenCalled();
        expect(Utils.showToast).toHaveBeenCalledWith('quota excedida', 'error');
    });

    it('stores account kind and card last digits without requesting the complete card number', async () => {
        await ContasController.submitBanco(eventFor(`
            <input id="banco-nome" value="Carteira"><input id="banco-saldo" value="50.25">
            <select id="banco-tipo"><option value="carteira">Carteira</option></select>`));
        expect(db.bancos[0]).toMatchObject({ nome: 'Carteira', tipo: 'carteira', saldo: 50.25 });
        await ContasController.submitCartao(eventFor(`
            <select id="cartao-bancoId"><option value="bank-demo">Conta</option></select>
            <input id="cartao-nome" value="Cartão"><input id="cartao-limite" value="2000">
            <input id="cartao-dia-fech" value="28"><input id="cartao-dia-venc" value="5">
            <input id="cartao-final" value="0042">`));
        expect(db.cartoes[0]).toMatchObject({ bancoId: 'bank-demo', final: '0042' });
        document.getElementById('cartao-final').value = '12345';
        await ContasController.submitCartao({ preventDefault() {} });
        expect(db.cartoes).toHaveLength(1);
    });

    it('persists and edits distinct category keywords while keeping existing category identity', async () => {
        const submit = eventFor(`
            <input id="nova-categoria-id" value=""><input id="nova-categoria-nome" value="Pets">
            <input id="nova-categoria-palavras" value="Petshop, Ração; petshop">
            <select id="nova-categoria-tipo"><option value="despesa">Despesa</option></select>`);
        await ContasController.submitCategoria(submit);
        expect(db.categorias[0].palavrasChave).toEqual(['petshop', 'ração']);
        document.getElementById('nova-categoria-id').value = db.categorias[0].id;
        document.getElementById('nova-categoria-palavras').value = 'Veterinário';
        await ContasController.submitCategoria(submit);
        expect(db.categorias).toHaveLength(1);
        expect(db.categorias[0].palavrasChave).toEqual(['veterinário']);
    });

    it('preserves non-numeric contact IDs when editing an existing transaction', async () => {
        vi.useFakeTimers();
        db.transacoes = [{ id: 'transaction-demo', bancoId: 'bank-demo', contatoId: null, desc: 'Antes', valor: 10, tipo: 'despesa', data: '2026-10-16' }];
        TransacoesController.submitEditTransaction(eventFor(`
            <input id="edit-id" value="transaction-demo"><input id="edit-desc" value="Depois">
            <input id="edit-valor" value="12.50"><input id="edit-data" value="2026-10-16">
            <input id="edit-categoria" value="Outros"><select id="edit-contato"><option value="person-demo">Maria</option></select>
            <button type="submit">Salvar</button>`));
        await vi.runAllTimersAsync();
        expect(db.transacoes[0]).toMatchObject({ id: 'transaction-demo', contatoId: 'person-demo', desc: 'Depois', valor: 12.5 });
    });
});

describe('monthly closing persists a reusable financial snapshot', () => {
    it('uses the canonical ledger rules, captures actual balances and closes the same month idempotently', async () => {
        db.transacoes = [
            { id: 'income', tipo: 'receita', valor: 500, data: '2026-10-10' },
            { id: 'expense', tipo: 'despesa', valor: 200, data: '2026-10-11' },
            { id: 'card', tipo: 'despesa', valor: 50, isCartao: true, data: '2026-10-12' },
            { id: 'transfer', tipo: 'despesa', valor: 100, transferenciaInterna: true, data: '2026-10-13' },
            { id: 'invoice', tipo: 'pagamento-fatura', valor: 80, data: '2026-10-13' },
            { id: 'previous', tipo: 'receita', valor: 999, data: '2026-09-10' }
        ];
        db.reservas = [{ id: 'reserve', saldo: 100 }];
        const first = await Database.closeFinancialMonth({ year: 2026, month: 9 });
        const second = await Database.closeFinancialMonth({ year: 2026, month: 9 });
        expect(first).toMatchObject({ periodo: '2026-10', receitas: 500, despesas: 250, resultado: 250, saldoBancario: 1000, saldoDisponivel: 900, status: 'fechado', locked: false });
        expect(second).toEqual(first);
        expect(db.fechamentosMes).toHaveLength(1);
        expect(db.bancos[0].saldo).toBe(1000);
        await expect(Database.closeFinancialMonth({ year: 2026, month: 9, lock: true })).rejects.toThrow('bloqueio');
    });

    it('reopens and closes again in place while preserving the earlier summary', async () => {
        await Database.closeFinancialMonth({ year: 2026, month: 9 });
        await Database.reopenFinancialMonth({ year: 2026, month: 9 });
        db.transacoes.push({ id: 'new-income', tipo: 'receita', valor: 100, data: '2026-10-12' });
        const updated = await Database.closeFinancialMonth({ year: 2026, month: 9 });
        expect(db.fechamentosMes).toHaveLength(1);
        expect(updated.receitas).toBe(100);
        expect(updated.historico[0]).toMatchObject({ receitas: 0 });
    });

    it('rolls back a rejected closing write without inventing a completed closing', async () => {
        __setTransactionPersistenceWriterForTests(async () => { throw new Error('disco cheio'); });
        await expect(Database.closeFinancialMonth({ year: 2026, month: 9 })).rejects.toThrow('disco cheio');
        expect(db.fechamentosMes).toEqual([]);
        expect(db.metadados.ultimaAtualizacao).toBeNull();
    });
});

describe('forecast creation and settlement', () => {
    const base = { desc: 'Aluguel', valor: 125.50, dataVencimento: '2027-01-31', tipo: 'despesa', categoria: 'Moradia', status: 'pendente', bancoId: 'bank-demo', contatoId: 'person-demo' };

    it('retains the original due day across short months and leap years', () => {
        const monthly = buildScheduleOccurrences(base, 'mensal', 3);
        expect(monthly.map(item => item.dataVencimento)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31']);
        expect(new Set(monthly.map(item => item.id)).size).toBe(3);
        expect(monthly[2]).toMatchObject({ parcelaAtual: 3, totalParcelas: 3, valor: 125.50, contatoId: 'person-demo' });
        expect(buildScheduleOccurrences({ ...base, dataVencimento: '2028-02-29' }, 'anual', 2).map(item => item.dataVencimento)).toEqual(['2028-02-29', '2029-02-28']);
    });

    it('rolls back every occurrence if local persistence fails and rejects invalid ranges', async () => {
        __setTransactionPersistenceWriterForTests(async () => { throw new Error('armazenamento cheio'); });
        await expect(Database.addSchedulesAtomically(buildScheduleOccurrences(base, 'mensal', 3))).rejects.toThrow('armazenamento cheio');
        expect(db.agendamentos).toEqual([]);
        expect(db.bancos[0].saldo).toBe(1000);
        expect(() => buildScheduleOccurrences(base, 'mensal', 121)).toThrow('120');
        expect(() => buildScheduleOccurrences({ ...base, dataVencimento: '2027-02-31' }, 'mensal', 2)).toThrow('vencimento');
    });

    it('creates pending receipts with their selected account and person, without changing the balance', async () => {
        await PlaneamentoController.submitAgendamento(eventFor(`
            <select id="agendamento-tipo"><option value="receita">Receita</option></select>
            <input id="agendamento-desc" value="Honorários"><input id="agendamento-valor" value="200">
            <input id="agendamento-data" value="2026-12-31"><input id="agendamento-categoria" value="Renda">
            <select id="agendamento-banco"><option value="bank-demo">Conta</option></select>
            <select id="agendamento-contato"><option value="person-demo">Maria</option></select>
            <select id="agendamento-repeticao"><option value="mensal">Mensal</option></select>
            <input id="agendamento-repeticoes" value="2"><input id="agendamento-edit-id" value="">`));
        expect(db.agendamentos).toHaveLength(2);
        expect(db.agendamentos[0]).toMatchObject({ bancoId: 'bank-demo', contatoId: 'person-demo', tipo: 'receita', status: 'pendente' });
        expect(db.transacoes).toEqual([]);
        expect(db.bancos[0].saldo).toBe(1000);
    });

    it('settles a schedule only once with its balance, person and installment context', async () => {
        db.agendamentos = [{ id: 'schedule-demo', ...base, parcelaAtual: 2, totalParcelas: 3, recorrente: true, grupoId: 'monthly-group' }];
        const first = await Database.settleScheduleAtomically('schedule-demo', { date: '2027-01-31' });
        const second = await Database.settleScheduleAtomically('schedule-demo', { date: '2027-01-31' });
        expect(first.alreadySettled).toBe(false);
        expect(second.alreadySettled).toBe(true);
        expect(db.transacoes).toHaveLength(1);
        expect(db.transacoes[0]).toMatchObject({ agendamentoId: 'schedule-demo', contatoId: 'person-demo', parcelaAtual: 2, totalParcelas: 3 });
        expect(db.agendamentos[0].status).toBe('pago');
        expect(db.bancos[0].saldo).toBe(874.5);
    });

    it('keeps the schedule pending and balance unchanged when settlement persistence fails', async () => {
        db.agendamentos = [{ id: 'schedule-demo', ...base }];
        __setTransactionPersistenceWriterForTests(async () => { throw new Error('falha no disco'); });
        await expect(Database.settleScheduleAtomically('schedule-demo', { date: '2027-01-31' })).rejects.toThrow('falha no disco');
        expect(db.transacoes).toEqual([]);
        expect(db.agendamentos[0].status).toBe('pendente');
        expect(db.bancos[0].saldo).toBe(1000);
    });

    it('supports existing future income and moves its edited expense atomically', async () => {
        db.receitasFuturas = [{ id: 'future-demo', desc: 'Reembolso', valor: 200, data: '2026-10-20', status: 'prevista', bancoId: 'bank-demo' }];
        await Database.saveForecastAtomically('future-demo', 'receitasFuturas', { tipo: 'despesa' });
        expect(db.receitasFuturas).toEqual([]);
        expect(db.agendamentos[0]).toMatchObject({ id: 'future-demo', tipo: 'despesa', status: 'pendente' });
        db.receitasFuturas = [{ id: 'income-demo', desc: 'Reembolso', valor: 200, data: '2026-10-20', status: 'prevista', bancoId: 'bank-demo', contatoId: 'person-demo' }];
        await Database.settleScheduleAtomically('income-demo', { collection: 'receitasFuturas', date: '2026-10-20' });
        expect(db.receitasFuturas[0].status).toBe('recebida');
        expect(db.transacoes[0]).toMatchObject({ receitaFuturaId: 'income-demo', tipo: 'receita', contatoId: 'person-demo' });
        expect(db.bancos[0].saldo).toBe(1200);
    });
});
