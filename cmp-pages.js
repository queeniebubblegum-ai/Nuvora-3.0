import { Utils } from './utils.js';
import { Database, db } from './db.js';
import { getCategoriaIcon, isCategoriaPadrao } from './categorias-padrao.js';
import { CoreComponents } from './cmp-core.js';
import { listInvoiceTransactions, calculateReconciliation, getInvoicePeriod, invoiceReconciliationKey } from './reconciliation.js';

export const PageComponents = {
    /**
     * Avenera accounts workspace: keeps the existing bank/card records and action
     * hooks, but presents them as two independent, scannable collections.
     */
    accountsPage: (bancos = [], cartoes = [], transacoes = []) => {
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth();
        const money = value => Utils.formatMoney(Number(value) || 0);
        const dateLabel = date => date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : '—';
        const dateAtNoon = (year, month, day) => new Date(year, month, day, 12, 0, 0);
        const dueDateFor = card => {
            const day = Number(card?.vencimento || card?.diaVencimento || 0);
            if (!Number.isFinite(day) || day < 1) return null;
            const currentLastDay = new Date(anoAtual, mesAtual + 1, 0).getDate();
            let due = dateAtNoon(anoAtual, mesAtual, Math.min(day, currentLastDay));
            const today = dateAtNoon(anoAtual, mesAtual, hoje.getDate());
            if (due < today) {
                const nextLastDay = new Date(anoAtual, mesAtual + 2, 0).getDate();
                due = dateAtNoon(anoAtual, mesAtual + 1, Math.min(day, nextLastDay));
            }
            return due;
        };
        const invoiceFor = card => {
            const items = listInvoiceTransactions(transacoes, card, anoAtual, mesAtual);
            const record = (db.conciliacoesFaturas || []).find(item => item.chave === invoiceReconciliationKey(card.id, anoAtual, mesAtual));
            return calculateReconciliation(items, record?.valorFaturaReal, record?.ajustes || []);
        };
        const totalBalance = bancos.reduce((sum, bank) => sum + (Number(bank.saldo) || 0), 0);
        const cardsData = cartoes.map(card => {
            // Keep the existing committed/available calculation: it is based on
            // every persisted card transaction, not only the current invoice.
            const committed = transacoes.filter(t => t?.isCartao && String(t.bancoId) === String(card.id)).reduce((sum, t) => sum + (Number(t.valor) || 0), 0);
            const limit = Number(card.limite ?? card.limiteTotal) || 0;
            const invoice = invoiceFor(card);
            return { card, committed, limit, available: Math.max(limit - committed, 0), invoice, dueDate: dueDateFor(card) };
        });
        const openInvoiceAmount = cardsData.reduce((sum, item) => sum + (Number(item.invoice.explainedTotal) || 0), 0);
        const nextDue = cardsData.map(item => item.dueDate).filter(Boolean).sort((a, b) => a - b)[0] || null;
        const firstBankId = bancos.length ? Utils.escapeHTML(String(bancos[0].id)) : '';
        // A card can only be linked to an existing bank. Keep the CTA useful in
        // both states: open the card form when possible, otherwise take the user
        // to the safe prerequisite (without creating an unlinked card).
        const cardCtaAction = bancos.length
            ? 'data-action="openModal" data-modal="modal-cartao"'
            : 'data-action="openModal" data-modal="modal-banco" data-prerequisite-message="Cadastre uma conta antes de adicionar um cartão."';
        const cardCtaLabel = bancos.length ? 'Adicionar cartão' : 'Adicionar conta primeiro';
        const cardMenuTitle = bancos.length ? 'Cartão' : 'Conta necessária';
        const cardMenuDescription = bancos.length ? 'Fatura e limite' : 'Cadastre uma conta antes';
        const bankFor = card => bancos.find(bank => String(bank.id) === String(card.bancoId));
        const cardFinal = card => {
            const candidate = card.ultimosDigitos ?? card.ultimo4 ?? card.last4 ?? card.lastDigits ?? card.digitosFinais ?? card.numeroFinal;
            const digits = candidate == null ? '' : String(candidate).replace(/\D/g, '').slice(-4);
            return digits ? `•••• ${digits}` : 'Final não informado';
        };
        const accountType = bank => bank.tipoConta || bank.tipo || 'Conta bancária';
        const accountStatus = bank => bank.status || (bank.ativo === false ? 'Inativa' : 'Ativa');
        const accountStatusClass = bank => bank.ativo === false || bank.status === 'inativa' ? 'is-inactive' : 'is-active';
        const actionButton = (action, label, icon, attrs = '', tone = 'secondary') => `<button type="button" data-action="${action}" ${attrs} class="nv-accounts-action nv-accounts-action--${tone}"><i class="${icon}" aria-hidden="true"></i><span>${label}</span></button>`;

        const accountsHtml = bancos.length ? bancos.map(bank => `
            <article class="nv-accounts-card nv-accounts-card--account" data-key="banco_${Utils.escapeHTML(String(bank.id))}">
                <div class="nv-accounts-card-head">
                    <div class="nv-accounts-card-icon nv-accounts-card-icon--account"><i class="fa-solid fa-building-columns" aria-hidden="true"></i></div>
                    <div class="nv-accounts-card-heading"><h3>${Utils.escapeHTML(bank.nome || 'Conta sem nome')}</h3><p>${Utils.escapeHTML(bank.instituicao || 'Instituição não informada')}</p></div>
                    <span class="nv-accounts-status ${accountStatusClass(bank)}"><i class="fa-solid fa-circle" aria-hidden="true"></i>${Utils.escapeHTML(accountStatus(bank))}</span>
                </div>
                <div class="nv-accounts-card-meta"><span>${Utils.escapeHTML(accountType(bank))}</span><span>Conta cadastrada</span></div>
                <div class="nv-accounts-card-balance"><span>Saldo atual</span><strong class="money money--large">${money(bank.saldo)}</strong></div>
                <div class="nv-accounts-card-actions">
                    ${actionButton('iniciarImportacaoOFX', 'OFX', 'fa-solid fa-file-import', `data-banco-id="${Utils.escapeHTML(String(bank.id))}"`)}
                    ${actionButton('iniciarImportacaoCSV', 'CSV', 'fa-solid fa-file-csv', `data-banco-id="${Utils.escapeHTML(String(bank.id))}"`)}
                    <button type="button" data-action="delete" data-col="bancos" data-id="${Utils.escapeHTML(String(bank.id))}" class="nv-accounts-icon-action nv-accounts-icon-action--danger" title="Excluir conta" aria-label="Excluir conta"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
                </div>
            </article>`).join('') : `
            <div class="nv-accounts-empty"><div class="nv-accounts-empty-icon"><i class="fa-solid fa-building-columns" aria-hidden="true"></i></div><div><strong>Nenhuma conta cadastrada</strong><p>Adicione uma conta para acompanhar saldos e importar movimentações.</p></div><button type="button" data-action="openModal" data-modal="modal-banco" class="nv-accounts-empty-action">Adicionar conta</button></div>`;

        const cardsHtml = cardsData.length ? cardsData.map(({ card, committed, limit, available, invoice, dueDate }) => {
            const bank = bankFor(card);
            const usagePercent = limit > 0 ? Math.min((committed / limit) * 100, 100) : 0;
            const usageClass = usagePercent >= 80 ? 'is-high' : usagePercent >= 50 ? 'is-medium' : 'is-low';
            return `
            <article class="nv-accounts-card nv-accounts-card--credit" data-key="cartao_${Utils.escapeHTML(String(card.id))}">
                <div class="nv-credit-card-top">
                    <div><span class="nv-accounts-overline">Cartão de crédito</span><h3>${Utils.escapeHTML(card.nome || 'Cartão sem nome')}</h3><p>${Utils.escapeHTML(bank?.instituicao || bank?.nome || 'Conta vinculada')} · ${Utils.escapeHTML(cardFinal(card))}</p></div>
                    <div class="nv-credit-card-mark"><i class="fa-regular fa-credit-card" aria-hidden="true"></i></div>
                </div>
                <div class="nv-credit-card-details"><div><span>Fechamento</span><strong>Dia ${Utils.escapeHTML(String(card.fechamento || card.diaFechamento || '—'))}</strong></div><div><span>Vencimento</span><strong>Dia ${Utils.escapeHTML(String(card.vencimento || card.diaVencimento || '—'))}</strong></div><div><span>Próximo vencimento</span><strong>${dateLabel(dueDate)}</strong></div></div>
                <div class="nv-credit-card-metrics"><div><span>Fatura em aberto</span><strong class="money">${money(invoice.explainedTotal)}</strong></div><div><span>Comprometido</span><strong class="money">${money(committed)}</strong></div><div><span>Disponível</span><strong class="money is-positive">${money(available)}</strong></div><div><span>Limite total</span><strong class="money">${money(limit)}</strong></div></div>
                <div class="nv-credit-card-progress"><div class="nv-credit-card-progress-label"><span>Limite comprometido</span><strong>${usagePercent.toFixed(0)}%</strong></div><div class="nv-credit-card-progress-track"><span class="${usageClass}" style="width:${usagePercent}%"></span></div></div>
                <div class="nv-accounts-card-actions">
                    ${actionButton('openInvoiceDetails', 'Abrir fatura', 'fa-solid fa-file-invoice-dollar', `data-id="${Utils.escapeHTML(String(card.id))}"`, 'secondary')}
                    ${actionButton('openCardExpenseModal', 'Lançar despesa', 'fa-solid fa-plus', `data-id="${Utils.escapeHTML(String(card.id))}" data-nome="${Utils.escapeHTML(card.nome || 'Cartão')}"`, 'primary')}
                    <button type="button" data-action="delete" data-col="cartoes" data-id="${Utils.escapeHTML(String(card.id))}" class="nv-accounts-icon-action nv-accounts-icon-action--danger" title="Excluir cartão" aria-label="Excluir cartão"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
                </div>
            </article>`;
        }).join('') : `
            <div class="nv-accounts-empty"><div class="nv-accounts-empty-icon nv-accounts-empty-icon--card"><i class="fa-regular fa-credit-card" aria-hidden="true"></i></div><div><strong>Nenhum cartão cadastrado</strong><p>Cadastre um cartão vinculado a uma conta para acompanhar faturas e limite.</p></div><button type="button" ${cardCtaAction} class="nv-accounts-empty-action" title="${bancos.length ? 'Adicionar cartão' : 'Cadastre uma conta antes de adicionar um cartão'}">${cardCtaLabel}</button></div>`;

        return `<div class="nv-accounts-page">
            <header class="nv-accounts-header"><div><p class="nv-accounts-eyebrow">Visão financeira</p><h1>Contas e cartões</h1><p class="nv-accounts-subtitle">Acompanhe saldos, faturas e limites em um só lugar.</p></div><div class="nv-accounts-header-actions"><button type="button" data-action="iniciarImportacaoOFX" data-banco-id="${firstBankId}" class="nv-accounts-secondary-action" ${bancos.length ? '' : 'disabled'}><i class="fa-solid fa-file-import" aria-hidden="true"></i><span>Importar OFX</span></button><button type="button" data-action="iniciarImportacaoCSV" data-banco-id="${firstBankId}" class="nv-accounts-secondary-action" ${bancos.length ? '' : 'disabled'}><i class="fa-solid fa-file-csv" aria-hidden="true"></i><span>Importar CSV</span></button><details class="nv-accounts-add"><summary class="nv-accounts-primary-action"><i class="fa-solid fa-plus" aria-hidden="true"></i><span>Adicionar</span><i class="fa-solid fa-chevron-down nv-accounts-add-chevron" aria-hidden="true"></i></summary><div class="nv-accounts-add-menu"><button type="button" data-action="openModal" data-modal="modal-banco"><i class="fa-solid fa-building-columns" aria-hidden="true"></i><span><strong>Conta</strong><small>Saldo e movimentações</small></span></button><button type="button" ${cardCtaAction}><i class="fa-regular fa-credit-card" aria-hidden="true"></i><span><strong>${cardMenuTitle}</strong><small>${cardMenuDescription}</small></span></button></div></details></div></header>
            <section class="nv-accounts-overview" aria-labelledby="nv-accounts-overview-title"><div class="nv-accounts-section-heading"><div><p class="nv-accounts-eyebrow">Resumo</p><h2 id="nv-accounts-overview-title">Panorama financeiro</h2></div></div><div class="nv-accounts-summary-grid"><div class="nv-accounts-summary-card nv-accounts-summary-card--balance"><div class="nv-accounts-summary-icon"><i class="fa-solid fa-wallet" aria-hidden="true"></i></div><div><span>Saldo total das contas</span><strong class="money money--large">${money(totalBalance)}</strong><small>${bancos.length} ${bancos.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}</small></div></div><div class="nv-accounts-summary-card nv-accounts-summary-card--invoice"><div class="nv-accounts-summary-icon"><i class="fa-solid fa-file-invoice-dollar" aria-hidden="true"></i></div><div><span>Faturas em aberto</span><strong class="money money--large">${money(openInvoiceAmount)}</strong><small>${nextDue ? `Próximo vencimento · ${dateLabel(nextDue)}` : 'Nenhum vencimento informado'}</small></div></div></div></section>
            <section class="nv-accounts-section" aria-labelledby="nv-accounts-bank-title"><div class="nv-accounts-section-heading"><div><p class="nv-accounts-eyebrow">Patrimônio</p><h2 id="nv-accounts-bank-title">Contas</h2><p>Saldo disponível e origem de cada movimentação.</p></div><span class="nv-accounts-count">${bancos.length}</span></div><div class="nv-accounts-grid">${accountsHtml}</div></section>
            <section class="nv-accounts-section nv-accounts-section--cards" aria-labelledby="nv-accounts-card-title"><div class="nv-accounts-section-heading"><div><p class="nv-accounts-eyebrow">Crédito</p><h2 id="nv-accounts-card-title">Cartões</h2><p>Faturas abertas, comprometimento e limite disponível.</p></div><span class="nv-accounts-count">${cartoes.length}</span></div><div class="nv-accounts-grid">${cardsHtml}</div></section>
        </div>`;
    },

    contatosPage: (contatos) => {
        const listHtml = contatos.map(c => `
            <div data-key="${c.id}" class="flex items-center justify-between p-4 bg-surface border border-border rounded-[16px] shadow-soft mb-3 group hover:-translate-y-0.5 transition-all">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 bg-bg text-text-secondary rounded-[12px] flex items-center justify-center border border-border"><i class="fa-solid fa-address-book"></i></div>
                    <div>
                        <h4 class="font-bold text-text-primary text-sm font-primary">${Utils.escapeHTML(c.nome)}</h4>
                        <p class="text-xs text-text-secondary font-mono mt-0.5 tracking-wider">${Utils.escapeHTML(c.documento || 'Documento não informado')}</p>
                    </div>
                </div>
                <button data-action="delete" data-col="contatos" data-id="${c.id}" class="text-border hover:text-danger w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg transition-colors"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `).join('');

        const emptyState = `
            <div class="text-center py-16 px-6 bg-surface rounded-[16px] border border-border shadow-soft flex flex-col items-center justify-center mt-6">
                <div class="w-20 h-20 bg-bg text-brand-medium border border-border rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
                    <i class="fa-regular fa-address-book"></i>
                </div>
                <h4 class="font-bold text-text-primary text-lg mb-2 font-primary">Nenhum contato registrado</h4>
                <p class="text-sm text-text-secondary mb-6 max-w-sm">Associe nomes, CPFs ou CNPJs às suas transações para um controle financeiro mais detalhado.</p>
                <button data-action="openModal" data-modal="modal-contato" class="bg-brand-medium hover:bg-brand-dark text-white px-6 py-2.5 rounded-[12px] font-bold shadow-soft transition-all hover:-translate-y-0.5">Criar Registro</button>
            </div>
        `;

        return `<div>${contatos.length ? listHtml : emptyState}</div>`;
    },

    categoriesPage: (db) => {
        // Category management is intentionally separate from reports/analytics.  Normalize
        // legacy records at the rendering boundary and never mutate persisted data here.
        const source = Array.isArray(db?.categorias) ? db.categorias : [];
        const normalize = (raw, index) => {
            const item = typeof raw === 'string' ? { nome: raw } : (raw && typeof raw === 'object' ? raw : {});
            const nome = String(item.nome || item.name || `Categoria ${index + 1}`).trim() || `Categoria ${index + 1}`;
            const grupoRaw = String(item.grupo || item.group || '').trim();
            const grupo = grupoRaw || nome;
            const subgrupo = String(item.subgrupo || item.subGroup || nome).trim() || nome;
            const tipoRaw = String(item.tipo || item.type || '').trim().toLowerCase();
            const legacyMovement = tipoRaw === 'movimentação' || tipoRaw === 'movimentacao' || tipoRaw === 'transferencia';
            const isReceita = tipoRaw === 'receita' || tipoRaw === 'income' || (!tipoRaw && grupo.toLocaleLowerCase('pt-BR') === 'renda');
            const tipo = legacyMovement ? 'movimentação' : (isReceita ? 'receita' : 'despesa');
            const fixa = isCategoriaPadrao({ ...item, nome, grupo, subgrupo }, null);
            const icon = getCategoriaIcon({ ...item, nome, grupo, subgrupo, fixa });
            const color = /^#[0-9a-f]{3,8}$/i.test(String(item.cor || '')) ? String(item.cor) : 'var(--c-brand-medium)';
            const archived = item.ativo === false || item.arquivada === true;
            const principal = !legacyMovement && (item.tipoCategoria === 'principal' || !grupoRaw || (grupo === nome && subgrupo === nome));
            return {
                raw, id: item.id, nome, grupo, subgrupo, tipo,
                tipoLabel: legacyMovement ? 'Legado · movimentação' : (isReceita ? 'Receita' : 'Despesa'),
                icon, color, fixa, archived, principal, legacyMovement,
                statusLabel: archived ? 'Arquivada' : (fixa ? 'Padrão' : 'Personalizada')
            };
        };
        const all = source.map(normalize);
        const legacy = all.filter(item => item.legacyMovement);
        const categories = all.filter(item => !item.legacyMovement);
        const receitas = categories.filter(item => item.tipo === 'receita');
        const despesas = categories.filter(item => item.tipo === 'despesa');
        const padrao = categories.filter(item => item.fixa);
        const personalizadas = categories.filter(item => !item.fixa);
        const groupBy = (items) => {
            const grouped = new Map();
            items.forEach(item => {
                if (!grouped.has(item.grupo)) grouped.set(item.grupo, []);
                grouped.get(item.grupo).push(item);
            });
            return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
        };
        const escape = value => Utils.escapeHTML(String(value ?? ''));
        const actionMenu = (item) => {
            if (item.id === undefined || item.id === null || item.id === '') return '';
            if (item.fixa) return `<details class="nv-category-actions-menu"><summary title="Ver ações de ${escape(item.nome)}" aria-label="Ver ações de ${escape(item.nome)}"><i class="fa-solid fa-ellipsis" aria-hidden="true"></i></summary><div class="nv-category-actions-popover"><button type="button" data-action="viewCategory" data-id="${escape(item.id)}"> <i class="fa-regular fa-eye" aria-hidden="true"></i>Ver</button></div></details>`;
            const manage = item.archived
                ? `<button type="button" data-action="editCategory" data-id="${escape(item.id)}"><i class="fa-solid fa-pen" aria-hidden="true"></i>Editar</button><button type="button" data-action="restoreCategory" data-id="${escape(item.id)}"><i class="fa-solid fa-box-archive" aria-hidden="true"></i>Restaurar</button>`
                : `<button type="button" data-action="editCategory" data-id="${escape(item.id)}"><i class="fa-solid fa-pen" aria-hidden="true"></i>Editar</button><button type="button" data-action="archiveCategory" data-id="${escape(item.id)}"><i class="fa-solid fa-box-archive" aria-hidden="true"></i>Arquivar</button>`;
            return `<details class="nv-category-actions-menu"><summary title="Ações de ${escape(item.nome)}" aria-label="Ações de ${escape(item.nome)}"><i class="fa-solid fa-ellipsis" aria-hidden="true"></i></summary><div class="nv-category-actions-popover">${manage}<button type="button" data-action="deleteCategory" data-id="${escape(item.id)}"><i class="fa-solid fa-trash-can" aria-hidden="true"></i>Excluir</button></div></details>`;
        };
        const groupCards = (items) => groupBy(items).map(([group, entries]) => {
            const base = entries.find(item => item.principal) || entries[0];
            const searchText = entries.map(item => `${item.nome} ${item.grupo} ${item.subgrupo} ${item.tipoLabel} ${item.statusLabel} ${item.principal ? 'categoria principal grupo' : 'subcategoria'}`).join(' ');
            const rows = entries.map(item => {
                const rowLabel = item.principal ? item.nome : item.subgrupo || item.nome;
                const hierarchy = item.principal ? 'Categoria principal · grupo' : `Subcategoria · ${item.grupo}`;
                const rowSearch = `${item.nome} ${item.grupo} ${item.subgrupo} ${item.tipoLabel} ${item.statusLabel} ${hierarchy}`;
                return `<div class="nv-category-subrow ${item.archived ? 'is-archived' : ''}" data-category-row data-category-id="${escape(item.id)}" data-search="${escape(rowSearch.toLocaleLowerCase('pt-BR'))}" data-category-status="${item.archived ? 'archived' : 'active'}"><span class="nv-category-row-icon" style="background:${escape(item.color)}" title="${escape(item.nome)}"><i class="fa-solid ${escape(item.icon)}" aria-hidden="true"></i></span><span class="nv-category-subrow__name"><strong>${escape(rowLabel)}</strong><small>${escape(hierarchy)}</small></span><span class="nv-category-type nv-category-type--${item.tipo === 'receita' ? 'income' : 'expense'}">${escape(item.tipoLabel)}</span><span class="nv-category-status ${item.archived ? 'is-archived' : item.fixa ? 'is-fixed' : 'is-custom'}">${escape(item.statusLabel)}</span>${actionMenu(item)}</div>`;
            }).join('');
            return `<details class="nv-category-card" data-category-type="${base.tipo}" data-category-count="${entries.length}" data-group-count="1" data-search="${escape(searchText.toLocaleLowerCase('pt-BR'))}" open><summary class="nv-category-card__summary"><span class="nv-category-card__icon" style="background:${escape(base.color)}"><i class="fa-solid ${escape(base.icon)}" aria-hidden="true"></i></span><span class="nv-category-card__main"><strong>${escape(group)}</strong><span>Grupo · ${entries.length} ${entries.length === 1 ? 'categoria' : 'categorias'}</span></span><span class="nv-category-card__type">${escape(base.tipoLabel)}</span><span class="nv-category-card__count">${entries.length} ${entries.length === 1 ? 'registro' : 'registros'}</span><i class="fa-solid fa-chevron-down nv-category-card__chevron" aria-hidden="true"></i></summary><div class="nv-category-subrows">${rows}</div></details>`;
        }).join('');
        const section = (type, title, icon, items, emptyText) => `<section class="nv-category-section" data-category-section="${type}" aria-labelledby="nv-category-${type}-title"><div class="nv-category-section__heading"><div><p class="nv-category-eyebrow">Organização</p><h3 id="nv-category-${type}-title"><i class="fa-solid ${icon}" aria-hidden="true"></i>${title}</h3></div><span class="nv-category-section__count" data-section-count>${items.length} ${items.length === 1 ? 'categorias' : 'categorias'} · ${groupBy(items).length} ${groupBy(items).length === 1 ? 'grupo' : 'grupos'}</span></div><div class="nv-category-list">${groupCards(items) || `<div class="nv-category-empty"><i class="fa-solid fa-tag" aria-hidden="true"></i><span>${emptyText}</span></div>`}</div></section>`;
        const card = (value, label, icon, extra = '') => `<div class="nv-category-summary-card ${extra}"><span class="nv-category-summary-card__icon"><i class="fa-solid ${icon}" aria-hidden="true"></i></span><span><strong>${value}</strong><small>${label}</small></span></div>`;
        const total = categories.length;
        return `<div class="nv-categories-page" data-category-management data-category-type="all" data-category-status="active">
            <div class="nv-category-summary" aria-label="Resumo das categorias">${card(despesas.length, 'Despesas', 'fa-arrow-trend-down', 'is-expense')}${card(receitas.length, 'Receitas', 'fa-arrow-trend-up', 'is-income')}${card(padrao.length, 'Padrão', 'fa-lock')}${card(personalizadas.length, 'Personalizadas', 'fa-sliders')}</div>
            <div class="nv-category-toolbar"><label class="nv-category-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span class="sr-only">Buscar categoria</span><input type="search" data-input="categorySearch" placeholder="Buscar por nome, grupo, subcategoria, tipo ou status" autocomplete="off"></label><div class="nv-category-filters" role="group" aria-label="Filtrar por tipo"><button type="button" class="nv-category-filter is-active" data-action="setCategoryType" data-payload="all" aria-pressed="true">Todas</button><button type="button" class="nv-category-filter" data-action="setCategoryType" data-payload="despesa" aria-pressed="false">Despesas</button><button type="button" class="nv-category-filter" data-action="setCategoryType" data-payload="receita" aria-pressed="false">Receitas</button></div><div class="nv-category-filters" role="group" aria-label="Filtrar por status"><button type="button" class="nv-category-filter is-active" data-action="setCategoryStatus" data-payload="active" aria-pressed="true">Ativas</button><button type="button" class="nv-category-filter" data-action="setCategoryStatus" data-payload="archived" aria-pressed="false">Arquivadas</button><button type="button" class="nv-category-filter" data-action="setCategoryStatus" data-payload="all" aria-pressed="false">Todos os status</button></div><span class="nv-category-results-count" aria-live="polite">${total} ${total === 1 ? 'categoria' : 'categorias'} · ${groupBy(categories).length} ${groupBy(categories).length === 1 ? 'grupo' : 'grupos'}</span></div>
            <div class="nv-category-sections">${section('despesa', 'Despesas', 'fa-arrow-trend-down', despesas, 'Nenhuma categoria de despesa cadastrada.')}${section('receita', 'Receitas', 'fa-arrow-trend-up', receitas, 'Nenhuma categoria de receita cadastrada.')}</div>${legacy.length ? `<p class="nv-category-legacy-note"><i class="fa-solid fa-circle-info" aria-hidden="true"></i>${legacy.length} registro(s) legado(s) de movimentação permanecem apenas para compatibilidade histórica; transferências continuam fora das categorias.</p>` : ''}<div class="nv-category-filter-empty" hidden><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><strong>Nenhuma categoria encontrada</strong><span>Tente outro nome ou escolha outro filtro.</span></div>
        </div>`;
    },

    filtersSection: (f, bancos, categorias = [], cartoes = []) => {
        const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
        const currentType = f.tipo || '';
        const tabs = [
            ['', 'Todas', 'fa-layer-group'],
            ['receita', 'Receitas', 'fa-arrow-trend-up'],
            ['despesa', 'Despesas', 'fa-arrow-trend-down'],
            ['transferencia', 'Transferências', 'fa-right-left']
        ];
        const tabHtml = tabs.map(([value, label, icon]) => `<button type="button" role="tab" data-action="setTransactionTypeFilter" data-payload="${value}" class="nv-tx-tab ${currentType === value ? 'is-active' : ''}" aria-selected="${currentType === value ? 'true' : 'false'}" aria-pressed="${currentType === value ? 'true' : 'false'}"><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${label}</span></button>`).join('');

        let contas = '<option value="">Todas as contas</option>';
        if (bancos?.length) contas += '<optgroup label="Contas bancárias">' + bancos.map(b => `<option value="banco_${Utils.escapeHTML(String(b.id))}" ${f.bancoId === 'banco_'+b.id ? 'selected' : ''}>${Utils.escapeHTML(b.instituicao && b.instituicao !== 'Outro' ? b.instituicao + ' (' + b.nome + ')' : b.nome)}</option>`).join('') + '</optgroup>';
        if (cartoes?.length) contas += '<optgroup label="Cartões">' + cartoes.map(c => `<option value="cartao_${Utils.escapeHTML(String(c.id))}" ${f.bancoId === 'cartao_'+c.id ? 'selected' : ''}>${Utils.escapeHTML(c.nome)}</option>`).join('') + '</optgroup>';
        const cats = categorias.filter(c => typeof c === 'string' || (c.ativo !== false && !c.arquivada) || (f.categoria && c.nome === f.categoria)).map(c => {
            const nome = typeof c === 'string' ? c : c.nome;
            const archived = typeof c !== 'string' && (c.ativo === false || c.arquivada === true);
            return `<option value="${Utils.escapeHTML(nome)}" ${f.categoria === nome ? 'selected' : ''}>${Utils.escapeHTML(nome)}${archived ? ' (arquivada · histórico)' : ''}</option>`;
        }).join('');

        return `<div class="nv-tx-filters">
            <div class="nv-tx-filter-tabs" role="tablist" aria-label="Filtrar por tipo">${tabHtml}</div>
            <div class="nv-tx-filter-grid">
                <div class="nv-tx-filter-search"><label for="transactions-search" class="nv-tx-label">Buscar movimentação</label><div class="nv-tx-search-wrap"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input id="transactions-search" type="search" autocomplete="off" placeholder="Descrição ou identificador" value="${Utils.escapeHTML(f.desc || '')}" data-input="setFilterDesc" class="nv-tx-input"></div></div>
                <div><label for="transactions-month" class="nv-tx-label">Período</label><select id="transactions-month" data-change="setFilter" data-filter-key="mes" class="nv-tx-input"><option value="">Todos os meses</option>${meses.map((m,i)=>`<option value="${i}" ${f.mes===String(i)?'selected':''}>${m}</option>`).join('')}</select></div>
                <div><label for="transactions-type" class="nv-tx-label">Tipo</label><select id="transactions-type" data-change="setFilter" data-filter-key="tipo" class="nv-tx-input"><option value="">Todos os tipos</option><option value="receita" ${f.tipo==='receita'?'selected':''}>Receitas</option><option value="despesa" ${f.tipo==='despesa'?'selected':''}>Despesas</option><option value="transferencia" ${f.tipo==='transferencia'?'selected':''}>Transferências</option></select></div>
            </div>
            <details class="nv-tx-more-filters" ${f.categoria || f.bancoId || f.dataInicio || f.dataFim ? 'open' : ''}><summary>Mais filtros <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary><div class="nv-tx-more-grid">
                <div><label for="transactions-category" class="nv-tx-label">Categoria</label><select id="transactions-category" data-change="setFilter" data-filter-key="categoria" class="nv-tx-input"><option value="">Todas as categorias</option>${cats}</select></div>
                <div><label for="transactions-account" class="nv-tx-label">Conta ou cartão</label><select id="transactions-account" data-change="setFilter" data-filter-key="bancoId" class="nv-tx-input">${contas}</select></div>
                <div class="nv-tx-date-range"><div><label for="transactions-start" class="nv-tx-label">De</label><input id="transactions-start" type="date" data-change="setFilter" data-filter-key="dataInicio" value="${Utils.escapeHTML(f.dataInicio || '')}" class="nv-tx-input"></div><div><label for="transactions-end" class="nv-tx-label">Até</label><input id="transactions-end" type="date" data-change="setFilter" data-filter-key="dataFim" value="${Utils.escapeHTML(f.dataFim || '')}" class="nv-tx-input"></div></div>
                <button type="button" data-action="clearFilters" class="nv-tx-clear"><i class="fa-solid fa-eraser" aria-hidden="true"></i> Limpar filtros</button>
            </div></details>
        </div>`;
    },

    transactionSummary: (transacoes = []) => {
        const receitas = transacoes.filter(t => !t.transferenciaInterna && t.tipo === 'receita').reduce((s,t) => s + (Number(t.valor)||0), 0);
        const despesas = transacoes.filter(t => !t.transferenciaInterna && t.tipo === 'despesa').reduce((s,t) => s + (Number(t.valor)||0), 0);
        const saldo = receitas - despesas;
        const card = (label, value, tone, icon) => `<article class="nv-tx-summary-card ${tone}"><span class="nv-tx-summary-icon"><i class="fa-solid ${icon}" aria-hidden="true"></i></span><div><p>${label}</p><strong class="money">${value}</strong></div></article>`;
        return `<section class="nv-tx-summary" aria-label="Resumo da consulta">${card('Receitas', Utils.formatMoney(receitas), 'is-income', 'fa-arrow-trend-up')}${card('Despesas', Utils.formatMoney(despesas), 'is-expense', 'fa-arrow-trend-down')}${card('Saldo', Utils.formatMoney(saldo), saldo >= 0 ? 'is-balance-positive' : 'is-balance-negative', 'fa-scale-balanced')}<div class="nv-tx-summary-count"><span>Movimentações</span><strong>${transacoes.length}</strong></div></section>`;
    },

    transactionList: (list, state) => {
        const selected = (state?.selectedTransactions || []).map(String);
        const allVisibleSelected = list.length > 0 && list.every(t => selected.includes(String(t.id)));

        if (!list.length) {
            return `<div class="nv-tx-empty"><div class="nv-tx-empty-icon"><i class="fa-solid fa-receipt" aria-hidden="true"></i></div><h4>Nenhuma transação encontrada</h4><p>Os filtros aplicados não retornaram resultados ou você ainda não registrou movimentações.</p><button type="button" data-action="openModal" data-modal="modal-transacao" data-type="despesa" class="nv-tx-empty-action">Nova transação</button></div>`;
        }

        return `<div class="nv-tx-list-head"><label class="nv-tx-select-all"><input type="checkbox" data-change="toggleSelectAllTx" ${allVisibleSelected ? 'checked' : ''} aria-label="Selecionar todas as movimentações visíveis"><span>Selecionar página</span></label>${selected.length > 0 ? `<button type="button" data-action="deleteSelectedTx" class="nv-tx-bulk-delete"><i class="fa-solid fa-trash-can" aria-hidden="true"></i> Apagar selecionadas (${selected.length})</button>` : ''}</div><div class="nv-tx-list">${list.map(t => {
            const isTransfer = !!t.transferenciaInterna || t.tipo === 'transferencia';
            const isRec = isTransfer ? !!t.transferenciaEntrada : t.tipo === 'receita';
            const valColor = isRec ? 'is-income' : 'is-expense';
            const sign = isRec ? '+' : '-';
            let dataFormatada = 'Hoje';
            if (t.data) {
                const parsed = new Date(t.data + 'T12:00:00');
                dataFormatada = isNaN(parsed.getTime()) ? 'Data inválida' : parsed.toLocaleDateString('pt-BR');
            }
            const contato = t.contatoId && db.contatos ? db.contatos.find(c => c.id === t.contatoId) : null;
            const banco = db.bancos?.find(b => String(b.id) === String(t.bancoId));
            const cartao = t.isCartao ? db.cartoes?.find(c => String(c.id) === String(t.bancoId)) : null;
            const contaLabel = cartao?.nome || banco?.nome || banco?.instituicao || '';
            const txId = t.codigoRef || `TX-${String(t.id).substring(0, 8).toUpperCase()}`;
            const catObj = CoreComponents._getCategoryConfig(t.categoria);
            const catColor = Utils.escapeHTML(String(catObj.cor || 'var(--c-text-secondary)'));
            const isSelected = selected.includes(String(t.id));
            const typeLabel = isTransfer ? 'Transferência' : (t.tipo === 'receita' ? 'Receita' : 'Despesa');
            return `<div class="swipe-container nv-tx-row ${isSelected ? 'is-selected' : ''}" data-id="${Utils.escapeHTML(String(t.id))}"><div class="swipe-front nv-tx-row-front"><div class="nv-tx-row-main"><label class="nv-tx-check"><input type="checkbox" data-change="toggleSelectTx" value="${Utils.escapeHTML(String(t.id))}" ${isSelected ? 'checked' : ''} aria-label="Selecionar ${Utils.escapeHTML(t.desc || typeLabel)}"><span></span></label><span class="nv-tx-category-icon" style="background-color: ${catColor}"><i class="fa-solid ${Utils.escapeHTML(catObj.icone)}" aria-hidden="true"></i></span><div class="nv-tx-description"><div class="nv-tx-title-line"><strong>${Utils.escapeHTML(t.desc || typeLabel)}</strong><span class="nv-tx-reference">#${Utils.escapeHTML(String(txId))}</span></div><div class="nv-tx-meta"><span class="nv-tx-type" style="--tx-category-color: ${catColor}">${Utils.escapeHTML(t.categoria || typeLabel)}</span><span><i class="fa-regular fa-calendar" aria-hidden="true"></i>${Utils.escapeHTML(dataFormatada)}</span>${contaLabel ? `<span><i class="fa-solid fa-building-columns" aria-hidden="true"></i>${Utils.escapeHTML(contaLabel)}</span>` : ''}${t.isCartao ? `<span><i class="fa-regular fa-credit-card" aria-hidden="true"></i>Cartão${t.parcelaAtual ? ` · ${Utils.escapeHTML(String(t.parcelaAtual))}/${Utils.escapeHTML(String(t.totalParcelas))}` : ''}</span>` : ''}${t.formaPagamento && t.formaPagamento !== 'Não informada' ? `<span class="nv-tx-meta-optional">${Utils.escapeHTML(t.formaPagamento)}</span>` : ''}${t.recorrente && !t.isCartao ? '<span><i class="fa-solid fa-repeat" aria-hidden="true"></i>Fixa</span>' : ''}${contato ? `<span class="nv-tx-meta-optional"><i class="fa-regular fa-address-book" aria-hidden="true"></i>${Utils.escapeHTML(contato.nome)}</span>` : ''}</div></div></div><div class="nv-tx-row-value"><strong class="money ${valColor}">${sign} ${Utils.formatMoney(t.valor)}</strong><span class="nv-tx-row-kind">${typeLabel}</span><div class="nv-tx-row-actions"><button type="button" data-action="openEditModal" data-id="${Utils.escapeHTML(String(t.id))}" title="Editar transação" aria-label="Editar transação"><i class="fa-solid fa-pen" aria-hidden="true"></i><span>Editar</span></button><button type="button" data-action="deleteExpense" data-id="${Utils.escapeHTML(String(t.id))}" title="Apagar transação" aria-label="Apagar transação"><i class="fa-solid fa-trash-can" aria-hidden="true"></i><span>Apagar</span></button></div></div></div></div>`;
        }).join('')}</div>`;
    },

    contasDashboard: (bancos, cartoes, comprasCartao, state) => {
        if(!bancos.length) {
            return `
            <div class="text-center py-16 px-6 bg-surface rounded-[16px] border border-border shadow-soft flex flex-col items-center justify-center">
                <div class="w-20 h-20 bg-bg text-brand-soft border border-border rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
                    <i class="fa-solid fa-building-columns"></i>
                </div>
                <h4 class="font-bold text-text-primary text-lg mb-2 font-primary">Nenhuma conta cadastrada</h4>
                <p class="text-sm text-text-secondary mb-6 max-w-sm">Adicione uma conta bancária para começar.</p>
                <button data-action="openModal" data-modal="modal-banco" class="bg-brand-deep hover:bg-brand-dark text-white px-6 py-2.5 rounded-[12px] font-bold shadow-soft transition-all hover:-translate-y-0.5">Criar Conta Bancária</button>
            </div>`;
        }

        return `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">` + bancos.map(b => {
            const bankCards = cartoes.filter(c => c.bancoId.toString() === b.id.toString());
            const cardsHtml = bankCards.map(c => {
                const gasto = comprasCartao.filter(dc => dc.cartaoId === c.id).reduce((acc, curr) => acc + curr.valor, 0);
                return CoreComponents._buildBankCard(c, b, gasto);
            }).join('');

            let headerColor = b.cor && b.cor !== 'var(--c-brand-deep)' ? b.cor : '#1F0F42';
            
            const searchStr = `${b.instituicao || ''} ${b.nome || ''}`.toLowerCase();
            if (searchStr.includes('nubank')) headerColor = '#8A05BE';
            else if (searchStr.includes('itaú') || searchStr.includes('itau')) headerColor = '#EC7000';
            else if (searchStr.includes('inter')) headerColor = '#FF7A00';
            else if (searchStr.includes('santander')) headerColor = '#CC0000';
            else if (searchStr.includes('bradesco')) headerColor = '#CC092F';
            else if (searchStr.includes('brasil') || searchStr.includes('bb')) headerColor = '#003DA5';
            else if (searchStr.includes('c6')) headerColor = '#242424';
            else if (searchStr.includes('caixa')) headerColor = '#005CA9';

            return `
            <div data-key="banco_${b.id}" class="bg-surface rounded-[16px] border border-border shadow-soft overflow-hidden hover:-translate-y-1 transition-transform">
                <div class="p-8 relative" style="background-color: ${headerColor};">
                    <div class="flex justify-between items-start text-white">
                        <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-[12px] flex items-center justify-center text-xl shadow-inner"><i class="fa-solid fa-building-columns"></i></div>
                        <button data-action="delete" data-col="bancos" data-id="${b.id}" class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" title="Excluir Conta"><i class="fa-solid fa-trash text-xs"></i></button>
                    </div>
                    <div class="mt-8 text-white relative z-10">
                        <p class="text-xs font-bold opacity-90 uppercase tracking-wider mb-1">${Utils.escapeHTML(b.nome)} ${b.instituicao && b.instituicao !== 'Outro' ? `(${Utils.escapeHTML(b.instituicao)})` : ''}</p>
                        <h3 class="text-3xl font-bold tracking-tight font-mono">${Utils.formatMoney(b.saldo)}</h3>
                        <p class="text-xs opacity-90 mt-1">Saldo em Conta Corrente</p>
                    </div>
                    <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                </div>
                <div class="p-6">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-bold text-text-primary text-sm font-primary">Cartões Vinculados</h4>
                        <span class="text-xs font-bold bg-border text-text-secondary px-2 py-0.5 rounded-full">${bankCards.length}</span>
                    </div>
                    ${bankCards.length > 0 ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${cardsHtml}</div>` : '<p class="text-xs text-text-secondary text-center py-6 bg-bg rounded-[16px] border border-dashed border-border mt-4">Nenhum cartão vinculado a esta conta.</p>'}
                </div>
            </div>`;
        }).join('') + `</div>`;
    },

    invoiceDetailsView: (card, despesas, state) => {
        const monthExpenses = listInvoiceTransactions(despesas, card, state.invoiceYear, state.invoiceMonth);
        const invoiceRecord = db.conciliacoesFaturas?.find(r => r.chave === invoiceReconciliationKey(card.id, state.invoiceYear, state.invoiceMonth));
        const adjustments = invoiceRecord?.ajustes || [];
        const pendingAdjustments = adjustments.filter(a => !(a.lancamentoCriado && a.transactionId));
        const bulkEligibleAdjustments = pendingAdjustments.filter(a => a.type !== 'unrecognized_purchase');
        const reconciliation = calculateReconciliation(monthExpenses, invoiceRecord?.valorFaturaReal, adjustments);
        const totalFatura = reconciliation.explainedTotal;
        const periodo = getInvoicePeriod(card, state.invoiceYear, state.invoiceMonth);
        const statusClasses = { 'em aberto': 'bg-slate-100 text-slate-700', 'aguardando conferência': 'bg-amber-100 text-amber-700', 'diferença encontrada': 'bg-rose-100 text-rose-700', 'conciliada': 'bg-emerald-100 text-emerald-700' };
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]; 
        const mesAtualNome = meses[state.invoiceMonth];
        
        const vencimento = Number(card.vencimento || card.diaVencimento || 1);
        const vencimentoStr = `${String(vencimento).padStart(2, '0')}/${(state.invoiceMonth + 1).toString().padStart(2, '0')}/${state.invoiceYear}`;

        const provisaoMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        let provisaoHtml = '';
        for(let i=1; i<=6; i++) {
            const nextDate = new Date(state.invoiceYear, state.invoiceMonth + i, 1);
            const pMonth = nextDate.getMonth();
            const pYear = nextDate.getFullYear();
            const pTotal = despesas.filter(d => {
                if(String(d.bancoId) !== String(card.id) || d.transferenciaInterna) return false;
                const dp = new Date(d.data + 'T12:00:00');
                return dp.getMonth() === pMonth && dp.getFullYear() === pYear;
            }).reduce((a,b)=>a+b.valor, 0);
            
            if(pTotal > 0) {
                provisaoHtml += `
                <div class="bg-surface border border-border rounded-[12px] p-4 text-center min-w-[90px] shadow-sm">
                    <p class="text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">${provisaoMeses[pMonth]}/${pYear.toString().slice(-2)}</p>
                    <p class="text-sm font-bold text-text-primary font-mono">${Utils.formatMoney(pTotal)}</p>
                </div>`;
            }
        }

        const selected = (state?.selectedTransactions || []).map(String);
        const allVisibleSelected = monthExpenses.length > 0 && monthExpenses.every(t => selected.includes(String(t.id)));

        return `
        <div class="p-6 border-b border-border flex justify-between items-start sticky top-0 bg-surface/95 backdrop-blur-sm z-10 rounded-t-[16px]">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-brand-deep rounded-[12px] text-white flex items-center justify-center shadow-md text-xl"><i class="fa-regular fa-credit-card"></i></div>
                <div>
                    <h3 class="font-bold text-text-primary text-lg leading-tight font-primary">${Utils.escapeHTML(card.nome)}</h3>
                    <p class="text-xs text-text-secondary mt-0.5">Faturas e Provisões</p>
                </div>
            </div>
            <button data-action="closeInvoiceDetails" class="text-text-secondary hover:text-text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="px-4 sm:px-6 border-b border-border bg-surface shrink-0" role="tablist" aria-label="Detalhes da fatura">
            <div class="flex gap-1" data-invoice-tabs>
                <button type="button" role="tab" id="invoice-tab-resumo" aria-controls="invoice-panel-resumo" aria-selected="true" tabindex="0" data-action="switchInvoiceTab" data-tab="resumo" class="invoice-tab px-3 py-3 text-xs font-bold text-brand-medium border-b-2 border-brand-medium">Resumo</button>
                <button type="button" role="tab" id="invoice-tab-compras" aria-controls="invoice-panel-compras" aria-selected="false" tabindex="-1" data-action="switchInvoiceTab" data-tab="compras" class="invoice-tab px-3 py-3 text-xs font-bold text-text-secondary border-b-2 border-transparent">Compras</button>
                <button type="button" role="tab" id="invoice-tab-ajustes" aria-controls="invoice-panel-ajustes" aria-selected="false" tabindex="-1" data-action="switchInvoiceTab" data-tab="ajustes" class="invoice-tab px-3 py-3 text-xs font-bold text-text-secondary border-b-2 border-transparent">Ajustes</button>
            </div>
        </div>
        
        <div class="invoice-panel flex-1 min-h-0 overflow-y-auto" id="invoice-panel-resumo" role="tabpanel" aria-labelledby="invoice-tab-resumo" tabindex="0">
        <div class="p-5 sm:p-8">
            <div class="flex items-center justify-center gap-8 mb-6">
                <button data-action="changeMonth" data-type="invoice" data-dir="-1" class="w-8 h-8 rounded-full hover:bg-bg flex items-center justify-center text-text-secondary transition-colors border border-transparent hover:border-border"><i class="fa-solid fa-chevron-left text-sm"></i></button>
                <span class="text-lg font-bold text-text-primary w-48 text-center capitalize font-primary">${mesAtualNome} ${state.invoiceYear}</span>
                <button data-action="changeMonth" data-type="invoice" data-dir="1" class="w-8 h-8 rounded-full hover:bg-bg flex items-center justify-center text-text-secondary transition-colors border border-transparent hover:border-border"><i class="fa-solid fa-chevron-right text-sm"></i></button>
            </div>

            <div class="bg-bg rounded-[16px] p-6 mb-8 border border-border">
                <p class="text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Fatura de ${mesAtualNome.toLowerCase()}</p>
                <h2 class="text-4xl font-black text-text-primary tracking-tight font-mono">${Utils.formatMoney(totalFatura)}</h2>
                <p class="text-xs text-text-secondary mt-3">Período: <span class="font-bold text-text-primary font-mono">${periodo.start.toLocaleDateString('pt-BR')} a ${periodo.end.toLocaleDateString('pt-BR')}</span></p>
                <p class="text-xs text-text-secondary mt-1">Vencimento: <span class="font-bold text-text-primary font-mono">${vencimentoStr}</span></p>
                <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><p class="text-[10px] uppercase font-bold text-text-secondary">Compras registradas</p><p class="font-mono font-bold text-text-primary">${Utils.formatMoney(reconciliation.totalRecorded)}</p></div>
                    <div><p class="text-[10px] uppercase font-bold text-text-secondary">Total explicado</p><p class="font-mono font-bold text-text-primary">${Utils.formatMoney(reconciliation.explainedTotal)}</p></div>
                    <div><label for="valor-fatura-real" class="text-[10px] uppercase font-bold text-text-secondary">Valor real da fatura</label><input id="valor-fatura-real" type="number" step="0.01" min="0" value="${reconciliation.realInvoiceAmount ?? ''}" placeholder="R$ 0,00" class="mt-1 w-full p-2 bg-surface border border-border rounded-lg font-mono text-sm"></div>
                </div>
                <div id="invoice-adjustments-slot" class="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs">
                    <span class="text-text-secondary">Ajustes explicativos: <strong class="text-text-primary">${adjustments.length}</strong></span>
                    <button type="button" data-action="switchInvoiceTab" data-tab="ajustes" class="text-brand-medium font-bold hover:text-brand-dark">Gerenciar ajustes <span aria-hidden="true">→</span></button>
                </div>
                <div class="mt-4 flex items-center justify-between gap-3"><span class="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusClasses[reconciliation.status]}">${reconciliation.status}</span><span class="text-xs ${reconciliation.difference !== null && Math.abs(reconciliation.difference) > 0.01 ? 'text-danger' : 'text-success'}">Diferença: ${reconciliation.difference === null ? '—' : Utils.formatMoney(reconciliation.difference)}</span><button data-action="saveInvoiceReconciliation" class="px-3 py-2 rounded-lg bg-brand-deep text-white text-xs font-bold">Salvar conferência</button></div>
            </div>
        </div>
        </div>
        <div class="invoice-panel hidden flex-1 min-h-0 overflow-y-auto" id="invoice-panel-compras" role="tabpanel" aria-labelledby="invoice-tab-compras" aria-hidden="true" tabindex="0">
        <div class="p-5 sm:p-8">
            <div class="space-y-1">
                ${monthExpenses.length === 0 ? '<p class="text-center text-text-secondary text-sm py-8 border border-border bg-surface rounded-[16px]">Nenhuma compra registrada nesta fatura.</p>' : 
                  `
                  <div class="flex justify-between items-center mb-2 px-2">
                      <div class="flex items-center gap-2">
                          <input type="checkbox" data-change="toggleSelectAllTx" ${allVisibleSelected ? 'checked' : ''} class="w-4 h-4 text-brand-medium bg-surface border-border rounded cursor-pointer">
                          <span class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Selecionar Tudo</span>
                      </div>
                      ${selected.length > 0 ? `
                      <button data-action="openInvoiceClassification" class="text-[10px] text-brand-medium border border-brand-medium/30 px-3 py-1.5 rounded font-bold hover:bg-brand-medium/10 transition-colors flex items-center gap-1">
                          <i class="fa-solid fa-tags"></i> Classificar selecionados (${selected.length})
                      </button>
                      ` : ''}
                  </div>
                  ` +
                  monthExpenses.map(item => {
                      const txId = item.codigoRef || `TX-${item.id.toString(36).substring(0,6).toUpperCase()}`;
                      const isSelected = selected.includes(item.id.toString());
                      
                      return `
                      <div data-key="${item.id}" class="flex justify-between items-center py-4 border-b border-border last:border-0 group hover:bg-bg px-2 rounded-[12px] transition-colors ${isSelected ? 'bg-bg' : ''}">
                          <div class="flex items-center gap-3">
                              <input type="checkbox" data-change="toggleSelectTx" value="${item.id}" ${isSelected ? 'checked' : ''} class="w-4 h-4 text-brand-medium bg-surface border-border rounded cursor-pointer">
                              <div>
                                  <div class="flex items-center gap-2">
                                      <p class="font-bold text-text-primary text-sm font-primary">${Utils.escapeHTML(item.desc)}</p>
                                      <span class="text-[9px] font-mono text-text-secondary bg-surface border border-border px-1 rounded" title="ID de Registro">#${txId}</span>
                                  </div>
                                  <p class="text-[10px] text-text-secondary mt-1 uppercase tracking-wider font-bold">Parcela ${item.parcelaAtual}/${item.totalParcelas}</p>
                              </div>
                          </div>
                          <div class="text-right flex flex-col items-end">
                              <p class="font-bold text-text-primary text-sm font-mono">${Utils.formatMoney(item.valor)}</p>
                              <div class="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button data-action="openEditModal" data-id="${item.id}" class="text-[10px] text-text-primary hover:text-brand-medium font-medium"><i class="fa-solid fa-pen mr-1"></i> Editar</button>
                                  <span class="text-border">|</span>
                                  <button data-action="deleteExpense" data-id="${item.id}" class="text-[10px] text-danger font-medium"><i class="fa-solid fa-trash-can mr-1"></i> Apagar</button>
                              </div>
                          </div>
                      </div>
                      `;
                  }).join('')
                }
            </div>

            ${provisaoHtml ? `
            <div>
                <h4 class="font-bold text-text-primary text-sm mb-4 font-primary">Provisão de Faturas Seguintes</h4>
                <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    ${provisaoHtml}
                </div>
            </div>
            ` : ''}
        </div>
        </div>
        <div class="invoice-panel hidden flex-1 min-h-0 overflow-y-auto" id="invoice-panel-ajustes" role="tabpanel" aria-labelledby="invoice-tab-ajustes" aria-hidden="true" tabindex="0">
            <div class="p-5 sm:p-8" id="invoice-adjustments-host">
                <p class="text-xs text-text-secondary mb-3">Gerencie encargos, créditos e lançamentos pendentes desta fatura.</p>
<div id="invoice-adjustments-section" class="mt-4 rounded-lg border border-border bg-surface p-3"><div class="flex items-center justify-between gap-2 mb-2"><p class="text-[10px] uppercase font-bold text-text-secondary">Ajustes explicativos</p><span class="font-mono text-xs font-bold ${reconciliation.totalAdjustments < 0 ? 'text-success' : 'text-text-primary'}">${reconciliation.totalAdjustments >= 0 ? '+' : ''}${Utils.formatMoney(reconciliation.totalAdjustments)}</span></div>
                    ${bulkEligibleAdjustments.length ? `<button data-action="openInvoiceAdjustmentsReview" class="w-full mb-2 px-3 py-2 rounded-lg bg-brand-medium text-white text-xs font-bold text-left hover:bg-brand-dark transition-colors"><i class="fa-solid fa-list-check mr-1"></i> Criar lançamentos pendentes (${bulkEligibleAdjustments.length})</button>` : ''}
                    ${pendingAdjustments.some(a => a.type === 'unrecognized_purchase') ? '<p class="mb-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2"><strong>Atenção:</strong> compra não reconhecida não entra no lote. Confirme-a individualmente somente após verificar o caso.</p>' : ''}
                    ${adjustments.length ? adjustments.map(a => { const credit = a.effect === 'credit' || a.sign === -1; const posted = Boolean(a.lancamentoCriado && a.transactionId); return `<div class="flex items-center justify-between gap-2 py-2 border-t border-border text-xs"><span><strong>${Utils.escapeHTML(a.description || a.type || 'Ajuste')}</strong><small class="block text-text-secondary">${Utils.escapeHTML(a.type || 'manual')} · ${credit ? 'crédito' : 'encargo'}${posted ? ' · lançamento criado' : ''}</small></span><span class="font-mono ${credit ? 'text-success' : ''}">${credit ? '-' : '+'}${Utils.formatMoney(a.amount)} <button data-action="editInvoiceAdjustment" data-id="${Utils.escapeHTML(String(a.id))}" class="ml-2 text-brand-medium" title="Editar">✎</button><button data-action="deleteInvoiceAdjustment" data-id="${Utils.escapeHTML(String(a.id))}" class="ml-1 text-danger" title="Excluir">×</button>${posted ? '<span class="ml-2 text-success font-bold" aria-label="Lançamento criado">Lançamento criado</span>' : `<button data-action="createInvoiceAdjustmentTransaction" data-id="${Utils.escapeHTML(String(a.id))}" class="ml-2 px-2 py-1 rounded bg-brand-medium text-white text-[10px] font-bold">Criar lançamento</button>`}</span></div>`; }).join('') : '<p class="text-xs text-text-secondary py-2">Nenhum ajuste informado.</p>'}
                    <div class="mt-3 flex flex-wrap gap-2 items-end"><select id="invoice-adjustment-type" class="p-2 bg-bg border border-border rounded text-xs"><option value="interest">Juros</option><option value="fine">Multa</option><option value="fees">Taxas/tarifas</option><option value="iof">IOF</option><option value="missing_purchase">Compra ausente</option><option value="unrecognized_purchase">Compra não reconhecida</option><option value="refund">Reembolso/estorno</option><option value="manual">Ajuste manual</option></select><select id="invoice-adjustment-effect" class="p-2 bg-bg border border-border rounded text-xs"><option value="charge">Encargo / acréscimo</option><option value="credit">Crédito / abatimento</option></select><input id="invoice-adjustment-description" class="flex-1 min-w-[130px] p-2 bg-bg border border-border rounded text-xs" placeholder="Descrição"/><input id="invoice-adjustment-amount" type="number" min="0" step="0.01" class="w-24 p-2 bg-bg border border-border rounded text-xs font-mono" placeholder="Valor"/><button data-action="saveInvoiceAdjustment" class="px-3 py-2 rounded bg-brand-medium text-white text-xs font-bold">Adicionar</button></div>
                </div>
            </div>
        </div>
        `;
    },

    invoiceAdjustmentsReview: (adjustments) => {
        const typeLabels = { interest: 'Juros', fine: 'Multa', fees: 'Taxas/tarifas', iof: 'IOF', missing_purchase: 'Compra ausente', refund: 'Reembolso/estorno', manual: 'Ajuste manual' };
        return `<div class="p-6">
            <div class="flex items-start justify-between gap-3 mb-4"><div><p class="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Revisão em lote</p><h3 class="text-lg font-bold text-text-primary font-primary">Lançamentos pendentes</h3><p class="text-xs text-text-secondary mt-1">Confira cada item antes de confirmar. Nada será lançado automaticamente.</p></div><button data-action="closeInvoiceAdjustmentsReview" class="w-8 h-8 text-text-secondary hover:text-text-primary" aria-label="Voltar"><i class="fa-solid fa-xmark"></i></button></div>
            <div class="space-y-2 max-h-[48vh] overflow-y-auto pr-1">${adjustments.map(a => { const credit = a.effect === 'credit' || a.sign === -1; return `<div class="rounded-lg border border-border bg-bg p-3 text-xs"><div class="flex justify-between gap-3"><strong class="text-text-primary">${Utils.escapeHTML(typeLabels[a.type] || a.type || 'Ajuste')}</strong><strong class="font-mono ${credit ? 'text-success' : 'text-danger'}">${credit ? '-' : '+'}${Utils.formatMoney(a.amount)}</strong></div><p class="text-text-primary mt-1">${Utils.escapeHTML(a.description || 'Ajuste de fatura')}</p><p class="text-text-secondary mt-1">Efeito: ${credit ? 'crédito/abatimento' : 'encargo/acréscimo'}</p></div>`; }).join('')}</div>
            <p class="mt-4 text-[10px] text-text-secondary">A confirmação cria um lançamento por ajuste, vinculado à conciliação. Itens já criados serão ignorados sem duplicar.</p>
            <div class="flex gap-2 mt-4 pt-4 border-t border-border"><button data-action="closeInvoiceAdjustmentsReview" class="flex-1 py-2.5 bg-bg border border-border text-text-secondary text-xs font-bold rounded-lg">Cancelar</button><button data-action="confirmInvoiceAdjustmentsBulk" class="flex-1 py-2.5 bg-brand-medium text-white text-xs font-bold rounded-lg">Confirmar ${adjustments.length} lançamento${adjustments.length === 1 ? '' : 's'}</button></div>
        </div>`;
    },

    agendamentosPage: (db, state) => {
        const hoje = new Date();
        const dataInicioMes = new Date(state.budgetYear, state.budgetMonth, 1);
        const dataFimMes = new Date(state.budgetYear, state.budgetMonth + 1, 0, 23, 59, 59);

        const contasFiltradas = db.agendamentos.filter(a => {
            const dataVenc = new Date(a.dataVencimento + 'T12:00:00');
            return dataVenc >= dataInicioMes && dataVenc <= dataFimMes;
        }).sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento));

        let totalPendente = 0;
        let totalPago = 0;
        let totalVencido = 0;

        contasFiltradas.forEach(a => {
            const v = new Date(a.dataVencimento + 'T12:00:00');
            if (a.status === 'pago') {
                totalPago += a.valor;
            } else if (a.status === 'pendente' && v < hoje && v.getDate() !== hoje.getDate()) {
                totalVencido += a.valor;
            } else {
                totalPendente += a.valor;
            }
        });

        const mesesStr = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const mesAtualNome = mesesStr[state.budgetMonth];

        const getCategoryInfo = (catName) => {
            if (catName === 'Fatura Cartão') return { icone: 'fa-credit-card', cor: '#8b5cf6' };
            return CoreComponents._getCategoryConfig(catName);
        };

        const listHtml = contasFiltradas.length === 0 ? `
            <div class="p-8 text-center text-text-secondary border-t border-border">
                <i class="fa-solid fa-receipt text-4xl mb-3 opacity-30 block"></i>
                <p>Nenhuma conta para este mês</p>
            </div>
        ` : contasFiltradas.map(conta => {
            const catObj = getCategoryInfo(conta.categoria);
            const dataVenc = new Date(conta.dataVencimento + 'T12:00:00');
            const isOverdue = conta.status === 'pendente' && dataVenc < hoje && dataVenc.getDate() !== hoje.getDate();
            
            let badgeClass = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            let badgeText = 'Pendente';
            
            if (conta.status === 'pago') {
                badgeClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
                badgeText = 'Paga';
            } else if (isOverdue) {
                badgeClass = 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
                badgeText = 'Vencida';
            }

            return `
            <div data-key="${conta.id}" class="p-4 flex items-center gap-4 hover:bg-bg transition-colors border-t border-border first:border-0 group">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center border border-border" style="background-color: ${catObj.cor}20">
                    <i class="fa-solid ${catObj.icone}" style="color: ${catObj.cor}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-text-primary truncate font-primary">${Utils.escapeHTML(conta.desc)}</p>
                    <p class="text-sm text-text-secondary">Vence a ${dataVenc.toLocaleDateString('pt-BR')}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold text-text-primary font-mono">${Utils.formatMoney(conta.valor)}</p>
                    <span class="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${badgeClass}">
                        ${badgeText}
                    </span>
                </div>
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${conta.status !== 'pago' ? `
                    <button onclick="App.markAgendamentoPaid('${conta.id}')" class="w-8 h-8 rounded-lg flex items-center justify-center text-success border border-border hover:bg-success/10 transition-colors" title="Marcar como Paga">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    ` : ''}
                    ${conta.categoria !== 'Fatura Cartão' ? `
                    <button data-action="delete" data-col="agendamentos" data-id="${conta.id}" class="w-8 h-8 rounded-lg flex items-center justify-center text-danger border border-transparent hover:border-border hover:bg-danger/10 transition-colors" title="Excluir">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    ` : ''}
                </div>
            </div>`;
        }).join('');

        return `
        <div class="flex items-center justify-center gap-8 mb-8">
            <button data-action="changeMonth" data-type="budget" data-dir="-1" class="w-8 h-8 rounded-full hover:bg-bg flex items-center justify-center text-text-secondary transition-colors border border-transparent hover:border-border"><i class="fa-solid fa-chevron-left text-sm"></i></button>
            <span class="text-lg font-bold text-text-primary w-48 text-center capitalize font-primary">${mesAtualNome} de ${state.budgetYear}</span>
            <button data-action="changeMonth" data-type="budget" data-dir="1" class="w-8 h-8 rounded-full hover:bg-bg flex items-center justify-center text-text-secondary transition-colors border border-transparent hover:border-border"><i class="fa-solid fa-chevron-right text-sm"></i></button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-amber-50 dark:bg-amber-900/10 rounded-[16px] p-5 border border-amber-100 dark:border-amber-900/30">
                <div class="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-2">
                    <i class="fa-regular fa-clock"></i>
                    <span class="text-sm font-bold uppercase tracking-wider">Pendentes</span>
                </div>
                <p class="text-2xl font-bold text-amber-700 dark:text-amber-400 font-mono">${Utils.formatMoney(totalPendente)}</p>
            </div>
            <div class="bg-emerald-50 dark:bg-emerald-900/10 rounded-[16px] p-5 border border-emerald-100 dark:border-emerald-900/30">
                <div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 mb-2">
                    <i class="fa-solid fa-check"></i>
                    <span class="text-sm font-bold uppercase tracking-wider">Pagas</span>
                </div>
                <p class="text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">${Utils.formatMoney(totalPago)}</p>
            </div>
            <div class="bg-rose-50 dark:bg-rose-900/10 rounded-[16px] p-5 border border-rose-100 dark:border-rose-900/30">
                <div class="flex items-center gap-2 text-rose-600 dark:text-rose-500 mb-2">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <span class="text-sm font-bold uppercase tracking-wider">Vencidas</span>
                </div>
                <p class="text-2xl font-bold text-rose-700 dark:text-rose-400 font-mono">${Utils.formatMoney(totalVencido)}</p>
            </div>
        </div>

        <div class="bg-surface rounded-[16px] border border-border shadow-soft overflow-hidden">
            <div class="p-5 border-b border-border">
                <h3 class="font-bold text-text-primary font-primary">Contas do Mês</h3>
            </div>
            <div class="divide-y divide-border">
                ${listHtml}
            </div>
        </div>
        `;
    },

    goalsPage: (metas, transacoes, options = {}) => {
        const readOnly = options.readOnly === true;
        const hoje = new Date(); 
        const tresMesesAtras = new Date(); 
        tresMesesAtras.setMonth(hoje.getMonth() - 3);
        const transacoesRecentes = transacoes.filter(t => t.id >= tresMesesAtras.getTime()); 
        const receitas = transacoesRecentes.filter(t => !t.transferenciaInterna && t.tipo === 'receita' && !t.transferenciaInterna).reduce((a,b) => a+b.valor, 0); 
        const despesas = transacoesRecentes.filter(t => !t.transferenciaInterna && t.tipo === 'despesa' && !t.transferenciaInterna).reduce((a,b) => a+b.valor, 0);
        const mediaPoupanca = (receitas - despesas) / 3; 
        const capacidadeFormatada = mediaPoupanca > 0 ? Utils.formatMoney(mediaPoupanca) : "R$ 0,00";

        const emptyState = `
            <div class="text-center py-16 px-6 bg-surface rounded-[16px] border border-border shadow-soft flex flex-col items-center justify-center col-span-1 md:col-span-2">
                <div class="w-20 h-20 bg-bg text-investment rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner border border-border">
                    <i class="fa-solid fa-bullseye"></i>
                </div>
                <h4 class="font-bold text-text-primary text-lg mb-2 font-primary">Sem metas definidas</h4>
                <p class="text-sm text-text-secondary mb-6 max-w-sm">Criar metas ajuda a dar propósito às suas economias.</p>
                ${readOnly ? '' : '<button data-action="openModal" data-modal="modal-meta" class="bg-brand-medium hover:bg-brand-dark text-white px-6 py-2.5 rounded-[12px] font-bold shadow-soft transition-all hover:-translate-y-0.5">Criar Nova Meta</button>'}
            </div>
        `;

        const metasHtml = metas.length === 0 ? emptyState : metas.map(m => CoreComponents._buildGoalCard(m, hoje, { readOnly })).join('');

        return `
            <div class="rounded-[16px] p-8 mb-10 shadow-soft text-white relative overflow-hidden" style="background: linear-gradient(135deg, var(--c-brand-deep) 0%, var(--c-brand-dark) 100%);"><div class="relative z-10"><div class="flex items-center gap-3 mb-2"><div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm"><i class="fa-solid fa-wallet"></i></div><span class="font-bold text-sm opacity-90 tracking-wide font-primary">Capacidade de Poupança</span></div><h3 class="text-4xl font-bold mb-1 font-mono">${capacidadeFormatada}</h3><p class="text-sm opacity-80">média mensal calculada dos últimos 3 meses</p></div><div class="absolute -right-10 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div></div>
            <h3 class="font-bold text-text-primary text-lg mb-6 tracking-tight font-primary">Metas Ativas</h3><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">${metasHtml}</div>`;
    },

    budgetSummary: (orcamentos, transacoes, state = {}) => {
        const now = new Date();
        const anoSelecionado = state.budgetYear ?? now.getFullYear();
        const mesSelecionado = state.budgetMonth ?? now.getMonth();
        const orcamentosDoMes = (orcamentos || []).filter(o => o.ano == null || (Number(o.ano) === Number(anoSelecionado) && Number(o.mes) === Number(mesSelecionado)));
        const gastosPorCat = {};
        const transacoesMes = Database.getTransacoesPorMes(anoSelecionado, mesSelecionado);
        transacoesMes.filter(t => t.tipo === 'despesa' && !t.transferenciaInterna).forEach(t => {
            const categoria = t.categoria || 'Outros';
            gastosPorCat[categoria] = (gastosPorCat[categoria] || 0) + (Number(t.valor) || 0);
        });
        const totalOrcado = orcamentosDoMes.reduce((total, item) => total + (Number(item.limite) || 0), 0);
        const totalGastoMes = Object.values(gastosPorCat).reduce((total, value) => total + value, 0);
        return {
            ano: Number(anoSelecionado),
            mes: Number(mesSelecionado),
            orcamentos: orcamentosDoMes,
            gastosPorCat,
            totalOrcado,
            totalGastoMes,
            disponivelGeral: totalOrcado - totalGastoMes
        };
    },

    budgetView: (orcamentos, transacoes, state = {}, options = {}) => {
        const readOnly = options.readOnly === true;
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const resumo = PageComponents.budgetSummary(orcamentos, transacoes, state);
        const { ano: anoSelecionado, mes: mesSelecionado, orcamentos: orcamentosDoMes, gastosPorCat, totalOrcado, totalGastoMes, disponivelGeral } = resumo;
        const mesAtualNome = meses[mesSelecionado];

        const listHTML = orcamentosDoMes.map(o => {
            const gasto = gastosPorCat[o.categoria] || 0;
            return CoreComponents._buildBudgetCard(o, gasto, { readOnly });
        }).join('');

        const emptyState = `
            <div class="text-center py-16 px-6 bg-surface rounded-[16px] border border-border shadow-soft flex flex-col items-center justify-center">
                <div class="w-20 h-20 bg-bg text-brand-soft border border-border rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
                    <i class="fa-solid fa-chart-pie"></i>
                </div>
                <h4 class="font-bold text-text-primary text-lg mb-2 font-primary">Sem limites definidos</h4>
                <p class="text-sm text-text-secondary mb-6 max-w-sm">Estabelecer orçamentos ajuda a manter o controle.</p>
                ${readOnly ? '' : '<button data-action="openModal" data-modal="modal-orcamento" class="bg-brand-medium hover:bg-brand-dark text-white px-6 py-2.5 rounded-[12px] font-bold shadow-soft transition-all hover:-translate-y-0.5">Definir Orçamento</button>'}
            </div>
        `;

        return `
        <div class="flex items-center justify-center gap-8 mb-10">${readOnly ? '' : '<button data-action="changeMonth" data-type="budget" data-dir="-1" class="w-8 h-8 rounded-full hover:bg-bg border border-border flex items-center justify-center text-text-secondary transition-colors" aria-label="Mês anterior"><i class="fa-solid fa-chevron-left"></i></button>'}<span class="text-lg font-bold text-text-primary min-w-[180px] text-center capitalize font-primary">${mesAtualNome} de ${anoSelecionado}</span>${readOnly ? '' : '<button data-action="changeMonth" data-type="budget" data-dir="1" class="w-8 h-8 rounded-full hover:bg-bg border border-border flex items-center justify-center text-text-secondary transition-colors" aria-label="Próximo mês"><i class="fa-solid fa-chevron-right"></i></button>'}</div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"><div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft hover:-translate-y-1 transition-transform"><p class="text-xs font-bold text-text-secondary uppercase mb-2">Orçamento Total</p><h3 class="text-2xl font-bold text-text-primary font-mono">${Utils.formatMoney(totalOrcado)}</h3></div><div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft hover:-translate-y-1 transition-transform"><p class="text-xs font-bold text-text-secondary uppercase mb-2">Total Gasto</p><h3 class="text-2xl font-bold text-text-primary font-mono">${Utils.formatMoney(totalGastoMes)}</h3></div><div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft hover:-translate-y-1 transition-transform"><p class="text-xs font-bold text-text-secondary uppercase mb-2">Disponível</p><h3 class="text-2xl font-bold text-text-primary font-mono">${Utils.formatMoney(disponivelGeral)}</h3></div></div>
        <div>${orcamentosDoMes.length > 0 ? listHTML : emptyState}</div>`;
    }, 

    settingsPage: (db) => {
        return `
        <div class="grid grid-cols-1 gap-8 mb-8">
            <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft">
                <h3 class="font-bold text-text-primary text-lg mb-4 font-primary">Meu Perfil</h3>
                <form data-submit="usuario" class="flex flex-col gap-4 max-w-xl">
                    <div class="flex gap-4 items-center mb-2">
                        <img src="${db.usuario?.fotoUrl || 'assets/perfil.svg'}" id="preview-foto-perfil" class="w-16 h-16 rounded-full object-cover border-2 border-border shadow-sm">
                        <div>
                            <input type="file" id="input-foto-perfil" accept="image/*" class="hidden" data-change="processarFotoPerfil">
                            <button type="button" onclick="document.getElementById('input-foto-perfil').click()" class="bg-bg text-text-primary px-4 py-2 rounded-[12px] text-xs font-bold hover:bg-border transition-colors border border-border shadow-sm"><i class="fa-solid fa-camera mr-2"></i>Alterar Foto</button>
                            <p class="text-[10px] text-text-secondary mt-2">Formatos: JPG, PNG. Máx: 2MB.</p>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Nome de Exibição</label>
                        <input type="text" id="input-usuario-nome" value="${Utils.escapeHTML(db.usuario?.nome || 'Usuário')}" required class="w-full p-3 bg-surface text-text-primary border border-border rounded-[12px] text-sm focus:outline-none focus:border-brand-medium transition-colors">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Subtítulo / Cargo</label>
                        <input type="text" id="input-usuario-subtitulo" value="${Utils.escapeHTML(db.usuario?.subtitulo || '')}" class="w-full p-3 bg-surface text-text-primary border border-border rounded-[12px] text-sm focus:outline-none focus:border-brand-medium transition-colors">
                    </div>
                    
                    <div class="mt-4 border-t border-border pt-4">
                        <h4 class="text-sm font-bold text-text-primary mb-3">Dados para Mentoria (Anora)</h4>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Objetivo Principal</label>
                                <input type="text" id="input-usuario-objetivoPrincipal" value="${Utils.escapeHTML(db.usuario?.objetivoPrincipal || '')}" placeholder="Ex: Viajar, Fundo de Reserva..." class="w-full p-3 bg-surface text-text-primary border border-border rounded-[12px] text-sm focus:outline-none focus:border-brand-medium transition-colors">
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Renda Mensal Média (R$)</label>
                                    <input type="number" step="0.01" id="input-usuario-rendaMensalMedia" value="${db.usuario?.rendaMensalMedia || ''}" placeholder="0.00" class="w-full p-3 bg-surface text-text-primary border border-border rounded-[12px] text-sm focus:outline-none focus:border-brand-medium transition-colors font-mono">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Limite Cartão Global (R$)</label>
                                    <input type="number" step="0.01" id="input-usuario-limiteCartaoGlobal" value="${db.usuario?.limiteCartaoGlobal || ''}" placeholder="0.00" class="w-full p-3 bg-surface text-text-primary border border-border rounded-[12px] text-sm focus:outline-none focus:border-brand-medium transition-colors font-mono">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <button type="submit" class="w-full bg-brand-medium text-white px-5 py-3 mt-2 rounded-[12px] font-bold text-sm hover:bg-brand-dark transition-colors shadow-soft hover:-translate-y-0.5"><i class="fa-solid fa-floppy-disk mr-2"></i> Salvar Perfil</button>
                </form>
            </div>

            <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft h-fit">
                <h3 class="font-bold text-text-primary text-lg mb-4 font-primary">Sobre o Sistema</h3>
                <div class="space-y-4">
                    <div class="flex items-center gap-4 p-4 bg-bg rounded-[12px] border border-border hover:-translate-y-0.5 transition-transform">
                        <div class="w-12 h-12 bg-surface rounded-[12px] flex items-center justify-center text-text-primary shadow-sm text-xl border border-border"><i class="fa-solid fa-shield-halved"></i></div>
                        <div>
                            <h4 class="font-bold text-text-primary">Offline-First Funcional</h4>
                            <p class="text-xs text-text-secondary mt-1">Os seus dados ficam salvos apenas neste navegador, garantindo total privacidade e velocidade.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }
};