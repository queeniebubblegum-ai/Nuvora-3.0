import { Utils } from './utils.js';
import { CoreComponents } from './cmp-core.js';

export const DashboardComponents = {
    dashboardCards: (atual, anterior) => {
        const calcTrend = (a, b) => {
            if (b === 0) return { val: a > 0 ? 100 : 0, isUp: a > 0 };
            const diff = ((a - b) / b) * 100;
            return { val: Math.abs(diff).toFixed(1), isUp: diff >= 0 };
        };

        const recT = calcTrend(atual.receitas, anterior.receitas);
        const desT = calcTrend(atual.despesas, anterior.despesas);

        // --- ENGENHARIA DE UI: Card Especial de Saldo Livre ---
        const contasPendentes = atual.contasPendentes || 0;
        const saldoLivre = atual.saldo - contasPendentes;
        
        const saldoBrutoFmt = Utils.formatMoney(atual.saldo);
        const pendentesFmt = Utils.formatMoney(contasPendentes);
        const pendentesColor = contasPendentes > 0 ? 'text-danger' : 'text-text-secondary';
        const livreColor = saldoLivre >= 0 ? 'text-text-primary' : 'text-danger';

        const cardSaldoLivre = `
        <div class="bg-surface p-5 rounded-[16px] border border-border shadow-soft flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-all">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h4 class="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1 font-primary flex items-center gap-1.5"><i class="fa-solid fa-wallet text-brand-medium"></i> Saldo Livre</h4>
                    <h2 class="text-2xl font-black ${livreColor} font-mono tracking-tight">${Utils.formatMoney(saldoLivre)}</h2>
                </div>
                <div class="w-10 h-10 rounded-[12px] bg-bg border border-border text-brand-medium flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <i class="fa-solid fa-unlock-keyhole"></i>
                </div>
            </div>
            <div class="text-[10px] text-text-secondary flex flex-col gap-1.5 bg-bg p-2.5 rounded-[8px] border border-border">
                <div class="flex justify-between items-center"><span class="flex items-center gap-1"><i class="fa-solid fa-building-columns opacity-50"></i> Saldo Bruto:</span> <span class="font-mono font-medium text-text-primary">${saldoBrutoFmt}</span></div>
                <div class="flex justify-between items-center"><span class="flex items-center gap-1"><i class="fa-solid fa-clock opacity-50"></i> Agendamentos:</span> <span class="font-mono font-bold ${pendentesColor}">- ${pendentesFmt}</span></div>
            </div>
        </div>`;

        return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${CoreComponents._buildSummaryCard('Receitas', atual.receitas, recT.val, recT.isUp, 'fa-arrow-trend-up', 'vs período anterior')}
            ${CoreComponents._buildSummaryCard('Despesas', atual.despesas, desT.val, !desT.isUp, 'fa-arrow-trend-down', 'vs período anterior')}
            ${cardSaldoLivre}
        </div>`;
    },

    insightsSection: (mentoria) => {
        let btnHtml = '';
        if (mentoria.onboardingAction) {
            const { label, action, modal, type } = mentoria.onboardingAction;
            btnHtml = `<button data-action="${action}" data-modal="${modal}" ${type ? `data-type="${type}"` : ''} class="mt-5 w-full sm:w-auto bg-white text-brand-deep font-bold px-8 py-3.5 rounded-[12px] shadow-dark-glow hover:shadow-white-glow transition-all flex items-center justify-center gap-2 hover:-translate-y-1"><i class="fa-solid fa-bolt"></i> ${label}</button>`;
        }

        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const mesAtual = meses[new Date().getMonth()];
        const trendBadge = mentoria.trend > 0 ? `<span class="bg-success text-white px-2 py-0.5 rounded-md text-[10px] ml-2 shadow-sm whitespace-nowrap">▲ +${mentoria.trend} pts</span>` : (mentoria.trend < 0 ? `<span class="bg-danger text-white px-2 py-0.5 rounded-md text-[10px] ml-2 shadow-sm whitespace-nowrap">▼ ${mentoria.trend} pts</span>` : '');

        // Badge Visual do Nível da Jornada Semântica
        const levelBadges = {
            1: '<span class="bg-white/10 border border-white/20 text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1.5 justify-center mt-3"><i class="fa-solid fa-seedling text-brand-soft"></i> Nível 1: Explorador</span>',
            2: '<span class="bg-brand-soft border border-white/30 text-brand-deep px-3 py-1.5 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1.5 justify-center mt-3"><i class="fa-solid fa-piggy-bank text-brand-deep"></i> Nível 2: Poupador</span>',
            3: '<span class="bg-[#F9D342] border border-white/30 text-brand-deep px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 justify-center mt-3"><i class="fa-solid fa-chess-knight text-brand-deep"></i> Nível 3: Estrategista</span>'
        };
        const badgeHtml = mentoria.isOnboarding ? '' : (levelBadges[mentoria.userLevel] || levelBadges[1]);

        return `
        <div class="rounded-[20px] shadow-soft overflow-hidden mb-8 relative" style="background: linear-gradient(135deg, var(--c-brand-deep) 0%, var(--c-brand-dark) 100%); color: #FFFFFF;">
            <div class="p-8 flex flex-col md:flex-row gap-8 items-center relative z-10">
                <div class="flex flex-col items-center text-center shrink-0 w-44">
                    <div class="w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-inner border border-brand-medium" style="background-color: #6C3BB6; color: #FFFFFF; font-family: 'Playfair Display', serif;">
                        ${mentoria.score}
                    </div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-brand-soft mt-4 flex items-center justify-center flex-wrap gap-1">Diagnóstico Estratégico <br> ${mesAtual} ${trendBadge}</span>
                    <span class="text-sm font-bold mt-2 text-white bg-black/20 px-3 py-1 rounded-full border border-white/10">${mentoria.classification}</span>
                    ${badgeHtml}
                </div>

                <div class="flex-1 space-y-5 md:border-l md:border-brand-medium/30 md:pl-8 w-full">
                    <div class="space-y-3">
                        ${mentoria.insights.map(insight => `
                            <div class="flex gap-3 items-start">
                                <i class="fa-solid fa-angle-right mt-1 text-[10px] text-brand-soft"></i>
                                <p class="text-sm text-white/90 leading-relaxed font-medium">${Utils.escapeHTML(insight)}</p>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="bg-black/20 p-5 rounded-[16px] border border-white/10 backdrop-blur-sm shadow-inner">
                        <h4 class="text-[10px] font-black uppercase mb-2 flex items-center gap-2 text-brand-soft">
                            <i class="fa-solid fa-crosshairs"></i> Diretriz Executiva
                        </h4>
                        <p class="text-[15px] font-bold text-white leading-tight font-mentor tracking-wide">${Utils.escapeHTML(mentoria.recommendation)}</p>
                        ${btnHtml}
                    </div>
                </div>
            </div>
            <div class="absolute -right-20 -bottom-20 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none bg-brand-soft"></div>
        </div>`;
    },

    dashboardPillars: (pillars) => {
        const getPillarConfig = (score, name) => {
            let status, icon, color;
            if (score >= 80) status = 'Excelente'; 
            else if (score >= 60) status = 'Equilibrado'; 
            else if (score >= 40) status = 'Atenção'; 
            else status = 'Crítico'; 

            if(name === 'fluxoCaixa') { icon = 'fa-arrow-trend-up'; color = 'text-reserve'; } 
            else if(name === 'reservas') { icon = 'fa-shield-halved'; color = 'text-investment'; } 
            else if(name === 'credito') { icon = 'fa-credit-card'; color = 'text-credit'; } 
            else if(name === 'futuro') { icon = 'fa-road'; color = 'text-text-secondary'; } 

            return { status, icon, color };
        };

        const renderCard = (key, title, desc) => {
            const score = pillars[key];
            const cfg = getPillarConfig(score, key);
            
            let feedbackText = 'text-text-secondary';
            if(cfg.status === 'Excelente') feedbackText = 'text-success';
            if(cfg.status === 'Crítico') feedbackText = 'text-danger';

            return `
            <div class="bg-surface p-5 rounded-[16px] border border-border shadow-soft hover:-translate-y-1 transition-all flex flex-col justify-between group">
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
        <div class="mb-10">
            <h3 class="font-bold text-text-primary text-base mb-4 tracking-tight flex items-center gap-2 font-primary">
                <i class="fa-solid fa-chart-column text-brand-medium"></i> Pilares Estratégicos
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                ${renderCard('fluxoCaixa', 'Fluxo de Caixa', 'Margem de manobra financeira.')}
                ${renderCard('reservas', 'Reservas', 'Blindagem contra imprevistos.')}
                ${renderCard('credito', 'Crédito', 'Dependência de terceiros.')}
                ${renderCard('futuro', 'O Futuro', 'Peso dos parcelamentos.')}
            </div>
        </div>
        `;
    },

    dashboardAccounts: (bancos = [], cartoes = [], compras = []) => {
        const domínios = {'Nubank':'nubank.com.br','Itaú':'itau.com.br','Inter':'bancointer.com.br','Santander':'santander.com.br','Bradesco':'bradesco.com.br','Banco do Brasil':'bb.com.br','C6 Bank':'c6bank.com.br','Caixa':'caixa.gov.br'};
        const logo = (nome, cor) => { const dominio = domínios[nome]; const iniciais = String(nome || 'C').slice(0, 2).toUpperCase(); return `<div class="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-border bg-bg" style="color:${cor || 'var(--c-brand-medium)'}"><img src="${dominio ? `https://logo.clearbit.com/${dominio}` : ''}" alt="" class="w-7 h-7 object-contain" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span class="hidden text-[10px] font-black">${Utils.escapeHTML(iniciais)}</span></div>`; };
        const contasHtml = bancos.length ? bancos.map(b => `<div class="flex items-center gap-3 py-2.5 border-b border-border last:border-0"><span>${logo(b.instituicao || b.nome, b.cor)}</span><span class="flex-1 min-w-0 text-xs text-text-primary truncate"><strong class="block truncate">${Utils.escapeHTML(b.nome || b.instituicao || 'Conta')}</strong><small class="text-[10px] text-text-secondary">${Utils.escapeHTML(b.instituicao || 'Conta')}</small></span><strong class="text-xs font-mono text-text-primary">${Utils.formatMoney(b.saldo || 0)}</strong></div>`).join('') : '<p class="text-xs text-text-secondary">Nenhuma conta cadastrada.</p>';
        const cartoesHtml = cartoes.length ? cartoes.map(c => { const limite = Number(c.limite || c.limiteTotal || 0); const usado = compras.filter(t => String(t.cartaoId || t.bancoId) === String(c.id)).reduce((s,t) => s + (Number(t.valor)||0), 0); const disponivel = Math.max(limite - usado, 0); const pct = limite ? Math.min(usado / limite * 100, 100) : 0; const cor = pct > 80 ? 'bg-danger' : pct > 50 ? 'bg-credit' : 'bg-success'; const banco = bancos.find(b => String(b.id) === String(c.bancoId)); return `<div class="flex items-center gap-3 py-2.5 border-b border-border last:border-0"><span>${logo(banco?.instituicao || c.nome, banco?.cor)}</span><div class="flex-1 min-w-0"><div class="flex justify-between"><span class="text-xs text-text-primary truncate">${Utils.escapeHTML(c.nome || 'Cartão')}</span><strong class="text-xs font-mono text-text-primary">${Utils.formatMoney(disponivel)}</strong></div><div class="flex justify-between text-[10px] text-text-secondary mt-1"><span>disponível</span><span>limite ${Utils.formatMoney(limite)}</span></div><div class="w-full h-1.5 bg-border rounded-full mt-1"><div class="${cor} h-1.5 rounded-full" style="width:${pct}%"></div></div></div></div>`; }).join('') : '<p class="text-xs text-text-secondary">Nenhum cartão cadastrado.</p>';
        return `<div class="bg-surface p-5 rounded-[16px] border border-border shadow-soft mt-8 mb-8"><div class="flex items-center gap-2 mb-3"><i class="fa-solid fa-wallet text-brand-medium"></i><h3 class="font-bold text-text-primary text-base font-primary">Contas e cartões</h3></div><div class="grid grid-cols-1 md:grid-cols-2 gap-5"><div><p class="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">Contas correntes e poupança</p>${contasHtml}</div><div><p class="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">Cartões de crédito</p>${cartoesHtml}</div></div></div>`;
    },

    dashboardAgenda: (agendamentos = [], receitas = [], state = {}) => {
        const hoje = new Date(); const ano = Number(state.agendaYear ?? hoje.getFullYear()); const mes = Number(state.agendaMonth ?? hoje.getMonth());
        const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const itens = [...agendamentos.map(i => ({...i, dataAgenda: i.dataVencimento || i.data})), ...receitas.map(i => ({...i, dataAgenda: i.data, tipo: 'receita'}))].filter(i => i.dataAgenda);
        const porDia = {}; itens.forEach(i => { const d = new Date(i.dataAgenda + 'T12:00:00'); if (d.getFullYear() === ano && d.getMonth() === mes) (porDia[d.getDate()] ||= []).push(i); });
        const primeiro = new Date(ano, mes, 1).getDay(); const totalDias = new Date(ano, mes + 1, 0).getDate();
        let cells = ''; for (let i=0;i<primeiro;i++) cells += '<div></div>'; for (let dia=1;dia<=totalDias;dia++) { const lista = porDia[dia] || []; const ehHoje = ano === new Date().getFullYear() && mes === new Date().getMonth() && dia === new Date().getDate(); cells += `<button type="button" data-action="showAgendaDay" onclick="App.showAgendaDay('${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}')" data-payload="${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}" class="min-h-[54px] p-1.5 rounded-lg border ${lista.length ? 'border-brand-medium/40 bg-brand-medium/5' : 'border-border'} ${ehHoje ? 'ring-2 ring-brand-medium ring-offset-1' : ''} text-left" style="${ehHoje ? 'border-color: var(--c-brand-medium); box-shadow: 0 0 0 2px var(--c-brand-medium);' : ''} hover:bg-bg transition-colors"><span class="text-xs font-bold text-text-primary">${dia}</span>${lista.length ? `<span class="block mt-1 text-[9px] font-bold ${lista.some(i=>i.tipo==='receita') ? 'text-success' : 'text-danger'}">${lista.length} item(ns)</span>` : ''}</button>`; }
        return `<div class="bg-surface p-5 rounded-[16px] border border-border shadow-soft"><div class="flex justify-between items-center mb-4"><div><h3 class="font-bold text-text-primary text-lg font-primary">Agenda financeira</h3><p class="text-xs text-text-secondary">${nomes[mes]} de ${ano} · clique em um dia</p></div><div class="flex items-center gap-1"><button type="button" data-action="resetAgendaToday" class="px-2 h-8 rounded-lg border border-border text-[10px] font-bold text-text-secondary hover:bg-bg">Hoje</button><button type="button" data-action="changeAgendaMonth" data-dir="-1" class="w-8 h-8 rounded-lg border border-border text-text-secondary hover:bg-bg" aria-label="Mês anterior"><i class="fa-solid fa-chevron-left text-xs"></i></button><button type="button" data-action="changeAgendaMonth" data-dir="1" class="w-8 h-8 rounded-lg border border-border text-text-secondary hover:bg-bg" aria-label="Próximo mês"><i class="fa-solid fa-chevron-right text-xs"></i></button></div></div><div class="grid grid-cols-7 gap-1.5 mb-2 text-center text-[9px] font-bold text-text-secondary"><span>DOM</span><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span></div><div class="grid grid-cols-7 gap-1.5">${cells}</div></div>`;
    },

    dashboardCategories: (transacoesPeriodoAtual) => {
        const cats = {};
        transacoesPeriodoAtual.filter(t => t.tipo === 'despesa').forEach(t => { 
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
        <div class="bg-surface p-6 rounded-[16px] border border-border shadow-soft">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-bold text-text-primary text-lg font-primary">Principais Categorias</h3>
                <button data-action="navigate" data-payload="Categorias" class="text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">Ver todas &rarr;</button>
            </div>
            <div class="space-y-1">
                ${listHtml || emptyState}
            </div>
        </div>`;
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
                const isRec = t.tipo === 'receita';
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