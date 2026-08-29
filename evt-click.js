import { Utils } from './utils.js';
import { Controllers } from './controllers.js';
import { App } from './app.js';

export const ClickEvents = {
    setup: () => {
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');

            // Agenda: tratamento prioritário para evitar conflito com outros handlers
            if (btn?.getAttribute('data-action') === 'showAgendaDay') {
                e.preventDefault();
                App.showAgendaDay(btn.getAttribute('data-payload'));
                return;
            }
            
            const anoraMenu = document.getElementById('anora-menu');
            const anoraWrapper = e.target.closest('.anora-wrapper');
            if (anoraMenu && !anoraMenu.classList.contains('hidden') && !anoraWrapper) {
                anoraMenu.classList.add('hidden');
            }

            if (!btn) return;
            
            const action = btn.getAttribute('data-action');
            
            const actionsMap = {
                'navigate': () => App.navigate(btn.getAttribute('data-payload')),
                'openModal': () => App.openModal(btn.getAttribute('data-modal'), btn.getAttribute('data-type')),
                'closeModal': () => App.closeModal(true),
                'delete': () => Controllers.delete(btn.getAttribute('data-col'), btn.getAttribute('data-id')),
                'renameCategory': () => { const nome = prompt('Novo nome da categoria:', btn.getAttribute('data-name') || ''); if (nome !== null) { if (App.renameCategory(btn.getAttribute('data-id'), nome)) { Utils.showToast('Categoria renomeada!', 'success'); App.scheduleRender(); } else Utils.showToast('Nome inválido ou já utilizado.', 'error'); } },
                'editAgenda': () => App.editAgenda(btn.getAttribute('data-id'), btn.getAttribute('data-col')),
                'markAgendaPaid': () => App.markAgendaPaid(btn.getAttribute('data-id'), btn.getAttribute('data-col')),
                'deleteExpense': () => Controllers.deleteExpense(btn.getAttribute('data-id')),
                'deleteSelectedTx': () => Controllers.deleteSelectedTransactions(),
                'openEditModal': () => App.openEditModal(btn.getAttribute('data-id')), 
                'toggleEditLock': () => App.toggleEditLock(), 
                'openDepositModal': () => App.openDepositModal(btn.getAttribute('data-id'), btn.getAttribute('data-nome')),
                'openInvoiceDetails': () => App.openInvoiceDetails(parseInt(btn.getAttribute('data-id'))),
                'closeInvoiceDetails': () => App.closeInvoiceDetails(),
                'openCardExpenseModal': () => App.openCardExpenseModal(btn.getAttribute('data-id'), btn.getAttribute('data-nome')),
                'setDashboardPeriod': () => App.setDashboardPeriod(btn.getAttribute('data-payload')),
                'changeMonth': () => App.changeMonth(btn.getAttribute('data-type'), parseInt(btn.getAttribute('data-dir'))),
                'changeAgendaMonth': () => App.changeAgendaMonth(parseInt(btn.getAttribute('data-dir'))),
                'resetAgendaToday': () => App.resetAgendaToday(),
                'showAgendaDay': () => App.showAgendaDay(btn.getAttribute('data-payload')),
                'addAgendaOnDate': () => App.addAgendaOnDate(),
                'setReportTab': () => App.setReportTab(btn.getAttribute('data-payload')),
                'exportPDF': () => App.exportToPDF(),
                'exportTransactionsCSV': () => App.exportTransactionsCSV(),
                'exportBackup': () => App.exportBackup(),
                'clearFilters': () => App.clearFilters(),
                'setTransactionType': () => App.setTransactionType(btn.getAttribute('data-payload')),
                'setTxPage': () => {
                    if(!btn.hasAttribute('disabled')) {
                        App.setTxPage(btn.getAttribute('data-payload'));
                    }
                },
                'simularDespesaCartao': () => Controllers.simularDespesaCartao(),
                'simularTransacaoGeral': () => Controllers.simularTransacaoGeral(),
                'salvarOFXAprovado': () => App.salvarOFXAprovado(),
                'iniciarImportacaoOFX': () => App.iniciarImportacaoOFX(btn.getAttribute('data-banco-id')),
                'iniciarImportacaoCSV': () => App.iniciarImportacaoCSV(btn.getAttribute('data-banco-id')),
                'iniciarFechamentoMes': () => App.iniciarFechamentoMes(), // <-- GATILHO ADICIONADO AQUI
                'silenciarAnora': () => {
                    Utils.showToast('Alertas da Anora silenciados por 24 horas.', 'success');
                    document.getElementById('anora-menu').classList.add('hidden');
                }
            };

            if (actionsMap[action]) {
                actionsMap[action]();
            }
        });
    }
};