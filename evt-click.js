import { Utils } from './utils.js';
import { Controllers } from './controllers.js';
import { App } from './app.js';
import { trackUIEvent } from './ui-tracking.js';

export const ClickEvents = {
    setup: () => {
        document.body.addEventListener('click', (e) => {
            // Delegation must work when the click lands on an icon, label, SVG or
            // text node inside the actionable control. The composed path also
            // covers embedded/SVG targets that do not expose parentElement.
            const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
            const target = e.target instanceof Element ? e.target : e.target?.parentElement;
            const btn = path.find(node => node instanceof Element && node.matches('button[data-action], [role="button"][data-action], a[data-action], summary[data-action]'))
                || target?.closest?.('button[data-action], [role="button"][data-action], a[data-action], summary[data-action]')
                || target?.closest?.('[data-action]');

            const anoraMenu = document.getElementById('anora-menu');
            const anoraWrapper = target?.closest?.('.anora-wrapper');
            const selectingAnoraPage = target?.closest?.('[data-action="navigate"][data-payload="Anora"]');
            if (anoraMenu && !anoraMenu.classList.contains('hidden') && (!anoraWrapper || selectingAnoraPage)) {
                anoraMenu.classList.add('hidden');
            }

            // A disabled button can still be reached through delegated events in
            // some webviews. Do not execute its action (or block its parent).
            if (!btn || btn.disabled === true || btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true') return;

            const action = btn.getAttribute('data-action');
            const actionId = () => {
                const ownId = btn.getAttribute('data-id');
                if (ownId !== null && ownId !== '') return ownId;
                return btn.closest('.nv-tx-row[data-id]')?.getAttribute('data-id') || null;
            };

            const actionsMap = {
                'navigate': () => App.navigate(btn.getAttribute('data-payload')),
                'askAnoraQuestion': () => {
                    const chat = btn.closest('[data-anora-chat]');
                    const input = chat?.querySelector('[data-anora-input]');
                    const form = input?.closest('form[data-submit="chatAnora"]');
                    if (!input || !form) return;
                    input.value = btn.getAttribute('data-payload') || '';
                    if (typeof form.requestSubmit === 'function') form.requestSubmit();
                    else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                },
                'setAnoraStyle': () => {
                    const updated = App.updateAnoraPreference('style', btn.getAttribute('data-payload'));
                    if (updated && App.currentPage === 'Anora') App.scheduleRender();
                },
                'openSettingsGroup': () => App.openSettingsGroup(btn.getAttribute('data-group')),
                'toggleTheme': () => App.toggleTheme(),
                'chooseProfilePhoto': () => App.chooseProfilePhoto(),
                'importBackupPicker': () => App.importBackupPicker(),
                'openModal': () => {
                    const prerequisiteMessage = btn.getAttribute('data-prerequisite-message');
                    if (prerequisiteMessage) Utils.showToast(prerequisiteMessage, 'warning');
                    App.openModal(btn.getAttribute('data-modal'), btn.getAttribute('data-type'));
                },
                'switchToTransferMode': () => App.switchToTransferMode(),
                'closeModal': () => App.closeModal(true, btn.closest('[id^="modal-"]')?.id || null),
                'delete': () => Controllers.delete(btn.getAttribute('data-col'), btn.getAttribute('data-id')),
                'renameCategory': () => { const nome = prompt('Novo nome da categoria:', btn.getAttribute('data-name') || ''); if (nome !== null) { if (App.renameCategory(btn.getAttribute('data-id'), nome)) { Utils.showToast('Categoria renomeada!', 'success'); App.scheduleRender(); } else Utils.showToast('Nome inválido, protegido ou já utilizado.', 'error'); } },
                'editCategory': () => App.openCategoryEditor(btn.getAttribute('data-id')),
                'archiveCategory': () => App.archiveCategory(btn.getAttribute('data-id')),
                'restoreCategory': () => App.restoreCategory(btn.getAttribute('data-id')),
                'deleteCategory': () => App.deleteCategory(btn.getAttribute('data-id')),
                'viewCategory': () => Utils.showToast('Categorias padrão são protegidas e somente para consulta.', 'info'),
                'setCategoryStatus': () => App.setCategoryStatus(btn.getAttribute('data-payload') || 'active'),
                'editAgenda': () => App.editAgenda(btn.getAttribute('data-id'), btn.getAttribute('data-col')),
                'acceptClassification': () => App.acceptClassification(),
                'editClassification': () => App.editClassification(),
                'markAgendaPaid': () => App.markAgendaPaid(btn.getAttribute('data-id'), btn.getAttribute('data-col')),
                'markCloseAgendaPaid': () => App.markCloseAgendaPaid(btn.getAttribute('data-id')),
                'openInvoicePayment': () => App.openInvoicePayment(btn.getAttribute('data-id')),
                'openInvoicePaymentForCard': () => App.openInvoicePaymentForCard(btn.getAttribute('data-id')),
                'confirmInvoicePayment': () => App.confirmInvoicePayment(),
                'cancelInvoicePayment': () => App.cancelInvoicePayment(),
                // Keep row IDs as DOM strings. The controller performs the
                // canonical comparison against numeric or string persisted IDs.
                'deleteExpense': () => Controllers.deleteExpense(actionId()),
                'deleteSelectedTx': () => Controllers.deleteSelectedTransactions(),
                'undoTransactions': () => Controllers.undoDeletedTransactions(),
                'openEditModal': () => App.openEditModal(actionId()),
                'toggleEditLock': () => App.toggleEditLock(),
                'openDepositModal': () => App.openDepositModal(btn.getAttribute('data-id'), btn.getAttribute('data-nome')),
                'openInvoiceDetails': () => App.openInvoiceDetails(btn.getAttribute('data-id')),
                'switchInvoiceTab': () => App.switchInvoiceTab(btn.getAttribute('data-tab')),
                'focusInvoiceAdjustments': () => App.focusInvoiceAdjustments(),
                'closeInvoiceDetails': () => App.closeInvoiceDetails(),
                'saveInvoiceReconciliation': () => App.saveInvoiceReconciliation(),
                'saveInvoiceAdjustment': () => App.saveInvoiceAdjustment(),
                'editInvoiceAdjustment': () => App.editInvoiceAdjustment(btn.getAttribute('data-id')),
                'deleteInvoiceAdjustment': () => App.deleteInvoiceAdjustment(btn.getAttribute('data-id')),
                'createInvoiceAdjustmentTransaction': () => App.createInvoiceAdjustmentTransaction(btn.getAttribute('data-id')),
                'openInvoiceAdjustmentsReview': () => App.openInvoiceAdjustmentsReview(),
                'closeInvoiceAdjustmentsReview': () => App.closeInvoiceAdjustmentsReview(),
                'confirmInvoiceAdjustmentsBulk': () => App.confirmInvoiceAdjustmentsBulk(),
                'openInvoiceClassification': () => App.openInvoiceClassification(),
                'closeInvoiceClassification': () => App.closeInvoiceClassification(),
                'applyInvoiceClassification': () => App.applyInvoiceClassification(),
                'openCardExpenseModal': () => App.openCardExpenseModal(btn.getAttribute('data-id'), btn.getAttribute('data-nome')),
                'setDashboardPeriod': () => App.setDashboardPeriod(btn.getAttribute('data-payload')),
                'changeMonth': () => App.changeMonth(btn.getAttribute('data-type'), parseInt(btn.getAttribute('data-dir'))),
                'changeAgendaMonth': () => App.changeAgendaMonth(parseInt(btn.getAttribute('data-dir'))),
                'resetAgendaToday': () => App.resetAgendaToday(),
                'showAgendaDay': () => App.showAgendaDay(btn.getAttribute('data-payload')),
                'addAgendaOnDate': () => App.addAgendaOnDate(),
                'setReportTab': () => App.setReportTab(btn.getAttribute('data-payload')),
                'setCategoryType': () => App.setCategoryType(btn.getAttribute('data-payload') || 'all'),
                'exportPDF': () => App.exportToPDF(),
                'exportTransactionsCSV': () => App.exportTransactionsCSV(),
                'exportBackup': () => App.exportBackup(),
                'clearFilters': () => App.clearFilters(),
                'filterUncategorized': () => App.filterUncategorized(),
                'clearUncategorizedFilter': () => App.clearUncategorizedFilter(),
                'setTransactionType': () => App.setTransactionType(btn.getAttribute('data-payload')),
                'setTransactionTypeFilter': () => App.setFilter('tipo', btn.getAttribute('data-payload') || ''),
                'setTxPage': () => App.setTxPage(btn.getAttribute('data-payload')),
                'simularDespesaCartao': () => Controllers.simularDespesaCartao(),
                'simularTransacaoGeral': () => Controllers.simularTransacaoGeral(),
                'salvarOFXAprovado': () => App.salvarOFXAprovado(),
                'iniciarImportacaoOFX': () => App.iniciarImportacaoOFX(btn.getAttribute('data-banco-id') ?? btn.getAttribute('data-payload')),
                'iniciarImportacaoCSV': () => App.iniciarImportacaoCSV(btn.getAttribute('data-banco-id') ?? btn.getAttribute('data-payload')),
                'iniciarFechamentoMes': () => App.iniciarFechamentoMes(),
                'silenciarAnora': () => {
                    Utils.showToast('Alertas da Anora silenciados por 24 horas.', 'success');
                    document.getElementById('anora-menu').classList.add('hidden');
                }
            };

            const handler = actionsMap[action];
            // Only consume clicks that have a known delegated action. This keeps
            // native links and <details>/<summary> controls unrelated to actions
            // working normally, while stopping parent handlers from interfering
            // with modal/edit/delete controls.
            if (!handler) return;
            e.preventDefault();
            e.stopPropagation();
            handler();
            if (action === 'navigate' || action === 'openModal') {
                trackUIEvent({ screen: App.currentPage || 'unknown', source: 'quick_action', action });
            }
            // Action buttons inside a toast close that toast after handling,
            // while normal page actions keep their existing lifecycle.
            const actionToast = btn.closest?.('[data-toast="true"]');
            if (actionToast) actionToast.remove();
        });
    }
};
