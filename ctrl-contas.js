import { db, Database } from './db.js';
import { Utils } from './utils.js';
import { App } from './app.js';

export const ContasController = {
    submitBanco: (e) => {
        e.preventDefault();
        const instElement = document.getElementById('banco-instituicao');
        const instituicao = instElement ? instElement.value : 'Outro';
        const nome = document.getElementById('banco-nome').value;
        const saldo = parseFloat(document.getElementById('banco-saldo').value);
        
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

        Database.add('bancos', { 
            id: Date.now(), 
            nome, 
            saldo, 
            instituicao, 
            cor,
            dataCriacao: Utils.localISODate() // Data âncora para o saldo inicial
        });
        
        Utils.showToast('Conta criada com sucesso!', 'success');
        App.closeModal();
        App.updateBankSelect();
    },

    submitCartao: (e) => {
        e.preventDefault();
        // Select values are strings, while persisted bank IDs may be numbers or
        // application-generated strings. Resolve against the stored record and
        // keep its original ID type instead of coercing it with parseInt().
        const bancoIdRaw = document.getElementById('cartao-bancoId').value;
        const bancoRelacionado = db.bancos.find(b => String(b.id) === String(bancoIdRaw));
        const bancoId = bancoRelacionado ? bancoRelacionado.id : bancoIdRaw;
        const modeloElement = document.getElementById('cartao-modelo');
        const modelo = modeloElement ? modeloElement.value : 'custom';
        const nome = document.getElementById('cartao-nome').value;
        const limite = parseFloat(document.getElementById('cartao-limite').value);
        const fechamento = parseInt(document.getElementById('cartao-dia-fech').value);
        const vencimento = parseInt(document.getElementById('cartao-dia-venc').value);
        
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

        Database.add('cartoes', { id: Date.now(), bancoId, modelo, nome, limite, fechamento, vencimento, cor });
        Utils.showToast('Cartão adicionado com sucesso!', 'success');
        App.closeModal();
        App.updateBankSelect();
    },

    submitCategoria: (e) => {
        e.preventDefault();
        const id = document.getElementById('nova-categoria-id')?.value || '';
        const nome = String(document.getElementById('nova-categoria-nome')?.value || '').trim();
        const nivel = document.getElementById('nova-categoria-nivel')?.value === 'subcategoria' ? 'subcategoria' : 'principal';
        const grupo = String(document.getElementById('nova-categoria-grupo')?.value || '').trim();
        const tipoRaw = document.getElementById('nova-categoria-tipo')?.value || 'despesa';
        const tipo = ['despesa', 'receita'].includes(tipoRaw) ? tipoRaw : '';
        const icone = document.getElementById('nova-categoria-icone')?.value || 'fa-tag';
        const cor = document.getElementById('nova-categoria-cor')?.value || '#3B82F6';

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
        const payload = { nome, grupo, tipo, tipoCategoria: nivel, icone, cor };
        const saved = id
            ? Database.updateCategory(id, payload)
            : Database.add('categorias', { id: 'cat_' + Date.now(), ...payload, fixa: false });
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
    submitContato: (e) => {
        e.preventDefault();
        const nome = document.getElementById('contato-nome').value;
        const documento = document.getElementById('contato-documento')?.value || '';
        const tipo = document.getElementById('contato-tipo')?.value || 'pf';
        const telefone = document.getElementById('contato-telefone')?.value || '';
        const email = document.getElementById('contato-email')?.value || '';
        const endereco = document.getElementById('contato-endereco')?.value || '';

        Database.add('contatos', { id: Date.now(), nome, documento, tipo, telefone, email, endereco });
        Utils.showToast('Contato salvo com sucesso!', 'success');
        App.updateContatoSelect();
        App.closeModal();
    }
};