import { db } from './db.js';
import { Utils } from './utils.js';

export const UI = {
    setTransactionType: (tipo) => {
        document.getElementById('input-tipo').value = tipo;
        const tabDespesa = document.getElementById('tab-despesa');
        const tabReceita = document.getElementById('tab-receita');
        const btnSubmit = document.getElementById('btn-submit-transacao');
        const isFlex = btnSubmit.classList.contains('flex-1');
        const baseClass = `py-4 text-white font-bold rounded-[12px] transition-colors shadow-soft hover:-translate-y-0.5 text-base shrink-0 ${isFlex ? 'flex-1' : 'w-full'}`;
        
        if (tipo === 'despesa') {
            tabDespesa.className = "flex-1 text-center py-2 bg-surface rounded-[10px] shadow-sm text-danger font-bold text-sm border border-border transition-all flex justify-center items-center gap-2 cursor-pointer";
            tabReceita.className = "flex-1 text-center py-2 text-text-secondary font-medium text-sm hover:text-success transition-all flex justify-center items-center gap-2 cursor-pointer";
            btnSubmit.className = `${baseClass} bg-[#E11D48] hover:bg-rose-700`;
            btnSubmit.innerText = "Adicionar Lançamento";
        } else {
            tabReceita.className = "flex-1 text-center py-2 bg-surface rounded-[10px] shadow-sm text-success font-bold text-sm border border-border transition-all flex justify-center items-center gap-2 cursor-pointer";
            tabDespesa.className = "flex-1 text-center py-2 text-text-secondary font-medium text-sm hover:text-danger transition-all flex justify-center items-center gap-2 cursor-pointer";
            btnSubmit.className = `${baseClass} bg-[#10B981] hover:bg-emerald-600`;
            btnSubmit.innerText = "Adicionar Lançamento";
        }
    },

    openModal: (id, transType = null) => {
        // CORREÇÃO ARQUITETURAL: Garante a hidratação dos dados no instante da abertura. Resolve o "bug do select vazio no início".
        if (window.App && typeof window.App.updateCategorySelects === 'function') {
            window.App.updateCategorySelects();
            window.App.updateBankSelect();
            window.App.updateContatoSelect();
        }

        if (transType && id === 'modal-transacao') UI.setTransactionType(transType);
        
        // Automação: Pré-preenche a renda se existir no perfil
        if (id === 'modal-orcamento-inteligente' && db.usuario?.rendaMensalMedia) {
            const inputRenda = document.getElementById('oi-renda');
            if (inputRenda) {
                inputRenda.value = db.usuario.rendaMensalMedia;
                // Dispara o evento de preview assim que o modal abre
                setTimeout(() => {
                    const event = new Event('input', { bubbles: true });
                    inputRenda.dispatchEvent(event);
                }, 50);
            }
        }

        const m = document.getElementById(id);
        if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
    },

    closeModal: (viewState) => {
        viewState.selectedTransactions = [];
        viewState.ofxPendente = null; 
        viewState.rawOfxString = null;
        
        document.querySelectorAll('div[id^="modal-"]').forEach(m => {
            m.classList.add('hidden'); m.classList.remove('flex');
        });
        
        viewState.activeCardId = null;
        
        ['transacao-simulacao-resultado', 'dc-simulacao-resultado', 'simulador-resultado'].forEach(id => {
            const el = document.getElementById(id); if(el) { el.innerHTML = ''; el.classList.add('hidden'); }
        });
        
        document.querySelectorAll('form').forEach(form => form.reset());
        
        const hoje = new Date().toISOString().split('T')[0];
        ['input-data-trans', 'dc-data', 'simulador-data', 'agendamento-data', 'edit-data'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = hoje;
        });
        
        const inputRec = document.getElementById('input-recorrente');
        if(inputRec) inputRec.checked = false;
        const divMesesRec = document.getElementById('div-meses-recorrente');
        if(divMesesRec) divMesesRec.classList.add('hidden');
        
        const smartBadge = document.getElementById('smart-category-badge');
        if(smartBadge) { smartBadge.classList.add('hidden'); smartBadge.classList.remove('flex'); }

        const divSelecaoCartao = document.getElementById('div-selecao-cartao');
        const divCartaoOptions = document.getElementById('div-cartao-options');
        const divRecMain = document.getElementById('div-recorrente');
        if(divSelecaoCartao) divSelecaoCartao.classList.add('hidden');
        if(divCartaoOptions) divCartaoOptions.classList.add('hidden');
        if(divRecMain) divRecMain.classList.remove('hidden');

        const editForm = document.querySelector('[data-submit="editarTransacao"]');
        if(editForm) {
            const inputs = editForm.querySelectorAll('input:not([type="hidden"]), select');
            inputs.forEach(inp => {
                inp.disabled = true;
                inp.classList.add('bg-bg', 'cursor-not-allowed', 'opacity-70');
            });
            const btnSaveEdit = document.getElementById('btn-save-edit');
            if(btnSaveEdit) btnSaveEdit.classList.add('hidden');
            const btnUnlockEdit = document.getElementById('btn-unlock-edit');
            if(btnUnlockEdit) btnUnlockEdit.classList.remove('hidden');
        }
    },

    openEditModal: (id) => {
        if (window.App && typeof window.App.updateCategorySelects === 'function') {
            window.App.updateCategorySelects();
            window.App.updateContatoSelect();
        }

        const t = db.transacoes.find(x => x.id.toString() === id.toString());
        if(!t) return;
        
        document.getElementById('edit-id').value = t.id;
        document.getElementById('edit-desc').value = t.desc;
        document.getElementById('edit-valor').value = t.valor;
        document.getElementById('edit-data').value = t.data || new Date(t.id).toISOString().split('T')[0];
        
        const catSelect = document.getElementById('edit-categoria');
        catSelect.innerHTML = db.categorias.map(c => `<option value="${Utils.escapeHTML(c.nome)}" ${t.categoria === c.nome ? 'selected' : ''}>${Utils.escapeHTML(c.nome)}</option>`).join('');
        
        const contSelect = document.getElementById('edit-contato');
        if(contSelect) {
            contSelect.innerHTML = '<option value="">Nenhum</option>' + 
                db.contatos.map(c => `<option value="${c.id}" ${t.contatoId === c.id ? 'selected' : ''}>${Utils.escapeHTML(c.nome)} - ${Utils.escapeHTML(c.documento || 'Sem doc')}</option>`).join('');
        }
        
        const txId = t.codigoRef || `TX-${t.id.toString(36).substring(0,6).toUpperCase()}`;
        document.getElementById('edit-codigo-ref').innerText = `#${txId}`;
        
        UI.openModal('modal-editar-transacao');
    },

    toggleEditLock: () => {
        const form = document.querySelector('[data-submit="editarTransacao"]');
        const inputs = form.querySelectorAll('input:not([type="hidden"]), select');
        
        inputs.forEach(inp => {
            inp.disabled = false;
            inp.classList.remove('bg-bg', 'cursor-not-allowed', 'opacity-70');
        });
        
        document.getElementById('btn-save-edit').classList.remove('hidden');
        document.getElementById('btn-save-edit').classList.add('flex');
        document.getElementById('btn-unlock-edit').classList.add('hidden');
        document.getElementById('edit-desc').focus();
    },

    openDepositModal: (id, nome) => {
        document.getElementById('deposito-meta-id').value = id;
        document.getElementById('deposito-meta-nome').innerText = nome;
        UI.openModal('modal-depositar-meta');
    },

    openCardExpenseModal: (id, nome) => {
        document.getElementById('dc-cartao-id').value = id;
        document.getElementById('modal-card-name-display').innerText = nome;
        const simContainer = document.getElementById('dc-simulacao-resultado');
        if(simContainer) { simContainer.innerHTML = ''; simContainer.classList.add('hidden'); }
        UI.openModal('modal-despesa-cartao');
    },

    checkCartaoVisibility: (formaPgto) => {
        const divSelecaoCartao = document.getElementById('div-selecao-cartao');
        const divCartaoOptions = document.getElementById('div-cartao-options');
        const divRec = document.getElementById('div-recorrente');
        const btnSimular = document.getElementById('btn-simular-transacao');
        const btnSubmit = document.getElementById('btn-submit-transacao');

        if (formaPgto === 'Cartão de Crédito') {
            divSelecaoCartao.classList.remove('hidden');
            divCartaoOptions.classList.remove('hidden');
            divRec.classList.add('hidden');
            if(btnSimular) { btnSimular.classList.remove('hidden'); btnSimular.classList.add('flex'); }
            if(btnSubmit) { btnSubmit.classList.remove('w-full'); btnSubmit.classList.add('flex-1'); }
            
            const inputRec = document.getElementById('input-recorrente');
            if(inputRec) inputRec.checked = false;
            const divMesesRec = document.getElementById('div-meses-recorrente');
            if(divMesesRec) divMesesRec.classList.add('hidden');
        } else {
            divSelecaoCartao.classList.add('hidden');
            divCartaoOptions.classList.add('hidden');
            divRec.classList.remove('hidden');
            if(btnSimular) { btnSimular.classList.add('hidden'); btnSimular.classList.remove('flex'); }
            if(btnSubmit) { btnSubmit.classList.add('w-full'); btnSubmit.classList.remove('flex-1'); }
            const simContainer = document.getElementById('transacao-simulacao-resultado');
            if(simContainer) { simContainer.innerHTML = ''; simContainer.classList.add('hidden'); }
        }
    }
};