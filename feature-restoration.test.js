import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('pre-existing Avenera features survive the Anora integration', () => {
    it('keeps both renderers, routes, and sidebar entries for reconciliation and statement import', () => {
        const pages = read('rnd-pages.js');
        const router = read('router.js');
        const index = read('index.html');
        for (const page of ['Conciliacao', 'Importacao']) {
            expect(pages).toContain(`${page}: (appState) => {`);
            expect(router).toContain(`'${page}'`);
            expect(index).toContain(`id="nav-${page}"`);
            expect(index).toContain(`data-payload="${page}"`);
        }
    });

    it('preserves the phase-2 stylesheet, modal shortcuts, contact fields and contact profile', () => {
        const index = read('index.html');
        const worker = read('service-worker.js');
        const modals = read('cmp-modals.js');
        expect(index).toContain('redesign-fase2.css?v=20260925');
        expect(index).toContain('./modal-shortcuts.js');
        expect(worker).toContain("'./redesign-fase2.css?v=20260925'");
        expect(worker).toContain("'./modal-shortcuts.js'");
        expect(modals).toContain('id="contato-telefone"');
        expect(modals).toContain('id="contato-email"');
        expect(modals).toContain('id="contato-endereco"');
        expect(modals).toContain('id="modal-contato-perfil"');
    });

    it('keeps Anora on the new page with its own scoped legacy modal targets', () => {
        const page = read('rnd-anora.js');
        const modal = read('cmp-modals.js');
        const worker = read('service-worker.js');
        expect(page).toContain('data-anora-chat');
        expect(modal).toContain('data-anora-chat');
        expect(modal).toContain('data-anora-messages');
        expect(modal).toContain('data-anora-input');
        expect(worker).toContain("'./rnd-anora.js'");
        expect(worker).toContain('avenera-app-shell-v20');
        expect(worker).toContain('./styles.css?v=20260925-anora-restoration-2');
    });
});
