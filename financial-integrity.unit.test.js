import { describe, expect, it } from 'vitest';
import { auditDatabase, reconcileBalances } from './financial-integrity.js';

const base = overrides => ({
    transacoes: [],
    bancos: [],
    cartoes: [],
    metas: [],
    reservas: [],
    orcamentos: [],
    agendamentos: [],
    ...overrides,
});

describe('auditoria e reconciliação financeira', () => {
    it('reconcilia o saldo de uma conta sem misturar cartão de crédito', () => {
        const database = base({
            bancos: [{ id: 'bank-1', nome: 'Conta', saldoInicial: 1000, saldo: 1250 }],
            cartoes: [{ id: 'card-1', nome: 'Cartão', limite: 1000 }],
            transacoes: [
                { id: 'income', bancoId: 'bank-1', tipo: 'receita', valor: 300, data: '2026-09-01' },
                { id: 'expense', bancoId: 'bank-1', tipo: 'despesa', valor: 50, data: '2026-09-02' },
                { id: 'card', bancoId: 'card-1', isCartao: true, tipo: 'despesa', valor: 900, data: '2026-09-02' },
            ],
        });
        const result = reconcileBalances(database);
        expect(result[0]).toMatchObject({ status: 'reconciled', expectedBalance: 1250, difference: 0, movementCount: 2 });
    });

    it('detecta saldo divergente, referências quebradas e transferência incompleta', () => {
        const report = auditDatabase(base({
            bancos: [{ id: 'bank-1', nome: 'Conta', saldoInicial: 1000, saldo: 900 }],
            transacoes: [
                { id: 'bad', bancoId: 'missing', tipo: 'despesa', valor: 10, data: '2026-09-01' },
                { id: 'transfer-leg', bancoId: 'bank-1', tipo: 'despesa', valor: 90, data: '2026-09-01', transferenciaInterna: true, transferenciaId: 'transfer-1', transferenciaEntrada: false },
            ],
        }));
        expect(report.ok).toBe(true);
        expect(report.summary.warnings).toBeGreaterThanOrEqual(3);
        expect(report.warnings.map(item => item.code)).toEqual(expect.arrayContaining(['reference.account', 'transfer.incomplete', 'balance.difference']));
    });

    it('rejeita registros inválidos e IDs duplicados como erros', () => {
        const report = auditDatabase(base({
            bancos: [
                { id: 'bank-1', nome: '', saldo: 'não-numérico' },
                { id: 'bank-1', nome: 'Conta duplicada', saldo: 10 },
            ],
        }));
        expect(report.ok).toBe(false);
        expect(report.summary.errors).toBeGreaterThanOrEqual(3);
        expect(report.errors.map(item => item.code)).toEqual(expect.arrayContaining(['bank.name', 'bank.balance', 'id.duplicate']));
    });

    it('não marca saldo ancorado por OFX como divergente', () => {
        const report = auditDatabase(base({
            bancos: [{ id: 'bank-1', nome: 'Conta OFX', saldoInicial: 1000, saldo: 1400 }],
            transacoes: [{ id: 'ofx', bancoId: 'bank-1', tipo: 'despesa', valor: 100, data: '2026-09-01', saldoIncluidoNoSaldoDoExtrato: true }],
        }));
        expect(report.summary.accountsWithDifferences).toBe(0);
        expect(report.balances[0].status).toBe('anchored');
    });
});

