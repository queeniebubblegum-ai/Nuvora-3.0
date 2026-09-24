import { describe, expect, it } from 'vitest';
import { createTransfer } from './financial-transfers.js';

describe('construção de transferência interna', () => {
    it('cria duas pernas ligadas com o mesmo valor em centavos', () => {
        let next = 0;
        const legs = createTransfer({
            sourceAccountId: 'bank-a', destinationAccountId: 'bank-b',
            amount: 0.1 + 0.2, date: '2026-09-23', description: 'Reserva',
            transferId: 'tr-test', idFactory: () => `id-${++next}`
        });

        expect(legs).toHaveLength(2);
        expect(legs[0]).toMatchObject({ id: 'id-1', bancoId: 'bank-a', tipo: 'despesa', transferenciaEntrada: false, transferenciaId: 'tr-test', transferenciaInterna: true, valor: 0.3 });
        expect(legs[1]).toMatchObject({ id: 'id-2', bancoId: 'bank-b', tipo: 'receita', transferenciaEntrada: true, transferenciaId: 'tr-test', transferenciaInterna: true, valor: 0.3 });
    });

    it('rejeita conta ausente, mesma conta, valor zerado ou data inválida', () => {
        const base = { sourceAccountId: 'a', destinationAccountId: 'b', amount: 1, date: '2026-09-23' };
        expect(() => createTransfer({ ...base, sourceAccountId: '' })).toThrow('Transferência inválida.');
        expect(() => createTransfer({ ...base, destinationAccountId: 'a' })).toThrow('Transferência inválida.');
        expect(() => createTransfer({ ...base, amount: 0 })).toThrow('Transferência inválida.');
        expect(() => createTransfer({ ...base, amount: -1 })).toThrow('Transferência inválida.');
        expect(() => createTransfer({ ...base, date: '23/09/2026' })).toThrow('Transferência inválida.');
        expect(() => createTransfer({ ...base, date: '2026-02-30' })).toThrow('Transferência inválida.');
    });
});
