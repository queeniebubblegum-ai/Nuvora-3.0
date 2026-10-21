/* ============================================================
   Modal de lançamento v4 (Fase 2) — controller
   Dependências: nenhuma externa. Se existirem, usa db.bancos /
   db.cartoes / db.contatos para popular selects; senão usa opções demo.
   Integração: dispara CustomEvent 'transacao:submit' com payload no
   formato que TransactionsRepo.add / ctrl-transacoes.js esperam, e
   sincroniza campos escondidos com IDs antigos (edit-*, dc-*).
   ============================================================ */
(function () {
  'use strict';

  /* ---------- parsing BRL robusto (corrige o bug do parseFloat) ----------
     Aceita: "1.234,56" | "1234.56" | "1234,56" | "R$ 1.234,56" | "1234"
     Sempre devolve Number em reais (nunca em centavos). */
  const parseBRL = (raw) => {
    if (raw == null) return NaN;
    let s = String(raw).replace(/[R$\s]/g, '').trim();
    if (!s) return NaN;
    const neg = s.startsWith('-'); if (neg) s = s.slice(1);
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');   // 1.234,56 -> 1234.56
    } else {
      s = s.replace(/,/g, '');                       // 1,234.56 -> 1234.56
    }
    const n = Number(s);
    return Number.isFinite(n) ? (neg ? -n : n) : NaN;
  };

  const formatBRL = (n) => Number.isFinite(n)
    ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ 0,00';

  /* ---------- referências ---------- */
  const $ = (id) => document.getElementById(id);
  const form = $('transaction-form');
  if (!form) return; // modal ainda não injetado

  const amount = $('tx-amount'), amountError = $('tx-amount-error');
  const date = $('tx-date'), desc = $('tx-description');
  const category = $('tx-category'), categoryList = $('tx-category-list');
  const account = $('tx-account'), person = $('tx-person');
  const dueDate = $('tx-due-date'), typeSelect = $('tx-type');
  const freq = $('tx-frequency'), recToggle = $('tx-recurrence-toggle');
  const preview = $('tx-preview'), submitBtn = $('btn-submit-transacao');
  const backdrop = $('modal-backdrop');

  let txType = 'despesa';
  let selectedCategory = '';

  /* data padrão = hoje (local, sem drift de fuso) */
  const hojeLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  if (!date.value) date.value = hojeLocal();

  /* ---------- popular selects (se houver db global) ---------- */
  const populateAccounts = () => {
    const bancos = (window.db && db.bancos) || [];
    const cartoes = (window.db && db.cartoes) || [];
    const opts = [
      ...bancos.map(b => [`banco:${b.id}`, b.nome || 'Conta']),
      ...cartoes.map(c => [`cartao:${c.id}`, `${c.nome || 'Cartão'} (crédito)`]),
    ];
    if (!opts.length) opts.push(['demo', 'Conta principal (demonstração)']);
    account.innerHTML = opts.map(([v, t]) => `<option value="${v}">${escapeHtml(t)}</option>`).join('');
  };
  const populatePeople = () => {
    const contatos = (window.db && db.contatos) || [];
    person.innerHTML = '<option value="">Sem pessoa</option>' +
      contatos.slice(0, 50).map(c => `<option value="${c.id}">${escapeHtml(c.nome || 'Contato')}</option>`).join('');
  };
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- categorias (combobox com busca + criar nova) ---------- */
  const listCategories = (filter = '') => {
    const cats = (window.db && db.categorias) || [
      'Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Salário', 'Investimento'
    ];
    const nomes = cats.map(c => c.nome || c).filter(Boolean);
    const q = filter.trim().toLowerCase();
    return nomes.filter(n => !q || n.toLowerCase().includes(q));
  };
  const renderCategoryList = () => {
    const items = listCategories(category.value);
    const create = category.value.trim() && !items.some(i => i.toLowerCase() === category.value.trim().toLowerCase());
    categoryList.innerHTML = [
      ...items.map(n => `<li role="option" class="px-3 py-2 rounded-r1 text-sm cursor-pointer hover:bg-surface-2" data-cat="${escapeHtml(n)}">${escapeHtml(n)}</li>`),
      create ? `<li role="option" class="px-3 py-2 rounded-r1 text-sm cursor-pointer text-action font-semibold hover:bg-violet-soft" data-cat-create="1">＋ Criar “${escapeHtml(category.value.trim())}”</li>` : '',
    ].join('') || '<li class="px-3 py-2 text-sm text-muted">Nenhuma categoria encontrada</li>';
    categoryList.classList.remove('hidden');
    category.setAttribute('aria-expanded', 'true');
  };
  category.addEventListener('focus', renderCategoryList);
  category.addEventListener('input', () => { selectedCategory = category.value; renderCategoryList(); updatePreview(); validate(); });
  category.addEventListener('blur', () => setTimeout(() => { categoryList.classList.add('hidden'); category.setAttribute('aria-expanded', 'false'); }, 150));
  categoryList.addEventListener('mousedown', (e) => {
    const li = e.target.closest('[data-cat], [data-cat-create]');
    if (!li) return;
    const nome = li.dataset.catCreate ? category.value.trim() : li.dataset.cat;
    category.value = nome; selectedCategory = nome;
    categoryList.classList.add('hidden'); updatePreview(); validate();
  });

  /* ---------- toggle de tipo ---------- */
  form.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      txType = btn.dataset.txType;
      typeSelect.value = txType;
      form.querySelectorAll('.type-btn').forEach(b => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.classList.toggle('bg-surface', on);
        b.classList.toggle('shadow-soft', on);
        b.classList.toggle('text-muted', !on);
        b.classList.toggle('text-text', on);
        b.setAttribute('aria-pressed', String(on));
      });
      // transferência esconde pessoa/vencimento, mostra conta destino? (manter simples)
      updatePreview();
    });
  });

  /* ---------- recorrência ---------- */
  recToggle.addEventListener('click', () => {
    const on = recToggle.getAttribute('aria-pressed') !== 'true';
    recToggle.setAttribute('aria-pressed', String(on));
    recToggle.classList.toggle('bg-action', on);
    recToggle.classList.toggle('bg-border', !on);
    recToggle.querySelector('span').style.transform = on ? 'translateX(16px)' : 'translateX(0)';
    freq.classList.toggle('hidden', !on);
  });

  /* ---------- formatação ao digitar o valor (máscara BRL leve) ---------- */
  amount.addEventListener('input', () => {
    const n = parseBRL(amount.value);
    amount.classList.toggle('input-error', amount.value.trim() !== '' && (!Number.isFinite(n) || n <= 0));
    updatePreview(); validate();
  });

  /* ---------- validação inline + estado do submit ---------- */
  const validate = () => {
    const valor = parseBRL(amount.value);
    const valorOk = Number.isFinite(valor) && valor > 0;
    amountError.classList.toggle('hidden', valorOk || amount.value.trim() === '');
    const ok = valorOk && desc.value.trim().length > 0 && date.value && selectedCategory.trim().length > 0 && account.value;
    submitBtn.disabled = !ok;
    return { ok, valor };
  };
  [desc, date, account].forEach(el => el.addEventListener('input', () => { validate(); updatePreview(); }));

  /* ---------- prévia ao vivo ---------- */
  const tipoLabel = { receita: 'Receita', despesa: 'Despesa', transferencia: 'Transferência' };
  const updatePreview = () => {
    const { valor } = validate();
    const tipo = tipoLabel[txType];
    const sinal = txType === 'receita' ? '+' : (txType === 'despesa' ? '−' : '⇄');
    const valorTxt = Number.isFinite(valor) ? formatBRL(Math.abs(valor)) : 'R$ —';
    const descTxt = desc.value.trim() || 'sem descrição';
    const catTxt = selectedCategory.trim() || 'sem categoria';
    const contaTxt = account.selectedOptions[0]?.text || '';
    const recTxt = recToggle.getAttribute('aria-pressed') === 'true' ? ` · repete ${freq.value}` : '';
    preview.innerHTML = `<span class="${txType === 'receita' ? 'text-positive' : txType === 'despesa' ? 'text-negative' : 'text-action'} font-num font-semibold">${sinal} ${valorTxt}</span> · <strong>${escapeHtml(descTxt)}</strong> · ${escapeHtml(catTxt)}${contaTxt ? ` · ${escapeHtml(contaTxt)}` : ''}${recTxt}`;
  };

  /* ---------- sincroniza adaptador (campos antigos) ---------- */
  const syncAdapter = (payload) => {
    const map = {
      'edit-valor': payload.valor, 'edit-desc': payload.desc, 'edit-categoria': payload.categoria,
      'edit-data': payload.data, 'edit-banco': payload.bancoId, 'edit-tipo': payload.tipo,
      'dc-valor': payload.valor, 'dc-desc': payload.desc, 'dc-categoria': payload.categoria,
      'dc-data': payload.data, 'dc-cartao-id': payload.eCartao ? payload.bancoId : '',
      'dc-parcelas': payload.recorrente ? (payload.parcelas || 12) : 1,
    };
    Object.entries(map).forEach(([id, v]) => { const el = $(id); if (el) el.value = v ?? ''; });
  };

  /* ---------- submit ---------- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { ok, valor } = validate();
    if (!ok) return;
    const [tipoConta, contaId] = (account.value || ':').split(':');
    const payload = {
      tipo: txType,
      valor: Math.abs(valor),               // número em reais, positivo; sinal pelo tipo
      desc: desc.value.trim(),
      categoria: selectedCategory.trim(),
      bancoId: contaId,
      isCartao: tipoConta === 'cartao',
      data: date.value,
      vencimento: dueDate.value || null,
      contatoId: person.value || null,
      recorrente: recToggle.getAttribute('aria-pressed') === 'true',
      frequencia: freq.value,
      origem: 'modal-v4',
    };
    syncAdapter(payload);
    // 1) evento para novos handlers
    document.dispatchEvent(new CustomEvent('transacao:submit', { detail: payload }));
    // 2) compatibilidade: se o app antigo expõe o handler de submit, dispara
    const legacyBtn = document.querySelector('[data-action="submit-transacao"], #btn-submit-transacao');
    // (o evt-submit.js existente lê os campos adaptador e segue o fluxo normal)
    close();
  });

  /* ---------- abrir / fechar ---------- */
  const open = () => {
    populateAccounts(); populatePeople();
    form.reset(); date.value = hojeLocal();
    selectedCategory = ''; category.value = '';
    submitBtn.disabled = true;
    updatePreview();
    backdrop.classList.remove('hidden');
    amount.focus();
  };
  const close = () => backdrop.classList.add('hidden');
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-action="close-modal"]')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  /* expõe controle para o FAB / botões ＋ lançamento */
  window.ModalTransacaoV4 = { open, close, parseBRL, formatBRL };
  document.querySelectorAll('[data-action="new-transaction"], [data-action="quick-despesa"], [data-action="quick-receita"]').forEach(b =>
    b.addEventListener('click', () => {
      open();
      if (b.dataset.action === 'quick-receita') form.querySelector('[data-tx-type="receita"]').click();
      if (b.dataset.action === 'quick-despesa') form.querySelector('[data-tx-type="despesa"]').click();
    }));

  validate(); updatePreview();
})();
