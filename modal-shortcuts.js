/* ============================================================
   NUVORA — Atalho para todos os modais
   Como instalar:
   1. Salve este arquivo como "modal-shortcuts.js" na raiz do projeto
   2. No index.html, antes de </body>, adicione:
        <script src="./modal-shortcuts.js"></script>
   3. Pronto — aparece um botão roxo "Modais" no canto inferior esquerdo.
   ============================================================ */
(function () {
  'use strict';

  // Lista de todos os modais existentes no cmp-modals.js
  const MODAIS = [
    { id: 'modal-transacao',         nome: 'Nova Transação',        grupo: 'Lançamentos' },
    { id: 'modal-transferencia',     nome: 'Transferência',         grupo: 'Lançamentos' },
    { id: 'modal-despesa-cartao',    nome: 'Compra no Cartão',      grupo: 'Lançamentos' },
    { id: 'modal-agendamento',       nome: 'Agendar previsão',      grupo: 'Lançamentos' },
    { id: 'modal-categoria',         nome: 'Nova Categoria',        grupo: 'Cadastros' },
    { id: 'modal-contato',           nome: 'Novo Contato / Pessoa', grupo: 'Cadastros' },
    { id: 'modal-banco',             nome: 'Nova Conta Bancária',   grupo: 'Cadastros' },
    { id: 'modal-cartao',            nome: 'Novo Cartão',           grupo: 'Cadastros' },
    { id: 'modal-fatura-detalhes',   nome: 'Detalhes da Fatura',    grupo: 'Faturas' },
    { id: 'modal-pagar-fatura',      nome: 'Pagar Fatura',          grupo: 'Faturas' },
    { id: 'modal-classificar-fatura',nome: 'Classificar Fatura',    grupo: 'Faturas' },
    { id: 'modal-revisao-ofx',       nome: 'Revisão de OFX',        grupo: 'Importação' },
    { id: 'modal-fechamento-mes',    nome: 'Fechamento do Mês',     grupo: 'Sistema' },
    { id: 'modal-chat-anora',        nome: 'Chat da Anora',         grupo: 'Anora' },
    { id: 'modal-historico-anora',   nome: 'Histórico da Anora',    grupo: 'Anora' },
    { id: 'modal-agenda-dia',        nome: 'Agenda do Dia',         grupo: 'Agenda' },
  ];

  // Cores do sistema (fallback se as vars não existirem)
  const brand = '#8170b5';
  const surface = '#fffefb';
  const text = '#202624';
  const muted = '#65716b';
  const border = '#dce2db';

  // Botão flutuante (canto inferior esquerdo)
  const btn = document.createElement('button');
  btn.id = 'btn-atalho-modais';
  btn.textContent = 'Modais';
  btn.style.cssText = `
    position: fixed; left: 16px; bottom: 16px; z-index: 9990;
    background: ${brand}; color: #fff; border: none;
    padding: 10px 16px; border-radius: 999px;
    font-size: 12px; font-weight: 700; font-family: inherit;
    cursor: pointer; box-shadow: 0 6px 18px rgba(108,59,182,.35);
    display: flex; align-items: center; gap: 6px;
    transition: transform .15s ease, opacity .2s ease;
  `;
  btn.innerHTML = '<i class="fa-solid fa-window-restore" style="margin-right:6px;"></i>Modais';
  document.body.appendChild(btn);

  // Painel com a lista
  const panel = document.createElement('div');
  panel.id = 'painel-atalho-modais';
  panel.style.cssText = `
    position: fixed; left: 16px; bottom: 64px; z-index: 9991;
    width: 280px; max-height: 70vh; overflow-y: auto;
    background: ${surface}; border: 1px solid ${border};
    border-radius: 14px; box-shadow: 0 18px 42px rgba(35,32,28,.18);
    padding: 12px; display: none; font-family: inherit;
  `;

  let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:0 4px;">'
    + '<strong style="font-size:13px;color:' + text + ';">Todos os modais</strong>'
    + '<span id="fechar-atalho-modais" style="cursor:pointer;color:' + muted + ';font-size:16px;line-height:1;">&times;</span></div>';

  let grupoAtual = '';
  MODAIS.forEach(m => {
    if (m.grupo !== grupoAtual) {
      grupoAtual = m.grupo;
      html += '<div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:' + muted + ';padding:10px 4px 4px;">' + grupoAtual + '</div>';
    }
    html += '<button data-action="openModal" data-modal="' + m.id + '" '
      + 'style="display:block;width:100%;text-align:left;background:transparent;border:none;'
      + 'padding:8px 10px;border-radius:8px;font-size:12px;color:' + text + ';cursor:pointer;font-family:inherit;'
      + 'margin-bottom:2px;" onmouseover="this.style.background=\'rgba(129,112,181,.12)\'" '
      + 'onmouseout="this.style.background=\'transparent\'">' + m.nome
      + '<span style="float:right;font-size:9px;color:' + muted + ';font-family:monospace;">' + m.id.replace('modal-', '') + '</span></button>';
  });

  panel.innerHTML = html;
  document.body.appendChild(panel);

  // Abrir/fechar o painel
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    panel.style.display = (panel.style.display === 'none' || !panel.style.display) ? 'block' : 'none';
  });
  document.getElementById('fechar-atalho-modais').addEventListener('click', function () {
    panel.style.display = 'none';
  });
  document.addEventListener('click', function (e) {
    if (!panel.contains(e.target) && e.target !== btn) panel.style.display = 'none';
  });

  console.log('[atalho-modais] Botão de modais carregado. ' + MODAIS.length + ' modais disponíveis.');
})();
