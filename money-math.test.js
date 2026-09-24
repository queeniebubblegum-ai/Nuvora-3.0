import { describe, expect, it } from 'vitest';
import { addMoney, fromCents, splitInstallments, toCents } from './money-math.js';

describe('aritmética monetária em centavos', () => {
    it('converte entre reais e centavos e soma sem erro binário', () => {
        expect(toCents(0.1)).toBe(10);
        expect(fromCents(10)).toBe(0.1);
        expect(addMoney(0.1, 0.2)).toBe(0.3);
        expect(addMoney(10.01, 5.29, -0.3)).toBe(15);
        expect(toCents(1.005)).toBe(101);
        expect(toCents(-1.005)).toBe(-101);
        expect(addMoney(1.005, -1.005)).toBe(0);
    });

    it('distribui o resto das parcelas sem perder centavos', () => {
        const installments = splitInstallments(100, 3);
        expect(installments).toEqual([33.34, 33.33, 33.33]);
        expect(addMoney(...installments)).toBe(100);
    });

    it('distribui parcelas negativas simetricamente e soma ao total', () => {
        const installments = splitInstallments(-100, 3);
        expect(installments).toEqual([-33.34, -33.33, -33.33]);
        expect(addMoney(...installments)).toBe(-100);
    });

    it('normaliza entradas inválidas como zero e limita quantidade inválida a uma parcela', () => {
        expect(toCents('valor inválido')).toBe(0);
        expect(fromCents(Number.NaN)).toBe(0);
        expect(splitInstallments(12.345, 0)).toEqual([12.35]);
    });
});
