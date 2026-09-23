import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ReportComponents } from './cmp-reports.js';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('refinamentos seguros 21–25', () => {
    it('debounces only transaction description search and applies clear immediately', () => {
        const events = read('events.js');
        expect(events).toContain('setTimeout(apply, 250)');
        expect(events).toContain("if (!normalizedValue) {");
        expect(events).toContain('App.scheduleRender();');
        expect(events).toContain('nuvora:navigate');
        expect(events).not.toContain('Utils.debounce((val) => {\n            App.setFilter');
    });

    it('announces transaction result totals without a second visible count', () => {
        const pages = read('rnd-pages.js');
        expect(pages).toContain('class="nv-tx-results-status" aria-live="polite"');
        expect(pages).toContain("totalItems === 1 ? 'movimentação encontrada' : 'movimentações encontradas'");
    });

    it('keeps elevation tokens scoped to overlays and available in source/runtime CSS', () => {
        const sourceCss = read('input.css');
        const runtimeCss = read('styles.css');
        expect(sourceCss).toContain('--shadow-elevated');
        expect(sourceCss).toContain('--c-surface-elevated');
        expect(sourceCss).toContain('.nv-modal-shell');
        expect(sourceCss).toContain('.nv-dashboard-new-menu__popover');
        expect(sourceCss).toContain('@media (prefers-reduced-motion: reduce)');
        expect(runtimeCss).toContain('--shadow-elevated');
        expect(runtimeCss).toContain('--c-surface-elevated');
        expect(runtimeCss).toContain('.nv-modal-shell');
        expect(runtimeCss).toContain('.nv-dashboard-new-menu__popover');
        expect(runtimeCss.replace(/\s+/g, '')).toContain('@media(prefers-reduced-motion:reduce)');
        expect(read('cmp-modals.js')).toContain('nv-modal-shell');
    });

    it('adds an escaped period context to the selected report heading', () => {
        const html = ReportComponents.reportsPage({ transacoes: [] }, { reportTab: 'fluxo', reportCashflowPeriod: 3 });
        expect(html).toContain('class="nv-reports-selected-period"');
        expect(html).toContain('Últimos 3 meses');
        expect(html).toContain('Período:');
        expect(read('cmp-reports.js')).toContain('Utils.escapeHTML(selectedPeriod)');
    });

    it('keeps the mobile planning summary tied to the existing budget model and modal contract', () => {
        const pages = read('rnd-pages.js');
        const css = read('input.css');
        expect(pages).toContain('class="nv-planning-mobile-summary"');
        expect(pages).toContain('budget.disponivelGeral');
        expect(pages).toContain('data-action="openModal" data-modal="modal-transacao" data-type="despesa"');
        expect(css).toContain('@media (max-width: 767px)');
        expect(css).toContain('.nv-planning-mobile-summary { display: flex; }');
    });
});
