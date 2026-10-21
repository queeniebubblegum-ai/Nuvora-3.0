import { db, Database } from './db.js';
import { Utils } from './utils.js';
import { App } from './app.js';
import { isValidTransferDate } from './financial-transfers.js';

const scheduleId = () => globalThis.crypto?.randomUUID?.() || `previsao-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const buildScheduleOccurrences = (base, repetition = 'unica', quantity = 1, idFactory = scheduleId) => {
    if (!isValidTransferDate(base?.dataVencimento)) throw new Error('Informe um vencimento válido.');
    if (!['unica', 'semanal', 'mensal', 'anual'].includes(repetition)) throw new Error('Selecione uma repetição válida.');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 120) throw new Error('Informe de 1 a 120 ocorrências.');
    const count = repetition === 'unica' ? 1 : quantity;
    const original = Utils.parseLocalDate(base.dataVencimento);
    const groupId = count > 1 ? idFactory() : null;
    return Array.from({ length: count }, (_, index) => {
        let date = base.dataVencimento;
        if (repetition === 'mensal' || repetition === 'anual') date = Utils.addMonthsSafe(base.dataVencimento, index * (repetition === 'anual' ? 12 : 1));
        if (repetition === 'semanal') {
            const next = new Date(original);
            next.setDate(original.getDate() + index * 7);
            date = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
        }
        return { ...base, id: idFactory(), dataVencimento: date,
            repeticao: repetition, recorrente: count > 1, grupoId: groupId,
            parcelaAtual: index + 1, totalParcelas: count };
    });
};

export const PlaneamentoController = {
    submitReceitaFutura: async (e) => {
        e.preventDefault();
        const form = e.target;
        const desc = form.querySelector('[name="desc"]').value.trim();
        const valor = Number(form.querySelector('[name="valor"]').value);
        const data = form.querySelector('[name="data"]').value;
        if (!desc || !Number.isFinite(valor) || valor <= 0 || !data) { Utils.showToast('Informe descrição, valor e data válidos.', 'error'); return; }
        await Database.add('receitasFuturas', { id: Date.now(), desc, valor, data, status: 'prevista' });
        Utils.showToast('Receita futura adicionada!', 'success');
        App.scheduleRender();
    },

    submitAssinatura: async (e) => {
        e.preventDefault();
        const form = e.target;
        const nome = form.querySelector('[name="nome"]').value.trim();
        const valor = Number(form.querySelector('[name="valor"]').value);
        if (!nome || !Number.isFinite(valor) || valor <= 0) { Utils.showToast('Informe nome e valor válidos.', 'error'); return; }
        await Database.add('assinaturas', { id: Date.now(), nome, valor, periodicidade: form.querySelector('[name="periodicidade"]').value, ativa: true });
        Utils.showToast('Assinatura adicionada!', 'success');
        App.scheduleRender();
    },

    submitInvestimento: async (e) => {
        e.preventDefault();
        const form = e.target;
        const nome = form.querySelector('[name="nome"]').value.trim();
        const valorAtual = Number(form.querySelector('[name="valorAtual"]').value);
        const aporteRaw = form.querySelector('[name="aporte"]')?.value;
        const aporte = aporteRaw === '' || aporteRaw == null ? 0 : Number(aporteRaw);
        const classe = form.querySelector('[name="classe"]')?.value.trim() || '';
        if (!nome || !Number.isFinite(valorAtual) || valorAtual < 0 || !Number.isFinite(aporte) || aporte < 0) { Utils.showToast('Informe nome e valores válidos.', 'error'); return; }
        await Database.add('investimentos', { id: Date.now(), nome, valorAtual, aporte, classe });
        Utils.showToast('Investimento adicionado!', 'success');
        App.closeModal();
        App.scheduleRender();
    },

    submitAgendamento: async (e) => {
        e.preventDefault();
        const tipo = document.getElementById('agendamento-tipo').value;
        const desc = document.getElementById('agendamento-desc').value.trim();
        const valor = Number(document.getElementById('agendamento-valor').value);
        const dataVencimento = document.getElementById('agendamento-data').value;
        const categoria = document.getElementById('agendamento-categoria').value;
        
        const editId = document.getElementById('agendamento-edit-id')?.value;
        const editCol = document.getElementById('agendamento-edit-col')?.value || 'agendamentos';
        const existing = editId ? (db[editCol] || []).find(item => String(item.id) === String(editId)) : null;
        const bancoInput = document.getElementById('agendamento-banco');
        const bancoIdRaw = bancoInput ? bancoInput.value : (existing?.bancoId ?? db.bancos[0]?.id ?? '');
        const banco = db.bancos.find(bank => String(bank.id) === String(bancoIdRaw));
        const contatoInput = document.getElementById('agendamento-contato');
        const contatoIdRaw = contatoInput ? contatoInput.value : (existing?.contatoId ?? '');
        const contato = db.contatos.find(person => String(person.id) === String(contatoIdRaw));
        const repeticao = document.getElementById('agendamento-repeticao')?.value || 'unica';
        const repetitionsRaw = document.getElementById('agendamento-repeticoes')?.value;
        const repeticoes = repeticao === 'unica' ? 1 : Number(repetitionsRaw || 1);
        if (!desc || !Number.isFinite(valor) || valor <= 0 || !isValidTransferDate(dataVencimento) || !['despesa', 'receita'].includes(tipo)) { Utils.showToast('Informe descrição, valor, tipo e vencimento válidos.', 'error'); return; }
        if (bancoIdRaw && !banco) { Utils.showToast('Selecione uma conta válida.', 'error'); return; }
        if (contatoIdRaw && !contato) { Utils.showToast('Selecione uma pessoa válida.', 'error'); return; }
        const dados = { desc, valor, dataVencimento, categoria, tipo, bancoId: banco?.id ?? null, contatoId: contato?.id ?? null };
        try {
            if (editId) await Database.saveForecastAtomically(editId, editCol, dados);
            else await Database.addSchedulesAtomically(buildScheduleOccurrences({ ...dados, status: 'pendente' }, repeticao, repeticoes));
            const editField = document.getElementById('agendamento-edit-id');
            if (editField) editField.value = '';
            Utils.showToast(editId ? 'Previsão atualizada!' : repeticoes > 1 ? `${repeticoes} previsões criadas na agenda!` : 'Previsão criada na agenda!', 'success');
            App.closeModal();
            App.scheduleRender();
        } catch (error) {
            Utils.showToast(error?.message || 'Não foi possível salvar a previsão. Os dados anteriores foram mantidos.', 'error');
        }
    },

    submitMeta: async (e) => {
        e.preventDefault();
        const nome = document.getElementById('meta-nome').value;
        const data = document.getElementById('meta-data').value;
        const alvo = parseFloat(document.getElementById('meta-alvo').value);
        await Database.add('metas', { id: Date.now(), nome, data, alvo, atual: 0 });
        Utils.showToast('Meta criada com sucesso!', 'success');
        App.closeModal();
    },

    submitDepositoMeta: async (e) => {
        e.preventDefault();
        const id = document.getElementById('deposito-meta-id').value;
        const valor = Number(document.getElementById('deposito-meta-valor').value);
        const bancoId = document.getElementById('deposito-meta-banco')?.value;
        if (!db.bancos.some(bank => String(bank.id) === String(bancoId))) {
            Utils.showToast('Selecione a conta onde o valor ficará reservado.', 'error');
            return;
        }
        if (!Number.isFinite(valor) || valor <= 0) {
            Utils.showToast('Informe um valor de aporte maior que zero.', 'error');
            return;
        }

        try {
            await Database.depositGoal(id, bancoId, valor, Utils.localISODate());
            Utils.showToast(`Guardou ${Utils.formatMoney(valor)} na reserva da meta.`, 'success');
            App.closeModal();
            App.scheduleRender();
        } catch (error) {
            Utils.showToast(error?.message || 'Não foi possível reservar o valor para a meta.', 'error');
        }
    },

    submitOrcamento: async (e) => {
        e.preventDefault();
        const categoria = document.getElementById('orcamento-categoria').value;
        const limite = parseFloat(document.getElementById('orcamento-valor').value);
        await Database.updateBudget(categoria, limite, App.viewState.budgetYear, App.viewState.budgetMonth);
        Utils.showToast('Orçamento definido com sucesso!', 'success');
        App.closeModal();
    },

    // --- MÓDULO INTELIGENTE 50/30/20 ---
    preview503020: async (valorInput) => {
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

    submitOrcamentoInteligente: async (e) => {
        e.preventDefault();
        const renda = parseFloat(document.getElementById('oi-renda').value);
        if(!renda || renda <= 0) {
            Utils.showToast('Informe uma renda válida.', 'error');
            return;
        }

        // Distribui os 50% (Necessidades Vitais)
        await Database.updateBudget('Moradia', renda * 0.15);
        await Database.updateBudget('Alimentação', renda * 0.15);
        await Database.updateBudget('Transporte', renda * 0.10);
        await Database.updateBudget('Saúde', renda * 0.05);
        await Database.updateBudget('Serviços', renda * 0.05);

        // Distribui os 30% (Estilo de Vida e Lazer)
        await Database.updateBudget('Lazer', renda * 0.15);
        await Database.updateBudget('Compras', renda * 0.15);

        // Atualiza a expectativa de renda no perfil do usuário
        await Database.updateUser({ rendaMensalMedia: renda.toString() });

        Utils.showToast('Limites 50/30/20 aplicados com sucesso!', 'success');
        App.closeModal();
        App.scheduleRender();
    }
};
