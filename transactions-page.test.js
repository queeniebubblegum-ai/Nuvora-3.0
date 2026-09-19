import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderPageHeader } from './rnd-pages.js';
import { PageComponents } from './cmp-pages.js';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('transactions Phase 1 redesign contracts', () => {
    it('renders a reusable escaped page header with one primary and utility actions', () => {
        const html = renderPageHeader({
            eyebrow: '<Movimentações>',
            title: 'Transações & entradas',
            subtitle: 'Texto "dinâmico"',
            className: 'nv-tx-page-header',
            stylePrefix: 'nv-tx',
            actions: [
                { action: 'exportTransactionsCSV', label: 'Exportar', icon: 'fa-file-export', variant: 'secondary' },
                { action: 'openModal', label: 'Nova transação', icon: 'fa-plus', variant: 'primary', attributes: { 'data-modal': 'modal-transacao', 'data-type': 'despesa' } }
            ]
        });

        expect(html).toContain('class="nv-page-header nv-tx-page-header"');
        expect(html).toContain('&lt;Movimentações&gt;');
        expect(html).toContain('Transações &amp; entradas');
        expect(html).toContain('data-action="exportTransactionsCSV"');
        expect(html).toContain('data-action="openModal"');
        expect(html).toContain('data-modal="modal-transacao"');
        expect(html).toContain('aria-label="Nova transação"');
        expect(html).not.toContain('<Movimentações>');
    });

    it('keeps transaction action contracts, all utility imports, filters and list protagonist hooks', () => {
        const pages = read('rnd-pages.js');
        const component = read('cmp-pages.js');
        const click = read('evt-click.js');
        const css = read('input.css');
        const runtimeCss = read('styles.css');

        expect(pages).toContain('renderPageHeader({');
        expect(pages).toContain("action: 'exportTransactionsCSV'");
        expect(pages).toContain("action: 'iniciarImportacaoOFX'");
        expect(pages).toContain("action: 'iniciarImportacaoCSV'");
        expect(pages).toContain("action: 'openModal'");
        expect(pages).toContain("'data-modal': 'modal-transacao'");
        expect(click).toContain("'iniciarImportacaoOFX': () => App.iniciarImportacaoOFX");
        expect(click).toContain("'iniciarImportacaoCSV': () => App.iniciarImportacaoCSV");
        expect(component).toContain('data-action="setTransactionTypeFilter"');
        expect(component).toContain('data-filter-key="categoria"');
        expect(component).toContain('data-filter-key="bancoId"');
        expect(component).toContain('data-filter-key="dataInicio"');
        expect(component).toContain('data-filter-key="dataFim"');
        expect(component).toContain('data-change="toggleSelectTx"');
        expect(pages).toContain('data-action="setTxPage"');
        expect(css).toContain('.nv-tx-filter-search .nv-tx-input');
        expect(css).toContain('.nv-tx-more-filters');
        expect(css).toContain('.nv-page-header');
        expect(runtimeCss).toContain('.nv-tx-filter-search .nv-tx-input');
        expect(runtimeCss).toContain('.nv-page-header');
    });

    it('keeps the complete filter UI available and makes additional filters collapsible', () => {
        const html = PageComponents.filtersSection(
            { desc: '', categoria: '', bancoId: '', mes: '', tipo: '', dataInicio: '', dataFim: '' },
            [{ id: 1, nome: 'Conta', instituicao: 'Outro' }],
            ['Casa'],
            [{ id: 2, nome: 'Cartão', bancoId: 1 }]
        );

        expect(html).toContain('data-input="setFilterDesc"');
        expect(html).toContain('data-filter-key="mes"');
        expect(html).toContain('data-filter-key="tipo"');
        expect(html).toContain('data-filter-key="categoria"');
        expect(html).toContain('data-filter-key="bancoId"');
        expect(html).toContain('data-filter-key="dataInicio"');
        expect(html).toContain('data-filter-key="dataFim"');
        expect(html).toContain('<details class="nv-tx-more-filters"');
        expect(html).toContain('data-action="clearFilters"');
    });
});
