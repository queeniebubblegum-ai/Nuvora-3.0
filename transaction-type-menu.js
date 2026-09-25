import { Utils } from './utils.js';

const escape = value => Utils.escapeHTML(String(value ?? ''));

const variants = {
    dashboard: {
        wrapper: 'nv-dashboard-new-menu',
        trigger: 'nv-dashboard-primary-action',
        label: 'Novo lançamento',
        ariaLabel: 'Novo lançamento: escolher tipo',
        shortcut: true
    },
    transactions: {
        wrapper: 'nv-dashboard-new-menu nv-tx-type-menu',
        trigger: 'nv-page-header__action is-primary nv-tx-primary-action',
        label: 'Nova transação',
        ariaLabel: 'Nova transação: escolher tipo',
        shortcut: false
    },
    empty: {
        wrapper: 'nv-dashboard-new-menu nv-tx-empty-menu',
        trigger: 'nv-tx-empty-action',
        label: 'Nova transação',
        ariaLabel: 'Nova transação: escolher tipo',
        shortcut: false
    }
};

/** A native disclosure that exposes all transaction types without a default. */
export const renderTransactionTypeMenu = ({ id, variant = 'dashboard', label, ariaLabel } = {}) => {
    const config = variants[variant] || variants.dashboard;
    const menuId = escape(id || `${variant}-transaction-type-menu`);
    const safeLabel = escape(label || config.label);
    const safeAriaLabel = escape(ariaLabel || config.ariaLabel);
    const shortcut = config.shortcut
        ? '<span class="nv-shortcut-hint" aria-hidden="true">Alt + N</span><span class="sr-only">Atalho de teclado: Alt + N</span>'
        : '';

    return `<details class="${config.wrapper}"><summary class="${config.trigger}" aria-controls="${menuId}" aria-label="${safeAriaLabel}"><i class="fa-solid fa-plus" aria-hidden="true"></i><span>${safeLabel}</span>${shortcut}<i class="fa-solid fa-chevron-down nv-dashboard-new-menu__chevron" aria-hidden="true"></i></summary><div id="${menuId}" class="nv-dashboard-new-menu__popover" role="group" aria-label="Escolher tipo de lançamento"><button type="button" data-action="openModal" data-modal="modal-transacao" data-type="receita"><i class="fa-solid fa-arrow-trend-up" aria-hidden="true"></i><span><strong>Receita</strong><small>Registrar uma entrada</small></span></button><button type="button" data-action="openModal" data-modal="modal-transacao" data-type="despesa"><i class="fa-solid fa-arrow-trend-down" aria-hidden="true"></i><span><strong>Despesa</strong><small>Registrar uma saída</small></span></button><button type="button" data-action="openModal" data-modal="modal-transferencia"><i class="fa-solid fa-arrow-right-arrow-left" aria-hidden="true"></i><span><strong>Transferência</strong><small>Mover entre contas</small></span></button></div></details>`;
};
