import { Utils } from './utils.js';
import { parseLocalDate } from './util-date.js';
import { db, Database } from './db.js';
import { Components } from './components.js';
import { MentorEngine } from './mentorEngine.js';
import { UIRenderer } from './rnd-ui.js';
import { FinancialAnalytics } from './analytics.js';
import { calculatePeriodTotals, isTransfer } from './financial-ledger.js';
import { projectionSourcesFromDatabase, getLastUpdatedIndicator, financialValueClass, calculateSpendableAmount } from './financial-refinements.js';
import { cashflowProjectionFromDatabase } from './cashflow-projection.js';
import { PRIORITY_KEYS, resolvePriority } from './priority.js';
import { renderTransactionTypeMenu } from './transaction-type-menu.js';

export const settingsGroups = [
    { id: 'profile', title: 'Perfil', description: 'Dados e preferências pessoais.', icon: 'fa-user', items: ['Nome', 'Moeda', 'Preferências pessoais'] },
    { id: 'appearance', title: 'Aparência', description: 'Tema e preferências visuais.', icon: 'fa-palette', items: ['Tema claro ou escuro', 'Redução de movimento'] },
    { id: 'data', title: 'Dados', description: 'Importação, exportação e recuperação.', icon: 'fa-database', items: ['Exportar backup', 'Importar backup', 'Importar CSV/OFX'] },
    { id: 'security', title: 'Segurança', description: 'Proteção local e ações sensíveis.', icon: 'fa-shield-halved', items: ['Proteção local', 'Confirmação de exclusão', 'Limpeza de dados'] },
    { id: 'anora', title: 'Anora', description: 'Preferências da IA financeira.', icon: 'fa-sparkles', items: ['Estilo de recomendação', 'Alertas', 'Telemetria local'] },
];

// Shared page header renderer. Actions are described as data rather than raw
// HTML so labels and attribute values remain escaped at the boundary.
export const renderPageHeader = ({ eyebrow = '', title = '', subtitle = '', actions = [], className = '', stylePrefix = '' } = {}) => {
    const escape = value => Utils.escapeHTML(value == null ? '' : String(value));
    const safeClassName = escape(className);
    const safePrefix = escape(stylePrefix);
    const prefixed = suffix => safePrefix ? ` ${safePrefix}-${suffix}` : '';
    const allowedAttribute = name => /^(?:data-[a-z0-9-]+|aria-[a-z0-9-]+|title|id)$/.test(String(name).toLowerCase());
    const attributes = attrs => Object.entries(attrs || {})
        .filter(([name, value]) => allowedAttribute(name) && value !== null && value !== undefined)
        .map(([name, value]) => ` ${name}="${escape(value)}"`)
        .join('');
    const actionHtml = (Array.isArray(actions) ? actions : []).map(action => {
        if (action?.type === 'transaction-type-selector') {
            return renderTransactionTypeMenu({
                id: action.menuId,
                variant: 'transactions',
                label: action.label,
                ariaLabel: action.ariaLabel
            });
        }
        const variant = action?.variant === 'primary' ? 'primary' : 'secondary';
        const label = escape(action?.label);
        const icon = escape(action?.icon);
        const actionAttributes = { ...(action?.attributes || {}) };
        const hasAttribute = name => Object.keys(actionAttributes).some(attributeName => attributeName.toLowerCase() === name);
        // Keep caller-provided attributes intact. In particular, do not emit a
        // second aria-label when a custom accessible name was supplied.
        if (action?.action && !hasAttribute('data-action')) actionAttributes['data-action'] = action.action;
        const actionLabel = action?.ariaLabel || action?.label || '';
        if (!hasAttribute('aria-label')) actionAttributes['aria-label'] = actionLabel;
        return `<button type="button"${attributes(actionAttributes)} class="nv-page-header__action is-${variant}${prefixed(`${variant}-action`)}"><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${label}</span></button>`;
    }).join('');

    return `<header class="nv-page-header${safeClassName ? ` ${safeClassName}` : ''}"><div class="nv-page-header__copy"><p class="nv-page-header__eyebrow${prefixed('eyebrow')}">${escape(eyebrow)}</p><h1>${escape(title)}</h1><p class="nv-page-header__subtitle${prefixed('page-subtitle')}">${escape(subtitle)}</p></div><div class="nv-page-header__actions${prefixed('page-actions')}">${actionHtml}</div></header>`;
};

export const getDashboardQuickAction = (atual = {}, context = {}) => {
    const selection = resolvePriority({ ...atual, ...context });
    if (selection.priority === PRIORITY_KEYS.OVERDUE) return {
        label: 'Regularizar pendências', icon: 'fa-calendar-check', action: 'navigate', payload: 'Agendamentos', ariaLabel: 'Regularizar pendências na agenda'
    };
    if (selection.priority === PRIORITY_KEYS.NEGATIVE_BALANCE) return {
        label: 'Registrar receita', icon: 'fa-arrow-trend-up', action: 'openModal', modal: 'modal-transacao', type: 'receita', ariaLabel: 'Registrar receita para recompor o saldo'
    };
    if (selection.priority === PRIORITY_KEYS.OVER_BUDGET) return {
        label: 'Revisar orçamento', icon: 'fa-chart-pie', action: 'navigate', payload: 'Orcamento', ariaLabel: 'Revisar orçamento ultrapassado'
    };
    if (selection.priority === PRIORITY_KEYS.HIGH_CARD_USAGE) return {
        label: 'Revisar cartões', icon: 'fa-credit-card', action: 'navigate', payload: 'Contas', ariaLabel: 'Revisar uso dos cartões'
    };
    if (selection.priority === PRIORITY_KEYS.ANORA_RECOMMENDATION) {
        const candidate = selection.anoraRecommendation;
        return {
            ...candidate,
            label: candidate.label || 'Ver recomendação',
            icon: candidate.icon || 'fa-sparkles',
            ariaLabel: candidate.ariaLabel || candidate.label || 'Ver recomendação da Anora'
        };
    }
    if (selection.priority === PRIORITY_KEYS.INFORMATIONAL) return {
        label: 'Ver próximos vencimentos', icon: 'fa-calendar-day', action: 'navigate', payload: 'Agendamentos', ariaLabel: 'Ver próximos vencimentos na agenda'
    };
    return { label: 'Novo lançamento', icon: 'fa-plus', action: 'openTypeSelector', ariaLabel: 'Novo lançamento: escolher tipo' };
};

export const PageRenderers = {
    Dashboard: (appState) => {
        const hora = new Date().getHours();
        let saudacao = 'Boa noite';
        if (hora >= 5 && hora < 12) saudacao = 'Bom dia';
        else if (hora >= 12 && hora < 18) saudacao = 'Boa tarde';
        
        const dadosAnora = MentorEngine.extrairDadosParaAnora(db, Database);
        const resultadoMentoria = MentorEngine.calculateMentorScore(dadosAnora);
        const hojeInsight = new Date();
        const insightsFinanceiros = FinancialAnalytics.insights(db.transacoes, hojeInsight.getFullYear(), hojeInsight.getMonth());

        const historicoContainer = document.getElementById('lista-historico-anora');
        if (historicoContainer && !resultadoMentoria.isOnboarding) {
            const dataAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            historicoContainer.innerHTML = `
                <div class="p-4 bg-surface border border-border rounded-[12px] relative overflow-hidden shadow-sm hover:-translate-y-0.5 transition-transform">
                    <div class="absolute top-0 left-0 w-1 h-full bg-brand-medium"></div>
                    <div class="flex justify-between items-center mb-3">
                        <p class="text-[10px] font-bold text-text-secondary uppercase tracking-wider capitalize">${dataAtual}</p>
                        <span class="text-[10px] font-bold bg-bg px-2 py-0.5 rounded border border-border text-text-primary">Score: ${resultadoMentoria.score}</span>
                    </div>
                    <div class="space-y-2 mt-2">
                        ${resultadoMentoria.insights.map(insight => `
                            <div class="flex gap-2 items-start">
                                <i class="fa-solid fa-angle-right text-brand-medium mt-0.5 text-[10px]"></i>
                                <p class="text-xs text-text-primary leading-relaxed font-medium">${Utils.escapeHTML(insight)}</p>
                            </div>
                        `).join('')}
                    </div>
                    <div class="mt-3 pt-3 border-t border-border">
                        <p class="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Diretriz Executiva</p>
                        <p class="text-xs font-bold text-text-primary font-mentor italic">"${Utils.escapeHTML(resultadoMentoria.recommendation)}"</p>
                    </div>
                    ${insightsFinanceiros.length ? `<div class="mt-3 pt-3 border-t border-border"><p class="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Insights financeiros</p>${insightsFinanceiros.slice(0, 2).map(insight => `<p class="text-xs text-text-primary leading-relaxed py-1"><i class="fa-solid fa-lightbulb text-warning mr-1"></i>${Utils.escapeHTML(insight)}</p>`).join('')}</div>` : ''}
                </div>
            `;
        }

        const saldoAtualGlobal = Database.getTotals().saldo;
        const projecaoFimMes = projectionSourcesFromDatabase(db, undefined, saldoAtualGlobal);
        const freshness = getLastUpdatedIndicator(Database.getLastUpdated());
        const requestedDashboardPeriod = typeof appState?.dashboardPeriod === 'string' ? appState.dashboardPeriod : 'este_ano';
        const dashboardPeriodLabels = {
            este_mes: 'Este mês',
            mes_passado: 'Mês passado',
            trimestre: 'Trimestre',
            este_ano: 'Este ano'
        };
        const dashboardPeriodIsDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDashboardPeriod);
        let dashboardPeriodLabel = dashboardPeriodLabels[requestedDashboardPeriod] || dashboardPeriodLabels.este_ano;
        if (dashboardPeriodIsDate) {
            const selectedDate = new Date(`${requestedDashboardPeriod}T12:00:00`);
            if (!Number.isNaN(selectedDate.getTime())) {
                dashboardPeriodLabel = selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
            }
        }
        const escapedDashboardPeriodLabel = Utils.escapeHTML(dashboardPeriodLabel);
        let insightMsg = 'Visão funcional e clara dos seus dados.';
        if(saldoAtualGlobal > 0) insightMsg = 'O seu saldo global está positivo.';
        else if (saldoAtualGlobal < 0) insightMsg = 'Atenção estratégica: O fluxo atual encontra-se negativo.';

        
        let dateStart, dateEnd;
        let prevDateStart, prevDateEnd;
        const targetYear = new Date().getFullYear();
        const targetMonth = new Date().getMonth();
        
        if (requestedDashboardPeriod === 'este_mes') {
            dateStart = new Date(targetYear, targetMonth, 1);
            dateEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
            prevDateStart = new Date(targetYear, targetMonth - 1, 1);
            prevDateEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);
        } else if (requestedDashboardPeriod === 'mes_passado') {
            dateStart = new Date(targetYear, targetMonth - 1, 1);
            dateEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);
            prevDateStart = new Date(targetYear, targetMonth - 2, 1);
            prevDateEnd = new Date(targetYear, targetMonth - 1, 0, 23, 59, 59);
        } else if (requestedDashboardPeriod === 'trimestre') {
            dateStart = new Date(targetYear, targetMonth - 2, 1);
            dateEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
            prevDateStart = new Date(targetYear, targetMonth - 5, 1);
            prevDateEnd = new Date(targetYear, targetMonth - 2, 0, 23, 59, 59);
        } else if (requestedDashboardPeriod === 'este_ano') {
            dateStart = new Date(targetYear, 0, 1);
            dateEnd = new Date(targetYear, 11, 31, 23, 59, 59);
            prevDateStart = new Date(targetYear - 1, 0, 1);
            prevDateEnd = new Date(targetYear - 1, 11, 31, 23, 59, 59);
        } else if (dashboardPeriodIsDate) {
            const parts = requestedDashboardPeriod.split('-');
            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]) - 1;
            const d = parseInt(parts[2]);
            dateStart = new Date(y, m, d, 0, 0, 0);
            dateEnd = new Date(y, m, d, 23, 59, 59);
            
            const prev = new Date(y, m, d - 1);
            prevDateStart = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate(), 0, 0, 0);
            prevDateEnd = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate(), 23, 59, 59);
        } else {
            // Unknown values intentionally fall back to the current year's view;
            // this keeps the period semantics deterministic for stale/local data.
            dateStart = new Date(targetYear, 0, 1);
            dateEnd = new Date(targetYear, 11, 31, 23, 59, 59);
            prevDateStart = new Date(targetYear - 1, 0, 1);
            prevDateEnd = new Date(targetYear - 1, 11, 31, 23, 59, 59);
        }

        const transacoesPeriodoAtual = db.transacoes.filter(t => {
            const d = parseLocalDate(t.data || t.id);
            return d && d >= dateStart && d <= dateEnd;
        });
        const transacoesAnteriores = db.transacoes.filter(t => {
            const d = parseLocalDate(t.data || t.id);
            return d && d >= prevDateStart && d <= prevDateEnd;
        });

        const hojeObj = new Date();
        const inicioDoDiaAtual = new Date(hojeObj.getFullYear(), hojeObj.getMonth(), hojeObj.getDate());
        const fimDoMesAtual = new Date(hojeObj.getFullYear(), hojeObj.getMonth() + 1, 0, 23, 59, 59);
        const isValidAgendaDate = value => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
            const parsed = new Date(`${value}T12:00:00`);
            return !Number.isNaN(parsed.getTime()) && parsed.getFullYear() === Number(String(value).slice(0, 4)) && parsed.getMonth() + 1 === Number(String(value).slice(5, 7)) && parsed.getDate() === Number(String(value).slice(8, 10));
        };
        const agendamentosPendentesDespesas = (db.agendamentos || []).filter(a => a.status === 'pendente' && a.tipo !== 'receita' && isValidAgendaDate(a.dataVencimento));
        const contasAtrasadas = agendamentosPendentesDespesas.filter(a => new Date(`${a.dataVencimento}T12:00:00`) < inicioDoDiaAtual);
        const proximosVencimentos = agendamentosPendentesDespesas.filter(a => {
            const dtVenc = new Date(`${a.dataVencimento}T12:00:00`);
            return dtVenc >= inicioDoDiaAtual && dtVenc <= fimDoMesAtual;
        });
        // Keep this metric's established semantics: only pending expenses due today
        // through month-end contribute to the summary; overdue accounts stay visible
        // in the attention strip and Agenda instead.
        const contasPendentesMes = proximosVencimentos.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
        const orcamentoDashboard = Components.budgetSummary(db.orcamentos || [], db.transacoes || [], {
            budgetYear: hojeObj.getFullYear(),
            budgetMonth: hojeObj.getMonth()
        });
        const budgetExceeded = (orcamentoDashboard.orcamentos || []).some(item =>
            (Number(orcamentoDashboard.gastosPorCat?.[item.categoria]) || 0) > (Number(item.limite) || 0)
        );
        // Anora exposes one existing, navigable decision only. The data types
        // are already present in the dashboard: overdue agenda items first,
        // then an exceeded budget, with Dashboard as a safe fallback.
        resultadoMentoria.actionableAction = contasAtrasadas.length
            ? { action: 'navigate', payload: 'Agendamentos', label: 'Regularizar pendências' }
            : budgetExceeded
                ? { action: 'navigate', payload: 'Planejamento', label: 'Revisar orçamento' }
                : { action: 'navigate', payload: 'Dashboard', label: 'Voltar à visão geral' };
        
        const totaisPeriodoAtual = calculatePeriodTotals(transacoesPeriodoAtual);
        const atual = {
            receitas: totaisPeriodoAtual.income,
            despesas: totaisPeriodoAtual.expense,
            saldo: Database.getTotals().saldo,
            projecaoFimMes,
            contasPendentes: contasPendentesMes,
            contasAtrasadas,
            proximosVencimentos
        };
        const priorityContext = {
            saldoGlobal: saldoAtualGlobal,
            orcamento: orcamentoDashboard,
            cartoes: db.cartoes || [],
            comprasCartao: db.comprasCartao || [],
            anoraRecommendation: resultadoMentoria.isOnboarding ? null : (resultadoMentoria.onboardingAction || resultadoMentoria.actionableAction)
        };
        const nextDecision = Components.nextDecision(atual, priorityContext);
        const quickAction = getDashboardQuickAction(atual, priorityContext);
        const quickActionAttributes = quickAction.action === 'navigate'
            ? `data-action="navigate" data-payload="${Utils.escapeHTML(quickAction.payload)}"`
            : quickAction.action === 'openModal'
                ? `data-action="openModal" data-modal="${Utils.escapeHTML(quickAction.modal)}"${quickAction.type ? ` data-type="${Utils.escapeHTML(quickAction.type)}"` : ''}`
                : '';
        const quickActionHtml = quickAction.action === 'openTypeSelector'
            ? renderTransactionTypeMenu({ id: 'dashboard-new-menu', variant: 'dashboard' })
            : `<button type="button" ${quickActionAttributes} aria-label="${Utils.escapeHTML(quickAction.ariaLabel)}" class="nv-dashboard-primary-action"><i class="fa-solid ${Utils.escapeHTML(quickAction.icon)}" aria-hidden="true"></i><span>${Utils.escapeHTML(quickAction.label)}</span></button>`;
        // One desktop CTA owns the contextual decision. The existing mobile
        // speed dial remains the single type-selector menu when no decision is
        // urgent, avoiding two competing primary actions in the header.
        const actionsHtml = `
            ${quickActionHtml}
            <button type="button" data-action="iniciarFechamentoMes" class="nv-dashboard-secondary-action"><i class="fa-solid fa-flag-checkered" aria-hidden="true"></i> <span class="hidden sm:inline">Fechar mês</span></button>
            <button type="button" data-action="openModal" data-modal="modal-simulador" class="nv-dashboard-secondary-action"><i class="fa-solid fa-calculator" aria-hidden="true"></i> <span class="hidden sm:inline">Simular</span></button>
        `;
        
        const totaisPeriodoAnterior = calculatePeriodTotals(transacoesAnteriores);
        const anterior = {
            receitas: totaisPeriodoAnterior.income,
            despesas: totaisPeriodoAnterior.expense
        };

        const isSpecificDate = dashboardPeriodIsDate;
        const dateValue = isSpecificDate ? requestedDashboardPeriod : '';

        const filterHtml = `
        <div class="nv-dashboard-filter flex gap-2 border-b border-border pb-4 overflow-x-auto items-center w-full xl:w-auto" aria-label="Período do resumo financeiro">
            <button data-action="setDashboardPeriod" data-payload="este_mes" class="nv-dashboard-filter__option ${appState.dashboardPeriod === 'este_mes' ? 'is-active' : ''}">Este mês</button>
            <button data-action="setDashboardPeriod" data-payload="mes_passado" class="nv-dashboard-filter__option ${appState.dashboardPeriod === 'mes_passado' ? 'is-active' : ''}">Mês passado</button>
            <button data-action="setDashboardPeriod" data-payload="trimestre" class="nv-dashboard-filter__option ${appState.dashboardPeriod === 'trimestre' ? 'is-active' : ''}">Trimestre</button>
            <button data-action="setDashboardPeriod" data-payload="este_ano" class="nv-dashboard-filter__option ${appState.dashboardPeriod === 'este_ano' ? 'is-active' : ''}">Este ano</button>

            <div class="ml-auto flex items-center gap-2">
                <span class="text-xs font-bold text-text-secondary uppercase tracking-wider hidden sm:block">Por dia:</span>
                <input type="date" data-change="setDashboardDate" value="${dateValue}" title="Escolher data específica" class="nv-dashboard-date px-4 py-2 text-text-primary text-sm font-bold bg-surface rounded-[12px] border border-border shadow-sm focus:outline-none focus:border-brand-medium cursor-pointer transition-all ${isSpecificDate ? 'is-active' : ''}">
            </div>
        </div>`;

        UIRenderer.updateDOM('main-content', `
            <div class="nv-dashboard-shell">
            <header class="nv-dashboard-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <p class="nv-dashboard-eyebrow">Visão geral</p>
                    <h2 class="text-2xl font-bold text-text-primary mb-1">${saudacao}!</h2>
                    <p class="text-text-secondary text-sm">${insightMsg}</p>
                    ${freshness ? `<span class="nv-data-freshness" title="${Utils.escapeHTML(freshness.title)}" aria-label="${Utils.escapeHTML(freshness.title)}"><i class="fa-regular fa-clock" aria-hidden="true"></i>${Utils.escapeHTML(freshness.relative)}</span>` : ''}
                </div>
                <div class="flex flex-wrap gap-3">
                    ${actionsHtml}
                </div>
            </header>

            ${filterHtml}
            ${Components.onboardingChecklist(db)}
            ${resultadoMentoria.isOnboarding ? '' : Components.insightsSection(resultadoMentoria)}

            <section class="nv-dashboard-financial mb-10" aria-label="Resultado financeiro do período">
                <div class="nv-dashboard-financial__header flex items-center justify-between gap-4 mb-5">
                    <div>
                        <p class="nv-dashboard-eyebrow">Visão de ${escapedDashboardPeriodLabel}</p>
                        <h3 class="font-bold text-text-primary text-xl tracking-tight flex items-center gap-2 font-primary">
                            <i class="fa-solid fa-scale-balanced text-success" aria-hidden="true"></i> Resultado financeiro
                        </h3>
                    </div>
                    <p class="nv-dashboard-financial__context">Saldo atual: <strong>${Utils.escapeHTML(Utils.formatMoney(saldoAtualGlobal))}</strong></p>
                </div>
                ${Components.dashboardCards(atual, anterior)}
            </section>

            ${Components.nextDecisionBlock(atual, priorityContext)}
            ${Components.attentionStrip(atual, {
                ...priorityContext,
                contasAtrasadas,
                proximosVencimentos,
                // The prioritized decision owns the winning narrative; do not
                // render a duplicate competing alert below it.
                excludePriority: nextDecision?.priority
            })}
            ${Components.dashboardAccounts(db.bancos || [], db.cartoes || [], db.comprasCartao || [])}
            ${resultadoMentoria.isOnboarding ? '' : Components.insightsSection(resultadoMentoria, priorityContext)}

            <div class="nv-dashboard-supporting grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                ${Components.dashboardAgenda(db.agendamentos || [], db.receitasFuturas || [], appState)}
                ${Components.dashboardCategories(transacoesPeriodoAtual, dashboardPeriodLabel)}
            </div>

            ${resultadoMentoria.isOnboarding ? '' : Components.dashboardPillars(resultadoMentoria.pillars)}
        </div>
        `);
        // Keep the mobile speed dial aligned with the same contextual CTA;
        // generic type options remain available only when no urgent decision
        // owns the quick action.
        const mobileContext = document.getElementById('speed-dial-contextual');
        const mobileMenu = document.getElementById('speed-dial-menu');
        if (mobileContext && mobileMenu) {
            const contextual = quickAction.action !== 'openTypeSelector';
            mobileContext.hidden = !contextual;
            mobileContext.setAttribute('aria-label', Utils.escapeHTML(quickAction.ariaLabel));
            mobileContext.dataset.action = contextual ? quickAction.action : '';
            if (quickAction.payload) mobileContext.dataset.payload = quickAction.payload;
            else delete mobileContext.dataset.payload;
            if (quickAction.modal) mobileContext.dataset.modal = quickAction.modal;
            else delete mobileContext.dataset.modal;
            if (quickAction.type) mobileContext.dataset.type = quickAction.type;
            else delete mobileContext.dataset.type;
            const mobileLabel = document.getElementById('speed-dial-contextual-label');
            const mobileIcon = document.getElementById('speed-dial-contextual-icon');
            if (mobileLabel) mobileLabel.textContent = quickAction.label;
            if (mobileIcon) mobileIcon.className = `fa-solid ${quickAction.icon}`;
            mobileMenu.querySelectorAll('button:not(#speed-dial-contextual)').forEach(button => { button.hidden = contextual; button.tabIndex = contextual ? -1 : 0; });
        }
    },
    Transacoes: (appState) => {
        const bancoPadraoId = db.bancos.length > 0 ? db.bancos[0].id : '';
        const f = appState.filters;
        let filtered = [...db.transacoes];

        if (f.desc) {
            const termoBusca = String(f.desc).toLowerCase();
            filtered = filtered.filter(t => {
                const descricao = String(t.desc || '').toLowerCase();
                const textoRef = t.codigoRef ? String(t.codigoRef).toLowerCase() : `tx-${String(t.id).substring(0, 8)}`;
                return descricao.includes(termoBusca) || textoRef.includes(termoBusca);
            });
        }
        if (f.categoria) filtered = filtered.filter(t => t.categoria === f.categoria);
        const isUncategorized = t => !String(t?.categoria || '').trim() || String(t.categoria).trim().toLocaleLowerCase('pt-BR') === 'sem categoria';
        if (f.tipo === 'transferencia') filtered = filtered.filter(isTransfer);
        else if (f.tipo) filtered = filtered.filter(t => t.tipo === f.tipo);
        if (f.dataInicio) filtered = filtered.filter(t => String(t.data || '') >= f.dataInicio);
        if (f.dataFim) filtered = filtered.filter(t => String(t.data || '') <= f.dataFim);
        if (f.mes !== '') filtered = filtered.filter(t => parseLocalDate(t.data || t.id)?.getMonth() === parseInt(f.mes, 10));
        if (f.bancoId) {
            const [type, id] = f.bancoId.split('_');
            if (type === 'banco') filtered = filtered.filter(t => !t.isCartao && t.bancoId == id);
            if (type === 'cartao') filtered = filtered.filter(t => t.isCartao && t.bancoId == id);
        }
        const uncategorizedCount = filtered.filter(isUncategorized).length;
        if (appState.uncategorizedOnly) filtered = filtered.filter(isUncategorized);
        filtered.sort((a, b) => (parseLocalDate(b.data || b.id)?.getTime() ?? -Infinity) - (parseLocalDate(a.data || a.id)?.getTime() ?? -Infinity));

        const totalItems = filtered.length;
        const perPage = appState.txPerPage || 10;
        const totalPages = Math.ceil(totalItems / perPage) || 1;
        let currentPage = appState.txPage || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        const pagedTransactions = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

        let pageButtons = '';
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                pageButtons += `<button type="button" data-action="setTxPage" data-payload="${i}" aria-label="Página ${i}" aria-current="${i === currentPage ? 'page' : 'false'}" class="nv-tx-page-button ${i === currentPage ? 'is-current' : ''}">${i}</button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                if (!pageButtons.endsWith('…</span>')) pageButtons += '<span class="nv-tx-page-gap" aria-hidden="true">…</span>';
            }
        }
        const paginationHtml = totalItems > 0 ? `<footer class="nv-tx-pagination"><label>Exibir <select data-change="changeTxPerPage" aria-label="Quantidade por página"><option value="10" ${perPage === 10 ? 'selected' : ''}>10</option><option value="20" ${perPage === 20 ? 'selected' : ''}>20</option><option value="50" ${perPage === 50 ? 'selected' : ''}>50</option><option value="100" ${perPage === 100 ? 'selected' : ''}>100</option></select> por página</label><nav aria-label="Paginação de transações"><button type="button" data-action="setTxPage" data-payload="${currentPage - 1}" aria-label="Página anterior" ${currentPage === 1 ? 'disabled' : ''} class="nv-tx-page-button"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>${pageButtons}<button type="button" data-action="setTxPage" data-payload="${currentPage + 1}" aria-label="Próxima página" ${currentPage === totalPages ? 'disabled' : ''} class="nv-tx-page-button"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button></nav></footer>` : '';

        UIRenderer.updateDOM('main-content', `<div class="nv-transactions-page">
            ${renderPageHeader({
                eyebrow: 'Movimentações financeiras',
                title: 'Transações',
                subtitle: 'Acompanhe, filtre e organize cada entrada, saída e transferência.',
                className: 'nv-tx-page-header',
                stylePrefix: 'nv-tx',
                actions: [
                    { action: 'exportTransactionsCSV', label: 'Exportar', icon: 'fa-file-export', variant: 'secondary' },
                    { action: 'iniciarImportacaoOFX', label: 'Importar OFX', icon: 'fa-file-import', variant: 'secondary', attributes: { 'data-banco-id': bancoPadraoId } },
                    { action: 'iniciarImportacaoCSV', label: 'Importar CSV', icon: 'fa-file-csv', variant: 'secondary', attributes: { 'data-banco-id': bancoPadraoId } },
                    { type: 'transaction-type-selector', menuId: 'transactions-new-type-menu', label: 'Nova transação', ariaLabel: 'Nova transação: escolher tipo' }
                ]
            })}
            ${Components.transactionSummary(filtered)}
            <section class="nv-tx-panel" aria-label="Lista de transações"><div class="nv-tx-panel-toolbar"><div><h2>Histórico de transações</h2><p class="nv-tx-results-status" aria-live="polite">${totalItems} ${totalItems === 1 ? 'movimentação encontrada' : 'movimentações encontradas'}</p></div></div>${Components.filtersSection(f, db.bancos, db.categorias, db.cartoes)}${Components.uncategorizedTransactionsNotice(uncategorizedCount, !!appState.uncategorizedOnly)}<div class="nv-tx-results">${Components.transactionList(pagedTransactions, { ...appState, previousTransactionDate: filtered[(currentPage - 1) * perPage - 1]?.data })}${paginationHtml}</div></section>
        </div>`);
    },

    Agendamentos: (appState) => {
        const actionsHtml = `<button type="button" data-action="openModal" data-modal="modal-agendamento" class="nv-agenda-primary-action"><i class="fa-solid fa-plus" aria-hidden="true"></i><span>Nova Conta</span></button>`;
        
        UIRenderer.updateDOM('main-content', `
            <div class="nv-agenda-page">
                <header class="nv-agenda-page-header nv-standard-page-header nv-standard-page-header--agenda">
                    <div class="nv-agenda-page-heading">
                        <h1>Contas a Pagar e Receber</h1>
                        <p>Gerencie suas obrigações e previsões financeiras.</p>
                    </div>
                    <div class="nv-agenda-page-actions">${actionsHtml}</div>
                </header>
                ${Components.agendamentosPage(db, appState)}
            </div>
        `);
    },

    Planejamento: (appState) => {
        const money = value => Utils.formatMoney(Number(value) || 0);
        const estimatedBadge = (explanation = 'Valor previsto; não representa uma movimentação realizada.') => `<span class="nv-estimated-badge" title="${Utils.escapeHTML(explanation)}" aria-label="Estimado. ${Utils.escapeHTML(explanation)}">Estimado</span>`;
        const now = new Date();
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const budget = Components.budgetSummary(db.orcamentos, db.transacoes, appState);
        const periodLabel = `${meses[budget.mes]} de ${budget.ano}`;
        const receitas = (db.receitasFuturas || []).filter(i => i.status !== 'recebida');
        const contas = (db.agendamentos || []).filter(i => i.status !== 'pago');
        const assinaturas = (db.assinaturas || []).filter(i => i.ativa !== false);
        const investimentos = db.investimentos || [];
        const parcelamentos = (db.transacoes || []).filter(t => t.isCartao && t.totalParcelas > 1 && t.parcelaAtual < t.totalParcelas);
        const receitaTotal = receitas.reduce((s, i) => s + (Number(i.valor) || 0), 0);
        const contasTotal = contas.filter(i => i.tipo !== 'receita').reduce((s, i) => s + (Number(i.valor) || 0), 0);
        const compromissoTotal = assinaturas.reduce((s, i) => s + (Number(i.valor) || 0), 0) + parcelamentos.reduce((s, i) => s + (Number(i.valor) || 0), 0);
        const lista = (dados, vazio, fn) => dados.length ? dados.slice(0, 6).map(fn).join('') : `<p class="text-xs text-text-secondary py-3">${vazio}</p>`;
        const linha = (nome, detalhe, valor, cor = 'text-text-primary') => `<div class="flex justify-between items-center py-2 border-b border-border last:border-0"><span class="text-xs text-text-primary">${Utils.escapeHTML(nome)}<small class="block text-[10px] text-text-secondary">${Utils.escapeHTML(detalhe || '')}</small></span><strong class="text-xs font-mono ${cor}">${money(valor)}</strong></div>`;
        const quantidade = (total, descricao) => `${total} ${total === 1 ? 'item' : 'itens'} · ${descricao}`;
        const box = (titulo, icone, resumo, conteudo) => `<details class="nv-planning-details-card"><summary class="nv-planning-details-summary"><div class="nv-planning-details-summary__copy"><i class="${icone} nv-planning-details-icon" aria-hidden="true"></i><span><strong>${titulo}</strong><small>${resumo}</small></span></div><i class="fa-solid fa-chevron-down nv-planning-details-chevron" aria-hidden="true"></i></summary><div class="nv-planning-details-body">${conteudo}</div></details>`;

        const budgetCategories = budget.orcamentos.map(o => {
            const limit = Number(o.limite);
            const spent = Number(budget.gastosPorCat[o.categoria]) || 0;
            const hasPlannedLimit = Number.isFinite(limit) && limit > 0;
            const pct = hasPlannedLimit ? (spent / limit) * 100 : null;
            const visualPct = pct == null ? 0 : Math.min(Math.max(pct, 0), 100);
            const status = pct == null ? 'neutral' : pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'success';
            const statusText = status === 'danger' ? 'Limite ultrapassado' : status === 'warning' ? 'Próximo do limite' : status === 'success' ? 'Dentro do planejado' : 'Limite não informado';
            const cat = Components._getCategoryConfig(o.categoria);
            const statusClasses = `${status} is-${status}`;
            const accessibleProgress = pct == null ? `aria-valuenow="0" aria-valuetext="${statusText}"` : `aria-valuenow="${visualPct.toFixed(0)}" aria-valuetext="${pct.toFixed(1)}% utilizado"`;
            return `<div class="nv-planning-budget-row ${statusClasses}" data-budget-status="${status}"><div class="nv-planning-budget-row__top"><span class="nv-planning-budget-name"><span class="nv-planning-category-icon" style="background:${cat.cor || 'var(--c-brand-medium)'}"><i class="fa-solid ${cat.icone}" aria-hidden="true"></i></span><strong>${Utils.escapeHTML(o.categoria)}</strong></span><span class="nv-planning-budget-values"><b>${money(spent)}</b><span>de ${hasPlannedLimit ? money(limit) : 'Limite não informado'}</span></span></div><div class="nv-planning-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" ${accessibleProgress} aria-label="${Utils.escapeHTML(o.categoria)}"><span style="width:${visualPct.toFixed(2)}%"></span></div><p class="nv-planning-budget-alert" role="status">${statusText}</p></div>`;
        }).join('');
        const budgetCategoriesHtml = budget.orcamentos.length ? budgetCategories : `<div class="nv-planning-empty nv-planning-empty--compact"><i class="fa-solid fa-chart-pie" aria-hidden="true"></i><div><strong>Você ainda não definiu um orçamento para ${Utils.escapeHTML(periodLabel)}.</strong><p>Defina limites por categoria para acompanhar o planejado sem inventar um saldo.</p></div><button data-action="openModal" data-modal="modal-orcamento">Definir limite</button></div>`;

        const spendable = calculateSpendableAmount({
            currentBalance: Database.getTotals().saldo,
            futureIncome: db.receitasFuturas,
            pendingExpenses: (db.agendamentos || []).filter(item => item.status === 'pendente' && item.tipo !== 'receita'),
            budgets: budget.orcamentos,
            spentByCategory: budget.gastosPorCat,
        });
        const dueDate = item => new Date(`${item.dataVencimento}T12:00:00`);
        const upcoming = (db.agendamentos || [])
            .filter(item => item.status === 'pendente' && item.tipo !== 'receita' && item.dataVencimento)
            .filter(item => !Number.isNaN(dueDate(item).getTime()))
            .sort((a, b) => dueDate(a) - dueDate(b))
            .slice(0, 5);
        const formatDueDate = value => Utils.formatToBR(String(value || '').slice(0, 10));
        const dueHtml = upcoming.length ? upcoming.map(item => `
            <div class="nv-planning-due-row">
                <div class="nv-planning-due-copy"><strong>${Utils.escapeHTML(item.desc || item.nome || 'Conta pendente')}</strong><span>Vence em ${Utils.escapeHTML(formatDueDate(item.dataVencimento))}</span></div>
                <b class="is-expense">${money(item.valor)}</b>
            </div>
        `).join('') : '<div class="nv-planning-empty nv-planning-empty--compact"><i class="fa-regular fa-calendar-check" aria-hidden="true"></i><div><strong>Nenhum vencimento pendente.</strong><p>Contas pagas ou recebidas não aparecem aqui.</p></div></div>';

        const goalsHtml = (db.metas || []).slice(0, 3).map(meta => {
            const goalProgress = Components._getGoalProgress(meta);
            const pct = goalProgress.pct;
            const pctLabel = goalProgress.hasTarget ? `${pct.toFixed(0)}%` : '—';
            return `<div class="nv-planning-goal-row"><span class="nv-planning-goal-icon"><i class="fa-regular fa-star" aria-hidden="true"></i></span><div class="nv-planning-goal-copy"><div><strong>${Utils.escapeHTML(meta.nome)}</strong><span class="nv-goal-status nv-goal-status--${goalProgress.status}">${Utils.escapeHTML(goalProgress.statusLabel)}</span></div><div class="nv-planning-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${goalProgress.hasTarget ? pct.toFixed(0) : 0}" aria-valuetext="${Utils.escapeHTML(goalProgress.statusLabel)}"><span style="width:${pct.toFixed(2)}%"></span></div><small>${pctLabel} · ${money(goalProgress.atual)} de ${goalProgress.hasTarget ? money(goalProgress.alvo) : 'alvo não informado'}</small></div><button data-action="openDepositModal" data-id="${meta.id}" data-nome="${Utils.escapeHTML(meta.nome)}" title="Depositar na meta" aria-label="Depositar na meta"><i class="fa-solid fa-plus"></i></button></div>`;
        }).join('');
        const goalsSection = goalsHtml || '<div class="nv-planning-empty nv-planning-empty--compact"><i class="fa-regular fa-star" aria-hidden="true"></i><div><strong>Nenhuma meta ativa.</strong><p>Crie uma meta para acompanhar o próximo objetivo.</p></div><button data-action="openModal" data-modal="modal-meta">Criar meta</button></div>';
        const budgetSummaryHtml = budget.orcamentos.length ? `<div class="nv-planning-budget-summary"><div><span>Planejado</span><strong>${money(budget.totalOrcado)}</strong></div><div><span>Gasto</span><strong class="is-expense">${money(budget.totalGastoMes)}</strong></div><div><span>Disponível</span><strong class="${budget.disponivelGeral < 0 ? 'is-expense' : 'is-positive'}">${money(budget.disponivelGeral)}</strong></div></div><p class="nv-planning-summary-note">Valores calculados a partir dos limites e despesas registrados neste mês.</p>` : `<div class="nv-planning-empty nv-planning-empty--compact nv-planning-budget-empty"><i class="fa-solid fa-chart-pie" aria-hidden="true"></i><div><strong>Sem orçamento definido para ${Utils.escapeHTML(periodLabel)}.</strong><p>Cadastre pelo menos um limite para ver o planejado, o gasto e o disponível com dados reais.</p></div><button data-action="openModal" data-modal="modal-orcamento">Definir limite</button></div>`;
        const spendableValueClass = spendable.available && spendable.value >= 0 ? 'is-positive' : 'is-expense';
        const spendableHtml = `<section class="nv-spendable-card" aria-labelledby="nv-spendable-title"><div><p class="nv-planning-eyebrow">Decisão do mês</p><h2 id="nv-spendable-title">Quanto ainda posso gastar?</h2><p class="nv-spendable-description">${Utils.escapeHTML(spendable.reason)}</p></div><strong class="${spendableValueClass}" data-currency-value="${spendable.available ? spendable.value : ''}">${spendable.available ? money(spendable.value) : '—'}</strong></section>`;
        const dailyProjection = cashflowProjectionFromDatabase(db, { now, horizonDays: 30 });
        const projectionMovementDays = dailyProjection.available ? dailyProjection.days.filter(day => day.movements.length > 0) : [];
        const projectionRows = projectionMovementDays.map(day => {
            const dateLabel = day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
            const descriptions = day.movements.map(item => `${item.description}${item.overdue ? ' · atrasada' : ''}`).join(' · ');
            return `<div class="nv-report-table-row"><div>${Utils.escapeHTML(dateLabel)}<small class="block text-[10px] font-normal text-text-secondary mt-1">${Utils.escapeHTML(descriptions)}</small></div><div class="is-income">${day.expectedIncome > 0 ? '+ ' + money(day.expectedIncome) : '–'}</div><div class="is-expense">${day.pendingExpenses > 0 ? '− ' + money(day.pendingExpenses) : '–'}</div><div class="${day.closingBalance < 0 ? 'is-expense' : 'is-positive'}">${money(day.closingBalance)}</div></div>`;
        }).join('');
        const projectionReason = Utils.escapeHTML(dailyProjection.reason);
        const projectionUnavailable = `<div class="nv-report-empty" role="status"><i class="fa-solid fa-chart-line" aria-hidden="true"></i><div><strong>Projeção indisponível</strong><span>${projectionReason}</span></div></div>`;
        const projectionSummary = dailyProjection.available ? `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5"><div class="nv-report-metric is-income"><p>Entradas previstas ${estimatedBadge('Receitas ainda não recebidas no horizonte de 30 dias.')}</p><h3 class="${financialValueClass(dailyProjection.expectedIncome)}">${money(dailyProjection.expectedIncome)}</h3></div><div class="nv-report-metric is-expense"><p>Saídas previstas ${estimatedBadge('Contas pendentes e assinaturas com data no horizonte de 30 dias.')}</p><h3 class="${financialValueClass(-dailyProjection.pendingExpenses)}">${money(dailyProjection.pendingExpenses)}</h3></div><div class="nv-report-metric is-net"><p>Saldo estimado em 30 dias ${estimatedBadge('Projeção diária; não representa um saldo realizado.')}</p><h3 class="${financialValueClass(dailyProjection.endingBalance)}">${money(dailyProjection.endingBalance)}</h3></div></div><p class="text-xs text-text-secondary mb-4">Menor saldo diário estimado: <strong class="${financialValueClass(dailyProjection.minimumClosingBalance)}">${money(dailyProjection.minimumClosingBalance)}</strong> em ${Utils.escapeHTML(Utils.formatToBR(dailyProjection.minimumDate))}. ${dailyProjection.firstNegativeDate ? `<strong class="is-expense">Projeção abaixo de zero em ${Utils.escapeHTML(Utils.formatToBR(dailyProjection.firstNegativeDate))}.</strong>` : 'Nenhum fechamento diário abaixo de zero neste horizonte.'}</p><div class="overflow-x-auto"><div class="min-w-[560px]"><div class="nv-report-table-header"><div>Data prevista</div><div>Entradas</div><div>Saídas</div><div>Saldo no fim do dia</div></div><div class="nv-report-table-body">${projectionRows}</div></div></div>` : projectionUnavailable;
        const dailyProjectionHtml = `<section class="nv-report-panel mb-6" aria-labelledby="nv-daily-projection-title"><div class="nv-report-panel-heading"><div><h4 id="nv-daily-projection-title">Projeção diária de caixa ${estimatedBadge('Estimativa baseada apenas em previsões pendentes com data.')}</h4><p>Próximos 30 dias · somente movimentos futuros ainda não realizados.</p></div></div>${projectionSummary}</section>`;

        UIRenderer.updateDOM('main-content', `<div class="nv-planning-page">
            <header class="nv-planning-header"><div><p class="nv-planning-eyebrow">Visão de planejamento</p><h1>Planejamento</h1><p class="nv-planning-subtitle">Organize decisões financeiras para <strong>${Utils.escapeHTML(periodLabel)}</strong>.</p></div><div class="nv-planning-header-actions"><button data-action="changeMonth" data-type="budget" data-dir="-1" class="nv-planning-period-button" aria-label="Mês anterior"><i class="fa-solid fa-chevron-left"></i></button><span class="nv-planning-period">${Utils.escapeHTML(periodLabel)}</span><button data-action="changeMonth" data-type="budget" data-dir="1" class="nv-planning-period-button" aria-label="Próximo mês"><i class="fa-solid fa-chevron-right"></i></button><button data-action="openModal" data-modal="modal-agendamento" class="nv-planning-primary-action"><i class="fa-solid fa-plus" aria-hidden="true"></i><span>Novo lançamento</span></button></div></header>
            <div class="nv-planning-quick-actions"><button class="nv-planning-action" data-action="openModal" data-modal="modal-transacao" data-type="receita"><i class="fa-solid fa-arrow-trend-up"></i><span>Adicionar receita</span></button><button class="nv-planning-action" data-action="openModal" data-modal="modal-transacao" data-type="despesa"><i class="fa-solid fa-arrow-trend-down"></i><span>Adicionar despesa</span></button><button class="nv-planning-action" data-action="openModal" data-modal="modal-meta"><i class="fa-regular fa-star"></i><span>Criar meta</span></button><button class="nv-planning-action" data-action="openModal" data-modal="modal-orcamento"><i class="fa-solid fa-chart-pie"></i><span>Definir limite</span></button></div>
            <dl class="nv-planning-signal-strip" aria-label="Compromissos registrados"><div class="nv-planning-signal-card nv-planning-signal-card--income"><dt>Receitas previstas ${estimatedBadge('Receita futura ainda não recebida.')}</dt><dd class="is-positive ${financialValueClass(receitaTotal)}" data-currency-value="${receitaTotal}">${money(receitaTotal)}</dd></div><div class="nv-planning-signal-card nv-planning-signal-card--expense"><dt>Contas pendentes ${estimatedBadge('Compromissos agendados ainda não pagos.')}</dt><dd class="is-expense ${financialValueClass(-contasTotal)}" data-currency-value="${contasTotal}">${money(contasTotal)}</dd></div><div class="nv-planning-signal-card nv-planning-signal-card--commitments"><dt>Compromissos ${estimatedBadge('Assinaturas e parcelas futuras previstas.')}</dt><dd data-currency-value="${compromissoTotal}" class="${financialValueClass(null)}">${money(compromissoTotal)}</dd></div></dl>
            ${spendableHtml}
            ${dailyProjectionHtml}
            <section class="nv-planning-overview" aria-label="Resumo do planejamento"><div class="nv-planning-overview-head"><div><p class="nv-planning-eyebrow">Resumo mensal</p><h2>${Utils.escapeHTML(periodLabel)}</h2></div><button data-action="navigate" data-payload="Orcamento" class="nv-planning-text-action">Ver orçamento completo <i class="fa-solid fa-arrow-up-right-from-square"></i></button></div>${budgetSummaryHtml}</section>
            <aside class="nv-planning-mobile-summary" aria-label="Resumo rápido do planejamento"><div><span>Disponível no mês</span><strong class="${budget.disponivelGeral < 0 ? 'is-expense' : 'is-positive'}">${money(budget.disponivelGeral)}</strong></div><button type="button" data-action="openModal" data-modal="modal-transacao" data-type="despesa" aria-label="Adicionar uma despesa neste mês"><i class="fa-solid fa-plus" aria-hidden="true"></i><span>Adicionar despesa</span></button></aside>
            <div class="nv-planning-main-grid"><section class="nv-planning-panel" aria-labelledby="nv-budget-title"><div class="nv-planning-panel-head"><div><p class="nv-planning-eyebrow">Acompanhamento</p><h2 id="nv-budget-title">Orçamento por categoria</h2></div><span class="nv-planning-count">${budget.orcamentos.length} ${budget.orcamentos.length === 1 ? 'limite' : 'limites'}</span></div><div class="nv-planning-budget-list">${budgetCategoriesHtml}</div></section><section class="nv-planning-panel" aria-labelledby="nv-due-title"><div class="nv-planning-panel-head"><div><p class="nv-planning-eyebrow">Prioridade</p><h2 id="nv-due-title">Próximos vencimentos</h2></div><button data-action="navigate" data-payload="Agendamentos" class="nv-planning-text-action">Ver agenda</button></div><div class="nv-planning-due-list">${dueHtml}</div></section></div>
            <section class="nv-planning-panel nv-planning-goals-panel" aria-labelledby="nv-goals-title"><div class="nv-planning-panel-head"><div><p class="nv-planning-eyebrow">Progresso financeiro</p><h2 id="nv-goals-title">Metas e reservas</h2></div><button data-action="navigate" data-payload="Metas" class="nv-planning-text-action">Ver todas</button></div><div class="nv-planning-goals-list">${goalsSection}</div></section>
            <section class="nv-planning-details" aria-labelledby="nv-planning-details-title"><div class="nv-planning-details-head"><div><p class="nv-planning-eyebrow">Dados completos</p><h2 id="nv-planning-details-title">Detalhes do planejamento</h2><p>Abra uma seção para revisar os registros. As alterações continuam disponíveis nas ações principais acima.</p></div></div><div class="nv-planning-details-list">${box('Receitas recorrentes', 'fa-solid fa-arrow-trend-up', quantidade(receitas.length, 'Previsões de entrada'), lista(receitas, 'Nenhuma receita recorrente.', i => linha(i.desc || 'Receita prevista', i.data, i.valor, 'text-success')))}${box('Despesas recorrentes', 'fa-solid fa-arrow-trend-down', quantidade(contas.length, 'Previsões de saída'), lista(contas, 'Nenhuma despesa recorrente.', i => linha(i.desc || 'Despesa prevista', 'Vencimento: ' + (i.dataVencimento || ''), i.valor, 'text-danger')))}${box('Assinaturas', 'fa-solid fa-repeat', quantidade(assinaturas.length, 'Serviços recorrentes'), lista(assinaturas, 'Nenhuma assinatura ativa.', i => linha(i.nome || i.desc || 'Assinatura', i.periodicidade || 'Mensal', i.valor, 'text-brand-medium')))}${box('Investimentos', 'fa-solid fa-chart-line', quantidade(investimentos.length, 'Posições cadastradas'), lista(investimentos, 'Nenhum investimento cadastrado.', i => linha(i.nome || i.ativo || 'Investimento', 'Valor atual', i.valorAtual || i.valor, 'text-success')))}${box('Orçamento mensal', 'fa-solid fa-chart-pie', quantidade(budget.orcamentos.length, 'Limites por categoria'), Components.budgetView(db.orcamentos, db.transacoes, appState, { readOnly: true }))}${box('Metas e reservas', 'fa-solid fa-bullseye', quantidade((db.metas || []).length, 'Objetivos financeiros'), Components.goalsPage(db.metas, db.transacoes, { readOnly: true, reservas: db.reservas, bancos: db.bancos }))}${box('Parcelamentos', 'fa-regular fa-credit-card', quantidade(parcelamentos.length, 'Parcelas pendentes'), lista(parcelamentos, 'Nenhum parcelamento pendente.', i => linha(i.desc, `Parcela ${i.parcelaAtual}/${i.totalParcelas}`, i.valor)))}</div></section>
        </div>`);
    },

    Contas: (appState) => {
        const selectBancosCartao = document.getElementById('cartao-bancoId');
        if (selectBancosCartao) {
            const bankOptions = db.bancos.map(b => {
                const displayName = Utils.formatBankName(b);
                return `<option value="${b.id}">${Utils.escapeHTML(displayName)}</option>`;
            }).join('');
            selectBancosCartao.innerHTML = '<option value="" disabled selected>Selecione a conta</option>' + bankOptions;
        }

        UIRenderer.updateDOM('main-content', Components.accountsPage(db.bancos, db.cartoes, db.transacoes, db.reservas, db.agendamentos));
    },

    Metas: (appState) => {
        const actionsHtml = `<button data-action="openModal" data-modal="modal-meta" class="bg-brand-medium text-white px-6 py-2.5 rounded-[12px] font-bold text-sm shadow-brand-glow hover:-translate-y-0.5 transition-all hover:bg-brand-dark"><i class="fa-solid fa-plus mr-2"></i> Criar Meta</button>`;
        
        UIRenderer.updateDOM('main-content', `
            <div class="nv-standard-page-header nv-standard-page-header--goals flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary mb-1">Metas e Reservas</h2>
                    <p class="text-text-secondary text-sm">Planeje seus objetivos financeiros.</p>
                </div>
                <div class="flex flex-wrap gap-3">
                    ${actionsHtml}
                </div>
            </div>
            <details class="nv-standard-page-panel bg-surface border border-border rounded-[16px] shadow-soft group" open><summary class="cursor-pointer list-none p-5 flex items-center justify-between font-bold text-text-primary"><span><i class="fa-solid fa-bullseye text-brand-medium mr-2"></i>Metas e reservas</span><i class="fa-solid fa-chevron-down group-open:rotate-180 transition-transform"></i></summary><div class="px-5 pb-5">${Components.goalsPage(db.metas, db.transacoes, { reservas: db.reservas, bancos: db.bancos })}</div></details>
        `);
    },

    Orcamento: (appState) => {
        const actionsHtml = `
            <button data-action="openModal" data-modal="modal-orcamento-inteligente" class="bg-surface border border-brand-medium text-brand-medium px-5 py-2.5 rounded-[12px] text-sm font-bold shadow-soft hover:bg-brand-medium hover:text-white transition-all flex items-center gap-2"><i class="fa-solid fa-wand-magic-sparkles"></i> Inteligente</button>
            <button data-action="openModal" data-modal="modal-orcamento" class="bg-brand-medium text-white px-5 py-2.5 rounded-[12px] text-sm font-bold shadow-brand-glow hover:-translate-y-0.5 hover:bg-brand-dark transition-all"><i class="fa-solid fa-plus mr-2"></i> Definir Limite</button>
        `;
        
        UIRenderer.updateDOM('main-content', `
            <div class="nv-standard-page-header nv-standard-page-header--budget flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary mb-1">Orçamento Mensal</h2>
                    <p class="text-text-secondary text-sm">Estabeleça limites e controle seus gastos.</p>
                </div>
                <div class="flex flex-wrap gap-3">
                    ${actionsHtml}
                </div>
            </div>
            <details class="nv-standard-page-panel bg-surface border border-border rounded-[16px] shadow-soft group" open><summary class="cursor-pointer list-none p-5 flex items-center justify-between font-bold text-text-primary"><span><i class="fa-solid fa-wallet text-brand-medium mr-2"></i>Orçamento mensal</span><i class="fa-solid fa-chevron-down group-open:rotate-180 transition-transform"></i></summary><div class="px-5 pb-5">${Components.budgetView(db.orcamentos, db.transacoes, appState)}</div></details>
        `);
    },

    Relatorios: (appState) => {
        const actionsHtml = `
            <button data-action="exportPDF" class="nv-reports-export-button">
                <i class="fa-solid fa-download"></i><span>Exportar PDF</span>
            </button>
        `;

        const hojeAnalise = new Date();
        const mesAtual = hojeAnalise.getMonth();
        const anoAtual = hojeAnalise.getFullYear();
        const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
        const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;
        const comparacao = FinancialAnalytics.compareMonths(db.transacoes, { year: anoAtual, month: mesAtual }, { year: anoAnterior, month: mesAnterior });
        const heatmap = FinancialAnalytics.heatmap(db.transacoes, anoAtual, mesAtual);
        const maiorGasto = Math.max(...heatmap.map(d => d.valor), 0);
        const heatmapHtml = heatmap.map(d => {
            const intensidade = maiorGasto ? Math.max(8, Math.round((d.valor / maiorGasto) * 100)) : 8;
            return `<div title="Dia ${d.dia}: ${Utils.formatMoney(d.valor)}" class="h-7 rounded-md border border-border" style="background-color: rgba(108,59,182,${intensidade / 100})"></div>`;
        }).join('');
        const variationText = value => value === null ? 'sem base anterior' : `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`;
        const resultadoAtual = comparacao.atual.receitas - comparacao.atual.despesas;
        const resultadoAnterior = comparacao.anterior.receitas - comparacao.anterior.despesas;
        const variacaoResultado = resultadoAnterior === 0
            ? (resultadoAtual === 0 ? 0 : null)
            : ((resultadoAtual - resultadoAnterior) / Math.abs(resultadoAnterior)) * 100;
        const pagamentosFatura = comparacao.atual.pagamentosFatura;
        const statusFaturas = pagamentosFatura > 0 ? 'Separadas' : 'Sem pagamentos';
        const statusFaturasMeta = pagamentosFatura > 0
            ? `${Utils.formatMoney(pagamentosFatura)} fora das despesas`
            : 'sem pagamentos para separar';
        const categoriasComparadas = FinancialAnalytics.categoryComparison(db.transacoes, { year: anoAtual, month: mesAtual }, { year: anoAnterior, month: mesAnterior }).slice(0, 5);
        const comparacaoCategoriasHtml = categoriasComparadas.length ? categoriasComparadas.map(item => `<div class="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"><span class="text-xs text-text-primary truncate">${Utils.escapeHTML(item.categoria)}</span><span class="text-xs font-bold ${item.diferenca > 0 ? 'text-danger' : item.diferenca < 0 ? 'text-success' : 'text-text-secondary'} font-mono">${item.diferenca > 0 ? '+' : ''}${Utils.formatMoney(item.diferenca)}</span></div>`).join('') : '<p class="text-xs text-text-secondary">Sem dados suficientes para comparar.</p>';
        const insightsHtml = FinancialAnalytics.insights(db.transacoes, anoAtual, mesAtual).map(insight => `<div class="flex gap-2 items-start py-2 border-b border-border last:border-0"><i class="fa-solid fa-lightbulb text-warning mt-0.5"></i><span class="text-xs text-text-primary">${Utils.escapeHTML(insight)}</span></div>`).join('') || '<p class="text-xs text-text-secondary">Ainda não há dados suficientes para gerar insights.</p>';
        const analysisHtml = `
            <details class="nv-analysis-summary bg-surface border border-border rounded-[16px] shadow-soft mb-6 group">
                <summary class="cursor-pointer list-none font-bold text-text-primary"><span><i class="fa-solid fa-chart-line text-brand-medium mr-2"></i>Análises financeiras <small>Contexto mensal e insights</small></span><i class="fa-solid fa-chevron-down group-open:rotate-180 transition-transform"></i></summary>
                <div class="nv-analysis-summary__body">
                    <div class="nv-analysis-metrics" role="list" aria-label="Indicadores financeiros do mês">
                        <article class="nv-analysis-metric nv-analysis-metric--income" role="listitem">
                            <p class="nv-analysis-metric__label">Receitas no mês</p>
                            <strong class="nv-analysis-metric__value">${Utils.formatMoney(comparacao.atual.receitas)}</strong>
                            <span class="nv-analysis-metric__meta">${variationText(comparacao.variacaoReceitas)} vs. mês ant.</span>
                        </article>
                        <article class="nv-analysis-metric nv-analysis-metric--expense" role="listitem">
                            <p class="nv-analysis-metric__label">Despesas reais</p>
                            <strong class="nv-analysis-metric__value">${Utils.formatMoney(comparacao.atual.despesas)}</strong>
                            <span class="nv-analysis-metric__meta">${variationText(comparacao.variacaoDespesas)} vs. mês ant.</span>
                        </article>
                        <article class="nv-analysis-metric ${resultadoAtual >= 0 ? 'nv-analysis-metric--positive' : 'nv-analysis-metric--negative'}" role="listitem">
                            <p class="nv-analysis-metric__label">Resultado do mês</p>
                            <strong class="nv-analysis-metric__value">${Utils.formatMoney(resultadoAtual)}</strong>
                            <span class="nv-analysis-metric__meta">${variationText(variacaoResultado)} vs. mês ant.</span>
                        </article>
                        <article class="nv-analysis-metric nv-analysis-metric--invoice" role="listitem">
                            <p class="nv-analysis-metric__label">Faturas não duplicadas</p>
                            <strong class="nv-analysis-metric__value ${pagamentosFatura > 0 ? 'is-positive' : 'is-neutral'}">${statusFaturas}</strong>
                            <span class="nv-analysis-metric__meta">${statusFaturasMeta}</span>
                        </article>
                    </div>
                    <div class="mb-5"><p class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Insights</p>${insightsHtml}</div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5"><div><p class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Maiores variações por categoria</p>${comparacaoCategoriasHtml}</div><div><p class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Mapa diário de despesas</p><div class="grid grid-cols-7 sm:grid-cols-10 lg:grid-cols-12 gap-1">${heatmapHtml}</div></div></div>
                </div>
            </details>
        `;

        UIRenderer.updateDOM('main-content', `
            ${Components.reportsPage(db, appState, actionsHtml, analysisHtml)}
        `);
    },

    Categorias: (appState) => {
        UIRenderer.updateDOM('main-content', `
            <div class="nv-category-page-header">
                <div>
                    <p class="nv-category-eyebrow">Cadastros</p>
                    <h2>Categorias</h2>
                    <p>Organize grupos e subcategorias para manter seus lançamentos consistentes.</p>
                </div>
                <button type="button" data-action="openModal" data-modal="modal-categoria" class="nv-category-primary-action"><i class="fa-solid fa-plus" aria-hidden="true"></i> Nova categoria</button>
            </div>
            ${Components.categoriesPage(db, appState)}
        `);
    },

    Configuracoes: (appState) => {
        UIRenderer.updateDOM('main-content', `
            <div class="nv-standard-page-header nv-standard-page-header--settings flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary mb-1">Configurações</h2>
                    <p class="text-text-secondary text-sm">Gerencie seu perfil e as configurações do sistema.</p>
                </div>
            </div>
            ${Components.settingsPage(db, settingsGroups)}
        `);
    },

    Contatos: (appState) => {
        const total = Array.isArray(db.contatos) ? db.contatos.length : 0;
        UIRenderer.updateDOM('main-content', `<div class="nv-contacts-page">
            <header class="nv-contacts-header"><div><p class="nv-contacts-eyebrow">Organização</p><h1>Pessoas</h1><p>Associe contatos aos lançamentos e identifique rapidamente cada relação financeira.</p></div><button type="button" data-action="openModal" data-modal="modal-contato" class="nv-contacts-primary-action"><i class="fa-solid fa-plus" aria-hidden="true"></i>Novo contato</button></header>
            <section class="nv-contacts-summary" aria-label="Resumo de contatos"><span class="nv-contacts-summary__icon"><i class="fa-regular fa-address-book" aria-hidden="true"></i></span><div><strong>${total}</strong><span>${total === 1 ? 'contato cadastrado' : 'contatos cadastrados'}</span></div><p>Use contatos para tornar os lançamentos mais fáceis de reconhecer.</p></section>
            ${Components.contatosPage(db.contatos)}
        </div>`);
    }
};
