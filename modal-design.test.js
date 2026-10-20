import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { Modals } from './cmp-modals.js';
import { ModalDesign } from './modal-design.js';

async function withDialogs(run) {
    const dom = new JSDOM(`<body>${Modals.getHTML()}</body>`, { url: 'http://localhost/' });
    const previousDocument = globalThis.document;
    const previousWindow = globalThis.window;
    const previousObserver = globalThis.MutationObserver;
    globalThis.document = dom.window.document;
    globalThis.window = dom.window;
    globalThis.MutationObserver = dom.window.MutationObserver;
    try { await run(dom.window.document, dom.window); }
    finally {
        ModalDesign.dispose();
        globalThis.document = previousDocument;
        globalThis.window = previousWindow;
        globalThis.MutationObserver = previousObserver;
        dom.window.close();
    }
}

describe('mockup dialog integration', () => {
    it('preserves all existing controls and submit associations while separating scroll and actions', () => withDialogs(document => {
        const originalIds = [...document.querySelectorAll('[id]')].map(node => node.id);
        const originalControls = [...document.querySelectorAll('input,select,textarea')].map(node => [node, node.closest('form')]);
        ModalDesign.enhance(document);
        originalIds.forEach(id => expect(document.querySelectorAll(`[id="${id}"]`)).toHaveLength(1));
        originalControls.forEach(([control, form]) => expect(control.closest('form')).toBe(form));
        document.querySelectorAll('form[data-submit]:not([data-submit="chatAnora"])').forEach(form => {
            expect([...form.children].find(child => child.classList.contains('nv-dialog-body'))).toBeDefined();
            const footer = [...form.children].find(child => child.classList.contains('nv-dialog-foot'));
            expect(footer?.querySelector('button[type="submit"]')).not.toBeNull();
        });
    }));

    it('can run again after dynamic invoice rendering without duplicate wrappers or altered values', () => withDialogs(document => {
        const amount = document.getElementById('input-valor');
        amount.value = '142.99';
        ModalDesign.enhance(document);
        const count = document.querySelectorAll('.nv-dialog-body').length;
        ModalDesign.enhance(document);
        expect(document.querySelectorAll('.nv-dialog-body')).toHaveLength(count);
        expect(amount.value).toBe('142.99');
        const host = document.getElementById('modal-fatura-content');
        host.innerHTML = '<div><h3>Fatura real</h3><button data-action="closeInvoiceDetails">Fechar</button></div><div role="tablist"><button role="tab">Compras</button></div><div role="tabpanel">Compra real</div>';
        ModalDesign.enhance(document);
        expect(host.classList.contains('nv-modal')).toBe(false);
        expect(host.querySelector('.nv-dialog-head h3').textContent).toBe('Fatura real');
        expect(host.querySelector('[role="tabpanel"]').classList.contains('nv-dialog-body')).toBe(true);
        expect(document.querySelector('#modal-transacao h2').textContent).toBe('Novo lançamento');
    }));

    it('keeps simulation and import actions with their original form and scroll boundary', () => withDialogs(document => {
        const simulation = document.getElementById('btn-simular-dc');
        const simulationForm = simulation.closest('form');
        const importAction = document.getElementById('btn-importar-ofx-aprovados');
        ModalDesign.enhance(document);
        expect(simulation.closest('form')).toBe(simulationForm);
        expect(simulation.closest('.nv-dialog-foot')).not.toBeNull();
        expect(simulation.dataset.action).toBe('simularDespesaCartao');
        expect(importAction.closest('.nv-dialog-foot')).not.toBeNull();
        expect(importAction.closest('form')).toBeNull();
        expect(importAction.dataset.action).toBe('salvarOFXAprovado');
    }));

    it('traps keyboard focus in the top layer and preserves drafts when Escape is cancelled', () => withDialogs((document, window) => {
        ModalDesign.install();
        const invoice = document.getElementById('modal-fatura-detalhes');
        invoice.classList.remove('hidden');
        invoice.classList.add('flex');
        ModalDesign.syncLayers(document);
        const edit = document.getElementById('modal-editar-transacao');
        edit.classList.remove('hidden');
        edit.classList.add('flex');
        expect(ModalDesign.syncLayers(document)).toBe(edit);
        expect(invoice.hasAttribute('inert')).toBe(true);
        const first = edit.querySelector('.nv-dialog-close');
        const last = document.getElementById('btn-unlock-edit');
        last.focus();
        last.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(first);
        first.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(last);
        const draft = document.getElementById('edit-desc');
        draft.value = 'Rascunho que deve continuar';
        const close = vi.fn(() => false);
        window.App = { closeModal: close };
        const legacyEscape = vi.fn();
        document.addEventListener('keydown', legacyEscape);
        last.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        expect(close).toHaveBeenCalledWith(true, 'modal-editar-transacao');
        expect(legacyEscape).not.toHaveBeenCalled();
        expect(draft.value).toBe('Rascunho que deve continuar');
        expect(edit.classList.contains('hidden')).toBe(false);
        edit.classList.add('hidden');
        expect(ModalDesign.syncLayers(document)).toBe(invoice);
        expect(invoice.hasAttribute('inert')).toBe(false);
    }));

    it('decorates dynamically inserted invoice content and reaches a stable DOM with its observer', () => withDialogs(async document => {
        ModalDesign.install();
        const host = document.getElementById('modal-fatura-content');
        host.innerHTML = '<header><h3>Fatura real</h3></header><section role="tabpanel"><button>Compra</button></section>';
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(host.querySelector('.nv-dialog-head')).not.toBeNull();
        expect(host.querySelector('.nv-dialog-body')).not.toBeNull();
        const stable = document.body.innerHTML;
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(document.body.innerHTML).toBe(stable);
    }));

    it('keeps invoice bulk-review actions outside its scroll region and snapshots direct-opened dialogs', () => withDialogs((document) => {
        const activated = vi.fn();
        ModalDesign.install({ onActivate: activated });
        const invoice = document.getElementById('modal-fatura-detalhes');
        const host = document.getElementById('modal-fatura-content');
        host.innerHTML = '<div><header><h3>Revisar ajustes reais</h3></header><div>Conteúdo de revisão</div><p>Confirme os dados.</p><footer><button data-action="confirmInvoiceAdjustmentsBulk">Confirmar</button></footer></div>';
        ModalDesign.enhance(invoice);
        expect(host.querySelector('.nv-dialog-invoice-review > .nv-dialog-body')).not.toBeNull();
        expect(host.querySelector('.nv-dialog-foot [data-action="confirmInvoiceAdjustmentsBulk"]')).not.toBeNull();
        expect(invoice.getAttribute('aria-labelledby')).toBe('modal-fatura-detalhes-title');
        invoice.classList.remove('hidden');
        ModalDesign.syncLayers(document);
        ModalDesign.syncLayers(document);
        expect(activated).toHaveBeenCalledTimes(1);
        expect(activated).toHaveBeenCalledWith(invoice);
    }));

    it('ignores hidden identifiers and does not focus an underlying dialog after a nested one opens', () => withDialogs(document => {
        ModalDesign.install();
        const schedule = document.getElementById('modal-agendamento');
        schedule.classList.remove('hidden');
        ModalDesign.focusInitial(schedule);
        expect(document.activeElement.id).toBe('agendamento-tipo');
        const category = document.getElementById('modal-categoria');
        category.classList.remove('hidden');
        ModalDesign.focusInitial(category);
        expect(document.activeElement.id).toBe('nova-categoria-nome');
        ModalDesign.focusInitial(schedule);
        expect(document.activeElement.id).toBe('nova-categoria-nome');
    }));
});
