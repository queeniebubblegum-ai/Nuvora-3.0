import { describe, it, expect } from 'vitest';
import { UtilDate } from './util-date.js';

describe('UtilDate - Controle de Tempo e Agendamentos', () => {
    it('formatToBR: deve converter formato ISO (YYYY-MM-DD) para formato BR (DD/MM/YYYY)', () => {
        expect(UtilDate.formatToBR('2026-03-01')).toBe('01/03/2026');
    });

    it('formatToBR: deve retornar a string original ou default se for mal formatada', () => {
        expect(UtilDate.formatToBR('')).toBe('--/--/----');
        expect(UtilDate.formatToBR('Texto Invalido')).toBe('Texto Invalido');
    });

    it('getDaysBetween: deve calcular a diferença de dias exata entre duas datas', () => {
        expect(UtilDate.getDaysBetween('2026-03-01', '2026-03-10')).toBe(9);
        expect(UtilDate.getDaysBetween('2026-03-01', '2026-03-01')).toBe(0);
    });

    it('addMonthsSafe: deve adicionar um mês sem quebrar a virada (ex: Jan 31 para Fev 28)', () => {
        // Ano não bissexto: 31 de Janeiro + 1 mês = 28 de Fevereiro (impede saltar para 3 de Março)
        expect(UtilDate.addMonthsSafe('2026-01-31', 1)).toBe('2026-02-28');
    });

    it('addMonthsSafe: deve adicionar um mês normalmente no meio do mês', () => {
        // 15 de Maio + 3 meses = 15 de Agosto
        expect(UtilDate.addMonthsSafe('2026-05-15', 3)).toBe('2026-08-15');
    });
});