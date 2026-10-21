/* ============================================================
   Página de Transações (Lançamentos) v4 — Fase 4
   Reutiliza TransactionsRepo + predicados de financial-ledger.
   Conecta com a barra de filtros da Fase 2 (evento 'filtros:change').
   Uso:  import { renderTransacoesV4 } from './transacoes-v4.js';
         renderTransacoesV4(container, { db });
   ============================================================ */
import { isIncome, isExpense, isTransfer, isInvoicePayment } from './financial-ledger.js';
import { toCents } from './money-math.js';

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const formatBRL = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0)
  .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-');
  return d && m ? `${d}/${m}` : iso;
};

/* status derivado (o app não tem campo status unificado — derivamos) */
const statusOf = (t) => {
  if (isTransfer(t)) return 'Transferência';
  if (isInvoicePayment(t)) return 'Pagamento de fatura';
  if (t.vencimento && new Date(t.vencimento) > new Date()) return 'Pendente';
  return 'Conciliado';
};
const badgeTone = (s) => s === 'Conciliado' ? 'success' : s === 'Pendente' ? 'warning' : 'info';
const tipoBadge = (t) => isIncome(t) ? 'success' : isTransfer(t) ? 'info' : 'neutral';

/* estado de filtro (inicia com tudo) */
const state = { tab: 'Todas', busca: '', periodo: 'mes-atual', ordenacao: 'data-desc', selecionados: new Set() };

const noPeriodo = (t, periodo, ref = new Date()) => {
  if (periodo === 'todos') return true;
  const [y, m] = String(t.data || '').split('-').map(Number);
  if (!y || !m) return false;
  const agora = { y: ref.getFullYear(), m: ref.getMonth() + 1 };
  if (periodo === 'mes-atual') return y === agora.y && m === agora.m;
  if (periodo === 'mes-anterior') { const pm = agora.m === 1 ? 12 : agora.m - 1, py = agora.m === 1 ? agora.y - 1 : agora.y; return y === py && m === pm; }
  if (periodo === 'ultimos-30') { const d = new Date(t.data); return d >= new Date(ref.getTime() - 30 * 864e5); }
  if (periodo === 'ano-atual') return y === agora.y;
  return true;
};

const filtrar = (txs) => {
  let rows = txs.filter(t => noPeriodo(t, state.periodo));
  if (state.tab === 'Despesa') rows = rows.filter(isExpense);
  else if (state.tab === 'Receita') rows = rows.filter(isIncome);
  else if (state.tab === 'Pendente') rows = rows.filter(t => statusOf(t) === 'Pendente');
  const q = state.busca.trim().toLowerCase();
  if (q) rows = rows.filter(t => `${t.desc || ''} ${t.categoria || ''} ${t.bancoId || ''}`.toLowerCase().includes(q));
  const by = {
    'data-desc': (a, b) => String(b.data || '').localeCompare(String(a.data || '')),
    'data-asc':  (a, b) => String(a.data || '').localeCompare(String(b.data || '')),
    'valor-desc': (a, b) => toCents(b.valor) - toCents(a.valor),
    'valor-asc':  (a, b) => toCents(a.valor) - toCents(b.valor),
  }[state.ordenacao];
  return rows.sort(by);
};

const contaNome = (db, id) => {
  const c = (db.bancos || []).find(x => String(x.id) === String(id)) || (db.cartoes || []).find(x => String(x.id) === String(id));
  return c?.nome || (id ? 'Conta' : '—');
};

const linhaMobile = (t, db) => {
  const pos = isIncome(t);
  const st = statusOf(t);
  return `<div class="tx-row list-row" data-tx-id="${escapeHtml(t.id)}">
    <input type="checkbox" class="tx-check" data-id="${escapeHtml(t.id)}" ${state.selecionados.has(String(t.id)) ? 'checked' : ''} aria-label="Selecionar">
    <span class="category-icon ${tipoBadge(t)}"></span>
    <div class="list-copy">
      <strong>${escapeHtml(t.desc || t.categoria || 'Sem descrição')}</strong>
      <small>${fmtData(t.data)} · ${escapeHtml(t.categoria || '')} · ${escapeHtml(contaNome(db, t.bancoId))}</small>
      <span class="badge ${badgeTone(st)}">${st}</span>
    </div>
    <span class="amount font-num ${pos ? 'text-positive' : 'text-negative'}">${pos ? '+' : '−'}${formatBRL(Math.abs(Number(t.valor) || 0))}</span>
  </div>`;
};

const linhaDesktop = (t, db) => {
  const pos = isIncome(t);
  const st = statusOf(t);
  return `<tr class="tx-row" data-tx-id="${escapeHtml(t.id)}">
    <td><input type="checkbox" class="tx-check" data-id="${escapeHtml(t.id)}" ${state.selecionados.has(String(t.id)) ? 'checked' : ''} aria-label="Selecionar"></td>
    <td><strong>${escapeHtml(t.desc || t.categoria || 'Sem descrição')}</strong></td>
    <td><span class="badge ${tipoBadge(t)}">${escapeHtml(t.categoria || '—')}</span></td>
    <td class="muted text-sm">${escapeHtml(contaNome(db, t.bancoId))}</td>
    <td class="font-num text-sm text-muted">${fmtData(t.data)}</td>
    <td><span class="badge ${badgeTone(st)}">${st}</span></td>
    <td class="amount font-num text-right ${pos ? 'text-positive' : 'text-negative'}">${pos ? '+' : '−'}${formatBRL(Math.abs(Number(t.valor) || 0))}</td>
  </tr>`;
};

export const renderTransacoesV4 = (container, opts = {}) => {
  const db = opts.db || window.db || {};
  const txs = db.transacoes || [];
  const rows = filtrar(txs);

  const total = txs.length;
  const selecionados = state.selecionados.size;

  container.innerHTML = `
    <div class="dash-head">
      <div>
        <p class="eyebrow">LANÇAMENTOS</p>
        <h1 class="font-display text-2xl md:text-3xl font-semibold">Transações</h1>
        <p class="muted text-sm mt-1">${total} lançamentos registrados neste dispositivo.</p>
      </div>
      <button class="btn-primary" data-action="new-transaction">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
        Nova transação
      </button>
    </div>

    <!-- Barra de filtros da Fase 2 (injeta separadamente) -->
    <div id="filtros-slot"></div>

    <!-- Barra de ações em lote (aparece ao selecionar) -->
    <div id="bulk-bar" class="card mb-4 px-4 py-3 items-center gap-3 ${selecionados ? 'flex' : 'hidden'}">
      <span class="text-sm font-semibold">${selecionados} selecionado(s)</span>
      <div class="flex-1"></div>
      <button class="btn-outline !py-1.5 text-sm" data-action="batch-category">Mover categoria</button>
      <button class="btn-danger !py-1.5 text-sm" data-action="batch-delete">Excluir</button>
      <button class="btn-ghost !py-1.5 text-sm" data-action="clear-selection">Limpar</button>
    </div>

    ${rows.length === 0 ? `
      <div class="card empty-state">
        <div class="empty-icon"></div>
        <h3 class="font-display text-lg font-semibold">Nenhum lançamento encontrado</h3>
        <p class="muted text-sm mt-1">Ajuste a busca ou os filtros, ou adicione sua primeira transação.</p>
        <button class="btn-primary mt-4" data-action="new-transaction">＋ Adicionar lançamento</button>
      </div>` : `
      <!-- Tabela desktop -->
      <div class="card overflow-hidden hidden md:block">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr>
              <th class="w-8"><input type="checkbox" id="tx-check-all" aria-label="Selecionar todas"></th>
              <th>Descrição</th><th>Categoria</th><th>Conta</th><th>Data</th><th>Status</th><th class="text-right">Valor</th>
            </tr></thead>
            <tbody>${rows.slice(0, 100).map(t => linhaDesktop(t, db)).join('')}</tbody>
          </table>
        </div>
        <div class="table-footer">Mostrando ${Math.min(rows.length, 100)} de ${rows.length} lançamentos${rows.length > 100 ? ' — os 100 mais recentes' : ''}</div>
      </div>

      <!-- Lista mobile -->
      <div class="md:hidden space-y-1">${rows.slice(0, 50).map(t => linhaMobile(t, db)).join('')}</div>
      ${rows.length > 50 ? '<p class="text-center text-xs muted mt-3">Mostrando os 50 mais recentes — refine a busca.</p>' : ''}
    `}
  `;

  /* ---------- eventos locais ---------- */
  container.querySelectorAll('.tx-check').forEach(cb => cb.addEventListener('change', () => {
    const id = cb.dataset.id;
    if (cb.checked) state.selecionados.add(id); else state.selecionados.delete(id);
    renderTransacoesV4(container, opts); // re-render para atualizar bulk-bar
  }));
  const all = container.querySelector('#tx-check-all');
  all?.addEventListener('change', () => {
    rows.slice(0, 100).forEach(t => all.checked ? state.selecionados.add(String(t.id)) : state.selecionados.delete(String(t.id)));
    renderTransacoesV4(container, opts);
  });
  container.querySelectorAll('[data-action="clear-selection"]').forEach(b => b.addEventListener('click', () => {
    state.selecionados.clear(); renderTransacoesV4(container, opts);
  }));
  // linha clicável → editar (emite evento; o app conecta ao modal de edição)
  container.querySelectorAll('.tx-row').forEach(row => row.addEventListener('click', (e) => {
    if (e.target.closest('.tx-check')) return;
    document.dispatchEvent(new CustomEvent('transacao:edit', { detail: { id: row.dataset.txId, selecionados: [...state.selecionados] } }));
  }));
  // ações em lote → conectam com TransactionsRepo.updateCategories / deleteMultiple
  container.querySelector('[data-action="batch-delete"]')?.addEventListener('click', () => {
    if (!state.selecionados.size) return;
    document.dispatchEvent(new CustomEvent('transacoes:delete-many', { detail: { ids: [...state.selecionados] } }));
    state.selecionados.clear(); renderTransacoesV4(container, opts);
  });
  container.querySelector('[data-action="batch-category"]')?.addEventListener('click', () =>
    document.dispatchEvent(new CustomEvent('transacoes:batch-category', { detail: { ids: [...state.selecionados] } })));
};

/* ---------- integra com a barra de filtros da Fase 2 ---------- */
if (typeof document !== 'undefined') {
  document.addEventListener('filtros:change', (e) => {
    Object.assign(state, e.detail || {});
    const c = document.getElementById('view') || document.querySelector('[data-view="Transacoes"]');
    if (c && window.__renderTransacoesV4) window.__renderTransacoesV4(c);
  });
  window.__renderTransacoesV4 = (c) => renderTransacoesV4(c, { db: window.db });
}
