import { db, Database } from './db.js';
import { Utils } from './utils.js';
import { App } from './app.js';

export const PlaneamentoController = {
    submitAgendamento: (e) => {
        e.preventDefault();
        const tipo = document.getElementById('agendamento-tipo').value;
        const desc = document.getElementById('agendamento-desc').value;
        const valor = parseFloat(document.getElementById('agendamento-valor').value);
        const dataVencimento = document.getElementById('agendamento-data').value;
        const categoria = document.getElementById('agendamento-categoria').value;
        
        const bancoIdRaw = document.getElementById('agendamento-banco')?.value;
        const bancoId = bancoIdRaw ? parseInt(bancoIdRaw) : (db.bancos.length > 0 ? db.bancos[0].id : null);
        
        Database.add('agendamentos', {
            id: Date.now(),
            desc, valor, dataVencimento, categoria, tipo,
            status: 'pendente',
            bancoId: bancoId
        });
        
        Utils.showToast('Conta agendada com sucesso!', 'success');
        App.closeModal();
        if (App.currentPage === 'Agendamentos') App.scheduleRender();
    },

    submitMeta: (e) => {
        e.preventDefault();
        const nome = document.getElementById('meta-nome').value;
        const data = document.getElementById('meta-data').value;
        const alvo = parseFloat(document.getElementById('meta-alvo').value);
        const atual = parseFloat(document.getElementById('meta-atual').value);
        
        Database.add('metas', { id: Date.now(), nome, data, alvo, atual });
        Utils.showToast('Meta criada com sucesso!', 'success');
        App.closeModal();
    },

    submitDepositoMeta: (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('deposito-meta-id').value);
        const valor = parseFloat(document.getElementById('deposito-meta-valor').value);
        
        const bancoIdRaw = document.getElementById('deposito-meta-banco')?.value;
        const bancoId = bancoIdRaw ? parseInt(bancoIdRaw) : (db.bancos.length > 0 ? db.bancos[0].id : null);
        
        Database.depositGoal(id, valor);
        
        Database.add('transacoes', {
            id: Date.now(),
            desc: `Depósito: ${document.getElementById('deposito-meta-nome').innerText}`,
            valor: valor,
            tipo: 'despesa',
            categoria: 'Investimentos',
            bancoId: bancoId,
            isCartao: false,
            data: Utils.localISODate()
        });
        
        Utils.showToast(`Guardou ${Utils.formatMoney(valor)}!`, 'success');
        App.closeModal();
    },

    submitOrcamento: (e) => {
        e.preventDefault();
        const categoria = document.getElementById('orcamento-categoria').value;
        const limite = parseFloat(document.getElementById('orcamento-valor').value);
        Database.updateBudget(categoria, limite);
        Utils.showToast('Orçamento definido com sucesso!', 'success');
        App.closeModal();
    },

    // --- MÓDULO INTELIGENTE 50/30/20 ---
    preview503020: (valorInput) => {
        const val = parseFloat(valorInput) || 0;
        const necess = val * 0.5;
        const lazer = val * 0.3;
        const poup = val * 0.2;

        const el50 = document.getElementById('oi-prev-50');
        const el30 = document.getElementById('oi-prev-30');
        const el20 = document.getElementById('oi-prev-20');

        if(el50) el50.innerText = Utils.formatMoney(necess);
        if(el30) el30.innerText = Utils.formatMoney(lazer);
        if(el20) el20.innerText = Utils.formatMoney(poup);
    },

    submitOrcamentoInteligente: (e) => {
        e.preventDefault();
        const renda = parseFloat(document.getElementById('oi-renda').value);
        if(!renda || renda <= 0) {
            Utils.showToast('Informe uma renda válida.', 'error');
            return;
        }

        // Distribui os 50% (Necessidades Vitais)
        Database.updateBudget('Moradia', renda * 0.15);
        Database.updateBudget('Alimentação', renda * 0.15);
        Database.updateBudget('Transporte', renda * 0.10);
        Database.updateBudget('Saúde', renda * 0.05);
        Database.updateBudget('Serviços', renda * 0.05);

        // Distribui os 30% (Estilo de Vida e Lazer)
        Database.updateBudget('Lazer', renda * 0.15);
        Database.updateBudget('Compras', renda * 0.15);

        // Atualiza a expectativa de renda no perfil do usuário
        Database.updateUser({ rendaMensalMedia: renda.toString() });

        Utils.showToast('Limites 50/30/20 aplicados com sucesso!', 'success');
        App.closeModal();
        App.scheduleRender();
    }
};