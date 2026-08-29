import { Utils } from './utils.js';
import { Database, db, collections } from './db.js';
import { Notifications } from './notifications.js';
import { ChartManager } from './charts.js';
import { createReactiveState } from './store.js';
import { Router } from './router.js';
import { EventManager } from './events.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';
import { OFXManager } from './ofx.js';
import { CSVManager } from './csv-manager.js';

// --- ENGENHARIA DE UX: Assistente de Fechamento de Mês ---
const FechamentoManager = {
    state: { step: 0, pendencias: [], mesNome: '' },
    
    iniciar: () => {
        const hoje = new Date();
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        FechamentoManager.state.mesNome = meses[hoje.getMonth()];
        
        const fimDoMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
        FechamentoManager.state.pendencias = db.agendamentos.filter(a => {
            return a.status === 'pendente' && new Date(a.dataVencimento + 'T12:00:00') <= fimDoMesAtual;
        });
        
        FechamentoManager.state.step = 0;
        App.openModal('modal-fechamento-mes');
        FechamentoManager.renderStep();
    },
    
    renderStep: () => {
        const content = document.getElementById('fechamento-content');
        const btnPrev = document.getElementById('btn-fechamento-prev');
        const btnNext = document.getElementById('btn-fechamento-next');
        const progress = document.getElementById('fechamento-progress');

        if(!content) return;

        progress.style.width = `${((FechamentoManager.state.step + 1) / 3) * 100}%`;
        btnPrev.classList.toggle('hidden', FechamentoManager.state.step === 0);
        
        btnNext.onclick = FechamentoManager.nextStep;
        btnPrev.onclick = FechamentoManager.prevStep;

        if (FechamentoManager.state.step === 0) {
            btnNext.innerHTML = 'Iniciar Revisão <i class="fa-solid fa-arrow-right"></i>';
            content.innerHTML = `
                <div class="text-center space-y-4 py-6">
                    <div class="w-20 h-20 bg-brand-soft/20 text-brand-medium border border-brand-medium/30 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
                        <i class="fa-solid fa-flag-checkered"></i>
                    </div>
                    <h4 class="text-2xl font-bold text-text-primary">Hora de fechar ${FechamentoManager.state.mesNome}</h4>
                    <p class="text-sm text-text-secondary leading-relaxed px-4">Vamos isolar o ruído e focar no que importa: verificar suas contas pendentes e dar um destino inteligente ao seu dinheiro livre. Leva menos de 1 minuto.</p>
                </div>
            `;
        } else if (FechamentoManager.state.step === 1) {
            btnNext.innerHTML = 'Próximo Passo <i class="fa-solid fa-arrow-right"></i>';
            
            if (FechamentoManager.state.pendencias.length === 0) {
                content.innerHTML = `
                    <div class="text-center space-y-4 py-6">
                        <div class="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                            <i class="fa-solid fa-check-double"></i>
                        </div>
                        <h4 class="text-lg font-bold text-text-primary">Tudo em dia!</h4>
                        <p class="text-sm text-text-secondary">Nenhuma conta agendada para este mês consta como pendente.</p>
                    </div>
                `;
            } else {
                let list = FechamentoManager.state.pendencias.map(a => `
                    <div class="flex items-center justify-between p-3.5 bg-bg border border-border rounded-[12px] mb-3 transition-opacity">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-[8px] ${a.tipo === 'despesa' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'} flex items-center justify-center shrink-0">
                                <i class="fa-solid ${a.tipo === 'despesa' ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'}"></i>
                            </div>
                            <div>
                                <p class="text-sm font-bold text-text-primary truncate max-w-[150px] sm:max-w-[200px]">${Utils.escapeHTML(a.desc)}</p>
                                <p class="text-[10px] font-bold text-text-secondary uppercase mt-0.5 tracking-wider">Vence: ${a.dataVencimento.split('-').reverse().join('/')}</p>
                            </div>
                        </div>
                        <div class="text-right shrink-0">
                            <p class="text-sm font-bold font-mono ${a.tipo === 'despesa' ? 'text-danger' : 'text-success'}">${Utils.formatMoney(a.valor)}</p>
                            <button onclick="App.markAgendamentoPaid('${a.id}'); this.parentElement.parentElement.style.opacity='0.4'; this.disabled=true; this.innerHTML='<i class=\\'fa-solid fa-check\\'></i> Confirmado';" class="text-[10px] font-bold bg-surface border border-border px-2 py-1 rounded text-text-primary hover:text-brand-medium hover:border-brand-medium uppercase tracking-wider mt-1.5 transition-colors">Dar Baixa</button>
                        </div>
                    </div>
                `).join('');

                content.innerHTML = `
                    <div>
                        <h4 class="text-base font-bold text-text-primary mb-1">Revisão de Contas</h4>
                        <p class="text-xs text-text-secondary mb-5">Encontramos pendências para este mês. Se você já as pagou na vida real, confirme abaixo.</p>
                        <div class="max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                            ${list}
                        </div>
                    </div>
                `;
            }
        } else if (FechamentoManager.state.step === 2) {
            btnNext.innerHTML = 'Concluir Mês <i class="fa-solid fa-check"></i>';
            
            const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
            const pendenciasAtuais = db.agendamentos.filter(a => a.status === 'pendente' && new Date(a.dataVencimento + 'T12:00:00') <= fimMes);
            const pendenciasTotal = pendenciasAtuais.reduce((acc, a) => acc + (a.tipo === 'despesa' ? a.valor : -a.valor), 0);
            const saldoReal = Database.getTotals().saldo - pendenciasTotal;

            if (saldoReal <= 0 || db.metas.length === 0) {
                content.innerHTML = `
                    <div class="text-center space-y-4 py-6">
                        <div class="w-16 h-16 bg-bg border border-border text-text-secondary rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                            <i class="fa-solid fa-lock"></i>
                        </div>
                        <h4 class="text-lg font-bold text-text-primary">Mês estanque.</h4>
                        <p class="text-sm text-text-secondary">Seu fluxo de caixa está completamente alocado. Foco em manter a linha no próximo ciclo.</p>
                    </div>
                `;
            } else {
                const metaOptions = db.metas.map(m => `<option value="${m.id}">${Utils.escapeHTML(m.nome)} (Faltam ${Utils.formatMoney(m.alvo - m.atual)})</option>`).join('');
                
                content.innerHTML = `
                    <div>
                        <div class="text-center mb-6 bg-surface border border-border p-4 rounded-[16px] shadow-sm">
                            <p class="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Saldo Livre Confirmado</p>
                            <p class="text-3xl font-black text-brand-medium font-mono">${Utils.formatMoney(saldoReal)}</p>
                        </div>
                        <h4 class="text-sm font-bold text-text-primary mb-1 flex items-center gap-2"><i class="fa-solid fa-rocket text-investment"></i> Destinação Estratégica</h4>
                        <p class="text-xs text-text-secondary mb-4">O dinheiro sobrou. Proteja-o. Envie parte desse saldo para uma de suas Metas agora mesmo.</p>
                        
                        <div class="space-y-4 bg-bg p-4 rounded-[12px] border border-border">
                            <div>
                                <label class="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Enviar para:</label>
                                <select id="fechamento-meta-id" class="w-full p-3 bg-surface border border-border rounded-[12px] text-sm focus:border-brand-medium outline-none transition-colors">
                                    <option value="">Nenhuma (Manter em conta corrente)</option>
                                    ${metaOptions}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Valor do Aporte (R$)</label>
                                <input type="number" id="fechamento-meta-valor" max="${saldoReal}" step="0.01" placeholder="0.00" class="w-full p-3 bg-surface border border-border rounded-[12px] text-sm focus:border-brand-medium outline-none font-mono transition-colors">
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    },
    
    nextStep: () => {
        if (FechamentoManager.state.step === 2) {
            const metaSelect = document.getElementById('fechamento-meta-id');
            const metaValor = document.getElementById('fechamento-meta-valor');
            
            if (metaSelect && metaSelect.value && metaValor && parseFloat(metaValor.value) > 0) {
                const idMeta = parseFloat(metaSelect.value);
                const valorDepositado = parseFloat(metaValor.value);
                
                Database.depositGoal(idMeta, valorDepositado);
                Database.add('transacoes', {
                    id: Date.now(),
                    desc: 'Aporte de Fechamento de Mês',
                    valor: valorDepositado,
                    tipo: 'despesa',
                    categoria: 'Investimento/Meta',
                    bancoId: db.bancos.length > 0 ? db.bancos[0].id : null,
                    isCartao: false,
                    formaPagamento: 'Transferência',
                    data: Utils.localISODate(),
                    parcelaAtual: 1, totalParcelas: 1, recorrente: false
                });
            }
            
            App.closeModal();
            Utils.showToast('Mês concluído e blindado com sucesso!', 'success');
            App.scheduleRender();
        } else {
            FechamentoManager.state.step++;
            FechamentoManager.renderStep();
        }
    },
    
    prevStep: () => {
        if (FechamentoManager.state.step > 0) {
            FechamentoManager.state.step--;
            FechamentoManager.renderStep();
        }
    }
};

export const App = {
    currentPage: 'Dashboard',
    renderQueue: null,
    isInitialized: false,
    
    // EXPOSIÇÃO DO GATILHO PARA A INTERFACE
    iniciarFechamentoMes: () => FechamentoManager.iniciar(),
    
    viewState: createReactiveState({
        activeCardId: null,
        invoiceMonth: new Date().getMonth(),
        invoiceYear: new Date().getFullYear(),
        budgetMonth: new Date().getMonth(),
        budgetYear: new Date().getFullYear(),
        agendaMonth: new Date().getMonth(),
        agendaYear: new Date().getFullYear(),
        filters: { desc: '', categoria: '', bancoId: '', mes: '', tipo: '', dataInicio: '', dataFim: '' },
        reportTab: 'fluxo',
        isNotifOpen: false,
        notifTab: 'alertas',
        dashboardPeriod: 'este_mes',
        reportPeriod: 6,
        selectedTransactions: [],
        ofxPendente: null,
        ofxPendenteSaldoFinal: null, 
        rawOfxString: null,
        bancoAlvoOFX: null,
        txPage: 1,
        txPerPage: 10
    }, () => {
        if (App.scheduleRender) App.scheduleRender();
    }),

    init: () => {
        if (App.isInitialized) return;
        App.isInitialized = true;

        const checkSystemTheme = () => {
            const savedTheme = localStorage.getItem('nuvora_theme');
            if (savedTheme) {
                document.documentElement.classList.toggle('dark', savedTheme === 'dark');
            } else {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.classList.toggle('dark', prefersDark);
            }
        };
        
        checkSystemTheme();

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('nuvora_theme')) {
                document.documentElement.classList.toggle('dark', e.matches);
            }
        });
        
        window.toggleDarkMode = () => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('nuvora_theme', isDark ? 'dark' : 'light');
        };

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js').catch(err => {
                console.warn('Aviso no registro do Service Worker:', err);
            });
        }

        document.addEventListener('db-updated', () => { 
            App.scheduleRender(); 
            Notifications.updateBadge(); 
        });
        const hoje = Utils.localISODate();
        
        ['input-data-trans', 'dc-data', 'simulador-data'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = hoje;
        });
        
        try {
            EventManager.setup();

            const startPage = Router.init((page, skipHistory) => {
                App.closeModal();
                App.navigate(page, skipHistory);
            });
            
            App.currentPage = startPage;

            Notifications.engine();
            App.autoProvisionInvoices(); 
            App.scheduleRender();
            Renderer.updateBankSelect(); 
            Renderer.updateCategorySelects();
            Renderer.updateContatoSelect();
            App.setupSmartCategories(); 
            App.checkAutoBackup();
            Notifications.updateBadge();
        } catch(e) {
            console.error("Erro na inicialização:", e);
        }
    },

    autoProvisionInvoices: () => {
        if (!db.cartoes || db.cartoes.length === 0 || !db.comprasCartao || db.comprasCartao.length === 0) return;
        
        const hoje = new Date();
        let mudou = false;

        for (let i = 0; i < 6; i++) {
            const mesAlvo = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
            const refMonth = `${mesAlvo.getFullYear()}-${String(mesAlvo.getMonth() + 1).padStart(2, '0')}`;

            db.cartoes.forEach(cartao => {
                const parcelasDoMes = db.comprasCartao.filter(c => {
                    if (c.cartaoId !== cartao.id) return false;
                    const dataParcela = new Date(c.data + 'T12:00:00');
                    return dataParcela.getMonth() === mesAlvo.getMonth() && dataParcela.getFullYear() === mesAlvo.getFullYear();
                });

                const invoiceTotal = parcelasDoMes.reduce((acc, curr) => acc + curr.valor, 0);

                if (invoiceTotal > 0) {
                    const agendamentoExistente = db.agendamentos.find(a => 
                        a.cartaoId === cartao.id && 
                        a.mesReferencia === refMonth && 
                        a.categoria === 'Fatura Cartão'
                    );

                    let diaVencimento = cartao.vencimento;
                    let dataVenc = new Date(mesAlvo.getFullYear(), mesAlvo.getMonth(), diaVencimento);
                    
                    if (!agendamentoExistente) {
                        Database.add('agendamentos', {
                            id: Date.now() + Math.random(),
                            desc: `Fatura ${cartao.nome}`,
                            valor: invoiceTotal,
                            dataVencimento: dataVenc.toISOString().split('T')[0],
                            categoria: 'Fatura Cartão',
                            status: 'pendente',
                            cartaoId: cartao.id,
                            mesReferencia: refMonth,
                            tipo: 'despesa'
                        });
                        mudou = true;
                    } else if (Math.abs(agendamentoExistente.valor - invoiceTotal) > 0.01) {
                        Database.updateAgendamento(agendamentoExistente.id, { valor: invoiceTotal });
                        mudou = true;
                    }
                }
            });
        }
        
        if (mudou) App.scheduleRender();
    },

    markAgendamentoPaid: (id) => {
        const agendamento = db.agendamentos.find(a => a.id.toString() === id.toString());
        if(!agendamento || agendamento.status === 'pago') return;

        Database.updateAgendamento(id, { status: 'pago' });

        let txCategoria = agendamento.categoria;
        let txDesc = agendamento.desc;

        if (agendamento.categoria === 'Fatura Cartão') {
            txCategoria = 'Pagamento de Fatura';
        }

        Database.add('transacoes', {
            id: Date.now(),
            desc: txDesc,
            valor: agendamento.valor,
            tipo: agendamento.tipo || 'despesa',
            categoria: txCategoria,
            bancoId: agendamento.bancoId || (db.bancos.length > 0 ? db.bancos[0].id : null),
            isCartao: false,
            formaPagamento: 'Automático (Agendamento)',
            data: Utils.localISODate()
        });

        Utils.showToast('Conta marcada como paga!', 'success');
        App.scheduleRender();
    },

    updateDOM: (id, html) => Renderer.updateDOM(id, html),
    
    updateBankSelect: () => {
        Renderer.updateBankSelect();
    },

    updateCartaoSelect: (bancoId) => {
        const selectCartao = document.getElementById('input-cartao-trans');
        if(!selectCartao) return;
        const cartoesDaConta = db.cartoes.filter(c => c.bancoId.toString() === bancoId.toString());
        if(cartoesDaConta.length > 0) {
            selectCartao.innerHTML = cartoesDaConta.map(c => `<option value="${c.id}">${Utils.escapeHTML(c.nome)}</option>`).join('');
        } else {
            selectCartao.innerHTML = '<option value="" disabled selected>Nenhum cartão para esta conta</option>';
        }
    },

    updateCategorySelects: () => Renderer.updateCategorySelects(),
    updateContatoSelect: () => Renderer.updateContatoSelect(),
    renderInvoiceModal: () => Renderer.renderInvoiceModal(App.viewState),

    updateSidebarProfile: () => {
        const perfilDiv = document.getElementById('nav-Configuracoes-perfil');
        if (!perfilDiv || !db.usuario) return;
        
        const img = perfilDiv.querySelector('img');
        const nome = perfilDiv.querySelector('span.text-sm');
        const subtitulo = perfilDiv.querySelector('span.text-\\[10px\\]');
        
        if (img) img.src = db.usuario.fotoUrl || 'assets/perfil.svg';
        if (nome) nome.innerText = db.usuario.nome || 'Maria Eduarda';
        if (subtitulo) subtitulo.innerText = db.usuario.subtitulo || 'Analista Pleno';
    },

    scheduleRender: () => {
        if (App.renderQueue) cancelAnimationFrame(App.renderQueue);
        App.renderQueue = requestAnimationFrame(() => {
            Renderer.render(App.viewState, App.currentPage);
            App.updateSidebarProfile();
            
            if (App.currentPage === 'Relatorios') {
                requestAnimationFrame(() => { ChartManager.renderAll(App.viewState, db); });
            } else if (App.currentPage === 'Categorias') {
                requestAnimationFrame(() => {
                    if (typeof ChartManager !== 'undefined' && ChartManager.renderCategoriasPageChart) {
                        ChartManager.renderCategoriasPageChart(db);
                    }
                });
            }
            App.renderQueue = null;
        });
    },

    exportTransactionsCSV: () => {
        const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const f = App.viewState.filters || {};
        let transacoes = db.transacoes.filter(t => !f.desc || String(t.desc || '').toLowerCase().includes(f.desc.toLowerCase()) || String(t.codigoRef || '').toLowerCase().includes(f.desc.toLowerCase()));
        if (f.categoria) transacoes = transacoes.filter(t => t.categoria === f.categoria);
        if (f.mes !== '') transacoes = transacoes.filter(t => new Date(t.data || t.id).getMonth() === parseInt(f.mes));
        if (f.bancoId) { const [type, id] = f.bancoId.split('_'); transacoes = transacoes.filter(t => type === 'banco' ? (!t.isCartao && t.bancoId == id) : (t.isCartao && t.bancoId == id)); }
        const rows = [['Data', 'Valor', 'Identificador', 'Descrição', 'Tipo', 'Categoria'], ...transacoes.map(t => [t.data, t.tipo === 'despesa' ? -t.valor : t.valor, t.codigoRef || '', t.desc, t.tipo, t.categoria || ''])];
        const csv = rows.map(row => row.map(escape).join(';')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob); const link = document.createElement('a');
        link.href = url; link.download = `nuvora-lancamentos-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
        Utils.showToast('Lançamentos exportados em CSV.', 'success');
    },

    exportToPDF: () => {
        const element = document.getElementById('relatorio-export');
        if (!element) return;
        Utils.showToast('Preparando documento PDF, aguarde...', 'success');
        const opt = {
            margin:       [10, 10, 10, 10],
            filename:     `relatorio_${App.viewState.reportTab}_${new Date().getTime()}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        const originalBg = element.style.backgroundColor;
        const isDark = document.documentElement.classList.contains('dark');
        element.style.backgroundColor = isDark ? '#0F172A' : '#F8F9FD';
        element.style.padding = '20px';
        html2pdf().set(opt).from(element).save().then(() => {
            element.style.backgroundColor = originalBg; element.style.padding = ''; Utils.showToast('PDF exportado com sucesso!', 'success');
        }).catch(err => {
            element.style.backgroundColor = originalBg; element.style.padding = ''; Utils.showToast('Ocorreu um erro na exportação.', 'error');
        });
    },

    checkAutoBackup: () => {
        const hojeStr = Utils.localISODate();
        const lastBackup = localStorage.getItem('nuvora_last_backup');
        if (lastBackup !== hojeStr && db.transacoes.length > 0) {
            Utils.showToast('Gerando backup automático diário...', 'success');
            setTimeout(() => { App.exportBackup(true); }, 2000);
        }
    },

    setupSmartCategories: () => {
        const rules = {
            'mercado': 'Alimentação', 'supermercado': 'Alimentação', 'atacadao': 'Alimentação', 'assai': 'Alimentação', 'fort': 'Alimentação', 'comper': 'Alimentação',
            'ifood': 'Alimentação', 'padaria': 'Alimentação', 'restaurante': 'Alimentação', 'lanche': 'Alimentação', 'pizza': 'Alimentação',
            'hamburguer': 'Alimentação', 'mcdonalds': 'Alimentação', 'bk': 'Alimentação', 'burger king': 'Alimentação', 'sorvete': 'Alimentação',
            'acougue': 'Alimentação', 'hortifruti': 'Alimentação', 'bar': 'Alimentação', 'cafe': 'Alimentação', 'bebida': 'Alimentação', 'agua': 'Alimentação',
            
            'uber': 'Transporte', '99': 'Transporte', 'taxi': 'Transporte', 'gasolina': 'Transporte', 'posto': 'Transporte', 'etanol': 'Transporte',
            'combustivel': 'Transporte', 'onibus': 'Transporte', 'metro': 'Transporte', 'passagem': 'Transporte', 'voo': 'Transporte', 
            'estacionamento': 'Transporte', 'pedagio': 'Transporte', 'mecanico': 'Transporte', 'oficina': 'Transporte', 'pneu': 'Transporte',
            'ipva': 'Transporte', 'multa': 'Transporte', 'biz': 'Transporte', 'moto': 'Transporte', 'carro': 'Transporte', 'honda': 'Transporte',
            
            'aluguel': 'Moradia', 'condominio': 'Moradia', 'luz': 'Moradia', 'energisa': 'Moradia', 'energia': 'Moradia', 'sanesul': 'Moradia',
            'internet': 'Moradia', 'net': 'Moradia', 'claro': 'Moradia', 'vivo': 'Moradia', 'tim': 'Moradia', 'celular': 'Moradia',
            'gas': 'Moradia', 'iptu': 'Moradia', 'faxina': 'Moradia', 'diarista': 'Moradia', 'reforma': 'Moradia',
            
            'netflix': 'Lazer', 'cinema': 'Lazer', 'spotify': 'Lazer', 'jogo': 'Lazer', 'steam': 'Lazer', 'show': 'Lazer', 
            'teatro': 'Lazer', 'festa': 'Lazer', 'ingresso': 'Lazer', 'viagem': 'Lazer', 'hotel': 'Lazer', 'airbnb': 'Lazer',
            'prime video': 'Lazer', 'disney': 'Lazer', 'hbo': 'Lazer', 'playstation': 'Lazer', 'xbox': 'Lazer', 'nintendo': 'Lazer',
            
            'farmacia': 'Saúde', 'remedio': 'Saúde', 'medico': 'Saúde', 'terapia': 'Saúde', 'psicologo': 'Saúde', 'dentista': 'Saúde',
            'hospital': 'Saúde', 'exame': 'Saúde', 'otica': 'Saúde', 'academia': 'Saúde', 'crossfit': 'Saúde', 'suplemento': 'Saúde', 'whey': 'Saúde',
            
            'salario': 'Salário', 'adiantamento': 'Salário', 'vale': 'Salário', 'decimo': 'Salário', 'ferias': 'Salário', 'bonus': 'Salário',
            'restituicao': 'Salário', 'rendimento': 'Salário', 'dividendo': 'Salário', 'pix recebido': 'Salário',
            
            'faculdade': 'Educação', 'escola': 'Educação', 'curso': 'Educação', 'livro': 'Educação', 'material': 'Educação', 
            'papelaria': 'Educação', 'mensalidade': 'Educação', 'cpa': 'Educação', 'certificacao': 'Educação', 'anbima': 'Educação',
            
            'roupa': 'Compras', 'sapato': 'Compras', 'tenis': 'Compras', 'bolsa': 'Compras', 'maquiagem': 'Compras', 'perfume': 'Compras',
            'cabelo': 'Compras', 'salao': 'Compras', 'barbearia': 'Compras', 'unha': 'Compras', 'pet': 'Compras', 'racao': 'Compras',
            'veterinario': 'Compras', 'presente': 'Compras', 'shopee': 'Compras', 'shein': 'Compras', 'mercado livre': 'Compras', 
            'amazon': 'Compras', 'aliexpress': 'Compras', 'loja': 'Compras', 'shopping': 'Compras',
            
            'contador': 'Serviços', 'advogado': 'Serviços', 'taxa': 'Serviços', 'imposto': 'Serviços', 'seguro': 'Serviços', 'cartorio': 'Serviços'
        };

        const checkBudgetStatus = (categoriaNome) => {
            const orcamento = db.orcamentos.find(o => o.categoria === categoriaNome);
            if (!orcamento) return null;

            const hoje = new Date();
            const despesasCategoria = db.transacoes.filter(t => 
                t.tipo === 'despesa' && 
                t.categoria === categoriaNome && 
                new Date(t.data || t.id).getFullYear() === hoje.getFullYear() && 
                new Date(t.data || t.id).getMonth() === hoje.getMonth()
            ).reduce((acc, curr) => acc + curr.valor, 0);

            const percentualGasto = (despesasCategoria / orcamento.limite) * 100;
            return { percentual: percentualGasto, limite: orcamento.limite, gasto: despesasCategoria };
        };

        const levenshtein = (a, b) => {
            if (a.length === 0) return b.length;
            if (b.length === 0) return a.length;
            const matrix = [];
            for (let i = 0; i <= b.length; i++) matrix[i] = [i];
            for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
            for (let i = 1; i <= b.length; i++) {
                for (let j = 1; j <= a.length; j++) {
                    if (b.charAt(i - 1) === a.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                    }
                }
            }
            return matrix[b.length][a.length];
        };

        const normalizeTextKeepSpaces = (str) => {
            return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "");
        };

        const processarEntradaAnora = Utils.debounce((target) => {
            const setups = {
                'input-desc': { catId: 'input-categoria', badgeId: 'smart-category-badge' },
                'dc-desc': { catId: 'dc-categoria', badgeId: null },
                'agendamento-desc': { catId: 'agendamento-categoria', badgeId: null }
            };

            const config = setups[target.id];
            if (!config) return;

            const catSelect = document.getElementById(config.catId);
            const smartBadge = config.badgeId ? document.getElementById(config.badgeId) : null;

            if (catSelect && catSelect.getAttribute('data-manual-override') === 'true') return;

            if (catSelect) {
                const rawVal = target.value;
                const valNormSpaces = normalizeTextKeepSpaces(rawVal);
                const valSemEspacos = valNormSpaces.replace(/\s+/g, "");
                
                const tokens = valNormSpaces.split(/\s+/).filter(t => t.length >= 3); 
                
                let matchFound = false;
                
                if (valSemEspacos.length < 3) {
                    if (smartBadge) {
                        smartBadge.classList.add('hidden');
                        smartBadge.classList.remove('flex', 'animate-fade-in');
                    }
                    return;
                }

                const customRules = JSON.parse(localStorage.getItem('nuvora_anora_brain') || '{}');
                const allRules = { ...rules, ...customRules };
                
                for (const [key, category] of Object.entries(allRules)) {
                    const keyNorm = normalizeTextKeepSpaces(key).replace(/\s+/g, ""); 
                    
                    let isMatch = valSemEspacos.includes(keyNorm);

                    if (!isMatch) {
                        for (const token of tokens) {
                            const tolerancia = token.length <= 5 ? 1 : 2;
                            if (levenshtein(token, keyNorm) <= tolerancia) {
                                isMatch = true;
                                break;
                            }
                        }
                    }

                    if (isMatch) {
                        const originalCat = db.categorias.find(c => c.nome.toLowerCase() === category.toLowerCase());
                        if (originalCat) {
                            catSelect.value = originalCat.nome;
                            catSelect.dispatchEvent(new Event('change'));
                            
                            if (smartBadge) {
                                let mensagemExtra = '';
                                let corAlerta = 'text-brand-medium';
                                const budgetStatus = checkBudgetStatus(originalCat.nome);
                                
                                if (budgetStatus) {
                                    if (budgetStatus.percentual >= 100) {
                                        mensagemExtra = ` ⚠️ Limite mensal excedido!`;
                                        corAlerta = 'text-danger';
                                    } else if (budgetStatus.percentual >= 80) {
                                        mensagemExtra = ` ⚠️ Atenção: ${budgetStatus.percentual.toFixed(0)}% do orçamento consumido.`;
                                        corAlerta = 'text-warning'; 
                                    }
                                }

                                const isCustom = customRules[key] ? ' (Regra Aprendida)' : '';
                                smartBadge.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles ${corAlerta}"></i> <span class="ml-1">Anora: <strong>${originalCat.nome}</strong>${isCustom}.${mensagemExtra}</span>`;
                                smartBadge.classList.remove('hidden', 'text-brand-medium', 'text-danger', 'text-warning');
                                smartBadge.classList.add('flex', corAlerta, 'animate-fade-in');
                            }
                            matchFound = true;
                        }
                        break;
                    }
                }
                
                if (!matchFound && smartBadge) {
                    smartBadge.classList.add('hidden');
                    smartBadge.classList.remove('flex', 'animate-fade-in');
                }
            }
        }, 300);

        document.body.addEventListener('input', (e) => {
            const isDescInput = ['input-desc', 'dc-desc', 'agendamento-desc'].includes(e.target.id);
            if (isDescInput) {
                if (e.target.value.trim() === '') {
                    const catId = e.target.id.replace('-desc', '-categoria').replace('dc-desc', 'dc-categoria');
                    const catSelect = document.getElementById(catId);
                    if(catSelect) catSelect.removeAttribute('data-manual-override');
                }
                processarEntradaAnora(e.target);
            }
        });

        document.body.addEventListener('change', (e) => {
            const isCatSelect = ['input-categoria', 'dc-categoria', 'agendamento-categoria'].includes(e.target.id);
            if (isCatSelect && e.isTrusted) { 
                e.target.setAttribute('data-manual-override', 'true');
                
                const descId = e.target.id.replace('-categoria', '-desc').replace('dc-categoria', 'dc-desc');
                const descInput = document.getElementById(descId);
                
                if (descInput && descInput.value.length >= 3) {
                    const novaRegra = descInput.value.trim().toLowerCase();
                    const novaCat = e.target.value;
                    
                    if (novaRegra && novaCat) {
                        let customRules = JSON.parse(localStorage.getItem('nuvora_anora_brain') || '{}');
                        customRules[novaRegra] = novaCat;
                        localStorage.setItem('nuvora_anora_brain', JSON.stringify(customRules));
                    }
                }

                const badgeId = e.target.id === 'input-categoria' ? 'smart-category-badge' : null;
                if (badgeId) {
                     const badge = document.getElementById(badgeId);
                     if(badge) {
                         badge.innerHTML = `<i class="fa-solid fa-brain text-brand-medium"></i> <span class="ml-1 font-bold text-brand-deep">Anora aprendeu este padrão.</span>`;
                         badge.className = 'flex items-center gap-2 w-fit px-3 py-2 mt-2 rounded-[8px] text-[11px] font-mentor bg-brand-soft/20 border border-brand-medium/30 transition-all animate-fade-in';
                     }
                }
            }
        });
    },

    navigate: (page, skipHistory = false) => { 
        App.closeModal(); 
        App.viewState.selectedTransactions = []; 
        App.currentPage = page; 
        Router.navigate(page, skipHistory);
        App.scheduleRender(); 
    },
    
    setDashboardPeriod: (period) => { App.viewState.dashboardPeriod = period; },
    setReportPeriod: (months) => { App.viewState.reportPeriod = parseInt(months); },
    setReportTab: (tab) => { App.viewState.reportTab = tab; },
    
    setTxPage: (page) => {
        App.viewState.txPage = parseInt(page);
    },
    
    setTxPerPage: (limit) => {
        App.viewState.txPerPage = parseInt(limit);
        App.viewState.txPage = 1;
    },

    setFilter: (key, value) => { 
        App.viewState.selectedTransactions = []; 
        App.viewState.filters[key] = value; 
        App.viewState.txPage = 1; 
    },
    
    clearFilters: () => { 
        App.viewState.selectedTransactions = []; 
        App.viewState.filters = { desc: '', categoria: '', bancoId: '', mes: '', tipo: '', dataInicio: '', dataFim: '' }; 
        App.viewState.txPage = 1; 
    },
    
    showAgendaDay: (date) => {
        const items = [...(db.agendamentos || []), ...(db.receitasFuturas || [])].filter(i => (i.dataVencimento || i.data) === date);
        const dataFormatada = new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
        const lista = document.getElementById('agenda-dia-lista');
        const label = document.getElementById('agenda-dia-data');
        const botao = document.getElementById('agenda-dia-adicionar');
        if (label) label.innerText = dataFormatada;
        if (lista) lista.innerHTML = items.length ? items.map(i => {
            const colecao = db.agendamentos.includes(i) ? 'agendamentos' : 'receitasFuturas';
            const pago = i.status === 'pago' || i.status === 'recebida';
            const baixa = !pago ? `<button type="button" data-action="markAgendaPaid" data-col="${colecao}" data-id="${i.id}" class="px-2 py-1 text-[9px] font-bold text-success border border-success/30 rounded hover:bg-success/10">Dar baixa</button>` : `<span class="text-[9px] font-bold text-success">${i.status === 'recebida' ? 'Recebida' : 'Paga'}</span>`;
            return `<div class="flex items-center gap-2 p-3 rounded-lg bg-bg border border-border"><span class="flex-1 min-w-0 text-sm text-text-primary truncate"><i class="fa-solid ${i.tipo === 'receita' ? 'fa-arrow-trend-up text-success' : 'fa-arrow-trend-down text-danger'} mr-2"></i>${Utils.escapeHTML(i.desc || i.nome || 'Lançamento')}</span><strong class="text-sm font-mono ${i.tipo === 'receita' ? 'text-success' : 'text-danger'}">${i.tipo === 'receita' ? '+' : '-'}${Utils.formatMoney(i.valor)}</strong>${baixa}<button type="button" data-action="editAgenda" data-col="${colecao}" data-id="${i.id}" class="w-7 h-7 shrink-0 text-brand-medium hover:bg-brand-medium/10 rounded" title="Editar previsão" aria-label="Editar previsão"><i class="fa-solid fa-pen text-xs"></i></button><button type="button" data-action="delete" data-col="${colecao}" data-id="${i.id}" class="w-7 h-7 shrink-0 text-danger hover:bg-danger/10 rounded" title="Apagar previsão" aria-label="Apagar previsão"><i class="fa-solid fa-trash-can text-xs"></i></button></div>`;
        }).join('') : '<p class="text-sm text-text-secondary text-center py-6">Nenhuma previsão neste dia.</p>';
        if (botao) botao.dataset.date = date;
        App.openModal('modal-agenda-dia');
    },
    markAgendaPaid: (id, col) => {
        const item = (db[col] || []).find(i => String(i.id) === String(id));
        if (!item || item.status === 'pago' || item.status === 'recebida') return;
        if (!window.confirm('Confirmar que esta previsão foi realizada?')) return;
        if (col === 'receitasFuturas') {
            Database.updateReceitaFutura(id, { status: 'recebida' });
            Database.add('transacoes', { id: Date.now(), desc: item.desc, valor: item.valor, tipo: 'receita', categoria: item.categoria || 'Outros', bancoId: item.bancoId || (db.bancos[0]?.id ?? null), isCartao: false, formaPagamento: 'Receita futura recebida', data: Utils.localISODate() });
        } else {
            App.markAgendamentoPaid(String(id));
        }
        App.scheduleRender();
    },
    editAgenda: (id, col) => {
        const item = (db[col] || []).find(i => String(i.id) === String(id));
        if (!item) return;
        App.closeModal();
        App.openModal('modal-agendamento');
        document.getElementById('agendamento-titulo').innerText = 'Editar previsão';
        document.getElementById('agendamento-submit').innerText = 'Salvar alterações';
        document.getElementById('agendamento-edit-id').value = item.id;
        document.getElementById('agendamento-edit-col').value = col;
        document.getElementById('agendamento-tipo').value = item.tipo || 'receita';
        document.getElementById('agendamento-desc').value = item.desc || item.nome || '';
        document.getElementById('agendamento-valor').value = item.valor ?? '';
        document.getElementById('agendamento-data').value = item.dataVencimento || item.data || '';
        if (document.getElementById('agendamento-categoria')) document.getElementById('agendamento-categoria').value = item.categoria || '';
        UI.captureModalState('modal-agendamento');
    },
    addAgendaOnDate: () => {
        const date = document.getElementById('agenda-dia-adicionar')?.dataset.date;
        App.closeModal(); App.openModal('modal-agendamento');
        document.getElementById('agendamento-titulo').innerText = 'Nova previsão';
        document.getElementById('agendamento-submit').innerText = 'Adicionar na Agenda';
        const campoData = document.getElementById('agendamento-data'); if (campoData) campoData.value = date || '';
    },

    resetAgendaToday: () => {
        const hoje = new Date();
        App.viewState.agendaMonth = hoje.getMonth();
        App.viewState.agendaYear = hoje.getFullYear();
        App.scheduleRender();
    },

    changeAgendaMonth: (direction) => {
        let m = Number(App.viewState.agendaMonth) + Number(direction);
        let y = Number(App.viewState.agendaYear);
        if (m > 11) { m = 0; y++; }
        if (m < 0) { m = 11; y--; }
        App.viewState.agendaMonth = m;
        App.viewState.agendaYear = y;
        App.scheduleRender();
    },

    changeMonth: (type, direction) => {
        App.viewState.selectedTransactions = [];
        let m = type === 'invoice' ? App.viewState.invoiceMonth : App.viewState.budgetMonth;
        let y = type === 'invoice' ? App.viewState.invoiceYear : App.viewState.budgetYear;
        m += direction;
        if (m > 11) { m = 0; y++; }
        else if (m < 0) { m = 11; y--; }

        if (type === 'invoice') { 
            App.viewState.invoiceMonth = m; App.viewState.invoiceYear = y; 
            if(document.getElementById('modal-fatura-detalhes').classList.contains('flex')) Renderer.renderInvoiceModal(App.viewState);
        } else { 
            App.viewState.budgetMonth = m; App.viewState.budgetYear = y; 
        }
    },

    setTransactionType: (tipo) => UI.setTransactionType(tipo),
    openModal: (id, transType = null) => UI.openModal(id, transType),
    captureModalState: (id) => UI.captureModalState(id),
    closeModal: (userInitiated = false) => UI.closeModal(App.viewState, userInitiated),
    openEditModal: (id) => UI.openEditModal(id),
    toggleEditLock: () => UI.toggleEditLock(),
    openDepositModal: (id, nome) => UI.openDepositModal(id, nome),
    openCardExpenseModal: (id, nome) => UI.openCardExpenseModal(id, nome),
    checkCartaoVisibility: (formaPgto) => UI.checkCartaoVisibility(formaPgto),

    openInvoiceDetails: (cardId) => {
        if (!cardId || isNaN(cardId)) {
            Utils.showToast('Erro: Identificador do cartão não encontrado ou inválido.', 'error');
            return;
        }

        App.viewState.activeCardId = cardId;
        const hoje = new Date();
        App.viewState.invoiceMonth = hoje.getMonth();
        App.viewState.invoiceYear = hoje.getFullYear();
        
        try {
            Renderer.renderInvoiceModal(App.viewState);
            const modalFatura = document.getElementById('modal-fatura-detalhes');
            if (modalFatura) {
                modalFatura.classList.remove('hidden');
                modalFatura.classList.add('flex', 'animate-fade-in-up');
            }
        } catch (error) {
            console.error("Falha ao abrir detalhes da fatura:", error);
            Utils.showToast('Não foi possível carregar os detalhes desta fatura no momento.', 'error');
            App.viewState.activeCardId = null;
        }
    },

    closeInvoiceDetails: () => {
        App.viewState.selectedTransactions = [];
        const modalFatura = document.getElementById('modal-fatura-detalhes');
        if (modalFatura) {
            modalFatura.classList.add('hidden');
            modalFatura.classList.remove('flex', 'animate-fade-in-up');
        }
        App.viewState.activeCardId = null;
    },

    iniciarImportacaoOFX: (bancoId) => OFXManager.iniciarImportacaoOFX(bancoId, App.viewState),
    iniciarImportacaoCSV: (bancoId) => CSVManager.iniciarImportacao(bancoId, App.viewState),
    handleCSVUpload: (e) => CSVManager.handleUpload(e, App.viewState, App.openModal),
    handleOFXUpload: (e) => OFXManager.handleOFXUpload(e, App.viewState, App.scheduleRender, App.openModal),
    handleOfxBancoChange: (novoBancoId) => OFXManager.handleOfxBancoChange(novoBancoId, App.viewState, App.scheduleRender, App.openModal),
    processarEVerificarDuplicidades: (ofxString, bancoId) => OFXManager.processarEVerificarDuplicidades(ofxString, bancoId, App.viewState, App.scheduleRender, App.openModal),
    renderOFXReviewList: () => OFXManager.renderOFXReviewList(App.viewState),
    toggleSelecaoOFX: (idTemp) => OFXManager.toggleSelecaoOFX(idTemp, App.viewState),
    alterarCategoriaOFX: (idTemp, categoria) => OFXManager.alterarCategoriaOFX(idTemp, categoria, App.viewState),
    salvarOFXAprovado: () => OFXManager.salvarOFXAprovado(App.viewState, App.closeModal, App.scheduleRender),

    handleBancoChange: (bancoId) => {
        const formaPgto = document.getElementById('input-forma-pagamento').value;
        App.updateCartaoSelect(bancoId);
        UI.checkCartaoVisibility(formaPgto);
    },

    handleFormaPagamentoChange: (formaPgto) => {
        UI.checkCartaoVisibility(formaPgto);
    },

    exportBackup: (isAuto = false) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `nuvora_backup_${Utils.localISODate()}.json`);
        dlAnchorElem.click();
        if(isAuto) localStorage.setItem('nuvora_last_backup', Utils.localISODate());
    },

    importBackup: (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedDB = JSON.parse(event.target.result);
                const required = ['transacoes', 'bancos', 'cartoes', 'categorias'];
                const valido = required.every(col => Array.isArray(importedDB[col]));
                if (!valido) throw new Error('Estrutura inválida');
                const total = required.reduce((s, col) => s + importedDB[col].length, 0);
                if (!window.confirm(`Este backup contém ${total} registros principais e substituirá os dados atuais. Continuar?`)) return;
                localStorage.setItem('nuvora_backup_antes_importacao', JSON.stringify(db));
                await Database.replaceAll(importedDB);
                Utils.showToast('Backup restaurado com sucesso!', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } catch (err) {
                Utils.showToast('Não foi possível importar: o arquivo não tem uma estrutura válida.', 'error');
            } finally { e.target.value = ''; }
        };
        reader.readAsText(file);
    }

};

window.App = App;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
} else {
    App.init();
}