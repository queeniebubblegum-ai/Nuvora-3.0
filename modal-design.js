// Presentation adapters keep the existing forms, identifiers and delegated
// actions intact while giving static and dynamically rendered dialogs one shell.
const dialogCopy = {
    'modal-transacao': ['Novo lançamento', 'Registre uma despesa, receita ou transferência.'],
    'modal-transferencia': ['Transferência entre contas', 'Movimente dinheiro entre suas próprias contas.'],
    'modal-banco': ['Nova conta', 'Organize o saldo da conta corrente, poupança ou carteira.'],
    'modal-cartao': ['Novo cartão de crédito', 'Acompanhe compras, faturas e limite.'],
    'modal-despesa-cartao': ['Nova compra no cartão', 'Veja o impacto da compra e do parcelamento.'],
    'modal-pagar-fatura': ['Registrar pagamento', 'Atualize o histórico com o pagamento que você realizou.'],
    'modal-classificar-fatura': ['Classificar fatura', 'Organize as compras selecionadas por categoria.'],
    'modal-revisao-ofx': ['Revisão da importação', 'Confira os lançamentos antes de confirmar.'],
    'modal-fechamento-mes': ['Fechamento do mês', 'Revise pendências e acompanhe o resultado do período.'],
    'modal-agenda-dia': ['Agenda do dia', 'Pagamentos, recebimentos e previsões desta data.'],
    'modal-agendamento': ['Novo agendamento', 'Planeje uma conta a pagar ou um valor a receber.'],
    'modal-categoria': ['Nova categoria', 'Organize lançamentos e sugestões automáticas.'],
    'modal-contato': ['Novo contato', 'Pessoas e empresas com histórico financeiro.'],
    'modal-contato-perfil': ['Perfil do contato', 'Movimentações vinculadas a esta pessoa.'],
    'modal-chat-anora': ['Anora', 'Sua assistente financeira local.'],
    'modal-historico-anora': ['Histórico da Anora', 'Acompanhe a evolução do seu perfil financeiro.'],
    'modal-meta': ['Nova meta', 'Defina um objetivo e acompanhe suas reservas.'],
    'modal-depositar-meta': ['Reservar para meta', 'O dinheiro continua na conta escolhida.'],
    'modal-orcamento': ['Novo limite', 'Defina quanto pretende gastar em uma categoria.'],
    'modal-orcamento-inteligente': ['Orçamento 50/30/20', 'Distribua sua renda entre necessidades, desejos e futuro.'],
    'modal-simulador': ['Simular compra', 'Compare o impacto antes de registrar uma compra.'],
    'modal-investimento': ['Novo investimento', 'Acompanhe a posição atual e os aportes registrados.']
};

const direct = (element, predicate) => [...element.children].find(predicate);
const isClose = button => /^(close|cancel)/i.test(button.dataset.action || '');
const isSubmit = element => element.matches('button[type="submit"], input[type="submit"]');
const keyboardActions = new WeakSet();
const activeLayers = new Map();
let layerOrder = 0;
let lastTopModal = null;
let onActivate;

const overlays = document => [...document.querySelectorAll('div[id^="modal-"]')]
    .filter(modal => modal.classList.contains('fixed') || modal.classList.contains('nv-modal'));
const isVisibleModal = modal => modal.isConnected && !modal.hidden && !modal.classList.contains('hidden') && modal.style.display !== 'none';

function focusableControls(modal) {
    return [...modal.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')].filter(control => {
        if (control.matches(':disabled') || control.type === 'hidden' || control.tabIndex < 0 || control.getAttribute('aria-disabled') === 'true') return false;
        let node = control;
        while (node && node !== modal.parentElement) {
            if (node.hidden || node.classList.contains('hidden') || node.hasAttribute('inert') || node.getAttribute('aria-hidden') === 'true') return false;
            const style = node.ownerDocument.defaultView?.getComputedStyle(node);
            if (style?.display === 'none' || style?.visibility === 'hidden') return false;
            node = node.parentElement;
        }
        return true;
    });
}

function focusDialog(modal, last = false) {
    const controls = focusableControls(modal);
    const target = last ? controls.at(-1) : controls[0];
    if (target) target.focus({ preventScroll: true });
    else {
        modal.tabIndex = -1;
        modal.focus({ preventScroll: true });
    }
}

function syncLayers(document) {
    const visible = overlays(document).filter(isVisibleModal);
    for (const [modal, state] of activeLayers) {
        if (modal.ownerDocument === document && visible.includes(modal)) continue;
        modal.style.zIndex = state.originalZ;
        activeLayers.delete(modal);
    }
    visible.forEach(modal => {
        if (activeLayers.has(modal)) return;
        const originalZ = modal.style.zIndex;
        const requestedZ = Number(document.defaultView?.getComputedStyle(modal).zIndex) || 999;
        const maximumZ = Math.max(998, ...[...activeLayers.values()].map(state => state.zIndex));
        const zIndex = Math.max(requestedZ, maximumZ + 1);
        activeLayers.set(modal, { originalZ, zIndex, order: ++layerOrder });
        modal.style.zIndex = String(zIndex);
        onActivate?.(modal);
    });
    const top = [...activeLayers.entries()].filter(([modal]) => modal.ownerDocument === document)
        .sort((a, b) => a[1].zIndex - b[1].zIndex || a[1].order - b[1].order).at(-1)?.[0] || null;
    visible.forEach(modal => {
        const isTop = modal === top;
        modal.setAttribute('aria-modal', String(isTop));
        modal.setAttribute('aria-hidden', String(!isTop));
        if (isTop) modal.removeAttribute('inert');
        else modal.setAttribute('inert', '');
    });
    lastTopModal = top;
    return top;
}

function enhanceForm(form) {
    if (form.dataset.submit === 'chatAnora') {
        form.classList.add('nv-dialog-compose');
        return;
    }
    form.classList.add('nv-dialog-form');
    if (direct(form, child => child.classList.contains('nv-dialog-form-body'))) return;

    const last = form.lastElementChild;
    let footer = last && (isSubmit(last) || last.querySelector('button[type="submit"]')) ? last : null;
    if (footer && isSubmit(footer)) {
        const wrap = document.createElement('div');
        form.append(wrap);
        wrap.append(footer);
        footer = wrap;
    }
    const body = document.createElement('div');
    body.className = 'nv-dialog-body nv-dialog-form-body';
    [...form.children].filter(child => child !== footer).forEach(child => body.append(child));
    form.prepend(body);
    if (footer) {
        footer.classList.add('nv-dialog-foot');
        // Keep the control inside its original form so native validation,
        // Enter-to-submit and the existing submit lock continue to work.
        if (!footer.querySelector('[data-action="closeModal"]')) {
            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.dataset.action = 'closeModal';
            cancel.className = 'nv-dialog-secondary';
            cancel.textContent = 'Cancelar';
            footer.prepend(cancel);
        }
    }
}

function enhanceInvoice(host) {
    host.classList.add('nv-dialog-invoice-content');
    const onlyChild = host.children.length === 1 ? host.firstElementChild : null;
    const isReview = onlyChild && onlyChild.querySelector('h2,h3') && !host.querySelector('[role="tabpanel"]');
    const container = isReview ? onlyChild : host;
    if (isReview) {
        container.classList.add('nv-dialog-invoice-review');
        if (!direct(container, child => child.classList.contains('nv-dialog-body'))) {
            const children = [...container.children];
            const head = children.find(child => child.querySelector('h2,h3'));
            const footer = children.at(-1)?.querySelector('button') ? children.at(-1) : null;
            const body = document.createElement('div');
            body.className = 'nv-dialog-body';
            children.filter(child => child !== head && child !== footer).forEach(child => body.append(child));
            if (footer) {
                footer.classList.add('nv-dialog-foot');
                container.insertBefore(body, footer);
            } else container.append(body);
        }
    }
    const head = direct(container, child => Boolean(child.querySelector('h2, h3')));
    head?.classList.add('nv-dialog-head');
    const title = head?.querySelector('h2,h3');
    if (title) {
        title.classList.add('nv-dialog-title');
        if (!title.id) title.id = 'modal-fatura-detalhes-title';
        host.closest('[role="dialog"]')?.setAttribute('aria-labelledby', title.id);
    }
    host.querySelectorAll('[role="tablist"]').forEach(tabs => tabs.classList.add('nv-dialog-tabs'));
    host.querySelectorAll('[role="tabpanel"]').forEach(panel => panel.classList.add('nv-dialog-body', 'nv-dialog-invoice-panel'));
}

function enhanceDialog(modal) {
    if (!modal.classList.contains('fixed') && !modal.classList.contains('nv-modal')) return;
    const shell = modal.firstElementChild;
    if (!shell) return;
    modal.classList.add('nv-modal');
    modal.dataset.dialog = modal.id.replace(/^modal-/, '');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    shell.classList.add('nv-dialog');

    if (modal.id === 'modal-fatura-detalhes') {
        const invoice = modal.querySelector('#modal-fatura-content');
        if (invoice) enhanceInvoice(invoice);
    } else {
        let head = direct(shell, child => Boolean(child.querySelector('h2, h3')) && !child.matches('form'));
        if (!head) head = shell.firstElementChild;
        if (head) {
            head.classList.add('nv-dialog-head');
            let title = head.querySelector('h2, h3');
            const copy = dialogCopy[modal.id];
            if (!title && copy) {
                const heading = document.createElement('div');
                title = document.createElement('h2');
                title.textContent = copy[0];
                heading.append(title);
                head.prepend(heading);
            }
            if (title) {
                title.classList.add('nv-dialog-title');
                if (!title.id) title.id = `${modal.id}-title`;
                if (!modal.hasAttribute('aria-labelledby')) modal.setAttribute('aria-labelledby', title.id);
                if (title.parentElement === head) {
                    const heading = document.createElement('div');
                    head.insertBefore(heading, title);
                    heading.append(title);
                }
                const copyHost = title.parentElement;
                let subtitle = copyHost.querySelector('p');
                if (!subtitle && copy) {
                    subtitle = document.createElement('p');
                    subtitle.textContent = copy[1];
                    copyHost.append(subtitle);
                }
                subtitle?.classList.add('nv-dialog-subtitle');
            }
        }

        shell.querySelectorAll('form[data-submit]').forEach(enhanceForm);
        const transactionTabs = direct(shell, child => Boolean(child.querySelector('#tab-despesa')));
        transactionTabs?.classList.add('nv-dialog-tabs');
        const inlineTransfer = modal.querySelector('#inline-transferencia');
        inlineTransfer?.classList.add('nv-dialog-inline-transfer');

        if (!direct(shell, child => child.matches('form') || child.classList.contains('nv-dialog-body'))) {
            const children = [...shell.children];
            const last = children.at(-1);
            const footer = last !== head && last?.querySelector('button, form') && !last.querySelector('h2,h3') ? last : null;
            const existingBody = children.find(child => child !== head && child !== footer && /overflow-y-auto/.test(child.className));
            if (footer) footer.classList.add('nv-dialog-foot');
            if (existingBody) {
                existingBody.classList.add('nv-dialog-body');
                children.filter(child => child !== head && child !== footer && child !== existingBody).forEach(child => child.classList.add('nv-dialog-toolbar'));
            } else {
                const body = document.createElement('div');
                body.className = 'nv-dialog-body';
                children.filter(child => child !== head && child !== footer).forEach(child => body.append(child));
                if (footer) shell.insertBefore(body, footer);
                else shell.append(body);
            }
        }
    }

    shell.querySelectorAll('input, select, textarea').forEach(field => {
        if (field.type === 'hidden') return;
        field.classList.add('nv-dialog-input');
        const parent = field.parentElement;
        if (parent?.querySelector('label, span') && parent !== shell && !parent.matches('form')) parent.classList.add('nv-dialog-field');
        if (field.id && !field.labels?.length) {
            const label = parent?.querySelector('label');
            if (label && !label.htmlFor) label.htmlFor = field.id;
        }
        if (field.type === 'number') field.setAttribute('inputmode', field.step === '1' ? 'numeric' : 'decimal');
    });
    shell.querySelectorAll('[class*="grid-cols-"]').forEach(row => row.classList.add('nv-dialog-row'));
    shell.querySelectorAll('div[data-action]').forEach(control => {
        control.setAttribute('role', 'button');
        control.setAttribute('tabindex', '0');
        if (keyboardActions.has(control)) return;
        keyboardActions.add(control);
        control.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            control.click();
        });
    });
    shell.querySelectorAll('button').forEach(button => {
        if (isClose(button) && button.querySelector('.fa-xmark')) {
            button.classList.add('nv-dialog-close');
            if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', 'Fechar');
        } else if (isSubmit(button) || /^(confirmInvoice|applyInvoice|salvarOFX)/.test(button.dataset.action || '')) {
            button.classList.add('nv-dialog-primary');
        } else if (button.closest('.nv-dialog-foot')) button.classList.add('nv-dialog-secondary');
    });
}

let observer;
let scheduled = false;
let installedDocument;
const handleModalKeydown = event => {
    if (!['Escape', 'Tab'].includes(event.key)) return;
    const modal = syncLayers(event.target?.ownerDocument || installedDocument || document);
    if (!modal) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        // Respect the same unsaved-draft prompt as the visible close button.
        globalThis.window?.App?.closeModal?.(true, modal.id);
        return;
    }
    const controls = focusableControls(modal);
    const first = controls[0];
    const last = controls.at(-1);
    const active = modal.ownerDocument.activeElement;
    if (!controls.length || !modal.contains(active) || (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        focusDialog(modal, event.shiftKey);
    }
};
const handleModalFocus = event => {
    const modal = syncLayers(event.target?.ownerDocument || installedDocument || document);
    if (modal && !modal.contains(event.target)) focusDialog(modal);
};
export const ModalDesign = {
    enhance(root = document) {
        if (root.matches?.('div[id^="modal-"]')) enhanceDialog(root);
        root.querySelectorAll?.('div[id^="modal-"]').forEach(enhanceDialog);
    },
    syncLayers(document = globalThis.document) {
        return document ? syncLayers(document) : null;
    },
    focusInitial(modal) {
        if (!modal || syncLayers(modal.ownerDocument) !== modal) return;
        const controls = focusableControls(modal);
        const target = controls.find(control => control.hasAttribute('autofocus'))
            || controls.find(control => control.matches('input,select,textarea'))
            || controls[0];
        if (target) target.focus({ preventScroll: true });
        else focusDialog(modal);
    },
    install(options = {}) {
        if (typeof options.onActivate === 'function') onActivate = options.onActivate;
        if (typeof document === 'undefined' || !document.body || typeof MutationObserver === 'undefined' || observer) return;
        installedDocument = document;
        ModalDesign.enhance();
        document.addEventListener('keydown', handleModalKeydown, true);
        document.addEventListener('focusin', handleModalFocus, true);
        observer = new MutationObserver(records => {
            const structuralChange = records.some(record => record.type === 'childList' && record.addedNodes.length && (record.target.closest?.('div[id^="modal-"]') || [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches?.('div[id^="modal-"]') || node.querySelector?.('div[id^="modal-"]')))));
            const visibilityChange = records.some(record => record.type === 'attributes' && record.target.matches('div[id^="modal-"]') && (record.target.classList.contains('fixed') || record.target.classList.contains('nv-modal')) && /(^|\s)hidden(\s|$)/.test(record.oldValue || '') !== record.target.classList.contains('hidden'));
            if (scheduled || (!structuralChange && !visibilityChange)) return;
            scheduled = true;
            queueMicrotask(() => {
                scheduled = false;
                if (!installedDocument) return;
                if (structuralChange) ModalDesign.enhance(installedDocument);
                const previousTop = lastTopModal;
                const top = syncLayers(installedDocument);
                if (top && previousTop !== top && !top.contains(installedDocument.activeElement)) focusDialog(top);
            });
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
        syncLayers(document);
    },
    dispose() {
        observer?.disconnect();
        observer = null;
        installedDocument?.removeEventListener('keydown', handleModalKeydown, true);
        installedDocument?.removeEventListener('focusin', handleModalFocus, true);
        installedDocument = null;
        scheduled = false;
        for (const [modal, state] of activeLayers) modal.style.zIndex = state.originalZ;
        activeLayers.clear();
        lastTopModal = null;
        onActivate = undefined;
    }
};
