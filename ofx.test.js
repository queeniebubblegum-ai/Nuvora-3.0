import { describe, it, expect } from 'vitest';
import { Utils } from './utils.js';
import { normalizeStatementBalance, reverseStatementBalanceAdjustment, shouldAnchorImportedTransactionsToStatementBalance, statementBalanceAdjustment, statementBalanceAnchorMetadata } from './ofx-balance.js';

describe('Importação OFX', () => {
    it('ancora transações apenas quando o saldo final OFX foi confirmado', () => {
        expect(shouldAnchorImportedTransactionsToStatementBalance({ importType: 'OFX', balanceConfirmed: true, statementBalance: 1400 })).toBe(true);
        expect(shouldAnchorImportedTransactionsToStatementBalance({ importType: 'OFX', balanceConfirmed: true, statementBalance: 0 })).toBe(true);
        expect(shouldAnchorImportedTransactionsToStatementBalance({ importType: 'CSV', balanceConfirmed: true, statementBalance: 1400 })).toBe(false);
        expect(shouldAnchorImportedTransactionsToStatementBalance({ importType: 'OFX', balanceConfirmed: false, statementBalance: 1400 })).toBe(false);
        expect(shouldAnchorImportedTransactionsToStatementBalance({ importType: 'OFX', balanceConfirmed: true, statementBalance: null })).toBe(false);
        expect(shouldAnchorImportedTransactionsToStatementBalance({ importType: 'OFX', balanceConfirmed: true, statementBalance: 'invalid' })).toBe(false);
        expect(statementBalanceAnchorMetadata({ importType: 'OFX', balanceConfirmed: true, statementBalance: 1400 })).toEqual({ saldoIncluidoNoSaldoDoExtrato: true });
        expect(statementBalanceAnchorMetadata({ importType: 'CSV', balanceConfirmed: true, statementBalance: 1400 })).toEqual({});
    });

    it('reverte somente o ajuste do saldo do extrato e preserva movimentação posterior', () => {
        expect(reverseStatementBalanceAdjustment({ currentBalance: 1450, adjustment: 400 })).toBe(1050);
    });

    it('normaliza saldo OFX e reverte ajustes posteriores em centavos inteiros', () => {
        expect(normalizeStatementBalance(90.205)).toBe(90.21);
        const adjustment = statementBalanceAdjustment(90.2, 100.1);
        expect(adjustment).toBe(-9.9);
        expect(reverseStatementBalanceAdjustment({ currentBalance: 90.4, adjustment })).toBe(100.3);
    });

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
