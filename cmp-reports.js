import { Utils } from './utils.js';
import { Database } from './db.js';
import { buildCashflowModel, reportPeriodLabel, formatReportDateRange } from './report-data.js';

export const ReportComponents = {
    reportsPage: (database, state, actionsHtml = '', analysisHtml = '') => {
        const reportMeta = {
            fluxo: { eyebrow: 'Movimentação', title: 'Fluxo de Caixa', description: 'Entradas, saídas e fluxo acumulado no período selecionado.', icon: 'fa-arrow-trend-up' },
            compare: { eyebrow: 'Desempenho', title: 'Comparativo', description: 'Receitas e despesas organizadas mês a mês.', icon: 'fa-chart-simple' },
            cartoes: { eyebrow: 'Compromissos', title: 'Cartões', description: 'Projeção de faturas e uso dos cartões.', icon: 'fa-credit-card' },
            patrimonio: { eyebrow: 'Visão patrimonial', title: 'Patrimônio', description: 'Saldos, metas e compromissos em uma visão consolidada.', icon: 'fa-briefcase' }
        };
        const selected = reportMeta[state.reportTab] || reportMeta.fluxo;
        let contentHtml = '';
        if (state.reportTab === 'fluxo') contentHtml = ReportComponents.reportFluxo(database, state);
        else if (state.reportTab === 'compare') contentHtml = ReportComponents.reportComparativo(database, state);
        else if (state.reportTab === 'cartoes') contentHtml = ReportComponents.reportCartoesVisual(database, state);
        else if (state.reportTab === 'patrimonio') contentHtml = ReportComponents.reportPatrimonio(database, state);

        return `
            <section class="nv-reports-workspace" aria-label="Relatórios financeiros">
                <header class="nv-reports-selected-heading" aria-label="Relatório selecionado">
                    <div class="nv-reports-selected-icon"><i class="fa-solid ${selected.icon}"></i></div>
                    <div class="nv-reports-selected-copy"><p>${selected.eyebrow}</p><h1>${selected.title}</h1><span>${selected.description}</span></div>
                    ${actionsHtml ? `<div class="nv-reports-actions" aria-label="Ações dos relatórios">${actionsHtml}</div>` : ''}
                </header>
                ${analysisHtml}
                <div class="nv-reports-navigation nv-reports-context-card" aria-label="Navegação dos relatórios">
                    <div class="nv-reports-navigation-copy">
                        <h2>Relatórios</h2>
                        <p>Análises detalhadas da sua inteligência financeira.</p>
                    </div>
                    <nav class="nv-reports-tabs" aria-label="Tipos de relatório" role="tablist">
                        <button data-action="setReportTab" data-payload="fluxo" role="tab" aria-selected="${state.reportTab === 'fluxo'}" class="nv-reports-tab ${state.reportTab === 'fluxo' ? 'is-active' : ''}"><i class="fa-solid fa-arrow-trend-up"></i><span>Fluxo de Caixa</span></button>
                        <button data-action="setReportTab" data-payload="compare" role="tab" aria-selected="${state.reportTab === 'compare'}" class="nv-reports-tab ${state.reportTab === 'compare' ? 'is-active' : ''}"><i class="fa-solid fa-chart-simple"></i><span>Comparativo</span></button>
                        <button data-action="setReportTab" data-payload="cartoes" role="tab" aria-selected="${state.reportTab === 'cartoes'}" class="nv-reports-tab ${state.reportTab === 'cartoes' ? 'is-active' : ''}"><i class="fa-regular fa-credit-card"></i><span>Cartões</span></button>
                        <button data-action="setReportTab" data-payload="patrimonio" role="tab" aria-selected="${state.reportTab === 'patrimonio'}" class="nv-reports-tab ${state.reportTab === 'patrimonio' ? 'is-active' : ''}"><i class="fa-solid fa-briefcase"></i><span>Patrimônio</span></button>
                    </nav>
                </div>
                <div id="relatorio-export" class="nv-report-export animate-fadeIn">${contentHtml}</div>
            </section>
        `;
    },

    reportFluxo: (db, state = {}) => {
        const period = state.reportCashflowPeriod || 1;
        const model = buildCashflowModel(db, period);
        const liquido = model.entradas - model.saidas;
        const tableRows = model.activeBuckets.map(bucket => `
            <div class="nv-report-table-row">
                <div>${model.isDaily ? `${bucket.date.getDate()} de ${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][bucket.date.getMonth()]}` : bucket.label}</div>
                <div class="is-income">${bucket.entradas > 0 ? '+ ' + Utils.formatMoney(bucket.entradas) : '–'}</div>
                <div class="is-expense">${bucket.saidas > 0 ? '− ' + Utils.formatMoney(bucket.saidas) : '–'}</div>
                <div>${Utils.formatMoney(bucket.acumulado)}</div>
            </div>`).join('');
        const emptyState = `<div class="nv-report-empty" role="status"><i class="fa-regular fa-chart-line"></i><div><strong>Sem movimentações no período</strong><span>Não há receitas ou despesas reais registradas entre ${formatReportDateRange(model)}. O relatório não exibe valores estimados.</span></div></div>`;

        return `
            <div class="nv-report-toolbar mb-6">
                <div><span class="nv-report-filter-label">Período analisado</span><span class="nv-report-filter-context">${reportPeriodLabel(period)} · ${formatReportDateRange(model)}</span></div>
                <label class="nv-report-select-wrap"><span class="sr-only">Selecionar período do fluxo de caixa</span><select data-change="setReportCashflowPeriod" class="nv-report-select">
                    <option value="1" ${period === 1 ? 'selected' : ''}>Mês atual</option>
                    <option value="3" ${period === 3 ? 'selected' : ''}>Últimos 3 meses</option>
                    <option value="6" ${period === 6 ? 'selected' : ''}>Últimos 6 meses</option>
                    <option value="12" ${period === 12 ? 'selected' : ''}>Últimos 12 meses</option>
                </select></label>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 nv-report-metrics">
                <div class="nv-report-metric is-income"><p><i class="fa-solid fa-arrow-trend-up"></i> Entradas</p><h3>${Utils.formatMoney(model.entradas)}</h3></div>
                <div class="nv-report-metric is-expense"><p><i class="fa-solid fa-arrow-trend-down"></i> Saídas</p><h3>${Utils.formatMoney(model.saidas)}</h3></div>
                <div class="nv-report-metric is-net"><p><i class="fa-solid fa-arrow-right-arrow-left"></i> Fluxo líquido</p><h3>${Utils.formatMoney(liquido)}</h3></div>
            </div>
            <div class="nv-report-panel mb-6"><div class="nv-report-panel-heading"><div><h4>Evolução do fluxo</h4><p>${model.isDaily ? 'Acompanhamento diário' : 'Acompanhamento mensal'} · fluxo acumulado no período</p></div></div>
                <div class="relative h-[300px] w-full">${model.hasMovement ? '<canvas id="reportsFluxoChart" aria-label="Gráfico do fluxo acumulado"></canvas>' : emptyState}</div>
            </div>
            <div class="nv-report-panel"><div class="nv-report-panel-heading"><div><h4>Movimentação do período</h4><p>Somente períodos com entradas ou saídas são listados.</p></div></div>
                <div class="nv-report-table-header"><div>${model.isDaily ? 'Data' : 'Mês'}</div><div>Entradas</div><div>Saídas</div><div>Fluxo acumulado</div></div>
                <div class="nv-report-table-body">${tableRows || emptyState}</div>
            </div>
        `;
    },

    reportComparativo: (db, state) => {
        const period = state.reportPeriod || 6;
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const today = new Date();
        let totalRec = 0; let totalDes = 0;
        let tableRows = '';

        for (let i = period - 1; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const tr = Database.getTransacoesPorMes(d.getFullYear(), d.getMonth());
            const rec = tr.filter(t => t.tipo === 'receita' && !t.transferenciaInterna).reduce((a, b) => a + b.valor, 0);
            const des = tr.filter(t => t.tipo === 'despesa' && !t.transferenciaInterna).reduce((a, b) => a + b.valor, 0);
            totalRec += rec; totalDes += des;
            
            const saldo = rec - des;
            const poup = rec > 0 ? (saldo / rec) * 100 : 0;

            tableRows += `
                <div class="flex items-center justify-between p-4 border-b border-border hover:bg-bg transition-colors">
                    <div class="w-1/5 text-sm font-bold text-text-primary">${monthNames[d.getMonth()]} de ${d.getFullYear()}</div>
                    <div class="w-1/5 text-sm font-bold text-success text-center font-mono">${Utils.formatMoney(rec)}</div>
                    <div class="w-1/5 text-sm font-bold text-danger text-center font-mono">${Utils.formatMoney(des)}</div>
                    <div class="w-1/5 text-sm font-bold text-reserve text-center font-mono">${Utils.formatMoney(saldo)}</div>
                    <div class="w-1/5 text-sm font-bold text-text-secondary text-right font-mono">${poup.toFixed(1)}%</div>
                </div>`;
        }

        return `
            <div class="nv-report-toolbar mb-6">
                <div><span class="nv-report-filter-label">Período analisado</span><span class="nv-report-filter-context">Últimos ${period} meses</span></div>
                <select data-change="setReportPeriod" class="nv-report-select">
                    <option value="3" ${period === 3 ? 'selected' : ''}>Últimos 3 meses</option>
                    <option value="6" ${period === 6 ? 'selected' : ''}>Últimos 6 meses</option>
                    <option value="12" ${period === 12 ? 'selected' : ''}>Últimos 12 meses</option>
                </select>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div class="bg-surface border border-border p-6 rounded-[16px] shadow-soft relative hover:-translate-y-1 transition-transform">
                    <p class="text-xs text-text-secondary mb-2 font-bold uppercase tracking-wider">Média de Receitas</p>
                    <h3 class="text-2xl font-bold text-success font-mono">${Utils.formatMoney(totalRec/period)}</h3>
                    <p class="text-[10px] text-text-secondary mt-1">por mês</p>
                </div>
                <div class="bg-surface border border-border p-6 rounded-[16px] shadow-soft relative hover:-translate-y-1 transition-transform">
                    <p class="text-xs text-text-secondary mb-2 font-bold uppercase tracking-wider">Média de Despesas</p>
                    <h3 class="text-2xl font-bold text-danger font-mono">${Utils.formatMoney(totalDes/period)}</h3>
                    <p class="text-[10px] text-text-secondary mt-1">por mês</p>
                </div>
                <div class="bg-surface border border-border p-6 rounded-[16px] shadow-soft relative hover:-translate-y-1 transition-transform">
                    <p class="text-xs text-text-secondary mb-2 font-bold uppercase tracking-wider">Saldo Médio</p>
                    <h3 class="text-2xl font-bold text-reserve font-mono">${Utils.formatMoney((totalRec - totalDes)/period)}</h3>
                    <p class="text-[10px] text-text-secondary mt-1">por mês</p>
                </div>
            </div>

            <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft mb-6">
                <h4 class="font-bold text-text-primary text-sm mb-4 font-primary">Comparativo Mensal</h4>
                <div class="relative h-[300px] w-full"><canvas id="reportsCompChart"></canvas></div>
            </div>

            <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft">
                <h4 class="font-bold text-text-primary text-sm mb-4 font-primary">Detalhamento por Mês</h4>
                <div class="flex text-xs font-bold text-text-secondary uppercase tracking-wider pb-3 border-b border-border px-4">
                    <div class="w-1/5">Mês</div><div class="w-1/5 text-center">Receitas</div><div class="w-1/5 text-center">Despesas</div><div class="w-1/5 text-center">Saldo</div><div class="w-1/5 text-right">Taxa Poupança</div>
                </div>
                <div>${tableRows}</div>
            </div>
        `;
    },

    reportCartoesVisual: (db, state) => {
        const period = state.reportPeriod || 6;
        let totalProx = 0; let ativos = db.cartoes.length;
        const today = new Date();
        
        for (let i = 0; i < period; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const cc = Database.getComprasCartaoPorMes(d.getFullYear(), d.getMonth());
            totalProx += cc.reduce((a,b)=>a+b.valor,0);
        }

        let cartoesList = db.cartoes.map(c => {
            const gasto = db.comprasCartao.filter(dc => dc.cartaoId === c.id).reduce((a,b)=>a+b.valor,0);
            const pct = Math.min((gasto/c.limite)*100, 100);
            return `
            <div class="flex items-center gap-4 py-4 border-b border-border last:border-0">
                <div class="w-10 h-10 rounded-[12px] bg-bg text-credit flex items-center justify-center border border-border"><i class="fa-regular fa-credit-card"></i></div>
                <div class="flex-1">
                    <div class="flex justify-between mb-1"><span class="font-bold text-text-primary">${Utils.escapeHTML(c.nome)}</span><span class="font-bold text-text-primary font-mono">${Utils.formatMoney(gasto)}</span></div>
                    <div class="w-full bg-border h-[6px] rounded-full"><div class="bg-credit h-[6px] rounded-full transition-all duration-1000" style="width: ${Utils.escapeHTML(pct)}%"></div></div>
                </div>
                <div class="text-xs text-text-secondary w-10 text-right font-mono">${pct.toFixed(0)}%</div>
            </div>`;
        }).join('');

        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        let tableRows = '';
        for (let i = 0; i < period; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const mTotal = Database.getComprasCartaoPorMes(d.getFullYear(), d.getMonth()).reduce((a,b)=>a+b.valor,0);
            
            if(mTotal > 0 || i === 0){
                tableRows += `
                <div class="flex items-center justify-between p-4 border-b border-border hover:bg-bg">
                    <div class="w-1/3 text-sm font-bold text-text-primary">${monthNames[d.getMonth()]} ${d.getFullYear()}</div>
                    <div class="w-1/3 text-sm text-text-secondary text-center font-mono">${Utils.formatMoney(mTotal)}</div>
                    <div class="w-1/3 text-sm font-bold text-text-primary text-right font-mono">${Utils.formatMoney(mTotal)}</div>
                </div>`;
            }
        }

        return `
            <div class="nv-report-toolbar mb-6">
                <div><span class="nv-report-filter-label">Período projetado</span><span class="nv-report-filter-context">Próximos ${period} meses</span></div>
                <select data-change="setReportPeriod" class="nv-report-select">
                    <option value="3" ${period === 3 ? 'selected' : ''}>Próximos 3 meses</option>
                    <option value="6" ${period === 6 ? 'selected' : ''}>Próximos 6 meses</option>
                    <option value="12" ${period === 12 ? 'selected' : ''}>Próximos 12 meses</option>
                </select>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div class="bg-surface border border-border p-6 rounded-[16px] shadow-soft hover:-translate-y-1 transition-transform">
                    <p class="text-xs text-text-secondary mb-2 font-bold uppercase tracking-wider">Total Provisionado</p>
                    <h3 class="text-2xl font-bold text-text-primary font-mono">${Utils.formatMoney(totalProx)}</h3>
                    <p class="text-[10px] text-text-secondary mt-1">próximos ${period} meses</p>
                </div>
                <div class="bg-surface border border-border p-6 rounded-[16px] shadow-soft hover:-translate-y-1 transition-transform">
                    <p class="text-xs text-text-secondary mb-2 font-bold uppercase tracking-wider">Média Mensal</p>
                    <h3 class="text-2xl font-bold text-text-primary font-mono">${Utils.formatMoney(totalProx/period)}</h3>
                </div>
                <div class="bg-surface border border-border p-6 rounded-[16px] shadow-soft hover:-translate-y-1 transition-transform">
                    <p class="text-xs text-text-secondary mb-2 font-bold uppercase tracking-wider">Cartões Ativos</p>
                    <h3 class="text-2xl font-bold text-text-primary font-mono">${ativos}</h3>
                </div>
            </div>

            <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft mb-6">
                <h4 class="font-bold text-text-primary text-sm mb-4 font-primary">Projeção de Faturas</h4>
                <div class="relative h-[250px] w-full"><canvas id="reportsCartoesChart"></canvas></div>
            </div>

            <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft mb-6">
                <h4 class="font-bold text-text-primary text-sm mb-4 font-primary">Detalhamento por Cartão</h4>
                <div>${cartoesList || '<p class="text-sm text-text-secondary">Nenhum cartão ativo.</p>'}</div>
            </div>

            <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft">
                <h4 class="font-bold text-text-primary text-sm mb-4 font-primary">Detalhamento Mensal</h4>
                <div class="flex text-xs font-bold text-text-secondary uppercase tracking-wider pb-3 border-b border-border px-4">
                    <div class="w-1/3">Mês</div><div class="w-1/3 text-center">Cartões</div><div class="w-1/3 text-right">Total</div>
                </div>
                <div>${tableRows || '<p class="text-center py-6 text-sm text-text-secondary">Sem faturas projetadas.</p>'}</div>
            </div>
        `;
    },

    reportPatrimonio: (db, state) => {
        const period = state.reportPeriod || 6;
        const saldoBancario = db.bancos.reduce((a,b)=>a+b.saldo,0);
        const metasAcumuladas = db.metas.reduce((a,b)=>a+b.atual,0);
        const dividaCartoes = db.comprasCartao.reduce((a,b)=>a+b.valor,0);
        const patrimonioLiquido = (saldoBancario + metasAcumuladas) - dividaCartoes;

        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const today = new Date();
        let tableRows = '';

        for (let i = period - 1; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            let sB = Math.max(0, saldoBancario - (i * (saldoBancario * 0.15)));
            let sM = Math.max(0, metasAcumuladas - (i * (metasAcumuladas * 0.05)));
            let dC = dividaCartoes;
            let pL = (sB + sM) - dC;
            
            tableRows += `
            <div class="flex items-center justify-between p-4 border-b border-border hover:bg-bg transition-colors">
                <div class="w-1/5 text-sm font-bold text-text-primary">${monthNames[d.getMonth()]} de ${d.getFullYear()}</div>
                <div class="w-1/5 text-sm font-bold text-reserve text-center font-mono">${Utils.formatMoney(sB)}</div>
                <div class="w-1/5 text-sm font-bold text-investment text-center font-mono">${Utils.formatMoney(sM)}</div>
                <div class="w-1/5 text-sm font-bold text-credit text-center font-mono">${Utils.formatMoney(dC)}</div>
                <div class="w-1/5 text-sm font-bold text-text-primary text-right font-mono">${Utils.formatMoney(pL)}</div>
            </div>`;
        }

        return `
            <div class="nv-report-toolbar mb-6">
                <div><span class="nv-report-filter-label">Período de evolução</span><span class="nv-report-filter-context">Últimos ${period} meses</span></div>
                <select data-change="setReportPeriod" class="nv-report-select">
                    <option value="3" ${period === 3 ? 'selected' : ''}>Últimos 3 meses</option>
                    <option value="6" ${period === 6 ? 'selected' : ''}>Últimos 6 meses</option>
                    <option value="12" ${period === 12 ? 'selected' : ''}>Últimos 12 meses</option>
                </select>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div class="bg-surface border border-border p-6 rounded-[16px] shadow-soft hover:-translate-y-1 transition-transform">
                    <p class="text-xs text-text-secondary mb-2 font-bold tracking-wider uppercase">Saldo Bancário</p>
                    <h3 class="text-xl font-bold text-reserve font-mono">${Utils.formatMoney(saldoBancario)}</h3>
                </div>
                <div class="bg-surface border border-border p-6 rounded-[16px] shadow-soft hover:-translate-y-1 transition-transform">
                    <p class="text-xs text-text-secondary mb-2 font-bold tracking-wider uppercase">Metas/Investimentos</p>
                    <h3 class="text-xl font-bold text-investment font-mono">${Utils.formatMoney(metasAcumuladas)}</h3>
                </div>
                <div class="bg-surface border border-border p-6 rounded-[16px] shadow-soft hover:-translate-y-1 transition-transform">
                    <p class="text-xs text-text-secondary mb-2 font-bold tracking-wider uppercase">Dívida Cartões</p>
                    <h3 class="text-xl font-bold text-credit font-mono">${Utils.formatMoney(dividaCartoes)}</h3>
                </div>
                <div class="bg-surface border border-border p-6 rounded-[16px] shadow-soft hover:-translate-y-1 transition-transform border-l-4 border-l-brand-deep">
                    <p class="text-xs font-brand-deep mb-2 font-bold tracking-wider uppercase text-brand-deep">Patrimônio</p>
                    <h3 class="text-xl font-bold text-brand-deep font-mono">${Utils.formatMoney(patrimonioLiquido)}</h3>
                </div>
            </div>

            <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft mb-6">
                <h4 class="font-bold text-text-primary text-sm mb-4 font-primary">Evolução Patrimonial</h4>
                <div class="relative h-[300px] w-full"><canvas id="reportsPatrimonioChart"></canvas></div>
            </div>

            <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft">
                <h4 class="font-bold text-text-primary text-sm mb-4 font-primary">Detalhamento Mensal</h4>
                <div class="flex text-xs font-bold text-text-secondary uppercase tracking-wider pb-3 border-b border-border px-4">
                    <div class="w-1/5">Mês</div><div class="w-1/5 text-center">Saldo Bancário</div><div class="w-1/5 text-center">Metas</div><div class="w-1/5 text-center">Dívida Cartões</div><div class="w-1/5 text-right">Patrimônio</div>
                </div>
                <div>${tableRows}</div>
            </div>
        `;
    }
};