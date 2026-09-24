import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DashboardComponents } from './cmp-dashboard.js';
import {
    calculateEndOfMonthProjection,
    getLastUpdatedIndicator,
    financialValueClass,
    shouldHandleNewTransactionShortcut,
    animateCurrencyValues
} from './financial-refinements.js';
import fs from 'node:fs';

const source = file => fs.readFileSync(file, 'utf8');

const reference = new Date('2026-09-22T12:00:00');

describe('refinements 31–35', () => {
    it('projects only persisted dated future values and never realized transactions', () => {
        const projection = calculateEndOfMonthProjection({
            currentBalance: 1000,
            now: reference,
            futureIncome: [
                { id: 'salary', valor: 500, data: '2026-09-30', status: 'prevista' },
                { id: 'paid', valor: 900, data: '2026-09-25', status: 'recebida' },
                { id: 'outside', valor: 800, data: '2026-10-01', status: 'prevista' }
            ],
            pendingExpenses: [
                { id: 'rent', valor: 200, dataVencimento: '2026-09-28', tipo: 'despesa', status: 'pendente' },
                { id: 'realized', valor: 1000, dataVencimento: '2026-09-29', tipo: 'despesa', status: 'pago' }
            ],
            recurringForecasts: [{ id: 'streaming', valor: 50, data: '2026-09-27', ativa: true }]
        });
        expect(projection.available).toBe(true);
        expect(projection.value).toBe(1250);
        expect(projection.expectedIncome).toBe(500);
        expect(projection.pendingExpenses).toBe(200);
        expect(projection.recurringExpenses).toBe(50);
    });

    it('uses a neutral insufficient-data state instead of inventing a projection', () => {
        const projection = calculateEndOfMonthProjection({ currentBalance: 1000, now: reference });
        expect(projection.available).toBe(false);
        expect(projection.value).toBeNull();
        expect(projection.label).toBe('Projeção indisponível');
        expect(DashboardComponents.dashboardCards({ saldo: 1000 })).toContain('Dados insuficientes para projetar');
    });

    it('accepts only persisted trustworthy timestamps and formats safe Portuguese relative labels', () => {
        expect(getLastUpdatedIndicator(null, reference)).toBeNull();
        expect(getLastUpdatedIndicator('not-a-date', reference)).toBeNull();
        expect(getLastUpdatedIndicator('2026-09-22T11:58:00', reference).relative).toBe('Atualizado há 2 minutos');
        expect(getLastUpdatedIndicator('2026-09-22T12:01:00', reference)).toBeNull();
    });

    it('does not animate first paint or unchanged values, and honors reduced motion', () => {
        const root = document.createElement('div');
        root.innerHTML = '<strong data-currency-value="10">R$ 10,00</strong>';
        const format = value => `R$ ${Number(value).toFixed(2)}`;
        const win = { matchMedia: () => ({ matches: false }), requestAnimationFrame: vi.fn(() => 1), cancelAnimationFrame: vi.fn() };
        expect(animateCurrencyValues(root, format, win)).toBe(0);
        expect(animateCurrencyValues(root, format, win)).toBe(0);
        root.firstElementChild.setAttribute('data-currency-value', '20');
        expect(animateCurrencyValues(root, format, win)).toBe(1);
        const reducedWin = { matchMedia: () => ({ matches: true }), requestAnimationFrame: vi.fn() };
        root.firstElementChild.setAttribute('data-currency-value', '30');
        expect(animateCurrencyValues(root, format, reducedWin)).toBe(0);
        expect(root.textContent).toBe('R$ 30.00');
    });

    it('limits Alt+N to desktop and non-conflicting, non-editable focus', () => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
        const event = { altKey: true, key: 'n', target: document.body, defaultPrevented: false };
        expect(shouldHandleNewTransactionShortcut(event, document)).toBe(true);
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();
        expect(shouldHandleNewTransactionShortcut({ ...event, target: input }, document)).toBe(false);
        input.remove();
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
        expect(shouldHandleNewTransactionShortcut(event, document)).toBe(false);
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    });

    it('keeps reusable tone hooks in dashboard, planning and reports without changing raw-total semantics', () => {
        expect(financialValueClass(1)).toContain('financial-value--positive');
        expect(financialValueClass(-1)).toContain('financial-value--negative');
        expect(financialValueClass(0)).toContain('financial-value--neutral');
        expect(source('rnd-pages.js')).toContain('financialValueClass');
        expect(source('cmp-reports.js')).toContain('financialValueClass');
        expect(source('db.js')).toContain('ultimaAtualizacao: new Date().toISOString()');
        expect(source('input.css')).toContain('.financial-value--neutral');
    });
});
