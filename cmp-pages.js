import { Utils } from './utils.js';
import { Database, db } from './db.js';
import { CoreComponents } from './cmp-core.js';
import { listInvoiceTransactions, calculateReconciliation, getInvoicePeriod, invoiceReconciliationKey } from './reconciliation.js';

export const PageComponents = {
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
                <button data-action="delete" data-col="contatos" data-id="${c.id}" class="text-border hover:text-danger w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg transition-colors"><i class="fa-solid fa-pen"></i></button><button data-action="delete" data-col="categorias" data-id="${id}" class="text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors w-10 h-10 flex items-center justify-center rounded-xl border border-transparent hover:border-danger/20"><i class="fa-solid fa-trash-can"></i></button>
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

    categoriesPage: (db, state) => {
        const hoje = new Date();
        const trMes = Database.getTransacoesPorMes(hoje.getFullYear(), hoje.getMonth()).filter(t => t.tipo === 'despesa' && !t.transferenciaInterna);
        const gastosPorCat = {};
        let totalDespesas = 0;

        trMes.forEach(t => { 
            if(!gastosPorCat[t.categoria]) gastosPorCat[t.categoria] = 0; 
            gastosPorCat[t.categoria] += t.valor;
            totalDespesas += t.valor;
        });

        const mesAnt = hoje.getMonth() === 0 ? 11 : hoje.getMonth() - 1;
        const anoAnt = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
        const trMesAnt = Database.getTransacoesPorMes(anoAnt, mesAnt).filter(t => t.tipo === 'despesa' && !t.transferenciaInterna);
        const gastosMesAnt = {};
        trMesAnt.forEach(t => { 
            if(!gastosMesAnt[t.categoria]) gastosMesAnt[t.categoria] = 0; 
            gastosMesAnt[t.categoria] += t.valor;
        });

        const sortedCats = Object.entries(gastosPorCat).sort((a,b) => b[1] - a[1]);
        
        const progressHtml = sortedCats.length > 0 ? sortedCats.map((c) => {
            const catName = c[0];
            const current = c[1];
            const previous = gastosMesAnt[catName] || 0;
            const catObj = CoreComponents._getCategoryConfig(catName);
            
            const percentage = totalDespesas > 0 ? (current / totalDespesas) * 100 : 0;
            const variation = previous > 0 ? ((current - previous) / previous) * 100 : 0;
            
            let varClass = 'text-text-secondary bg-bg';
            let varText = '—';
            if (variation > 0) { varClass = 'text-danger bg-danger/10'; varText = `+${variation.toFixed(0)}%`; }
            else if (variation < 0) { varClass = 'text-success bg-success/10'; varText = `${variation.toFixed(0)}%`; }

            return `
            <div class="flex items-center justify-between gap-4 group mb-4 last:mb-0">
                <div class="flex items-center gap-4 w-[140px] md:w-1/3 shrink-0">
                    <div class="w-12 h-12 rounded-[14px] flex items-center justify-center text-white text-lg shadow-sm shrink-0 border border-border" style="background-color: ${catObj.cor}">
                        <i class="fa-solid ${catObj.icone}"></i>
                    </div>
                    <span class="text-sm font-bold text-text-primary truncate" title="${Utils.escapeHTML(catName)}">${Utils.escapeHTML(catName)}</span>
                </div>
                <div class="w-24 text-right shrink-0">
                    <span class="text-sm font-bold text-text-primary font-mono">${Utils.formatMoney(current)}</span>
                </div>
                <div class="flex-1 h-2 bg-border rounded-full overflow-hidden hidden sm:block">
                    <div class="h-full rounded-full transition-all duration-1000" style="width: ${percentage}%; background-color: ${catObj.cor}"></div>
                </div>
                <div class="w-16 text-right shrink-0">
                    <span class="text-[10px] font-bold ${varClass} font-mono px-2 py-1 rounded-md border border-border/50">${varText}</span>
                </div>
            </div>`;
        }).join('') : '<p class="text-sm text-text-secondary text-center py-6 border border-dashed border-border rounded-[12px] bg-bg mt-4">Nenhuma despesa registrada neste mês.</p>';

        const grupos = {};
        db.categorias.forEach(c => {
            const item = typeof c === 'string' ? { nome: c, grupo: 'Sem grupo', subgrupo: c, fixa: false, icone: 'fa-tag', cor: '#9CA3AF' } : c;
            const grupo = item.grupo || 'Sem grupo';
            if (!grupos[grupo]) grupos[grupo] = [];
            grupos[grupo].push(item);
        });
        const catList = Object.entries(grupos).map(([grupo, itens]) => {
            const base = itens[0];
            const subitens = itens.filter(c => String(c.subgrupo || c.nome) !== String(grupo));
            const linhas = subitens.map(c => `
                <div class="flex items-center gap-2 py-2 px-2 border-t border-border/60 group/sub">
                    <i class="fa-solid ${Utils.escapeHTML(c.icone || 'fa-tag')} text-xs" style="color:${c.cor || '#9CA3AF'}"></i>
                    <span class="flex-1 min-w-0 text-xs text-text-primary truncate">${Utils.escapeHTML(c.subgrupo || c.nome)}</span>
                    <button data-action="renameCategory" data-id="${c.id}" data-name="${Utils.escapeHTML(c.nome)}" class="opacity-0 group-hover/sub:opacity-100 text-text-secondary hover:text-brand-medium w-7 h-7 rounded" title="Renomear"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    ${c.fixa ? '' : `<button data-action="delete" data-col="categorias" data-id="${c.id}" class="opacity-0 group-hover/sub:opacity-100 text-text-secondary hover:text-danger w-7 h-7 rounded" title="Excluir"><i class="fa-solid fa-trash-can text-[10px]"></i></button>`}
                </div>`).join('');
            return `<details class="bg-bg border border-border rounded-xl mb-2 overflow-hidden group" open>
                <summary class="list-none cursor-pointer flex items-center gap-3 px-3 py-3 hover:bg-surface">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style="background-color:${base.cor || '#8B5CF6'}"><i class="fa-solid ${Utils.escapeHTML(base.icone || 'fa-tag')}"></i></div>
                    <span class="flex-1 font-bold text-sm text-text-primary">${Utils.escapeHTML(grupo)}</span>
                    <span class="text-[10px] text-text-secondary">${subitens.length} subgrupo${subitens.length === 1 ? '' : 's'}</span>
                    <i class="fa-solid fa-chevron-down text-xs text-text-secondary group-open:rotate-180"></i>
                </summary>
                <div class="px-3 pb-2">${linhas}</div>
            </details>`;
        }).join('');

        return `
        <div class="flex flex-col lg:flex-row gap-8 mb-8 items-start">
            <div class="w-full lg:w-3/5 xl:w-2/3 bg-surface p-6 md:p-8 rounded-[24px] border border-border shadow-soft flex flex-col overflow-hidden">
                <h3 class="text-xl font-bold text-text-primary mb-8 font-primary">Despesas por Categoria</h3>
                <div class="flex flex-col xl:flex-row items-center gap-10 mb-10">
                    <div class="relative w-56 h-56 shrink-0 flex items-center justify-center">
                        <canvas id="categoriasPageChart"></canvas>
                    </div>
                    <div class="flex-1 w-full space-y-4 overflow-hidden">
                        ${sortedCats.slice(0, 5).map(c => {
                            const pct = totalDespesas > 0 ? (c[1] / totalDespesas) * 100 : 0;
                            const catObj = CoreComponents._getCategoryConfig(c[0]);
                            return `
                            <div class="flex items-center gap-4 p-4 bg-bg rounded-[16px] border border-border shadow-sm">
                                <div class="w-5 h-5 rounded-full shadow-sm shrink-0 border border-white/20" style="background-color: ${catObj.cor}"></div>
                                <span class="text-[15px] font-bold text-text-primary flex-1 truncate">${Utils.escapeHTML(c[0])}</span>
                                <span class="text-sm font-bold text-text-secondary font-mono shrink-0 bg-surface px-3 py-1 rounded-lg border border-border">${pct.toFixed(1)}%</span>
                            </div>`;
                        }).join('')}
                        ${sortedCats.length === 0 ? '<p class="text-sm text-text-secondary text-center py-4 bg-bg rounded-[16px] border border-dashed border-border">Sem dados no período.</p>' : ''}
                    </div>
                </div>
                
                <div class="border-t border-border pt-8 mt-auto">
                    <h4 class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-6">Progresso do Mês Atual</h4>
                    <div class="max-h-[400px] overflow-y-auto pr-4 scrollbar-hide">
                        ${progressHtml}
                    </div>
                </div>
            </div>

            <div class="w-full lg:w-2/5 xl:w-1/3 bg-surface p-6 md:p-8 rounded-[24px] border border-border shadow-soft flex flex-col overflow-hidden">
                <div class="flex justify-between items-center mb-8">
                    <h3 class="text-xl font-bold text-text-primary font-primary">Categorias Ativas</h3>
                    <button data-action="openModal" data-modal="modal-categoria" class="bg-brand-medium text-white px-4 py-2 rounded-[10px] text-sm font-bold hover:bg-brand-dark transition-colors shadow-soft flex items-center gap-2"><i class="fa-solid fa-plus"></i> Nova</button>
                </div>
                
                <div class="flex-1">
                    <div class="max-h-[700px] overflow-y-auto pr-2 scrollbar-hide">
                        ${catList || '<p class="text-center py-6 text-sm text-text-secondary">Nenhuma categoria registrada.</p>'}
                    </div>
                </div>
            </div>
        </div>`;
    },

    filtersSection: (f, bancos, categorias = [], cartoes = []) => {
        const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
        let contas = '<option value="">Todas</option>';
        if (bancos?.length) contas += '<optgroup label="Contas">' + bancos.map(b => `<option value="banco_${b.id}" ${f.bancoId === 'banco_'+b.id ? 'selected' : ''}>${Utils.escapeHTML(b.instituicao && b.instituicao !== 'Outro' ? b.instituicao + ' (' + b.nome + ')' : b.nome)}</option>`).join('') + '</optgroup>';
        if (cartoes?.length) contas += '<optgroup label="Cartões">' + cartoes.map(c => `<option value="cartao_${c.id}" ${f.bancoId === 'cartao_'+c.id ? 'selected' : ''}>${Utils.escapeHTML(c.nome)}</option>`).join('') + '</optgroup>';
        const cats = categorias.map(c => { const nome = typeof c === 'string' ? c : c.nome; return `<option value="${Utils.escapeHTML(nome)}" ${f.categoria === nome ? 'selected' : ''}>${Utils.escapeHTML(nome)}</option>`; }).join('');
        return `<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"><div class="sm:col-span-1"><label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase">Buscar</label><input type="text" placeholder="Descrição ou ID" value="${Utils.escapeHTML(f.desc)}" data-input="setFilterDesc" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"></div><div><label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase">Mês</label><select data-change="setFilter" data-filter-key="mes" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"><option value="">Todos</option>${meses.map((m,i)=>`<option value="${i}" ${f.mes===String(i)?'selected':''}>${m}</option>`).join('')}</select></div><div><label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase">Tipo</label><select data-change="setFilter" data-filter-key="tipo" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"><option value="">Todos</option><option value="receita" ${f.tipo==='receita'?'selected':''}>Receitas</option><option value="despesa" ${f.tipo==='despesa'?'selected':''}>Despesas</option></select></div></div><details class="mt-3 border-t border-border pt-3 group"><summary class="cursor-pointer list-none text-xs font-bold text-brand-medium"><i class="fa-solid fa-sliders mr-1"></i>Mais filtros <i class="fa-solid fa-chevron-down text-[10px] ml-1 group-open:rotate-180 transition-transform"></i></summary><div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3"><div><label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase">Categoria</label><select data-change="setFilter" data-filter-key="categoria" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"><option value="">Todas</option>${cats}</select></div><div><label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase">Conta/Cartão</label><select data-change="setFilter" data-filter-key="bancoId" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary">${contas}</select></div><div class="flex gap-2"><div class="flex-1"><label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase">De</label><input type="date" data-change="setFilter" data-filter-key="dataInicio" value="${f.dataInicio || ''}" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"></div><div class="flex-1"><label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase">Até</label><input type="date" data-change="setFilter" data-filter-key="dataFim" value="${f.dataFim || ''}" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"></div></div><button data-action="clearFilters" class="sm:col-span-3 justify-self-start px-3 py-2 bg-bg text-text-primary rounded-[10px] text-xs font-bold"><i class="fa-solid fa-eraser mr-1"></i>Limpar filtros</button></div></details>`;
    },

    transactionSummary: (transacoes = []) => {
        const receitas = transacoes.filter(t => !t.transferenciaInterna && t.tipo === 'receita' && !t.transferenciaInterna).reduce((s,t) => s + (Number(t.valor)||0), 0);
        const despesas = transacoes.filter(t => !t.transferenciaInterna && t.tipo === 'despesa' && !t.transferenciaInterna).reduce((s,t) => s + (Number(t.valor)||0), 0);
        const cats = {}; transacoes.filter(t => !t.transferenciaInterna && t.tipo === 'despesa' && !t.transferenciaInterna).forEach(t => cats[t.categoria] = (cats[t.categoria] || 0) + (Number(t.valor)||0));
        const topCats = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,3);
        const card=(label,value,cor)=>`<div class="bg-surface border border-border rounded-[10px] px-3 py-2 min-w-0"><span class="block text-[9px] uppercase font-bold text-text-secondary truncate">${label}</span><strong class="block text-sm font-mono ${cor} mt-0.5 truncate">${value}</strong></div>`;
        return `<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">${card('Receitas',Utils.formatMoney(receitas),'text-success')}${card('Despesas',Utils.formatMoney(despesas),'text-danger')}${card('Saldo',Utils.formatMoney(receitas-despesas),receitas-despesas>=0?'text-success':'text-danger')}${card('Transações',transacoes.length,'text-text-primary')}<div class="col-span-2 sm:col-span-4 flex items-center gap-2 px-2 py-1.5 overflow-x-auto whitespace-nowrap"><span class="text-[9px] uppercase font-bold text-text-secondary">Categorias:</span>${topCats.length ? topCats.map(([cat,val])=>`<span class="text-[10px] text-text-primary"><strong>${Utils.escapeHTML(cat)}</strong> ${Utils.formatMoney(val)}</span>`).join('<span class="text-border">•</span>') : '<span class="text-[10px] text-text-secondary">Sem despesas</span>'}</div></div>`;
    },

    transactionList: (list, state) => {
        const selected = state?.selectedTransactions || [];
        const allVisibleSelected = list.length > 0 && list.every(t => selected.includes(t.id.toString()));

        if (!list.length) {
            return `
            <div class="text-center py-20 px-6 bg-surface flex flex-col items-center justify-center">
                <div class="w-24 h-24 bg-bg text-brand-soft border border-border rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner">
                    <i class="fa-solid fa-file-invoice-dollar"></i>
                </div>
                <h4 class="font-bold text-text-primary text-xl mb-2 font-primary">Nenhuma transação encontrada</h4>
                <p class="text-sm text-text-secondary mb-8 max-w-sm">Os filtros aplicados não retornaram resultados ou você não registrou movimentações.</p>
                <button data-action="openModal" data-modal="modal-transacao" data-type="despesa" class="bg-brand-deep hover:bg-brand-dark text-white px-8 py-3 rounded-[12px] font-bold shadow-soft transition-all hover:-translate-y-0.5">Fazer Lançamento</button>
            </div>`;
        }
        
        return `
            <div class="flex justify-between items-center mb-6">
                <div class="flex items-center gap-3">
                    <input type="checkbox" data-change="toggleSelectAllTx" ${allVisibleSelected ? 'checked' : ''} class="w-4 h-4 text-brand-medium bg-surface border-border rounded cursor-pointer">
                    <h4 class="font-bold text-text-primary font-primary">Histórico Completo</h4>
                </div>
                ${selected.length > 0 ? `
                <button data-action="deleteSelectedTx" class="text-xs text-danger px-4 py-2 font-bold hover:bg-bg rounded-[12px] transition-colors flex items-center gap-2 border border-border">
                    <i class="fa-solid fa-trash-can"></i> Apagar Selecionados (${selected.length})
                </button>
                ` : ''}
            </div>
            <div class="space-y-0">
                ${list.map(t => {
                    const isRec = t.transferenciaInterna ? (t.transferenciaEntrada === true || (t.transferenciaInterna && String(t.bancoId) === String(t.contaDestinoId))) : t.tipo === 'receita';
                    const signal = isRec ? '+' : '-'; const color = isRec ? 'text-success' : 'text-danger';
                    
                    let dataFormatada = 'Hoje';
                    if (t.data) {
                        const parsed = new Date(t.data + 'T12:00:00');
                        dataFormatada = isNaN(parsed.getTime()) ? 'Data Inválida' : parsed.toLocaleDateString('pt-BR');
                    }
                    
                    const contatoStr = t.contatoId && db.contatos ? db.contatos.find(c => c.id === t.contatoId) : null;
                    const contatoBadge = contatoStr ? `<span class="text-[10px] px-2 py-0.5 rounded bg-bg border border-border text-text-secondary font-bold tracking-wider flex items-center gap-1"><i class="fa-regular fa-address-book"></i> ${Utils.escapeHTML(contatoStr.nome)}</span>` : '';
                    
                    const txId = t.codigoRef || `TX-${t.id.toString(36).substring(0,6).toUpperCase()}`;
                    const badgeRecorrente = t.recorrente && !t.isCartao ? `<span class="text-[10px] text-reserve bg-bg border border-border px-1.5 py-0.5 rounded font-bold flex items-center gap-1"><i class="fa-solid fa-repeat"></i> Fixa ${t.parcelaAtual ? `${t.parcelaAtual}/${t.totalParcelas}` : ''}</span>` : '';
                    const isSelected = selected.includes(t.id.toString());
                    
                    const catObj = CoreComponents._getCategoryConfig(t.categoria);

                    return `
                    <div data-key="${t.id}" class="flex items-center justify-between p-4 hover:bg-bg rounded-[16px] transition-all group border-b border-border last:border-0 ${isSelected ? 'bg-bg' : ''}">
                        <div class="flex items-center gap-4">
                            <input type="checkbox" data-change="toggleSelectTx" value="${t.id}" ${isSelected ? 'checked' : ''} class="w-4 h-4 text-brand-medium bg-surface border-border rounded cursor-pointer">
                            <div class="w-10 h-10 rounded-[12px] flex items-center justify-center shadow-sm text-white border border-border" style="background-color: ${catObj.cor}">
                                <i class="fa-solid ${catObj.icone}"></i>
                            </div>
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <p class="font-bold text-text-primary text-sm tracking-tight font-primary">${Utils.escapeHTML(t.desc)}</p>
                                    <span class="text-[9px] font-mono text-text-secondary bg-bg border border-border px-1.5 py-0.5 rounded" title="ID de Registro">#${txId}</span>
                                </div>
                                <div class="flex flex-wrap items-center gap-2 mt-1.5">
                                    <span class="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider text-white" style="background-color: ${catObj.cor}99">${Utils.escapeHTML(t.categoria)}</span>
                                    <span class="text-[10px] text-text-secondary flex items-center gap-1"><i class="fa-regular fa-calendar"></i> ${dataFormatada}</span>
                                    ${(() => { const banco = db.bancos.find(b => String(b.id) === String(t.bancoId)); return banco ? `<span class="text-[10px] text-text-secondary flex items-center gap-1"><i class="fa-solid fa-building-columns"></i> ${Utils.escapeHTML(banco.nome || banco.instituicao)}</span>` : ''; })()}
                                    ${t.isCartao ? `<span class="text-[10px] text-credit bg-bg border border-border px-1.5 py-0.5 rounded flex items-center gap-1 font-bold"><i class="fa-regular fa-credit-card"></i> Cartão (Parc. ${t.parcelaAtual}/${t.totalParcelas})</span>` : ''}
                                    ${!t.isCartao && t.formaPagamento && t.formaPagamento !== 'Não informada' ? `<span class="text-[10px] text-text-secondary border border-border px-1.5 py-0.5 rounded flex items-center gap-1"><i class="fa-solid fa-money-check"></i> ${Utils.escapeHTML(t.formaPagamento)}</span>` : ''}
                                    ${badgeRecorrente}
                                    ${contatoBadge}
                                </div>
                            </div>
                        </div>
                        <div class="text-right flex flex-col items-end">
                            <span class="block font-bold text-sm ${color} font-mono tracking-tight">${signal} ${Utils.formatMoney(t.valor)}</span>
                            <div class="flex gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button data-action="openEditModal" data-id="${t.id}" class="text-[10px] text-text-primary hover:text-brand-medium font-bold border border-border bg-surface px-2 py-1 rounded-[8px]"><i class="fa-solid fa-pen mr-1"></i> Editar</button>
                                <button data-action="deleteExpense" data-id="${t.id}" class="text-[10px] text-danger font-bold hover:bg-surface border border-transparent hover:border-border px-2 py-1 rounded-[8px]"><i class="fa-solid fa-trash-can mr-1"></i> Apagar</button>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
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
        const reconciliation = calculateReconciliation(monthExpenses, db.conciliacoesFaturas?.find(r => r.chave === invoiceReconciliationKey(card.id, state.invoiceYear, state.invoiceMonth))?.valorFaturaReal);
        const totalFatura = reconciliation.totalRecorded;
        const periodo = getInvoicePeriod(card, state.invoiceYear, state.invoiceMonth);
        const statusClasses = { 'em aberto': 'bg-slate-100 text-slate-700', 'aguardando conferência': 'bg-amber-100 text-amber-700', 'diferença encontrada': 'bg-rose-100 text-rose-700', 'conciliada': 'bg-emerald-100 text-emerald-700' };
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]; 
        const mesAtualNome = meses[state.invoiceMonth];
        
        const vencimentoStr = `${card.vencimento.toString().padStart(2, '0')}/${(state.invoiceMonth + 1).toString().padStart(2, '0')}/${state.invoiceYear}`;

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

        const selected = state?.selectedTransactions || [];
        const allVisibleSelected = monthExpenses.length > 0 && monthExpenses.every(t => selected.includes(t.id.toString()));

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
        
        <div class="p-8">
            <div class="flex items-center justify-center gap-8 mb-8">
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
                    <div><p class="text-[10px] uppercase font-bold text-text-secondary">Total registrado</p><p class="font-mono font-bold text-text-primary">${Utils.formatMoney(reconciliation.totalRecorded)}</p></div>
                    <div><label for="valor-fatura-real" class="text-[10px] uppercase font-bold text-text-secondary">Valor real da fatura</label><input id="valor-fatura-real" type="number" step="0.01" min="0" value="${reconciliation.realInvoiceAmount ?? ''}" placeholder="R$ 0,00" class="mt-1 w-full p-2 bg-surface border border-border rounded-lg font-mono text-sm"></div>
                    <div><p class="text-[10px] uppercase font-bold text-text-secondary">Diferença</p><p class="font-mono font-bold ${reconciliation.difference === null ? 'text-text-secondary' : reconciliation.difference === 0 ? 'text-success' : 'text-danger'}">${reconciliation.difference === null ? '—' : Utils.formatMoney(reconciliation.difference)}</p></div>
                </div>
                <div class="mt-4 flex items-center justify-between gap-3"><span class="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusClasses[reconciliation.status]}">${reconciliation.status}</span><button data-action="saveInvoiceReconciliation" class="px-3 py-2 rounded-lg bg-brand-deep text-white text-xs font-bold">Salvar conferência</button></div>
            </div>

            <div class="space-y-1 mb-10">
                ${monthExpenses.length === 0 ? '<p class="text-center text-text-secondary text-sm py-8 border border-border bg-surface rounded-[16px]">Nenhuma compra registrada nesta fatura.</p>' : 
                  `
                  <div class="flex justify-between items-center mb-2 px-2">
                      <div class="flex items-center gap-2">
                          <input type="checkbox" data-change="toggleSelectAllTx" ${allVisibleSelected ? 'checked' : ''} class="w-4 h-4 text-brand-medium bg-surface border-border rounded cursor-pointer">
                          <span class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Selecionar Tudo</span>
                      </div>
                      ${selected.length > 0 ? `
                      <button data-action="deleteSelectedTx" class="text-[10px] text-danger border border-border px-3 py-1.5 rounded font-bold hover:bg-bg transition-colors flex items-center gap-1">
                          <i class="fa-solid fa-trash-can"></i> Apagar (${selected.length})
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
        `;
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

    goalsPage: (metas, transacoes) => {
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
                <button data-action="openModal" data-modal="modal-meta" class="bg-brand-deep hover:bg-brand-dark text-white px-6 py-2.5 rounded-[12px] font-bold shadow-soft transition-all hover:-translate-y-0.5">Criar Nova Meta</button>
            </div>
        `;

        const metasHtml = metas.length === 0 ? emptyState : metas.map(m => CoreComponents._buildGoalCard(m, hoje)).join('');

        return `
            <div class="rounded-[16px] p-8 mb-10 shadow-soft text-white relative overflow-hidden" style="background: linear-gradient(135deg, var(--c-brand-deep) 0%, var(--c-brand-dark) 100%);"><div class="relative z-10"><div class="flex items-center gap-3 mb-2"><div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm"><i class="fa-solid fa-wallet"></i></div><span class="font-bold text-sm opacity-90 tracking-wide font-primary">Capacidade de Poupança</span></div><h3 class="text-4xl font-bold mb-1 font-mono">${capacidadeFormatada}</h3><p class="text-sm opacity-80">média mensal calculada dos últimos 3 meses</p></div><div class="absolute -right-10 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div></div>
            <h3 class="font-bold text-text-primary text-lg mb-6 tracking-tight font-primary">Metas Ativas</h3><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">${metasHtml}</div>`;
    },

    budgetView: (orcamentos, transacoes, state = {}) => {
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const anoSelecionado = state.budgetYear || new Date().getFullYear();
        const mesSelecionado = state.budgetMonth ?? new Date().getMonth();
        const mesAtualNome = meses[mesSelecionado];
        const orcamentosDoMes = (orcamentos || []).filter(o => o.ano == null || (Number(o.ano) === Number(anoSelecionado) && Number(o.mes) === Number(mesSelecionado))); 
        const gastosPorCat = {}; 
        let totalGastoMes = 0;
        
        const transacoesMes = Database.getTransacoesPorMes(anoSelecionado, mesSelecionado);
        transacoesMes.filter(t => t.tipo === 'despesa' && !t.transferenciaInterna).forEach(t => { 
            if(!gastosPorCat[t.categoria]) gastosPorCat[t.categoria] = 0; 
            gastosPorCat[t.categoria] += t.valor; 
            totalGastoMes += t.valor; 
        });
        
        const totalOrcado = orcamentosDoMes.reduce((a, b) => a + b.limite, 0); 
        const disponivelGeral = totalOrcado - totalGastoMes;

        const listHTML = orcamentosDoMes.map(o => {
            const gasto = gastosPorCat[o.categoria] || 0; 
            return CoreComponents._buildBudgetCard(o, gasto);
        }).join('');

        const emptyState = `
            <div class="text-center py-16 px-6 bg-surface rounded-[16px] border border-border shadow-soft flex flex-col items-center justify-center">
                <div class="w-20 h-20 bg-bg text-brand-soft border border-border rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
                    <i class="fa-solid fa-chart-pie"></i>
                </div>
                <h4 class="font-bold text-text-primary text-lg mb-2 font-primary">Sem limites definidos</h4>
                <p class="text-sm text-text-secondary mb-6 max-w-sm">Estabelecer orçamentos ajuda a manter o controle.</p>
                <button data-action="openModal" data-modal="modal-orcamento" class="bg-brand-deep hover:bg-brand-dark text-white px-6 py-2.5 rounded-[12px] font-bold shadow-soft transition-all hover:-translate-y-0.5">Definir Orçamento</button>
            </div>
        `;

        return `
        <div class="flex items-center justify-center gap-8 mb-10"><button data-action="changeMonth" data-type="budget" data-dir="-1" class="w-8 h-8 rounded-full hover:bg-bg border border-border flex items-center justify-center text-text-secondary transition-colors"><i class="fa-solid fa-chevron-left"></i></button><span class="text-lg font-bold text-text-primary min-w-[180px] text-center capitalize font-primary">${mesAtualNome} de ${state.budgetYear}</span><button data-action="changeMonth" data-type="budget" data-dir="1" class="w-8 h-8 rounded-full hover:bg-bg border border-border flex items-center justify-center text-text-secondary transition-colors"><i class="fa-solid fa-chevron-right"></i></button></div>
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