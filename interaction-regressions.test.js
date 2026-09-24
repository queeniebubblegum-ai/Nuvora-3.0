import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PageComponents } from './cmp-pages.js';

const source = file => readFileSync(resolve(process.cwd(), file), 'utf8');
const cssContains = (css, fragment) => css.replace(/\s+/g, '').includes(String(fragment).replace(/\s+/g, ''));
const cssCompact = css => css.replace(/\s+/g, ' ').replace(/\s*([{}:;])\s*/g, '$1').replace(/\s+\(/g, '(').trim();

describe('redesigned account and transaction interactions', () => {
    it('keeps the compact Anora header contract and separated controls', () => {
        const index = source('index.html');
        const inputStyles = source('input.css');
        const generatedStyles = source('styles.css');

        expect(index).toContain('class="nv-header__anora-control flex items-center cursor-pointer group"');
        expect(index).toContain('class="nv-header__anora-image w-8 h-8 rounded-full object-cover');
        expect(index).toMatch(/class="[^"]*nv-header__control-divider[^"]*"/);
        expect(index).toContain('aria-hidden="true"');
        expect(index).toContain('onclick="document.getElementById(\'anora-menu\').classList.toggle(\'hidden\')"');
        expect(index).toContain("if(event.key === 'Enter' || event.key === ' ')");

        const css = cssCompact(inputStyles);
        expect(css).toMatch(/\.nv-header__actions\{[^}]*flex:0 0 auto;[^}]*flex-wrap:nowrap;[^}]*gap:10px;/s);
        expect(css).toMatch(/\.nv-header__anora\{[^}]*flex:0 0 auto;/s);
        expect(css).toMatch(/\.nv-header__anora-control\{[^}]*gap:8px;[^}]*min-width:max-content;/s);
        expect(css).toMatch(/\.nv-header__anora-image\{[^}]*height:32px;[^}]*width:32px;/s);
        expect(css).toMatch(/\.nv-header__control-divider\{[^}]*flex:0 0 1px;/s);
        expect(css).toContain('@media(max-width:639px)');
        expect(css).toMatch(/\.nv-header__actions\{[^}]*gap:4px;/s);
        expect(generatedStyles.length).toBeGreaterThan(0);
    });

    it('keeps the empty-card action wired to the existing card modal when an account exists', () => {
        const html = PageComponents.accountsPage(
            [{ id: 'bank-1', nome: 'Conta principal', instituicao: 'Banco', saldo: 0 }],
            [],
            []
        );

        expect(html).toContain('data-action="openModal" data-modal="modal-cartao"');
        expect(html).toContain('Adicionar cartão');
        expect(html).not.toMatch(/class="nv-accounts-empty-action"[^>]*disabled/);
        expect(html).not.toMatch(/data-modal="modal-cartao"[^>]*disabled/);
    });

    it('keeps the no-bank card CTA non-destructive and gives a prerequisite path', () => {
        const html = PageComponents.accountsPage([], [], []);
        expect(html).toContain('data-action="openModal" data-modal="modal-banco"');
        expect(html).toContain('data-prerequisite-message="Cadastre uma conta antes de adicionar um cartão."');
        expect(html).toContain('Adicionar conta primeiro');
        expect(html).not.toMatch(/nv-accounts-empty-action[^>]*disabled/);
        expect(html).not.toMatch(/data-modal="modal-cartao"[^>]*disabled/);
    });

    it('keeps the bottom CTA hit-testable above the fixed speed-dial layer', () => {
        const inputStyles = source('input.css');
        const generatedStyles = source('styles.css');
        const index = source('index.html');
        const expectedRule = '.nv-accounts-empty-action { background: var(--nv-accounts-action); border: 1px solid var(--nv-accounts-action); border-radius: 8px; color: #fff; cursor: pointer; font-size: 10px; font-weight: 750; margin-left: auto; min-height: 32px; padding: 0 11px; pointer-events: auto; position: relative; white-space: nowrap; z-index: 31; }';
        expect(cssContains(inputStyles, expectedRule)).toBe(true);
        expect(generatedStyles.length).toBeGreaterThan(0);
        expect(index).toContain('style="z-index: 30;"');
        expect(index).toContain('@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }');
    });

    it('keeps transaction row actions canonical and preserves string IDs', () => {
        const html = PageComponents.transactionList([
            { id: 'tx-1', desc: 'Teste', valor: 10, tipo: 'despesa', categoria: 'Outros', data: '2026-09-19' }
        ], { selectedTransactions: [] });

        expect(html).toContain('data-action="openEditModal" data-id="tx-1"');
        expect(html).toContain('data-action="deleteExpense" data-id="tx-1"');
    });

    it('keeps the delegated action map and modal contracts aligned', () => {
        const clicks = source('evt-click.js');
        const modals = source('cmp-modals.js');
        const pages = source('cmp-pages.js');
        const accountsController = source('ctrl-contas.js');

        expect(clicks).toContain("App.openModal(btn.getAttribute('data-modal'), btn.getAttribute('data-type'))");
        expect(clicks).toContain("'openEditModal': () => App.openEditModal(actionId())");
        expect(clicks).toContain("'deleteExpense': () => Controllers.deleteExpense(actionId())");
        expect(clicks).toContain("button[data-action], [role=\"button\"][data-action], a[data-action], summary[data-action]");
        expect(clicks).toContain('btn.disabled === true');
        expect(clicks).toContain('e.preventDefault();');
        expect(clicks).toContain('e.stopPropagation();');
        expect(clicks).toContain('if (!handler) return;');
        expect(clicks).toContain("btn.closest('.nv-tx-row[data-id]')?.getAttribute('data-id')");
        expect(modals).toMatch(/id="modal-cartao"/);
        expect(modals).toMatch(/id="modal-editar-transacao"/);
        expect(pages).toContain('data-action="openModal" data-modal="modal-cartao"');
        expect(pages).toContain('data-action="openEditModal" data-id="${Utils.escapeHTML(String(t.id))}"');
        expect(pages).toContain('data-action="deleteExpense" data-id="${Utils.escapeHTML(String(t.id))}"');
        expect(accountsController).toContain('String(b.id) === String(bancoIdRaw)');
        expect(accountsController).not.toContain('const bancoId = parseInt(');
    });
});
