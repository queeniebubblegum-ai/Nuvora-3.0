import { describe, it, expect } from 'vitest';
import { CSVImport } from './csv-import.js';

describe('Importação CSV', () => {
    it('deve interpretar CSV brasileiro com ponto e vírgula e moeda', () => {
        const result = CSVImport.parse('Data;Valor;Descrição\n05/08/2026;-1.234,56;Mercado\n06/08/2026;2500,00;Salário');
        expect(result).toEqual([
            { data: '2026-08-05', identificador: '', valor: 1234.56, desc: 'Mercado', tipo: 'despesa', importadoCSV: true },
            { data: '2026-08-06', identificador: '', valor: 2500, desc: 'Salário', tipo: 'receita', importadoCSV: true }
        ]);
    });
    it('deve respeitar descrições entre aspas com delimitador', () => {
        const result = CSVImport.parse('date,amount,description\n2026-08-05,-10,"Loja, Centro"');
        expect(result[0].desc).toBe('Loja, Centro');
    });
    it('deve preservar o identificador original do extrato', () => {
        const result = CSVImport.parse('Data;Valor;Identificador;Descrição\n05/08/2026;-25,90;FIT123;Mercado');
        expect(result[0].identificador).toBe('FIT123');
    });
    it('deve ignorar linhas com data inválida ou valor zerado', () => {
        const result = CSVImport.parse('Data;Valor;Descrição\n31/99/2026;-10;Inválida\n06/08/2026;0;Zerado\n07/08/2026;15;Válida');
        expect(result).toHaveLength(1);
        expect(result[0].data).toBe('2026-08-07');
    });

    it('deve rejeitar CSV sem data ou valor', () => {
        expect(() => CSVImport.parse('Descrição\nMercado')).toThrow();
    });
});
