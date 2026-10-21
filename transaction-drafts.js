import { Utils } from './utils.js';

const PREFIX = 'avenera:draft:';
const MAX_AGE = 24 * 60 * 60 * 1000;
const modalIds = ['modal-transacao', 'modal-transferencia', 'modal-despesa-cartao', 'modal-banco', 'modal-cartao'];
export const discardTransactionDraft = formOrId => {
    const id = typeof formOrId === 'string' ? formOrId : formOrId?.closest('[id^="modal-"]')?.id;
    try { if (id) localStorage.removeItem(PREFIX + id); } catch { /* optional recovery storage */ }
    if (typeof formOrId !== 'string' && formOrId?.dataset) delete formOrId.dataset.operationId;
};
const readDraft = id => {
    try {
        const draft = JSON.parse(localStorage.getItem(PREFIX + id) || 'null');
        if (draft && Date.now() - draft.at < MAX_AGE && draft.fields && typeof draft.fields === 'object') return draft;
        localStorage.removeItem(PREFIX + id);
    } catch { /* invalid/expired drafts never prevent boot */ }
    return null;
};
export const transactionOperationId = form => {
    if (!form?.dataset) return globalThis.crypto?.randomUUID?.() || `operation-${Date.now()}-${Math.random()}`;
    if (!form.dataset.operationId) form.dataset.operationId = globalThis.crypto?.randomUUID?.() || `operation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return form.dataset.operationId;
};

export const setupTransactionDrafts = app => {
    let warned = false;
    const save = event => {
        const form = event.target.closest('form');
        const modal = form?.closest('[id^="modal-"]');
        if (!modalIds.includes(modal?.id)) return;
        const fields = Object.fromEntries([...form.querySelectorAll('input[id],select[id],textarea[id]')].map(e => [e.id, e.type === 'checkbox' ? e.checked : e.value]));
        try { localStorage.setItem(PREFIX + modal.id, JSON.stringify({ at: Date.now(), fields, operationId: transactionOperationId(form) })); }
        catch { if (!warned) Utils.showToast('Não foi possível preservar o rascunho neste navegador. Mantenha esta janela aberta até salvar.', 'warning'); warned = true; }
    };
    document.body.addEventListener('input', save);
    document.body.addEventListener('change', save);
    const renderBanner = () => {
        document.getElementById('transaction-draft-banner')?.remove();
        const found = modalIds.find(id => readDraft(id));
        if (!found) return;
        const banner = document.createElement('aside');
        banner.id = 'transaction-draft-banner'; banner.className = 'av-draft-banner';
        banner.innerHTML = '<p>Você tem um cadastro ou lançamento não salvo. O rascunho fica somente neste navegador por até 24 horas e não altera seus saldos.</p><button type="button" data-resume-draft>Retomar</button><button type="button" data-discard-draft>Descartar</button>';
        banner.querySelector('[data-resume-draft]').onclick = () => {
            const draft = readDraft(found);
            if (!draft) return;
            if (found === 'modal-cartao' && draft.fields['cartao-id']) app.editCard(draft.fields['cartao-id']);
            else app.openModal(found);
            const form = document.querySelector(`#${found} form`);
            if (draft.fields['input-tipo']) app.setTransactionType(draft.fields['input-tipo']);
            // Set controlling selectors first, so dependent options exist.
            for (const id of ['input-banco-trans', 'input-forma-pagamento', 'input-categoria-grupo']) {
                const control = document.getElementById(id);
                if (control && draft.fields[id] !== undefined) { control.value = draft.fields[id]; control.dispatchEvent(new Event('change', { bubbles: true })); }
            }
            for (const [id,value] of Object.entries(draft.fields)) {
                const control = document.getElementById(id);
                if (!control || !form.contains(control)) continue;
                if (control.type === 'checkbox') control.checked = value === true; else control.value = value;
            }
            form.dataset.operationId = draft.operationId;
            app.captureModalState?.(found);
            Utils.showToast('Rascunho retomado. Revise os dados antes de salvar.', 'info');
        };
        banner.querySelector('[data-discard-draft]').onclick = () => { discardTransactionDraft(found); renderBanner(); };
        document.getElementById('main-content')?.prepend(banner);
    };
    document.addEventListener('avenera:rendered', renderBanner);
    document.addEventListener('db-updated', renderBanner);
};
