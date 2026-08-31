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

    expect(app).toMatch(/modalFatura\.classList\.remove\('hidden'\)/);
    expect(app).toMatch(/Renderer\.renderInvoiceModal\(App\.viewState\)/);
    expect(ui).toMatch(/closeModal: \(viewState, userInitiated = false, modalId = null\)/);
    expect(clicks).toMatch(/btn\.closest\('\[id\^="modal-"\]\'\)\?\.id/);
    expect(modals).toMatch(/modal-fatura-detalhes[\s\S]*z-index: 1001/);
    expect(modals).toMatch(/modal-editar-transacao[\s\S]*z-index: 1002/);
  });

  it('does not serve a stale local shell before the network version', () => {
    const sw = source('service-worker.js');
    expect(sw).toContain("nuvora-app-shell-v4");
    expect(sw).toMatch(/fetch\(event\.request\)\.then/);
    expect(sw).toMatch(/catch\(\(\) => caches\.match\(event\.request\)\)/);
  });
});
