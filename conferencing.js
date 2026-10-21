import { db, Database, BankConferenceRepo, ReconciliationRepo } from './db.js';
import { Utils } from './utils.js';
import { invoiceModel } from './invoice-model.js';
import { bankBalanceAtDate, getReviewState, reviewLabels } from './conferencing-model.js';
import { transactionFingerprint } from './reconciliation.js';
import { addMoney } from './money-math.js';
import { loadViewContext, saveViewContext } from './view-context.js';
import { CSVImport } from './csv-import.js';
import { referenceCandidates, pendingReferenceRows } from './reference-matching.js';

const esc = value => Utils.escapeHTML(String(value ?? ''));
const today = () => Utils.localISODate();
const money = value => value == null ? 'Indisponível' : Utils.formatMoney(value);
const contextFor = (database, state) => {
    const period = state.reviewPeriod || today().slice(0, 7);
    const [year, month] = period.split('-').map(Number);
    const selection = state.reviewEntity || (database.bancos[0] ? `bank:${database.bancos[0].id}` : `card:${database.cartoes[0]?.id || ''}`);
    const split = selection.indexOf(':');
    const type = selection.slice(0, split), id = selection.slice(split + 1);
    const entity = (type === 'bank' ? database.bancos : database.cartoes).find(item => String(item.id) === id);
    if (!entity) return { selection, period, type, year, month };
    if (type === 'card') {
        const model = invoiceModel(database, entity, year, month - 1);
        return { selection, period, type, entity, year, month, record: model.record, items: model.items, registered: model.explainedTotal, reference: model.realInvoiceAmount, difference: model.difference, confirmed: model.status === 'conciliada' };
    }
    const record = database.conferencias?.find(r => r.id === `bank:${id}:${period}`);
    const lastDay = `${period}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
    const asOf = record?.asOf || (lastDay > today() ? today() : lastDay);
    const registered = bankBalanceAtDate(database, entity, asOf, today());
    const items = database.transacoes.filter(t => !t.isCartao && String(t.bancoId) === id && t.data?.startsWith(period) && t.data <= asOf);
    const reference = record?.reference ?? null;
    return { selection, period, type, entity, year, month, record, items, asOf, registered, reference,
        difference: reference === null || registered === null ? null : addMoney(reference, -registered), confirmed: Boolean(record?.confirmedAt) };
};

export const renderConferencing = (database, state = {}) => {
    database = { bancos: [], cartoes: [], transacoes: [], ...database };
    const view = contextFor(database, state);
    const { entity, record, items = [], type } = view;
    const decisions = type === 'card' ? record?.verificacoes : record?.decisions;
    const handled = tx => decisions?.[String(tx.id)]?.fingerprint === transactionFingerprint(tx) && (type === 'card' || ['conferido', 'ignorado'].includes(decisions[String(tx.id)].status));
    const pending = items.filter(t => !handled(t)).length;
    const ignored = items.filter(t => decisions?.[String(t.id)]?.status === 'ignorado').length;
    const unmatched = pendingReferenceRows(record, decisions);
    const options = [...database.bancos.map(b => [`bank:${b.id}`, `Conta · ${b.nome}`]), ...database.cartoes.map(c => [`card:${c.id}`, `Cartão · ${c.nome}`])];
    const rows = items.map(tx => {
        const checked = handled(tx);
        const state = getReviewState(database, tx);
        const candidates = referenceCandidates(tx, record?.referenceRows);
        const picker = record?.referenceRows?.length ? `<label>Linha da referência para vincular<select data-reference-for="${esc(tx.id)}"><option value="">Selecione após comparar</option>${record.referenceRows.map(row => `<option value="${esc(row.id)}" ${decisions?.[String(tx.id)]?.referenceId === row.id ? 'selected' : ''}>${esc(row.data)} · ${esc(row.desc)} · ${money(row.valor)}${candidates.some(c => c.referenceId === row.id) ? ' · possível correspondência' : ''}</option>`).join('')}</select></label>${candidates.map(c => `<small>Possível correspondência: ${esc(c.reason)}. Confirme somente após consultar a referência.</small>`).join('')}` : '';
        return `<article class="av-review-row"><div><strong>${esc(tx.desc)}</strong><small>${esc(Utils.formatToBR(tx.data))} · ${esc(tx.categoria || 'Sem categoria')} · ${esc(tx.codigoRef || tx.id)}</small><span>${esc(reviewLabels[state])}</span>${decisions?.[String(tx.id)]?.reason ? `<small>Justificativa: ${esc(decisions[String(tx.id)].reason)}</small>` : ''}${picker}</div><strong>${money(tx.valor)}</strong><div class="av-review-actions"><button type="button" data-review-check="${esc(tx.id)}" aria-pressed="${checked}" class="nv-workspace-button">${checked ? 'Reabrir' : record?.referenceRows?.length ? 'Confirmar vínculo' : 'Conferir'}</button><button type="button" data-action="openEditModal" data-id="${esc(tx.id)}" class="nv-workspace-button">Revisar lançamento</button>${type === 'bank' ? `<button type="button" data-review-ignore="${esc(tx.id)}" class="nv-workspace-button">Ignorar com motivo</button><button type="button" data-review-difference="${esc(tx.id)}" class="nv-workspace-button">Marcar divergência</button>` : ''}</div></article>`;
    }).join('');
    const legacyAdjustment = type === 'card' && database.transacoes.some(t => !t.isCartao && t.invoiceReconciliationKey === record?.chave && t.reconciliationAdjustmentId);
    return `<div class="nv-workspace av-conferencing"><header class="nv-workspace-heading"><div><p class="nv-workspace-eyebrow">Registrar · Conferir · Compreender</p><h1>Conciliação financeira</h1><p>Compare seus registros com uma referência. A conferência é manual; não há conexão com sua instituição.</p></div></header>
        <section class="nv-workspace-panel">${type === 'card' ? '<p>Cartões: período do ciclo de fechamento. O vencimento pode ocorrer no mês seguinte.</p>' : ''}<div class="nv-workspace-filters"><label>Conta ou cartão<select data-review-entity>${options.map(([value,label]) => `<option value="${esc(value)}" ${value === view.selection ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label><label>Período<input type="month" value="${esc(view.period)}" data-review-period></label></div></section>
        ${!entity ? '<section class="nv-workspace-panel"><p>Adicione uma conta para começar a conferir.</p><button type="button" data-action="openModal" data-modal="modal-banco" class="nv-workspace-button is-primary">Adicionar conta</button></section>' : `
        <section class="nv-workspace-panel"><h2>1. Informe a referência</h2><p>Use seu extrato ou fatura. Informar um valor não confirma os lançamentos.</p><form data-review-reference class="av-reference-form"><label>${type === 'bank' ? 'Saldo informado pela instituição (R$)' : 'Total da fatura informado por você (R$)'}<input name="reference" type="number" inputmode="decimal" step="0.01" required ${type === 'card' ? 'min="0"' : ''} value="${view.reference == null ? '' : esc(view.reference)}"></label>${type === 'bank' ? `<label>Data do saldo de referência<input name="asOf" type="date" max="${today()}" required value="${esc(view.asOf)}"></label>` : ''}<label>Origem da referência<input name="source" required maxlength="120" placeholder="Ex.: extrato consultado no aplicativo do banco" value="${esc(record?.source || '')}"></label><button type="submit" class="nv-workspace-button is-primary">Salvar referência</button></form>${record ? `<p class="av-review-note">Origem informada por você: ${esc(record.source || 'Fatura informada manualmente')} · ${esc(record.asOf || view.period)}. Salva neste navegador.</p>` : ''}</section>
        <section class="nv-workspace-metrics"><div><span>Registrado ${type === 'bank' ? 'na data' : 'na fatura'}</span><strong>${money(view.registered)}</strong></div><div><span>Referência informada</span><strong>${view.reference == null ? 'Não informada' : money(view.reference)}</strong></div><div><span>Diferença: referência − registrado</span><strong>${view.difference == null ? 'Sem base para comparar' : money(view.difference)}</strong></div><div><span>Itens pendentes de conferência</span><strong>${pending} de ${items.length}</strong></div></section>
        ${legacyAdjustment ? '<p role="alert" class="nv-workspace-note">Esta fatura contém ajustes antigos que também movimentaram uma conta. Revise esses lançamentos antes de concluir; nenhum valor histórico foi alterado automaticamente.</p>' : ''}
        ${view.registered == null ? '<p role="status">Não há base suficiente para reconstruir este saldo histórico. Confira a data atual ou revise a referência de saldo inicial e do extrato.</p>' : ''}
        <section class="nv-workspace-panel"><h2>2. Confira os lançamentos</h2><p>Compare descrição, direção, data e valor com a referência. Valores iguais, sozinhos, não comprovam correspondência.</p>${record ? '<label>Anexar OFX ou CSV à conferência (opcional)<input type="file" data-review-file accept=".ofx,.csv"></label><p class="av-review-note">As linhas serão lidas e guardadas neste navegador para comparar e retomar depois. Nenhuma movimentação será criada automaticamente. Um novo arquivo substitui as correspondências anteriores desta conferência.</p>' : ''}${rows || '<p>Nenhum lançamento no período. Confirme essa ausência na referência antes de concluir.</p>'}${type === 'card' ? `<button type="button" class="nv-workspace-button" data-review-invoice>Abrir fatura e revisar ajustes</button>` : ''}<button type="button" class="nv-workspace-button" data-review-missing>Registrar movimentação ausente</button>${unmatched.length ? `<h3>Linhas da referência ainda sem correspondência (${unmatched.length})</h3>${unmatched.map(row => `<article class="av-review-row"><div><strong>${esc(row.desc)}</strong><small>${esc(row.data)} · ${esc(row.tipo)} · ${money(row.valor)}</small></div><button type="button" class="nv-workspace-button" data-ignore-reference="${esc(row.id)}">Ignorar com justificativa</button></article>`).join('')}` : ''}</section>
        <section class="nv-workspace-panel"><h2>3. Conclua a conferência</h2><p>${view.confirmed ? `Conferência concluída em ${esc(new Date(record.confirmedAt).toLocaleString('pt-BR'))}.` : pending ? `Confira os ${pending} itens pendentes. Seu progresso confirmado fica salvo.` : 'Todos os itens foram revisados. Verifique a diferença e confirme a conclusão.'} ${ignored ? `${ignored} item(ns) ignorado(s), com justificativa preservada.` : ''}</p>${!items.length ? '<label><input type="checkbox" data-review-empty> Confirmei que a referência não contém lançamentos neste período.</label>' : ''}<button type="button" data-review-complete class="nv-workspace-button is-primary" ${pending || unmatched.length || view.difference !== 0 || view.confirmed || legacyAdjustment ? 'disabled' : ''}>Concluir conferência</button><p class="av-review-note">Conferência e pagamento são etapas diferentes. Conferir não envia dinheiro nem altera o saldo da conta.</p></section>`}</div>`;
};

export const setupConferencing = app => {
    const saved = loadViewContext('conference.selection', null, v => v && typeof v.entity === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v.period));
    if (saved) { app.viewState.reviewEntity = saved.entity; app.viewState.reviewPeriod = saved.period; }
    const saveContext = () => saveViewContext('conference.selection', { entity: app.viewState.reviewEntity || '', period: app.viewState.reviewPeriod || today().slice(0,7) });
    document.body.addEventListener('change', async event => {
        if (event.target.matches('[data-review-file]')) {
            const file = event.target.files?.[0], v = contextFor(db, app.viewState);
            if (!file) return;
            try {
                if (file.size > 5 * 1024 * 1024) throw new Error('Use um arquivo de até 5 MB.');
                const content = await file.text();
                const rows = /\.ofx$/i.test(file.name) ? Utils.parseOFX(content).transactions : /\.csv$/i.test(file.name) ? CSVImport.parse(content) : null;
                if (rows?.rejectedCount) throw new Error(`${rows.rejectedCount} linha(s) inválidas. Revise o arquivo antes de anexar; a conferência anterior foi preservada.`);
                if (!rows?.length) throw new Error('Nenhum lançamento válido encontrado. Use OFX ou CSV.');
                const imported = await Database.updateConferenceReference({ recordId: v.type === 'bank' ? v.record?.id : null, cardId: v.entity.id, year: v.year, month: v.month - 1, rows, fileName: file.name });
                Utils.showToast(`${imported.attached} linhas anexadas para conferência; ${imported.outsidePeriod} fora do período não foram incluídas. Confirme os vínculos antes de concluir.`, 'success');
                app.scheduleRender();
            } catch (error) { Utils.showToast(error.message, 'error'); }
            finally { event.target.value = ''; }
        }
        if (event.target.matches('[data-review-entity]')) { app.viewState.reviewEntity = event.target.value; saveContext(); }
        if (event.target.matches('[data-review-period]') && /^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) { app.viewState.reviewPeriod = event.target.value; saveContext(); }
    });
    document.body.addEventListener('submit', async event => {
        if (!event.target.matches('[data-review-reference]')) return;
        event.preventDefault();
        const form = event.target, button = form.querySelector('[type="submit"]');
        if (button.disabled) return;
        button.disabled = true;
        const v = contextFor(db, app.viewState), data = Object.fromEntries(new FormData(form));
        try {
            if (v.type === 'bank') await BankConferenceRepo.save({ bankId: v.entity.id, period: v.period, ...data });
            else await ReconciliationRepo.saveAmount(v.entity.id, v.year, v.month - 1, data.reference, data.source);
            Utils.showToast('Referência salva. Confira os lançamentos antes de concluir.', 'success');
            app.scheduleRender();
        } catch (error) { Utils.showToast(error.message, 'error'); }
        finally { button.disabled = false; }
    });
    document.body.addEventListener('click', async event => {
        const button = event.target.closest('[data-review-check],[data-review-ignore],[data-review-difference],[data-review-complete],[data-review-invoice],[data-ignore-reference],[data-review-missing]');
        if (!button || button.disabled) return;
        const v = contextFor(db, app.viewState);
        if (!v.entity) return;
        if (button.hasAttribute('data-review-invoice')) { app.viewState.activeCardId = v.entity.id; app.viewState.invoiceYear = v.year; app.viewState.invoiceMonth = v.month - 1; app.renderInvoiceModal(); app.openModal('modal-fatura-detalhes'); return; }
        if (button.hasAttribute('data-review-missing')) {
            app.openModal(v.type === 'card' ? 'modal-despesa-cartao' : 'modal-transacao', 'despesa');
            const field = document.getElementById(v.type === 'card' ? 'dc-cartao-id' : 'input-banco-trans');
            if (field) field.value = String(v.entity.id);
            return;
        }
        button.disabled = true;
        try {
            if (button.hasAttribute('data-ignore-reference')) {
                const reason = prompt('Por que esta linha da referência será ignorada?');
                if (reason === null) return;
                await Database.updateConferenceReference({ recordId: v.type === 'bank' ? v.record?.id : null, cardId: v.entity.id, year: v.year, month: v.month - 1, ignoreId: button.dataset.ignoreReference, reason });
            } else if (button.hasAttribute('data-review-complete')) {
                const empty = Boolean(document.querySelector('[data-review-empty]')?.checked);
                if (v.type === 'bank') await BankConferenceRepo.complete(v.record.id, empty);
                else await ReconciliationRepo.confirm(v.entity.id, v.year, v.month - 1, empty);
                Utils.showToast('Conferência concluída com a referência informada por você.', 'success');
            } else {
                const id = button.dataset.reviewCheck || button.dataset.reviewIgnore || button.dataset.reviewDifference;
                const referenceId = [...document.querySelectorAll('[data-reference-for]')].find(e => e.dataset.referenceFor === id)?.value;
                if (v.type === 'card') await ReconciliationRepo.checkItem(v.entity.id, v.year, v.month - 1, id, button.getAttribute('aria-pressed') !== 'true', referenceId);
                else {
                    const status = button.dataset.reviewIgnore ? 'ignorado' : button.dataset.reviewDifference ? 'divergente' : button.getAttribute('aria-pressed') === 'true' ? 'nao-conferido' : 'conferido';
                    const reason = status === 'ignorado' ? prompt('Por que este lançamento será ignorado nesta conferência?') : '';
                    if (reason === null) return;
                    await BankConferenceRepo.decide({ id: v.record?.id, transactionId: id, status, reason, referenceId });
                }
            }
            app.scheduleRender();
        } catch (error) { Utils.showToast(error.message, 'error'); }
        finally { button.disabled = false; }
    });
};
