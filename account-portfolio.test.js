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

    it('trata reservas como alocação virtual dentro do saldo bancário, sem contar duas vezes', () => {
        const summary = accountPortfolioSummary({
            banks: [{ saldo: 4200 }],
            reserves: [{ saldo: 900 }, { saldo: 600 }]
        });
        expect(summary.cashBalance).toBe(4200);
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
        expect(html).toContain('Disponível após reservas');
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

    it('exibe a ação de pagamento dentro do cartão para uma fatura pendente', () => {
        const html = PageComponents.accountsPage(
            [{ id: 'bank-pay', nome: 'Conta pagamento', saldo: 900 }],
            [{ id: 'card-pay', nome: 'Cartão principal', bancoId: 'bank-pay', limite: 2000, fechamento: 20, vencimento: 10 }],
            [],
            [],
            [
                { id: 'invoice-pending', categoria: 'Fatura Cartão', cartaoId: 'card-pay', status: 'pendente', dataVencimento: '2026-09-25', valor: 123.45 },
                { id: 'invoice-cancelled', categoria: 'Fatura Cartão', cartaoId: 'card-pay', status: 'cancelado', dataVencimento: '2026-10-25', valor: 88 },
            ]
        );

        expect(html).toContain('data-action="openInvoicePaymentForCard" data-id="card-pay"');
        expect(html).toContain('aria-label="Registrar pagamento da fatura de Cartão principal"');
        expect(html).toContain('Registrar pagamento da fatura');
        expect(html).toContain('123,45');
        expect(html).not.toContain('invoice-cancelled');
    });

    it('mantém o acesso visível no cartão mesmo sem agendamento pendente', () => {
        const html = PageComponents.accountsPage(
            [{ id: 'bank-no-invoice', nome: 'Conta' }],
            [{ id: 'card-no-invoice', nome: 'Cartão sem agenda', bancoId: 'bank-no-invoice', limite: 1000 }],
            [],
            [],
            []
        );

        expect(html).toContain('data-action="openInvoicePaymentForCard" data-id="card-no-invoice"');
        expect(html).toContain('Registrar pagamento da fatura');
    });

    it('mostra total, reservado e disponível também na página de metas', () => {
        const html = PageComponents.goalsPage([], [], {
            bancos: [{ saldo: 4200 }],
            reservas: [{ saldo: 1500 }]
        });
        expect(html).toContain('Saldo bancário total');
        expect(html).toContain('Reservado para metas');
        expect(html).toContain('Disponível após reservas');
        expect(html).toContain('4.200,00');
        expect(html).toContain('2.700,00');
    });

    it('renderiza os rótulos de total, reservado e disponível sem incluir limite do cartão no patrimônio', () => {
        const html = PageComponents.accountsPage(
            [{ id: 'bank-summary', nome: 'Conta', saldo: 4200 }],
            [{ id: 'card-summary', nome: 'Cartão', limite: 5000 }],
            [],
            [{ id: 'reserve-summary', goalId: 'goal-summary', nome: 'Reserva: Meta', saldo: 1500 }]
        );
        expect(html).toContain('Saldo bancário total');
        expect(html).toContain('Reservado para metas');
        expect(html).toContain('Disponível após reservas');
        expect(html).toContain('4.200,00');
        expect(html).toContain('1.500,00');
        expect(html).toContain('2.700,00');
        expect(html).not.toContain('9.200,00');
    });
});
