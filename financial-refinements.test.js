import { describe, expect, it } from 'vitest';
import { calculateSpendableAmount } from './financial-refinements.js';

describe('calculateSpendableAmount', () => {
    it('returns unavailable when the current balance is not finite', () => {
        expect(calculateSpendableAmount({ currentBalance: 'not-a-number' })).toEqual({
            available: false,
            value: null,
            reason: 'Saldo atual indisponível.'
        });
    });

    it('combines balance, expected income, pending expenses and budget room', () => {
        expect(calculateSpendableAmount({
            currentBalance: 1000,
            futureIncome: [{ valor: 500 }],
            pendingExpenses: [{ valor: 200 }],
            budgets: [
                { categoria: 'Casa', limite: 600 },
                { categoria: 'Mercado', limite: 300 }
            ],
            spentByCategory: { Casa: 450, Mercado: 100 }
        })).toMatchObject({
            available: true,
            value: 350,
            cashAfterCommitments: 1300,
            budgetRoom: 350,
            expectedIncome: 500,
            committedExpenses: 200
        });
    });

    it('calcula quanto ainda pode ser gasto sem inventar valores', () => {
        const result = calculateSpendableAmount({
            currentBalance: 1000,
            futureIncome: [{ valor: 500 }],
            pendingExpenses: [{ valor: 300 }],
            budgets: [{ categoria: 'Alimentação', limite: 800 }],
            spentByCategory: { Alimentação: 350 },
        });

        expect(result.available).toBe(true);
        expect(result.cashAfterCommitments).toBe(1200);
        expect(result.budgetRoom).toBe(450);
        expect(result.value).toBe(450);
    });

    it('uses cash after commitments when no valid budget limit exists', () => {
        expect(calculateSpendableAmount({
            currentBalance: 100,
            futureIncome: [{ valor: '50' }],
            pendingExpenses: [{ valor: '25' }],
            budgets: [{ categoria: 'Casa', limite: 'invalid' }]
        })).toMatchObject({
            available: true,
            value: 125,
            budgetRoom: null
        });
    });

    it('does not mutate source arrays or objects', () => {
        const pendingExpenses = [{ valor: 25 }];
        const budgets = [{ categoria: 'Casa', limite: 100 }];
        calculateSpendableAmount({ currentBalance: 100, pendingExpenses, budgets });
        expect(pendingExpenses).toEqual([{ valor: 25 }]);
        expect(budgets).toEqual([{ categoria: 'Casa', limite: 100 }]);
    });
});
