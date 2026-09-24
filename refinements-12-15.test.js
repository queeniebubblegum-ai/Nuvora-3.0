import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calculateDashboardTrend, DashboardComponents } from './cmp-dashboard.js';
import { PageComponents } from './cmp-pages.js';
import { CoreComponents } from './cmp-core.js';
import { signedPeriodVariation } from './report-data.js';
import { ReportComponents } from './cmp-reports.js';

const source = file => readFileSync(resolve(process.cwd(), file), 'utf8');

const card = (id, limit) => ({ id, nome: 'Cartão teste', bancoId: 'bank-1', limite: limit });

describe('refinamentos seguros 12–15', () => {
    it('does not fabricate a dashboard trend for a zero or missing baseline', () => {
        expect(calculateDashboardTrend(200, 0)).toMatchObject({ label: 'Sem comparação anterior', isNeutral: true });
        expect(calculateDashboardTrend(200, undefined)).toMatchObject({ label: 'Sem comparação anterior', isNeutral: true });
        expect(DashboardComponents.dashboardCards({ saldo: 0, receitas: 200, despesas: 0 }, { receitas: 0, despesas: 0 })).toContain('Sem comparação anterior');
        expect(DashboardComponents.dashboardCards({ saldo: 0, receitas: 200, despesas: 0 }, { receitas: 0, despesas: 0 })).not.toContain('100.0%');
    });

    it('keeps a valid dashboard comparison when the previous result is non-zero', () => {
        expect(calculateDashboardTrend(150, 100)).toMatchObject({ label: '50.0%', isUp: true, isNeutral: false });
        expect(DashboardComponents.dashboardCards({ saldo: 0, receitas: 150, despesas: 0 }, { receitas: 100, despesas: 0 })).toContain('50.0%');
    });

    it('renders credit usage with accessible danger/warning/success states and a safe unknown limit', () => {
        const banks = [{ id: 'bank-1', nome: 'Conta', instituicao: 'Banco', saldo: 0 }];
        const transactions = [{ id: 'tx-1', isCartao: true, bancoId: 'card-danger', valor: 100 }];
        const danger = PageComponents.accountsPage(banks, [card('card-danger', 100)], transactions);
        const warning = PageComponents.accountsPage(banks, [card('card-warning', 200)], [{ isCartao: true, bancoId: 'card-warning', valor: 160 }]);
        const success = PageComponents.accountsPage(banks, [card('card-success', 200)], [{ isCartao: true, bancoId: 'card-success', valor: 100 }]);
        const unknown = PageComponents.accountsPage(banks, [card('card-unknown', 0)], [{ isCartao: true, bancoId: 'card-unknown', valor: 100 }]);
        expect(danger).toContain('data-usage-state="danger"');
        expect(danger).toContain('class="is-danger"');
        expect(danger).toContain('style="width:100%"');
        expect(warning).toContain('data-usage-state="warning"');
        expect(success).toContain('data-usage-state="success"');
        expect(unknown).toContain('Limite não informado');
        expect(unknown).toContain('data-usage-state="unknown"');
        expect(unknown).toContain('aria-valuetext="Limite não informado"');
        expect(source('input.css')).toContain('.nv-credit-card-progress-track span.is-warning');
        expect(source('styles.css')).toContain('.nv-credit-card-progress-track span.is-danger');
    });

    it('exposes honest budget health thresholds in both planning renderers', () => {
        const planning = source('rnd-pages.js');
        expect(planning).toContain("pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'success'");
        expect(planning).toContain('Limite ultrapassado');
        expect(planning).toContain('Próximo do limite');
        expect(planning).toContain('Dentro do planejado');
        expect(planning).toContain("'Limite não informado'");
        const unknown = CoreComponents._buildBudgetCard({ id: 'b-1', categoria: 'Casa', limite: 0 }, 90);
        const over = CoreComponents._buildBudgetCard({ id: 'b-2', categoria: 'Casa', limite: 100 }, 100);
        expect(unknown).toContain('Limite não informado');
        expect(unknown).toContain('data-budget-status="neutral"');
        expect(over).toContain('Limite ultrapassado');
        expect(over).toContain('aria-valuenow="100"');
    });

    it('uses only available report history and returns signed or neutral variation', () => {
        expect(signedPeriodVariation(120, 100)).toMatchObject({ label: '+20.0%', tone: 'positive' });
        expect(signedPeriodVariation(80, 100)).toMatchObject({ label: '-20.0%', tone: 'negative' });
        expect(signedPeriodVariation(120, 0)).toMatchObject({ label: 'Sem comparação anterior', isNeutral: true });
        const html = ReportComponents.reportComparativo({ transacoes: [] }, { reportPeriod: 3 });
        expect(html).toContain('Comparação com período anterior');
        expect(html).toContain('Sem comparação anterior');
        expect(html).toContain('nv-report-comparison-row is-neutral');
        expect(source('input.css')).toContain('.nv-report-comparison-row.is-positive');
        expect(source('styles.css')).toContain('.nv-report-comparison-row.is-negative');
    });
});
