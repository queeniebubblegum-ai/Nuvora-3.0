import { Utils } from './utils.js';
import { db } from './db.js';

export const CoreComponents = {
    _getCategoryConfig: (catName) => {
        const cat = db.categorias.find(c => {
            const nome = typeof c === 'string' ? c : c.nome;
            return nome === catName;
        });
        if (cat && typeof cat === 'object') return { icone: cat.icone || 'fa-tag', cor: cat.cor || 'var(--c-text-secondary)' }; 
        return { icone: 'fa-tag', cor: 'var(--c-text-secondary)' };
    },

    _buildSummaryCard: (title, value, trendStr, isUp, iconClass, trendSubtitle) => {
        let iconColor = 'text-reserve bg-reserve/10'; 
        let trendColor = 'text-text-secondary';
        let trendIcon = 'fa-minus';

        if (title.toLowerCase().includes('receita')) {
            iconColor = 'text-success bg-success/10'; 
        } else if (title.toLowerCase().includes('despesa')) {
            iconColor = 'text-danger bg-danger/10'; 
        }

        if (trendStr) {
            trendColor = isUp ? 'text-success' : 'text-danger';
            trendIcon = isUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
        }
        
        return `
        <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft hover:-translate-y-1 transition-transform duration-300 group">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-2">
                    <span class="text-text-primary text-xs font-black uppercase tracking-widest opacity-90">${Utils.escapeHTML(title)}</span>
                    ${trendStr ? `
                    <span class="${trendColor} text-[10px] font-bold flex items-center gap-1 font-mono">
                        <i class="fa-solid ${trendIcon}"></i> ${Utils.escapeHTML(trendStr)}%
                    </span>` : ''}
                </div>
                <div class="w-10 h-10 ${iconColor} rounded-[12px] flex items-center justify-center text-base shadow-sm group-hover:scale-110 transition-transform">
                    <i class="fa-solid ${iconClass}"></i>
                </div>
            </div>
            <h3 class="text-3xl font-bold text-text-primary mb-1 font-mono tracking-tight">${Utils.formatMoney(value)}</h3>
            <p class="text-[11px] text-text-secondary font-medium">${Utils.escapeHTML(trendSubtitle)}</p>
        </div>`;
    },
    
    _buildBankCard: (c, b, gasto) => {
        const pct = Math.min((gasto/c.limite)*100, 100);
        
        let bgColor = c.cor;
        if (!bgColor || bgColor === 'var(--c-brand-deep)') {
            bgColor = b.cor || '#1F0F42';
        }
        
        const searchStr = `${c.modelo || ''} ${b.instituicao || ''} ${c.nome || ''} ${b.nome || ''}`.toLowerCase();
        let bankLogoHtml = `<i class="fa-regular fa-credit-card mb-4 block text-2xl opacity-90 text-white"></i>`;
        
        if (searchStr.includes('ultravioleta')) {
            bgColor = '#111111'; 
            bankLogoHtml = `<div class="mb-4 h-8 flex items-center"><span class="font-bold text-xl tracking-tighter italic text-white opacity-90">nu <span class="text-[10px] font-medium not-italic uppercase tracking-widest ml-1 opacity-70">Ultravioleta</span></span></div>`;
        } else if (searchStr.includes('nubank')) {
            bgColor = '#8A05BE';
            bankLogoHtml = `<div class="mb-4 h-8 flex items-center"><span class="font-bold text-xl tracking-tighter italic text-white opacity-90">nu</span></div>`;
        } else if (searchStr.includes('itaú') || searchStr.includes('itau')) {
            bgColor = '#EC7000';
            bankLogoHtml = `<div class="mb-4 h-8 flex items-center"><span class="font-black text-lg italic text-white opacity-90">Itaú</span></div>`;
        } else if (searchStr.includes('inter')) {
            bgColor = '#FF7A00';
            bankLogoHtml = `<div class="mb-4 h-8 flex items-center"><span class="font-black text-xl tracking-tighter text-white opacity-90">inter</span></div>`;
        } else if (searchStr.includes('c6')) {
            bgColor = '#242424';
            bankLogoHtml = `<div class="mb-4 h-8 flex items-center"><span class="font-black text-lg tracking-widest border-2 border-white/80 px-2 rounded-lg text-white opacity-90">C6</span></div>`;
        } else if (searchStr.includes('santander')) {
            bgColor = '#CC0000';
            bankLogoHtml = `<div class="mb-4 h-8 flex items-center"><span class="font-bold text-lg flex items-center gap-1 text-white opacity-90"><div class="w-3 h-3 bg-white rounded-full"></div> Santander</span></div>`;
        } else if (searchStr.includes('bradesco')) {
            bgColor = '#CC092F';
            bankLogoHtml = `<div class="mb-4 h-8 flex items-center"><span class="font-black text-lg tracking-tight text-white opacity-90">bradesco</span></div>`;
        } else if (searchStr.includes('brasil') || searchStr.includes('ourocard') || searchStr.includes('bb')) {
            bgColor = '#003DA5';
            bankLogoHtml = `<div class="mb-4 h-8 flex items-center"><span class="font-black text-2xl tracking-tighter text-[#F9D342]">bb</span></div>`;
        } else if (searchStr.includes('caixa')) {
            bgColor = '#005CA9';
            bankLogoHtml = `<div class="mb-4 h-8 flex items-center"><span class="font-black text-xl tracking-tight text-[#F9D342] flex items-center gap-1"><span class="text-white text-lg">X</span> CAIXA</span></div>`;
        }

        return `
        <div data-key="${c.id}" class="mt-4 border border-border rounded-[16px] bg-surface shadow-soft hover:shadow-medium hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group">
            <div class="p-5 text-white flex justify-between items-start relative overflow-hidden" style="background-color: ${bgColor};">
                <div class="relative z-10">
                    ${bankLogoHtml}
                    <h4 class="font-bold text-lg leading-tight font-primary text-white drop-shadow-md">${Utils.escapeHTML(c.nome)}</h4>
                    <p class="text-[10px] opacity-80 mt-1 uppercase tracking-wider font-medium text-white">${Utils.escapeHTML(b.nome)}</p>
                </div>
                <div class="absolute right-5 top-5 w-10 h-8 rounded bg-white/20 border border-white/30 flex flex-col justify-center items-start px-1 gap-[2px] z-10 shadow-sm">
                    <div class="w-full h-[1.5px] bg-white/40"></div>
                    <div class="w-full h-[1.5px] bg-white/40"></div>
                    <div class="w-full h-[1.5px] bg-white/40"></div>
                </div>
                <div class="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                <button data-action="delete" data-col="cartoes" data-id="${c.id}" class="absolute bottom-5 right-5 z-20 text-white/60 hover:text-white transition-colors opacity-0 group-hover:opacity-100 bg-black/20 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"><i class="fa-regular fa-trash-can text-xs"></i></button>
            </div>
            <div class="p-5 space-y-3 flex-1">
                <div class="flex justify-between text-xs text-text-secondary"><span>Fechamento</span><span class="text-text-primary font-bold font-mono">Dia ${c.fechamento}</span></div>
                <div class="flex justify-between text-xs text-text-secondary"><span>Vencimento</span><span class="text-text-primary font-bold font-mono">Dia ${c.vencimento}</span></div>
                <div class="pt-3">
                    <div class="flex justify-between text-xs mb-1.5"><span class="text-text-secondary">Limite usado</span><span class="font-bold text-text-primary font-mono">${Utils.formatMoney(gasto)}</span></div>
                    <div class="w-full bg-border rounded-full h-[6px] overflow-hidden"><div class="bg-credit h-[6px] rounded-full" style="width: ${Utils.escapeHTML(pct)}%"></div></div>
                    <p class="text-[10px] text-text-secondary text-right mt-1 font-mono">de ${Utils.formatMoney(c.limite)}</p>
                </div>
            </div>
            <div class="p-5 pt-0 flex gap-3">
                <button data-action="openInvoiceDetails" data-id="${c.id}" class="flex-1 py-2.5 border border-border text-text-primary rounded-[12px] text-xs font-bold hover:bg-bg flex items-center justify-center gap-2 transition-colors"><i class="fa-solid fa-file-invoice-dollar"></i> Faturas</button>
                <button data-action="openCardExpenseModal" data-id="${c.id}" data-nome="${Utils.escapeHTML(c.nome)}" class="flex-1 py-2.5 bg-brand-medium text-white rounded-[12px] text-xs font-bold hover:bg-brand-dark flex items-center justify-center gap-2 transition-colors shadow-brand-glow"><i class="fa-solid fa-plus"></i> Lançar</button>
            </div>
        </div>`;
    },

    _buildBudgetCard: (o, gasto) => {
        const restante = o.limite - gasto; 
        const pctReal = (gasto / o.limite) * 100; 
        const pctBarra = Math.min(pctReal, 100);
        
        let tagHtml = '';
        let barColor = 'bg-reserve'; 
        if (pctReal > 100) { 
            tagHtml = '<span class="text-[10px] text-danger font-bold ml-2 flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation"></i> Excedido</span>'; 
            barColor = 'bg-danger';
        } else if (pctReal > 80) { 
            tagHtml = '<span class="text-[10px] text-credit font-bold ml-2 flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation"></i> Atenção</span>'; 
            barColor = 'bg-credit';
        }
        
        const catObj = CoreComponents._getCategoryConfig(o.categoria);

        return `
        <div data-key="${o.id}" class="bg-surface p-6 rounded-[16px] border border-border shadow-soft mb-4 hover:-translate-y-1 transition-all duration-300">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-[12px] flex items-center justify-center text-lg shadow-sm text-white border border-border" style="background-color: ${catObj.cor || '#6C3BB6'}">
                        <i class="fa-solid ${catObj.icone}"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-text-primary text-base flex items-center mb-1 font-primary">${Utils.escapeHTML(o.categoria)} ${tagHtml}</h4>
                        <p class="text-sm text-text-secondary"><strong class="font-mono text-text-primary">${Utils.formatMoney(gasto)}</strong> de <span class="font-mono">${Utils.formatMoney(o.limite)}</span></p>
                    </div>
                </div>
                <div class="flex items-center gap-6">
                    <div class="text-right">
                        <span class="block font-bold text-text-primary text-base font-mono">${Utils.formatMoney(restante)}</span>
                        <span class="text-xs text-text-secondary">restante</span>
                    </div>
                    <div class="flex gap-2">
                        <button data-action="delete" data-col="orcamentos" data-id="${o.id}" class="text-border hover:text-danger transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
            </div>
            <div class="relative pt-2">
                <div class="overflow-hidden h-[6px] mb-2 text-xs flex rounded-full bg-border">
                    <div style="width:${pctBarra}%" class="shadow-none flex flex-col text-center whitespace-nowrap justify-center ${barColor} transition-all duration-500"></div>
                </div>
                <div class="text-right w-full text-text-secondary text-xs font-medium font-mono">${pctReal.toFixed(0)}% utilizado</div>
            </div>
        </div>`;
    },

    _buildGoalCard: (m, hoje) => {
        const pct = Math.min((m.atual/m.alvo)*100, 100); 
        let diasRestantes = 0; 
        let economiaMensal = 0; 
        let temPrazo = false;
        
        if (m.data) { 
            const diffTime = new Date(m.data) - hoje; 
            diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            temPrazo = diasRestantes > 0; 
            if(temPrazo) { 
                const mesesRestantes = diasRestantes / 30; 
                const falta = m.alvo - m.atual; 
                if(falta > 0) economiaMensal = falta / mesesRestantes; 
            } 
        }
        
        return `
        <div data-key="${m.id}" class="bg-surface rounded-[16px] p-6 border border-border shadow-soft relative group hover:-translate-y-1 transition-all duration-300">
            <div class="flex justify-between items-start mb-6">
                <div class="flex gap-4">
                    <div class="w-12 h-12 bg-bg rounded-[12px] flex items-center justify-center text-investment text-xl border border-border"><i class="fa-regular fa-star"></i></div>
                    <div>
                        <h4 class="font-bold text-text-primary text-lg font-primary">${Utils.escapeHTML(m.nome)}</h4>
                        <p class="text-sm text-text-secondary font-medium">${temPrazo ? `<span class="font-mono">${diasRestantes}</span> dias restantes` : 'Sem prazo definido'}</p>
                    </div>
                </div>
                <button data-action="delete" data-col="metas" data-id="${m.id}" class="text-border hover:text-danger transition-colors"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <div class="mb-6">
                <div class="flex justify-between text-sm mb-2"><span class="font-bold text-text-primary">Progresso</span><span class="font-bold text-text-primary font-mono">${pct.toFixed(1)}%</span></div>
                <div class="w-full bg-border rounded-full h-[6px]"><div class="bg-investment h-[6px] rounded-full transition-all duration-1000" style="width: ${Utils.escapeHTML(pct)}%"></div></div>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-bg border border-border p-4 rounded-[12px]"><p class="text-xs text-text-secondary mb-1">Atual</p><p class="font-bold text-text-primary font-mono">${Utils.formatMoney(m.atual)}</p></div>
                <div class="bg-bg border border-border p-4 rounded-[12px]"><p class="text-xs text-text-secondary mb-1">Meta</p><p class="font-bold text-text-primary font-mono">${Utils.formatMoney(m.alvo)}</p></div>
            </div>
            ${temPrazo && m.atual < m.alvo ? `<div class="bg-bg border border-border rounded-[12px] p-4 mb-6"><p class="text-xs font-bold text-investment flex items-center gap-2 mb-1"><i class="fa-solid fa-arrow-trend-up"></i> Planejamento</p><p class="text-xs text-text-secondary leading-relaxed">Poupe <strong class="text-investment font-mono">${Utils.formatMoney(economiaMensal)}/mês</strong> para atingir o objetivo.</p></div>` : ''}
            <button data-action="openDepositModal" data-id="${m.id}" data-nome="${Utils.escapeHTML(m.nome)}" class="w-full py-3 bg-brand-medium hover:bg-brand-dark text-white font-bold rounded-[12px] transition-all flex items-center justify-center gap-2 shadow-brand-glow hover:-translate-y-0.5"><i class="fa-solid fa-plus"></i> Depositar</button>
        </div>`;
    },

    // A Lista de Transações com SWIPE nativo acoplado:
    transactionList: (transactions, appState) => {
        if (!transactions || transactions.length === 0) {
            return `
                <div class="text-center py-16 px-4 flex flex-col items-center justify-center h-full">
                    <div class="w-20 h-20 bg-bg rounded-full flex items-center justify-center mb-4 border border-border">
                        <i class="fa-solid fa-receipt text-text-secondary opacity-30 text-3xl"></i>
                    </div>
                    <p class="text-sm font-bold text-text-primary mb-1">Nenhum lançamento encontrado</p>
                    <p class="text-xs text-text-secondary">Tente ajustar os filtros ou registre uma nova transação.</p>
                </div>
            `;
        }

        const grouped = {};
        transactions.forEach(t => {
            const dateStr = t.data || t.id;
            let dataFormatada;
            try {
                const parsed = new Date(dateStr + 'T12:00:00');
                if (isNaN(parsed.getTime())) throw new Error();
                dataFormatada = parsed.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
            } catch(e) {
                dataFormatada = 'DATA INVÁLIDA';
            }
            if(!grouped[dataFormatada]) grouped[dataFormatada] = [];
            grouped[dataFormatada].push(t);
        });

        let html = '';
        for (const [data, items] of Object.entries(grouped)) {
            html += `<div class="mb-6 last:mb-0"><h4 class="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3 border-b border-border pb-2 flex items-center gap-2"><i class="fa-regular fa-calendar text-brand-medium"></i> ${Utils.escapeHTML(data)}</h4><div class="space-y-2">`;
            
            items.forEach(t => {
                const isSelected = appState.selectedTransactions && appState.selectedTransactions.includes(t.id);
                const isTransfer = !!t.transferenciaInterna || t.tipo === 'transferencia';
                // Na lista, a perna de destino é uma entrada e a de origem é uma saída.
                // Os totais continuam ignorando ambas por serem transferência interna.
                const isRec = isTransfer ? !!t.transferenciaEntrada : t.tipo === 'receita';
                const valColor = isRec ? 'text-success' : 'text-danger';
                const sign = isRec ? '+' : '-';
                
                const catObj = CoreComponents._getCategoryConfig(t.categoria);
                const recBadge = t.recorrente ? `<span title="Lançamento Recorrente" class="text-brand-medium"><i class="fa-solid fa-rotate text-[10px]"></i></span>` : '';
                const cardBadge = t.isCartao ? `<span title="Cartão de Crédito" class="text-text-secondary"><i class="fa-solid fa-credit-card text-[10px]"></i></span>` : '';

                // UX ENG: Arquitetura HTML para as Interações de Swipe (Camadas Absolutas Traseiras e Camada Relativa Frontal)
                html += `
                <div class="relative overflow-hidden rounded-[12px] group swipe-container" data-id="${t.id}">
                    <div class="absolute inset-y-0 left-0 w-full bg-brand-medium flex items-center px-6 text-white text-sm font-bold opacity-0 transition-opacity" id="swipe-edit-${t.id}">
                        <i class="fa-solid fa-pen mr-2"></i> Editar
                    </div>
                    <div class="absolute inset-y-0 right-0 w-full bg-danger flex items-center justify-end px-6 text-white text-sm font-bold opacity-0 transition-opacity" id="swipe-delete-${t.id}">
                        Apagar <i class="fa-solid fa-trash ml-2"></i>
                    </div>

                    <div class="swipe-front relative bg-surface border border-border flex items-center justify-between p-3.5 hover:bg-bg transition-colors cursor-pointer w-full z-10 touch-pan-y ${isSelected ? 'border-brand-medium bg-brand-soft/10' : ''}">
                        
                        <div class="flex items-center gap-4 w-2/3">
                            <label class="cursor-pointer shrink-0 ml-1 hidden sm:block p-1">
                                <input type="checkbox" data-change="toggleTransaction" value="${t.id}" ${isSelected ? 'checked' : ''} class="w-4 h-4 text-brand-medium bg-bg border-border rounded focus:ring-brand-medium">
                            </label>
                            
                            <div class="w-10 h-10 rounded-[10px] flex items-center justify-center text-white shrink-0 shadow-sm transition-transform group-hover:scale-105" style="background-color: ${catObj.cor}">
                                <i class="fa-solid ${catObj.icone}"></i>
                            </div>
                            
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-bold text-text-primary truncate font-primary leading-tight flex items-center gap-1.5">
                                    ${Utils.escapeHTML(t.desc)} ${recBadge} ${cardBadge}
                                </p>
                                <div class="flex items-center gap-2 mt-1 flex-wrap">
                                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded text-white tracking-wider uppercase" style="background-color: ${catObj.cor}99">${Utils.escapeHTML(t.categoria)}</span>
                                    <span class="text-[10px] text-text-secondary truncate hidden sm:inline-block">• ${Utils.escapeHTML(t.formaPagamento)}</span>
                                    ${t.contatoId ? `<span class="text-[10px] text-text-secondary truncate hidden md:inline-block"><i class="fa-regular fa-user mr-1"></i> Contato Vinculado</span>` : ''}
                                </div>
                            </div>
                        </div>

                        <div class="text-right shrink-0">
                            <p class="text-[15px] font-black ${valColor} font-mono tracking-tight">${sign} ${Utils.formatMoney(t.valor)}</p>
                            <div class="flex justify-end gap-2 mt-1">
                                <button data-action="openEditModal" data-id="${t.id}" class="text-[10px] font-bold text-text-secondary hover:text-brand-medium transition-colors hidden sm:block">Detalhes</button>
                                <button data-action="deleteExpense" data-id="${t.id}" class="text-[10px] font-bold text-text-secondary hover:text-danger transition-colors hidden sm:block">Apagar</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            });
            html += `</div></div>`;
        }
        
        return html;
    },

    filtersSection: (f, bancos, categorias, cartoes) => {
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        
        let selectContaOptions = '<option value="">Todos</option>';
        if(bancos && bancos.length > 0) {
            selectContaOptions += '<optgroup label="Contas Bancárias">';
            selectContaOptions += bancos.map(b => {
                const displayName = b.instituicao && b.instituicao !== 'Outro' ? `${Utils.escapeHTML(b.instituicao)} (${Utils.escapeHTML(b.nome)})` : Utils.escapeHTML(b.nome);
                return `<option value="banco_${b.id}" ${f.bancoId === 'banco_'+b.id ? 'selected' : ''}>${displayName}</option>`;
            }).join('');
            selectContaOptions += '</optgroup>';
        }
        if(cartoes && cartoes.length > 0) {
            selectContaOptions += '<optgroup label="Cartões de Crédito">';
            selectContaOptions += cartoes.map(c => `<option value="cartao_${c.id}" ${f.bancoId === 'cartao_'+c.id ? 'selected' : ''}>${Utils.escapeHTML(c.nome)}</option>`).join('');
            selectContaOptions += '</optgroup>';
        }

        return `
        <div class="flex flex-col lg:flex-row gap-4 items-end">
            <div class="flex-1 w-full"><label class="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Buscar</label><div class="relative"><i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-text-secondary"></i><input type="text" placeholder="Ex: Mercado, Uber..." value="${Utils.escapeHTML(f.desc)}" data-input="setFilterDesc" class="w-full pl-10 p-2.5 bg-surface border border-border rounded-[12px] text-sm focus:outline-none focus:border-brand-medium transition-all text-text-primary"></div></div>
            <div class="w-full lg:w-40"><label class="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Mês</label><select data-change="setFilter" data-filter-key="mes" class="w-full p-2.5 bg-surface border border-border rounded-[12px] text-sm focus:outline-none focus:border-brand-medium text-text-primary"><option value="">Todos</option>${meses.map((m, i) => `<option value="${i}" ${f.mes === i.toString() ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
            <div class="w-full lg:w-48"><label class="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Categoria</label><select data-change="setFilter" data-filter-key="categoria" class="w-full p-2.5 bg-surface border border-border rounded-[12px] text-sm focus:outline-none focus:border-brand-medium text-text-primary"><option value="">Todas</option>${categorias.map(c => {
                const nome = typeof c === 'string' ? c : c.nome;
                return `<option value="${Utils.escapeHTML(nome)}" ${f.categoria === nome ? 'selected' : ''}>${Utils.escapeHTML(nome)}</option>`;
            }).join('')}</select></div>
            <div class="w-full lg:w-48"><label class="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">Conta/Cartão</label><select data-change="setFilter" data-filter-key="bancoId" class="w-full p-2.5 bg-surface border border-border rounded-[12px] text-sm focus:outline-none focus:border-brand-medium text-text-primary">${selectContaOptions}</select></div>
            <div class="w-full lg:w-auto"><button data-action="clearFilters" class="w-full lg:w-auto px-4 py-2.5 bg-bg text-text-primary hover:bg-border rounded-[12px] text-sm font-bold transition-colors flex items-center justify-center gap-2"><i class="fa-solid fa-eraser"></i> Limpar</button></div>
        </div>
        
        <div class="mt-4 pt-4 border-t border-border flex justify-between items-center">
            <p class="text-[10px] font-bold text-text-secondary uppercase tracking-wider hidden sm:block"><i class="fa-solid fa-filter text-brand-medium"></i> Filtros aplicados</p>
            <div class="flex gap-3">
                <button data-action="deleteSelectedTx" class="bg-danger/10 text-danger px-4 py-2 rounded-[8px] text-xs font-bold hover:bg-danger hover:text-white transition-colors flex items-center gap-2"><i class="fa-solid fa-trash"></i> Apagar Selecionados</button>
                <button data-action="clearFilters" class="text-text-secondary hover:text-text-primary text-xs font-bold transition-colors flex items-center gap-1.5"><i class="fa-solid fa-rotate-left"></i> Limpar Busca</button>
            </div>
        </div>
        `;
    }
};