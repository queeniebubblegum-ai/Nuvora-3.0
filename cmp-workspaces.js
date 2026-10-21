import { renderConferencing } from './conferencing.js';
import { Utils } from './utils.js';
import { calculateReconciliation, invoiceReconciliationKey, listInvoiceTransactions } from './reconciliation.js';
import { addMoney } from './money-math.js';

const escape = value => Utils.escapeHTML(String(value ?? ''));
const money = value => Utils.formatMoney(Number(value) || 0);
const list = value => Array.isArray(value) ? value : [];
const button = (action, label, icon = '', attributes = '', tone = 'secondary') => `<button type="button" data-action="${action}" class="nv-workspace-button is-${tone}" ${attributes}>${icon ? `<i class="fa-solid ${icon}" aria-hidden="true"></i>` : ''}<span>${label}</span></button>`;
const metric = (label, value, note = '', tone = '') => `<article class="nv-workspace-metric ${tone}"><p>${label}</p><strong class="num">${value}</strong>${note ? `<small>${note}</small>` : ''}</article>`;
const heading = (eyebrow, title, subtitle, actions = '') => `<header class="nv-workspace-header"><div><p class="nv-workspace-eyebrow">${eyebrow}</p><h1>${title}</h1><p>${subtitle}</p></div><div class="nv-workspace-actions">${actions}</div></header>`;
const dateLabel = value => /^\d{4}-\d{2}-\d{2}/.test(String(value || '')) ? String(value).slice(0, 10).split('-').reverse().join('/') : 'Não informada';

export const getInvestmentCapital = investment => {
    const explicit = investment?.capitalInvestido;
    if (explicit !== null && explicit !== undefined && explicit !== '' && Number.isFinite(Number(explicit)) && Number(explicit) >= 0) return Number(explicit);
    // Earlier versions always saved aporte=0, even when the field was blank.
    // That value cannot prove a zero acquisition cost for an existing position.
    if (Number(investment?.aporte) > 0) return Number(investment.aporte);
    return null;
};

export const getInvestmentSummary = (investments, now = new Date()) => {
    const positions = list(investments);
    const total = positions.reduce((sum, item) => addMoney(sum, item.valorAtual ?? item.valor), 0);
    const known = positions.filter(item => getInvestmentCapital(item) !== null);
    const capital = known.reduce((sum, item) => addMoney(sum, getInvestmentCapital(item)), 0);
    const complete = positions.length > 0 && known.length === positions.length;
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyContributions = positions.flatMap(item => list(item.movimentos)).filter(item => item.tipo === 'aporte' && String(item.data).startsWith(month)).reduce((sum, item) => addMoney(sum, item.valor), 0);
    const classes = new Map();
    positions.forEach(item => {
        const name = String(item.classe || 'Sem classificação');
        classes.set(name, addMoney(classes.get(name) || 0, item.valorAtual ?? item.valor));
    });
    return { total, capital: complete ? capital : null, gain: complete ? addMoney(total, -capital) : null, gainPercent: complete && capital > 0 ? ((total - capital) / capital) * 100 : null, monthlyContributions, classes: [...classes].sort((a, b) => b[1] - a[1]), count: positions.length };
};

export const getInvestmentHistory = investments => {
    const positions = list(investments);
    if (!positions.length) return [];
    const histories = positions.map(item => list(item.historicoValores).filter(point => /^\d{4}-\d{2}-\d{2}$/.test(String(point.data)) && Number.isFinite(Number(point.valor)) && Number(point.valor) >= 0).sort((a, b) => a.data.localeCompare(b.data)));
    if (histories.some(history => !history.length)) return [];
    const dates = [...new Set(histories.flatMap(history => history.map(point => point.data)))].sort();
    return dates.flatMap(date => {
        const latest = histories.map(history => history.filter(point => point.data <= date).at(-1));
        if (latest.some(point => !point)) return [];
        return [{ data: date, valor: latest.reduce((sum, point) => addMoney(sum, point.valor), 0) }];
    });
};

export const renderInvestmentsWorkspace = (database, state = {}) => {
    const positions = list(database.investimentos);
    const summary = getInvestmentSummary(positions);
    const history = getInvestmentHistory(positions);
    const colors = ['var(--mock-action, #5846c2)', 'var(--mock-income, #0e9f6e)', 'var(--mock-warning, #d9902b)', 'var(--mock-info, #5f7f9b)', 'var(--mock-expense, #d94a5a)'];
    const allocation = summary.classes.map(([name, value], index) => `<div class="nv-workspace-allocation"><div><strong>${escape(name)}</strong><span class="num">${money(value)} <small>· ${summary.total ? ((value / summary.total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0'}%</small></span></div><div class="nv-workspace-progress"><i style="width:${summary.total ? Math.max(0, Math.min(100, value / summary.total * 100)) : 0}%;background:${colors[index % colors.length]}"></i></div></div>`).join('');
    let chart = '<div class="nv-workspace-chart-empty"><i class="fa-solid fa-chart-line" aria-hidden="true"></i><strong>Seu histórico começa com os valores registrados</strong><p>Atualize as posições ao longo dos dias para acompanhar a evolução real da carteira.</p></div>';
    if (history.length >= 2) {
        const min = Math.min(...history.map(point => point.valor));
        const max = Math.max(...history.map(point => point.valor));
        const points = history.map((point, index) => `${20 + (index / (history.length - 1)) * 660},${180 - ((point.valor - min) / Math.max(max - min, 1)) * 150}`).join(' ');
        chart = `<figure class="nv-workspace-history"><svg viewBox="0 0 700 210" role="img" aria-label="Evolução dos valores registrados da carteira"><path d="M20 30H680M20 105H680M20 180H680" fill="none" stroke="currentColor" opacity=".12" stroke-dasharray="4 5"/><polyline points="${points}" fill="none" stroke="var(--mock-action, #5846c2)" stroke-width="3" stroke-linejoin="round"/></svg><figcaption><span>${dateLabel(history[0].data)}</span><span>${dateLabel(history.at(-1).data)}</span></figcaption><details><summary>Consultar valores registrados</summary><ul>${history.map(point => `<li><time datetime="${point.data}">${dateLabel(point.data)}</time><strong class="num">${money(point.valor)}</strong></li>`).join('')}</ul></details></figure>`;
    }
    const rows = positions.map(item => {
        const capital = getInvestmentCapital(item);
        const current = Number(item.valorAtual ?? item.valor) || 0;
        const gain = capital !== null ? addMoney(current, -capital) : null;
        return `<tr><td><strong>${escape(item.nome || item.ativo || 'Investimento')}</strong><small>${escape(item.instituicao || 'Cadastro manual')}</small></td><td><span class="nv-workspace-pill">${escape(item.classe || 'Sem classificação')}</span></td><td class="num">${money(current)}</td><td class="num">${capital === null ? '—' : money(capital)}</td><td class="num ${gain > 0 ? 'is-positive' : gain < 0 ? 'is-negative' : ''}">${gain === null ? '—' : money(gain)}</td><td class="num">${summary.total ? (current / summary.total * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0'}%</td><td><div class="nv-workspace-row-actions">${button('workspaceInvestmentContribution', 'Aportar', 'fa-plus', `data-id="${escape(item.id)}"`)}${button('workspaceEditInvestment', 'Editar', 'fa-pen', `data-id="${escape(item.id)}"`)}${button('delete', 'Excluir', 'fa-trash-can', `data-col="investimentos" data-id="${escape(item.id)}"`, 'danger')}</div></td></tr>`;
    }).join('');
    return `<div class="nv-investments-workspace nv-workspace">${heading('Patrimônio', 'Investimentos', 'Acompanhe posições, aportes e valores atuais da sua carteira.', `${button('workspaceRefreshInvestments', 'Atualizar valores', 'fa-arrows-rotate')}${positions.length ? button('workspaceNewContribution', 'Novo aporte', 'fa-plus', '', 'success') : button('workspaceNewInvestment', 'Novo investimento', 'fa-plus', '', 'primary')}`)}
        <section class="nv-workspace-metrics" aria-label="Resumo da carteira">${metric('Total investido', money(summary.total), 'Valor atual das posições')}${metric('Capital informado', summary.capital === null ? '—' : money(summary.capital), summary.capital === null ? 'Informe o custo de cada posição' : 'Custo e aportes registrados')}${metric('Variação sobre custo', summary.gainPercent === null ? '—' : `${summary.gainPercent >= 0 ? '+' : ''}${summary.gainPercent.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`, summary.gain === null ? 'Sem base suficiente para calcular' : `${money(summary.gain)} desde o custo informado`, summary.gain > 0 ? 'is-positive' : summary.gain < 0 ? 'is-negative' : '')}${metric('Aportes no mês', money(summary.monthlyContributions), 'Somente aportes com data registrada')}</section>
        <div class="nv-workspace-grid"><section class="nv-workspace-panel"><header><div><h2>Evolução do patrimônio</h2><p>Valores reais registrados · ${history.length} ${history.length === 1 ? 'data disponível' : 'datas disponíveis'}</p></div></header>${chart}</section><section class="nv-workspace-panel"><header><div><h2>Alocação por classe</h2><p>Distribuição atual da carteira</p></div></header>${allocation || '<p class="nv-workspace-empty">Cadastre uma posição para visualizar a distribuição.</p>'}<div class="nv-workspace-note"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i><p>Aportes aumentam o capital investido. Atualizações de valor mostram a variação da posição.</p></div></section></div>
        <section class="nv-workspace-panel"><header><div><h2>Meus ativos</h2><p>${positions.length} ${positions.length === 1 ? 'posição cadastrada' : 'posições cadastradas'}</p></div>${button('workspaceNewInvestment', 'Novo ativo', 'fa-plus')}</header>${positions.length ? `<div class="nv-workspace-table-scroll" tabindex="0" role="region" aria-label="Ativos da carteira"><table class="nv-workspace-table"><thead><tr><th>Ativo</th><th>Classe</th><th>Posição</th><th>Custo informado</th><th>Variação</th><th>% carteira</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="nv-workspace-chart-empty"><i class="fa-solid fa-chart-line" aria-hidden="true"></i><strong>Nenhum investimento cadastrado</strong><p>Adicione sua primeira posição com os valores que você já possui.</p>${button('workspaceNewInvestment', 'Adicionar investimento', 'fa-plus', '', 'primary')}</div>`}</section><p class="nv-workspace-disclaimer">O cadastro da carteira não movimenta automaticamente suas contas. Registre a transferência entre sua conta e a corretora nos lançamentos para manter o saldo bancário correto.</p></div>`;
};

export const getReconciliationWorkspaceData = (database, state = {}) => {
    const now = new Date();
    const month = Number.isInteger(Number(state.workspaceReconciliationMonth)) && state.workspaceReconciliationMonth != null ? Number(state.workspaceReconciliationMonth) : now.getMonth();
    const year = Number(state.workspaceReconciliationYear) || now.getFullYear();
    const cards = list(database.cartoes);
    const card = cards.find(item => String(item.id) === String(state.workspaceReconciliationCardId)) || cards[0] || null;
    const summaries = cards.map(item => {
        const record = list(database.conciliacoesFaturas).find(value => value.chave === invoiceReconciliationKey(item.id, year, month));
        const transactions = listInvoiceTransactions(database.transacoes, item, year, month);
        const reconciliation = calculateReconciliation(transactions, record?.valorFaturaReal, record?.ajustes || [], record);
        return { card: item, record, transactions, ...reconciliation };
    });
    const selected = summaries.find(item => String(item.card.id) === String(card?.id));
    return { card, cards, month, year, summaries, selected, transactionCount: summaries.reduce((sum, item) => sum + item.transactions.length, 0), reconciledCount: summaries.filter(item => item.status === 'conciliada').length, differenceCount: summaries.filter(item => item.status === 'diferença encontrada').length };
};

export const renderReconciliationWorkspace = (database, state = {}) => renderConferencing(database, state);

export const renderImportWorkspace = (database, state = {}) => {
    const banks = list(database.bancos);
    const destination = banks.find(item => String(item.id) === String(state.bancoAlvoOFX)) || banks[0];
    const pending = list(state.ofxPendente);
    const selected = pending.filter(item => item.selecionado && item.status !== 'duplicada' && item.status !== 'ignorada_saldo_inicial');
    const duplicates = pending.filter(item => item.status === 'duplicada').length;
    const preview = pending.slice(0, 6);
    const dates = pending.map(item => item.data).filter(Boolean).sort();
    return `<div class="nv-import-workspace nv-workspace">${heading('Assistente de importação', 'Importar extrato', 'OFX e CSV · confira os registros antes de salvar nas suas contas.')}
        <ol class="nv-workspace-steps" aria-label="Etapas da importação"><li class="is-active"><span>1</span>Arquivo</li><li class="${pending.length ? 'is-active' : ''}"><span>2</span>Conferência</li><li><span>3</span>Confirmação</li></ol>
        <section class="nv-workspace-panel"><label class="nv-workspace-import-destination">Conta de destino<select data-workspace-import-target ${banks.length ? '' : 'disabled'}>${banks.length ? banks.map(bank => `<option value="${escape(bank.id)}" ${String(destination?.id) === String(bank.id) ? 'selected' : ''}>${escape(Utils.formatBankName(bank))}</option>`).join('') : '<option>Nenhuma conta cadastrada</option>'}</select></label><input type="file" id="workspace-import-file" data-workspace-import-file accept=".ofx,.csv,text/csv" hidden><div class="nv-workspace-dropzone" data-workspace-dropzone role="group" aria-label="Selecionar extrato OFX ou CSV"><i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i><h2>Arraste o arquivo aqui</h2><p>OFX ou CSV · até 5 MB · leitura no seu dispositivo</p><div class="nv-workspace-actions">${button('workspacePickImport', 'Escolher arquivo', 'fa-file-arrow-up', banks.length ? '' : 'disabled', 'primary')}</div></div>${!banks.length ? `<div class="nv-workspace-note"><p>Adicione uma conta para definir onde os lançamentos serão salvos.</p>${button('openModal', 'Adicionar conta', 'fa-plus', 'data-modal="modal-banco"')}</div>` : ''}</section>
        <div class="nv-workspace-grid"><section class="nv-workspace-panel"><header><div><h2>Configurações</h2><p>O arquivo será revisado antes de alterar o saldo.</p></div></header><dl class="nv-workspace-definition-list"><div><dt>Conta destino</dt><dd>${escape(destination ? Utils.formatBankName(destination) : 'Não definida')}</dd></div><div><dt>Formato detectado</dt><dd>${pending.length ? escape(state.tipoImportacao || 'Extrato') : 'Aguardando arquivo'}</dd></div><div><dt>Período</dt><dd>${dates.length ? `${dateLabel(dates[0])} → ${dateLabel(dates.at(-1))}` : '—'}</dd></div><div><dt>Registros detectados</dt><dd>${pending.length || '—'}</dd></div></dl><div class="nv-workspace-note"><i class="fa-solid fa-lock" aria-hidden="true"></i><p>O extrato é lido localmente. A importação só é concluída após a sua confirmação.</p></div></section>
        <section class="nv-workspace-panel"><header><div><h2>Prévia dos lançamentos</h2><p>Datas, descrições e valores do arquivo selecionado</p></div></header>${preview.length ? `<div class="nv-workspace-table-scroll" tabindex="0" role="region" aria-label="Prévia do extrato"><table class="nv-workspace-table"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>${preview.map(item => `<tr><td>${dateLabel(item.data)}</td><td><strong>${escape(item.desc)}</strong><small>${item.status === 'duplicada' ? 'Possível duplicata · revisar' : item.status === 'ignorada_saldo_inicial' ? 'Anterior ao saldo inicial' : escape(item.categoria || 'Categoria a conferir')}</small></td><td class="num ${item.tipo === 'receita' ? 'is-positive' : 'is-negative'}">${item.tipo === 'receita' ? '+' : '−'}${money(item.valor)}</td></tr>`).join('')}</tbody></table></div><div class="nv-workspace-note"><p>${duplicates} ${duplicates === 1 ? 'possível duplicata detectada' : 'possíveis duplicatas detectadas'}. A seleção e as categorias podem ser ajustadas na revisão.</p></div>` : '<div class="nv-workspace-empty">Escolha um extrato para ver os registros encontrados. Nenhum dado de exemplo é importado.</div>'}</section></div>
        <footer class="nv-workspace-import-footer"><p>${pending.length ? `${pending.length} registros detectados · ${selected.length} novos selecionados` : 'Selecione um arquivo para começar'}</p>${pending.length ? button('workspaceReviewImport', 'Revisar antes de importar', 'fa-list-check', '', 'primary') : ''}</footer></div>`;
};

export const renderInvestmentDialogs = () => `<div id="modal-investimento-workspace" class="fixed inset-0 hidden items-center justify-center p-4 bg-brand-deep/60 backdrop-blur-sm nv-modal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="workspace-investment-title" inert style="z-index:1003"><div class="nv-modal-shell nv-dialog nv-dialog__panel bg-surface border border-border rounded-[16px] w-full max-w-lg"><header class="nv-dialog-head nv-dialog__header"><div><p class="nv-workspace-eyebrow">Carteira</p><h2 id="workspace-investment-title">Novo investimento</h2></div><button type="button" data-action="closeModal" aria-label="Fechar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header><form data-submit="investmentWorkspace" data-workspace-investment-form class="nv-dialog__body nv-investment-form"><input name="id" type="hidden"><input name="mode" type="hidden" value="position"><label data-workspace-position-picker hidden>Escolha o ativo<select data-workspace-investment-picker></select></label><div data-workspace-position-fields><label>Nome do ativo<input name="nome" autocomplete="off" required placeholder="Ex.: Tesouro IPCA+ 2029"></label><div class="nv-workspace-form-grid"><label>Classe<select name="classe"><option value="">Sem classificação</option><option>Renda fixa</option><option>Ações</option><option>Fundos imobiliários</option><option>Internacional</option><option>Cripto</option><option>Outros</option></select></label><label>Instituição<input name="instituicao" autocomplete="off" placeholder="Corretora ou banco"></label></div><div class="nv-workspace-form-grid"><label>Valor atual (R$)<input name="valorAtual" type="number" min="0" step="0.01" inputmode="decimal" required></label><label>Capital investido (R$)<input name="capitalInvestido" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Opcional"></label></div><p class="nv-workspace-field-note">Informe o custo de aquisição, incluindo aportes, para calcular a variação. Deixe vazio se não souber.</p></div><div data-workspace-contribution-fields hidden><p data-workspace-contribution-name></p><div class="nv-workspace-form-grid"><label>Valor do aporte (R$)<input name="valorAporte" type="number" min="0.01" step="0.01" inputmode="decimal" disabled></label><label>Data do aporte<input name="dataAporte" type="date" disabled></label></div><p class="nv-workspace-field-note">O aporte aumenta o valor da posição e o capital conhecido. A transferência bancária deve ser registrada nos lançamentos.</p></div><p class="nv-workspace-form-error" data-workspace-investment-error role="alert" hidden></p><footer class="nv-dialog-foot nv-dialog__footer"><button type="button" data-action="closeModal" class="nv-workspace-button is-secondary">Cancelar</button><button type="submit" class="nv-workspace-button is-primary">Salvar</button></footer></form></div></div>`;
