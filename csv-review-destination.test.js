import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCSVReviewRows, CSVManager } from './csv-manager.js';
import { OFXManager } from './ofx.js';
import { db } from './db.js';

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('CSV destination review', () => {
    const row = { data: '2026-10-16', desc: 'Mercado Central', valor: 85.7, tipo: 'despesa', identificador: 'fit-1' };

    it('recomputes duplicates using the selected account and preserves manual categories', () => {
        const database = { bancos: [{ id: 'a' }, { id: 'b' }], transacoes: [{ ...row, id: 'old', bancoId: 'a', codigoRef: 'fit-1' }] };
        const first = buildCSVReviewRows([row], 'a', { database });
        expect(first[0].status).toBe('duplicada');
        first[0].categoria = 'Alimentação';
        const second = buildCSVReviewRows([row], 'b', { database, previous: first });
        expect(second[0]).toMatchObject({ status: 'nova', selecionado: true, categoria: 'Alimentação', idTemp: first[0].idTemp });
        expect(database.transacoes).toHaveLength(1);
    });

    it('recognizes own transfers and invoice payments without importing their expenses twice', () => {
        const database = { bancos: [{ id: 'a' }], transacoes: [{ ...row, bancoId: 'a', tipo: 'transferencia', transferenciaInterna: true, transferenciaEntrada: false }] };
        expect(buildCSVReviewRows([row], 'a', { database })[0].status).toBe('duplicada');
        database.transacoes[0] = { ...row, bancoId: 'a', tipo: 'pagamento-fatura' };
        expect(buildCSVReviewRows([row], 'a', { database })[0].status).toBe('duplicada');
        database.transacoes[0] = { ...row, bancoId: 'a', isCartao: true };
        expect(buildCSVReviewRows([row], 'a', { database })[0].status).toBe('nova');
    });

    it('detects duplicate identifiers inside the file and preserves a manual deselection', () => {
        const database = { bancos: [], transacoes: [] };
        const first = buildCSVReviewRows([row, { ...row, desc: 'Descrição diferente' }], 'a', { database });
        expect(first[1].status).toBe('duplicada');
        first[0].selecionado = false;
        expect(buildCSVReviewRows([row], 'a', { database, previous: first })[0].selecionado).toBe(false);
    });

    it('routes CSV account changes to CSV instead of reparsing a previous OFX', () => {
        const state = { tipoImportacao: 'CSV', rawOfxString: '<OFX>OLD</OFX>', bancoAlvoOFX: 'a', csvRawRows: [row], ofxPendente: [] };
        const csvChange = vi.spyOn(CSVManager, 'handleBancoChange').mockImplementation((id, view) => { view.rawOfxString = null; });
        const ofxParse = vi.spyOn(OFXManager, 'processarEVerificarDuplicidades');
        const render = vi.fn();
        OFXManager.handleOfxBancoChange('b', state, render, vi.fn());
        expect(csvChange).toHaveBeenCalledWith('b', state, expect.any(Function));
        expect(ofxParse).not.toHaveBeenCalled();
        expect(state.bancoAlvoOFX).toBe('b');
        expect(state.rawOfxString).toBeNull();
        expect(render).toHaveBeenCalledOnce();
    });

    it('keeps the selected account and current raw file in the review modal', () => {
        const previousBanks = db.bancos;
        const previousTransactions = db.transacoes;
        db.bancos = [{ id: 'a', nome: 'Conta A' }, { id: 'b', nome: 'Conta B' }];
        db.transacoes = [];
        document.body.innerHTML = '<select id="ofx-banco-alvo-id"></select><span id="ofx-count-novos"></span>';
        const state = { tipoImportacao: 'CSV', bancoAlvoOFX: 'b', csvRawRows: [row] };
        CSVManager.prepareReview(state);
        expect(document.getElementById('ofx-banco-alvo-id').value).toBe('b');
        expect(state.csvRawRows).toEqual([row]);
        expect(state.ofxPendente[0].selecionado).toBe(true);
        db.bancos = previousBanks;
        db.transacoes = previousTransactions;
    });
});
