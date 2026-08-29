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
        const bancoId = parseInt(document.getElementById('cartao-bancoId').value);
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
            const bancoRelacionado = db.bancos.find(b => b.id === bancoId);
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
        const nome = document.getElementById('nova-categoria-nome').value;
        const icone = document.getElementById('nova-categoria-icone').value;
        const cor = document.getElementById('nova-categoria-cor').value || '#3B82F6';
        
        if (Database.add('categorias', { id: 'cat_' + Date.now(), nome, icone, cor })) {
            Utils.showToast('Categoria adicionada!', 'success');
            App.updateCategorySelects();
            App.closeModal();
            App.scheduleRender();
        } else {
            Utils.showToast('Esta categoria já existe.', 'error');
        }
    },

    submitContato: (e) => {
        e.preventDefault();
        const nome = document.getElementById('contato-nome').value;
        const documento = document.getElementById('contato-documento').value;
        
        Database.add('contatos', { id: Date.now(), nome, documento });
        Utils.showToast('Contato salvo com sucesso!', 'success');
        App.updateContatoSelect();
        App.closeModal();
    }
};