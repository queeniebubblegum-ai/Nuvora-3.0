import { Utils } from './utils.js';
import { Controllers } from './controllers.js';
import { App } from './app.js';
import { db } from './db.js';

export const ChangeEvents = {
    setup: () => {
        document.body.addEventListener('change', (e) => {
            if (e.target.id === 'backup-input') {
                App.importBackup(e);
                return;
            }

            const action = e.target.getAttribute('data-change');
            if (!action) return;

            const target = e.target;
            
            const changeMap = {
                'setFilter': () => App.setFilter(target.getAttribute('data-filter-key'), target.value),
                'setReportPeriod': () => App.setReportPeriod(target.value),
                'handleBancoChange': () => App.handleBancoChange(target.value),
                'handleFormaPagamentoChange': () => App.handleFormaPagamentoChange(target.value),
                'filterTransactionSubgroups': () => {
                    const group = target.value;
                    const sub = document.getElementById('input-categoria-subgrupo');
                    const type = document.getElementById('input-tipo')?.value || 'despesa';
                    if (!sub) return;
                    const options = db.categorias.filter(c => (!c.tipo || c.tipo === type) && (c.grupo || c.nome) === group);
                    sub.innerHTML = '<option value="">Subgrupo (opcional)</option>' + options.map(c => `<option value="${Utils.escapeHTML(c.nome)}">${Utils.escapeHTML(c.subgrupo || c.nome)}</option>`).join('');
                    document.getElementById('input-categoria').value = options[0]?.nome || '';
                },
                'selectTransactionSubgroup': () => { const canonical = document.getElementById('input-categoria'); if (canonical) canonical.value = target.value; },
                'filterCategoryGroups': () => {
                    const tipo = target.value;
                    const group = document.getElementById('nova-categoria-grupo');
                    const sub = document.getElementById('nova-categoria-nome');
                    if (!group || !sub) return;
                    group.value = ''; sub.value = '';
                    Array.from(group.options).forEach(opt => { opt.hidden = opt.dataset.type !== tipo && opt.value !== ''; });
                    Array.from(sub.options).forEach(opt => { opt.hidden = opt.dataset.type !== tipo && opt.value !== ''; });
                },
                'filterSubgroups': () => {
                    const tipo = document.getElementById('nova-categoria-tipo')?.value;
                    const group = target.value;
                    const sub = document.getElementById('nova-categoria-nome');
                    if (!sub) return;
                    sub.value = '';
                    Array.from(sub.options).forEach(opt => { opt.hidden = (opt.dataset.type !== tipo || opt.dataset.group !== group) && opt.value !== ''; });
                },

                'handleCartaoBancoChange': () => {
                    const bancoId = parseInt(target.value);
                    const banco = db.bancos.find(b => b.id === bancoId);
                    if(banco) {
                        const modeloSelect = document.getElementById('cartao-modelo');
                        const nomeInput = document.getElementById('cartao-nome');
                        if(modeloSelect && banco.instituicao && banco.instituicao !== 'Outro') {
                            let found = false;
                            Array.from(modeloSelect.options).forEach(opt => {
                                if(opt.value === banco.instituicao) {
                                    modeloSelect.value = banco.instituicao;
                                    found = true;
                                }
                            });
                            if(!found) modeloSelect.value = 'custom';
                            if (modeloSelect.value !== 'custom') nomeInput.value = modeloSelect.options[modeloSelect.selectedIndex].text;
                            else nomeInput.value = '';
                        }
                    }
                },
                'handleCartaoModelo': () => {
                    const nomeInput = document.getElementById('cartao-nome');
                    if(target.value !== 'custom') nomeInput.value = target.options[target.selectedIndex].text;
                    else { nomeInput.value = ''; nomeInput.focus(); }
                },
                'handleCardInstallments': () => {
                    const custom = document.getElementById('dc-parcelas-custom');
                    if (custom) custom.classList.toggle('hidden', target.value !== 'custom');
                    if (target.value === 'custom') custom?.focus();
                },
                'handleCardCategoryGroup': () => {
                    const sub = document.getElementById('dc-categoria-subgrupo');
                    const canonical = document.getElementById('dc-categoria');
                    if (!sub || !canonical) return;
                    const options = db.categorias.filter(c => (!c.tipo || c.tipo === 'despesa') && (c.grupo || c.nome) === target.value);
                    sub.innerHTML = '<option value="">Subgrupo (opcional)</option>' + options.map(c => `<option value="${Utils.escapeHTML(c.nome)}">${Utils.escapeHTML(c.subgrupo || c.nome)}</option>`).join('');
                    canonical.value = options[0]?.nome || '';
                },
                'handleCardCategorySubgroup': () => {
                    const canonical = document.getElementById('dc-categoria');
                    if (canonical) canonical.value = target.value;
                },
                'toggleRecorrente': () => {
                    const divMeses = document.getElementById('div-meses-recorrente');
                    if (target.checked) divMeses.classList.remove('hidden');
                    else divMeses.classList.add('hidden');
                },
                'toggleSelectTx': () => {
                    const id = target.value;
                    if (target.checked) App.viewState.selectedTransactions = [...App.viewState.selectedTransactions, id];
                    else App.viewState.selectedTransactions = App.viewState.selectedTransactions.filter(x => x !== id);
                },
                'toggleSelectAllTx': () => {
                    const checkboxes = document.querySelectorAll('input[data-change="toggleSelectTx"]');
                    const ids = Array.from(checkboxes).map(cb => cb.value);
                    if (target.checked) App.viewState.selectedTransactions = Array.from(new Set([...App.viewState.selectedTransactions, ...ids]));
                    else App.viewState.selectedTransactions = App.viewState.selectedTransactions.filter(id => !ids.includes(id));
                },
                'processarFotoPerfil': () => Controllers.processarFotoPerfil(e),
                'changeAnoraRigor': () => Utils.showToast(`Modo da Anora alterado para: ${target.value}.`, 'success'),
                'setDashboardDate': () => {
                    const val = target.value;
                    if (val) App.setDashboardPeriod(val);
                    else App.setDashboardPeriod('este_mes');
                },
                'handleOFXUpload': () => App.handleOFXUpload(e),
                'handleCSVUpload': () => App.handleCSVUpload(e),
                'changeTxPerPage': () => App.setTxPerPage(target.value),
                'handleOfxBancoChange': () => App.handleOfxBancoChange(target.value)
            };

            if (changeMap[action]) {
                changeMap[action]();
            }
        });
    }
};