import { describe, it, expect } from 'vitest';
import { UtilFinance } from './util-finance.js';

describe('UtilFinance - Matemática Financeira', () => {
    it('calculatePMT: deve calcular corretamente o parcelamento sem juros (1 parcela)', () => {
        const result = UtilFinance.calculatePMT(1000, 1, 0);
        expect(result.pmt).toBe(1000);
        expect(result.total).toBe(1000);
    });

    it('calculatePMT: deve calcular corretamente o parcelamento sem juros (múltiplas parcelas)', () => {
        const result = UtilFinance.calculatePMT(1000, 4, 0);
        expect(result.pmt).toBe(250);
        expect(result.total).toBe(1000);
    });

    it('calculatePMT: deve calcular juros compostos corretamente', () => {
        // Exemplo: Compra de R$ 1000 parcelada em 10x com 2% de juros ao mês
        const result = UtilFinance.calculatePMT(1000, 10, 2);
        
        // A parcela (PMT) deve ser aproximadamente 111.33 (111.3265...)
        expect(result.pmt).toBeCloseTo(111.33, 2);
        
        // O total pago deve ser aproximadamente 1113.27 (1113.2652...)
        expect(result.total).toBeCloseTo(1113.27, 2);
    });

    it('formatMoney: deve formatar números como moeda BRL', () => {
        const result = UtilFinance.formatMoney(1500.50);
        expect(result).toContain('R$');
        expect(result).toContain('50');
    });

    it('formatMoney: deve retornar zero quando o valor for inválido', () => {
        expect(UtilFinance.formatMoney(NaN)).toBe('R$ 0,00');
    });

    it('formatMoney: deve tolerar valores nulos sem quebrar a tela', () => {
        expect(UtilFinance.formatMoney(null)).toBe('R$ 0,00');
        expect(UtilFinance.formatMoney(undefined)).toBe('R$ 0,00');
    });
});