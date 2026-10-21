import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnoraNLP } from './anora-nlp.js';
import { Database } from './db.js';

describe('Anora NLP expense lookup', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', { getItem: () => null });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('handles legacy transactions with missing descriptions or categories', () => {
        vi.spyOn(Database, 'getTransacoesPorMes').mockReturnValue([
            { tipo: 'despesa', valor: 25, categoria: null },
            { tipo: 'despesa', valor: 12, desc: undefined }
        ]);

        let response;
        expect(() => { response = AnoraNLP.processarMensagem('Quanto gastei com Uber este mês?'); }).not.toThrow();
        expect(response).toContain('não encontrei nenhuma despesa relacionada a "uber"');
    });
});
