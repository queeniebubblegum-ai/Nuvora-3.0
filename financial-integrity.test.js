import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, Database, TransactionsRepo } from './db.js';
import { OFXManager } from './ofx.js';
import { buildInvoicePaymentTransaction } from './invoice-payment.js';
import { calculatePeriodTotals } from './financial-ledger.js';
import { parseLocalDate } from './util-date.js';

const emptyDOM = () => { document.body.replaceChildren(); };

beforeEach(() => {
    localStorage.clear();
    db.transacoes = [];
    db.bancos = [
        { id: 'bank-main', nome: 'Conta principal', saldo: 1200, saldoInicial: 1200 },
        { id: 'bank-payment', nome: 'Conta usada', saldo: 800, saldoInicial: 800 },
    ];
    db.cartoes = [];
    db.metas = [];
    db.reservas = [];
    db.agendamentos = [];
    db.metadados = { ultimaAtualizacao: null };
    emptyDOM();
});

afterEach(() => {
    vi.useRealTimers();
    emptyDOM();
});

describe('regressões de integridade financeira — Fase 7', () => {
    it('baixa a fatura somente na conta escolhida e não duplica a despesa do cartão', async () => {
        db.transacoes = [{
            id: 'card-purchase', desc: 'Compra no cartão', valor: 100, tipo: 'despesa',
            categoria: 'Compras', bancoId: 'card-7', isCartao: true, data: '2026-09-18'
        }];
        const schedule = {
            id: 'invoice-card-7-2026-09', desc: 'Fatura Visa', valor: 74.25,
            categoria: 'Fatura Cartão', cartaoId: 'card-7', status: 'pendente', dataVencimento: '2026-09-25'
        };
        const payment = buildInvoicePaymentTransaction({
            schedule, bankId: 'bank-payment', paymentDate: '2026-09-24'
        });

        expect(Database.add('transacoes', payment)).toBe(true);
        expect(db.bancos.map(bank => bank.saldo)).toEqual([1200, 725.75]);
        expect(calculatePeriodTotals(db.transacoes)).toMatchObject({
            income: 0, expense: 100, transfers: 74.25, invoicePayments: 74.25
        });

        await Database.remove('transacoes', payment.id);
        expect(db.bancos.map(bank => bank.saldo)).toEqual([1200, 800]);
        expect(calculatePeriodTotals(db.transacoes)).toMatchObject({ income: 0, expense: 100, invoicePayments: 0 });
    });

    it('ancora o saldo final OFX sem somar as linhas importadas outra vez e desfaz preservando movimento posterior', async () => {
        vi.useFakeTimers();
        db.bancos = [{ id: 1, nome: 'Conta OFX', saldo: 1000, saldoInicial: 1000 }];
        const select = document.createElement('select');
        select.id = 'ofx-banco-alvo-id';
        select.innerHTML = '<option value="1">Conta OFX</option>';
        select.value = '1';
        const confirmBalance = document.createElement('input');
        confirmBalance.id = 'ofx-confirmar-saldo';
        confirmBalance.type = 'checkbox';
        confirmBalance.checked = true;
        document.body.append(select, confirmBalance);

        const viewState = {
            tipoImportacao: 'OFX',
            ofxPendenteSaldoFinal: 1400,
            ofxPendente: [{
                idTemp: 'ofx-line-1', desc: 'Compra importada', valor: 100,
                tipo: 'despesa', data: '2026-09-23', categoria: 'Casa',
                identificador: 'OFX-ENTRY-1', selecionado: true
            }]
        };
        OFXManager.salvarOFXAprovado(viewState, vi.fn(), vi.fn());

        expect(db.bancos[0].saldo).toBe(1400);
        expect(db.transacoes).toHaveLength(1);
        expect(db.transacoes[0]).toMatchObject({ saldoIncluidoNoSaldoDoExtrato: true, importadoOFX: true, bancoId: 1 });

        Database.add('transacoes', {
            id: 'post-ofx-income', desc: 'Movimento posterior', valor: 50,
            tipo: 'receita', bancoId: 1, data: '2026-09-24'
        });
        expect(db.bancos[0].saldo).toBe(1450);

        const undoButton = [...document.querySelectorAll('button')].find(button => button.textContent.includes('Desfazer'));
        expect(undoButton).toBeTruthy();
        await undoButton.onclick();
        expect(db.transacoes.map(item => item.id)).toEqual(['post-ofx-income']);
        expect(db.bancos[0].saldo).toBe(1050);
    });

    it('mantém lançamentos do dia 1 no mês local no cache quando o fuso é UTC-4', async () => {
        const previousTimeZone = process.env.TZ;
        process.env.TZ = 'America/Manaus';
        try {
            // Em Manaus, meia-noite UTC de 1º de outubro ainda é 30 de setembro local.
            expect(new Date('2026-10-01T00:00:00.000Z').getMonth()).toBe(8);
            const localDate = parseLocalDate('2026-10-01');
            expect(localDate.getFullYear()).toBe(2026);
            expect(localDate.getMonth()).toBe(9);
            expect(localDate.getDate()).toBe(1);

            db.transacoes = [
                { id: 'first-october', desc: 'Dia 1', data: '2026-10-01', valor: 10, tipo: 'despesa' },
                { id: 'last-september', desc: 'Fim do mês', data: '2026-09-30', valor: 20, tipo: 'despesa' },
            ];
            await Database.replaceAll({ transacoes: db.transacoes });

            expect(TransactionsRepo.getByMonth(2026, 9).map(item => item.id)).toEqual(['first-october']);
            expect(TransactionsRepo.getByMonth(2026, 8).map(item => item.id)).toEqual(['last-september']);
        } finally {
            if (previousTimeZone === undefined) delete process.env.TZ;
            else process.env.TZ = previousTimeZone;
        }
    });
});
