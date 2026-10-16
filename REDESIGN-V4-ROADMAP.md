# Avenera — roadmap do redesign coordenado V4

## Objetivo

Usar o mockup interativo fornecido pela Maria como referência visual para o aplicativo real, aplicando uma base visual única às telas existentes sem trocar a camada de dados, as regras financeiras, rotas, formulários ou interações reais por exemplos do protótipo.

## Base auditada

- Branch-alvo: `redesign-v4-fase1`.
- Snapshot auditado: commit `0cf2e850488556314b133a9840ccdee245161ed7`.
- Referência visual: `media/1791913769333-fc05cc88.html`.
- A aplicação usa `router.js`, `renderer.js`, `rnd-pages.js`, `cmp-pages.js`, `cmp-dashboard.js`, componentes específicos e dados locais persistidos pelo `db.js`.
- O mockup é um protótipo isolado: seu aviso informa que os dados são fictícios e não há conexão com o banco real. Não importar as listas, valores, datas, handlers ou funções de navegação de demonstração.

## Status desta entrega (13/10/2026)

Esta versão **migra estrutura real de templates**, além da folha compartilhada. `renderer.js` envolve a saída dos renderizadores reais das 14 rotas em um canvas semântico `.nv-live-page` e organiza os blocos de página em uma composição vertical comum. `rnd-pages.js` reutiliza `renderPageHeader` nas telas Metas, Orçamento e Configurações; `cmp-dashboard.js` passa os indicadores reais a artigos semânticos; Relatórios e Anora expõem landmarks de composição. As regras de canvas/hierarquia foram adicionadas à folha runtime, com asset `20261013-layout-v3` e SW cache v25. O objetivo é afetar a estrutura e a hierarquia visível das páginas reais, e não deixar a migração só em aliases de tokens.

Foram preservados os roteadores, `PageRenderers`, `PageComponents`, esquema IndexedDB, dados reais, `data-action`/`data-payload`, formulários, modais, fluxos e cálculos. O mockup fornece referência visual apenas; nenhum dado, texto demonstrativo ou handler foi transplantado. A matriz desta entrega está abaixo.

**Validação visual ainda não aprovada:** não há Node/npm nem navegador local ligado ao projeto neste ambiente. Build, Vitest e Playwright não puderam ser executados; inspeção estática não demonstra como a composição se apresenta em execução. É necessário validar as 14 rotas, claro/escuro e breakpoints no projeto antes de considerar o redesign visual concluído. Nenhum commit, push ou merge foi feito.

## Escopo real

O `router.js` define 14 telas válidas. O mockup contém uma página adicional, **Investimentos**, que não existe como rota real; dados de investimentos já podem aparecer no Planejamento ou em relatórios. Não criar uma rota só para reproduzir a página demonstrativa.

| Rota real | Renderização principal | Dados reais | Ações/fluxos que devem permanecer | Referência do mockup e regra de integração |
|---|---|---|---|---|
| Dashboard | `PageRenderers.Dashboard` (`rnd-pages.js`), `DashboardComponents` (`cmp-dashboard.js`) | `db.transacoes`, `agendamentos`, `receitasFuturas`, `bancos`, `cartoes`, `comprasCartao`, `orcamentos`; cálculos de `Database`, `FinancialAnalytics` e `MentorEngine` | Período; calendário e dia; modais de lançamento; insights; prioridade de alertas; navegação; fechamento/simulação | `dashboard()`: preservar o conteúdo e os cálculos reais; não importar KPIs, datas, gráfico, contas ou eventos fictícios. Diferenciar saldo global de resultado do período. Tratar estado vazio de forma explícita e sem saldo duplicado. |
| Transações | `PageRenderers.Transacoes` (`rnd-pages.js`) e componentes em `cmp-pages.js` | `db.transacoes` e vínculos com contas, cartões, categorias e contatos | Seletor de Receita/Despesa/Transferência; filtros persistidos; busca, paginação, seleção, edição/exclusão, exportação CSV e importação OFX/CSV | `transactionsPage()`: usar apenas a hierarquia visual; preservar filtros, paginação e ações reais. O protótipo tem busca/ações próprias e novo lançamento com comportamento diferente. |
| Conciliação | `PageRenderers.Conciliacao` (`rnd-pages.js`), `cmp-pages.js`, `reconciliation.js` | `db.cartoes`, `db.conciliacoesFaturas`, transações de cartão | Abrir fatura; navegar ciclo; revisar ajustes; selecionar/editar/excluir itens; conciliar; registrar pagamento de fatura com conta escolhida e idempotência | `reconciliationPage()`: não copiar correspondências, volumes ou confiança de OFX fictícios. A rota real trata de conciliação de faturas de cartão. |
| Importação | `PageRenderers.Importacao` (`rnd-pages.js`), `OFXManager`/`CSVManager` e handlers reais | Arquivo local selecionado e dados do extrato associados à conta escolhida | Selecionar OFX/CSV; mapear/revisar; deduplicar; classificar; confirmar importação | `importPage()`: não copiar arquivo demo, prévia, contagens ou texto QIF. Os controles precisam continuar lendo arquivos reais. |
| Agenda | `PageRenderers.Agendamentos` e `PageComponents.agendamentosPage` (`cmp-pages.js`) | `db.agendamentos`, categorias e dados de fatura associados | Mês; criar agendamento; marcar pago; pagamento de fatura; exclusão elegível | `agendaPage()`: calendário e eventos de exemplo não substituem a agenda real. Não esconder linha para simular baixa: usar persistência e regras de pagamento reais. |
| Planejamento | `PageRenderers.Planejamento` (`rnd-pages.js`) | Orçamentos, transações, receitas futuras, agendamentos, assinaturas, investimentos, metas, reservas e bancos | Filtros de período, navegação, modais e detalhes expansíveis | `planningPage()`: preservar valores realizados/projetados identificados corretamente; não usar balanços do protótipo nem remover detalhes reais. |
| Metas | `PageRenderers.Metas` e `PageComponents.goalsPage` (`cmp-pages.js`) | `db.metas`, transações, reservas e bancos | Criar meta, aportar/reservar e excluir conforme regra | `goalsPage()`: progresso e totais são demonstração. Reserva virtual não reduz o saldo bancário e não pode ser contada duas vezes. |
| Orçamento | `PageRenderers.Orcamento`, `budgetView`/`budgetSummary` (`cmp-pages.js`) | `db.orcamentos`, `db.transacoes`, estado de mês/ano | Navegar mês; criar/editar/excluir limites; abrir planejamento | `budgetPage()`: barras e totais precisam vir das fontes reais; despesas realizadas não se misturam com projeções. |
| Relatórios | `PageRenderers.Relatorios`, `ReportComponents` (`cmp-reports.js`) | Dados reais processados por `FinancialAnalytics` e componentes de gráficos | Período, abas de fluxo/comparativo/cartões/patrimônio, exportação PDF | `reportsPage()`: não copiar série, valores ou handlers demo; preservar separação contábil de pagamentos de fatura e despesas. |
| Contas e cartões | `PageRenderers.Contas`, `PageComponents.accountsPage` (`cmp-pages.js`) | Bancos, cartões, transações, reservas e agendamentos | Criar/excluir conta/cartão; importar extrato; abrir fatura e pagamento; registrar despesa em cartão | `accountsPage()`: Itaú/Nubank, carteiras e saldos do protótipo são fictícios. Preservar o vínculo entre cartão e conta e as regras reais de fatura. |
| Contatos/Pessoas | `PageRenderers.Contatos`, `PageComponents.contatosPage` (`cmp-pages.js`) | `db.contatos` e transações associadas | Criar/excluir contato; abrir perfil/histórico real | `peoplePage()`/`contactProfilePage()`: não importar clientes, documentos ou histórico demonstrativo. O perfil atual é aberto pelo fluxo real do app. |
| Categorias | `PageRenderers.Categorias`, `PageComponents.categoriesPage` (`cmp-pages.js`) | `db.categorias` | Buscar/filtrar; criar/editar/arquivar/restaurar/excluir categorias personalizadas; respeitar categorias padrão protegidas | `categoriesPage()`: não copiar contagens/grupos fictícios. Preservar ícones e regras de leitura das categorias padrão. |
| Anora | `PageRenderers.Anora` e `renderAnoraPage` (`rnd-anora.js`) | `MentorEngine`, banco real e preferências locais | Estilo, perguntas sugeridas e envio de conversa pelo handler real | `anoraPage()`: insights e respostas fixas do protótipo não são análise financeira real. Preservar estado vazio/onboarding e respostas contextualizadas pelo app. |
| Configurações | `PageRenderers.Configuracoes`, `PageComponents.settingsPage` (`cmp-pages.js`) | Preferências, perfil e dados locais do app | Grupos expansíveis; tema; movimento reduzido; foto; backup; importação; preferências da Anora; ações sensíveis com confirmação | `settingsPage()`: não copiar perfil/conta fictícios, sincronização inexistente, idioma/moeda ou botões não persistentes do protótipo. |

## Matriz atualizada da migração de layout

Todas as rotas são compostas pelo canvas de `renderer.js` após seu renderizador real concluir a montagem. Os componentes abaixo marcam a composição particular mantida dentro desse canvas; ações existentes continuam sendo delegadas pelos eventos do app.

| Rota | Templates/componentes reais | Hierarquia/layout integrado | Ações preservadas (exemplos) |
|---|---|---|---|
| Dashboard | `PageRenderers.Dashboard`, `DashboardComponents` (`rnd-pages.js`, `cmp-dashboard.js`) | Cabeçalho/decisão, filtro, indicadores em artigos, contas e blocos de apoio | período, data, novo lançamento, fechar mês, simular, alertas e navegação |
| Transacoes | `PageRenderers.Transacoes`, componentes de transação (`rnd-pages.js`, `cmp-pages.js`) | Canvas comum + página de transações, KPIs, filtros/toolbar e lista | seletor de tipo, filtros, paginação, seleção, editar/excluir, importar/exportar |
| Relatorios | `PageRenderers.Relatorios`, `ReportComponents.reportsPage` (`rnd-pages.js`, `cmp-reports.js`) | Workspace `data-layout=analysis-workspace`, resumo, navegação de relatórios e análise | abas, períodos e exportação PDF |
| Planejamento | `PageRenderers.Planejamento` (`rnd-pages.js`) | Hierarquia aprovada da visão mensal, sinais, prioridade e painéis de decisão/detalhes | período, modais e navegação entre planejamento, orçamento, agenda e metas |
| Agendamentos | `PageRenderers.Agendamentos`, `PageComponents.agendamentosPage` (`rnd-pages.js`, `cmp-pages.js`) | resumo de status, período e lista de contas | mês, criar, dar baixa, pagar fatura e excluir conforme elegibilidade |
| Contas | `PageRenderers.Contas`, `PageComponents.accountsPage` (`rnd-pages.js`, `cmp-pages.js`) | resumo e portfólio real de bancos/cartões | criar/remover, importar, ver faturas e pagar na conta correta |
| Contatos | `PageRenderers.Contatos`, `PageComponents.contatosPage` (`rnd-pages.js`, `cmp-pages.js`) | resumo real e lista/perfil integrado | busca, criar/excluir e abrir histórico associado aos dados reais |
| Metas | `PageRenderers.Metas`, `PageComponents.goalsPage` (`rnd-pages.js`, `cmp-pages.js`) | Cabeçalho compartilhado + painel de metas/reservas | criar meta, reservar/aportar conforme regras e excluir elegível |
| Orcamento | `PageRenderers.Orcamento`, `PageComponents.budgetView` (`rnd-pages.js`, `cmp-pages.js`) | Cabeçalho compartilhado + painel de limites por categoria | orçamento inteligente, definir limite e edição/navegação existentes |
| Categorias | `PageRenderers.Categorias`, `PageComponents.categoriesPage` (`rnd-pages.js`, `cmp-pages.js`) | Cabeçalho, seções e filtros de gestão | buscar/filtrar; editar, arquivar/restaurar/excluir categorias personalizadas; padrão protegida |
| Conciliacao | `PageRenderers.Conciliacao`, fluxo da fatura (`rnd-pages.js`) | Cabeçalho compartilhado e resumo baseado nos cartões/lançamentos reais | conferir fatura, ajustes, navegação de ciclo e pagamento idempotente |
| Importacao | `PageRenderers.Importacao` (`rnd-pages.js`) | Cabeçalho compartilhado e opções de ingestão local | escolher OFX/CSV, revisar/deduplicar/classificar e confirmar importação real |
| Anora | `PageRenderers.Anora`, `renderAnoraPage` (`rnd-pages.js`, `rnd-anora.js`) | Insights laterais reais + conversa e composição `data-anora-page` | estilo, sugestões/perguntas e envio pelo handler real |
| Configuracoes | `PageRenderers.Configuracoes`, `PageComponents.settingsPage` (`rnd-pages.js`, `cmp-pages.js`) | Cabeçalho compartilhado + grupos de configuração reais | perfil, tema, preferências, foto, backup, importação e ações sensíveis |

A classe de rota (`nv-live-page--<slug>`) e `data-live-route` são emitidas em runtime para as 14 rotas da lista. Não existe slug/canvas adicional de Investimentos.

## Sistema visual comum

Adotar o mockup e o shell V4 como referência visual comum para todas as rotas:

- Paleta neutra fria com acento violeta, cores semânticas acessíveis e tema escuro equivalente.
- Tipografia de interface neutra; Fraunces apenas como destaque editorial; valores com algarismos tabulares.
- Escala deliberada de raios `8/10/12/16/20px`; sombras apenas em superfícies flutuantes/elevadas.
- Um contrato compartilhado de cabeçalho, ações, painel, card, controles, tabelas/listas, badges e estados vazios, preservando a hierarquia e as exceções funcionais de cada página.
- Navegação da V4, grupos recolhíveis, tela atual expandida, acesso direto às rotas e dock mobile mantidos.
- O mockup usa `#content`, `data-page` e listeners próprios. O app real usa `#main-content`, `data-action`/`data-payload`, handlers delegados e modais injetados. Não substituir esses contratos.
- O conteúdo real é renderizado fora de `.nv-v4-scope`, enquanto hoje os tokens base de `input.css` diferem dos tokens V4 em superfícies, tema escuro, tipografia e escala de raio. A integração deve unificar esses valores sem expor todas as classes utilitárias Tailwind do V4 ao conteúdo de página.

## Plano de implementação coordenada

1. **Contratos e baseline** — fixar o snapshot da branch; inventariar seletor/ação/dados por rota; registrar os componentes aprovados de Planejamento/Relatórios e os invariantes financeiros.
2. **Base única de tokens** — definir fonte canônica de paleta, tipografia, espaçamento, raios, sombras e estados para claro/escuro; alinhar V4 e páginas com aliases, retirar duplicações conflitantes e manter o escopo Tailwind isolado.
3. **Shell e primitivas comuns** — alinhar cabeçalho, navegação, painel, cards, ações, formulários, badges, listas/tabelas e estados vazios. Manter IDs, roteador, `data-action`, forms, modais e FAB/dock reais.
4. **Integração de todas as 14 telas** — aplicar a base compartilhada em um conjunto coordenado de renderizadores, ajustando densidade/hierarquia sem transformar todas as telas em cópias do Dashboard nem remover fluxos próprios.
5. **Regressão conjunta** — build principal e V4, testes unitários/contratos, inspeção real no navegador em todas as rotas, temas e larguras; correções até o conjunto ficar consistente. Entregar um único pacote de redesign para validação antes de qualquer merge.

## Critérios de aceite

- Todas as 14 rotas usam a mesma paleta, tipografia, escala de raios, estados e componentes compartilhados; diferenças são intencionais e documentadas, não acidentais.
- Nenhuma rota, ação ou função financeira é substituída por handler fictício. A tela Investimentos do mockup não vira rota sem decisão funcional explícita.
- O Dashboard não repete o mesmo saldo, distingue saldo global de resultado filtrado e comunica estado vazio sem sugerir dado calculado inexistente.
- Claro/escuro, desktop/tablet/celular, conteúdo preenchido/vazio, valores longos, tabelas, menus, modais, teclado e acessibilidade são verificados visualmente.
- Build/testes e inspeção visual são registrados separadamente. Teste estático não conta como prova visual.
- Preservar dinheiro: transferências não são receitas/despesas; reservas de metas são virtuais; pagamento de fatura é idempotente e usa conta correta; ciclos de fatura/data/importações/persistência não regressam.
- Sem apagar armazenamento ou dados reais. Nenhum commit, push ou merge feito pela assistente. A usuária valida o pacote antes de aprovar merge.

## Validação disponível e limitações atuais

- O snapshot auditado é o arquivo público baixado pelo hash do commit listado acima; não possui metadados Git locais.
- Neste ambiente, `node`/`npm` não estão instalados. Portanto ainda não foram executados Vitest, builds Tailwind ou Playwright; nenhuma aparência pode ser declarada aprovada até esses passos rodarem num ambiente com os recursos do projeto.
- Os relatórios de auditoria foram estáticos. São úteis para mapear contratos, mas não comprovam clique, camadas/z-index, cache/service worker ou aparência em navegador.
