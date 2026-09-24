import { describe, expect, it } from 'vitest';
import { cardInvoiceDueDate, planCardInvoiceSchedules } from './invoice-provisioning.js';
import { getInvoicePeriod } from './reconciliation.js';

const ref = (year, month, day) => new Date(year, month, day, 12);
const card = (id, closing, due) => ({ id, nome: `Cartão ${id}`, fechamento: closing, vencimento: due });
const purchase = (id, cardId, data, valor) => ({ id, bancoId: cardId, isCartao: true, tipo: 'despesa', data, valor });

describe('provisionamento de faturas alinhado ao ciclo do cartão', () => {
    it('calcula cada fatura pelo ciclo de fechamento e mantém o mês de vencimento como referência', () => {
        const plans = planCardInvoiceSchedules({
            cards: [card('card-1', 10, 20)],
            transactions: [
                purchase('a', 'card-1', '2026-08-11', 0.1),
                purchase('b', 'card-1', '2026-09-10', 0.2),
                purchase('c', 'card-1', '2026-09-11', 75),
                purchase('other-card', 'card-2', '2026-09-12', 900),
            ],
            now: ref(2026, 8, 19),
            monthsAhead: 2,
        });

        expect(plans).toHaveLength(2);
        expect(plans[0]).toMatchObject({
            action: 'create', cardId: 'card-1', mesReferencia: '2026-09',
            invoiceYear: 2026, invoiceMonth: 8, dataVencimento: '2026-09-20', valor: 0.3,
            transactionCount: 2, usesRealInvoiceAmount: false,
        });
        expect(plans[1]).toMatchObject({
            mesReferencia: '2026-10', invoiceYear: 2026, invoiceMonth: 9,
            dataVencimento: '2026-10-20', valor: 75, transactionCount: 1,
        });
    });

    it('leva o vencimento para o mês seguinte quando vence no dia do fechamento ou antes', () => {
        const plans = planCardInvoiceSchedules({
            cards: [card('card-2', 20, 10)],
            transactions: [
                purchase('july-close', 'card-2', '2026-07-21', 40),
                purchase('aug-close', 'card-2', '2026-08-20', 15),
                purchase('after-close', 'card-2', '2026-08-21', 90),
                purchase('sep-close', 'card-2', '2026-09-20', 10),
            ],
            now: ref(2026, 8, 5),
            monthsAhead: 2,
        });

        expect(plans.map(item => [item.mesReferencia, item.invoiceMonth, item.dataVencimento, item.valor])).toEqual([
            ['2026-09', 7, '2026-09-10', 55],
            ['2026-10', 8, '2026-10-10', 100],
        ]);
        expect(cardInvoiceDueDate(card('card-2', 20, 10), 2026, 7)).toEqual(ref(2026, 8, 10));
        expect(cardInvoiceDueDate(card('same-day', 20, 20), 2026, 7)).toEqual(ref(2026, 8, 20));
    });

    it('usa o valor real registrado da fatura e inclui ajustes quando ainda não há valor real', () => {
        const transactions = [purchase('purchase', 'card-1', '2026-08-11', 100)];
        const reconciliations = [
            { chave: 'card-1:2026-09', valorFaturaReal: 87.5, ajustes: [{ id: 'fee', amount: 2, effect: 'charge' }] },
        ];
        const realAmountPlan = planCardInvoiceSchedules({
            cards: [card('card-1', 10, 20)], transactions, reconciliations,
            now: ref(2026, 8, 1), monthsAhead: 1,
        });
        expect(realAmountPlan[0]).toMatchObject({ valor: 87.5, usesRealInvoiceAmount: true });

        const estimatedPlan = planCardInvoiceSchedules({
            cards: [card('card-1', 10, 20)], transactions,
            reconciliations: [{ chave: 'card-1:2026-09', ajustes: [{ id: 'fee', amount: 2, effect: 'charge' }] }],
            now: ref(2026, 8, 1), monthsAhead: 1,
        });
        expect(estimatedPlan[0]).toMatchObject({ valor: 102, usesRealInvoiceAmount: false });
    });

    it('atualiza somente uma fatura pendente e não recria nem altera faturas finalizadas', () => {
        const transactions = [purchase('purchase', 'card-1', '2026-08-11', 100)];
        const base = { cartaoId: 'card-1', mesReferencia: '2026-09', categoria: 'Fatura Cartão' };
        const updatePlan = planCardInvoiceSchedules({
            cards: [card('card-1', 10, 20)], transactions,
            existingSchedules: [{ ...base, id: 'pending', status: 'pendente', valor: 80, dataVencimento: '2026-09-19' }],
            now: ref(2026, 8, 1), monthsAhead: 1,
        });
        expect(updatePlan).toHaveLength(1);
        expect(updatePlan[0]).toMatchObject({ action: 'update', existingId: 'pending', valor: 100, dataVencimento: '2026-09-20' });

        const paidPlan = planCardInvoiceSchedules({
            cards: [card('card-1', 10, 20)], transactions,
            existingSchedules: [{ ...base, id: 'paid', status: 'pago', valor: 80, dataVencimento: '2026-09-19' }],
            now: ref(2026, 8, 1), monthsAhead: 1,
        });
        expect(paidPlan).toEqual([]);

        const cancelledPlan = planCardInvoiceSchedules({
            cards: [card('card-1', 10, 20)], transactions,
            existingSchedules: [{ ...base, id: 'cancelled', status: 'cancelado', valor: 80, dataVencimento: '2026-09-19' }],
            now: ref(2026, 8, 1), monthsAhead: 1,
        });
        expect(cancelledPlan).toEqual([]);

        const unknownStatePlan = planCardInvoiceSchedules({
            cards: [card('card-1', 10, 20)], transactions,
            existingSchedules: [{ ...base, id: 'unknown', status: 'em revisão', valor: 80, dataVencimento: '2026-09-19' }],
            now: ref(2026, 8, 1), monthsAhead: 1,
        });
        expect(unknownStatePlan).toEqual([]);

        const mixedDuplicatePlan = planCardInvoiceSchedules({
            cards: [card('card-1', 10, 20)], transactions,
            existingSchedules: [
                { ...base, id: 'paid', status: 'pago', valor: 80, dataVencimento: '2026-09-19' },
                { ...base, id: 'pending', status: 'pendente', valor: 80, dataVencimento: '2026-09-19' },
            ],
            now: ref(2026, 8, 1), monthsAhead: 1,
        });
        expect(mixedDuplicatePlan).toHaveLength(1);
        expect(mixedDuplicatePlan[0]).toMatchObject({ action: 'update', existingId: 'pending', valor: 100 });

        const unchangedPlan = planCardInvoiceSchedules({
            cards: [card('card-1', 10, 20)], transactions,
            existingSchedules: [{ ...base, id: 'same', status: 'pendente', valor: 100, dataVencimento: '2026-09-20' }],
            now: ref(2026, 8, 1), monthsAhead: 1,
        });
        expect(unchangedPlan).toEqual([]);
    });

    it('limita o fechamento ao último dia real do mês, sem transbordar para o mês seguinte', () => {
        const april = getInvoicePeriod({ id: 'card-31', fechamento: 31 }, 2027, 3);
        expect(april.start.getFullYear()).toBe(2027);
        expect(april.start.getMonth()).toBe(3);
        expect(april.start.getDate()).toBe(1);
        expect(april.end.getMonth()).toBe(3);
        expect(april.end.getDate()).toBe(30);

        const march = getInvoicePeriod({ id: 'card-30', fechamento: 30 }, 2027, 2);
        expect(march.start.getDate()).toBe(1);
        expect(march.end.getDate()).toBe(30);
    });

    it('clampa dia 31 ao último dia do mês e ignora cartões sem ciclo válido', () => {
        const plans = planCardInvoiceSchedules({
            cards: [card('card-31', 10, 31), card('invalid', 0, 10)],
            transactions: [purchase('purchase', 'card-31', '2027-01-11', 10)],
            now: ref(2027, 1, 20),
            monthsAhead: 1,
        });
        expect(plans).toHaveLength(1);
        expect(plans[0]).toMatchObject({ mesReferencia: '2027-02', dataVencimento: '2027-02-28', valor: 10 });
    });
});
