import { describe, expect, it } from 'vitest';
import { getCategoriaColor } from './categorias-padrao.js';
import { PageComponents } from './cmp-pages.js';

describe('category appearance and ledger context', () => {
    it('gives untouched default groups distinct colors without changing records', () => {
        const food = { id: 'cat_padrao_1', grupo: 'Alimentação', cor: '#F43F5E' };
        const grocery = { id: 'cat_padrao_2', grupo: 'Alimentação', cor: '#F43F5E' };
        const home = { id: 'cat_padrao_3', grupo: 'Moradia', cor: '#F43F5E' };
        expect(getCategoriaColor(food)).toBe(getCategoriaColor(grocery));
        expect(getCategoriaColor(food)).not.toBe(getCategoriaColor(home));
        expect(food.cor).toBe('#F43F5E');
    });

    it('preserves custom colors, including a custom category with a default name', () => {
        expect(getCategoriaColor({ id: 'custom', nome: 'Alimentação', cor: '#F43F5E' })).toBe('#F43F5E');
        expect(getCategoriaColor({ id: 'cat_padrao_1', grupo: 'Alimentação', cor: '#123456' })).toBe('#123456');
        expect(getCategoriaColor({ cor: 'red; background:url(bad)' })).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('starts each page with its date even when the previous page ended on that day', () => {
        const element = document.createElement('div');
        element.innerHTML = PageComponents.transactionList([
            { id: 'next-page', desc: 'Mercado', valor: 10, tipo: 'despesa', data: '2026-10-03', categoria: 'Alimentação' }
        ], { selectedTransactions: [], previousTransactionDate: '2026-10-03' });
        expect(element.querySelectorAll('.nv-tx-date-heading')).toHaveLength(1);
        expect(element.querySelector('.nv-tx-date-group')?.textContent).toContain('03/10/2026');
    });
});
