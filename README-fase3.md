# Fase 3 — Redesign v4: Dashboard

Renderizador do Dashboard no layout do mockup v4, **reutilizando os dados e funções já existentes** no app (`calculatePeriodTotals`, `money-math`, repositórios). Não toca na camada de dados.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `dashboard-v4.js` | `renderDashboardV4(container, { db, mes, ano })`. Monta: cabeçalho com seletor de período, hero mobile (patrimônio + ＋ Receita/Despesa), **4 KPIs com sparkline SVG inline** (patrimônio, receitas, despesas, taxa de economia), fluxo de caixa + lista de contas com total consolidado, triplo (orçamento por categoria · fatura com status de conciliação · card escuro da Anora), transações recentes + metas ativas. Conecta automaticamente no `ChartFluxo` se existir. |
| `dashboard-v4.css` | Classes dos componentes (`.kpi-grid`, `.kpi-card`, `.list-row`, `.prog-track`, `.dark-feature`, `.status-grid`, `.dash-grid-2/3`…) — **colar dentro do `@layer components` do `input.css` da Fase 1**. |

## Pontos de integração

1. **CSS**: append do `dashboard-v4.css` em `input.css` (dentro de `@layer components`), rodar `npm run build`.
2. **JS**: no `renderer.js` / `cmp-pages.js`, onde hoje se chama `DashboardComponents.*` para a view `Dashboard`, substituir por:
   ```js
   import { renderDashboardV4 } from './dashboard-v4.js';
   renderDashboardV4(document.getElementById('view'), { db, mes, ano });
   ```
   Os `data-action`/`data-page` dos botões (period, quick-receita, quick-despesa, Contas, Orcamento, Transacoes, Metas, Anora, Conciliacao) já seguem o padrão existente — o `evt-click.js` cuida deles (adicionar `period` se ainda não existir).
3. **Gráfico real**: o slot `#dash-chart-fluxo` chama `window.ChartFluxo.render(...)` se exposto; manter o `chart-fluxo.js` antigo.
4. **Service worker**: adicionar `dashboard-v4.js` ao `LOCAL_ASSETS` (offline).

## Dados usados (e onde tratar se faltarem)

- `db.transacoes`, `db.bancos`, `db.cartoes`, `db.orcamentos`, `db.metas`, `db.investimentos` — `InvestmentRepo` existe mas investimentos não eram listados no dashboard; somei em "patrimônio consolidado". Se o modelo de investimento tiver campo diferente de `valorAtual`/`aporte`, ajustar em `buildModel`.
- Trend dos KPIs: calculado vs mês anterior (`variacao`). O app já tem `calculateDashboardTrend` em `cmp-dashboard.js` — pode substituí-lo para manter a mesma fórmula.
- Estatísticas de conciliação da fatura (47/45/2) estão **hardcoded como placeholder** — conectar com `ReconciliationRepo` / `listInvoiceTransactions` em `reconciliation.js`.

## Testes a adicionar

- `renderDashboardV4` com db vazio → não quebra, mostra placeholders ("Sem orçamentos", "Nenhum lançamento").
- `buildModel` com transações → `calculatePeriodTotals` bate com o valor exibido.
- `sparkline` com <2 pontos → string vazia (sem erro).
- `progressBar` com limite 0 → 0% sem divisão por zero.

## Próximo (Fase 4)

Repetir o padrão para as demais páginas, uma por vez: **Transações** (usar a barra de filtros da Fase 2 + lista `list-row`), **Contas & Cartões**, **Metas & Reservas**, **Orçamento**, **Relatórios**, **Anora**. Em cada uma: manter a função de dados existente, trocar só o template.
