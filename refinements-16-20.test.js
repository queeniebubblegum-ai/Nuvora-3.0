import { describe, expect, it, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
    TRANSACTION_FILTERS_STORAGE_KEY,
    getDefaultTransactionFilters,
    loadTransactionFilters,
    persistTransactionFilters
} from './transaction-filters.js';
import { CoreComponents } from './cmp-core.js';
import { ReportComponents } from './cmp-reports.js';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('refinamentos seguros 16–20', () => {
    beforeEach(() => localStorage.clear());

    it('persists and restores only valid transaction filters', () => {
        const value = { ...getDefaultTransactionFilters(), desc: 'mercado', tipo: 'despesa', mes: '8', dataInicio: '2026-09-01', bancoId: 'banco_7' };
        persistTransactionFilters({ ...value, selectedTransactions: ['transient'], unknown: 'ignored' });
        expect(JSON.parse(localStorage.getItem(TRANSACTION_FILTERS_STORAGE_KEY))).toEqual(value);
        expect(loadTransactionFilters()).toEqual(value);
    });

    it('falls back safely for corrupt JSON and invalid values', () => {
        localStorage.setItem(TRANSACTION_FILTERS_STORAGE_KEY, '{broken');
        expect(loadTransactionFilters()).toEqual(getDefaultTransactionFilters());
        localStorage.setItem(TRANSACTION_FILTERS_STORAGE_KEY, JSON.stringify({ tipo: 'other', mes: '12', dataInicio: '2026-02-30', bancoId: 'javascript:bad' }));
        expect(loadTransactionFilters()).toEqual(getDefaultTransactionFilters());
    });

    it('provides an accessible future loading boundary without mounting a fake delay', () => {
        const html = CoreComponents.loadingSkeleton();
        expect(html).toContain('role="status"');
        expect(html).toContain('aria-live="polite"');
        expect(read('input.css')).toContain('.nv-skeleton');
        expect(read('styles.css')).toContain('.nv-skeleton');
    });

    it('adds honest report source disclosures and goal states', () => {
        const report = ReportComponents.reportFluxo({ transacoes: [] }, { reportCashflowPeriod: 1 });
        expect(report).toContain('nv-report-source');
        expect(report).toContain('transações do período selecionado');
        expect(CoreComponents._getGoalProgress({ atual: 100, alvo: 100 }).statusLabel).toBe('Concluída');
        expect(CoreComponents._getGoalProgress({ atual: 75, alvo: 100 }).statusLabel).toBe('Quase lá');
        expect(CoreComponents._getGoalProgress({ atual: 10, alvo: 100 }).statusLabel).toBe('Em progresso');
        expect(CoreComponents._getGoalProgress({ atual: 10, alvo: 0 }).statusLabel).toBe('Alvo não informado');
        expect(CoreComponents._buildGoalCard({ id: 1, nome: 'Sem alvo', atual: 10, alvo: 0 }, new Date())).toContain('Alvo não informado');
        expect(CoreComponents._buildGoalCard({ id: 1, nome: 'Sem alvo', atual: 10, alvo: 0 }, new Date())).not.toContain('10.0%');
    });

    it('keeps undo as a real delegated action with an eight-second snapshot contract', () => {
        const controller = read('ctrl-transacoes.js');
        const click = read('evt-click.js');
        const dom = read('util-dom.js');
        expect(controller).toContain('duration: 8000');
        expect(controller).toContain("action: 'undoTransactions'");
        expect(controller).toContain('Database.add');
        expect(click).toContain("'undoTransactions': () => Controllers.undoDeletedTransactions()");
        expect(dom).toContain('options?.duration');
    });
});
