import { Utils } from './utils.js';
import { db } from './db.js';
import { Components } from './components.js';
import { listInvoiceTransactions, calculateReconciliation } from './reconciliation.js';

export const UIRenderer = {
    updateDOM: (elementId, newHTML) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        try { Utils.morphDOM(el, newHTML); } catch(error) { el.innerHTML = newHTML; }
    },

    renderInvoiceModal: (appState) => {
        if (appState.activeCardId) {
            const card = db.cartoes.find(c => String(c.id) === String(appState.activeCardId));
            const content = document.getElementById('modal-fatura-content');
            if (!card) {
                if (content) content.innerHTML = '<div class="p-8 text-center text-text-secondary">Cartão não encontrado. Feche esta janela e tente novamente.</div>';
                return;
            }
            try {
                const newHTML = Components.invoiceDetailsView(card, db.transacoes, appState);
                // Conteúdo de modal não deve passar pelo morph incremental: em abertura rápida,
                // ele podia deixar apenas uma linha/blur enquanto o nó era reconciliado.
                if (content) {
                    content.removeAttribute('inert');
                    content.setAttribute('aria-hidden', 'false');
                    content.classList.remove('hidden');
                    content.innerHTML = newHTML;
                }
            } catch (error) {
                console.error('Falha ao renderizar detalhes da fatura:', error);
                if (content) content.innerHTML = '<div class="p-8 text-center text-text-secondary"><p>Não foi possível exibir esta fatura.</p><button type="button" data-action="closeInvoiceDetails" class="mt-4 px-3 py-2 rounded-lg bg-brand-deep text-white text-xs font-bold">Fechar</button></div>';
            }
        }
    },

    updateCategorySelects: () => {
        if (!db.categorias || db.categorias.length === 0) return;
        const type = document.getElementById('input-tipo')?.value || 'despesa';
        const available = db.categorias.filter(c => !c.tipo || c.tipo === type);
        const groups = [...new Set(available.map(c => c.grupo || c.nome))].sort();
        const groupSelect = document.getElementById('input-categoria-grupo');
        const subSelect = document.getElementById('input-categoria-subgrupo');
        const canonical = document.getElementById('input-categoria');
        if (groupSelect && subSelect && canonical) {
            const current = canonical.value;
            const selected = available.find(c => c.nome === current);
            groupSelect.innerHTML = '<option value="">Grupo principal</option>' + groups.map(g => `<option value="${Utils.escapeHTML(g)}">${Utils.escapeHTML(g)}</option>`).join('');
            groupSelect.value = selected?.grupo || '';
            const subgroup = available.filter(c => (c.grupo || c.nome) === groupSelect.value);
            subSelect.innerHTML = '<option value="">Subgrupo (opcional)</option>' + subgroup.map(c => `<option value="${Utils.escapeHTML(c.nome)}">${Utils.escapeHTML(c.subgrupo || c.nome)}</option>`).join('');
            subSelect.value = selected?.nome || '';
            canonical.innerHTML = available.map(c => `<option value="${Utils.escapeHTML(c.nome)}">${Utils.escapeHTML(c.nome)}</option>`).join('');
            canonical.value = selected?.nome || '';
        }

        // Other forms continue to receive the complete flat catalog.
        const optionsHtml = db.categorias.map(c => `<option value="${Utils.escapeHTML(c.nome)}">${Utils.escapeHTML(c.nome)}</option>`).join('');

        // Array com os IDs dos selects que precisam receber as categorias
        const ids = ['input-categoria', 'dc-categoria', 'orcamento-categoria', 'edit-categoria', 'agendamento-categoria'];
        
        // Itera sobre os IDs garantindo a injeção limpa e a pré-seleção
        ids.forEach(id => { 
            const el = document.getElementById(id); 
            if (el) {
                const valorAtual = el.value;
                // CORREÇÃO DE UX e ESTADO: Placeholder adicionado para garantir que a IA consiga transitar de "Vazio" para "Selecionado"
                el.innerHTML = `<option value="" disabled ${!valorAtual ? 'selected' : ''}>Selecione a categoria</option>` + optionsHtml;
                
                if (valorAtual) {
                    el.value = valorAtual;
                }
            } 
        });

        // O formulário de compra no cartão usa o mesmo catálogo hierárquico.
        const dcGroup = document.getElementById('dc-categoria-grupo');
        const dcSubgroup = document.getElementById('dc-categoria-subgrupo');
        const dcCategory = document.getElementById('dc-categoria');
        if (dcGroup && dcSubgroup && dcCategory) {
            const cardAvailable = db.categorias.filter(c => !c.tipo || c.tipo === 'despesa');
            const cardGroups = [...new Set(cardAvailable.map(c => c.grupo || c.nome))].sort();
            const current = dcCategory.value;
            const selected = cardAvailable.find(c => c.nome === current);
            dcGroup.innerHTML = '<option value="">Grupo principal</option>' + cardGroups.map(g => `<option value="${Utils.escapeHTML(g)}">${Utils.escapeHTML(g)}</option>`).join('');
            dcGroup.value = selected?.grupo || '';
            const subgroup = cardAvailable.filter(c => (c.grupo || c.nome) === dcGroup.value);
            dcSubgroup.innerHTML = '<option value="">Subgrupo (opcional)</option>' + subgroup.map(c => `<option value="${Utils.escapeHTML(c.nome)}">${Utils.escapeHTML(c.subgrupo || c.nome)}</option>`).join('');
            dcSubgroup.value = selected?.nome || '';
        }
    },

    updateContatoSelect: () => {
        const select = document.getElementById('input-contato');
        if (select) {
            select.innerHTML = '<option value="">Nenhum</option>' + 
                db.contatos.map(c => `<option value="${c.id}">${Utils.escapeHTML(c.nome)} - ${Utils.escapeHTML(c.documento || 'Sem doc')}</option>`).join('');
        }
    },

    updateBankSelect: () => {
        const bankOptions = db.bancos.map(b => {
            const displayName = Utils.formatBankName(b);
            return `<option value="${b.id}">${Utils.escapeHTML(displayName)}</option>`;
        }).join('');

        const selectBancoTrans = document.getElementById('input-banco-trans');
        if (selectBancoTrans) {
            selectBancoTrans.innerHTML = '<option value="" disabled selected>Selecione a conta</option>' + bankOptions;
        }

        ['transfer-origem', 'transfer-destino'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = '<option value="">Selecione a conta</option>' + bankOptions; });

        const transferDate = document.getElementById('transfer-data');
        if (transferDate && !transferDate.value) transferDate.value = Utils.localISODate();

        const selectBancoCartao = document.getElementById('cartao-bancoId');
        if (selectBancoCartao) {
            selectBancoCartao.innerHTML = '<option value="" disabled selected>Selecione a conta</option>' + bankOptions;
        }

        const simSelect = document.getElementById('simulador-cartao-id');
        if (simSelect) {
            simSelect.innerHTML = '<option value="" disabled selected>Selecione o cartão</option>' + 
                db.cartoes.map(c => `<option value="${c.id}">${Utils.escapeHTML(c.nome)}</option>`).join('');
        }
    },

    renderErrorState: (err) => {
        const el = document.getElementById('main-content');
        if (el) {
            el.innerHTML = `
            <div class="bg-surface text-text-primary p-8 rounded-[16px] border border-danger mt-6 shadow-soft max-w-2xl mx-auto">
                <h3 class="font-bold text-2xl mb-4 flex items-center gap-3 font-primary"><i class="fa-solid fa-bug text-danger"></i> Erro de Leitura</h3>
                <p class="mb-4 text-text-secondary">Foi encontrado um problema com a estrutura de dados salva neste navegador.</p>
                <div class="font-mono text-xs bg-bg p-4 rounded-[12px] border border-border overflow-x-auto text-text-primary mb-6">
                    <strong>ERRO TÉCNICO:</strong><br>${err.message}
                </div>
                <div class="flex gap-4">
                    <button data-action="exportBackup" class="flex-1 bg-brand-deep text-white px-5 py-3 rounded-[12px] font-bold shadow-soft hover:bg-brand-dark transition-colors text-center">
                        1. Fazer Backup
                    </button>
                    <button onclick="if(confirm('Atenção: Esta ação irá apagar os dados do navegador para resolver o erro. Confirma?')) { localStorage.clear(); window.location.reload(); }" class="flex-1 bg-surface border border-border text-danger px-5 py-3 rounded-[12px] font-bold hover:bg-bg transition-colors text-center">
                        2. Limpar Cache
                    </button>
                </div>
            </div>`;
        }
    }
};