import { describe, expect, it } from 'vitest';
import { DashboardComponents, onboardingSteps } from './cmp-dashboard.js';
import { MentorEngine } from './mentorEngine.js';

const emptyDatabase = { bancos: [], transacoes: [], orcamentos: [] };

describe('onboarding de três passos', () => {
    it('define apenas conta, primeiro lançamento e limite', () => {
        expect(onboardingSteps.map(step => step.id)).toEqual(['account', 'transaction', 'budget']);
        expect(onboardingSteps.map(step => step.modal)).toEqual(['modal-banco', 'modal-transacao', 'modal-orcamento']);
    });

    it('renders exactly three steps and wired modal actions until the setup is complete', () => {
        const html = DashboardComponents.onboardingChecklist(emptyDatabase);
        expect((html.match(/class="nv-onboarding-step /g) || []).length).toBe(3);
        expect(html).toContain('data-modal="modal-banco"');
        expect(html).toContain('data-modal="modal-transacao"');
        expect(html).toContain('data-modal="modal-orcamento"');
        expect(html).toContain('aria-valuemax="3"');
    });

    it('hides the checklist after the three requirements are present', () => {
        expect(DashboardComponents.onboardingChecklist({
            bancos: [{ id: 1, saldo: 500 }],
            transacoes: [{ id: 1, tipo: 'despesa', valor: 30, transferenciaInterna: false }],
            orcamentos: [{ id: 1, categoria: 'Alimentação', limite: 300 }]
        })).toBe('');
    });

    it('uses the budget as the last onboarding step and does not demand four transactions', () => {
        const base = {
            hasBancos: true, hasTransacoes: true, hasBudget: false, totalTransacoes: 1,
            totalIncome: 0, totalExpenses: 20, creditCardUsage: 0, futureCommitments: 0,
            currentBalance: 100, upcomingBillsTotal: 0, pastIncome: 0, pastExpenses: 0,
            expensesByCategory: {}, hasMetas: false, usuario: {}, ghostSubscriptions: []
        };
        expect(MentorEngine.calculateMentorScore(base)).toMatchObject({
            isOnboarding: true,
            onboardingAction: { action: 'openModal', modal: 'modal-orcamento' }
        });
        expect(MentorEngine.calculateMentorScore({ ...base, hasBudget: true }).isOnboarding).toBe(false);
    });
});
