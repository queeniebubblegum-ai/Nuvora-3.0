import { db, Database } from './db.js';
import { Utils } from './utils.js';
import { UIRenderer } from './rnd-ui.js';
import { MentorEngine } from './mentorEngine.js';
import { loadAnoraPreferences } from './anora-preferences.js';

const escape = value => Utils.escapeHTML(value == null ? '' : String(value));
const styleLabel = style => ({ suave: 'Suave', equilibrado: 'Equilibrado', rigoroso: 'Foco Extremo' }[style] || 'Equilibrado');
const styleIcon = style => ({ suave: '🌿', equilibrado: '⚖️', rigoroso: '🎯' }[style] || '⚖️');

const insightType = (text, index) => {
    if (index === 0 && /alerta|faltam|prioridade|urgente|risco/i.test(text)) return 'alerta';
    if (/ação|corte|reduz|compromisso|dívida|cartão/i.test(text)) return 'aviso';
    if (/excelente|ótimo|muito bem|controlado/i.test(text)) return 'dica';
    return 'info';
};

const renderInsight = insight => `<article class="nv-anora-insight is-${insight.type}">
    <p>${escape(insight.text)}</p>
    <small>${escape(insight.label)}</small>
</article>`;

const renderWelcome = ({ result, data }) => {
    const message = result.isOnboarding
        ? (result.recommendation || 'Vamos começar a organizar sua vida financeira, passo a passo.')
        : (result.recommendation || 'Escolha uma sugestão para começarmos.');
    const context = data.totalTransacoes > 0
        ? `Análise local baseada em ${data.totalTransacoes} ${data.totalTransacoes === 1 ? 'lançamento' : 'lançamentos'} registrados.`
        : 'Registre lançamentos para que a análise use os seus dados reais.';
    return `<div class="nv-anora-message nv-anora-message--assistant">
        <span class="nv-anora-avatar"><i class="ri-sparkling-line" aria-hidden="true"></i></span>
        <div class="nv-anora-bubble"><p>${escape(message)}</p><small>${escape(context)}</small></div>
    </div>`;
};

export const renderAnoraPage = () => {
    const data = MentorEngine.extrairDadosParaAnora(db, Database);
    const result = MentorEngine.calculateMentorScore(data);
    const preferences = loadAnoraPreferences();
    const insights = (result.insights || []).slice(0, 4).map((text, index) => ({
        text,
        type: insightType(text, index),
        label: result.isOnboarding ? 'Próximo passo' : 'Insight do momento'
    }));
    const insightList = insights.length ? insights.map(renderInsight).join('') : '<p class="nv-anora-empty-copy">Ainda não há dados suficientes para gerar insights. Registre alguns lançamentos para começar.</p>';
    const questions = ['Qual é meu saldo?', 'Quanto gastei com Uber este mês?', 'Quanto gastei este mês?', 'Como estão minhas metas?'];
    const dateLabel = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
    const currentStyle = preferences.style;

    UIRenderer.updateDOM('main-content', `<div class="nv-anora-page" data-anora-page>
        <header class="nv-anora-header">
            <div><p class="nv-anora-eyebrow">Mentoria financeira</p><h1>Anora</h1><p>Insights e conversa local, baseados nos dados que você registrou no Avenera.</p></div>
            <span class="nv-anora-freshness"><i class="ri-time-line" aria-hidden="true"></i> Dados consultados em ${escape(dateLabel)}</span>
        </header>
        <div class="nv-anora-layout">
            <aside class="nv-anora-sidebar" aria-label="Resumo da Anora">
                <section class="nv-anora-card nv-anora-profile-card">
                    <div class="nv-anora-profile"><span class="nv-anora-avatar nv-anora-avatar--large"><i class="ri-sparkling-line" aria-hidden="true"></i></span><div><strong>Anora</strong><small>Assistente local</small></div></div>
                    <p class="nv-anora-section-label">Insights do momento</p>
                    <div class="nv-anora-insights">${insightList}</div>
                </section>
                <section class="nv-anora-card">
                    <p class="nv-anora-section-label">Modo de atuação</p>
                    <div class="nv-anora-style-list" role="group" aria-label="Modo de atuação da Anora">${['suave', 'equilibrado', 'rigoroso'].map(style => `<button type="button" data-action="setAnoraStyle" data-payload="${style}" aria-pressed="${currentStyle === style}" class="nv-anora-style ${currentStyle === style ? 'is-active' : ''}"><span aria-hidden="true">${styleIcon(style)}</span>${styleLabel(style)}</button>`).join('')}</div>
                </section>
            </aside>
            <section class="nv-anora-chat" data-anora-chat aria-label="Conversa com a Anora">
                <header class="nv-anora-chat-header"><div><h2>Como posso ajudar hoje?</h2><p>Faça uma pergunta sobre seus registros ou escolha uma sugestão.</p></div><span class="nv-anora-score">${escape(result.isOnboarding ? result.classification : `Saúde financeira: ${result.score}`)}</span></header>
                <div id="anora-page-chat-messages" data-anora-messages class="nv-anora-messages" aria-live="polite">${renderWelcome({ result, data })}</div>
                <div class="nv-anora-suggestions" aria-label="Sugestões de perguntas">${questions.map(question => `<button type="button" data-action="askAnoraQuestion" data-payload="${escape(question)}">${escape(question)}</button>`).join('')}</div>
                <form data-submit="chatAnora" class="nv-anora-composer"><label class="sr-only" for="anora-page-chat-input">Pergunte à Anora</label><input type="text" id="anora-page-chat-input" data-anora-input required autocomplete="off" placeholder="Pergunte à Anora…"><button type="submit" aria-label="Enviar pergunta"><i class="ri-send-plane-fill" aria-hidden="true"></i></button></form>
            </section>
        </div>
    </div>`);
};
