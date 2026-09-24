# Refinamentos 26–30 — contratos e validação

## 26 · Ação contextual do Dashboard

`getDashboardQuickAction(atual)` decide uma única CTA primária: contas vencidas navegam para `Agendamentos` com **Regularizar pendências**; sem vencimentos e com saldo global negativo abre `modal-transacao` como `receita` com **Registrar receita**; nos demais casos mantém o menu nativo de tipos **Novo lançamento**. Os caminhos usam os contratos delegados existentes (`navigate`, `openModal`) e os rótulos passam por `Utils.escapeHTML`. O speed dial móvel continua sendo o menu de tipos; não foi criado um segundo menu concorrente.

## 27 · Transações sem categoria

A contagem é calculada depois dos filtros normais, sem alterar a base. Considera categoria ausente, vazia ou igual a `Sem categoria` (sem distinção de maiúsculas/minúsculas). A ação `filterUncategorized` mantém o filtro como estado transitório (`uncategorizedOnly`) e estreita a lista; `clearUncategorizedFilter` restaura os resultados. `clearFilters` e qualquer filtro novo também limpam esse estado.

## 28 · Contexto por sessão

`view-context.js` usa exclusivamente `sessionStorage` com o prefixo `avenera:view:`. São preservados página de transações, aba/período de relatórios e período do planejamento. O carregamento valida cada valor e descarta contexto corrompido; falhas de storage são opcionais. Os filtros de transações continuam no `localStorage` existente e não são sobrescritos pelo contexto de sessão. Seleções de transações não são persistidas.

## 29 · Importação CSV/OFX

`import-errors.js` padroniza códigos como `IMPORT_EMPTY_FILE`, `CSV_INVALID_FORMAT` e `OFX_INVALID_FORMAT`. Parsing ocorre antes de qualquer gravação. Erros de leitura/formato exibem toast `role="alert"` pelo contrato de `Utils.showToast` e oferecem **Escolher outro arquivo**, que chama o picker existente (não há retry fictício). Mensagens genéricas não expõem exceções internas.

## 30 · Estimativas

`nv-estimated-badge` aparece somente nos sinais previstos do Planejamento e na projeção de cartões dos Relatórios, com `title` e nome acessível explicando que o valor não é realizado. Dashboard e Transações não recebem esse selo; o fluxo de caixa continua explicitamente baseado em movimentações reais.

### Validação disponível

Foi feita inspeção estática dos contratos e adicionados testes em `refinements-26-30.test.js`. O ambiente desta implementação não disponibiliza `npm`, `node` ou `npx`; portanto não foi executado Vitest, build Tailwind ou validação em navegador.
