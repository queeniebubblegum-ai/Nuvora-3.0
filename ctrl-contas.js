import { db, Database } from './db.js';
import { Utils } from './utils.js';
import { App } from './app.js';
import { discardTransactionDraft, transactionOperationId } from './transaction-drafts.js';

export const ContasController = {
    submitBanco: async (e) => {
        e.preventDefault();
        const instElement = document.getElementById('banco-instituicao');
        const instituicao = instElement ? instElement.value : 'Outro';
        const nome = document.getElementById('banco-nome').value.trim();
        const saldo = Number(document.getElementById('banco-saldo').value);
        const tipo = document.getElementById('banco-tipo')?.value || 'corrente';
        if (!nome || !Number.isFinite(saldo)) {
            Utils.showToast('Informe o nome da conta e um saldo inicial válido.', 'error');
            return;
        }
        if (!['corrente', 'poupanca', 'carteira', 'investimento'].includes(tipo)) {
            Utils.showToast('Selecione um tipo de conta válido.', 'error');
            return;
        }
        
        const bankColors = {
            'Nubank': '#8A05BE', 
            'Itaú': '#EC7000', 
            'Inter': '#FF7A00', 
            'Santander': '#CC0000',
            'Bradesco': '#CC092F', 
            'Banco do Brasil': '#003DA5', 
            'C6 Bank': '#242424', 
            'Caixa': '#005CA9'
        };
        const cor = bankColors[instituicao] || 'var(--c-brand-deep)';

        await Database.add('bancos', {
            id: transactionOperationId(e.target),
            nome, 
            saldo, 
            tipo,
            instituicao, 
            cor,
            dataCriacao: Utils.localISODate() // Data âncora para o saldo inicial
        });
        
        discardTransactionDraft(e.target);
        Utils.showToast('Conta criada com sucesso!', 'success');
        App.closeModal();
        App.updateBankSelect();
        App.scheduleRender();
    },

    submitCartao: async (e) => {
        e.preventDefault();
        // Select values are strings, while persisted bank IDs may be numbers or
        // application-generated strings. Resolve against the stored record and
        // keep its original ID type instead of coercing it with parseInt().
        const bancoIdRaw = document.getElementById('cartao-bancoId').value;
        const bancoRelacionado = db.bancos.find(b => String(b.id) === String(bancoIdRaw));
        const bancoId = bancoRelacionado ? bancoRelacionado.id : bancoIdRaw;
        const modeloElement = document.getElementById('cartao-modelo');
        const modelo = modeloElement ? modeloElement.value : 'custom';
        const nome = document.getElementById('cartao-nome').value.trim();
        const limite = Number(document.getElementById('cartao-limite').value);
        const fechamento = Number(document.getElementById('cartao-dia-fech').value);
        const vencimento = Number(document.getElementById('cartao-dia-venc').value);
        const final = String(document.getElementById('cartao-final')?.value || '').trim();
        if (final && !/^\d{4}$/.test(final)) {
            Utils.showToast('Informe somente os quatro últimos números do cartão.', 'error');
            return;
        }
        if (!bancoRelacionado || !nome || !Number.isFinite(limite) || limite <= 0 || !Number.isInteger(fechamento) || fechamento < 1 || fechamento > 31 || !Number.isInteger(vencimento) || vencimento < 1 || vencimento > 31) {
            Utils.showToast('Informe cartão, nome, limite e dias válidos.', 'error');
            return;
        }
        
        let cor = null;
        if (modelo === 'Nubank Ultravioleta') {
            cor = '#111111';
        } else if (modelo !== 'custom') {
            const bankColors = {
                'Nubank': '#8A05BE', 
                'Itaú': '#EC7000', 
                'Inter': '#FF7A00', 
                'Santander': '#CC0000',
                'Bradesco': '#CC092F', 
                'Banco do Brasil': '#003DA5', 
                'C6 Bank': '#242424', 
                'Caixa': '#005CA9'
            };
            cor = bankColors[modelo] || null;
        }

        if (!cor) {
            if (bancoRelacionado && bancoRelacionado.cor) {
                cor = bancoRelacionado.cor;
            } else {
                cor = 'var(--c-brand-deep)';
            }
        }

        const editId = document.getElementById('cartao-id')?.value;
        const cardData = { bancoId, modelo, nome, limite, fechamento, vencimento, cor, final };
        if (editId) await Database.updateCard(editId, cardData);
        else await Database.add('cartoes', { id: transactionOperationId(e.target), ...cardData });
        discardTransactionDraft(e.target);
        Utils.showToast(editId ? 'Cartão atualizado. Ciclos anteriores preservados.' : 'Cartão adicionado com sucesso!', 'success');
        App.closeModal();
        App.updateBankSelect();
        App.scheduleRender();
    },

    submitCategoria: async (e) => {
        e.preventDefault();
        const id = document.getElementById('nova-categoria-id')?.value || '';
        const nome = String(document.getElementById('nova-categoria-nome')?.value || '').trim();
        const nivel = document.getElementById('nova-categoria-nivel')?.value === 'subcategoria' ? 'subcategoria' : 'principal';
        const grupo = String(document.getElementById('nova-categoria-grupo')?.value || '').trim();
        const tipoRaw = document.getElementById('nova-categoria-tipo')?.value || 'despesa';
        const tipo = ['despesa', 'receita'].includes(tipoRaw) ? tipoRaw : '';
        const icone = document.getElementById('nova-categoria-icone')?.value || 'fa-tag';
        const cor = document.getElementById('nova-categoria-cor')?.value || '#3B82F6';
        const palavrasInput = document.getElementById('nova-categoria-palavras');
        const palavrasChave = palavrasInput ? [...new Set(palavrasInput.value.split(/[,;\n]/)
            .map(word => word.trim().toLocaleLowerCase('pt-BR')).filter(Boolean))] : undefined;

        if (!nome) {
            Utils.showToast('Informe um nome para a categoria.', 'error');
            return;
        }
        if (!tipo) {
            Utils.showToast('O tipo deve ser Despesa ou Receita.', 'error');
            return;
        }
        if (nivel === 'subcategoria' && !grupo) {
            Utils.showToast('Escolha uma categoria principal válida para a subcategoria.', 'error');
            return;
        }
        const payload = { nome, grupo, tipo, tipoCategoria: nivel, icone, cor,
            ...(palavrasChave !== undefined ? { palavrasChave } : {}) };
        const saved = id
            ? await Database.updateCategory(id, payload)
            : await Database.add('categorias', { id: 'cat_' + Date.now(), ...payload, fixa: false });
        if (saved) {
            Utils.showToast(id ? 'Categoria atualizada!' : 'Categoria adicionada!', 'success');
            App.updateCategorySelects();
            App.closeModal();
            App.scheduleRender();
        } else {
            const reason = Database.getCategoryError?.() || 'Categoria inválida, protegida ou já utilizada.';
            Utils.showToast(reason, 'error');
            // Keep the entered values so the user can correct the exact invalid
            // field; a later open/close always resets the form to clean defaults.
        }
    },
    submitContato: async (e) => {
        e.preventDefault();
        const id = document.getElementById('contato-id')?.value || '';
        const nome = document.getElementById('contato-nome').value.trim();
        const documento = String(document.getElementById('contato-documento')?.value || '').trim();
        const tipo = document.getElementById('contato-tipo')?.value || 'pf';
        const telefone = document.getElementById('contato-telefone')?.value || '';
        const email = String(document.getElementById('contato-email')?.value || '').trim();
        const endereco = document.getElementById('contato-endereco')?.value || '';

        if (!nome || !['pf', 'pj'].includes(tipo)) {
            Utils.showToast('Informe o nome e um tipo de pessoa válido.', 'error');
            return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            Utils.showToast('Informe um e-mail válido ou deixe o campo em branco.', 'error');
            return;
        }
        const payload = { nome, documento, tipo, telefone, email, endereco };
        try {
            await Database.saveContactAtomically(id || null, payload);
            Utils.showToast('Contato salvo com sucesso!', 'success');
            App.updateContatoSelect();
            App.closeModal();
            App.scheduleRender();
        } catch (error) {
            Utils.showToast(error?.message || 'Não foi possível salvar a pessoa. Os dados anteriores foram mantidos.', 'error');
        }
    }
};
