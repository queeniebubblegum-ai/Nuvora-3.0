import { Utils } from './utils.js';
import { CoreComponents } from './cmp-core.js';

export const DashboardComponents = {
    dashboardCards: (atual, anterior) => {
        const calcTrend = (a, b) => {
            if (b === 0) return { val: a > 0 ? 100 : 0, isUp: a > 0 };
            const diff = ((a - b) / b) * 100;
            return { val: Math.abs(diff).toFixed(1), isUp: diff >= 0 };
        };

        // Receitas/despesas are intentionally period-filtered. Saldo atual is
        // the existing global Database.getTotals().saldo passed by the page;
        // none of these values change the underlying financial calculations.
        const resultadoPeriodo = atual.receitas - atual.despesas;
        const resultadoAnterior = anterior.receitas - anterior.despesas;
        const resultadoT = calcTrend(resultadoPeriodo, resultadoAnterior);
        const vencimentos = atual.contasPendentes || 0;
        const resultadoColor = resultadoPeriodo >= 0 ? 'text-success' : 'text-danger';
        const vencimentosColor = vencimentos > 0 ? 'text-danger' : 'text-success';

        const resultadoCard = `
        <div class="nv-dashboard-card nv-summary-card nv-summary-card--result group">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-2">
                    <span class="text-text-primary text-xs font-black uppercase tracking-widest opacity-90">Resultado do período</span>
                    <span class="${resultadoT.isUp ? 'text-success' : 'text-danger'} text-[10px] font-bold flex items-center gap-1 font-mono"><i class="fa-solid ${resultadoT.isUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i> ${resultadoT.val}%</span>
                </div>
                <div class="w-10 h-10 text-brand-medium bg-brand-soft rounded-[12px] flex items-center justify-center text-base shadow-sm group-hover:scale-110 transition-transform"><i class="fa-solid fa-scale-balanced" aria-hidden="true"></i></div>
            </div>
            <h3 class="text-3xl font-bold ${resultadoColor} mb-1 font-mono tracking-tight">${Utils.formatMoney(resultadoPeriodo)}</h3>
            <p class="text-[11px] text-text-secondary font-medium">Receitas ${Utils.formatMoney(atual.receitas)} · Despesas ${Utils.formatMoney(atual.despesas)}</p>
        </div>`;

        const vencimentosCard = `
        <div class="nv-dashboard-card nv-summary-card nv-summary-card--due group">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-2"><span class="text-text-primary text-xs font-black uppercase tracking-widest opacity-90">Próximos vencimentos</span></div>
                <div class="w-10 h-10 ${vencimentos > 0 ? 'text-danger bg-danger/10' : 'text-success bg-success/10'} rounded-[12px] flex items-center justify-center text-base shadow-sm group-hover:scale-110 transition-transform"><i class="fa-solid fa-clock" aria-hidden="true"></i></div>
            </div>
            <h3 class="text-3xl font-bold ${vencimentosColor} mb-1 font-mono tracking-tight">${Utils.formatMoney(vencimentos)}</h3>
            <p class="text-[11px] text-text-secondary font-medium">Contas pendentes até o fim do mês</p>
        </div>`;

        return `
        <div class="nv-dashboard-summary-grid grid grid-cols-1 md:grid-cols-3 gap-6">
            ${CoreComponents._buildSummaryCard('Saldo atual', atual.saldo, '', true, 'fa-wallet', 'Saldo global de todas as contas')}
            ${resultadoCard}
            ${vencimentosCard}
        </div>`;
    },

    insightsSection: (mentoria) => {
        let btnHtml = '';
        if (mentoria.onboardingAction) {
            const { label, action, modal, type } = mentoria.onboardingAction;
            btnHtml = `<button data-action="${action}" data-modal="${modal}" ${type ? `data-type="${type}"` : ''} class="nv-onboarding-action"><i class="fa-solid fa-bolt" aria-hidden="true"></i> ${label}</button>`;
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

    dashboardCategories: (transacoesPeriodoAtual) => {
        const cats = {};
        transacoesPeriodoAtual.filter(t => t.tipo === 'despesa' && !t.transferenciaInterna).forEach(t => { 
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

        const emptyState = `
            <div class="text-center py-10 px-4 bg-bg rounded-[16px] border border-dashed border-border">
                <i class="fa-solid fa-chart-pie text-brand-soft text-4xl mb-3 block"></i>
                <p class="text-sm text-text-secondary">Sem despesas registradas no período.</p>
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
                const isRec = t.transferenciaInterna ? (t.transferenciaEntrada === true || (t.transferenciaInterna && String(t.bancoId) === String(t.contaDestinoId))) : t.tipo === 'receita';
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