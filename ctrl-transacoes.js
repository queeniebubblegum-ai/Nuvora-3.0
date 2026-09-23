import { db, Database } from './db.js';
import { Utils } from './utils.js';
import { App } from './app.js';
import { SubmitGuard } from './submit-guard.js';
import { SubmitFeedback } from './submit-feedback.js';
import { trackUIEvent } from './ui-tracking.js';
import { fromCents, toCents } from './money-math.js';

// HELPER DE UX/UI: mantém o loading existente e acrescenta um estado acessível.
// O lock de duplicidade fica no delegated submit guard; não há um segundo lock
// por botão que possa impedir a recuperação após uma validação inválida.
const toggleLoadingState = (form, isLoading, text = "Processando...") => {
    if (!form) return;
    SubmitFeedback.set(form, isLoading ? 'loading' : 'idle', text);
};

const markSaved = form => {
    const modal = form?.closest?.('[id^="modal-"]');
    if (modal && (modal.classList.contains('hidden') || modal.getAttribute('aria-hidden') === 'true')) return;
    SubmitFeedback.set(form, 'success', 'Salvo');
};

// Reusable confirmation pattern for successful transaction persistence. The
// action is a real toast button handled by evt-click, not text pretending to
// be an action, and does not alter the existing save/toast timing.
const showTransactionSavedToast = message => Utils.showToast(message, 'success', {
    action: {
        action: 'navigate',
        payload: 'Transacoes',
        label: 'Ver lançamento',
        ariaLabel: 'Ver lançamento salvo'
    }
});

// --- GESTOR DE UNDO PARA EXCLUSÕES ---
// Only one snapshot is intentionally kept: a newer deletion supersedes the
// previous one, while the prior operation remains safely deleted after its
// timeout. Records are copied before removing them so later edits cannot mutate
// the undo payload.
let undoContext = {
    timeout: null,
    items: []
};

const cloneTransaction = transaction => ({ ...transaction });

const refreshTransactionsAfterMutation = () => {
    if (App.currentPage === 'Dashboard' && document.getElementById('modal-fatura-detalhes') && document.getElementById('modal-fatura-detalhes').classList.contains('flex')) {
        App.renderInvoiceModal();
    } else {
        App.scheduleRender();
    }
};

const clearUndoSnapshot = () => {
    if (undoContext.timeout) clearTimeout(undoContext.timeout);
    undoContext.timeout = null;
    undoContext.items = [];
};

const undoDeletedTransactions = () => {
    const snapshot = undoContext.items;
    if (!snapshot.length) return false;

    clearUndoSnapshot();
    // Restore through the repository method so bank balance deltas are applied
    // exactly as they are for a newly added transaction. Card installments do
    // not alter bank balances, and transfer legs preserve their original
    // metadata, keeping transfer semantics intact.
    snapshot.forEach(transaction => {
        if (!db.transacoes.some(current => String(current.id) === String(transaction.id))) {
            Database.add('transacoes', cloneTransaction(transaction));
        }
    });
    db.transacoes.sort((a, b) => new Date(b.data || b.id) - new Date(a.data || a.id));
    Database.save('transacoes');
    refreshTransactionsAfterMutation();
    Utils.showToast('Ação desfeita. Transações restauradas.', 'success');
    return true;
};

const showUndoToast = (message) => {
    Utils.showToast(message, 'success', {
        id: 'transaction-undo-toast',
        duration: 8000,
        action: {
            action: 'undoTransactions',
            label: 'Desfazer',
            ariaLabel: 'Desfazer exclusão das transações'
        }
    });
};

const executeSoftDelete = (itemsToDelete, toastMsg) => {
    if (!itemsToDelete || itemsToDelete.length === 0) return;

    // Keep a complete snapshot (including every card installment and both
    // transfer legs selected by the caller) before the destructive operation.
    clearUndoSnapshot();
    undoContext.items = itemsToDelete.map(cloneTransaction);
    Database.removeMultiple('transacoes', undoContext.items.map(t => t.id));
    refreshTransactionsAfterMutation();
    showUndoToast(toastMsg);

    undoContext.timeout = setTimeout(() => {
        // The database deletion has already happened; expiry only discards the
        // in-memory restoration snapshot and the action becomes a no-op.
        undoContext.items = [];
        undoContext.timeout = null;
    }, 8000);
};

export const TransacoesController = {
    submitTransferencia: (e) => {
        e.preventDefault();
        const form = e.target;
        const valueOf = (inlineId, fallbackId) => document.getElementById(inlineId)?.value || document.getElementById(fallbackId)?.value || '';
        const origemId = parseInt(valueOf('inline-transfer-origem', 'transfer-origem'), 10);
        const destinoId = parseInt(valueOf('inline-transfer-destino', 'transfer-destino'), 10);
        const valor = Math.abs(parseFloat(valueOf('inline-transfer-valor', 'transfer-valor')));
        const data = valueOf('inline-transfer-data', 'transfer-data');
        const desc = valueOf('inline-transfer-desc', 'transfer-desc').trim() || 'Transferência entre contas';
        if (!origemId || !destinoId || origemId === destinoId) { Utils.showToast('Selecione contas de origem e destino diferentes.', 'error'); return; }
        if (!valor || valor <= 0 || !data) { Utils.showToast('Informe valor e data válidos.', 'error'); return; }
        const transferenciaId = `TR-${Date.now()}`;
        // Two ledger entries keep each account balance correct; the explicit type is excluded from income/expense analytics.
        Database.add('transacoes', { id: Date.now(), desc, valor, tipo: 'despesa', transferenciaInterna: true, transferenciaId, bancoId: origemId, contaOrigemId: origemId, contaDestinoId: destinoId, categoria: 'Transferência entre contas', data, isCartao: false, formaPagamento: 'Transferência interna' });
        Database.add('transacoes', { id: Date.now() + 1, desc, valor, tipo: 'receita', transferenciaInterna: true, transferenciaId, bancoId: destinoId, contaOrigemId: origemId, contaDestinoId: destinoId, categoria: 'Transferência entre contas', data, isCartao: false, formaPagamento: 'Transferência interna', transferenciaEntrada: true });
        showTransactionSavedToast('Transferência registrada sem alterar receitas e despesas.');
        App.closeModal();
    },

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

        SubmitGuard.hold(form);
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
                showTransactionSavedToast(`Despesa lançada no cartão em ${parcelas}x!`);
            } else {
                if (isRecorrente) {
                    // Repeating monthly duplicates this per-occurrence amount; it is
                    // not an installment plan that divides one total across months.
                    const valorRecorrente = fromCents(toCents(valor));

                    const novaTransacao = {
                        id: Date.now(),
                        desc: desc + (parcelasRecorrentes > 1 ? ` (1/${parcelasRecorrentes})` : ''), 
                        valor: valorRecorrente, 
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
                            valor: valorRecorrente,
                            dataVencimento: dataParcela.toISOString().split('T')[0],
                            categoria: categoria,
                            tipo: tipo, 
                            status: 'pendente',
                            bancoId: bancoId
                        });
                    }
                    showTransactionSavedToast(`${tipo === 'receita' ? 'Receita' : 'Despesa'} registada e agendada para os próximos ${parcelasRecorrentes - 1} meses!`);
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
                    showTransactionSavedToast(`${tipo === 'receita' ? 'Receita' : 'Despesa'} adicionada com sucesso!`);
                }
            }

            markSaved(form);
            trackUIEvent({ screen: 'Transacoes', source: 'transaction_form', action: 'transaction_created' });
            App.closeModal();
            SubmitGuard.release(form);
        }, 350);
    },

    submitDespesaCartao: (e) => {
        e.preventDefault();
        const form = e.target;
        const cartaoId = parseInt(document.getElementById('dc-cartao-id').value);
        const desc = document.getElementById('dc-desc').value;
        
        const valorBase = Math.abs(parseFloat(document.getElementById('dc-valor').value));
        if (valorBase === 0 || isNaN(valorBase)) { Utils.showToast('O valor deve ser maior que zero.', 'warning'); return; }

        SubmitGuard.hold(form);
        toggleLoadingState(form, true, "Registrando...");

        setTimeout(() => {
            const parcelaSelect = document.getElementById('dc-parcelas');
            const parcelasCustom = document.getElementById('dc-parcelas-custom');
            const parcelas = parcelaSelect?.value === 'custom'
                ? Math.min(120, Math.max(1, Math.abs(parseInt(parcelasCustom?.value, 10)) || 1))
                : Math.min(120, Math.max(1, Math.abs(parseInt(parcelaSelect?.value, 10)) || 1));
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
            showTransactionSavedToast(`Compra lançada em ${parcelas}x!`);
            markSaved(form);
            trackUIEvent({ screen: 'Transacoes', source: 'transaction_form', action: 'transaction_created' });
            App.closeModal();
            SubmitGuard.release(form);
        }, 350);
    },

    submitEditTransaction: (e) => {
        e.preventDefault();
        const form = e.target;
        const id = document.getElementById('edit-id').value;
        const desc = document.getElementById('edit-desc').value;
        
        const valor = Math.abs(parseFloat(document.getElementById('edit-valor').value));
        if (valor === 0 || isNaN(valor)) { Utils.showToast('O valor deve ser maior que zero.', 'warning'); return; }

        SubmitGuard.hold(form);
        toggleLoadingState(form, true, "Atualizando...");

        setTimeout(() => {
            const data = document.getElementById('edit-data').value;
            const categoria = document.getElementById('edit-categoria').value;
            const contatoIdRaw = document.getElementById('edit-contato').value;
            const contatoId = contatoIdRaw ? parseInt(contatoIdRaw) : null;

            if(Database.updateTransaction(id, { desc, valor, data, categoria, contatoId })) {
                showTransactionSavedToast('Transação atualizada!');
                markSaved(form);
                trackUIEvent({ screen: 'Transacoes', source: 'transaction_form', action: 'transaction_updated' });
                App.closeModal();
            } else {
                Utils.showToast('Erro ao atualizar.', 'error');
                SubmitFeedback.set(form, 'idle');
            }
            SubmitGuard.release(form);
        }, 350);
    },

    deleteExpense: (id) => {
        const target = db.transacoes.find(t => t.id.toString() === id.toString());
        if (!target) return;

        let itemsToDelete = [];
        let msg = 'Transação apagada.';

        if (target.transferenciaId) {
            // A transfer is one logical operation represented by two ledger
            // legs. Never leave an orphan leg when either row is removed.
            itemsToDelete = db.transacoes.filter(t => String(t.transferenciaId) === String(target.transferenciaId));
            msg = 'Transferência apagada.';
        } else if (target.isCartao && target.grupoId) {
            itemsToDelete = db.transacoes.filter(t => t.grupoId === target.grupoId);
            msg = `Compra parcelada apagada (${itemsToDelete.length} parcelas).`;
        } else {
            itemsToDelete = [target];
        }

        executeSoftDelete(itemsToDelete, msg);
    },
    
    deleteSelectedTransactions: () => {
        const selectedIds = new Set((App.viewState.selectedTransactions || []).map(id => String(id)));
        if (selectedIds.size === 0) return;

        // Selection values come from HTML and are strings, while imported/local
        // records can have numeric IDs. Always compare canonically.
        let itemsToDelete = db.transacoes.filter(t => selectedIds.has(String(t.id)));
        if (!itemsToDelete.length) {
            App.viewState.selectedTransactions = [];
            return;
        }

        // Never leave a transfer with only one ledger leg. A selected card
        // installment remains an ordinary card transaction; deleting it does not
        // alter the card payment or invoice reconciliation records.
        const transferIds = new Set(itemsToDelete.map(t => t.transferenciaId).filter(Boolean).map(String));
        if (transferIds.size) {
            itemsToDelete = db.transacoes.filter(t => selectedIds.has(String(t.id)) || (t.transferenciaId && transferIds.has(String(t.transferenciaId))));
        }
        const count = itemsToDelete.length;
        const confirmed = typeof window === 'undefined' || typeof window.confirm !== 'function'
            ? true
            : window.confirm(`Apagar ${count} transação${count === 1 ? '' : 'ões'}? Esta ação pode ser desfeita por alguns segundos.`);
        if (!confirmed) return;

        App.viewState.selectedTransactions = [];
        executeSoftDelete(itemsToDelete, `${count} transações apagadas.`);
    },

    undoDeletedTransactions,

    simularDespesaCartao: () => {
        const valorBaseRaw = document.getElementById('dc-valor').value;
        const parcelasRaw = document.getElementById('dc-parcelas').value;
        if(!valorBaseRaw || !parcelasRaw) { Utils.showToast('Preencha valor e parcelas para simular.', 'error'); return; }
        
        const valorBase = Math.abs(parseFloat(valorBaseRaw));
        const parcelaSelect = document.getElementById('dc-parcelas');
        const parcelaCustom = document.getElementById('dc-parcelas-custom');
        const parcelas = parcelaSelect?.value === 'custom'
            ? Math.min(120, Math.max(1, Math.abs(parseInt(parcelaCustom?.value, 10)) || 1))
            : Math.min(120, Math.max(1, Math.abs(parseInt(parcelasRaw, 10)) || 1));
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