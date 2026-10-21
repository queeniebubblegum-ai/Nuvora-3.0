import { Utils } from './utils.js';
import { CoreComponents } from './cmp-core.js';
import { financialValueClass } from './financial-refinements.js';
import { isExpense, isIncome, isTransfer as isTransferTransaction } from './financial-ledger.js';
import { PRIORITY_KEYS, resolvePriority } from './priority.js';

/**
 * Compares two period values without turning a missing/zero baseline into a
 * fabricated 100% trend.  A non-zero baseline keeps the existing percentage
 * semantics; callers decide how to present the neutral state.
 */
export const calculateDashboardTrend = (current, previous) => {
    const currentValue = Number(current);
    const previousValue = Number(previous);
    if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue === 0) {
        return { val: null, label: 'Sem comparação anterior', direction: 'neutral', isUp: false, isNeutral: true };
    }
    const diff = ((currentValue - previousValue) / previousValue) * 100;
    return { val: Math.abs(diff).toFixed(1), label: `${Math.abs(diff).toFixed(1)}%`, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral', isUp: diff >= 0, isNeutral: false };
};

export const onboardingSteps = Object.freeze([
    { id: 'account', title: 'Adicione uma conta', description: 'Comece pelo saldo que você tem hoje.', action: 'openModal', modal: 'modal-banco' },
    { id: 'transaction', title: 'Registre o primeiro lançamento', description: 'Isso permite calcular seu resultado do mês.', action: 'openModal', modal: 'modal-transacao' },
    { id: 'budget', title: 'Defina um limite', description: 'Transforme seus gastos em um plano claro.', action: 'openModal', modal: 'modal-orcamento' },
]);

const onboardingStepStatus = (database = {}) => ({
    account: (database.bancos || []).length > 0,
    transaction: (database.transacoes || []).some(item => isIncome(item) || isExpense(item)),
    budget: (database.orcamentos || []).some(item => Number.isFinite(Number(item?.limite)) && Number(item.limite) > 0),
});

export const DashboardComponents = {
    dashboardCards: (atual = {}, anterior = {}) => {
        const calcTrend = calculateDashboardTrend;

        // Receitas/despesas are intentionally period-filtered. Saldo atual is
        // the existing global Database.getTotals().saldo passed by the page;
        // none of these values change the underlying financial calculations.
        const resultadoPeriodo = (Number(atual.receitas) || 0) - (Number(atual.despesas) || 0);
        const resultadoAnterior = (Number(anterior.receitas) || 0) - (Number(anterior.despesas) || 0);
        const resultadoT = calcTrend(resultadoPeriodo, resultadoAnterior);
        const resultadoTrendClass = resultadoT.isNeutral ? 'text-text-secondary' : (resultadoT.isUp ? 'text-success' : 'text-danger');
        const resultadoTrendIcon = resultadoT.isNeutral ? 'fa-minus' : (resultadoT.isUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down');
        const resultadoTrendLabel = resultadoT.isNeutral ? resultadoT.label : `${resultadoT.label}`;
        const vencimentos = atual.contasPendentes || 0;
        const resultadoColor = resultadoPeriodo >= 0 ? 'text-success' : 'text-danger';
        const vencimentosColor = vencimentos > 0 ? 'text-danger' : 'text-success';
        const projection = atual.projecaoFimMes || {};
        const projectionAvailable = projection.available === true && Number.isFinite(Number(projection.value));
        const projectionValue = projectionAvailable ? Utils.formatMoney(projection.value) : '—';
        const projectionTone = projectionAvailable ? financialValueClass(projection.value) : financialValueClass(null);

        const resultadoCard = `
        <div class="nv-dashboard-card nv-summary-card nv-summary-card--result group">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-2">
                    <span class="text-text-primary text-xs font-black uppercase tracking-widest opacity-90">Resultado do período</span>
                    <span class="${resultadoTrendClass} text-[10px] font-bold flex items-center gap-1 ${resultadoT.isNeutral ? '' : 'font-mono'}" aria-label="${resultadoTrendLabel}"><i class="fa-solid ${resultadoTrendIcon}" aria-hidden="true"></i> ${resultadoTrendLabel}</span>
                </div>
                <div class="w-10 h-10 text-brand-medium bg-brand-soft rounded-[12px] flex items-center justify-center text-base shadow-sm group-hover:scale-110 transition-transform"><i class="fa-solid fa-scale-balanced" aria-hidden="true"></i></div>
            </div>
            <h3 data-currency-value="${resultadoPeriodo}" class="text-3xl font-bold ${resultadoColor} ${financialValueClass(resultadoPeriodo)} mb-1 font-mono tracking-tight">${Utils.formatMoney(resultadoPeriodo)}</h3>
            <p class="text-[11px] text-text-secondary font-medium">Receitas ${Utils.formatMoney(atual.receitas)} · Despesas ${Utils.formatMoney(atual.despesas)}</p>
        </div>`;

        const projectionCard = `
        <div class="nv-dashboard-card nv-summary-card nv-summary-card--projection group" aria-label="Projeção de saldo no fim do mês">
            <div class="flex justify-between items-start mb-4"><div class="flex items-center gap-2"><span class="text-text-primary text-xs font-black uppercase tracking-widest opacity-90">Fim do mês</span></div><div class="w-10 h-10 text-brand-medium bg-brand-soft rounded-[12px] flex items-center justify-center text-base shadow-sm"><i class="fa-solid fa-chart-line" aria-hidden="true"></i></div></div>
            <h3 data-currency-value="${projectionAvailable ? projection.value : ''}" class="text-3xl font-bold ${projectionTone} mb-1 font-mono tracking-tight">${projectionValue}</h3>
            <p class="text-[11px] text-text-secondary font-medium" title="${Utils.escapeHTML(projection.explanation || 'Dados futuros insuficientes para projetar.')}">${Utils.escapeHTML(projectionAvailable ? 'Saldo estimado no fim do mês' : 'Dados insuficientes para projetar')}</p>
        </div>`;

        const vencimentosCard = `
        <div class="nv-dashboard-card nv-summary-card nv-summary-card--due group">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-2"><span class="text-text-primary text-xs font-black uppercase tracking-widest opacity-90">Próximos vencimentos</span></div>
                <div class="w-10 h-10 ${vencimentos > 0 ? 'text-danger bg-danger/10' : 'text-success bg-success/10'} rounded-[12px] flex items-center justify-center text-base shadow-sm group-hover:scale-110 transition-transform"><i class="fa-solid fa-clock" aria-hidden="true"></i></div>
            </div>
            <h3 data-currency-value="${vencimentos}" class="text-3xl font-bold ${vencimentosColor} ${financialValueClass(vencimentos)} mb-1 font-mono tracking-tight">${Utils.formatMoney(vencimentos)}</h3>
            <p class="text-[11px] text-text-secondary font-medium">Contas pendentes de hoje até o fim do mês</p>
        </div>`;

        return `
        <div class="nv-dashboard-summary-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            ${CoreComponents._buildSummaryCard('Saldo atual', atual.saldo, '', true, 'fa-wallet', 'Saldo global de todas as contas')}
            ${resultadoCard}
            ${vencimentosCard}
            ${projectionCard}
        </div>`;
    },

    onboardingChecklist: (database = {}) => {
        const completed = onboardingStepStatus(database);
        const completedCount = onboardingSteps.filter(step => completed[step.id]).length;
        if (completedCount === onboardingSteps.length) return '';
        const steps = onboardingSteps.map((step, index) => {
            const isComplete = completed[step.id];
            return `<li class="nv-onboarding-step ${isComplete ? 'is-complete' : ''}"><span class="nv-onboarding-step__number" aria-hidden="true">${isComplete ? '<i class="fa-solid fa-check"></i>' : index + 1}</span><div class="nv-onboarding-step__copy"><strong>${Utils.escapeHTML(step.title)}</strong><p>${Utils.escapeHTML(step.description)}</p></div>${isComplete ? '<span class="nv-onboarding-step__status">Concluído</span>' : `<button type="button" data-action="${Utils.escapeHTML(step.action)}" data-modal="${Utils.escapeHTML(step.modal)}" class="nv-onboarding-step__action">Começar</button>`}</li>`;
        }).join('');
        const progress = Math.round((completedCount / onboardingSteps.length) * 100);
        return `<section class="nv-onboarding-checklist" aria-labelledby="nv-onboarding-title"><div class="nv-onboarding-checklist__header"><div><p class="nv-dashboard-eyebrow">Primeiros passos</p><h2 id="nv-onboarding-title">Comece com três passos simples</h2><p>Monte sua base financeira para acompanhar o mês com clareza.</p></div><span class="nv-onboarding-checklist__count">${completedCount} de ${onboardingSteps.length}</span></div><div class="nv-onboarding-checklist__progress" role="progressbar" aria-label="Progresso da configuração inicial" aria-valuemin="0" aria-valuemax="${onboardingSteps.length}" aria-valuenow="${completedCount}"><span style="width:${progress}%"></span></div><ol class="nv-onboarding-steps">${steps}</ol></section>`;
    },

    // Chooses one next action so the dashboard has a single prioritized
    // narrative instead of stacking alerts with the same urgency.
    nextDecision: (atual = {}, context = {}) => {
        const selection = resolvePriority({ ...atual, ...context });
        const asNumber = value => {
            const number = Number(value);
            return Number.isFinite(number) ? number : 0;
        };
        const describe = (items, singular, plural, suffix = 'aguardando regularização.') => {
            const total = items.reduce((sum, item) => sum + asNumber(item.valor), 0);
            const countLabel = `${items.length} ${items.length === 1 ? singular : plural}`;
            return total > 0 ? `${countLabel} · ${Utils.formatMoney(total)} ${suffix}` : `${countLabel} ${suffix}`;
        };
        const labelsFor = items => {
            const labels = [...new Set(items.map(item => item.nome || item.modelo || item.categoria || 'Item').filter(Boolean))];
            return labels.length <= 2 ? labels.join(' e ') : `${labels.slice(0, 2).join(', ')} e mais ${labels.length - 2}`;
        };

        if (selection.priority === PRIORITY_KEYS.OVERDUE) {
            return {
                priority: selection.priority,
                tone: 'danger',
                icon: 'fa-triangle-exclamation',
                title: 'Regularize as contas vencidas',
                detail: describe(selection.overdue, 'conta vencida', 'contas vencidas'),
                action: 'Agendamentos',
                actionLabel: 'Ver contas vencidas'
            };
        }
        if (selection.priority === PRIORITY_KEYS.NEGATIVE_BALANCE) {
            return {
                priority: selection.priority,
                tone: 'danger',
                icon: 'fa-arrow-trend-down',
                title: 'Recomponha o saldo global',
                detail: `O saldo de todas as contas está em ${Utils.formatMoney(selection.balance)}.`,
                action: 'Contas',
                actionLabel: 'Ver contas'
            };
        }
        if (selection.priority === PRIORITY_KEYS.OVER_BUDGET) {
            const label = labelsFor(selection.overBudget);
            return {
                priority: selection.priority,
                tone: 'warning',
                icon: 'fa-chart-pie',
                title: 'Revise o orçamento ultrapassado',
                detail: `${label} ${selection.overBudget.length === 1 ? 'ultrapassou' : 'ultrapassaram'} o limite definido.`,
                action: 'Orcamento',
                actionLabel: 'Revisar orçamento'
            };
        }
        if (selection.priority === PRIORITY_KEYS.HIGH_CARD_USAGE) {
            const label = labelsFor(selection.highCardUsage);
            return {
                priority: selection.priority,
                tone: 'warning',
                icon: 'fa-credit-card',
                title: 'Revise o uso dos cartões',
                detail: `${label} ${selection.highCardUsage.length === 1 ? 'está' : 'estão'} com pelo menos 80% do limite utilizado.`,
                action: 'Contas',
                actionLabel: 'Ver cartões'
            };
        }
        if (selection.priority === PRIORITY_KEYS.ANORA_RECOMMENDATION) {
            const candidate = selection.anoraRecommendation;
            return {
                priority: selection.priority,
                tone: 'info',
                icon: 'fa-sparkles',
                title: 'Siga a recomendação da Anora',
                detail: candidate.detail || candidate.label || 'Há uma recomendação da Anora pronta para você.',
                action: candidate.payload || candidate.modal || 'Dashboard',
                actionType: candidate.action,
                actionModal: candidate.modal,
                actionLabel: candidate.label || 'Ver recomendação'
            };
        }
        if (selection.priority === PRIORITY_KEYS.INFORMATIONAL) {
            return {
                priority: selection.priority,
                tone: 'warning',
                icon: 'fa-calendar-day',
                title: 'Antecipe os próximos vencimentos',
                detail: describe(selection.upcoming, 'conta próxima', 'contas próximas', 'programadas até o fim do mês.'),
                action: 'Agendamentos',
                actionLabel: 'Ver próximos vencimentos'
            };
        }
        return null;
    },

    nextDecisionBlock: (atual = {}, context = {}) => {
        const decision = DashboardComponents.nextDecision(atual, context);
        if (!decision) return '';
        const escape = value => Utils.escapeHTML(value == null ? '' : String(value));
        const actionAttributes = decision.actionType === 'openModal'
            ? `data-action="openModal" data-modal="${escape(decision.actionModal)}"`
            : `data-action="navigate" data-payload="${escape(decision.action)}"`;
        return `<section class="nv-dashboard-attention nv-dashboard-decision is-${escape(decision.tone)}" aria-labelledby="nv-dashboard-decision-title" aria-live="polite"><header class="nv-dashboard-attention__header"><div><p class="nv-dashboard-eyebrow">Próxima decisão</p><h3 id="nv-dashboard-decision-title">Ação recomendada</h3></div><i class="fa-solid ${escape(decision.icon)}" aria-hidden="true"></i></header><div class="nv-dashboard-attention-item is-${escape(decision.tone)}"><span class="nv-dashboard-attention-item__icon" aria-hidden="true"><i class="fa-solid ${escape(decision.icon)}"></i></span><div class="nv-dashboard-attention-item__copy"><strong>${escape(decision.title)}</strong><p>${escape(decision.detail)}</p></div><button type="button" ${actionAttributes} class="nv-dashboard-attention-item__action" aria-label="${escape(decision.actionLabel)}">${escape(decision.actionLabel)}<i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></div></section>`;
    },

    // Alias kept descriptive for callers that render the decision section
    // directly, without changing the nextDecision data contract.
    decisionBlock: (atual = {}, context = {}) => DashboardComponents.nextDecisionBlock(atual, context),

    attentionStrip: (atual = {}, context = {}) => {
        const selection = resolvePriority({ ...atual, ...context });
        if (!selection.priority || context.excludePriority === selection.priority) return '';
        const escape = value => Utils.escapeHTML(value == null ? '' : String(value));
        const labelsFor = items => {
            const labels = [...new Set(items.map(item => item.nome || item.modelo || item.categoria || 'Item').filter(Boolean))];
            return labels.length <= 2 ? labels.join(' e ') : `${labels.slice(0, 2).join(', ')} e mais ${labels.length - 2}`;
        };
        const describe = (items, singular, plural, suffix = 'aguardando regularização.') => {
            const total = items.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
            const countLabel = `${items.length} ${items.length === 1 ? singular : plural}`;
            return total > 0 ? `${countLabel} · ${Utils.formatMoney(total)} ${suffix}` : `${countLabel} ${suffix}`;
        };
        let alert;
        if (selection.priority === PRIORITY_KEYS.OVERDUE) {
            alert = {
                tone: 'danger', icon: 'fa-triangle-exclamation', title: 'Há contas vencidas',
                detail: describe(selection.overdue, 'conta vencida', 'contas vencidas'),
                action: 'navigate', payload: 'Agendamentos', actionLabel: 'Ver contas vencidas'
            };
        } else if (selection.priority === PRIORITY_KEYS.NEGATIVE_BALANCE) {
            alert = {
                tone: 'danger', icon: 'fa-arrow-trend-down', title: 'Saldo global negativo',
                detail: `O saldo de todas as contas está em ${Utils.formatMoney(selection.balance)}.`,
                action: 'navigate', payload: 'Contas', actionLabel: 'Ver contas'
            };
        } else if (selection.priority === PRIORITY_KEYS.OVER_BUDGET) {
            const label = labelsFor(selection.overBudget);
            alert = {
                tone: 'warning', icon: 'fa-chart-pie', title: 'Orçamento ultrapassado',
                detail: `${label} ${selection.overBudget.length === 1 ? 'ultrapassou' : 'ultrapassaram'} o limite definido.`,
                action: 'navigate', payload: 'Orcamento', actionLabel: 'Revisar orçamento'
            };
        } else if (selection.priority === PRIORITY_KEYS.HIGH_CARD_USAGE) {
            const label = labelsFor(selection.highCardUsage);
            alert = {
                tone: 'warning', icon: 'fa-credit-card', title: 'Limite de cartão em atenção',
                detail: `${label} ${selection.highCardUsage.length === 1 ? 'está' : 'estão'} com pelo menos 80% do limite utilizado.`,
                action: 'navigate', payload: 'Contas', actionLabel: 'Ver cartões'
            };
        } else if (selection.priority === PRIORITY_KEYS.ANORA_RECOMMENDATION) {
            const candidate = selection.anoraRecommendation;
            alert = {
                tone: 'info', icon: 'fa-sparkles', title: 'Recomendação da Anora',
                detail: candidate.detail || candidate.label || 'Há uma recomendação da Anora pronta para você.',
                action: candidate.action, payload: candidate.payload, modal: candidate.modal,
                actionLabel: candidate.label || 'Ver recomendação'
            };
        } else if (selection.priority === PRIORITY_KEYS.INFORMATIONAL) {
            alert = {
                tone: 'warning', icon: 'fa-calendar-day', title: 'Próximos vencimentos',
                detail: describe(selection.upcoming, 'conta próxima', 'contas próximas', 'programadas até o fim do mês.'),
                action: 'navigate', payload: 'Agendamentos', actionLabel: 'Ver próximos vencimentos'
            };
        }
        if (!alert) return '';
        const actionAttributes = alert.action === 'openModal'
            ? `data-action="openModal" data-modal="${escape(alert.modal)}"`
            : `data-action="navigate" data-payload="${escape(alert.payload)}"`;
        const item = `<li class="nv-dashboard-attention-item is-${alert.tone}"><span class="nv-dashboard-attention-item__icon" aria-hidden="true"><i class="fa-solid ${alert.icon}"></i></span><div class="nv-dashboard-attention-item__copy"><strong>${escape(alert.title)}</strong><p>${escape(alert.detail)}</p></div><button type="button" ${actionAttributes} class="nv-dashboard-attention-item__action" aria-label="${escape(alert.actionLabel)}">${escape(alert.actionLabel)}<i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></li>`;
        return `<section class="nv-dashboard-attention" aria-labelledby="nv-dashboard-attention-title" aria-live="polite"><header class="nv-dashboard-attention__header"><div><p class="nv-dashboard-eyebrow">Ação recomendada</p><h3 id="nv-dashboard-attention-title">Atenção agora</h3></div><i class="fa-solid fa-bolt" aria-hidden="true"></i></header><ul class="nv-dashboard-attention__list">${item}</ul></section>`;
    },

    insightsSection: (mentoria, context = {}) => {
        let btnHtml = '';
        const typedActions = {
            budget: { action: 'navigate', payload: 'Planejamento', label: 'Revisar orçamento' },
            overdue: { action: 'navigate', payload: 'Agendamentos', label: 'Regularizar pendências' }
        };
        const anoraCandidate = mentoria.onboardingAction || mentoria.actionableAction || typedActions[mentoria.recommendationType] || (!mentoria.isOnboarding ? { action: 'navigate', payload: 'Dashboard', label: 'Voltar à visão geral' } : null);
        const selection = resolvePriority({ ...context, anoraRecommendation: anoraCandidate });
        const higherPriority = [PRIORITY_KEYS.OVERDUE, PRIORITY_KEYS.NEGATIVE_BALANCE, PRIORITY_KEYS.OVER_BUDGET, PRIORITY_KEYS.HIGH_CARD_USAGE, PRIORITY_KEYS.INFORMATIONAL].includes(selection.priority);
        // The single prioritized dashboard decision owns urgent routes; Anora's
        // compact CTA remains available when it is the winning recommendation.
        const candidate = higherPriority ? null : anoraCandidate;
        const validNavigation = candidate?.action === 'navigate' && ['Dashboard', 'Planejamento', 'Agendamentos'].includes(candidate.payload);
        const validOnboarding = candidate?.action === 'openModal' && ['modal-banco', 'modal-transacao', 'modal-orcamento'].includes(candidate.modal);
        if (validNavigation) {
            btnHtml = `<button type="button" data-action="navigate" data-payload="${Utils.escapeHTML(candidate.payload)}" class="nv-onboarding-action" aria-label="${Utils.escapeHTML(candidate.label)}"><i class="fa-solid fa-bolt" aria-hidden="true"></i> ${Utils.escapeHTML(candidate.label)}</button>`;
        } else if (validOnboarding) {
            btnHtml = `<button type="button" data-action="openModal" data-modal="${Utils.escapeHTML(candidate.modal)}" ${candidate.type ? `data-type="${Utils.escapeHTML(candidate.type)}"` : ''} class="nv-onboarding-action" aria-label="${Utils.escapeHTML(candidate.label)}"><i class="fa-solid fa-bolt" aria-hidden="true"></i> ${Utils.escapeHTML(candidate.label)}</button>`;
        }

        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const mesAtual = meses[new Date().getMonth()];
        const trendBadge = mentoria.trend > 0 ? `<span class="bg-success text-white px-2 py-0.5 rounded-md text-[10px] ml-2 shadow-sm whitespace-nowrap">▲ +${mentoria.trend} pts</span>` : (mentoria.trend < 0 ? `<span class="bg-danger text-white px-2 py-0.5 rounded-md text-[10px] ml-2 shadow-sm whitespace-nowrap">▼ ${mentoria.trend} pts</span>` : '');
        const primeiroInsight = mentoria.insights?.[0] || 'A Anora está analisando seus dados financeiros.';

        const levelBadges = {
            1: '<span class="nv-insight-badge nv-insight-badge--neutral"><i class="fa-solid fa-seedling" aria-hidden="true"></i> Nível 1: Explorador</span>',
            2: '<span class="nv-insight-badge nv-insight-badge--positive"><i class="fa-solid fa-piggy-bank" aria-hidden="true"></i> Nível 2: Poupador</span>',
            3: '<span class="nv-insight-badge nv-insight-badge--attention"><i class="fa-solid fa-chess-knight" aria-hidden="true"></i> Nível 3: Estrategista</span>'
        };
        const badgeHtml = mentoria.isOnboarding ? '' : (levelBadges[mentoria.userLevel] || levelBadges[1]);
        const diagnosisHtml = (mentoria.insights || []).map(insight => `
            <div class="nv-insight-item flex items-start">
                <i class="fa-solid fa-angle-right mt-1 text-[10px] text-brand-medium" aria-hidden="true"></i>
                <p class="text-sm text-text-primary leading-relaxed font-medium">${Utils.escapeHTML(insight)}</p>
            </div>
        `).join('');

        return `
        <section class="nv-insight-panel relative" aria-label="Insight contextual da Anora">
            <div class="nv-insight-panel__content relative z-10">
                <div class="nv-insight-panel__score-column">
                    <div class="nv-insight-score rounded-full shadow-inner border" aria-label="Pontuação da mentoria">${mentoria.score}</div>
                    <span class="nv-insight-panel__diagnosis text-[10px] font-black uppercase tracking-widest text-brand-medium flex items-center justify-center flex-wrap gap-1">Diagnóstico Estratégico <br> ${mesAtual} ${trendBadge}</span>
                    <span class="nv-insight-panel__classification text-sm font-bold text-text-primary bg-bg px-3 py-1 rounded-full border border-border">${Utils.escapeHTML(mentoria.classification)}</span>
                    ${badgeHtml}
                </div>

                <div class="nv-insight-panel__body">
                    <div class="nv-insight-panel__lead">
                        <p class="nv-insight-panel__lead-label text-[10px] font-black uppercase tracking-widest text-brand-medium">Insight mais relevante</p>
                        <p class="text-sm text-text-primary leading-relaxed font-medium">${Utils.escapeHTML(primeiroInsight)}</p>
                    </div>
                    <div class="nv-insight-panel__recommendation border shadow-inner">
                        <h4 class="nv-insight-panel__recommendation-title text-[10px] font-black uppercase flex items-center gap-2 text-brand-medium"><i class="fa-solid fa-crosshairs" aria-hidden="true"></i> Diretriz Executiva</h4>
                        <p class="text-[15px] font-bold text-text-primary leading-tight font-mentor tracking-wide">${Utils.escapeHTML(mentoria.recommendation)}</p>
                        ${btnHtml}
                    </div>
                    <details class="nv-insight-details">
                        <summary>Ver diagnóstico <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
                        <div class="nv-insight-details__content">
                            <p class="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">Todos os insights</p>
                            <div class="nv-insight-list">${diagnosisHtml}</div>
                        </div>
                    </details>
                </div>
            </div>
        </section>`;
    },

    dashboardPillars: (pillars) => {
        const getPillarConfig = (score, name) => {
            let status, icon, color;
            if (score >= 80) status = 'Excelente'; 
            else if (score >= 60) status = 'Equilibrado'; 
            else if (score >= 40) status = 'Atenção'; 
            else status = 'Crítico'; 

            if(name === 'fluxoCaixa') { icon = 'fa-arrow-trend-up'; color = 'text-success'; } 
            else if(name === 'reservas') { icon = 'fa-shield-halved'; color = 'text-success'; } 
            else if(name === 'credito') { icon = 'fa-credit-card'; color = 'text-info'; } 
            else if(name === 'futuro') { icon = 'fa-road'; color = 'text-text-secondary'; } 

            if (status === 'Atenção') color = 'text-warning';
            if (status === 'Crítico') color = 'text-danger';

            return { status, icon, color };
        };

        const renderCard = (key, title, desc) => {
            const score = pillars[key];
            const cfg = getPillarConfig(score, key);
            
            let feedbackText = 'text-text-secondary';
            if(cfg.status === 'Excelente' || cfg.status === 'Equilibrado') feedbackText = 'text-success';
            if(cfg.status === 'Atenção') feedbackText = 'text-warning';
            if(cfg.status === 'Crítico') feedbackText = 'text-danger';

            return `
            <div class="nv-dashboard-card nv-dashboard-pillar-card flex flex-col justify-between group">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-[12px] bg-bg border border-border ${cfg.color} flex items-center justify-center text-lg shadow-sm">
                            <i class="fa-solid ${cfg.icon}"></i>
                        </div>
                        <div>
                            <h4 class="font-black text-text-primary text-[13px] uppercase tracking-wide font-primary">${title}</h4>
                            <span class="text-[9px] font-black uppercase tracking-wider ${feedbackText}">${cfg.status}</span>
                        </div>
                    </div>
                    <span class="text-xl font-black font-mono text-text-primary">${score}<span class="text-xs text-text-secondary font-sans">/100</span></span>
                </div>
                <div>
                    <div class="w-full bg-border rounded-full h-[6px] mb-2.5 overflow-hidden">
                        <div class="bg-text-primary h-[6px] rounded-full transition-all duration-1000" style="width: ${score}%"></div>
                    </div>
                    <p class="text-[10px] text-text-secondary leading-relaxed font-bold opacity-80">${desc}</p>
                </div>
            </div>`;
        };

        return `
        <section class="nv-dashboard-pillars mb-10" aria-label="Pilares estratégicos">
            <h3 class="font-bold text-text-primary text-base mb-4 tracking-tight flex items-center gap-2 font-primary">
                <i class="fa-solid fa-chart-column text-brand-medium"></i> Pilares Estratégicos
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                ${renderCard('fluxoCaixa', 'Fluxo de Caixa', 'Margem de manobra financeira.')}
                ${renderCard('reservas', 'Reservas', 'Blindagem contra imprevistos.')}
                ${renderCard('credito', 'Crédito', 'Dependência de terceiros.')}
                ${renderCard('futuro', 'O Futuro', 'Peso dos parcelamentos.')}
            </div>
        </section>
        `;
    },

    dashboardAccounts: (bancos = [], cartoes = [], compras = []) => {
        // Identidade local: não depende de serviços externos para renderizar o Dashboard.
        const logo = (nome, cor) => { const iniciais = String(nome || 'C').slice(0, 2).toUpperCase(); return `<div class="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-border bg-bg" style="color:${cor || 'var(--c-brand-medium)'}"><span class="text-[10px] font-black">${Utils.escapeHTML(iniciais)}</span></div>`; };
        const contasHtml = bancos.length ? bancos.map(b => `<div class="nv-dashboard-account-row flex items-center gap-3 py-2.5 border-b border-border last:border-0"><span>${logo(b.instituicao || b.nome, b.cor)}</span><span class="flex-1 min-w-0 text-xs text-text-primary truncate"><strong class="block truncate">${Utils.escapeHTML(b.nome || b.instituicao || 'Conta')}</strong><small class="text-[10px] text-text-secondary">${Utils.escapeHTML(b.instituicao || 'Conta')}</small></span><strong class="text-xs font-mono text-success">${Utils.formatMoney(b.saldo || 0)}</strong></div>`).join('') : '<p class="text-xs text-text-secondary">Nenhuma conta cadastrada.</p>';
        const cartoesHtml = cartoes.length ? cartoes.map(c => { const limite = Number(c.limite || c.limiteTotal || 0); const usado = compras.filter(t => String(t.cartaoId || t.bancoId) === String(c.id)).reduce((s,t) => s + (Number(t.valor)||0), 0); const disponivel = Math.max(limite - usado, 0); const pct = limite ? Math.min(usado / limite * 100, 100) : 0; const cor = pct > 80 ? 'bg-credit' : pct > 50 ? 'bg-brand-medium' : 'bg-success'; const banco = bancos.find(b => String(b.id) === String(c.bancoId)); return `<div class="nv-dashboard-card-row flex items-center gap-3 py-2.5 border-b border-border last:border-0"><span>${logo(banco?.instituicao || c.nome, banco?.cor)}</span><div class="flex-1 min-w-0"><div class="flex justify-between gap-3"><span class="text-xs text-text-primary truncate">${Utils.escapeHTML(c.nome || 'Cartão')}</span><strong class="text-xs font-mono text-success whitespace-nowrap">${Utils.formatMoney(disponivel)}</strong></div><div class="flex justify-between text-[10px] text-text-secondary mt-1"><span>disponível</span><span>limite ${Utils.formatMoney(limite)}</span></div><div class="w-full h-1.5 bg-border rounded-full mt-1"><div class="${cor} h-1.5 rounded-full" style="width:${pct}%" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100" aria-label="Utilização de ${Utils.escapeHTML(c.nome || 'cartão')}"></div></div></div></div>`; }).join('') : '<p class="text-xs text-text-secondary">Nenhum cartão cadastrado.</p>';
        return `<div class="nv-dashboard-accounts-grid" aria-label="Contas e cartões"><section class="nv-dashboard-card nv-dashboard-accounts nv-dashboard-accounts--bank" aria-label="Contas"><div class="nv-dashboard-accounts__header flex items-center justify-between gap-3 mb-3"><div class="flex items-center gap-2 min-w-0"><i class="fa-solid fa-wallet text-success" aria-hidden="true"></i><div class="min-w-0"><h3 class="font-bold text-text-primary text-base font-primary">Contas</h3><p class="text-[10px] text-text-secondary uppercase tracking-wider">Contas correntes e poupança</p></div></div><span class="nv-dashboard-accounts__count text-[10px] font-bold text-success bg-bg px-2 py-1 rounded-full whitespace-nowrap">${bancos.length}</span></div><div class="nv-dashboard-accounts__list">${contasHtml}</div></section><section class="nv-dashboard-card nv-dashboard-accounts nv-dashboard-accounts--cards" aria-label="Cartões"><div class="nv-dashboard-accounts__header flex items-center justify-between gap-3 mb-3"><div class="flex items-center gap-2 min-w-0"><i class="fa-regular fa-credit-card text-brand-medium" aria-hidden="true"></i><div class="min-w-0"><h3 class="font-bold text-text-primary text-base font-primary">Cartões</h3><p class="text-[10px] text-text-secondary uppercase tracking-wider">Limite disponível e utilização</p></div></div><span class="nv-dashboard-accounts__count text-[10px] font-bold text-brand-medium bg-brand-soft px-2 py-1 rounded-full whitespace-nowrap">${cartoes.length}</span></div><div class="nv-dashboard-accounts__list">${cartoesHtml}</div></section></div>`;
    },

    dashboardAgenda: (agendamentos = [], receitas = [], state = {}) => {
        const hoje = new Date();
        const ano = Number(state.agendaYear ?? hoje.getFullYear());
        const mes = Number(state.agendaMonth ?? hoje.getMonth());
        const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const diasSemana = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];
        const isoDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const safeDate = (value) => {
            if (!value) return null;
            const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
            return Number.isNaN(date.getTime()) ? null : date;
        };
        const isCompleted = (item) => item.completed === true || item.isCompleted === true || ['pago', 'recebida', 'concluido', 'concluida', 'completed', 'done', 'realizado', 'realizada', 'quitado', 'quitada', 'liquidado', 'liquidada'].includes(item.status);
        const itens = [
            ...agendamentos.map(item => ({ ...item, dataAgenda: item.dataVencimento || item.data, origem: 'agendamento' })),
            ...receitas.map(item => ({ ...item, dataAgenda: item.data || item.dataVencimento, origem: 'receita' }))
        ].map(item => ({ ...item, dataObj: safeDate(item.dataAgenda) })).filter(item => item.dataObj);
        const porData = {};
        itens.forEach(item => { (porData[isoDate(item.dataObj)] ||= []).push(item); });
        const selectedDate = state.agendaSelectedDate || state.selectedAgendaDate || '';
        const firstOfMonth = new Date(ano, mes, 1);
        // JS starts on Sunday; rotate it so the visible week starts on Monday.
        const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
        const gridStart = new Date(ano, mes, 1 - mondayOffset);
        const cells = [];
        for (let index = 0; index < 42; index += 1) {
            const date = new Date(gridStart);
            date.setDate(gridStart.getDate() + index);
            const dateKey = isoDate(date);
            const lista = porData[dateKey] || [];
            const isOutside = date.getMonth() !== mes;
            const isToday = dateKey === isoDate(hoje);
            const isSelected = dateKey === selectedDate;
            const hasCommitment = lista.some(item => item.origem === 'agendamento' || item.origem === 'receita');
            const hasDueDate = lista.some(item => item.origem === 'agendamento' && !isCompleted(item));
            const hasCompleted = lista.some(isCompleted);
            const dots = [
                hasCommitment ? '<span class="calendar-dot calendar-dot--commitment" aria-hidden="true"></span>' : '',
                hasDueDate ? '<span class="calendar-dot calendar-dot--due-date" aria-hidden="true"></span>' : '',
                hasCompleted ? '<span class="calendar-dot calendar-dot--completed" aria-hidden="true"></span>' : ''
            ].join('');
            const states = [isOutside ? 'is-outside' : '', isToday ? 'is-today agenda-day--today' : '', isSelected ? 'is-selected' : '', lista.length ? 'agenda-day--has-items' : ''].filter(Boolean).join(' ');
            const label = `${date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${lista.length ? `, ${lista.length} ${lista.length === 1 ? 'item' : 'itens'}` : ''}`;
            cells.push(`<button type="button" data-action="showAgendaDay" onclick="App.showAgendaDay('${dateKey}')" data-payload="${dateKey}" class="calendar-day agenda-day ${states}" aria-label="${Utils.escapeHTML(label)}" aria-current="${isToday ? 'date' : 'false'}" aria-pressed="${isSelected ? 'true' : 'false'}"><span class="calendar-day-number">${date.getDate()}</span>${dots ? `<span class="calendar-day-dots" aria-label="Indicadores do dia">${dots}</span>` : '<span class="calendar-day-dots" aria-hidden="true"></span>'}</button>`);
        }
        return `<section class="nv-dashboard-card nv-dashboard-agenda agenda-calendar" aria-label="Agenda financeira"><header class="calendar-header"><div><p class="calendar-eyebrow">Planejamento</p><h3 class="calendar-title">Agenda financeira</h3><p class="calendar-subtitle">${nomes[mes]} de ${ano} · selecione um dia para ver os detalhes</p></div><div class="calendar-controls"><button type="button" data-action="resetAgendaToday" class="calendar-today" aria-label="Ir para hoje">Hoje</button><div class="calendar-nav" role="group" aria-label="Navegação da agenda"><button type="button" data-action="changeAgendaMonth" data-dir="-1" class="calendar-nav-button" aria-label="Mês anterior"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button><button type="button" data-action="changeAgendaMonth" data-dir="1" class="calendar-nav-button" aria-label="Próximo mês"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button></div></div></header><div class="calendar-weekdays agenda-weekdays" aria-hidden="true">${diasSemana.map(dia => `<span>${dia}</span>`).join('')}</div><div class="calendar-grid agenda-grid" role="grid" aria-label="${nomes[mes]} de ${ano}">${cells.join('')}</div><footer class="calendar-legend" aria-label="Legenda da agenda"><span><i class="calendar-legend-dot calendar-legend-dot--commitment" aria-hidden="true"></i>Compromisso</span><span><i class="calendar-legend-dot calendar-legend-dot--due-date" aria-hidden="true"></i>Vencimento</span><span><i class="calendar-legend-dot calendar-legend-dot--completed" aria-hidden="true"></i>Concluído</span></footer></section>`;
    },

    dashboardCategories: (transacoesPeriodoAtual, periodLabel = 'Este ano') => {
        const cats = {};
        transacoesPeriodoAtual.filter(isExpense).forEach(t => { 
            cats[t.categoria] = (cats[t.categoria] || 0) + t.valor; 
        });
        
        const sortedCats = Object.entries(cats).sort((a,b) => b[1] - a[1]).slice(0, 7); 
        const maxVal = sortedCats.length > 0 ? sortedCats[0][1] : 1;

        const listHtml = sortedCats.map(c => {
            const pctBar = (c[1] / maxVal) * 100;
            const catObj = CoreComponents._getCategoryConfig(c[0]);
            
            return `
            <div data-key="cat_${Utils.escapeHTML(c[0])}" class="flex items-center gap-4 py-3 group">
                <div class="w-10 h-10 rounded-[12px] flex items-center justify-center text-white bg-bg border border-border text-sm shadow-sm group-hover:scale-110 transition-transform" style="background-color: ${catObj.cor}">
                    <i class="fa-solid ${catObj.icone}"></i>
                </div>
                <div class="w-28 text-sm font-medium text-text-primary">${Utils.escapeHTML(c[0])}</div>
                <div class="w-24 text-sm font-bold text-text-primary text-right pr-4 font-mono">${Utils.formatMoney(c[1]).replace(',00','')}</div>
                <div class="flex-1 flex items-center gap-3">
                    <div class="w-full bg-border rounded-full h-[6px] flex-1">
                        <div class="h-[6px] rounded-full transition-all duration-1000" style="width: ${Utils.escapeHTML(pctBar)}%; background-color: ${catObj.cor}"></div>
                    </div>
                </div>
            </div>`;
        }).join('');

        const safePeriodLabel = Utils.escapeHTML(periodLabel == null ? 'Este ano' : String(periodLabel));
        const emptyState = `
            <div class="nv-dashboard-categories__empty text-center py-10 px-4 bg-bg rounded-[16px] border border-dashed border-border">
                <i class="fa-solid fa-chart-pie text-brand-soft text-4xl mb-3 block" aria-hidden="true"></i>
                <h4 class="text-sm font-bold text-text-primary mb-1">Nenhuma despesa em ${safePeriodLabel}</h4>
                <p class="text-sm text-text-secondary mb-5">Registre uma despesa para acompanhar suas categorias neste período.</p>
                <button type="button" data-action="openModal" data-modal="modal-transacao" data-type="despesa" class="nv-dashboard-categories__empty-action"><i class="fa-solid fa-plus" aria-hidden="true"></i> Adicionar despesa</button>
            </div>
        `;

        return `
        <section class="nv-dashboard-card nv-dashboard-categories" aria-label="Principais categorias">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-bold text-text-primary text-lg font-primary">Principais Categorias</h3>
                <button data-action="navigate" data-payload="Categorias" class="text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">Ver todas &rarr;</button>
            </div>
            <div class="space-y-1">
                ${listHtml || emptyState}
            </div>
        </section>`;
    },

    dashboardRecentTransactions: (transacoes, mentoria = null) => {
        const grouped = {};
        transacoes.forEach(t => {
            let dataObj = new Date();
            if (t.data) {
                const parsed = new Date(t.data + 'T12:00:00');
                if (!isNaN(parsed.getTime())) dataObj = parsed;
            }
            
            let dataFormatada;
            try {
                dataFormatada = dataObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase();
            } catch(e) {
                dataFormatada = 'DATA INVÁLIDA';
            }

            if(!grouped[dataFormatada]) grouped[dataFormatada] = [];
            grouped[dataFormatada].push(t);
        });

        let listHtml = '';
        let txCount = 0;
        let interventionAdded = false;

        for (const [data, items] of Object.entries(grouped)) {
            listHtml += `<div class="mt-6 first:mt-0" data-key="group_${data}"><h4 class="text-[10px] font-bold text-text-secondary tracking-wider mb-3 uppercase">${Utils.escapeHTML(data)}</h4>`;
            
            items.forEach(t => {
                const isRec = isTransferTransaction(t)
                    ? (t.transferenciaEntrada === true || String(t.bancoId) === String(t.contaDestinoId))
                    : isIncome(t);
                const signal = isRec ? '+' : '-';
                const valColor = isRec ? 'text-success' : 'text-danger'; 
                const txId = t.codigoRef || `TX-${t.id.toString(36).substring(0,6).toUpperCase()}`;
                
                const catObj = CoreComponents._getCategoryConfig(t.categoria);

                listHtml += `
                <div data-key="${t.id}" class="flex items-center justify-between py-3 border-b border-bg last:border-0 hover:bg-bg px-2 -mx-2 rounded-[12px] transition-colors cursor-pointer group">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-[12px] flex items-center justify-center text-white border border-border" style="background-color: ${catObj.cor}">
                            <i class="fa-solid ${catObj.icone}"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm font-bold text-text-primary leading-tight font-primary">${Utils.escapeHTML(t.desc)}</p>
                                <span class="text-[9px] font-mono text-text-secondary bg-surface border border-border px-1.5 py-0.5 rounded" title="ID de Registro">#${txId}</span>
                            </div>
                            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-wider text-white" style="background-color: ${catObj.cor}99">${Utils.escapeHTML(t.categoria)}</span>
                        </div>
                    </div>
                    <div class="text-right flex flex-col items-end">
                        <span class="block text-sm font-bold ${valColor} font-mono tracking-tight">${signal} ${Utils.formatMoney(t.valor)}</span>
                        <button data-action="openEditModal" data-id="${t.id}" class="text-[10px] text-brand-medium hover:text-brand-deep opacity-0 group-hover:opacity-100 transition-opacity mt-1 block font-medium"><i class="fa-solid fa-pen mr-1"></i> Detalhes</button>
                    </div>
                </div>`;
                
                txCount++;

                if (!interventionAdded && txCount === 2 && mentoria && !mentoria.isOnboarding && mentoria.insights && mentoria.insights.length > 0) {
                    const insightText = mentoria.insights[mentoria.insights.length - 1];
                    listHtml += `
                    <div class="my-4 p-4 rounded-[16px] bg-brand-soft/20 border border-brand-medium/30 flex items-start gap-4 relative overflow-hidden group">
                        <div class="absolute -right-6 -top-6 w-24 h-24 bg-brand-medium/10 rounded-full blur-xl pointer-events-none"></div>
                        <div class="w-10 h-10 rounded-full bg-brand-deep text-brand-soft flex items-center justify-center text-lg shadow-sm shrink-0 border border-brand-medium/50 font-mentor">A</div>
                        <div>
                            <h4 class="text-[10px] font-black uppercase tracking-widest text-brand-deep mb-1 opacity-80">Insight em tempo real</h4>
                            <p class="text-[13px] font-bold text-text-primary leading-tight font-primary pr-2">${Utils.escapeHTML(insightText)}</p>
                        </div>
                    </div>`;
                    interventionAdded = true;
                }
            });
            listHtml += `</div>`;
        }

        const emptyState = `
            <div class="text-center py-10 px-4 bg-bg rounded-[16px] border border-dashed border-border">
                <i class="fa-solid fa-receipt text-brand-soft text-4xl mb-3 block"></i>
                <p class="text-sm text-text-secondary">Nenhuma transação no período.</p>
            </div>
        `;

        return `
        <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft">
            <div class="flex justify-between items-center mb-2">
                <h3 class="font-bold text-text-primary text-lg font-primary">Transações Recentes</h3>
                <button data-action="navigate" data-payload="Transacoes" class="text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">Ver todas &rarr;</button>
            </div>
            <div>
                ${listHtml || emptyState}
            </div>
        </div>`;
    }
};