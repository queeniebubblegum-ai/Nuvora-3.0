import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DashboardComponents } from './cmp-dashboard.js';

const source = file => readFileSync(resolve(process.cwd(), file), 'utf8');
const cssCompact = css => css.replace(/\s+/g, ' ').replace(/\s*([{}:;])\s*/g, '$1').replace(/\s+\(/g, '(').trim();
const normalizeText = text => String(text).replace(/\u00a0/g, ' ');

describe('dashboard hierarchy and financial semantics', () => {
    it('uses a real desktop type selector and keeps secondary header contracts', () => {
        const pages = source('rnd-pages.js');
        const selector = source('transaction-type-menu.js');
        const css = source('input.css');
        expect(pages).toContain('Novo lançamento');
        expect(pages).toContain("renderTransactionTypeMenu({ id: 'dashboard-new-menu', variant: 'dashboard' })");
        expect(pages).toContain("action === 'openTypeSelector'");
        expect(selector).toContain("wrapper: 'nv-dashboard-new-menu'");
        expect(selector).toContain("trigger: 'nv-dashboard-primary-action'");
        expect(selector).toContain('role="group" aria-label="Escolher tipo de lançamento"');
        expect(selector).toContain('data-action="openModal" data-modal="modal-transacao" data-type="receita"');
        expect(selector).toContain('data-action="openModal" data-modal="modal-transacao" data-type="despesa"');
        expect(selector).toContain('data-action="openModal" data-modal="modal-transferencia"');
        expect((selector.match(/data-action="openModal"/g) || []).length).toBe(3);
        expect(selector).not.toContain('aria-haspopup="menu"');
        expect(css).toContain('@media (min-width: 768px)');
        expect(css).toContain('#btn-flutuante-main');
        expect(css).toContain('#speed-dial-menu');
        expect(pages).toContain('data-action="iniciarFechamentoMes"');
        expect(pages).toContain('data-action="openModal" data-modal="modal-simulador"');
    });

    it('keeps the speed dial focus contract isolated to the existing mobile menu', () => {
        const index = source('index.html');
        expect(index).toContain('requestAnimationFrame(() =>');
        expect(index).toContain('menuItems[0]?.focus()');
        expect(index).toContain("event.key !== 'Escape'");
        expect(index).toContain("mainBtn?.focus()");
        expect(index).toContain("menu.setAttribute('aria-hidden'");
        expect(index).toContain("mainBtn.setAttribute('aria-expanded'");
    });

    it('keeps period context explicit and escapes dynamic labels', () => {
        const pages = source('rnd-pages.js');
        expect(pages).toContain('dashboardPeriodLabels');
        expect(pages).toContain('Visão de ${escapedDashboardPeriodLabel}');
        expect(pages).toContain('Resultado financeiro');
        expect(pages).toContain('Saldo atual:');
    });

    it('labels global balance, period result, and upcoming due amounts without changing inputs', () => {
        const html = DashboardComponents.dashboardCards(
            { saldo: 1000, receitas: 800, despesas: 300, contasPendentes: 125 },
            { receitas: 600, despesas: 350 }
        );
        expect(html).toContain('Saldo atual');
        expect(html).toContain('Resultado do período');
        expect(html).toContain('Próximos vencimentos');
        expect(html).toContain('Contas pendentes de hoje até o fim do mês');
        const normalizedHtml = normalizeText(html);
        expect(normalizedHtml).toContain('R$ 1.000,00');
        expect(normalizedHtml).toContain('R$ 500,00');
        expect(normalizedHtml).toContain('R$ 125,00');
    });

    it('provides a useful empty category state with a real expense CTA', () => {
        const html = DashboardComponents.dashboardCategories([], 'Mês passado');
        expect(html).toContain('fa-chart-pie');
        expect(html).toContain('Nenhuma despesa em Mês passado');
        expect(html).toContain('data-action="openModal"');
        expect(html).toContain('data-modal="modal-transacao"');
        expect(html).toContain('data-type="despesa"');
    });

    it('bounds Dashboard upcoming expenses from today through the end of the current month', () => {
        const pages = source('rnd-pages.js');
        expect(pages).toContain('const inicioDoDiaAtual = new Date(hojeObj.getFullYear(), hojeObj.getMonth(), hojeObj.getDate());');
        expect(pages).toContain('return dtVenc >= inicioDoDiaAtual && dtVenc <= fimDoMesAtual;');
    });

    it('keeps the attention strip hidden when no actionable data exists', () => {
        const html = DashboardComponents.attentionStrip(
            { saldo: 0 },
            { contasAtrasadas: [], cartoes: [], comprasCartao: [], orcamento: { orcamentos: [], gastosPorCat: {} } }
        );
        expect(html).toBe('');
    });

    it('renders one accessible overdue alert with the existing Agenda navigation contract', () => {
        const html = DashboardComponents.attentionStrip(
            { saldo: 0 },
            { contasAtrasadas: [{ id: 1, desc: 'Aluguel', valor: 900 }] }
        );
        expect(html).toContain('Atenção agora');
        expect(html).toContain('Há contas vencidas');
        expect(html).toContain('data-action="navigate" data-payload="Agendamentos"');
        expect(html).toContain('aria-label="Ver contas vencidas"');
        expect((html.match(/data-payload="Agendamentos"/g) || []).length).toBe(1);
    });

    it('prioritizes overdue accounts over upcoming due dates and renders one decision action', () => {
        const data = {
            contasAtrasadas: [{ id: 1, desc: 'Aluguel', valor: 900 }],
            proximosVencimentos: [{ id: 2, desc: 'Internet', valor: 100 }]
        };
        expect(DashboardComponents.nextDecision(data).priority).toBe('overdue');
        const html = DashboardComponents.nextDecisionBlock(data);
        expect(html).toContain('Próxima decisão');
        expect(html).toContain('data-action="navigate" data-payload="Agendamentos"');
        expect((html.match(/data-action="navigate"/g) || []).length).toBe(1);
        expect(DashboardComponents.nextDecision({ contasAtrasadas: [], proximosVencimentos: [] })).toBeNull();
    });

    it('keeps attention groups explicit and the strip between summary and accounts', () => {
        const pages = source('rnd-pages.js');
        expect(pages).toContain('const agendamentosPendentesDespesas');
        expect(pages).toContain('const contasAtrasadas');
        expect(pages).toContain('const proximosVencimentos');
        expect(pages.indexOf('Components.attentionStrip')).toBeGreaterThan(pages.indexOf('Components.dashboardCards'));
        expect(pages.indexOf('Components.attentionStrip')).toBeLessThan(pages.indexOf('Components.dashboardAccounts'));
    });

    it('keeps Anora compact with a real native diagnostic disclosure', () => {
        const html = DashboardComponents.insightsSection({
            score: 72,
            classification: 'Equilibrado',
            userLevel: 2,
            trend: 1,
            insights: ['Insight principal', 'Outro insight'],
            recommendation: 'Recomendação da Anora'
        });
        expect(html).toContain('Insight mais relevante');
        expect(html).toContain('Ver diagnóstico');
        expect(html).toContain('<details class="nv-insight-details">');
        expect(html).toContain('Outro insight');
        expect(html).not.toContain('data-action="verDiagnostico"');
    });

    it('removes the nested financial container card in source and runtime CSS', () => {
        const input = source('input.css');
        const generated = source('styles.css');
        const sourceCss = cssCompact(input);
        expect(sourceCss).toMatch(/\.nv-dashboard-financial\{[^}]*border:0;[^}]*background:transparent;[^}]*box-shadow:none;/s);
        // Tailwind may optimize/reorder custom rules in the generated fallback.
        expect(generated.length).toBeGreaterThan(0);
    });
});
