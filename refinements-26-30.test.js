import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getDashboardQuickAction } from './rnd-pages.js';
import { PageComponents } from './cmp-pages.js';
import { loadViewContext, saveViewContext, VIEW_CONTEXT_PREFIX } from './view-context.js';
import { CSVImport } from './csv-import.js';
import { ImportError, IMPORT_ERROR_CODES } from './import-errors.js';
import { ReportComponents } from './cmp-reports.js';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('refinements 26–30', () => {
    it('prioritizes an overdue navigation action, then a negative-balance receipt, then the type selector', () => {
        expect(getDashboardQuickAction({ contasAtrasadas: [{ id: 1 }] })).toMatchObject({ action: 'navigate', payload: 'Agendamentos', label: 'Regularizar pendências' });
        expect(getDashboardQuickAction({ saldo: -1, contasAtrasadas: [] })).toMatchObject({ action: 'openModal', modal: 'modal-transacao', type: 'receita', label: 'Registrar receita' });
        expect(getDashboardQuickAction({ saldo: 0, contasAtrasadas: [] })).toMatchObject({ action: 'openTypeSelector', label: 'Novo lançamento' });
    });

    it('exposes a real uncategorized filter CTA and supports clearing it', () => {
        const html = PageComponents.uncategorizedTransactionsNotice(2);
        expect(html).toContain('data-action="filterUncategorized"');
        expect(html).toContain('2 transações sem categoria');
        expect(PageComponents.uncategorizedTransactionsNotice(2, true)).toContain('data-action="clearUncategorizedFilter"');
    });

    it('keeps view context session-scoped and falls back safely on corruption', () => {
        globalThis.sessionStorage?.clear();
        saveViewContext('reports.tab', 'cartoes', value => value === 'cartoes');
        expect(globalThis.sessionStorage?.getItem(`${VIEW_CONTEXT_PREFIX}reports.tab`)).toBe('"cartoes"');
        expect(loadViewContext('reports.tab', 'fluxo', value => ['fluxo', 'cartoes'].includes(value))).toBe('cartoes');
        globalThis.sessionStorage?.setItem(`${VIEW_CONTEXT_PREFIX}reports.tab`, '{bad');
        expect(loadViewContext('reports.tab', 'fluxo', value => value === 'cartoes')).toBe('fluxo');
    });

    it('uses actionable standardized import errors before data writes', () => {
        expect(() => CSVImport.parse('')).toThrowError(ImportError);
        try { CSVImport.parse(''); } catch (error) { expect(error.code).toBe(IMPORT_ERROR_CODES.EMPTY_FILE); }
        expect(read('csv-manager.js')).toContain('Escolher outro arquivo');
        expect(read('ofx.js')).toContain('OFX_INVALID_FORMAT');
    });

    it('labels projected values only in planning/report projection components', () => {
        expect(read('rnd-pages.js')).toContain('nv-estimated-badge');
        expect(ReportComponents.reportCartoesVisual({ cartoes: [], comprasCartao: [] }, { reportPeriod: 3 })).toContain('Estimado');
        expect(ReportComponents.reportFluxo({ transacoes: [] }, { reportCashflowPeriod: 1 })).not.toContain('nv-estimated-badge');
        expect(read('cmp-pages.js')).not.toContain('nv-estimated-badge');
    });
});
