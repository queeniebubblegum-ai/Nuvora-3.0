import { describe, it, expect } from 'vitest';
import { Utils } from './utils.js';

describe('Importação OFX', () => {
    it('deve interpretar créditos e débitos e preservar a data', () => {
        const ofx = `
            <OFX><BANKTRANLIST>
            <DTSTART>20260801</DTSTART><DTEND>20260802</DTEND>
            <STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260801</DTPOSTED><TRNAMT>-25.50</TRNAMT><NAME>Mercado</NAME></STMTTRN>
            <STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20260802</DTPOSTED><TRNAMT>1000.00</TRNAMT><MEMO>Salario</MEMO></STMTTRN>
            </BANKTRANLIST></OFX>`;

        const result = Utils.parseOFX(ofx);
        expect(result.transactions).toHaveLength(2);
        expect(result.transactions[0]).toMatchObject({ tipo: 'despesa', valor: 25.5, data: '2026-08-01' });
        expect(result.transactions[1]).toMatchObject({ tipo: 'receita', valor: 1000, data: '2026-08-02' });
    });

    it('deve retornar lista vazia para um arquivo sem transações', () => {
        expect(Utils.parseOFX('<OFX></OFX>').transactions).toEqual([]);
    });
});
