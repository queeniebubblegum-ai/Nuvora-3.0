import { Utils } from './utils.js';
import { db, Database } from './db.js';
import { Components } from './components.js';
import { MentorEngine } from './mentorEngine.js';
import { UIRenderer } from './rnd-ui.js';
import { FinancialAnalytics } from './analytics.js';

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
        let insightMsg = 'Visão funcional e clara dos seus dados.';
        if(saldoAtualGlobal > 0) insightMsg = 'O seu saldo global está positivo.';
        else if (saldoAtualGlobal < 0) insightMsg = 'Atenção estratégica: O fluxo atual encontra-se negativo.';

        // UX ENG FIX: Restaurados os botões de Receita e Despesa. O "Fechar Mês" foi reduzido a um botão utilitário secundário.
        const actionsHtml = `
            <button data-action="iniciarFechamentoMes" class="bg-surface border border-border text-brand-medium px-4 py-2.5 rounded-[12px] text-sm font-bold hover:bg-bg transition-colors shadow-soft hover:-translate-y-0.5 flex items-center gap-2"><i class="fa-solid fa-flag-checkered"></i> <span class="hidden sm:inline">Fechar Mês</span></button>
            <button data-action="openModal" data-modal="modal-simulador" class="bg-surface border border-border text-text-primary px-4 py-2.5 rounded-[12px] text-sm font-bold hover:bg-bg transition-colors shadow-soft hover:-translate-y-0.5 flex items-center gap-2"><i class="fa-solid fa-calculator"></i> <span class="hidden sm:inline">Simular</span></button>
            <button data-action="openModal" data-modal="modal-transacao" data-type="receita" class="bg-success text-white px-4 py-2.5 rounded-[12px] text-sm font-bold hover:bg-success/90 transition-all shadow-success-glow hover:-translate-y-0.5 flex items-center gap-2"><i class="fa-solid fa-plus"></i> Receita</button>
            <button data-action="openModal" data-modal="modal-transacao" data-type="despesa" class="bg-danger text-white px-4 py-2.5 rounded-[12px] text-sm font-bold hover:bg-danger/90 transition-all shadow-danger-glow hover:-translate-y-0.5 flex items-center gap-2"><i class="fa-solid fa-minus"></i> Despesa</button>
        `;
        
        let dateStart, dateEnd;
        let prevDateStart, prevDateEnd;
        const targetYear = new Date().getFullYear();
        const targetMonth = new Date().getMonth();
        
        if (appState.dashboardPeriod === 'este_mes') {
            dateStart = new Date(targetYear, targetMonth, 1);
            dateEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
            prevDateStart = new Date(targetYear, targetMonth - 1, 1);
            prevDateEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);
        } else if (appState.dashboardPeriod === 'mes_passado') {
            dateStart = new Date(targetYear, targetMonth - 1, 1);
            dateEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);
            prevDateStart = new Date(targetYear, targetMonth - 2, 1);
            prevDateEnd = new Date(targetYear, targetMonth - 1, 0, 23, 59, 59);
        } else if (appState.dashboardPeriod === 'trimestre') {
            dateStart = new Date(targetYear, targetMonth - 2, 1);
            dateEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
            prevDateStart = new Date(targetYear, targetMonth - 5, 1);
            prevDateEnd = new Date(targetYear, targetMonth - 2, 0, 23, 59, 59);
        } else if (appState.dashboardPeriod === 'este_ano') {
            dateStart = new Date(targetYear, 0, 1);
            dateEnd = new Date(targetYear, 11, 31, 23, 59, 59);
            prevDateStart = new Date(targetYear - 1, 0, 1);
            prevDateEnd = new Date(targetYear - 1, 11, 31, 23, 59, 59);
        } else if (appState.dashboardPeriod.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const parts = appState.dashboardPeriod.split('-');
            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]) - 1;
            const d = parseInt(parts[2]);
            dateStart = new Date(y, m, d, 0, 0, 0);
            dateEnd = new Date(y, m, d, 23, 59, 59);
            
            const prev = new Date(y, m, d - 1);
            prevDateStart = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate(), 0, 0, 0);
            prevDateEnd = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate(), 23, 59, 59);
        }

        const transacoesPeriodoAtual = db.transacoes.filter(t => {
            const d = new Date((t.data || t.id) + 'T12:00:00');
            return d >= dateStart && d <= dateEnd;
        });
        const transacoesAnteriores = db.transacoes.filter(t => {
            const d = new Date((t.data || t.id) + 'T12:00:00');
            return d >= prevDateStart && d <= prevDateEnd;
        });

        const hojeObj = new Date();
        const fimDoMesAtual = new Date(hojeObj.getFullYear(), hojeObj.getMonth() + 1, 0, 23, 59, 59);
        
        const contasPendentesMes = db.agendamentos.filter(a => {
            if (a.status !== 'pendente') return false;
            if (a.tipo === 'receita') return false; 
            const dtVenc = new Date(a.dataVencimento + 'T12:00:00');
            return dtVenc <= fimDoMesAtual;
        }).reduce((acc, curr) => acc + (curr.valor || 0), 0);
        
        const atual = {
            receitas: transacoesPeriodoAtual.filter(t=>t.tipo==='receita').reduce((a,b)=>a+(b.valor||0),0),
            despesas: transacoesPeriodoAtual.filter(t=>t.tipo==='despesa').reduce((a,b)=>a+(b.valor||0),0),
            saldo: Database.getTotals().saldo,
            contasPendentes: contasPendentesMes
        };
        
        const anterior = {
            receitas: transacoesAnteriores.filter(t=>t.tipo==='receita').reduce((a,b)=>a+(b.valor||0),0),
            despesas: transacoesAnteriores.filter(t=>t.tipo==='despesa').reduce((a,b)=>a+(b.valor||0),0)
        };

        const isSpecificDate = appState.dashboardPeriod.match(/^\d{4}-\d{2}-\d{2}$/);
        const dateValue = isSpecificDate ? appState.dashboardPeriod : '';

        const filterHtml = `
        <div class="flex gap-2 border-b border-border pb-4 overflow-x-auto items-center w-full xl:w-auto">
            <button data-action="setDashboardPeriod" data-payload="este_mes" class="px-5 py-2.5 rounded-[12px] text-sm font-bold transition-all whitespace-nowrap ${appState.dashboardPeriod === 'este_mes' ? 'bg-brand-deep text-white shadow-soft' : 'bg-transparent text-text-secondary hover:bg-border'}">Este mês</button>
            <button data-action="setDashboardPeriod" data-payload="mes_passado" class="px-5 py-2.5 rounded-[12px] text-sm font-bold transition-all whitespace-nowrap ${appState.dashboardPeriod === 'mes_passado' ? 'bg-brand-deep text-white shadow-soft' : 'bg-transparent text-text-secondary hover:bg-border'}">Mês passado</button>
            <button data-action="setDashboardPeriod" data-payload="trimestre" class="px-5 py-2.5 rounded-[12px] text-sm font-bold transition-all whitespace-nowrap ${appState.dashboardPeriod === 'trimestre' ? 'bg-brand-deep text-white shadow-soft' : 'bg-transparent text-text-secondary hover:bg-border'}">Trimestre</button>
            <button data-action="setDashboardPeriod" data-payload="este_ano" class="px-5 py-2.5 rounded-[12px] text-sm font-bold transition-all whitespace-nowrap ${appState.dashboardPeriod === 'este_ano' ? 'bg-brand-deep text-white shadow-soft' : 'bg-transparent text-text-secondary hover:bg-border'}">Este ano</button>
            
            <div class="ml-auto flex items-center gap-2">
                <span class="text-xs font-bold text-text-secondary uppercase tracking-wider hidden sm:block">Por dia:</span>
                <input type="date" data-change="setDashboardDate" value="${dateValue}" title="Escolher data específica" class="px-4 py-2 text-text-primary text-sm font-bold bg-surface rounded-[12px] border border-border shadow-sm focus:outline-none focus:border-brand-medium cursor-pointer transition-all ${isSpecificDate ? 'bg-brand-deep text-white border-transparent' : ''}">
            </div>
        </div>`;

        UIRenderer.updateDOM('main-content', `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary mb-1">${saudacao}!</h2>
                    <p class="text-text-secondary text-sm">${insightMsg}</p>
                </div>
                <div class="flex flex-wrap gap-3">
                    ${actionsHtml}
                </div>
            </div>

            ${Components.insightsSection(resultadoMentoria)}
            ${resultadoMentoria.isOnboarding ? '' : Components.dashboardPillars(resultadoMentoria.pillars)}
            
            <div class="mb-10 pt-6 border-t border-border">
                <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
                    <h3 class="font-bold text-text-primary text-base tracking-tight flex items-center gap-2 font-primary">
                        <i class="fa-solid fa-wallet text-brand-medium"></i> Resumo Financeiro
                    </h3>
                    ${filterHtml}
                </div>
                ${Components.dashboardCards(atual, anterior)}
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                ${Components.dashboardCategories(transacoesPeriodoAtual)}
                ${Components.dashboardRecentTransactions(transacoesPeriodoAtual.slice(0, 5), resultadoMentoria)}
            </div>
        `);
    },
    Transacoes: (appState) => {
        const bancoPadraoId = db.bancos.length > 0 ? db.bancos[0].id : '';
        const actionsHtml = `
            <button data-action="exportTransactionsCSV" class="bg-surface border border-border text-text-primary px-5 py-2.5 rounded-[12px] text-sm font-bold hover:bg-bg transition-all shadow-soft flex items-center gap-2"><i class="fa-solid fa-file-export"></i> Exportar CSV</button>
            <button data-action="iniciarImportacaoOFX" data-banco-id="${bancoPadraoId}" class="bg-surface border border-border text-text-primary px-5 py-2.5 rounded-[12px] text-sm font-bold hover:bg-bg transition-all shadow-soft flex items-center gap-2"><i class="fa-solid fa-file-import"></i> Importar OFX</button>
            <button data-action="openModal" data-modal="modal-transacao" data-type="despesa" class="bg-brand-medium text-white px-5 py-2.5 rounded-[12px] text-sm font-bold hover:bg-brand-dark transition-all shadow-brand-glow hover:-translate-y-0.5 flex items-center gap-2"><i class="fa-solid fa-plus"></i> Novo Lançamento</button>
        `;
        
        let filtered = db.transacoes;
        const f = appState.filters;
        
        if(f.desc) {
            const termoBusca = f.desc.toLowerCase();
            filtered = filtered.filter(t => {
                const textoRef = t.codigoRef ? t.codigoRef.toLowerCase() : `tx-${t.id.toString(36).substring(0,6).toLowerCase()}`;
                return t.desc.toLowerCase().includes(termoBusca) || textoRef.includes(termoBusca);
            });
        }
        if(f.categoria) filtered = filtered.filter(t => t.categoria === f.categoria);
        if(f.mes !== '') filtered = filtered.filter(t => new Date(t.data || t.id).getMonth() === parseInt(f.mes));
        if(f.bancoId) {
            const [type, id] = f.bancoId.split('_');
            if(type === 'banco') filtered = filtered.filter(t => !t.isCartao && t.bancoId == id);
            if(type === 'cartao') filtered = filtered.filter(t => t.isCartao && t.bancoId == id);
        }

        filtered.sort((a, b) => new Date(b.data) - new Date(a.data));

        const totalItems = filtered.length;
        const perPage = appState.txPerPage || 10;
        const totalPages = Math.ceil(totalItems / perPage) || 1;
        
        let currentPage = appState.txPage || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * perPage;
        const pagedTransactions = filtered.slice(startIndex, startIndex + perPage);

        let pageButtons = '';
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                pageButtons += `<button data-action="setTxPage" data-payload="${i}" class="w-8 h-8 flex items-center justify-center rounded-[8px] text-sm font-bold transition-colors ${i === currentPage ? 'bg-brand-medium text-white shadow-soft' : 'bg-surface border border-border text-text-secondary hover:bg-border'}">${i}</button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                if (!pageButtons.endsWith('...</span>')) {
                    pageButtons += `<span class="text-text-secondary px-1">...</span>`;
                }
            }
        }

        const paginationHtml = totalItems > 0 ? `
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-border">
                <div class="flex items-center gap-2 text-sm text-text-secondary">
                    <span>Exibir:</span>
                    <select data-change="changeTxPerPage" class="bg-surface border border-border rounded-[8px] p-1.5 text-text-primary outline-none focus:border-brand-medium cursor-pointer">
                        <option value="10" ${perPage === 10 ? 'selected' : ''}>10</option>
                        <option value="20" ${perPage === 20 ? 'selected' : ''}>20</option>
                        <option value="50" ${perPage === 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${perPage === 100 ? 'selected' : ''}>100</option>
                    </select>
                    <span>por página</span>
                </div>
                <div class="flex items-center gap-1">
                    <button data-action="setTxPage" data-payload="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} class="w-8 h-8 flex items-center justify-center rounded-[8px] text-sm font-bold bg-surface border border-border text-text-secondary hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><i class="fa-solid fa-chevron-left"></i></button>
                    ${pageButtons}
                    <button data-action="setTxPage" data-payload="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} class="w-8 h-8 flex items-center justify-center rounded-[8px] text-sm font-bold bg-surface border border-border text-text-secondary hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>
        ` : '';

        UIRenderer.updateDOM('main-content', `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary mb-1">Transações</h2>
                    <p class="text-text-secondary text-sm">Acompanhe e filtre suas movimentações.</p>
                </div>
                <div class="flex flex-wrap gap-3">
                    ${actionsHtml}
                </div>
            </div>

            <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft mb-6 transition-colors duration-300">
                ${Components.filtersSection(f, db.bancos, db.categorias, db.cartoes)}
            </div>
            <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft transition-colors duration-300 flex flex-col min-h-[400px]">
                ${Components.transactionList(pagedTransactions, appState)}
                ${paginationHtml}
            </div>
        `);
    },

    Agendamentos: (appState) => {
        const actionsHtml = `<button data-action="openModal" data-modal="modal-agendamento" class="bg-brand-deep hover:bg-brand-dark text-white px-5 py-2.5 rounded-[12px] text-sm font-bold transition-all shadow-deep-glow flex items-center gap-2 hover:-translate-y-0.5"><i class="fa-solid fa-plus"></i> Nova Conta</button>`;
        
        UIRenderer.updateDOM('main-content', `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary mb-1">Contas a Pagar e Receber</h2>
                    <p class="text-text-secondary text-sm">Gerencie suas obrigações e previsões financeiras.</p>
                </div>
                <div class="flex flex-wrap gap-3">
                    ${actionsHtml}
                </div>
            </div>
            ${Components.agendamentosPage(db, appState)}
        `);
    },

    Planejamento: (appState) => {
        const money = value => Utils.formatMoney(Number(value) || 0);
        const receitas = (db.receitasFuturas || []).filter(i => i.status !== 'recebida');
        const contas = (db.agendamentos || []).filter(i => i.status !== 'pago');
        const assinaturas = (db.assinaturas || []).filter(i => i.ativa !== false);
        const investimentos = db.investimentos || [];
        const totalReceitas = receitas.reduce((sum, i) => sum + (Number(i.valor) || 0), 0);
        const totalContas = contas.filter(i => i.tipo !== 'receita').reduce((sum, i) => sum + (Number(i.valor) || 0), 0);
        const totalAssinaturas = assinaturas.reduce((sum, i) => sum + (Number(i.valor) || 0), 0);
        const list = (items, empty, render) => items.length ? items.slice(0, 8).map(render).join('') : `<p class="text-sm text-text-secondary py-4">${empty}</p>`;

        UIRenderer.updateDOM('main-content', `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div><h2 class="text-2xl font-bold text-text-primary mb-1">Planejamento financeiro</h2><p class="text-text-secondary text-sm">Veja o que já está comprometido e o que está previsto para chegar.</p></div>
                <button data-action="openModal" data-modal="modal-agendamento" class="bg-brand-medium text-white px-5 py-2.5 rounded-[12px] text-sm font-bold shadow-brand-glow"><i class="fa-solid fa-plus mr-2"></i> Novo lançamento futuro</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div class="bg-surface border border-border rounded-[16px] p-5 shadow-soft"><p class="text-xs text-text-secondary font-bold uppercase">Receitas previstas</p><p class="text-2xl font-bold text-success font-mono mt-2">${money(totalReceitas)}</p></div>
                <div class="bg-surface border border-border rounded-[16px] p-5 shadow-soft"><p class="text-xs text-text-secondary font-bold uppercase">Contas pendentes</p><p class="text-2xl font-bold text-danger font-mono mt-2">${money(totalContas)}</p></div>
                <div class="bg-surface border border-border rounded-[16px] p-5 shadow-soft"><p class="text-xs text-text-secondary font-bold uppercase">Assinaturas ativas</p><p class="text-2xl font-bold text-brand-medium font-mono mt-2">${money(totalAssinaturas)}</p></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <details class="bg-surface border border-border rounded-[16px] shadow-soft group"><summary class="cursor-pointer list-none p-4 flex items-center justify-between font-bold text-text-primary"><span><i class="fa-solid fa-arrow-trend-up text-success mr-2"></i>Receita futura</span><i class="fa-solid fa-plus text-success group-open:rotate-45 transition-transform"></i></summary><form data-submit="receitaFutura" class="px-4 pb-4 space-y-2"><input name="desc" required placeholder="Descrição" class="w-full p-2 bg-bg border border-border rounded-lg text-sm text-text-primary"><input name="valor" required type="number" min="0.01" step="0.01" placeholder="Valor" class="w-full p-2 bg-bg border border-border rounded-lg text-sm text-text-primary"><input name="data" required type="date" class="w-full p-2 bg-bg border border-border rounded-lg text-sm text-text-primary"><button class="w-full bg-success text-white p-2 rounded-lg text-sm font-bold">Adicionar</button></form></details>
                <details class="bg-surface border border-border rounded-[16px] shadow-soft group"><summary class="cursor-pointer list-none p-4 flex items-center justify-between font-bold text-text-primary"><span><i class="fa-solid fa-repeat text-brand-medium mr-2"></i>Assinatura</span><i class="fa-solid fa-plus text-brand-medium group-open:rotate-45 transition-transform"></i></summary><form data-submit="assinatura" class="px-4 pb-4 space-y-2"><input name="nome" required placeholder="Nome do serviço" class="w-full p-2 bg-bg border border-border rounded-lg text-sm text-text-primary"><input name="valor" required type="number" min="0.01" step="0.01" placeholder="Valor" class="w-full p-2 bg-bg border border-border rounded-lg text-sm text-text-primary"><select name="periodicidade" class="w-full p-2 bg-bg border border-border rounded-lg text-sm text-text-primary"><option>mensal</option><option>anual</option></select><button class="w-full bg-brand-medium text-white p-2 rounded-lg text-sm font-bold">Adicionar</button></form></details>
                <details class="bg-surface border border-border rounded-[16px] shadow-soft group"><summary class="cursor-pointer list-none p-4 flex items-center justify-between font-bold text-text-primary"><span><i class="fa-solid fa-chart-line text-success mr-2"></i>Investimento</span><i class="fa-solid fa-plus text-success group-open:rotate-45 transition-transform"></i></summary><form data-submit="investimento" class="px-4 pb-4 space-y-2"><input name="nome" required placeholder="Ativo ou instituição" class="w-full p-2 bg-bg border border-border rounded-lg text-sm text-text-primary"><input name="valorAtual" required type="number" min="0" step="0.01" placeholder="Valor atual" class="w-full p-2 bg-bg border border-border rounded-lg text-sm text-text-primary"><button class="w-full bg-success text-white p-2 rounded-lg text-sm font-bold">Adicionar</button></form></details>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section class="bg-surface border border-border rounded-[16px] p-5 shadow-soft"><h3 class="font-bold text-text-primary mb-2"><i class="fa-solid fa-arrow-trend-up text-success mr-2"></i>Receitas futuras</h3>${list(receitas,'Nenhuma receita futura cadastrada.',i=>`<div class="flex justify-between border-b border-border py-3"><span class="text-sm text-text-primary">${Utils.escapeHTML(i.desc || 'Receita prevista')}<small class="block text-xs text-text-secondary">${Utils.escapeHTML(i.data || '')}</small></span><strong class="text-success font-mono">${money(i.valor)}</strong></div>`)}</section>
                <section class="bg-surface border border-border rounded-[16px] p-5 shadow-soft"><h3 class="font-bold text-text-primary mb-2"><i class="fa-solid fa-calendar-xmark text-danger mr-2"></i>Contas a pagar/receber</h3>${list(contas,'Nenhuma conta pendente.',i=>`<div class="flex justify-between border-b border-border py-3"><span class="text-sm text-text-primary">${Utils.escapeHTML(i.desc || 'Lançamento')}<small class="block text-xs text-text-secondary">Vencimento: ${Utils.escapeHTML(i.dataVencimento || '')}</small></span><strong class="${i.tipo === 'receita' ? 'text-success' : 'text-danger'} font-mono">${money(i.valor)}</strong></div>`)}</section>
                <section class="bg-surface border border-border rounded-[16px] p-5 shadow-soft"><h3 class="font-bold text-text-primary mb-2"><i class="fa-solid fa-repeat text-brand-medium mr-2"></i>Assinaturas</h3>${list(assinaturas,'Nenhuma assinatura ativa.',i=>`<div class="flex justify-between border-b border-border py-3"><span class="text-sm text-text-primary">${Utils.escapeHTML(i.nome || i.desc || 'Assinatura')}<small class="block text-xs text-text-secondary">${Utils.escapeHTML(i.periodicidade || 'Mensal')}</small></span><strong class="text-brand-medium font-mono">${money(i.valor)}</strong></div>`)}</section>
                <section class="bg-surface border border-border rounded-[16px] p-5 shadow-soft"><h3 class="font-bold text-text-primary mb-2"><i class="fa-solid fa-chart-line text-success mr-2"></i>Investimentos</h3>${list(investimentos,'Nenhum investimento cadastrado.',i=>`<div class="flex justify-between border-b border-border py-3"><span class="text-sm text-text-primary">${Utils.escapeHTML(i.nome || i.ativo || 'Investimento')}</span><strong class="text-success font-mono">${money(i.valorAtual || i.valor)}</strong></div>`)}</section>
            </div>
        `);
    },

    Contas: (appState) => {
        const bancoPadraoId = db.bancos.length > 0 ? db.bancos[0].id : '';
        const actionsHtml = `
            <button data-action="iniciarImportacaoOFX" data-banco-id="${bancoPadraoId}" class="bg-surface border border-border text-text-primary px-5 py-2.5 rounded-[12px] text-sm font-bold hover:bg-bg transition-all shadow-soft flex items-center gap-2"><i class="fa-solid fa-file-import"></i> Importar OFX</button>
            <button data-action="iniciarImportacaoCSV" data-banco-id="${bancoPadraoId}" class="bg-surface border border-border text-text-primary px-5 py-2.5 rounded-[12px] text-sm font-bold hover:bg-bg transition-all shadow-soft flex items-center gap-2"><i class="fa-solid fa-file-csv"></i> Importar CSV</button>
            <button data-action="openModal" data-modal="modal-banco" class="bg-surface border border-border text-text-primary px-5 py-2.5 rounded-[12px] text-sm font-bold hover:bg-bg transition-all shadow-soft"><i class="fa-solid fa-building-columns mr-2"></i> Nova Conta</button>
            <button data-action="openModal" data-modal="modal-cartao" class="bg-brand-medium text-white px-5 py-2.5 rounded-[12px] text-sm font-bold hover:bg-brand-dark transition-all shadow-brand-glow hover:-translate-y-0.5"><i class="fa-regular fa-credit-card mr-2"></i> Novo Cartão</button>
        `;
        
        const selectBancosCartao = document.getElementById('cartao-bancoId');
        if(selectBancosCartao) {
            const bankOptions = db.bancos.map(b => {
                const displayName = Utils.formatBankName(b);
                return `<option value="${b.id}">${Utils.escapeHTML(displayName)}</option>`;
            }).join('');
            selectBancosCartao.innerHTML = '<option value="" disabled selected>Selecione a conta</option>' + bankOptions;
        }

        UIRenderer.updateDOM('main-content', `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary mb-1">Contas Bancárias</h2>
                    <p class="text-text-secondary text-sm">Gerencie seus saldos e faturas.</p>
                </div>
                <div class="flex flex-wrap gap-3">
                    ${actionsHtml}
                </div>
            </div>
            <details class="bg-surface border border-border rounded-[16px] shadow-soft group" open><summary class="cursor-pointer list-none p-5 flex items-center justify-between font-bold text-text-primary"><span><i class="fa-solid fa-building-columns text-brand-medium mr-2"></i>Contas e cartões</span><i class="fa-solid fa-chevron-down group-open:rotate-180 transition-transform"></i></summary><div class="px-5 pb-5">${Components.contasDashboard(db.bancos, db.cartoes, db.comprasCartao, appState)}</div></details>
        `);
    },

    Metas: (appState) => {
        const actionsHtml = `<button data-action="openModal" data-modal="modal-meta" class="bg-brand-medium text-white px-6 py-2.5 rounded-[12px] font-bold text-sm shadow-brand-glow hover:-translate-y-0.5 transition-all hover:bg-brand-dark"><i class="fa-solid fa-plus mr-2"></i> Criar Meta</button>`;
        
        UIRenderer.updateDOM('main-content', `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary mb-1">Metas e Reservas</h2>
                    <p class="text-text-secondary text-sm">Planeje seus objetivos financeiros.</p>
                </div>
                <div class="flex flex-wrap gap-3">
                    ${actionsHtml}
                </div>
            </div>
            <details class="bg-surface border border-border rounded-[16px] shadow-soft group" open><summary class="cursor-pointer list-none p-5 flex items-center justify-between font-bold text-text-primary"><span><i class="fa-solid fa-bullseye text-brand-medium mr-2"></i>Metas e reservas</span><i class="fa-solid fa-chevron-down group-open:rotate-180 transition-transform"></i></summary><div class="px-5 pb-5">${Components.goalsPage(db.metas, db.transacoes)}</div></details>
        `);
    },

    Orcamento: (appState) => {
        const actionsHtml = `
            <button data-action="openModal" data-modal="modal-orcamento-inteligente" class="bg-surface border border-brand-medium text-brand-medium px-5 py-2.5 rounded-[12px] text-sm font-bold shadow-soft hover:bg-brand-medium hover:text-white transition-all flex items-center gap-2"><i class="fa-solid fa-wand-magic-sparkles"></i> Inteligente</button>
            <button data-action="openModal" data-modal="modal-orcamento" class="bg-brand-medium text-white px-5 py-2.5 rounded-[12px] text-sm font-bold shadow-brand-glow hover:-translate-y-0.5 hover:bg-brand-dark transition-all"><i class="fa-solid fa-plus mr-2"></i> Definir Limite</button>
        `;
        
        UIRenderer.updateDOM('main-content', `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary mb-1">Orçamento Mensal</h2>
                    <p class="text-text-secondary text-sm">Estabeleça limites e controle seus gastos.</p>
                </div>
                <div class="flex flex-wrap gap-3">
                    ${actionsHtml}
                </div>
            </div>
            <details class="bg-surface border border-border rounded-[16px] shadow-soft group" open><summary class="cursor-pointer list-none p-5 flex items-center justify-between font-bold text-text-primary"><span><i class="fa-solid fa-wallet text-brand-medium mr-2"></i>Orçamento mensal</span><i class="fa-solid fa-chevron-down group-open:rotate-180 transition-transform"></i></summary><div class="px-5 pb-5">${Components.budgetView(db.orcamentos, db.transacoes, appState)}</div></details>
        `);
    },

    Relatorios: (appState) => {
        const h = new Date();
        const firstDay = `01/${h.getMonth() < 9 ? '0'+(h.getMonth()+1) : h.getMonth()+1}`;
        const lastDay = new Date(h.getFullYear(), h.getMonth() + 1, 0).getDate();
        const lastDayStr = `${lastDay}/${h.getMonth() < 9 ? '0'+(h.getMonth()+1) : h.getMonth()+1}/${h.getFullYear()}`;

        const actionsHtml = `
            <button class="bg-surface border border-border text-text-primary px-4 py-2.5 rounded-[12px] text-sm font-bold shadow-soft flex items-center gap-2 hover:bg-bg">
                <i class="fa-regular fa-calendar"></i> ${firstDay} - ${lastDayStr}
            </button>
            <button data-action="exportPDF" class="bg-brand-deep text-white px-5 py-2.5 rounded-[12px] text-sm font-bold shadow-soft flex items-center gap-2 hover:bg-brand-dark transition-transform hover:-translate-y-0.5">
                <i class="fa-solid fa-download"></i> Exportar PDF
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
        const categoriasComparadas = FinancialAnalytics.categoryComparison(db.transacoes, { year: anoAtual, month: mesAtual }, { year: anoAnterior, month: mesAnterior }).slice(0, 5);
        const comparacaoCategoriasHtml = categoriasComparadas.length ? categoriasComparadas.map(item => `<div class="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"><span class="text-xs text-text-primary truncate">${Utils.escapeHTML(item.categoria)}</span><span class="text-xs font-bold ${item.diferenca > 0 ? 'text-danger' : item.diferenca < 0 ? 'text-success' : 'text-text-secondary'} font-mono">${item.diferenca > 0 ? '+' : ''}${Utils.formatMoney(item.diferenca)}</span></div>`).join('') : '<p class="text-xs text-text-secondary">Sem dados suficientes para comparar.</p>';
        const insightsHtml = FinancialAnalytics.insights(db.transacoes, anoAtual, mesAtual).map(insight => `<div class="flex gap-2 items-start py-2 border-b border-border last:border-0"><i class="fa-solid fa-lightbulb text-warning mt-0.5"></i><span class="text-xs text-text-primary">${Utils.escapeHTML(insight)}</span></div>`).join('') || '<p class="text-xs text-text-secondary">Ainda não há dados suficientes para gerar insights.</p>';
        const analysisHtml = `
            <details class="bg-surface border border-border rounded-[16px] shadow-soft mb-6 group">
                <summary class="cursor-pointer list-none p-5 flex items-center justify-between font-bold text-text-primary"><span><i class="fa-solid fa-chart-line text-brand-medium mr-2"></i>Análises financeiras</span><i class="fa-solid fa-chevron-down group-open:rotate-180 transition-transform"></i></summary>
                <div class="px-5 pb-5">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                        <div class="bg-bg border border-border rounded-xl p-4"><p class="text-[10px] uppercase font-bold text-text-secondary">Receitas no mês</p><p class="text-lg font-bold text-success font-mono mt-1">${Utils.formatMoney(comparacao.atual.receitas)}</p><p class="text-[10px] text-text-secondary mt-1">${variationText(comparacao.variacaoReceitas)} vs. mês anterior</p></div>
                        <div class="bg-bg border border-border rounded-xl p-4"><p class="text-[10px] uppercase font-bold text-text-secondary">Despesas reais</p><p class="text-lg font-bold text-danger font-mono mt-1">${Utils.formatMoney(comparacao.atual.despesas)}</p><p class="text-[10px] text-text-secondary mt-1">${variationText(comparacao.variacaoDespesas)} vs. mês anterior</p></div>
                        <div class="bg-bg border border-border rounded-xl p-4"><p class="text-[10px] uppercase font-bold text-text-secondary">Resultado do mês</p><p class="text-lg font-bold ${comparacao.atual.receitas - comparacao.atual.despesas >= 0 ? 'text-success' : 'text-danger'} font-mono mt-1">${Utils.formatMoney(comparacao.atual.receitas - comparacao.atual.despesas)}</p><p class="text-[10px] text-text-secondary mt-1">Faturas não duplicadas</p></div>
                    </div>
                    <div class="mb-5"><p class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Insights</p>${insightsHtml}</div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5"><div><p class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Maiores variações por categoria</p>${comparacaoCategoriasHtml}</div><div><p class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Mapa diário de despesas</p><div class="grid grid-cols-7 sm:grid-cols-10 lg:grid-cols-12 gap-1">${heatmapHtml}</div></div></div>
                </div>
            </details>
        `;

        UIRenderer.updateDOM('main-content', `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary mb-1">Relatórios</h2>
                    <p class="text-text-secondary text-sm">Análises detalhadas da sua inteligência financeira.</p>
                </div>
                <div class="flex flex-wrap gap-3">
                    ${actionsHtml}
                </div>
            </div>
            ${analysisHtml}
            ${Components.reportsPage(db, appState)}
        `);
    },

    Categorias: (appState) => {
        UIRenderer.updateDOM('main-content', `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary mb-1">Categorias</h2>
                    <p class="text-text-secondary text-sm">Analise o progresso e personalize as categorias do seu sistema.</p>
                </div>
            </div>
            ${Components.categoriesPage(db, appState)}
        `);
    },

    Configuracoes: (appState) => {
        UIRenderer.updateDOM('main-content', `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary mb-1">Configurações</h2>
                    <p class="text-text-secondary text-sm">Gerencie seu perfil e as configurações do sistema.</p>
                </div>
            </div>
            ${Components.settingsPage(db)}
        `);
    },

    Contatos: (appState) => {
        const actionsHtml = `<button data-action="openModal" data-modal="modal-contato" class="bg-brand-medium text-white px-6 py-2.5 rounded-[12px] font-bold text-sm shadow-brand-glow hover:-translate-y-0.5 hover:bg-brand-dark transition-all"><i class="fa-solid fa-plus mr-2"></i> Novo Registro</button>`;
        
        UIRenderer.updateDOM('main-content', `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary mb-1">Contatos</h2>
                    <p class="text-text-secondary text-sm">Associe nomes às suas transações.</p>
                </div>
                <div class="flex flex-wrap gap-3">
                    ${actionsHtml}
                </div>
            </div>
            ${Components.contatosPage(db.contatos)}
        `);
    }
};