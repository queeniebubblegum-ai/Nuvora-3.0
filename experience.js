import { db, Database } from './db.js';
import { Utils } from './utils.js';
import { loadViewContext, saveViewContext, isValidPlanningPeriod } from './view-context.js';

export const setupExperienceInteractions = App => {
    App.editContact = id => {
        const person = (db.contatos || []).find(item => String(item.id) === String(id));
        if (!person) return Utils.showToast('Contato não encontrado.', 'error');
        App.closeModal(false, 'modal-contato-perfil');
        App.openModal('modal-contato');
        const fields = { 'contato-id':person.id, 'contato-nome':person.nome, 'contato-tipo':person.tipo || 'pf', 'contato-documento':person.documento, 'contato-telefone':person.telefone, 'contato-email':person.email, 'contato-endereco':person.endereco };
        for (const [field,value] of Object.entries(fields)) { const input = document.getElementById(field); if(input) input.value = value ?? ''; }
        const title = document.getElementById('contato-titulo'); if(title) title.textContent = 'Editar contato';
        const submit = document.getElementById('contato-submit'); if(submit) submit.textContent = 'Salvar alterações';
        App.captureModalState('modal-contato');
    };
    App.setAgendaView = value => {
        if (!['month','week','day'].includes(value)) return;
        App.viewState.agendaView = value;
        saveViewContext('agenda.view', value, input => ['month','week','day'].includes(input));
        App.scheduleRender();
    };
    App.viewState.agendaView = loadViewContext('agenda.view','month',value => ['month','week','day'].includes(value));
    const context = loadViewContext('agenda.period',null,isValidPlanningPeriod);
    if(context) { App.viewState.agendaMonth = context.month; App.viewState.agendaYear = context.year; }
    const changeAgenda = App.changeAgendaMonth;
    App.changeAgendaMonth = direction => {
        changeAgenda(direction);
        App.viewState.agendaSelectedDate = `${App.viewState.agendaYear}-${String(App.viewState.agendaMonth+1).padStart(2,'0')}-01`;
        saveViewContext('agenda.period',{year:App.viewState.agendaYear,month:App.viewState.agendaMonth},isValidPlanningPeriod);
    };
    App.setFontScale = value => {
        const scale = ['1','1.1','1.2'].includes(String(value)) ? String(value) : '1';
        document.documentElement.style.setProperty('--av-font-scale', scale);
        try { localStorage.setItem('avenera:font-scale', scale); } catch { /* optional preference storage */ }
    };
    let font = '1';
    try { font = localStorage.getItem('avenera:font-scale') || '1'; } catch { /* defaults */ }
    App.setFontScale(font);
    const filterPeople = () => {
        const query = (document.querySelector('[data-people-search]')?.value || '').trim().toLocaleLowerCase('pt-BR');
        const type = document.querySelector('[data-people-type]')?.value || 'all';
        let count = 0;
        document.querySelectorAll('[data-person-search]').forEach(row => {
            const match = (!query || row.dataset.personSearch.includes(query)) && (type === 'all' || row.dataset.personType === type);
            row.hidden = !match; if(match) count++;
        });
        const empty = document.querySelector('[data-people-empty]'); if(empty) empty.hidden = count !== 0;
    };
    document.body.addEventListener('input',event => { if(event.target.matches('[data-people-search]')) filterPeople(); });
    document.body.addEventListener('change',event => {
        if(event.target.matches('[data-people-type]')) filterPeople();
        if(event.target.id === 'agendamento-tipo') {
            const category = document.getElementById('agendamento-categoria');
            if(category) category.innerHTML = '<option value="">Selecione a categoria</option>' + (db.categorias || []).filter(item => item.ativo !== false && !item.arquivada && (!item.tipo || item.tipo === event.target.value)).map(item => `<option value="${Utils.escapeHTML(item.nome)}">${Utils.escapeHTML(item.nome)}</option>`).join('');
        }
    });
};
