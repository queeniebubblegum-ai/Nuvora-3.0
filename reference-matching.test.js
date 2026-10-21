import { describe, expect, it } from 'vitest';
import { referenceCandidates, validateReferenceLink, pendingReferenceRows } from './reference-matching.js';

const expense = { id: 'tx', desc: 'Mercado Central', valor: 35.90, tipo: 'despesa', data: '2026-10-20' };
const row = { id: 'r1', desc: 'Mercado Central', valor: 35.90, tipo: 'despesa', data: '2026-10-21' };
describe('sugestões de correspondência, sem confirmação automática', () => {
    it('explica uma sugestão por direção, centavos, data e descrição', () => {
        expect(referenceCandidates(expense, [row])).toEqual([{ referenceId: 'r1', reason: expect.stringContaining('diferença de 1 dia') }]);
    });
    it('não confunde receita e despesa, nem valor igual de descrição não relacionada', () => {
        expect(referenceCandidates(expense, [{ ...row, tipo: 'receita' }])).toEqual([]);
        expect(referenceCandidates(expense, [{ ...row, desc: 'Pagamento internet' }])).toEqual([]);
    });
    it('não encobre diferença de um centavo e não sugere data distante sem identificador', () => {
        expect(referenceCandidates(expense, [{ ...row, valor: 35.91 }])).toEqual([]);
        expect(referenceCandidates(expense, [{ ...row, data: '2026-11-20' }])).toEqual([]);
    });
    it('preserva ambiguidade em vez de escolher automaticamente entre dois candidatos', () => {
        expect(referenceCandidates(expense, [row, { ...row, id: 'r2' }])).toHaveLength(2);
        expect(pendingReferenceRows({ referenceRows: [row] }, {})).toEqual([row]);
    });
    it('recusa vincular a mesma linha duas vezes e exige direção/valor', () => {
        const record = { referenceRows: [row] };
        expect(() => validateReferenceLink(record, expense, 'r1', { other: { referenceId: 'r1' } })).toThrow('já está vinculada');
        expect(() => validateReferenceLink(record, { ...expense, tipo: 'receita' }, 'r1', {})).toThrow('direção');
    });
    it('não esconde referência pendente sem justificativa explícita', () => {
        expect(pendingReferenceRows({ referenceRows: [row], ignoredReferences: { r1: { reason: '' } } }, {})).toHaveLength(1);
        expect(pendingReferenceRows({ referenceRows: [row], ignoredReferences: { r1: { reason: 'Linha de outra conta no arquivo' } } }, {})).toHaveLength(0);
    });
});
