import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// O Vitest no Windows pode transformar import.meta.url em um caminho incorreto.
// Os arquivos do teste ficam na raiz do projeto, então usamos o diretório de execução.
const source = file => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('invoice modal lifecycle contract', () => {
  it('keeps invoice rendering and edit layering independent', () => {
    const app = source('app.js');
    const ui = source('ui.js');
    const clicks = source('evt-click.js');
    const modals = source('cmp-modals.js');
    const invoiceRenderer = source('rnd-ui.js');

    expect(app).toMatch(/modalFatura\.classList\.remove\('hidden'\)/);
    expect(app).toMatch(/Renderer\.renderInvoiceModal\(App\.viewState\)/);
    expect(app).toMatch(/Não foi possível exibir esta fatura/);
    expect(invoiceRenderer).toMatch(/Não foi possível exibir esta fatura/);
    expect(app).toMatch(/confirmInvoiceAdjustmentsBulk/);
    expect(app).toMatch(/createAdjustmentTransaction\(cardId/);
    expect(app).toMatch(/type !== 'unrecognized_purchase'/);
    expect(clicks).toMatch(/openInvoiceAdjustmentsReview/);
    expect(ui).toMatch(/closeModal: \(viewState, userInitiated = false, modalId = null\)/);
    expect(clicks).toMatch(/btn\.closest\('\[id\^="modal-"\]\'\)\?\.id/);
    expect(modals).toMatch(/modal-fatura-detalhes[\s\S]*z-index: 1001/);
    expect(modals).toMatch(/modal-fatura-detalhes[^>]*aria-hidden="true"[^>]*inert/);
    expect(modals).toMatch(/modal-editar-transacao[\s\S]*z-index: 1002/);
    expect(modals).toMatch(/modal-fatura-content[\s\S]*overflow-hidden/);
    expect(clicks).toContain("'switchInvoiceTab': () => App.switchInvoiceTab(btn.getAttribute('data-tab'))");
    const pages = source('cmp-pages.js');
    expect(pages).toContain('data-tab="resumo"');
    expect(pages).toContain('data-tab="compras"');
    expect(pages).toContain('data-tab="ajustes"');
    expect(pages).toMatch(/aria-selected="true"/);
    expect(pages).toMatch(/role="tabpanel"/);
    expect(app).toMatch(/setAttribute\('aria-hidden', String\(!active\)\)/);
  });

  it('uses invoice selection only for non-destructive bulk classification', () => {
    const pages = source('cmp-pages.js');
    const app = source('app.js');
    const db = source('db.js');
    const invoice = pages.slice(pages.indexOf('invoiceDetailsView:'), pages.indexOf('agendamentosPage:'));

    expect(invoice).toContain('openInvoiceClassification');
    expect(invoice).toContain('Classificar selecionados');
    expect(invoice).not.toContain('data-action="deleteSelectedTx"');
    expect(app).toMatch(/updateTransactionCategories\(selected, categoria\)/);
    expect(app).toMatch(/selectedTransactions = \[\]/);
    expect(db).toMatch(/updateCategories: \(idsArray, categoria\)/);
    expect(db).toMatch(/new Set\(\(idsArray \|\| \[\]\)\.map\(id => String\(id\)\)\)/);
  });

  it('does not serve a stale local shell before the network version', () => {
    const sw = source('service-worker.js');
    expect(sw).toContain("avenera-app-shell-v2");
    expect(sw).toMatch(/fetch\(event\.request\)\.then/);
    expect(sw).toMatch(/catch\(\(\) => caches\.match\(event\.request\)\)/);
  });
});
