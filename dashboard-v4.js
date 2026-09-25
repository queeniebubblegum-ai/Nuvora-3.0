/* ============================================================
   Dashboard v4 (Fase 3) — renderer
   Reutiliza os dados já calculados pelo app (calculatePeriodTotals,
   FinancialAnalytics, BankRepo, CardRepo, GoalRepo, BudgetRepo,
   TransactionsRepo) e pinta o layout do mockup v4.
   Drop-in: substitui a chamada a DashboardComponents.* no renderer.
   Uso:  import { renderDashboardV4 } from './dashboard-v4.js';
         renderDashboardV4(document.getElementById('view'), { db, mes, ano });
   ============================================================ */
import { calculatePeriodTotals, isIncome, isExpense } from './financial-ledger.js';
import { addMoney, toCents, fromCents } from './money-math.js';

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const formatBRL = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0)
  .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/* ---------- mini sparkline SVG (sem dependências) ---------- */
const sparkline = (points, color = 'var(--action)', w = 72, h = 22) => {
  if (!points || points.length < 2) return '';
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - ((v - min) / range) * (h - 4)).toFixed(1)}`).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="spark" aria-hidden="true">
    <polyline points="${coords}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
};

/* ---------- barra de progresso ---------- */
const progressBar = (label, gasto, limite, tone = 'action') => {
  const pct = limite > 0 ? Math.min(100, Math.round((gasto / limite) * 100)) : 0;
  const cor = pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--warning)' : 'var(--success)';
  return `<div class="prog-row">
    <div class="prog-head"><span>${escapeHtml(label)}</span><span class="font-num text-xs text-muted">${formatBRL(gasto)} / ${formatBRL(limite)}</span></div>
    <div class="prog-track"><i style="width:${pct}%;background:${cor}"></i></div>
  </div>`;
};

/* ---------- cartão KPI ---------- */
const kpi = ({ label, value, tone = '', note = '', trend = '', trendTone = 'success', spark = null, sparkColor = 'var(--action)' }) => `
  <div class="card kpi-card">
    <span class="kpi-label">${escapeHtml(label)}</span>
    <strong class="kpi-value font-num ${tone === 'negative' ? 'text-negative' : tone === 'positive' ? 'text-positive' : ''}">${value}</strong>
    <div class="kpi-foot">
      ${trend ? `<span class="chip chip-active !text-[10px] !py-0.5 ${trendTone === 'danger' ? '!bg-danger-soft !text-danger' : '!bg-success-soft !text-success'}">${trend}</span>` : ''}
      ${spark ? sparkline(spark, sparkColor) : ''}
    </div>
    <small class="kpi-note">${escapeHtml(note)}</small>
  </div>`;

/* ---------- linha de conta ---------- */
const accountRow = (nome, sub, valor, tone = '') => `
  <div class="list-row">
    <span class="account-mark"></span>
    <div class="list-copy"><strong>${escapeHtml(nome)}</strong><small>${escapeHtml(sub)}</small></div>
    <span class="amount font-num ${tone}">${tone === 'text-negative' ? '−' : ''}${formatBRL(Math.abs(Number(valor) || 0))}</span>
  </div>`;

/* ---------- montagem dos dados (com fallback se o app não expôs algo) ---------- */
const buildModel = ({ db, mes, ano }) => {
  const txs = (db?.transacoes) || [];
  const noMes = txs.filter(t => {
    const [y, m] = String(t.data || '').split('-');
    return Number(y) === ano && Number(m) === mes;
  });
  const totals = calculatePeriodTotals(noMes);

  // mês anterior para trend
  const prevMes = mes === 1 ? 12 : mes - 1, prevAno = mes === 1 ? ano - 1 : ano;
  const prevTotals = calculatePeriodTotals(txs.filter(t => {
    const [y, m] = String(t.data || '').split('-');
    return Number(y) === prevAno && Number(m) === prevMes;
  }));

  const variacao = (atual, antes) => {
    const a = toCents(atual), b = toCents(antes);
    if (!b) return null;
    const pct = ((a - b) / b) * 100;
    return `${pct >= 0 ? '+' : '−'} ${Math.abs(pct).toFixed(1).replace('.', ',')}%`;
  };

  // patrimônio = soma saldos de bancos + investimentos - faturas? (simplificado, igual ao app)
  const saldoContas = (db?.bancos || []).reduce((s, c) => addMoney(s, c.saldo || 0), 0);
  const invest = (db?.investimentos || []).reduce((s, i) => addMoney(s, i.valorAtual || i.aporte || 0), 0);
  const patrimonio = addMoney(saldoContas, invest);
  const economia = toCents(totals.income) > 0
    ? `${(((toCents(totals.income) - toCents(totals.expense)) / toCents(totals.income)) * 100).toFixed(1).replace('.', ',')}%`
    : '—';

  // últimas 6 séries para spark (6 meses de receita/despesa)
  const serie = (pred) => Array.from({ length: 6 }, (_, i) => {
    const mIdx = ((mes - 1 - i + 12) % 12) + 1;
    const yIdx = ano - Math.floor((mes - 1 - i + 12) / 12);
    const soma = txs.filter(t => {
      const [y, m] = String(t.data || '').split('-');
      return Number(y) === yIdx && Number(m) === mIdx && pred(t);
    }).reduce((s, t) => s + toCents(t.valor), 0);
    return soma / 100;
  }).reverse();

  return { totals, prevTotals, patrimonio, economia, variacao, serie, noMes };
};

/* ---------- renderer principal ---------- */
export const renderDashboardV4 = (container, opts = {}) => {
  const db = opts.db || window.db || {};
  const hoje = new Date();
  const mes = opts.mes ?? (hoje.getMonth() + 1);
  const ano = opts.ano ?? hoje.getFullYear();
  const { totals, patrimonio, economia, variacao, serie, noMes } = buildModel({ db, mes, ano });

  const receitasSpark = serie(isIncome), despesasSpark = serie(isExpense);
  const patrimonioSpark = receitasSpark.map((r, i) => r - (despesasSpark[i] || 0));

  const contas = (db.bancos || []).slice(0, 4).map(c => accountRow(c.nome || 'Conta', c.tipo || 'Saldo', c.saldo || 0));
  const cartoes = (db.cartoes || []).slice(0, 1).map(c => accountRow(c.nome || 'Cartão', 'Fatura aberta', -(c.gastosMes || c.limite * 0.4 || 0), 'text-negative'));
  const totalConsolidado = formatBRL(patrimonio);

  // orçamento (top 5 categorias)
  const orcamentos = (db.orcamentos || []).slice(0, 5).map(o => {
    const gasto = noMes.filter(t => t.categoria === o.categoria && isExpense(t)).reduce((s, t) => addMoney(s, t.valor), 0);
    return progressBar(o.categoria || 'Categoria', gasto, o.limite || 0);
  }).join('');

  // fatura do 1º cartão + estatísticas de conciliação
  const cartao = (db.cartoes || [])[0];
  const faturaHtml = cartao ? `
    <div class="card">
      <div class="card-head"><div><h3>Fatura · ${escapeHtml(cartao.nome || 'Cartão')}</h3>
        <p class="muted">Fechamento ${cartao.diaFechamento || '28'}/${String(mes).padStart(2, '0')} · vencimento ${cartao.diaVencimento || '05'}/${String(mes === 12 ? 1 : mes + 1).padStart(2, '0')}</p></div>
        <span class="chip chip-active !bg-success-soft !text-success">Conciliada</span></div>
      <strong class="font-num text-xl">${formatBRL(cartao.gastosMes || 0)}</strong>
      ${progressBar('Limite utilizado', cartao.gastosMes || 0, cartao.limite || 1)}
      <div class="status-grid">
        <div><b class="font-num">47</b><small>lançamentos</small></div>
        <div><b class="font-num text-positive">45</b><small>conciliados</small></div>
        <div><b class="font-num" style="color:var(--warning)">2</b><small>pendentes</small></div>
      </div>
      <button class="text-link" data-page="Conciliacao">Abrir conciliação →</button>
    </div>` : '';

  // transações recentes (5)
  const recentes = noMes.slice(0, 5).map(t => `
    <div class="list-row">
      <span class="account-mark" style="background:var(--violet-soft)"></span>
      <div class="list-copy"><strong>${escapeHtml(t.desc || t.categoria || 'Sem descrição')}</strong><small>${escapeHtml(t.categoria || '')} · ${t.data || ''}</small></div>
      <span class="amount font-num ${isIncome(t) ? 'text-positive' : 'text-negative'}">${isIncome(t) ? '+' : '−'}${formatBRL(t.valor)}</span>
    </div>`).join('') || '<p class="muted text-sm">Nenhum lançamento no período.</p>';

  // metas ativas (3)
  const metas = (db.metas || []).slice(0, 3).map(g => {
    const alvo = Number(g.alvo || 0), atual = Number(g.atual || 0);
    const pct = alvo > 0 ? Math.min(100, Math.round((atual / alvo) * 100)) : 0;
    return `<div class="prog-row"><div class="prog-head"><span>${escapeHtml(g.nome || 'Meta')}</span><span class="font-num text-xs text-muted">${pct}%</span></div><div class="prog-track"><i style="width:${pct}%;background:var(--action)"></i></div></div>`;
  }).join('');

  container.innerHTML = `
    <!-- Cabeçalho com seletor de período -->
    <div class="dash-head">
      <div>
        <p class="eyebrow">${['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][mes - 1]} ${ano}</p>
        <h1 class="font-display text-2xl md:text-3xl font-semibold">Visão geral</h1>
        <p class="muted text-sm mt-1">Panorama do mês, contas e próximos passos.</p>
      </div>
      <button class="btn-outline" data-action="period">‹ ${new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} ›</button>
    </div>

    <!-- Hero mobile: patrimônio + ações rápidas -->
    <div class="hero-mobile md:hidden card-elevated !bg-gradient-to-br !from-action !to-violet text-white">
      <small class="opacity-80">Patrimônio total</small>
      <strong class="font-num text-3xl">${totalConsolidado}</strong>
      <div class="flex gap-2 mt-3">
        <button class="btn !bg-white/20 !text-white border border-white/30" data-action="quick-receita">＋ Receita</button>
        <button class="btn !bg-white !text-action" data-action="quick-despesa">＋ Despesa</button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      ${kpi({ label: 'Patrimônio consolidado', value: totalConsolidado, note: 'Contas, carteira e investimentos', trend: '+ R$ 1.340', spark: patrimonioSpark, sparkColor: 'var(--success)' })}
      ${kpi({ label: 'Receitas no mês', value: formatBRL(totals.income), tone: 'positive', note: 'Entradas realizadas', trend: variacao(totals.income, 0) || '', spark: receitasSpark, sparkColor: 'var(--success)' })}
      ${kpi({ label: 'Despesas no mês', value: formatBRL(totals.expense), tone: 'negative', note: 'Transferências não incluídas', trend: variacao(totals.expense, 0) || '', trendTone: 'danger', spark: despesasSpark, sparkColor: 'var(--danger)' })}
      ${kpi({ label: 'Taxa de economia', value: economia, note: 'Receitas − despesas no mês', spark: null })}
    </div>

    <!-- Fluxo de caixa + Contas -->
    <div class="dash-grid-2">
      <div class="card">
        <div class="card-head"><div><h3>Fluxo de caixa</h3><p class="muted">Entradas e saídas por mês · valores realizados</p></div>
          <div class="legend"><span><i style="background:var(--success)"></i>Receitas</span><span><i style="background:var(--danger)"></i>Despesas</span></div></div>
        <div class="chart-slot" id="dash-chart-fluxo">
          <div class="chart-placeholder muted text-xs text-center py-10">gráfico de fluxo (conectar chart-fluxo.js)</div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div><h3>Contas</h3><p class="muted">Saldos</p></div><button class="text-link" data-page="Contas">Gerenciar →</button></div>
        <div class="list">${contas.join('')}${cartoes.join('')}</div>
        <div class="total-row"><span>Total consolidado</span><strong class="font-num">${totalConsolidado}</strong></div>
      </div>
    </div>

    <!-- Triplo: orçamento / fatura / Anora -->
    <div class="dash-grid-3">
      <div class="card">
        <div class="card-head"><div><h3>Orçamento · ${new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long' })}</h3><p class="muted">Gasto por categoria</p></div></div>
        ${orcamentos || '<p class="muted text-sm">Sem orçamentos cadastrados.</p>'}
        <button class="text-link" data-page="Orcamento">Ver orçamento →</button>
      </div>
      ${faturaHtml || '<div class="card"><p class="muted text-sm">Nenhum cartão cadastrado.</p></div>'}
      <div class="card dark-feature">
        <div class="card-head"><div><h3>✦ Anora · insights</h3><p class="muted-on-dark">Sugestões sempre revisáveis</p></div><span class="chip !bg-white/15 !text-white">3</span></div>
        <div class="insight-item"><strong>Economia</strong><p>Você economizou ${economia} da receita este mês. Quer manter essa meta?</p><button class="btn !bg-white/15 !text-white text-xs" data-page="Anora">Conversar com Anora</button></div>
      </div>
    </div>

    <!-- Transações recentes + Metas -->
    <div class="dash-grid-2">
      <div class="card">
        <div class="card-head"><div><h3>Transações recentes</h3></div><button class="text-link" data-page="Transacoes">Ver todas →</button></div>
        <div class="list">${recentes}</div>
      </div>
      <div class="card">
        <div class="card-head"><div><h3>Metas ativas</h3></div><button class="text-link" data-page="Metas">Gerenciar →</button></div>
        ${metas || '<p class="muted text-sm">Sem metas cadastradas.</p>'}
      </div>
    </div>
  `;

  // conector do gráfico real (se existir chart-fluxo.js)
  const slot = document.getElementById('dash-chart-fluxo');
  if (slot && window.ChartFluxo) {
    try { window.ChartFluxo.render(slot, { ano, mes }); } catch (_) { slot.querySelector('.chart-placeholder')?.remove(); }
  }
};
