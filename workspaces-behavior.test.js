import { describe, expect, it, vi } from 'vitest';
import { buildInvestmentContribution, buildInvestmentPosition, saveInvestmentChange, setupWorkspaceInteractions } from './ctrl-investimentos.js';
import { db } from './db.js';
import { getInvestmentCapital, getInvestmentHistory, getInvestmentSummary, getReconciliationWorkspaceData, renderImportWorkspace, renderReconciliationWorkspace } from './cmp-workspaces.js';

describe('investment accounting in the connected workspace', () => {
    it('keeps a contribution separate from appreciation and preserves legacy fields', () => {
        const position = { id: 'asset-string', nome: 'Tesouro', valorAtual: 1200, aporte: 1000, observacao: 'Preservar' };
        const result = buildInvestmentContribution(position, { valor: 200.01, data: '2026-10-15' }, '2026-10-16');
        expect(result.valorAtual).toBe(1400.01);
        expect(result.capitalInvestido).toBe(1200.01);
        expect(result.observacao).toBe('Preservar');
        expect(getInvestmentSummary([result]).gain).toBe(200);
        expect(result.movimentos[0]).toMatchObject({ tipo: 'aporte', valor: 200.01, data: '2026-10-15' });
        expect(position.valorAtual).toBe(1200);
    });

    it('does not invent acquisition cost or return for a legacy position', () => {
        const legacy = { id: 'old', valorAtual: 500, aporte: 0 };
        expect(getInvestmentCapital(legacy)).toBeNull();
        const result = buildInvestmentContribution(legacy, { valor: 50, data: '2026-10-16' }, '2026-10-16');
        expect(result.capitalInvestido).toBeNull();
        expect(getInvestmentSummary([result]).gain).toBeNull();
        expect(getInvestmentSummary([result], new Date('2026-10-16T12:00:00')).monthlyContributions).toBe(50);
    });

    it('updates a valuation without adding an aporte', () => {
        const existing = { id: 'a', nome: 'Ativo', valorAtual: 500, capitalInvestido: 400, movimentos: [{ tipo: 'aporte', valor: 50, data: '2026-09-01' }] };
        const result = buildInvestmentPosition({ nome: 'Ativo', valorAtual: '550', capitalInvestido: '400', classe: 'Ações' }, existing, '2026-10-16');
        expect(result.id).toBe('a');
        expect(result.movimentos.at(-1)).toMatchObject({ tipo: 'avaliacao', valorAnterior: 500, valorAtual: 550 });
        expect(getInvestmentSummary([result], new Date('2026-10-16T12:00:00')).monthlyContributions).toBe(0);
    });

    it('rejects invalid or future contribution dates and invalid amounts', () => {
        const position = { id: 'a', valorAtual: 100 };
        expect(() => buildInvestmentContribution(position, { valor: 20, data: '2026-02-30' }, '2026-10-16')).toThrow(/data/);
        expect(() => buildInvestmentContribution(position, { valor: 20, data: '2026-10-17' }, '2026-10-16')).toThrow(/data/);
        expect(() => buildInvestmentContribution(position, { valor: 0, data: '2026-10-16' }, '2026-10-16')).toThrow(/maior/);
        expect(() => buildInvestmentPosition({ nome: 'A', valorAtual: -2 })).toThrow(/valor/);
    });

    it('persists only the portfolio patch and propagates storage failures', async () => {
        const store = { investimentos: [{ id: 'a', nome: 'Antigo', valorAtual: 100 }], bancos: [{ id: 'b', saldo: 400 }] };
        const database = { replaceAll: vi.fn().mockRejectedValueOnce(new Error('Quota excedida')).mockResolvedValue(true) };
        await expect(saveInvestmentChange({ id: 'a', nome: 'Novo', valorAtual: 120 }, { store, database, today: '2026-10-16' })).rejects.toThrow('Quota excedida');
        expect(store.investimentos[0].nome).toBe('Antigo');
        await saveInvestmentChange({ id: 'a', nome: 'Novo', valorAtual: 120 }, { store, database, today: '2026-10-16' });
        expect(database.replaceAll.mock.calls[1][0]).toEqual({ investimentos: [expect.objectContaining({ id: 'a', nome: 'Novo', valorAtual: 120 })] });
        expect(store.bancos[0].saldo).toBe(400);
    });

    it('shows portfolio evolution only on dates with actual data for every current position', () => {
        expect(getInvestmentHistory([{ id: 'a', valorAtual: 100 }])).toEqual([]);
        expect(getInvestmentHistory([{ historicoValores: [{ data: '2026-10-14', valor: 100 }, { data: '2026-10-16', valor: 120 }] }, { historicoValores: [{ data: '2026-10-15', valor: 200 }, { data: '2026-10-16', valor: 210 }] }])).toEqual([{ data: '2026-10-15', valor: 300 }, { data: '2026-10-16', valor: 330 }]);
    });

    it('opens the real edit and contribution forms with the selected string ID', () => {
        db.investimentos = [{ id: 'asset-uuid', nome: 'Ativo existente', valorAtual: 123.45, aporte: 100, classe: 'Classe antiga' }];
        document.body.innerHTML = '<button data-action="workspaceEditInvestment" data-id="asset-uuid">Editar</button><button data-action="workspaceInvestmentContribution" data-id="asset-uuid">Aportar</button>';
        const app = { viewState: {}, openModal: vi.fn(), scheduleRender: vi.fn() };
        const teardown = setupWorkspaceInteractions(app);
        document.querySelector('[data-action="workspaceEditInvestment"]').click();
        const form = document.querySelector('[data-workspace-investment-form]');
        expect(form.elements.namedItem('id').value).toBe('asset-uuid');
        expect(form.elements.namedItem('nome').value).toBe('Ativo existente');
        expect(form.elements.namedItem('classe').value).toBe('Classe antiga');
        expect(app.openModal).toHaveBeenCalledWith('modal-investimento-workspace');
        document.querySelector('[data-action="workspaceInvestmentContribution"]').click();
        expect(form.elements.namedItem('mode').value).toBe('contribution');
        expect(form.elements.namedItem('nome').disabled).toBe(true);
        expect(form.elements.namedItem('valorAporte').disabled).toBe(false);
        expect(form.elements.namedItem('valorAporte').required).toBe(true);
        teardown();
        document.body.innerHTML = '';
        delete db.investimentos;
    });
});

describe('financial workspace integration', () => {
    it('uses the card closing cycle and canonical reconciliation key', () => {
        const database = { cartoes: [{ id: 'c', nome: 'Cartão', fechamento: 20 }], transacoes: [{ id: 'outside', bancoId: 'c', isCartao: true, valor: 900, data: '2026-10-25' }, { id: 'inside', bancoId: 'c', isCartao: true, valor: 100, data: '2026-09-25' }], conciliacoesFaturas: [{ chave: 'c:2026-10', valorFaturaReal: 100, ajustes: [] }] };
        const result = getReconciliationWorkspaceData(database, { workspaceReconciliationMonth: 9, workspaceReconciliationYear: 2026 });
        expect(result.selected.transactions.map(item => item.id)).toEqual(['inside']);
        expect(result.selected.status).toBe('aguardando conferência');
        expect(result.reconciledCount).toBe(0);
        expect(renderReconciliationWorkspace(database, { workspaceReconciliationMonth: 9, workspaceReconciliationYear: 2026 })).not.toContain('conciliado auto');
    });

    it('renders an import preview from pending real records without writing to source', () => {
        const database = { bancos: [{ id: 'b', nome: 'Minha conta' }] };
        const state = { bancoAlvoOFX: 'b', tipoImportacao: 'CSV', ofxPendente: [{ idTemp: '1', data: '2026-10-16', desc: '<salário>', valor: 100, tipo: 'receita', status: 'nova', selecionado: true }] };
        const before = JSON.stringify({ database, state });
        const html = renderImportWorkspace(database, state);
        expect(html).toContain('&lt;salário&gt;');
        expect(html).toContain('1 novos selecionados');
        expect(html).not.toContain('.qif');
        expect(JSON.stringify({ database, state })).toBe(before);
    });
});
