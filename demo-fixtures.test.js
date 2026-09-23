import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildDemoFixture, buildDemoDatabase, cloneDemoFixture, DEMO_SCENARIOS } from './demo-fixtures.js';
import { resolvePriority, PRIORITY_KEYS } from './priority.js';
import { DashboardComponents } from './cmp-dashboard.js';
import { PageComponents } from './cmp-pages.js';
import { ReportComponents } from './cmp-reports.js';

const renderers = fixture => {
    const { db, dashboard, dashboardPrevious, state } = fixture;
    return [
        DashboardComponents.dashboardCards(dashboard, dashboardPrevious),
        DashboardComponents.dashboardCategories(db.transacoes, 'Setembro de 2026'),
        DashboardComponents.dashboardAccounts(db.bancos, db.cartoes, db.comprasCartao),
        PageComponents.transactionSummary(db.transacoes),
        PageComponents.transactionList(db.transacoes, state),
        PageComponents.budgetView(db.orcamentos, db.transacoes, state, { readOnly: true }),
        PageComponents.categoriesPage(db),
        PageComponents.accountsPage(db.bancos, db.cartoes, db.transacoes),
        ReportComponents.reportFluxo(db, state)
    ];
};

describe('deterministic demo fixtures', () => {
    it('exposes all required scenarios with detached database-shaped data', () => {
        expect(DEMO_SCENARIOS).toEqual([
            'empty', 'normal', 'overdueAccounts', 'negativeBalance',
            'overBudget', 'highCardUtilization', 'combinedPriority'
        ]);
        const first = buildDemoFixture('normal');
        const second = buildDemoFixture('normal');
        first.db.transacoes[0].desc = 'mutated locally';
        expect(second.db.transacoes[0].desc).toBe('Salário');
        expect(buildDemoDatabase('empty').transacoes).toEqual([]);
    });

    it('keeps scenario invariants explicit and deterministic', () => {
        const overdue = buildDemoFixture('overdueAccounts');
        expect(overdue.db.agendamentos.some(item => item.status === 'pendente')).toBe(true);
        expect(resolvePriority(overdue.priorityContext).priority).toBe(PRIORITY_KEYS.OVERDUE);

        const negative = buildDemoFixture('negativeBalance');
        expect(negative.dashboard.saldo).toBeLessThan(0);
        expect(resolvePriority(negative.priorityContext).priority).toBe(PRIORITY_KEYS.NEGATIVE_BALANCE);

        const budget = buildDemoFixture('overBudget');
        expect(budget.priorityContext.orcamento.orcamentos[0].gasto).toBeGreaterThan(budget.priorityContext.orcamento.orcamentos[0].limite);
        expect(resolvePriority(budget.priorityContext).priority).toBe(PRIORITY_KEYS.OVER_BUDGET);

        const card = buildDemoFixture('highCardUtilization');
        const used = card.db.comprasCartao.reduce((sum, item) => sum + item.valor, 0);
        expect(used / card.db.cartoes[0].limite).toBeGreaterThanOrEqual(0.8);
        expect(resolvePriority(card.priorityContext).priority).toBe(PRIORITY_KEYS.HIGH_CARD_USAGE);

        const combined = buildDemoFixture('combinedPriority');
        expect(resolvePriority(combined.priorityContext).priority).toBe(PRIORITY_KEYS.OVERDUE);
    });

    it('renders every component family for every scenario without persistence access', () => {
        for (const scenario of DEMO_SCENARIOS) {
            const fixture = buildDemoFixture(scenario);
            const html = renderers(fixture);
            expect(html).toHaveLength(9);
            html.forEach(markup => {
                expect(markup).toMatch(/^\s*</);
                expect(markup).not.toContain('undefined');
            });
        }
    });

    it('is storage-free and contains no automatic demo bootstrap', () => {
        const source = readFileSync(new URL('./demo-fixtures.js', import.meta.url), 'utf8');
        expect(source).not.toMatch(/localStorage|indexedDB|IDBDatabase/);
        expect(source).not.toMatch(/window\.|document\./);
        const fixture = cloneDemoFixture(buildDemoFixture('empty'));
        fixture.db.categorias.push({ nome: 'Local only' });
        expect(buildDemoFixture('empty').db.categorias).toEqual([]);
    });
});
