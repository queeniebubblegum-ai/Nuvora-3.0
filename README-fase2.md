# Fase 2 — Redesign v4: modal de lançamento + filtros

Entregues a partir do mockup `avenera-mockup-completo-v4.html`. Requer a Fase 1 (`input.css` + `tailwind.config.v4.js`) aplicada.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `modal-transacao-v4.html` | Markup do modal fiel ao mockup: toggle Receita/Despesa/Transferência, valor com prefixo R$, erro inline (`#tx-amount-error`), descrição com hint, categoria (combobox), conta, pessoa, vencimento, recorrência, **prévia ao vivo** (`#tx-preview`), rodapé Cancelar/Salvar. Inclui campos escondidos com IDs antigos (`edit-*`, `dc-*`) = **adaptador de compatibilidade**. |
| `modal-transacao-v4.js` | Controller: `parseBRL` robusto (corrige o bug do `parseFloat`), máscara leve, validação inline + habilita/desabilita submit, toggle de tipo, recorrência, combobox de categoria com busca e "criar nova", popular selects de conta/pessoa a partir de `db`, prévia ao vivo, emite `CustomEvent('transacao:submit')` e sincroniza o adaptador. Expõe `window.ModalTransacaoV4.open()`. |
| `filtros-bar-v4.html` | Barra unificada: tabs (Todas/Despesas/Receitas/Pendentes), busca com debounce, seletor de período, Ordenar (cicla 4 modos), Exportar, chips de filtros ativos. Emite `filtros:change` / `filtros:export` e integra com `TransactionFilters` se existir. |

## Bugs corrigidos nesta fase

1. **`parseFloat` em input BRL** (`ctrl-transacoes.js`) — o novo `parseBRL` aceita `1.234,56`, `1234.56`, `R$ 1.234,56` e devolve número correto. (Antes: `1.234,56` virava `1.234`.)
2. **`Math.abs` silencioso** — o sinal agora deriva do toggle de tipo, nunca de inverter o valor digitado.
3. **Validação zero feedback** — submit fica desabilitado até valor>0, descrição, data e categoria válidos; erro inline em tempo real.
4. **IDs de data com drift de fuso** — `hojeLocal()` monta `YYYY-MM-DD` no fuso do usuário (não `toISOString`).

## Integração passo a passo

1. Injetar o markup de `modal-transacao-v4.html` no fim do `<body>` (substitui o modal antigo em `cmp-modals.js` — manter o adaptador escondido).
2. Carregar `modal-transacao-v4.js` como módulo depois de `db.js` (para ler `db.bancos/cartoes/contatos`).
3. Conectar o FAB e botões `data-action="new-transaction" / quick-receita / quick-despesa` — o script já escuta esses atributos e chama `ModalTransacaoV4.open()`.
4. Ouvinte de `transacao:submit` (novo fluxo) **ou** manter o `evt-submit.js` antigo: ele lê os campos `edit-*`/`dc-*` que o adaptador preenche. Os dois podem coexistir.
5. Em `cmp-pages.js` / `rnd-pages.js`, na página Transações, substituir a barra de filtros antiga por `filtros-bar-v4.html`; ouvinte de `filtros:change` → aplicar em `TransactionsRepo`/`transaction-filters.js`.
6. Adicionar ao `service-worker.js` (LOCAL_ASSETS): `modal-transacao-v4.js` (e quaisquer novos módulos) — senão quebra offline.

## Contrato do evento `transacao:submit`

```js
{ tipo, valor (number, positivo), desc, categoria, bancoId, isCartao,
  data (YYYY-MM-DD local), vencimento|null, contatoId|null,
  recorrente (bool), frequencia, origem: 'modal-v4' }
```

## Testes a adicionar (vitest, no estilo existente)

- `parseBRL` bateria: `1.234,56 → 1234.56`, `R$ 10` → 10, `abc` → NaN, vazio → NaN, negativo.
- Validação: submit desabilitado com valor 0/vazio; habilitado com campos válidos.
- Prévia: texto reflete tipo/valor/descrição/categoria.
- Adaptador: após submit, `#edit-valor` etc. estão preenchidos.

## Próximo (Fase 3)

Aplicar o visual v4 nas páginas existentes (Dashboard, Contas, Cartões, Metas, Orçamento, Relatórios, Anora) — uma por vez, com os testes de regressão rodando.
