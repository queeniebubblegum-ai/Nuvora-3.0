import { db, Database } from './db.js';
import { Utils } from './utils.js';
import { App } from './app.js';

// HELPER DE UX/UI: Gerencia o estado visual de processamento dos formulários
const toggleLoadingState = (form, isLoading, text = "Processando...") => {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    
    if (isLoading) {
        btn.dataset.originalHtml = btn.innerHTML; // Salva o texto/ícone original
        btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${text}`;
        btn.disabled = true;
        btn.classList.add('opacity-80', 'cursor-not-allowed');
    } else {
        if (btn.dataset.originalHtml) {
            btn.innerHTML = btn.dataset.originalHtml;
        }
        btn.disabled = false;
        btn.classList.remove('opacity-80', 'cursor-not-allowed');
    }
};

// --- HELPER DE ENGENHARIA DE UX: GESTOR DE UNDO (SOFT DELETE) ---
let undoContext = {
    timeout: null,
    items: []
};

const executeSoftDelete = (itemsToDelete, toastMsg) => {
    if (!itemsToDelete || itemsToDelete.length === 0) return;

    // Se já houver um timer rodando, nós o limpamos (efetiva a exclusão anterior permanentemente)
    if (undoContext.timeout) {
        clearTimeout(undoContext.timeout);
    }

    // Armazena a cópia exata dos itens para possível restauração
    undoContext.items = [...itemsToDelete];

    // Efetua a deleção no banco de dados
    const idsToDelete = itemsToDelete.map(t => t.id);
    Database.removeMultiple('transacoes', idsToDelete);

    // Atualiza a interface otimisticamente (remoção imediata da tela)
    if (App.currentPage === 'Dashboard' && document.getElementById('modal-fatura-detalhes') && document.getElementById('modal-fatura-detalhes').classList.contains('flex')) {
        App.renderInvoiceModal();
    } else {
        App.scheduleRender();
    }

    // Mostra o Toast flutuante de Desfazer
    showUndoToast(toastMsg);
};

const showUndoToast = (msg) => {
    let toast = document.getElementById('undo-toast-nuvora');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = 'undo-toast-nuvora';
    // Estética premium para contraste forte na UI
    toast.className = 'fixed bottom-10 left-1/2 -translate-x-1/2 bg-brand-deep text-white px-6 py-3.5 rounded-[16px] shadow-2xl flex items-center gap-5 z-[9999] transition-all duration-300 transform translate-y-0 opacity-100 border border-white/10';
    toast.innerHTML = `
        <span class="text-sm font-bold whitespace-nowrap">${msg}</span>
        <div class="w-px h-5 bg-white/20"></div>
        <button id="btn-undo-action" class="text-brand-soft font-black text-sm hover:text-white transition-colors uppercase tracking-wider focus:outline-none">Desfazer</button>
    `;
    document.body.appendChild(toast);

    // Animação de entrada fluida
    toast.animate([
        { opacity: 0, transform: 'translate(-50%, 20px)' },
        { opacity: 1, transform: 'translate(-50%, 0)' }
    ], { duration: 300, easing: 'ease-out' });

    // Lógica de Restauração ao clicar em Desfazer
    document.getElementById('btn-undo-action').addEventListener('click', () => {
        undoContext.items.forEach(t => Database.add('transacoes', t));
        
        // Garante que a transação volte para a ordem cronológica certa e não vá para o topo
        db.transacoes.sort((a,b) => new Date(b.data) - new Date(a.data));
        Database.save('transacoes'); 

        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, 20px)';
        setTimeout(() => toast.remove(), 300);
        
        clearTimeout(undoContext.timeout);
        undoContext.items = [];

        Utils.showToast('Ação desfeita. Transações restauradas.', 'success');
        
        if (App.currentPage === 'Dashboard' && document.getElementById('modal-fatura-detalhes') && document.getElementById('modal-fatura-detalhes').classList.contains('flex')) {
            App.renderInvoiceModal();
        } else {
            App.scheduleRender();
        }
    });

    // Timeout de 6 segundos para efetivar a exclusão invisivelmente
    undoContext.timeout = setTimeout(() => {
        if (document.getElementById('undo-toast-nuvora')) {
            const el = document.getElementById('undo-toast-nuvora');
            el.style.opacity = '0';
            el.style.transform = 'translate(-50%, 20px)';
            setTimeout(() => el.remove(), 300);
        }
        undoContext.items = []; // Limpa a memória
    }, 6000); 
};

export const TransacoesController = {
    submitTransacao: (e) => {
        e.preventDefault();
        const form = e.target;
        
        const tipo = document.getElementById('input-tipo').value;
        const valorRaw = document.getElementById('input-valor').value;
        
        // VALIDAÇÕES INSTANTÂNEAS (Fail-Fast)
        if (!valorRaw) { Utils.showToast('Introduza um valor válido.', 'error'); return; }
        
        const valor = Math.abs(parseFloat(valorRaw));
        if (valor === 0) { Utils.showToast('O valor da transação deve ser maior que zero.', 'warning'); return; }

        const desc = document.getElementById('input-desc').value;
        const data = document.getElementById('input-data-trans').value;
        const categoria = document.getElementById('input-categoria').value;
        
        const bancoIdSelect = document.getElementById('input-banco-trans').value;
        const bancoId = parseInt(bancoIdSelect);
        if (!bancoId) { Utils.showToast('Selecione uma conta bancária.', 'error'); return; }
        
        const formaPagamento = document.getElementById('input-forma-pagamento').value;
        const isCartao = formaPagamento === 'Cartão de Crédito';
        
        const contatoIdRaw = document.getElementById('input-contato').value;
        const contatoId = contatoIdRaw ? parseInt(contatoIdRaw) : null;

        const isRecorrente = document.getElementById('input-recorrente').checked;
        const parcelasRecorrentes = Math.abs(parseInt(document.getElementById('input-meses-recorrente').value)) || 1;

        if (isCartao) {
            const cartaoIdSelect = document.getElementById('input-cartao-trans').value;
            const cartaoId = parseInt(cartaoIdSelect);
            if (!cartaoId) { Utils.showToast('Selecione um cartão de crédito válido.', 'error'); return; }
        }

        toggleLoadingState(form, true, "Salvando...");

        setTimeout(() => {
            if (isCartao) {
                const cartaoIdSelect = document.getElementById('input-cartao-trans').value;
                const cartaoId = parseInt(cartaoIdSelect);
                const parcelas = Math.abs(parseInt(document.getElementById('input-parcelas-trans').value)) || 1;
                const jurosStr = document.getElementById('input-juros-trans').value;
                const juros = jurosStr ? Math.abs(parseFloat(jurosStr)) : 0;
                
                let valorTotal = valor;
                if (parcelas > 1 && juros > 0) {
                    const taxa = juros / 100;
                    valorTotal = valor * (taxa / (1 - Math.pow(1 + taxa, -parcelas))) * parcelas;
                }

                Database.addCardExpense({
                    desc, total: valorTotal, parcelas, cartaoId: cartaoId, categoria, data, contatoId
                });
                Utils.showToast(`Despesa lançada no cartão em ${parcelas}x!`, 'success');
            } else {
                if (isRecorrente) {
                    const valorParcela = Math.round((valor / parcelasRecorrentes) * 100) / 100;
                    const diferenca = parseFloat((valor - (valorParcela * parcelasRecorrentes)).toFixed(2));
                    const valorPrimeira = parseFloat((valorParcela + diferenca).toFixed(2));

                    const novaTransacao = {
                        id: Date.now(),
                        desc: desc + (parcelasRecorrentes > 1 ? ` (1/${parcelasRecorrentes})` : ''), 
                        valor: valorPrimeira, 
                        tipo, categoria, bancoId,
                        isCartao: false,
                        formaPagamento: formaPagamento || 'Não informada',
                        data,
                        parcelaAtual: 1, totalParcelas: parcelasRecorrentes,
                        recorrente: true,
                        contatoId
                    };
                    Database.add('transacoes', novaTransacao);

                    const dataOriginal = new Date(data + 'T12:00:00');
                    const diaOriginal = dataOriginal.getDate();
                    
                    for (let i = 1; i < parcelasRecorrentes; i++) {
                        let dataParcela = new Date(dataOriginal);
                        dataParcela.setMonth(dataOriginal.getMonth() + i);
                        if (dataParcela.getDate() !== diaOriginal) dataParcela.setDate(0); 

                        Database.add('agendamentos', {
                            id: Date.now() + i,
                            desc: desc + ` (${i + 1}/${parcelasRecorrentes})`,
                            valor: valorParcela,
                            dataVencimento: dataParcela.toISOString().split('T')[0],
                            categoria: categoria,
                            tipo: tipo, 
                            status: 'pendente',
                            bancoId: bancoId
                        });
                    }
                    Utils.showToast(`${tipo === 'receita' ? 'Receita' : 'Despesa'} registada e agendada para os próximos ${parcelasRecorrentes - 1} meses!`, 'success');
                } else {
                    Database.add('transacoes', {
                        id: Date.now(),
                        desc, valor, tipo, categoria, bancoId,
                        isCartao: false,
                        formaPagamento: formaPagamento || 'Não informada',
                        data,
                        parcelaAtual: 1, totalParcelas: 1,
                        recorrente: false,
                        contatoId
                    });
                    Utils.showToast(`${tipo === 'receita' ? 'Receita' : 'Despesa'} adicionada com sucesso!`, 'success');
                }
            }
            
            App.closeModal();
            toggleLoadingState(form, false); 
        }, 350);
    },

    submitDespesaCartao: (e) => {
        e.preventDefault();
        const form = e.target;
        const cartaoId = parseInt(document.getElementById('dc-cartao-id').value);
        const desc = document.getElementById('dc-desc').value;
        
        const valorBase = Math.abs(parseFloat(document.getElementById('dc-valor').value));
        if (valorBase === 0 || isNaN(valorBase)) { Utils.showToast('O valor deve ser maior que zero.', 'warning'); return; }

        toggleLoadingState(form, true, "Registrando...");

        setTimeout(() => {
            const parcelas = Math.abs(parseInt(document.getElementById('dc-parcelas').value)) || 1;
            const jurosStr = document.getElementById('dc-juros').value;
            const juros = jurosStr ? Math.abs(parseFloat(jurosStr)) : 0;
            const categoria = document.getElementById('dc-categoria').value;
            const data = document.getElementById('dc-data').value;

            let valorTotal = valorBase;
            if (parcelas > 1 && juros > 0) {
                const taxa = juros / 100;
                const pmt = valorBase * (taxa / (1 - Math.pow(1 + taxa, -parcelas)));
                valorTotal = pmt * parcelas;
            }

            Database.addCardExpense({
                desc, total: valorTotal, parcelas, cartaoId, categoria, data, contatoId: null
            });
            Utils.showToast(`Compra lançada em ${parcelas}x!`, 'success');
            
            App.closeModal();
            toggleLoadingState(form, false);
        }, 350);
    },

    submitEditTransaction: (e) => {
        e.preventDefault();
        const form = e.target;
        const id = document.getElementById('edit-id').value;
        const desc = document.getElementById('edit-desc').value;
        
        const valor = Math.abs(parseFloat(document.getElementById('edit-valor').value));
        if (valor === 0 || isNaN(valor)) { Utils.showToast('O valor deve ser maior que zero.', 'warning'); return; }

        toggleLoadingState(form, true, "Atualizando...");

        setTimeout(() => {
            const data = document.getElementById('edit-data').value;
            const categoria = document.getElementById('edit-categoria').value;
            const contatoIdRaw = document.getElementById('edit-contato').value;
            const contatoId = contatoIdRaw ? parseInt(contatoIdRaw) : null;

            if(Database.updateTransaction(id, { desc, valor, data, categoria, contatoId })) {
                Utils.showToast('Transação atualizada!', 'success');
                App.closeModal();
            } else {
                Utils.showToast('Erro ao atualizar.', 'error');
            }
            toggleLoadingState(form, false);
        }, 350);
    },

    deleteExpense: (id) => {
        const target = db.transacoes.find(t => t.id.toString() === id.toString());
        if (!target) return;

        let itemsToDelete = [];
        let msg = 'Transação apagada.';

        if (target.isCartao && target.grupoId) {
            itemsToDelete = db.transacoes.filter(t => t.grupoId === target.grupoId);
            msg = `Compra parcelada apagada (${itemsToDelete.length} parcelas).`;
        } else {
            itemsToDelete = [target];
        }

        executeSoftDelete(itemsToDelete, msg);
    },
    
    deleteSelectedTransactions: () => {
        if(App.viewState.selectedTransactions.length === 0) return;
        
        const itemsToDelete = db.transacoes.filter(t => App.viewState.selectedTransactions.includes(t.id));
        const count = itemsToDelete.length;
        
        App.viewState.selectedTransactions = [];
        executeSoftDelete(itemsToDelete, `${count} transações apagadas.`);
    },

    simularDespesaCartao: () => {
        const valorBaseRaw = document.getElementById('dc-valor').value;
        const parcelasRaw = document.getElementById('dc-parcelas').value;
        if(!valorBaseRaw || !parcelasRaw) { Utils.showToast('Preencha valor e parcelas para simular.', 'error'); return; }
        
        const valorBase = Math.abs(parseFloat(valorBaseRaw));
        const parcelas = Math.abs(parseInt(parcelasRaw)) || 1;
        const jurosStr = document.getElementById('dc-juros').value;
        const juros = jurosStr ? Math.abs(parseFloat(jurosStr)) : 0;
        
        let html = '';
        if(parcelas === 1 || juros === 0) {
            html = `<div class="bg-surface border border-border p-3 rounded-[12px] text-center"><p class="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Total a pagar</p><p class="text-lg font-bold text-text-primary font-mono">${Utils.formatMoney(valorBase)}</p><p class="text-xs text-text-secondary mt-1">${parcelas}x de ${Utils.formatMoney(valorBase/parcelas)} sem juros.</p></div>`;
        } else {
            const taxa = juros / 100;
            const pmt = valorBase * (taxa / (1 - Math.pow(1 + taxa, -parcelas)));
            const total = pmt * parcelas;
            html = `<div class="bg-surface border border-border p-3 rounded-[12px] text-center"><p class="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Total com juros (${juros}% a.m.)</p><p class="text-lg font-bold text-danger font-mono">${Utils.formatMoney(total)}</p><p class="text-xs text-text-secondary mt-1">${parcelas}x de ${Utils.formatMoney(pmt)}</p></div>`;
        }
        
        const container = document.getElementById('dc-simulacao-resultado');
        container.innerHTML = html;
        container.classList.remove('hidden');
    },

    simularTransacaoGeral: () => {
        const formaPgto = document.getElementById('input-forma-pagamento').value;
        if (formaPgto !== 'Cartão de Crédito') return;

        const valorRaw = document.getElementById('input-valor').value;
        const parcelasRaw = document.getElementById('input-parcelas-trans').value;
        if(!valorRaw || !parcelasRaw) { Utils.showToast('Preencha o valor principal da transação acima.', 'error'); return; }
        
        const valorBase = Math.abs(parseFloat(valorRaw));
        const parcelas = Math.abs(parseInt(parcelasRaw)) || 1;
        const jurosStr = document.getElementById('input-juros-trans').value;
        const juros = jurosStr ? Math.abs(parseFloat(jurosStr)) : 0;
        
        let html = '';
        if(parcelas === 1 || juros === 0) {
            html = `<div class="bg-surface border border-border p-3 rounded-[12px] text-center"><p class="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Total a pagar</p><p class="text-lg font-bold text-text-primary font-mono">${Utils.formatMoney(valorBase)}</p><p class="text-xs text-text-secondary mt-1">${parcelas}x de ${Utils.formatMoney(valorBase/parcelas)} sem juros.</p></div>`;
        } else {
            const taxa = juros / 100;
            const pmt = valorBase * (taxa / (1 - Math.pow(1 + taxa, -parcelas)));
            const total = pmt * parcelas;
            html = `<div class="bg-surface border border-border p-3 rounded-[12px] text-center"><p class="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Total com juros (${juros}% a.m.)</p><p class="text-lg font-bold text-danger font-mono">${Utils.formatMoney(total)}</p><p class="text-xs text-text-secondary mt-1">${parcelas}x de ${Utils.formatMoney(pmt)}</p></div>`;
        }
        
        const container = document.getElementById('transacao-simulacao-resultado');
        container.innerHTML = html;
        container.classList.remove('hidden');
    },

    simularCompraRapida: () => {
        const valor = Math.abs(parseFloat(document.getElementById('simulador-valor').value));
        const parcelas = Math.abs(parseInt(document.getElementById('simulador-parcelas').value)) || 1;
        
        if (isNaN(valor) || valor === 0) { Utils.showToast('Introduza um valor válido para simular.', 'warning'); return; }

        const jurosStr = document.getElementById('simulador-juros').value;
        const juros = jurosStr ? Math.abs(parseFloat(jurosStr)) : 0;
        
        let html = '';
        if(parcelas === 1 || juros === 0) {
            html = `<div class="bg-bg border border-border p-4 rounded-[12px] text-center"><p class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Resultado da Simulação</p><h3 class="text-2xl font-bold text-text-primary font-mono">${Utils.formatMoney(valor)}</h3><p class="text-sm text-text-secondary mt-2">${parcelas}x de ${Utils.formatMoney(valor/parcelas)} sem juros.</p></div>`;
        } else {
            const taxa = juros / 100;
            const pmt = valor * (taxa / (1 - Math.pow(1 + taxa, -parcelas)));
            const total = pmt * parcelas;
            const dif = total - valor;
            html = `<div class="bg-bg border border-border p-4 rounded-[12px] text-center"><p class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Resultado com Juros (${juros}% a.m.)</p><h3 class="text-2xl font-bold text-danger font-mono">${Utils.formatMoney(total)}</h3><p class="text-sm text-text-secondary mt-2 mb-1">${parcelas}x de <strong class="text-text-primary">${Utils.formatMoney(pmt)}</strong></p><p class="text-xs text-text-secondary">Pagas mais <strong class="text-danger">${Utils.formatMoney(dif)}</strong> só em juros.</p></div>`;
        }
        
        const container = document.getElementById('simulador-resultado');
        container.innerHTML = html;
        container.classList.remove('hidden');
    }
};