import { beforeEach, describe, expect, it } from 'vitest';
import { db, Database } from './db.js';
import { normalizeBackupDocument } from './backup-format.js';

beforeEach(() => {
    localStorage.clear();
    db.transacoes = [{ id: 'current-tx', valor: 12, tipo: 'despesa', bancoId: 'current-bank', data: '2026-09-24' }];
    db.bancos = [{ id: 'current-bank', nome: 'Conta atual', saldo: 88 }];
    db.cartoes = [];
    db.metas = [];
    db.reservas = [];
    db.conciliacoesFaturas = [];
});

describe('restauração de backup', () => {
    it('substitui os dados atuais em vez de anexar cópias duplicadas', async () => {
        const backup = normalizeBackupDocument({
            transacoes: [{ id: 'restored-tx', valor: 25, tipo: 'despesa', bancoId: 'restored-bank', data: '2026-09-23' }],
            bancos: [{ id: 'restored-bank', nome: 'Conta restaurada', saldo: 475 }],
            cartoes: [], reservas: [], conciliacoesFaturas: [],
        });

        await Database.replaceAll(backup.database);

        expect(db.transacoes.map(item => item.id)).toEqual(['restored-tx']);
        expect(db.bancos).toEqual([{ id: 'restored-bank', nome: 'Conta restaurada', saldo: 475 }]);
        expect(Database.getTotals()).toMatchObject({ despesas: 25, saldo: 475, saldoTotal: 475 });
    });

    it('migra backup legado sem reservas e descarta reserva velha sem duplicar patrimônio', async () => {
        db.reservas = [{ id: 'stale-reserve', goalId: 'deleted-goal', saldo: 500 }];
        const backup = normalizeBackupDocument({
            transacoes: [{ id: 'legacy-tx', valor: 5, tipo: 'despesa', bancoId: 'legacy-bank', data: '2026-09-01' }],
            bancos: [{ id: 'legacy-bank', nome: 'Conta legada', saldo: 1000 }],
            metas: [{ id: 'legacy-goal', nome: 'Viagem', atual: 15, alvo: 100 }],
        });

        await Database.replaceAll(backup.database);

        expect(db.reservas).toHaveLength(1);
        expect(db.reservas[0]).toMatchObject({ goalId: 'legacy-goal', saldo: 15 });
        expect(db.reservas.some(item => item.id === 'stale-reserve')).toBe(false);
        expect(Database.getTotals()).toMatchObject({ despesas: 5, saldo: 1000, saldoReservado: 15, saldoTotal: 1015 });
    });

    it('rejeita estrutura inválida antes de alterar dados correntes', async () => {
        const beforeTransactions = db.transacoes.map(item => ({ ...item }));
        const beforeBanks = db.bancos.map(item => ({ ...item }));

        await expect(Database.replaceAll({ transacoes: {}, bancos: [] })).rejects.toThrow('Coleção inválida: transacoes');
        expect(db.transacoes).toEqual(beforeTransactions);
        expect(db.bancos).toEqual(beforeBanks);
    });
});
