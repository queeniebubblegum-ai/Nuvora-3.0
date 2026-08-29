import { describe, it, expect } from 'vitest';
import { CSVImport } from './csv-import.js';

describe('Importação CSV', () => {
    it('deve interpretar CSV brasileiro com ponto e vírgula e moeda', () => {
        const result = CSVImport.parse('Data;Valor;Descrição\n05/08/2026;-1.234,56;Mercado\n06/08/2026;2500,00;Salário');
        expect(result).toEqual([
            { data: '2026-08-05', valor: 1234.56, desc: 'Mercado', tipo: 'despesa', importadoCSV: true },
            { data: '2026-08-06', valor: 2500, desc: 'Salário', tipo: 'receita', importadoCSV: true }
        ]);
    });
    it('deve respeitar descrições entre aspas com delimitador', () => {
        const result = CSVImport.parse('date,amount,description\n2026-08-05,-10,"Loja, Centro"');
        expect(result[0].desc).toBe('Loja, Centro');
    });
    it('deve rejeitar CSV sem data ou valor', () => {
        expect(() => CSVImport.parse('Descrição\nMercado')).toThrow();
    });
});
