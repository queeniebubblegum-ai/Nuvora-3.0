import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const routes = [
  'Dashboard', 'Transacoes', 'Relatorios', 'Planejamento', 'Agendamentos', 'Contas',
  'Contatos', 'Metas', 'Orcamento', 'Categorias', 'Conciliacao', 'Importacao',
  'Anora', 'Configuracoes', 'Investimentos'
];
const stylesheet = './redesign-v4-coordinated.css?v=20261016-layout-v4';

describe('coordinated V4 design integration contract', () => {
  it('applies one token bridge after both existing page and shell stylesheets', () => {
    const index = read('index.html');
    const worker = read('service-worker.js');
    const css = read('redesign-v4-coordinated.css');
    expect(index.indexOf('styles-v4.css')).toBeLessThan(index.indexOf(stylesheet));
    expect(index).toContain(stylesheet);
    expect(worker).toContain("avenera-app-shell-v25");
    expect(worker).toContain(`'${stylesheet}'`);
    for (const token of ['--c-bg: #F4F5F9', '--c-surface: #FFFFFF', '--c-border: #E1E3EB', '--font-ui:', '--font-heading:', '--font-numeric:', '--radius-sm: 8px', '--radius-md: 10px', '--radius-lg: 12px', '--radius-xl: 16px', '--radius-2xl: 20px']) {
      expect(css).toContain(token);
    }
    for (const token of ['--c-bg: #17191F', '--c-surface: #20232B', '--c-border: #383B47', '--c-brand-soft: #342E42']) {
      expect(css).toContain(token);
    }
    expect(css).toContain('--page: var(--c-bg)');
    expect(css).toContain('--surface: var(--c-surface)');
    expect(css).toContain('--action: var(--c-action-purple)');
  });

  it('covers shared page primitives without replacing route renderers or data actions', () => {
    const css = read('redesign-v4-coordinated.css');
    const router = read('router.js');
    const pages = read('rnd-pages.js');
    const events = read('evt-click.js') + read('evt-change.js') + read('evt-submit.js');
    expect(router).toContain('validPages:');
    for (const route of routes) {
      expect(router).toContain(`'${route}'`);
      expect(pages).toContain(route);
    }
    expect(router).toContain("'Investimentos'");
    for (const primitive of ['.nv-page-header', '.nv-standard-page-header', '.nv-dashboard-header', '.nv-dashboard-card', '.nv-standard-page-panel', '.nv-agenda-list-card', '.nv-settings-panel', '.nv-analysis-metric', '.nv-accounts-card', '.nv-tx-panel', '.nv-planning-panel', '.nv-contacts-list']) {
      expect(css).toContain(primitive);
    }
    for (const action of ['openInvoicePayment', 'markAgendaPaid', 'setDashboardPeriod', 'exportTransactionsCSV', 'handleOFXUpload', 'handleCSVUpload']) {
      expect(events).toContain(action);
    }
    expect(read('index.html')).not.toContain('PROTÓTIPO INTERATIVO');
    expect(read('index.html')).not.toContain('transaction-form');
  });

  it('coordinates route-specific compositions instead of only aliasing token names', () => {
    const css = read('redesign-v4-coordinated.css');
    for (const routeRoot of [
      '.nv-dashboard-shell', '.nv-transactions-page', '.nv-reports-workspace',
      '.nv-planning-page', '.nv-agenda-page', '.nv-accounts-page',
      '.nv-contacts-page', '.nv-categories-page', '.nv-settings-page', '.nv-anora-page'
    ]) expect(css).toContain(routeRoot);
    for (const visualContract of [
      '.nv-report-table-header', '.nv-report-table-row', '.nv-analysis-metric',
      '.nv-category-section', '.nv-settings-panel', '.nv-agenda-list-card',
      '.nv-tx-panel', '.nv-anora-chat', '.nv-report-empty'
    ]) expect(css).toContain(visualContract);
    expect(css).toContain('@media (max-width: 780px)');
    expect(css).toContain('@media (max-width: 480px)');
    expect(css).toContain('font-family: var(--font-heading)');
    expect(css).toContain('box-shadow: none;');
  });

  it('keeps shell/runtime asset versions synchronized with the service-worker cache', () => {
    const index = read('index.html');
    const worker = read('service-worker.js');
    expect(index.match(/redesign-v4-coordinated\.css\?v=([^"']+)/)?.[1]).toBe('20261016-layout-v4');
    expect(worker.match(/redesign-v4-coordinated\.css\?v=([^"']+)/)?.[1]).toBe('20261016-layout-v4');
    expect(worker).toContain("avenera-app-shell-v25");
  });

  it('renders real route templates into the shared live layout canvas', () => {
    const renderer = read('renderer.js');
    const pages = read('rnd-pages.js');
    const dashboard = read('cmp-dashboard.js');
    const reports = read('cmp-reports.js');
    const anora = read('rnd-anora.js');
    expect(renderer).toContain('nv-live-page nv-live-page--');
    expect(renderer).toContain('data-live-route');
    expect(renderer).toContain('PageRenderers[currentPage](appState)');
    for (const route of routes) {
      expect(read('router.js')).toContain(`'${route}'`);
    }
    // Shared header and semantic hierarchy are emitted by production templates,
    // not supplied by a mock route or inert token stylesheet.
    expect(pages.match(/renderPageHeader\(\{ eyebrow: 'Progresso financeiro'/)).not.toBeNull();
    expect(pages.match(/renderPageHeader\(\{ eyebrow: 'Planejamento'/)).not.toBeNull();
    expect(pages.match(/renderPageHeader\(\{ eyebrow: 'Sistema'/)).not.toBeNull();
    expect(dashboard).toContain('nv-live-metric-grid');
    expect(reports).toContain('data-layout="analysis-workspace"');
    expect(anora).toContain('data-anora-page');
    // Production data/action wiring remains in place after the structural move.
    for (const action of ['openModal', 'changeMonth', 'navigate', 'setDashboardPeriod', 'exportPDF']) {
      expect(pages + dashboard + reports).toContain(action);
    }
    expect(read('db.js')).toContain('indexedDB');
    expect(read('router.js')).toContain("'Investimentos'");
  });

  it('uses Public Sans for body text and Fraunces/Sora only for their intended roles', () => {
    const config = read('tailwind.config.js');
    const css = read('redesign-v4-coordinated.css');
    expect(config).toContain("primary: ['Public Sans'");
    expect(config).toContain("display: ['Fraunces'");
    expect(config).toContain("mono: ['Sora'");
    expect(css).toContain('body.font-primary');
    expect(css).toContain('font-family: var(--font-numeric) !important');
    expect(css).toContain('font-variant-numeric: tabular-nums');
  });
});
