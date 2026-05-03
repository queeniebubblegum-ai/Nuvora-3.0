import { describe, it, expect } from 'vitest';
import { MentorMath } from './mnt-math.js';

describe('MentorMath - Pilares Estratégicos da Anora', () => {
    
    describe('Fluxo de Caixa (Cashflow Health)', () => {
        it('deve retornar 100 se a margem de sobra for >= 30%', () => {
            // Renda: 10000, Despesa: 6000 -> Margem: 4000 (40%)
            expect(MentorMath.calculateCashflowHealth(10000, 6000)).toBe(100);
        });

        it('deve retornar 0 se não houver renda declarada', () => {
            expect(MentorMath.calculateCashflowHealth(0, 5000)).toBe(0);
        });

        it('deve retornar 10 se houver quebra de caixa (despesa maior que receita)', () => {
            // Renda: 5000, Despesa: 6000 -> Margem negativa
            expect(MentorMath.calculateCashflowHealth(5000, 6000)).toBe(10);
        });
    });

    describe('Reservas (Reserves Health)', () => {
        it('deve retornar 100 se o saldo cobrir 6 meses ou mais de despesas', () => {
            // Saldo: 30000, Despesa Média: 5000 -> Cobre 6 meses
            expect(MentorMath.calculateReservesHealth(30000, 5000)).toBe(100);
        });

        it('deve retornar 40 se o saldo cobrir menos de 1 mês inteiro', () => {
            // Saldo: 2500, Despesa Média: 5000 -> Cobre 0.5 meses
            expect(MentorMath.calculateReservesHealth(2500, 5000)).toBe(40);
        });

        it('deve retornar 0 se não houver saldo e as despesas forem nulas', () => {
            expect(MentorMath.calculateReservesHealth(0, 0)).toBe(0);
        });
    });

    describe('Crédito (Credit Health)', () => {
        it('deve retornar 100 se o uso de cartão de crédito for <= 15% da renda', () => {
            // Fatura: 1000, Renda: 10000 -> 10% da renda comprometida
            expect(MentorMath.calculateCreditHealth(1000, 10000)).toBe(100);
        });

        it('deve retornar 20 se o limite do cartão dominar a renda (acima de 70%)', () => {
            // Fatura: 8000, Renda: 10000 -> 80% da renda
            expect(MentorMath.calculateCreditHealth(8000, 10000)).toBe(20);
        });
    });

    describe('Futuro (Future Security)', () => {
        it('deve retornar 100 se não houver faturas e parcelamentos pendentes no futuro', () => {
            expect(MentorMath.calculateFutureSecurity(5000, 0)).toBe(100);
        });

        it('deve retornar 20 se os compromissos futuros forem maiores que 3x a renda mensal', () => {
            // Renda: 5000, Dívida Futura Parcelada: 20000 -> 4x a renda presa
            expect(MentorMath.calculateFutureSecurity(5000, 20000)).toBe(20);
        });
    });
});