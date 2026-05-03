import { Utils } from './utils.js';
import { Database } from './db.js';

export const ReportComponents = {
    reportsPage: (database, state) => {
        const h = new Date();
        const firstDay = `01/${h.getMonth() < 9 ? '0'+(h.getMonth()+1) : h.getMonth()+1}`;
        const lastDay = new Date(h.getFullYear(), h.getMonth() + 1, 0).getDate();
        const lastDayStr = `${lastDay}/${h.getMonth() < 9 ? '0'+(h.getMonth()+1) : h.getMonth()+1}/${h.getFullYear()}`;
        
        let contentHtml = '';
        if (state.reportTab === 'fluxo') contentHtml = ReportComponents.reportFluxo(database);
        else if (state.reportTab === 'compare') contentHtml = ReportComponents.reportComparativo(database, state);
        else if (state.reportTab === 'cartoes') contentHtml = ReportComponents.reportCartoesVisual(database, state);
        else if (state.reportTab === 'patrimonio') contentHtml = ReportComponents.reportPatrimonio(database, state);

        return `
            <div class="flex gap-2 mb-8 bg-surface p-2 rounded-[16px] w-fit shadow-soft border border-border overflow-x-auto max-w-full">
                <button data-action="setReportTab" data-payload="fluxo" class="px-5 py-2.5 rounded-[12px] text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${state.reportTab === 'fluxo' ? 'bg-brand-deep text-white' : 'text-text-secondary hover:bg-bg'}">
                    <i class="fa-solid fa-arrow-trend-up"></i> Fluxo de Caixa
                </button>
                <button data-action="setReportTab" data-payload="compare" class="px-5 py-2.5 rounded-[12px] text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${state.reportTab === 'compare' ? 'bg-brand-deep text-white' : 'text-text-secondary hover:bg-bg'}">
                    <i class="fa-solid fa-chart-simple"></i> Comparativo
                </button>
                <button data-action="setReportTab" data-payload="cartoes" class="px-5 py-2.5 rounded-[12px] text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${state.reportTab === 'cartoes' ? 'bg-brand-deep text-white' : 'text-text-secondary hover:bg-bg'}">
                    <i class="fa-regular fa-credit-card"></i> Cartões
                </button>
                <button data-action="setReportTab" data-payload="patrimonio" class="px-5 py-2.5 rounded-[12px] text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${state.reportTab === 'patrimonio' ? 'bg-brand-deep text-white' : 'text-text-secondary hover:bg-bg'}">
                    <i class="fa-solid fa-briefcase"></i> Patrimônio
                </button>
            </div>

            <div id="relatorio-export" class="animate-fadeIn pb-4">
                ${contentHtml}
            </div>
        `;
    },

    reportFluxo: (db) => {
        const hoje = new Date();
        const trMes = Database.getTransacoesPorMes(hoje.getFullYear(), hoje.getMonth());
        
        const entradas = trMes.filter(t => t.tipo === 'receita').reduce((a,b)=>a+b.valor,0);
        const saidas = trMes.filter(t => t.tipo === 'despesa').reduce((a,b)=>a+b.valor,0);
        const liquido = entradas - saidas;

        const diasMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
        let tableRows = '';
        let acum = db.bancos.reduce((a,b)=>a+b.saldo,0); 
        
        for(let i=1; i<=diasMes; i++){
            const tDia = trMes.filter(t => new Date(t.data || t.id).getDate() === i);
            const rec = tDia.filter(t => t.tipo === 'receita').reduce((a,b)=>a+b.valor,0);
            const des = tDia.filter(t => t.tipo === 'despesa').reduce((a,b)=>a+b.valor,0);
            acum += (rec - des);
            
            if(rec > 0 || des > 0) {
                tableRows += `
                <div class="flex items-center justify-between p-4 border-b border-border hover:bg-bg transition-colors">
                    <div class="w-1/4 text-sm text-text-secondary">${i} de ${["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][hoje.getMonth()]}</div>
                    <div class="w-1/4 text-sm font-bold text-success text-center font-mono">${rec > 0 ? '+ '+Utils.formatMoney(rec) : '-'}</div>
                    <div class="w-1/4 text-sm font-bold text-danger text-center font-mono">${des > 0 ? '- '+Utils.formatMoney(des) : '-'}</div>
                    <div class="w-1/4 text-sm font-bold text-text-primary text-right font-mono">${Utils.formatMoney(acum)}</div>
                </div>`;
            }
        }

        return `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div class="bg-surface border border-border p-6 rounded-[16px] shadow-soft hover:-translate-y-1 transition-transform">
                    <p class="text-xs font-bold text-text-secondary flex items-center gap-2 mb-2 tracking-wider uppercase"><i class="fa-solid fa-arrow-trend-up text-success"></i> Entradas</p>
                    <h3 class="text-2xl font-bold text-text-primary font-mono">${Utils.formatMoney(entradas)}</h3>
                </div>
                <div class="bg-surface border border-border p-6 rounded-[16px] shadow-soft hover:-translate-y-1 transition-transform">
                    <p class="text-xs font-bold text-text-secondary flex items-center gap-2 mb-2 tracking-wider uppercase"><i class="fa-solid fa-arrow-trend-down text-danger"></i> Saídas</p>
                    <h3 class="text-2xl font-bold text-text-primary font-mono">${Utils.formatMoney(saidas)}</h3>
                </div>
                <div class="bg-surface border border-border p-6 rounded-[16px] shadow-soft hover:-translate-y-1 transition-transform">
                    <p class="text-xs font-bold text-text-secondary flex items-center gap-2 mb-2 tracking-wider uppercase"><i class="fa-solid fa-arrow-right-arrow-left text-reserve"></i> Fluxo Líquido</p>
                    <h3 class="text-2xl font-bold text-text-primary font-mono">${Utils.formatMoney(liquido)}</h3>
                </div>
            </div>
            
            <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft mb-6">
                <h4 class="font-bold text-text-primary text-sm mb-4 font-primary">Evolução do Saldo</h4>
                <div class="relative h-[300px] w-full"><canvas id="reportsFluxoChart"></canvas></div>
            </div>

            <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft">
                <h4 class="font-bold text-text-primary text-sm mb-4 font-primary">Movimentação Diária</h4>
                <div class="flex text-xs font-bold text-text-secondary uppercase tracking-wider pb-3 border-b border-border px-4">
                    <div class="w-1/4">Data</div><div class="w-1/4 text-center">Entradas</div><div class="w-1/4 text-center">Saídas</div><div class="w-1/4 text-right">Saldo Acumulado</div>
                </div>
                <div class="overflow-y-auto max-h-[400px]">
                    ${tableRows || '<div class="text-center py-10 text-text-secondary text-sm">Nenhuma movimentação neste período.</div>'}
                </div>
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
            const rec = tr.filter(t => t.tipo === 'receita').reduce((a, b) => a + b.valor, 0);
            const des = tr.filter(t => t.tipo === 'despesa').reduce((a, b) => a + b.valor, 0);
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
            <div class="flex gap-4 mb-6">
                <select data-change="setReportPeriod" class="p-2 border border-border rounded-[12px] text-sm bg-surface shadow-sm text-text-primary focus:outline-none focus:border-brand-medium">
                    <option value="3" ${period === 3 ? 'selected' : ''}>Últimos 3 meses</option>
                    <option value="6" ${period === 6 ? 'selected' : ''}>Últimos 6 meses</option>
                    <option value="12" ${period === 12 ? 'selected' : ''}>Últimos 12 meses</option>
                </select>
                <select class="p-2 border border-border rounded-[12px] text-sm bg-surface shadow-sm text-text-primary focus:outline-none"><option>Gráfico Barras</option></select>
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
            <div class="flex gap-4 mb-6">
                <select class="p-2 border border-border rounded-[12px] text-sm bg-surface shadow-sm text-text-primary focus:outline-none"><option>Todos os cartões</option></select>
                <select data-change="setReportPeriod" class="p-2 border border-border rounded-[12px] text-sm bg-surface shadow-sm text-text-primary focus:outline-none focus:border-brand-medium">
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
            <div class="flex gap-4 mb-6">
                <select data-change="setReportPeriod" class="p-2 border border-border rounded-[12px] text-sm bg-surface shadow-sm text-text-primary focus:outline-none focus:border-brand-medium">
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