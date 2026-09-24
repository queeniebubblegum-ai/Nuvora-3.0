import { describe, expect, it } from 'vitest';
import { accountPortfolioSummary, PageComponents } from './cmp-pages.js';

describe('separação entre patrimônio e crédito', () => {
    it('calcula dinheiro disponível e crédito sem misturar as categorias', () => {
        const summary = accountPortfolioSummary({
            banks: [{ id: 'bank-1', saldo: 1200 }, { id: 'bank-2', saldo: -200 }],
            cards: [
                { id: 'card-1', limite: 1000 },
                { id: 'card-2', limiteTotal: 500 }
            ],
            cardPurchases: [
                { cartaoId: 'card-1', valor: 800 },
                { bancoId: 'card-2', valor: 100 }
            ]
        });

        expect(summary.cashBalance).toBe(1000);
        expect(summary.totalCreditLimit).toBe(1500);
        expect(summary.totalCreditUsed).toBe(900);
        expect(summary.totalCreditAvailable).toBe(600);
        expect(summary.credit[0]).toMatchObject({ used: 800, available: 200, utilization: 80 });
        expect(summary.credit[1]).toMatchObject({ used: 100, available: 400, utilization: 20 });
    });

    it('separa dinheiro total, reservas vinculadas a metas e disponibilidade fora das metas', () => {
        const summary = accountPortfolioSummary({
            banks: [{ saldo: 2700 }],
            reserves: [{ saldo: 900 }, { saldo: 600 }]
        });
        expect(summary.cashBalance).toBe(2700);
        expect(summary.reservedBalance).toBe(1500);
        expect(summary.totalMoney).toBe(4200);
        expect(summary.availableMoney).toBe(2700);
    });

    it('soma saldos, limites e compras de cartão sem ruído decimal', () => {
        const summary = accountPortfolioSummary({
            banks: [{ saldo: 0.1 }, { saldo: 0.2 }],
            cards: [{ id: 'card-cents', limite: 1 }],
            cardPurchases: [
                { cartaoId: 'card-cents', valor: 0.1 },
                { cartaoId: 'card-cents', valor: 0.2 }
            ]
        });

        expect(summary.cashBalance).toBe(0.3);
        expect(summary.credit[0]).toMatchObject({ used: 0.3, available: 0.7 });
        expect(summary.totalCreditUsed).toBe(0.3);
        expect(summary.totalCreditAvailable).toBe(0.7);
    });

    it('não mistura saldo em conta com crédito disponível', () => {
        const result = accountPortfolioSummary({
            banks: [{ saldo: 1200 }],
            cards: [{ id: 'card-1', limite: 2000 }],
            cardPurchases: [{ cartaoId: 'card-1', valor: 700 }],
        });

        expect(result.cashBalance).toBe(1200);
        expect(result.totalCreditUsed).toBe(700);
        expect(result.totalCreditAvailable).toBe(1300);
    });

    it('renderiza o resumo e os estados de utilização dos cartões', () => {
        const html = PageComponents.accountsPage(
            [{ id: 'bank-1', nome: 'Conta', saldo: 1000 }],
            [
                { id: 'card-danger', nome: 'Crítico', limite: 100 },
                { id: 'card-warning', nome: 'Atenção', limite: 200 },
                { id: 'card-success', nome: 'Seguro', limite: 500 }
            ],
            [
                { isCartao: true, bancoId: 'card-danger', valor: 110 },
                { isCartao: true, bancoId: 'card-warning', valor: 160 },
                { isCartao: true, bancoId: 'card-success', valor: 100 }
            ]
        );

        expect(html).toContain('nv-account-overview');
        expect(html).toContain('Disponível fora das metas');
        expect(html).toContain('Crédito disponível');
        expect(html).toContain('nv-credit-card');
        expect(html).toContain('nv-credit-card__body');
        expect(html).toContain('nv-credit-card--outlined');
        expect(html).toContain('nv-credit-status is-danger');
        expect(html).toContain('nv-credit-status is-warning');
        expect(html).toContain('nv-credit-status is-success');
        expect(html).toContain('Limite disponível');
        expect(html).not.toContain('nv-credit-card-details');
        expect(html).not.toContain('nv-credit-card-metrics');
        expect(html).toContain('Fatura atual:');
        expect(html).toContain('Utilizado ·');
    });

    it('mostra total, reservado e disponível também na página de metas', () => {
        const html = PageComponents.goalsPage([], [], {
            bancos: [{ saldo: 2700 }],
            reservas: [{ saldo: 1500 }]
        });
        expect(html).toContain('Total em contas e reservas');
        expect(html).toContain('Reservado para metas');
        expect(html).toContain('Disponível fora das metas');
        expect(html).toContain('4.200,00');
    });

    it('renderiza os rótulos de total, reservado e disponível sem incluir limite do cartão no patrimônio', () => {
        const html = PageComponents.accountsPage(
            [{ id: 'bank-summary', nome: 'Conta', saldo: 2700 }],
            [{ id: 'card-summary', nome: 'Cartão', limite: 5000 }],
            [],
            [{ id: 'reserve-summary', goalId: 'goal-summary', nome: 'Reserva: Meta', saldo: 1500 }]
        );
        expect(html).toContain('Total em contas e reservas');
        expect(html).toContain('Reservado para metas');
        expect(html).toContain('Disponível fora das metas');
        expect(html).toContain('4.200,00');
        expect(html).toContain('1.500,00');
        expect(html).toContain('2.700,00');
        expect(html).not.toContain('9.200,00');
    });
});
