# Fase 4 — Redesign v4: página de Transações (Lançamentos)

Primeira página do "restante" aplicada no padrão v4: **dados existentes (`TransactionsRepo`, `financial-ledger`) + template novo**. Usa a barra de filtros da Fase 2.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `transacoes-v4.js` | `renderTransacoesV4(container, { db })`. Filtra por tab/busca/período/ordem (estado sincronizado com o evento `filtros:change` da Fase 2). Renderiza **tabela desktop** (checkbox, descrição, categoria badge, conta, data, status badge, valor) **e lista mobile** (list-row com ícone de categoria por tipo). Seleção múltipla → **barra de ações em lote** (mover categoria / excluir / limpar). Empty state + rodapé "Mostrando X de Y". Clique na linha emite `transacao:edit`. Ações em lote emitem `transacoes:delete-many` / `transacoes:batch-category` (conectam com `TransactionsRepo.deleteMultiple` / `updateCategories`). |
| `transacoes-v4.css` | `.data-table`, `.badge` (4 tons), `.category-icon`, `#bulk-bar`, `.empty-state`, `.table-footer` — colar no `@layer components` do `input.css`. |

## Decisões de design (alinhadas ao mockup)

- **Status derivado**: o app não tem campo `status` unificado; derivamos de `vencimento` (Pendente), `isTransfer`/`isInvoicePayment` (Transferência / Pagamento de fatura), senão Conciliado. Se o modelo ganhar campo `status` real, trocar só a função `statusOf`.
- **Badge de categoria** com cor por tipo (receita=success, transferência=info, despesa=neutral) — igual ao mockup.
- **Limite de render**: 100 linhas na tabela / 50 no mobile, com aviso no rodapé — evita travar em bases grandes. Para paginação infinita real, conectar com `TransactionsRepo.getByMonth`.
- **Re-render por seleção**: cada toggle de checkbox re-renderiza a página (estado interno). Para bases >1000 linhas, mover seleção para atributo DOM sem re-render.

## Integração

1. CSS no `input.css` → `npm run build`.
2. No `renderer.js`, view `Transacoes`: `renderTransacoesV4(document.getElementById('view'), { db })`.
3. A barra de filtros da Fase 2 deve ser injetada em `#filtros-slot` (ou junto da página) — o renderer já escuta `filtros:change`.
4. Ouvintes novos em `evt-click.js`: `transacao:edit` (abre modal de edição com o id), `transacoes:delete-many` → `TransactionsRepo.deleteMultiple(ids)`, `transacoes:batch-category` → abre seletor de categoria e chama `TransactionsRepo.updateCategories(ids, categoria)`.
5. Adicionar `transacoes-v4.js` ao `LOCAL_ASSETS` do service worker.

## Testes a adicionar

- `filtrar` com tab=Receita → só receitas; com busca → match em desc/categoria/conta.
- `statusOf`: vencimento futuro → Pendente; transferência → Transferência.
- Seleção: bulk-bar aparece com >0 selecionados; "limpar" zera.
- Empty state: lista vazia → mostra botão "＋ Adicionar".

## Próximas páginas (mesmo padrão)

- **Contas & Cartões**: lista `list-row` + saldo + cartão de fatura (reaproveita o card de fatura do Dashboard v4).
- **Metas & Reservas**: cards com progresso (reaproveita `.prog-track`).
- **Orçamento**: barras por categoria (reaproveita `progressBar`).
- **Relatórios**: abas + gráficos (mantém `chart-*.js`).
- **Anora**: card escuro (reaproveita `.dark-feature`) + chat.

Ao final: rodar `npm test` (247 testes) + `repository-hygiene` e validar claro/escuro/mobile.
