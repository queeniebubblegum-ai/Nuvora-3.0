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

    it('preserves an explicit action aria-label without emitting a duplicate attribute', () => {
        const html = renderPageHeader({
            title: 'Transações',
            actions: [{ action: 'navigate', label: 'Abrir histórico', icon: 'fa-list', attributes: { 'aria-label': 'Consultar histórico financeiro', 'data-payload': 'Transacoes' } }]
        });
        expect((html.match(/aria-label=/g) || []).length).toBe(1);
        expect(html).toContain('aria-label="Consultar histórico financeiro"');
        expect(html).toContain('data-action="navigate"');
    });

    it('keeps successful transaction confirmations actionable without changing destructive toasts', () => {
        const controller = read('ctrl-transacoes.js');
        const dom = read('util-dom.js');
        expect(controller).toContain('showTransactionSavedToast');
        expect(controller).toContain("payload: 'Transacoes'");
        expect(controller).toContain("label: 'Ver lançamento'");
        expect(dom).toContain('options = {}');
        expect(dom).toContain('data-action');
        expect(controller).toContain("Utils.showToast('Ação desfeita. Transações restauradas.', 'success')");
    });

    it('keeps transaction action contracts, all utility imports, filters and list protagonist hooks', () => {
        const pages = read('rnd-pages.js');
        const component = read('cmp-pages.js');
        const click = read('evt-click.js');
        const css = read('input.css');
        const runtimeCss = read('styles.css');
        const typeMenu = read('transaction-type-menu.js');

        expect(pages).toContain('renderPageHeader({');
        expect(pages).toContain("action: 'exportTransactionsCSV'");
        expect(pages).toContain("action: 'iniciarImportacaoOFX'");
        expect(pages).toContain("action: 'iniciarImportacaoCSV'");
        expect(pages).toContain("action: 'openModal'");
        expect(pages).toContain("type: 'transaction-type-selector'");
        expect(typeMenu).toContain('data-modal="modal-transacao"');
        expect(typeMenu).toContain('data-type="receita"');
        expect(typeMenu).toContain('data-type="despesa"');
        expect(typeMenu).toContain('data-modal="modal-transferencia"');
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


    it('scopes the approved typography and tabular-number treatment to Transactions', () => {
        const header = renderPageHeader({ title: 'Transações', stylePrefix: 'nv-tx' });
        const component = read('cmp-pages.js');
        const html = read('index.html');
        const css = read('input.css');
        const serviceWorker = read('service-worker.js');
        expect(header).toContain('<h1 class=\"font-display\">Transações</h1>');
        expect(component).toContain('class=\"money num\"');
        expect(component).toContain('class=\"money num ${valColor}\"');
        expect(html).toContain('family=Fraunces:ital,opsz,wght');
        expect(html).toContain('family=Public+Sans');
        expect(html).toContain('family=Sora');
        expect(html).toContain('styles.css?v=20260925-anora-phase5-1');
        expect(serviceWorker).toContain("avenera-app-shell-v16");
        expect(serviceWorker).toContain('./styles.css?v=20260925-anora-phase5-1');
        expect(css).toContain('.nv-transactions-page { font-family: \"Public Sans\"');
        expect(css).toContain('.nv-transactions-page .font-display');
        expect(css).toContain('font-variant-numeric: tabular-nums');
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
        expect(html).toContain('data-action="setTransactionTypeFilter"');
        expect(html).toContain('data-payload="receita"');
        expect(html).toContain('data-payload="despesa"');
        expect(html).toContain('data-payload="transferencia"');
        expect(html).not.toContain('data-filter-key="tipo"');
        expect(html).toContain('data-filter-key="categoria"');
        expect(html).toContain('data-filter-key="bancoId"');
        expect(html).toContain('data-filter-key="dataInicio"');
        expect(html).toContain('data-filter-key="dataFim"');
        expect(html).toContain('<details class="nv-tx-more-filters"');
        expect(html).not.toContain('Limpar 0 filtros');
        const activeHtml = PageComponents.filtersSection(
            { desc: 'uber', categoria: 'Casa', bancoId: 'banco_1', mes: '2', tipo: 'despesa', dataInicio: '', dataFim: '' },
            [], ['Casa'], []
        );
        expect(activeHtml).toContain('Limpar 5 filtros');
        expect((activeHtml.match(/data-action="clearFilters"/g) || []).length).toBe(1);
    });
});
