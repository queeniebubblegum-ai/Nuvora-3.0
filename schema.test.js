import { describe, it, expect, beforeEach } from 'vitest';
import { db, Database, InvestmentRepo, SubscriptionRepo, FutureIncomeRepo } from './db.js';

describe('Modelo Pierre - planejamento futuro e patrimônio', () => {
    beforeEach(() => {
        db.receitasFuturas = [];
        db.assinaturas = [];
        db.investimentos = [];
    });

    it('deve cadastrar uma receita futura com status previsto', () => {
        Database.add('receitasFuturas', { id: 1, desc: 'Freelance', valor: 500, data: '2026-09-10' });
        expect(db.receitasFuturas[0]).toMatchObject({ desc: 'Freelance', status: 'prevista' });
    });

    it('deve cadastrar assinatura ativa por padrão', () => {
        Database.add('assinaturas', { id: 2, nome: 'Streaming', valor: 39.9, periodicidade: 'mensal' });
        expect(db.assinaturas[0].ativa).toBe(true);
    });

    it('deve permitir atualizar e excluir investimento usando ID textual ou numérico', () => {
        InvestmentRepo.add({ id: 3, nome: 'Tesouro', valorAtual: 1000 });
        expect(InvestmentRepo.update('3', { valorAtual: 1100 })).toBe(true);
        expect(db.investimentos[0].valorAtual).toBe(1100);
        expect(InvestmentRepo.remove('3')).toBe(true);
        expect(db.investimentos).toHaveLength(0);
    });
});
