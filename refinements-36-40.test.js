import { describe, expect, it, vi } from 'vitest';
import { PageComponents } from './cmp-pages.js';
import { DashboardComponents } from './cmp-dashboard.js';
import { SubmitGuard } from './submit-guard.js';
import { SubmitFeedback } from './submit-feedback.js';
import { configureUITracking, trackUIEvent } from './ui-tracking.js';

const fakeForm = () => ({ dataset: {}, setAttribute(name, value) { this[name] = value; }, querySelector() { return null; } });

describe('Refinamentos 36–40', () => {
    it('locks one delegated form and releases it without a permanent disabled state', () => {
        const form = fakeForm();
        expect(SubmitGuard.begin(form)).toBe(true);
        expect(SubmitGuard.begin(form)).toBe(false);
        SubmitGuard.release(form);
        expect(SubmitGuard.begin(form)).toBe(true);
        SubmitGuard.release(form);
    });

    it('keeps submit feedback accessible and restores the original button', () => {
        const button = { innerHTML: 'Salvar', dataset: {}, disabled: false, classList: { add() {}, remove() {} }, setAttribute(name, value) { this[name] = value; } };
        const form = { querySelector() { return button; } };
        SubmitFeedback.set(form, 'loading', 'Salvando');
        expect(button.disabled).toBe(true);
        expect(button['aria-busy']).toBe('true');
        SubmitFeedback.set(form, 'success', 'Salvo');
        expect(button['aria-busy']).toBe('false');
        SubmitFeedback.reset(form);
        expect(button.innerHTML).toBe('Salvar');
    });

    it('adds one human date heading per contiguous date group', () => {
        const html = PageComponents.transactionList([
            { id: 1, desc: 'A', valor: 10, tipo: 'despesa', data: '2026-01-01', categoria: 'Casa' },
            { id: 2, desc: 'B', valor: 20, tipo: 'despesa', data: '2026-01-01', categoria: 'Casa' },
            { id: 3, desc: 'C', valor: 30, tipo: 'despesa', data: 'not-a-date', categoria: 'Casa' }
        ], { selectedTransactions: [] });
        expect((html.match(/class="nv-tx-date-heading"/g) || []).length).toBe(2);
        expect(html).toContain('Data inválida');
    });

    it('renders one real Anora navigation action for known types', () => {
        const html = DashboardComponents.insightsSection({
            score: 40, classification: 'Vulnerável', userLevel: 2, isOnboarding: false,
            insights: ['Atenção'], recommendation: 'Revisar', recommendationType: 'overdue'
        });
        expect(html).toContain('data-action="navigate" data-payload="Agendamentos"');
        expect((html.match(/class="nv-onboarding-action"/g) || []).length).toBe(1);
    });

    it('does not emit arbitrary or financial metadata through the local tracker', () => {
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
        configureUITracking(true);
        expect(trackUIEvent({ screen: 'Transacoes', source: 'test', action: 'saved', valor: 10 })).toBeNull();
        expect(debug).not.toHaveBeenCalled();
        expect(trackUIEvent({ screen: 'Transacoes', source: 'test', action: 'saved' })).toEqual({ screen: 'Transacoes', source: 'test', action: 'saved' });
        debug.mockRestore();
        configureUITracking(false);
    });
});
