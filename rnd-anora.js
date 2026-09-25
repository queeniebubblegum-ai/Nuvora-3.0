// ============================================================
// NUVORA · PÁGINA ANORA — TELA CHEIA COM INSIGHTS
// Fase 5 | 25/09/2026
// ============================================================

function RenderPage_Anora() {
  const state = window.App?.state || {};
  const insights = window.Anora?.recentInsights || [
    { texto: "Delivery subiu 34% em 2 semanas", tempo: "há 2 h", tipo: "alerta" },
    { texto: "Fatura fecha em 4 dias — 2 lançamentos pendentes", tempo: "ontem", tipo: "aviso" },
    { texto: "Assinatura repetida detectada", tempo: "2 dias atrás", tipo: "info" },
    { texto: "Carteira 52% renda fixa — sugestão rebalancear", tempo: "3 dias atrás", tipo: "dica" }
  ];
  const rigor = window.Anora?.rigor || "balanced";

  return `
<div class="nv-page-container" style="display:flex;gap:1rem;height:calc(100vh - 120px);min-height:560px;">

  <!-- PAINEL LATERAL: INSIGHTS -->
  <div style="width:260px;display:flex;flex-direction:column;gap:1rem;flex-shrink:0;">
    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:1rem;">
      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem;">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#5846C2,#8B7BE8);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;">
          <i class="ri-sparkling-line"></i>
        </div>
        <div>
          <p style="font-weight:600;font-size:.9375rem;">Anora</p>
          <p style="font-size:.75rem;color:var(--accent2);display:flex;align-items:center;gap:.25rem;">
            <span style="width:6px;height:6px;border-radius:50%;background:var(--accent2);"></span> online
          </p>
        </div>
      </div>

      <p style="font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:.5rem;">Insights recentes</p>
      <div style="display:flex;flex-direction:column;gap:.5rem;">
        ${insights.map(i => `
          <div style="padding:.625rem;border-radius:10px;background:${
            i.tipo==='alerta' ? 'rgba(217,144,43,.12)' :
            i.tipo==='aviso' ? 'rgba(88,70,194,.10)' :
            i.tipo==='dica' ? 'rgba(14,159,110,.10)' : 'var(--bg)'
          };border-left:3px solid ${
            i.tipo==='alerta' ? 'var(--warning)' :
            i.tipo==='aviso' ? 'var(--accent)' :
            i.tipo==='dica' ? 'var(--accent2)' : 'var(--border)'
          };">
            <p style="font-size:.75rem;line-height:1.4;">${i.texto}</p>
            <p style="font-size:.625rem;color:var(--muted);margin-top:.25rem;">${i.tempo}</p>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- SELETOR DE RIGOR -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:1rem;">
      <p style="font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:.75rem;">Modo de atuação</p>
      <div style="display:flex;flex-direction:column;gap:.5rem;">
        ${['suave','balanced','rigoroso'].map(m => `
          <button onclick="window.Anora?.setRigor('${m}');RenderPage('anora')" style="padding:.625rem;border-radius:10px;border:none;text-align:left;display:flex;align-items:center;gap:.5rem;background:${rigor===m?'var(--accent)':'var(--bg)'} ;color:${rigor===m?'#fff':'var(--text)'} ;font-size:.8125rem;cursor:pointer;transition:all .18s ease;">
            ${m==='suave'?'🌿':m==='balanced'?'⚖️':'🎯'}
            ${m==='suave'?'Suave':m==='balanced'?'Equilibrado':'Foco Extremo'}
          </button>
        `).join('')}
      </div>
    </div>
  </div>

  <!-- ÁREA PRINCIPAL: CHAT -->
  <div style="flex:1;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;">
    <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
      <h3 style="font-weight:600;font-size:1rem;">Como posso ajudar hoje?</h3>
      <span style="font-size:.7rem;color:var(--muted);">dados até 25/09</span>
    </div>

    <div id="anora-chat-mensagens" style="flex:1;overflow-y:auto;padding:1.5rem;background:var(--bg);display:flex;flex-direction:column;gap:1rem;">
      <!-- MENSAGENS SERÃO INSERIDAS AQUI DINAMICAMENTE -->
      <div style="display:flex;gap:.75rem;animation:anoraMsg .35s ease;">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#5846C2,#8B7BE8);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;">
          <i class="ri-sparkling-line"></i>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:18px;border-top-left-radius:4px;padding:1rem;max-width:80%;">
          <p style="font-size:.875rem;line-height:1.5;">Olá! 👋 Eu sou a Anora, sua mentora financeira. Vi que sua fatura fecha em <strong>4 dias</strong> e você tem <strong>2 lançamentos pendentes</strong>. Quer que eu verifique agora, ou prefere conversar sobre outro tema?</p>
        </div>
      </div>
    </div>

    <!-- SUGESTÕES RÁPIDAS -->
    <div style="padding:.75rem 1.5rem;border-top:1px solid var(--border);display:flex;gap:.5rem;flex-wrap:wrap;">
      ${['Quando fecha minha fatura?','Sugira um corte de gastos','Como está minha reserva de emergência?','Revise meus investimentos'].map(q => `
        <button onclick="AnoraEnviarPergunta('${q}')" style="padding:.5rem .875rem;border-radius:999px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:.75rem;cursor:pointer;transition:all .15s ease;" onmouseover="this.style.background='var(--accent-soft)'" onmouseout="this.style.background='var(--card)'">
          ${q}
        </button>
      `).join('')}
    </div>

    <!-- CAMPO DE DIGITAÇÃO -->
    <div style="padding:1rem 1.5rem;border-top:1px solid var(--border);display:flex;gap:.75rem;align-items:center;">
      <input type="text" id="anora-input" placeholder="Pergunte à Anora…" style="flex:1;padding:.75rem 1rem;border-radius:12px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:.875rem;outline:none;" onkeydown="if(event.key==='Enter')AnoraEnviarMensagem()">
      <button onclick="AnoraEnviarMensagem()" style="width:40px;height:40px;border-radius:12px;background:var(--accent);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;">
        <i class="ri-send-plane-fill"></i>
      </button>
    </div>
  </div>
</div>

<style>
@keyframes anoraMsg {
  from { opacity:0; transform:translateY(8px); }
  to { opacity:1; transform:translateY(0); }
}
</style>
`;
}

window.RenderPage_Anora = RenderPage_Anora;

// Funções de comunicação com a lógica existente
function AnoraEnviarPergunta(texto) {
  const input = document.getElementById('anora-input');
  if(input) input.value = texto;
  AnoraEnviarMensagem();
}

function AnoraEnviarMensagem() {
  const input = document.getElementById('anora-input');
  const texto = input?.value.trim();
  if(!texto) return;

  const container = document.getElementById('anora-chat-mensagens');
  if(!container) return;

  // Mensagem do usuário
  container.innerHTML += `
    <div style="display:flex;justify-content:flex-end;animation:anoraMsg .35s ease;">
      <div style="background:var(--accent);color:#fff;border-radius:18px;border-top-right-radius:4px;padding:1rem;max-width:80%;">
        <p style="font-size:.875rem;line-height:1.5;">${texto}</p>
      </div>
    </div>
  `;
  input.value = '';

  // Resposta da Anora (usa lógica existente se disponível)
  setTimeout(() => {
    const resposta = window.Anora?.responder?.(texto) || "Entendi! Estou analisando seus dados… Em uma versão futura, terei respostas mais detalhadas integradas com sua carteira.";
    container.innerHTML += `
      <div style="display:flex;gap:.75rem;animation:anoraMsg .35s ease;">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#5846C2,#8B7BE8);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;">
          <i class="ri-sparkling-line"></i>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:18px;border-top-left-radius:4px;padding:1rem;max-width:80%;">
          <p style="font-size:.875rem;line-height:1.5;">${resposta}</p>
        </div>
      </div>
    `;
    container.scrollTop = container.scrollHeight;
  }, 600);

  container.scrollTop = container.scrollHeight;
}
