import { db, Database } from './db.js';
import { Utils } from './utils.js';
import { addMoney, fromCents, toCents } from './money-math.js';
import { SubmitGuard } from './submit-guard.js';
import { OFXManager } from './ofx.js';
import { CSVManager } from './csv-manager.js';
import { getInvestmentCapital, renderInvestmentDialogs } from './cmp-workspaces.js';

const localDate = () => Utils.localISODate();
const uniqueId = () => globalThis.crypto?.randomUUID?.() || `invest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const dateIsValid = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4)) && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10));
};
const amount = (value, label) => {
    const numeric = Number(value);
    if (value === '' || value == null || !Number.isFinite(numeric) || numeric < 0) throw new Error(`Informe ${label} válido.`);
    return fromCents(toCents(numeric));
};
const snapshot = (item, date, value) => [...(Array.isArray(item?.historicoValores) ? item.historicoValores.filter(point => point.data !== date) : []), { data: date, valor: value }].sort((a, b) => a.data.localeCompare(b.data));

export const buildInvestmentPosition = (input, existing = null, today = localDate()) => {
    const nome = String(input.nome || '').trim();
    if (!nome) throw new Error('Informe o nome do ativo.');
    const valorAtual = amount(input.valorAtual, 'um valor atual');
    const capitalInvestido = input.capitalInvestido === '' || input.capitalInvestido == null ? null : amount(input.capitalInvestido, 'um capital investido');
    const previous = existing?.valorAtual ?? existing?.valor;
    const movements = Array.isArray(existing?.movimentos) ? [...existing.movimentos] : [];
    if (existing && Number(previous) !== valorAtual) movements.push({ id: uniqueId(), tipo: 'avaliacao', data: today, valorAnterior: Number(previous) || 0, valorAtual });
    return { ...existing, id: existing?.id ?? uniqueId(), nome, classe: String(input.classe || '').trim(), instituicao: String(input.instituicao || '').trim(), valorAtual, capitalInvestido, aporte: capitalInvestido, movimentos: movements, historicoValores: snapshot(existing, today, valorAtual), criadoEm: existing?.criadoEm || new Date().toISOString(), atualizadoEm: new Date().toISOString() };
};

export const buildInvestmentContribution = (existing, input, today = localDate()) => {
    if (!existing) throw new Error('Investimento não encontrado.');
    const valor = amount(input.valor, 'um aporte');
    if (valor <= 0) throw new Error('O aporte deve ser maior que zero.');
    const data = String(input.data || today);
    if (!dateIsValid(data) || data > today) throw new Error('Informe uma data válida, até hoje, para o aporte realizado.');
    const capital = getInvestmentCapital(existing);
    const valorAtual = addMoney(existing.valorAtual ?? existing.valor, valor);
    const capitalInvestido = capital === null ? null : addMoney(capital, valor);
    return { ...existing, valorAtual, capitalInvestido, aporte: capitalInvestido, movimentos: [...(Array.isArray(existing.movimentos) ? existing.movimentos : []), { id: uniqueId(), tipo: 'aporte', data, valor }], historicoValores: snapshot(existing, today, valorAtual), atualizadoEm: new Date().toISOString() };
};

let saving = false;
export const saveInvestmentChange = async (input, { database = Database, store = db, today = localDate() } = {}) => {
    if (saving) throw new Error('Aguarde a conclusão do salvamento.');
    saving = true;
    try {
        const positions = Array.isArray(store.investimentos) ? store.investimentos : [];
        const existing = input.id ? positions.find(item => String(item.id) === String(input.id)) : null;
        if (input.id && !existing) throw new Error('Investimento não encontrado. Atualize a tela.');
        const next = input.mode === 'contribution' ? buildInvestmentContribution(existing, { valor: input.valorAporte, data: input.dataAporte }, today) : buildInvestmentPosition(input, existing, today);
        const investments = existing ? positions.map(item => String(item.id) === String(existing.id) ? next : item) : [next, ...positions];
        // The central patch restore is transactional and rolls back on IDB failure.
        // Unlike the legacy synchronous InvestmentRepo methods, it reports failure.
        await database.replaceAll({ investimentos: investments });
        return next;
    } finally { saving = false; }
};

export const handleWorkspaceImportFile = (file, app) => {
    if (!file) return false;
    const destination = document.querySelector('[data-workspace-import-target]')?.value || app.viewState.bancoAlvoOFX;
    if (!(db.bancos || []).some(bank => String(bank.id) === String(destination))) { Utils.showToast('Selecione uma conta válida antes de importar.', 'warning'); return false; }
    if (file.size > 5 * 1024 * 1024) { Utils.showToast('O arquivo deve ter até 5 MB.', 'error'); return false; }
    const format = /\.ofx$/i.test(file.name) ? 'OFX' : /\.csv$/i.test(file.name) ? 'CSV' : null;
    if (!format) { Utils.showToast('Escolha um arquivo OFX ou CSV.', 'error'); return false; }
    app.viewState.bancoAlvoOFX = destination;
    const openReview = modal => {
        const select = document.getElementById('ofx-banco-alvo-id');
        if (select) select.value = String(destination);
        app.openModal(modal);
        app.scheduleRender();
    };
    const event = { target: { files: [file], value: '' } };
    if (format === 'OFX') OFXManager.handleOFXUpload(event, app.viewState, app.scheduleRender, openReview);
    else {
        // A previous OFX must never be reparsed when the CSV review changes account.
        app.viewState.rawOfxString = null;
        CSVManager.handleUpload(event, app.viewState, openReview);
    }
    return true;
};

const registrations = new WeakMap();
export const setupWorkspaceInteractions = app => {
    if (registrations.has(document)) return registrations.get(document);
    const abort = new AbortController();
    const options = { signal: abort.signal };
    const openInvestment = (id = null, contribution = false, pickPosition = false) => {
        let modal = document.getElementById('modal-investimento-workspace');
        if (!modal) { document.body.insertAdjacentHTML('beforeend', renderInvestmentDialogs()); modal = document.getElementById('modal-investimento-workspace'); }
        const form = modal.querySelector('form');
        form.reset();
        const item = id ? (db.investimentos || []).find(position => String(position.id) === String(id)) : null;
        if (id && !item) { Utils.showToast('Investimento não encontrado.', 'warning'); return; }
        form.elements.id.value = item?.id || '';
        form.elements.mode.value = contribution ? 'contribution' : 'position';
        const picker = form.querySelector('[data-workspace-position-picker]');
        picker.hidden = !pickPosition;
        if (pickPosition) {
            const select = picker.querySelector('select');
            select.replaceChildren(...(db.investimentos || []).map(position => new Option(position.nome || 'Investimento', String(position.id))));
            select.value = String(id);
        }
        modal.querySelector('#workspace-investment-title').textContent = contribution ? 'Registrar aporte' : item ? 'Editar investimento' : 'Novo investimento';
        const positionFields = form.querySelector('[data-workspace-position-fields]');
        const contributionFields = form.querySelector('[data-workspace-contribution-fields]');
        positionFields.hidden = contribution;
        contributionFields.hidden = !contribution;
        positionFields.querySelectorAll('input,select').forEach(input => { input.disabled = contribution; });
        contributionFields.querySelectorAll('input').forEach(input => { input.disabled = !contribution; input.required = contribution; });
        form.querySelector('[data-workspace-investment-error]').hidden = true;
        if (contribution) {
            form.querySelector('[data-workspace-contribution-name]').textContent = item.nome || 'Investimento';
            form.elements.dataAporte.value = localDate();
            form.elements.dataAporte.max = localDate();
        } else if (item) {
            form.elements.nome.value = item.nome || item.ativo || '';
            form.elements.valorAtual.value = item.valorAtual ?? item.valor ?? 0;
            form.elements.capitalInvestido.value = getInvestmentCapital(item) ?? '';
            form.elements.instituicao.value = item.instituicao || '';
            const classes = form.elements.classe;
            if (item.classe && ![...classes.options].some(option => option.value === item.classe)) classes.add(new Option(item.classe, item.classe));
            classes.value = item.classe || '';
        }
        app.openModal('modal-investimento-workspace');
    };
    const setInvoiceContext = btn => {
        const now = new Date();
        app.viewState.activeCardId = btn.dataset.cardId || app.viewState.workspaceReconciliationCardId || db.cartoes?.[0]?.id;
        app.viewState.invoiceMonth = app.viewState.workspaceReconciliationMonth ?? now.getMonth();
        app.viewState.invoiceYear = app.viewState.workspaceReconciliationYear ?? now.getFullYear();
    };
    document.body.addEventListener('click', event => {
        const btn = event.target.closest?.('[data-action]');
        if (!btn && event.target.closest?.('[data-workspace-dropzone]')) { document.getElementById('workspace-import-file')?.click(); return; }
        if (!btn || btn.disabled) return;
        const action = btn.dataset.action;
        const actions = {
            workspaceNewInvestment: () => openInvestment(),
            workspaceNewContribution: () => {
                const first = db.investimentos?.[0];
                openInvestment(first?.id, Boolean(first), Boolean(first));
            },
            workspaceEditInvestment: () => openInvestment(btn.dataset.id),
            workspaceInvestmentContribution: () => openInvestment(btn.dataset.id, true),
            workspaceRefreshInvestments: () => openInvestment(db.investimentos?.[0]?.id, false, Boolean(db.investimentos?.length)),
            workspacePickImport: () => document.getElementById('workspace-import-file')?.click(),
            workspaceReviewImport: () => { app.openModal('modal-revisao-ofx'); app.renderOFXReviewList(); },
            workspaceOpenInvoice: () => { setInvoiceContext(btn); app.renderInvoiceModal(); app.openModal('modal-fatura-detalhes'); if (btn.dataset.tab) app.switchInvoiceTab(btn.dataset.tab); },
            workspaceCreateInvoiceAdjustment: () => { setInvoiceContext(btn); app.createInvoiceAdjustmentTransaction(btn.dataset.id); }
        };
        if (!actions[action]) return;
        event.preventDefault();
        actions[action]();
    }, options);
    document.body.addEventListener('change', event => {
        const target = event.target;
        if (target.matches('[data-workspace-import-file]')) { handleWorkspaceImportFile(target.files?.[0], app); target.value = ''; }
        else if (target.matches('[data-workspace-import-target]')) { app.viewState.bancoAlvoOFX = target.value; app.viewState.ofxPendente = []; app.scheduleRender(); }
        else if (target.matches('[data-workspace-reconciliation-card]')) { app.viewState.workspaceReconciliationCardId = target.value; app.scheduleRender(); }
        else if (target.matches('[data-workspace-investment-picker]')) openInvestment(target.value, target.closest('form').elements.mode.value === 'contribution', true);
        else if (target.matches('[data-workspace-reconciliation-month]') && /^\d{4}-\d{2}$/.test(target.value)) { const [year, month] = target.value.split('-').map(Number); app.viewState.workspaceReconciliationYear = year; app.viewState.workspaceReconciliationMonth = month - 1; app.scheduleRender(); }
    }, options);
    document.body.addEventListener('submit', event => {
        const form = event.target;
        if (!form.matches('[data-workspace-investment-form]')) return;
        event.preventDefault();
        SubmitGuard.run(form, async () => {
            const button = form.querySelector('[type="submit"]');
            const error = form.querySelector('[data-workspace-investment-error]');
            button.disabled = true;
            button.textContent = 'Salvando…';
            error.hidden = true;
            try {
                await saveInvestmentChange(Object.fromEntries(new FormData(form)));
                app.closeModal(true, 'modal-investimento-workspace');
                app.scheduleRender();
                Utils.showToast('Carteira atualizada.', 'success');
            } catch (cause) { error.textContent = cause.message || 'Não foi possível salvar. Os dados anteriores foram mantidos.'; error.hidden = false; }
            finally { button.disabled = false; button.textContent = 'Salvar'; }
        });
    }, options);
    for (const type of ['dragover', 'dragleave', 'drop']) document.body.addEventListener(type, event => {
        const zone = event.target.closest?.('[data-workspace-dropzone]');
        if (!zone) return;
        event.preventDefault();
        zone.classList.toggle('is-dragging', type === 'dragover');
        if (type === 'drop') handleWorkspaceImportFile(event.dataTransfer?.files?.[0], app);
    }, options);
    document.body.addEventListener('keydown', event => {
        if (event.target.matches('[data-workspace-dropzone]') && ['Enter', ' '].includes(event.key)) { event.preventDefault(); document.getElementById('workspace-import-file')?.click(); }
    }, options);
    const teardown = () => { abort.abort(); registrations.delete(document); };
    registrations.set(document, teardown);
    return teardown;
};
