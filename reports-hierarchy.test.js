import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = file => readFileSync(resolve(process.cwd(), file), 'utf8');
const reportsTemplate = read('cmp-reports.js');
const reportsRenderer = read('rnd-pages.js');
const inputStyles = read('input.css');
const generatedStyles = read('styles.css');
const cssContains = (css, fragment) => css.replace(/\s+/g, '').includes(String(fragment).replace(/\s+/g, ''));

describe('hierarquia estática da página de Relatórios', () => {
    it('mantém o contexto selecionado fora do cartão e na ordem pedida', () => {
        const selected = reportsTemplate.indexOf('class="nv-reports-selected-heading"');
        const analysis = reportsTemplate.indexOf('${analysisHtml}', selected);
        const navigationCard = reportsTemplate.indexOf('class="nv-reports-navigation nv-reports-context-card"', selected);
        const navigationCopy = reportsTemplate.indexOf('class="nv-reports-navigation-copy"', navigationCard);
        const tabs = reportsTemplate.indexOf('class="nv-reports-tabs"', navigationCard);
        const content = reportsTemplate.indexOf('id="relatorio-export"', navigationCard);
        const selectedEnd = reportsTemplate.indexOf('</header>', selected);

        expect(selected).toBeGreaterThan(-1);
        expect(selectedEnd).toBeGreaterThan(selected);
        expect(analysis).toBeGreaterThan(selectedEnd);
        expect(navigationCard).toBeGreaterThan(analysis);
        expect(navigationCopy).toBeGreaterThan(navigationCard);
        expect(tabs).toBeGreaterThan(navigationCopy);
        expect(content).toBeGreaterThan(navigationCard);
        expect(reportsTemplate.match(/class="nv-reports-navigation(?:\s|")/g)).toHaveLength(1);
        expect(reportsTemplate).toContain('class="nv-reports-navigation nv-reports-context-card"');
        expect(reportsTemplate).toContain('<h1>${selected.title}</h1>');
        expect(reportsTemplate).toContain('<h2>Relatórios</h2>');
        expect(reportsTemplate).toContain('id="relatorio-export"');
        expect(reportsTemplate.match(/data-payload="(?:fluxo|compare|cartoes|patrimonio)"/g)).toHaveLength(4);
    });

    it('deixa o cartão genérico somente com navegação e leva o filtro ao conteúdo do Fluxo de Caixa', () => {
        const navigationStart = reportsTemplate.indexOf('<div class="nv-reports-navigation');
        const navigationEnd = reportsTemplate.indexOf('\n                </div>\n                <div id="relatorio-export"', navigationStart);
        const navigationHtml = reportsTemplate.slice(navigationStart, navigationEnd);
        const cashflowStart = reportsTemplate.indexOf('reportFluxo:');
        const cashflowHtml = reportsTemplate.slice(cashflowStart);

        expect(navigationStart).toBeGreaterThan(-1);
        expect(navigationEnd).toBeGreaterThan(navigationStart);
        expect(navigationHtml).not.toContain('nv-reports-selected-heading');
        expect(navigationHtml).not.toContain('nv-reports-actions');
        expect(navigationHtml).toContain('<h2>Relatórios</h2>');
        expect(navigationHtml).toContain('Análises detalhadas da sua inteligência financeira.');
        expect(navigationHtml).toContain('class="nv-reports-tabs"');
        expect(navigationHtml).not.toContain('Período analisado');
        expect(navigationHtml).not.toContain('data-change="setReportCashflowPeriod"');
        expect(navigationHtml).not.toContain('<select');

        expect(cashflowHtml).toContain('<span class="nv-report-filter-label">Período analisado</span>');
        expect(cashflowHtml).toContain('${reportPeriodLabel(period)} · ${formatReportDateRange(model)}');
        expect(cashflowHtml).toContain('data-change="setReportCashflowPeriod"');
        expect(cashflowHtml.indexOf('class="nv-report-toolbar')).toBeLessThan(cashflowHtml.indexOf('nv-report-metrics'));
        expect(reportsTemplate.match(/data-change="setReportCashflowPeriod"/g)).toHaveLength(1);
        expect(reportsRenderer).not.toContain('nv-reports-page-scope');
        expect(reportsRenderer).not.toContain('Base:');
        expect(reportsRenderer).toContain('data-action="exportPDF"');
        expect(reportsRenderer).toContain('class="nv-reports-export-button"');
        expect(reportsTemplate).toContain('id="relatorio-export"');
        expect(reportsTemplate).not.toContain('nv-report-toolbar nv-report-toolbar--controls-only');
        expect(reportsTemplate.match(/data-change="setReportPeriod"/g)).toHaveLength(3);
        expect(reportsTemplate).toContain('Últimos 3 meses');
        expect(reportsTemplate).toContain('Próximos 3 meses');
    });

    it('mantém o resumo financeiro compacto, completo e responsivo', () => {
        expect(reportsRenderer).toContain('class="nv-analysis-metrics"');
        expect(reportsRenderer.match(/class="nv-analysis-metric /g)).toHaveLength(4);
        expect(reportsRenderer).toContain('pagamentosFatura');
        expect(reportsRenderer).toContain('statusFaturas');
        for (const css of [inputStyles, generatedStyles]) {
            expect(cssContains(css, '.nv-analysis-metrics {')).toBe(true);
            expect(cssContains(css, 'grid-template-columns: repeat(4, minmax(0, 1fr));')).toBe(true);
            expect(cssContains(css, '@media (max-width: 720px)')).toBe(true);
            expect(cssContains(css, 'grid-template-columns: repeat(2, minmax(0, 1fr));')).toBe(true);
        }
    });

    it('mantém estilos no CSS-fonte e gera um fallback válido', () => {
        const sourceCss = inputStyles;
        expect(cssContains(sourceCss, '.nv-reports-page-scope')).toBe(false);
        expect(cssContains(sourceCss, '.nv-reports-period-row')).toBe(false);
        expect(cssContains(sourceCss, '.nv-reports-period-context')).toBe(false);
        expect(cssContains(sourceCss, '.nv-reports-navigation.nv-reports-context-card {')).toBe(true);
        expect(cssContains(sourceCss, '.nv-reports-navigation.nv-reports-context-card::before')).toBe(true);
        expect(cssContains(sourceCss, 'var(--c-action-purple)')).toBe(true);
        expect(cssContains(sourceCss, '.nv-reports-navigation {')).toBe(true);
        expect(cssContains(sourceCss, '.nv-report-toolbar {')).toBe(true);
        expect(cssContains(sourceCss, '.nv-report-filter-context')).toBe(true);
        expect(cssContains(sourceCss, '.nv-reports-selected-heading {')).toBe(true);
        expect(cssContains(sourceCss, 'background: var(--c-action-purple)')).toBe(true);
        expect(cssContains(sourceCss, 'color: #fff !important')).toBe(true);
        expect(cssContains(sourceCss, '--c-action-purple: #5B3AA2')).toBe(true);
        expect(cssContains(sourceCss, '--c-action-purple: #805BD1')).toBe(true);
        // The generated file is minified/optimized by Tailwind; keep its contract to a smoke check.
        expect(generatedStyles.length).toBeGreaterThan(0);
        expect(cssContains(generatedStyles, '--c-action-purple')).toBe(true);
    });
});
