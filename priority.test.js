import { describe, expect, it } from 'vitest';
import { getDashboardQuickAction } from './rnd-pages.js';
import { DashboardComponents } from './cmp-dashboard.js';
import { PRIORITY_KEYS, resolvePriority } from './priority.js';

describe('global dashboard priority', () => {
    const allSignals = {
        contasAtrasadas: [{ id: 'late', valor: 100 }],
        saldo: -10,
        orcamento: { orcamentos: [{ categoria: 'Casa', limite: 100, gasto: 200 }] },
        cartoes: [{ id: 'card-1', nome: 'Cartão', limite: 100 }],
        comprasCartao: [{ cartaoId: 'card-1', valor: 90 }],
        anoraRecommendation: { action: 'navigate', payload: 'Planejamento', label: 'Anora' },
        proximosVencimentos: [{ id: 'soon', valor: 50 }]
    };

    it('keeps the product-wide precedence order', () => {
        expect(resolvePriority(allSignals).priority).toBe(PRIORITY_KEYS.OVERDUE);
        const withoutOverdue = { ...allSignals, contasAtrasadas: [] };
        expect(resolvePriority(withoutOverdue).priority).toBe(PRIORITY_KEYS.NEGATIVE_BALANCE);
        const withoutNegative = { ...withoutOverdue, saldo: 0 };
        expect(resolvePriority(withoutNegative).priority).toBe(PRIORITY_KEYS.OVER_BUDGET);
        const withoutBudget = { ...withoutNegative, orcamento: { orcamentos: [] } };
        expect(resolvePriority(withoutBudget).priority).toBe(PRIORITY_KEYS.HIGH_CARD_USAGE);
        const withoutCard = { ...withoutBudget, cartoes: [], comprasCartao: [] };
        expect(resolvePriority(withoutCard).priority).toBe(PRIORITY_KEYS.ANORA_RECOMMENDATION);
        expect(resolvePriority({ ...withoutCard, anoraRecommendation: null }).priority).toBe(PRIORITY_KEYS.INFORMATIONAL);
    });

    it('does not create false positives from empty, invalid, or incomplete evidence', () => {
        expect(resolvePriority({ saldo: 0 }).priority).toBeNull();
        expect(resolvePriority({ saldo: 'not-a-number' }).priority).toBeNull();
        expect(resolvePriority({ orcamento: { orcamentos: [{ categoria: 'Casa', limite: 0, gasto: 999 }] } }).priority).toBeNull();
        expect(resolvePriority({ orcamento: { orcamentos: [{ categoria: 'Casa', limite: 100 }] } }).priority).toBeNull();
        expect(resolvePriority({ cartoes: [{ id: 1, limite: 100 }], comprasCartao: [] }).priority).toBeNull();
        expect(resolvePriority({ anoraRecommendation: { action: 'navigate', payload: 'Dashboard' } }).priority).toBeNull();
    });

    it('uses the same winner for the quick action and next decision', () => {
        const data = {
            saldo: -20,
            orcamento: { orcamentos: [{ categoria: 'Casa', limite: 100, gasto: 200 }] },
            cartoes: [{ id: 1, nome: 'Cartão', limite: 100 }],
            comprasCartao: [{ cartaoId: 1, valor: 90 }]
        };
        expect(getDashboardQuickAction(data)).toMatchObject({ action: 'openModal', type: 'receita' });
        expect(DashboardComponents.nextDecision(data).priority).toBe(PRIORITY_KEYS.NEGATIVE_BALANCE);
        const withoutNegative = { ...data, saldo: 0 };
        expect(getDashboardQuickAction(withoutNegative)).toMatchObject({ action: 'navigate', payload: 'Orcamento' });
        expect(DashboardComponents.nextDecision(withoutNegative).priority).toBe(PRIORITY_KEYS.OVER_BUDGET);
    });

    it('renders only the winning alert and can exclude it when a decision block owns it', () => {
        const data = {
            saldo: -1,
            contasAtrasadas: [{ valor: 20 }],
            orcamento: { orcamentos: [{ categoria: 'Casa', limite: 10, gasto: 20 }] }
        };
        const html = DashboardComponents.attentionStrip(data);
        expect(html).toContain('Há contas vencidas');
        expect(html).not.toContain('Saldo global negativo');
        expect(DashboardComponents.attentionStrip(data, { excludePriority: PRIORITY_KEYS.OVERDUE })).toBe('');
    });
});
