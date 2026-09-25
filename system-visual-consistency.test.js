import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('shared visual language across Avenera pages', () => {
    it('applies one shared heading and surface system while retaining each page structure', () => {
        const pages = read('rnd-pages.js');
        const css = read('input.css');
        const sharedLayer = css.slice(css.indexOf('/* Avenera shared visual language'));

        for (const page of ['agenda', 'goals', 'budget', 'settings']) {
            expect(pages).toContain(`nv-standard-page-header--${page}`);
        }
        expect(pages).toContain('nv-standard-page-panel');
        expect(sharedLayer).toContain('.nv-dashboard-header');
        expect(sharedLayer).toContain('.nv-tx-page-header');
        expect(sharedLayer).toContain('.nv-accounts-header');
        expect(sharedLayer).toContain('.nv-contacts-header');
        expect(sharedLayer).toContain('.nv-reports-navigation.nv-reports-context-card');
        expect(sharedLayer).toContain('--nv-ui-page-radius: 16px');
        expect(sharedLayer).toContain('--nv-ui-panel-radius: 14px');
        expect(sharedLayer).toContain('--nv-ui-card-radius: 13px');
        expect(sharedLayer).toContain('nv-ui-page-title: clamp(22px, 2.1vw, 25px)');
        expect(sharedLayer).toContain('.nv-planning-header h1 { font-size: clamp(25px, 3vw, 34px); }');
        expect(sharedLayer).toContain('.nv-summary-card { min-height: 132px; }');
        expect(sharedLayer).toContain('.nv-account-overview strong { font-size: clamp(18px, 1.9vw, 21px);');
        expect(sharedLayer).toContain('.nv-tx-summary-count strong { font-size: 20px; }');
    });

    it('keeps page actions and semantic status treatment intact', () => {
        const components = read('cmp-pages.js');
        const pages = read('rnd-pages.js');
        const css = read('input.css');

        expect(components).toContain('data-action="openInvoicePayment"');
        expect(components).toContain('data-action="markAgendaPaid"');
        expect(pages).toContain('data-action="changeMonth"');
        expect(components).toContain('nv-agenda-summary-card is-pending');
        expect(components).toContain('nv-agenda-summary-card is-paid');
        expect(components).toContain('nv-agenda-summary-card is-overdue');
        expect(css).toContain('.nv-agenda-summary-card.is-pending');
        expect(css).toContain('.nv-agenda-summary-card.is-paid');
        expect(css).toContain('.nv-agenda-summary-card.is-overdue');
        expect(css).toContain('.nv-agenda-row');
    });

    it('renders the Accounts Agenda as a real summary-and-ledger layout without changing its financial hooks', () => {
        const components = read('cmp-pages.js');
        const pages = read('rnd-pages.js');
        const css = read('input.css');

        for (const hook of [
            'data-action="changeMonth"',
            'data-action="openInvoicePayment"',
            'data-action="markAgendaPaid"',
            'data-action="delete"',
            'totalPendente += a.valor',
            'totalPago += a.valor',
            'totalVencido += a.valor'
        ]) expect(components).toContain(hook);
        expect(pages).toContain('Contas a Pagar e Receber');
        expect(components).toContain('nv-agenda-period');
        expect(components).toContain('nv-agenda-summary-grid');
        expect(components).toContain('nv-agenda-list-card');
        expect(components).toContain('nv-agenda-row-actions');
        expect(css).toContain('.nv-agenda-row {');
        expect(css).toContain('.nv-agenda-summary-value');
        expect(css).toContain('@media (max-width: 760px)');
    });

    it("keeps Planning and Reports' approved compact details while tuning other screens", () => {
        const css = read('input.css');
        const runtimeCss = read('styles.css');
        const compactCss = runtimeCss.replace(/\s+/g, ' ').replace(/\s*([{}:;])\s*/g, '$1');

        expect(css).toContain('.nv-planning-header h1 { font-size: clamp(25px, 3vw, 34px); }');
        expect(css).toContain('background: var(--c-brand-medium);');
        expect(css).toContain('.nv-report-panel { border-color: var(--c-border); border-radius: 13px; box-shadow: var(--shadow-sm); }');
        expect(css).toContain('.nv-analysis-metric { border-radius: 10px; box-shadow: none; }');
        expect(css).toContain('.nv-planning-empty { background: var(--c-surface-soft); border-color: var(--c-border); border-radius: 12px; }');
        expect(css).toContain('.nv-reports-tab { border-radius: 9px; }');
        expect(css).toContain('.nv-report-toolbar { border-color: var(--c-border); border-radius: 11px; }');
        expect(compactCss).toMatch(/\.nv-analysis-metric\{border-radius:10px;box-shadow:none;?\}/);
        expect(compactCss).toMatch(/--nv-ui-page-title:clamp\(22px,\s*2\.1vw,\s*25px\)/);
    });

    it('compacts the sidebar and category groups without removing destinations', () => {
        const html = read('index.html');
        const renderer = read('renderer.js');
        const components = read('cmp-pages.js');
        const app = read('app.js');
        const css = read('input.css');

        expect((html.match(/data-nav-group=/g) || []).length).toBe(3);
        for (const route of ['Dashboard', 'Transacoes', 'Contas', 'Planejamento', 'Agendamentos', 'Metas', 'Orcamento', 'Relatorios', 'Categorias', 'Contatos', 'Configuracoes']) {
            expect(html).toContain(`id="nav-${route}"`);
        }
        expect(renderer).toContain("group.open = [...group.querySelectorAll('.nav-item')].some");
        expect(css).toContain('.nv-sidebar__group-chevron');
        expect(css).toContain('.nv-sidebar__group[open] { background: var(--nv-sidebar-hover); border-color: var(--nv-sidebar-border); }');
        expect(css).toContain('color: var(--nv-sidebar-active-text);');
        expect(css).toContain('width: min(258px, calc(100vw - 32px)) !important;');
        expect(css).toContain('.nv-summary-card { min-height: 112px; }');
        expect(components).not.toMatch(/<details class="nv-category-card"[^>]*\bopen(?:=|\s|>)/);
        expect(app).toContain("card.dataset.searchAutoOpened = 'true'");
        expect(app).toContain("(!normalizedQuery || !visible) && card.dataset.searchAutoOpened === 'true'");
    });

    it('shares empty-state styling without changing copy or actions', () => {
        const components = read('cmp-pages.js');
        const css = read('input.css');

        expect(components).toContain('nv-agenda-empty-state');
        expect(components).toContain('Nenhuma conta para este mês');
        expect(components).toContain('nv-standard-empty-state');
        expect(components).toContain('Sem limites definidos');
        expect(css).toContain('.nv-standard-empty-state');
        expect(css).toContain('.nv-tx-empty');
        expect(css).toContain('.nv-contacts-empty');
        expect(css).toContain('.nv-category-empty');
        expect(css).toContain('.nv-settings-empty');
    });

    it('confirms the built stylesheet and app link expose the shared visual layer', () => {
        const runtimeCss = read('styles.css');
        const index = read('index.html');
        const worker = read('service-worker.js');
        const compactCss = runtimeCss.replace(/\s+/g, ' ').replace(/\s*([{}:;])\s*/g, '$1');

        expect(compactCss).toContain('.nv-standard-page-header');
        expect(compactCss).toContain('.nv-dashboard-header');
        expect(compactCss).toContain('.nv-tx-page-header');
        expect(compactCss).toContain('.nv-standard-page-panel');
        expect(compactCss).toContain('.nv-agenda-list-card');
        expect(compactCss).toContain('.nv-agenda-row');
        expect(compactCss).toContain('.nv-sidebar__group-toggle');
        expect(compactCss).toContain('.nv-sidebar__group-items');
        expect(compactCss).toContain('.nv-category-card:not([open]) .nv-category-subrows');
        expect(compactCss).toContain('--nv-compact-card-padding:12px');
        expect(compactCss).toContain('--nv-ui-page-radius:16px');
        expect(index).toContain('styles.css?v=20260924-ui-compact-3');
        expect(worker).toContain("avenera-app-shell-v14");
        expect(worker).toContain('./styles.css?v=20260924-ui-compact-3');
    });
});
