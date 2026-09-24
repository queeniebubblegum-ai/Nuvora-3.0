import { describe, expect, it } from 'vitest';
import { DashboardComponents } from './cmp-dashboard.js';

const renderCalendar = (agendamentos = [], receitas = [], state = { agendaYear: 2026, agendaMonth: 8 }) => {
    const host = document.createElement('div');
    host.innerHTML = DashboardComponents.dashboardAgenda(agendamentos, receitas, state);
    return host;
};

describe('agenda calendar layout regression', () => {
    it('keeps September 2026 Monday-first with 42 cells including outside days', () => {
        const host = renderCalendar();
        const weekdays = host.querySelector('.calendar-weekdays');
        const calendar = host.querySelector('.calendar-grid');

        expect(weekdays).not.toBeNull();
        expect([...weekdays.children].map(day => day.textContent)).toEqual(['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']);
        expect(calendar.children).toHaveLength(42);
        // September 1, 2026 is a Tuesday: Monday, August 31 is the first outside cell.
        expect(calendar.children[0].classList.contains('is-outside')).toBe(true);
        expect(calendar.children[1].getAttribute('data-payload')).toBe('2026-09-01');
        expect(calendar.children[1].getAttribute('data-action')).toBe('showAgendaDay');
        expect(host.querySelector('.calendar-legend')).not.toBeNull();
    });

    it('keeps real agenda data, day states, accessibility and navigation hooks', () => {
        const host = renderCalendar(
            [{ id: 1, dataVencimento: '2026-09-03', valor: 10, tipo: 'despesa' }],
            [{ id: 2, data: '2026-09-04', valor: 100, tipo: 'receita', status: 'recebida' }],
            { agendaYear: 2026, agendaMonth: 8, agendaSelectedDate: '2026-09-03' }
        );
        const day = host.querySelector('[data-payload="2026-09-03"]');
        const completed = host.querySelector('[data-payload="2026-09-04"]');
        const today = new Date();

        expect(day.classList.contains('calendar-day')).toBe(true);
        expect(day.classList.contains('agenda-day--has-items')).toBe(true);
        expect(day.getAttribute('aria-pressed')).toBe('true');
        expect(day.getAttribute('aria-label')).toContain('3 de setembro de 2026');
        expect(completed.querySelector('.calendar-dot--completed')).not.toBeNull();
        expect(host.querySelector('[data-action="changeAgendaMonth"][data-dir="-1"]')).not.toBeNull();
        expect(host.querySelector('[data-action="changeAgendaMonth"][data-dir="1"]')).not.toBeNull();

        if (today.getFullYear() === 2026 && today.getMonth() === 8) {
            expect(host.querySelector(`[data-payload="2026-09-${String(today.getDate()).padStart(2, '0')}"]`).classList.contains('agenda-day--today')).toBe(true);
        }
    });
});
