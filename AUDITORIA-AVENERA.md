# Avenera — auditoria da experiência financeira e plano de melhorias

Data: 21/10/2026. Referência de horário: America/Cuiaba. Repositório: `queeniebubblegum-ai/Nuvora-3.0`, commit `f872c622624ebc346c772af013c668096af02d9b`.

**Direção de produto:** “Uma nova era para suas finanças.” / “Não basta registrar. A Avenera ajuda você a conferir.”

**Status da entrega:** auditoria e propostas para aprovação. Nenhuma alteração no aplicativo, nos testes existentes, nas dependências declaradas ou nos arquivos versionados. Os roteiros desta auditoria e seus resultados estão fora do checkout, em `/workspace/avenera-audit`. Não representam funcionalidades implementadas.

## Método, evidências e limites

Foram examinadas as 15 rotas registradas em `router.js`, seus componentes, formulários, eventos, persistência, cálculos, importação, backup, relatórios e testes. As páginas públicas de privacidade, termos e suporte também foram lidas.

- **Navegador:** Chromium instalado, em contextos descartáveis e com dados sintéticos. Foram capturadas 120 combinações: 15 telas × quatro larguras (1440, 768, 400 e 375 px) × dois estados (vazio e preenchido). Não houve transbordamento horizontal do documento nessas capturas. Isso não certifica todos os conteúdos, tabelas internas, zoom ou dispositivos reais.
- **Acessibilidade:** axe-core nas 15 telas preenchidas a 375 px e no formulário de lançamento. Encontrou quatro tipos de violação, descritos em F. Não substitui avaliação com leitor de tela, teclado completo e pessoas com deficiência.
- **Regressão existente:** `TZ=America/Manaus npm test -- --maxWorkers=2 --minWorkers=1`: **307 testes passaram; um falhou**, em 62 arquivos. A falha é a leitura de `gitignore.txt`, ausente no checkout. Na preparação anterior, executar com o fuso UTC também revelou dependência do fuso em um teste; iniciar o processo em UTC−4 resolveu essa falha específica.
- **Sondas financeiras:** cenários independentes exercitaram o código real de dados e controladores no navegador. Chamadas diretas aos repositórios verificam suas garantias; não são apresentadas como prova de que um usuário percorreu exatamente aquele caminho por cliques. A concorrência de pagamentos foi reproduzida com duas invocações simultâneas do controlador.
- **Rede:** fontes, ícones e biblioteca de PDF externos foram bloqueados pela política do ambiente. Chart.js falhou no Chromium por confiança do certificado (`ERR_CERT_AUTHORITY_INVALID`), embora a obtenção com curl, com TLS verificado, tenha funcionado e o SHA-384 corresponda ao HTML. Houve quatro erros `Chart is not defined` ao renderizar relatórios com dados. Não desativei TLS ou SRI. Ausência de ícones/fontes nessas capturas é uma limitação ambiental; a falta de tratamento quando a biblioteca não carrega é um risco de resiliência do produto.
- **Escopo humano:** não houve pesquisa com usuários, cronometragem de tarefas humanas, teste em banco real, integração bancária, avaliação jurídica ou certificação de segurança. Não se alegam ganhos de tempo, engajamento ou precisão ainda não medidos.

Classificação usada: **O** = comportamento observado/reproduzido; **C** = constatado na implementação inspecionada; **H** = hipótese a validar com usuários; **R** = recomendação, ainda não aprovada. Os arquivos JSON e logs no fim do documento permitem separar essas categorias.

## A. Diagnóstico executivo

**A Avenera já tem uma base funcional ampla para registrar e planejar, mas ainda não sustenta de forma consistente a promessa de conferir.** O maior risco não é visual: a interface pode afirmar que algo está conciliado sem evidência, e determinados caminhos podem duplicar pagamentos, antecipar impactos no caixa ou perder alterações entre abas.

Há fundamentos que devem ser preservados: operações monetárias centesimais compartilhadas; parcelamento que conserva o total; transferências com duas pernas persistidas juntas; exclusão protegida de conta com histórico; rollback em transações comuns; importação com revisão; backup versionado; filtros persistentes; distinção textual entre reservas virtuais e saldo bancário; previsões identificadas como estimativas; e Anora apresentada como assistente local. Na amostra, uma compra de R$ 100 em três parcelas gerou R$ 33,34 + R$ 33,33 + R$ 33,33 sem debitar a conta. Uma transferência de R$ 100,01 preservou o saldo consolidado de R$ 1.200.

As prioridades são:

1. Impedir perda de lançamentos entre abas e duplicidade de pagamentos simultâneos.
2. Garantir confirmação durável de toda alteração financeira.
3. Corrigir significados de saldo, consumo, caixa, fatura e conferência.
4. Transformar a conciliação em uma atividade verificável, retomável e rastreável.
5. Simplificar formulários e navegação preservando precisão, acessibilidade e contexto.

**Não recomendo ampliar o produto ou iniciar um redesenho visual amplo antes desses ajustes.** A lógica Registrar → Conferir → Compreender pode orientar a experiência existente, sem exigir três novas telas.

## B. Mapa das jornadas atuais

As etapas abaixo são **ações de navegação, expansão ou confirmação**, a partir da tela citada, sem contar digitação e seleção de cada campo. São percursos de referência identificados na interface e no código, não médias de usuários. Pré-requisitos, validações e escolha de outro período podem acrescentar ações. “Obrigatório” distingue validação HTML de exigência no controlador.

| Jornada | Percurso atual e etapas de referência | Dados e pré-requisitos | Situação e principal oportunidade |
|---|---|---|---|
| Registrar receita | Visão geral: Novo lançamento → Receita → Salvar; 3 ações | Descrição, valor e data no HTML; conta válida no controlador; categoria selecionável | Formulário compartilhado; agrupar opções adicionais e apresentar resumo do que foi salvo. |
| Registrar despesa à vista | Novo lançamento → Despesa → Salvar; 3 | Mesmos campos; conta; forma de pagamento; pessoa opcional | Oito controles visíveis na amostra, incluindo categoria em dois níveis e pessoa; avaliar cinco dados essenciais primeiro. |
| Transferir valores | Novo lançamento → Transferência → Salvar; 3 | Origem, destino diferentes, valor positivo, data; descrição opcional | Formulário específico de cinco controles; preservar operação única com duas pernas. |
| Cadastrar conta | Contas e cartões: Adicionar → Conta → Salvar; 3 | Instituição, nome e saldo inicial; tipo com padrão | Falha de armazenamento pode ser ocultada pelo caminho de persistência. Não acrescentar automação antes de resolver isso. |
| Cadastrar cartão | Adicionar → Cartão → Salvar; 3 | Conta vinculada, nome, limite, fechamento, vencimento; modelo e final opcionais | Sete controles; sem conta, há encaminhamento ao pré-requisito. O final salvo como `final` não aparece no resumo que lê outros nomes de campo. |
| Compra no crédito | No cartão: Lançar despesa → Registrar; 2 | Cartão contextual, descrição, valor total e data; parcelas, juros e categoria | Fluxo dedicado é mais direto; o formulário geral exige escolher forma de pagamento e cartão. Unificar regras entre entradas. |
| Compra parcelada | Mesmo fluxo; selecionar parcelas antes de registrar | Total, quantidade, data; juros se aplicáveis | Formulário dedicado oferece 3/6/18/24/36 e quantidade personalizada; geral oferece 1/2/12. Edição atual atua na parcela, sem revisão explícita da compra completa. |
| Consultar fatura | Contas e cartões: Abrir fatura; 1 | Cartão; navegação por ciclo/mês na janela | Há abas Resumo, Compras e Ajustes; preservar ciclo e separar status de pagamento e de conferência. |
| Registrar pagamento | Registrar pagamento da fatura → Registrar pagamento; 2, além da escolha de fatura/conta/data | Conta válida e data; valor vem da fatura, sem campo de pagamento parcial | Explica corretamente que não inicia transferência bancária. Caminho sequencial evita repetição; simultâneo não. |
| Conferir saldo de conta | Contas e cartões mostra saldo e origem local | Conta e registros locais | Não encontrei jornada equivalente à conciliação de faturas para informar referência bancária e concluir conferência de conta. Não confundir auditoria interna de saldo com referência da instituição. |
| Conciliar fatura | Conciliação → Conferir fatura → informar total/ajustes → salvar | Cartão, período e total informado manualmente | A comparação é agregada; não confirma correspondências individuais. Total igual já resulta em “conciliada”. |
| Corrigir lançamento | Transações: Editar → Salvar; 2 | Descrição, valor, data, categoria/pessoa | Atualiza saldo, mas não oferece trilha de antes/depois. Mudança de compra parcelada precisa definir escopo. |
| Consultar histórico | Transações; busca direta ou Mais filtros | Descrição/referência, categoria, conta/cartão, mês e intervalo de datas | Ordem decrescente; filtros persistem. Mês sem ano e ausência de filtro específico de conferência prejudicam interpretação. |
| Criar recorrência | Lançamento → Detalhes avançados → Repetir mensalmente → Salvar; duas ações adicionais ao lançamento simples | Valor por ocorrência, conta, data e quantidade de meses | Primeira ocorrência e previsões futuras compartilham fronteira atômica nesse caminho. Explicar que repetição não divide um valor total. Agenda também cria séries. |
| Consultar futuro | Planejamento: resumo, projeção e detalhes; Agenda: vencimentos | Compromissos, receitas previstas, parcelas e assinaturas registradas | Existem estimativas e detalhamento; verificar sempre se são previsões ou dinheiro efetivamente movimentado. |

## C. Auditoria de eficiência

| Constatação | Consequência | Simplificação proposta | Validação antes/depois |
|---|---|---|---|
| O/C: lançamento geral mostra pessoa, forma de pagamento e dois seletores de categoria desde o início | Exige mais leitura para uma despesa simples; o tempo adicional é hipótese | Valor, descrição, conta/cartão, data e categoria; demais informações em opções progressivas | Mesmas tarefas e dados; medir conclusão, tempo mediano/p90, erros e correções. |
| C: categoria tem sugestão por descrição, palavras-chave e aprendizado local | Há automação aproveitável; falta padronizar a explicação e o controle | Mostrar “Categoria sugerida pelo seu histórico”, permitir corrigir/desativar e não alterar registros antigos | Testar aceitação, correção e ausência de alteração retroativa. |
| O/C: compra via formulário geral e via cartão têm opções de parcelas diferentes | A mesma intenção tem capacidades distintas | Mesmo modelo e validador; cartão contextual pode dispensar escolha prévia de conta na interface | Executar compra de 3 parcelas pelas duas entradas e comparar os resultados. |
| O: parte inferior do formulário exige rolagem em 375 px; rodapé de ação permanece disponível | Mais campos competem com o teclado virtual | Detalhes progressivos, foco previsível e resumo do impacto antes de salvar | Testar dispositivos reais com teclado aberto e texto ampliado. |
| C: controladores de lançamento inserem espera de 350 ms antes da operação | Tempo artificial e janela adicional de interrupção | Estado de processamento ligado à operação real; retirar atraso somente com avaliação de feedback | Medir latência percebida e manter proteção contra repetição. |
| C: mensagens de sucesso de despesa/receita são genéricas | Não confirmam conta, valor e data no próprio feedback | “Despesa de R$ 45,90 registrada em Conta X em 21/10. Não conferida. Ver lançamento.” | Usuário deve identificar impacto e encontrar o registro após o feedback. |
| O: pagamento não permite informar valor parcial | Obriga contorno fora da jornada ou registro incorreto | Pagamento com valor, data e conta; saldo devedor remanescente explícito | Regressão de integral, parcial, múltiplos pagamentos, estorno e repetição. |
| O: busca por mês reúne anos distintos | Pode parecer que o histórico contém valores do mês atual quando inclui anos anteriores | Mês/ano explícitos, período livre e resumo dos filtros ativos | Localizar dois lançamentos de outubro em anos diferentes, sem ambiguidade. |
| C: filtro de conta/cartão separa identificador por `_` | IDs com `_` podem ser truncados | Preservar o ID completo, sem conversão ou separação destrutiva | Caso com ID `conta_principal_1`. Ainda não reproduzido em navegador. |
| C: exclusão individual de compra parcelada reúne o grupo; seleção em lote pode remover só parcelas selecionadas | Escopo destrutivo varia com o ponto de entrada | Explicar “esta parcela / parcelas futuras / compra completa” antes de executar | Prévia de quantidade, valor e faturas afetadas; verificar desfazer. |

**Sugestões a pesquisar, sem aprovação de funcionalidade:** descrições frequentes; conta/cartão sugeridos por contexto e uso; detecção de recorrência. Datas já são preenchidas inicialmente. Toda sugestão deve identificar sua origem, aceitar correção e exigir confirmação para criar movimentação. Não se propõe categorização irreversível nem importação automática silenciosa.

## D. Auditoria de organização, navegação e visualização

### Inventário das telas

| Tela atual | Papel encontrado | Avaliação e direção |
|---|---|---|
| Visão geral | Resumo, fluxo de seis meses, contas/cartões, orçamento, Anora, recentes e agenda | Hierarquia começa com patrimônio, receitas, despesas e taxa de economia; pendências não são o eixo principal. Remover estados falsos antes de reorganizar cards. |
| Transações / Lançamentos | Histórico, pesquisa, filtros, ações individuais e em lote | Boa base de recuperação. Uniformizar nome e diferenciar resultado do período de saldo bancário. |
| Contas e cartões | Saldos, reservas, crédito, cartões e acesso à importação/fatura | Crédito está separado do dinheiro. Indicadores de faturas em aberto e limite não refletem corretamente pagamento no caso reproduzido. |
| Conciliação | Comparação de faturas por total e ajustes | Título amplo para capacidade atualmente limitada a cartões. Indicar escopo e evoluir conferência de contas sem simular conexão. |
| Importar extrato | Entrada OFX/CSV, conta, prévia e revisão | Revisão explícita é positiva; origem, duplicatas e retomada precisam de garantias melhores. |
| Planejamento | Projeção diária, receitas previstas, compromissos, orçamento, metas e detalhes | Estimativas identificadas. Diferenciar claramente dinheiro hoje de projeção após compromissos. |
| Agenda de contas | Calendário e vencimentos/pagamentos/recebimentos | Útil para realização de previsões. Corrigir semântica acessível do calendário. |
| Relatórios | Fluxo, comparativo, cartões e patrimônio | Há períodos, fonte e tabelas em parte da experiência. O relatório de caixa usa definição de consumo; dependência externa pode quebrar o gráfico. |
| Investimentos | Posições, aportes, custo informado, evolução e distribuição | Explica cadastro manual e que aporte não transfere automaticamente dinheiro. Manter essa honestidade. |
| Pessoas | Contatos e vínculos com movimentações | Recurso auxiliar; não deve competir com conferir saldo/fatura no caminho principal. |
| Metas e reservas | Objetivos e alocações virtuais | Explica que reserva permanece na conta; preservar separação entre alocação e transferência. |
| Orçamento | Limites por categoria e realizado | Coexiste com Planejamento; avaliar entrada contextual em vez de duplicar prioridades de navegação. |
| Categorias | Grupos/subgrupos, busca, organização e regras locais | Potente para classificação; evitar exigir estrutura detalhada no primeiro lançamento. |
| Anora | Conversa e recomendações locais | Origem local é clara. Modo “Foco Extremo” e linguagem prescritiva conflitam com a personalidade solicitada. |
| Configurações | Perfil, aparência, dados, segurança e Anora | Explica armazenamento local e backup. “Proteção local: Ativa” não deve sugerir criptografia ou proteção bancária não demonstrada. |

**O:** no mobile já há navegação inferior para Início, Lançamentos, Agenda e Contas, além de ação central. Conciliação depende do menu/acesso contextual. **H:** conferir tende a ser difícil de descobrir quando concorre com todas as opções laterais; precisa de teste de encontrabilidade, não de afirmação de frequência de uso.

**R — arquitetura candidata:** preservar Visão geral, Transações, Contas e cartões, Conferência, Planejamento, Relatórios e Configurações como destinos compreensíveis. Agenda, metas e orçamento podem continuar acessíveis por planejamento e atalhos contextuais; categorias e pessoas como organização auxiliar. Investimentos e Anora não precisam ser removidos. A posição final depende de tarefas observadas, especialmente no mobile.

**R — dashboard orientado a perguntas:** saldo registrado com origem e atualização; compromissos definidos; estimativa após compromissos com horizonte; pendências de conferência; faturas e vencimentos; movimentações recentes. Mostrar “Não conferido” quando não há evidência. Não somar limite de crédito ao dinheiro. Distinguir total registrado de resultado das transações filtradas. Permitir consultar fórmula e registros que compõem cada valor.

**R — gráficos com propósito:** consumo por categoria responde “onde gastei”; caixa responde “quando o dinheiro entrou/saiu”; compromissos futuros respondem “quanto já está previsto”. Cada um deve ter período, BRL, fonte, tabela equivalente, estado vazio, indicação de dados incompletos e comportamento quando a biblioteca gráfica não carrega. Não adicionar gráficos para preencher cards.

**C:** seis folhas de estilo locais compõem a página, além de estilos utilitários e recursos externos. A combinação é um risco de manutenção, não prova isolada de defeito visual. A linguagem de marca no shell ainda inclui “organize sua vida”, diferente do slogan fornecido. Há ações pequenas e repetição de títulos/ações entre topbar e conteúdo; reduzir redundância é hipótese de UX a validar. Capturas sem fontes/ícones externos não permitem aprovar a aparência final.

## E. Auditoria financeira

| ID | Evidência atual | Impacto e interpretação |
|---|---|---|
| F01 | **O/C:** contas recebem “Conciliada” no dashboard sem registro de conferência; transações sem status recebem “Conciliado” | A apresentação promete verificação que não aconteceu. Reproduzido com conta recém-semeada e nenhuma conciliação. Fontes: `cmp-dashboard.js:453` e `:474`. |
| F02 | **O/C:** total informado igual ao registrado define fatura “conciliada”; diferença de R$ 0,01 também passa | Igualdade agregada não confirma correspondências, completude ou origem. `reconciliation.js:74`. Zero informado com lista vazia também produz esse status. |
| F03 | **O:** duas chamadas simultâneas de pagamento de R$ 100 retornaram sucesso e criaram o mesmo ID duas vezes; saldo R$ 1.000 → R$ 800 | Perda de integridade por dupla aplicação. A validação ocorre antes da fila atômica; o repositório de lançamentos aceita IDs repetidos. `app.js:573`, `db.js:738`. |
| F04 | **O:** registrar uma tarifa de fatura de R$ 35 como lançamento baixou saldo R$ 1.000 → R$ 965 antes de pagar a fatura | Ajuste de obrigação vira saída bancária imediata. Para fechamento 25 e vencimento 5, ciclo de outubro, o registro foi datado em 05/10 em vez do vencimento de 05/11. `db.js:926`. |
| F05 | **O:** estorno explicativo convertido em lançamento elevou banco R$ 1.000 → R$ 1.020 e receitas em R$ 20 | Um crédito na fatura não comprova depósito bancário nem renda nova. Distinguir crédito da obrigação de restituição efetivamente recebida. Testes atuais de ajustes esperam esse comportamento, portanto passar nessa suíte não demonstra correção do modelo proposto. |
| F06 | **O:** compra de R$ 100 em outubro aparece como saída de outubro no modelo de “Fluxo de Caixa”; pagamento de R$ 100 em novembro resulta em saída zero em novembro | O modelo acompanha consumo, não caixa efetivo. `report-data.js:13`. O razão que exclui pagamento do consumo é útil, mas não deve servir sozinho ao relatório de caixa. |
| F07 | **O/C:** após pagar integralmente R$ 100, o banco baixou corretamente para R$ 900, mas a tela continuou com R$ 100 “em aberto” e crédito disponível R$ 2.900 de R$ 3.000 | Indicadores somam compras sem considerar liquidação. Separar fatura original, valor pago, saldo devedor e estimativa de limite; disponibilidade real da instituição não foi consultada. `cmp-pages.js:34`, `:123`; dashboard também soma histórico de compras. |
| F08 | **O/C:** dois lançamentos idênticos com o mesmo ID foram aceitos pelo repositório e debitados duas vezes | SubmitGuard protege determinados formulários, mas não fornece unicidade na persistência. Separar clique repetido, reexecução da mesma operação e duas despesas reais semelhantes. |
| F09 | **O/C:** importação OFX funcionou para conta numérica; para `bank-string`, gravou `bancoId: NaN` e não baixou o saldo | Conversão `Number(bancoId)` quebra vínculos suportados em outras áreas. `ofx.js:294`. Auditoria de integridade indicou aviso, sem bloquear a gravação. |
| F10 | **O/C:** receita de R$ 10 no extrato foi sugerida como duplicata de despesa de R$ 10, mesma descrição e data; veio desmarcada | Heurística compara magnitude, janela de dois dias e palavras, sem exigir a mesma direção. É corrigível pela seleção, mas pode induzir omissão. FITID do arquivo de teste não foi preservado no código de referência desse caminho. `ofx.js:116`, `util-finance.js`. |
| F11 | **O:** editar a primeira parcela de R$ 33,34 para R$ 40 deixou R$ 40 + R$ 33,33 + R$ 33,33, total R$ 106,66 | Editar parcela isolada pode ser legítimo; falta explicitar escopo e preservar total original da compra para conferência. Não se deve redistribuir parcelas silenciosamente. |
| F12 | **O/C:** cálculo com fechamento alterado de 25 para 15 moveu a compra de 18/10 para outro ciclo | O período depende do cadastro atual. Não foi encontrada e percorrida uma edição de fechamento pela UI; trata-se de risco demonstrado na função de cálculo, não de ação humana observada. Exige política de efeito futuro e preservação histórica antes de oferecer edição. |
| F13 | **O:** excluir o único lançamento de uma fatura conciliada mudou o resultado agregado para “diferença encontrada” | Recalcular é positivo, mas não há histórico durável da conferência e da alteração. Exclusão individual e em lote têm comportamentos distintos. |
| F14 | **O:** filtro “Outubro” exibiu registros de outubro de 2025 e de 2026 | Mês sem ano torna o conjunto ambíguo; faixa de datas existe como alternativa. `rnd-pages.js:411`. |

### Definições financeiras a aprovar

O modelo deve separar **consumo**, **obrigação**, **caixa** e **conferência**. Não se propõe apagar ou converter automaticamente o histórico atual.

- **Saldo registrado:** saldo inicial validado + entradas bancárias realizadas − saídas bancárias realizadas. Transferências afetam contas individuais, sem criar receita/despesa consolidada. A regra de ancoragem por extrato precisa ser preservada na migração para evitar contagem dupla.
- **Saldo informado pela instituição:** valor de referência, origem e data-base. Dado digitado deve dizer “informado por você”; extrato deve indicar arquivo/instituição/data disponíveis. Sem conexão bancária presumida.
- **Conferência de saldo:** diferença em centavos = referência na data-base − saldo registrado calculado na mesma data. Diferença zero não demonstra, sozinha, que todos os itens foram conferidos.
- **Reserva virtual:** parcela do saldo destinada a meta, sem aumentar patrimônio ou transferir dinheiro. “Disponível após reservas” já tem esse significado específico; não renomear como disponibilidade completa sem considerar compromissos.
- **Disponível estimado:** saldo registrado − reservas − compromissos pendentes do horizonte declarado; se incluir receitas previstas, explicitar isso e o risco. Evitar descontar duas vezes compra, fatura e pagamento.
- **Compra no cartão:** consumo e obrigação da compra/faturas; não baixa dinheiro bancário imediatamente. Preservar valor original, centavos, parcelas e identificação da compra.
- **Pagamento de fatura:** saída de caixa e redução de obrigação; não cria novo consumo. Parcial reduz apenas o saldo devedor correspondente.
- **Estorno:** crédito vinculado à compra/obrigação; só afeta caixa se houver restituição efetiva para uma conta. Definir apresentação no consumo, inclusive se compra e estorno ocorrerem em períodos distintos.
- **Fatura:** valor original, ajustes explícitos, pagamentos e saldo devedor são campos/conceitos distintos. Usar ciclos de fechamento e datas de vencimento consistentes.
- **Limite disponível estimado:** limite cadastrado menos comprometimento conforme regra aprovada de compras e pagamentos; não afirmar que é limite confirmado pelo emissor. Política de liberação pode variar por instituição.

## F. Auditoria de estabilidade, arquitetura e recuperação

### Arquitetura encontrada

Aplicação estática com módulos JavaScript, DOM e estado reativo. Persistência principal em **IndexedDB `NuvoraDB`, versão 2**, object store `keyval`, com coleções armazenadas como conjuntos/arrays; esquema de dados versão 3; backup com formato próprio versão 1. Há migração de localStorage legado. Não foi identificada sincronização bancária ou backend autenticado nesse fluxo.

`transacoes` é o razão principal; `bancoId` também identifica cartão quando `isCartao` é verdadeiro. Parcelas usam `grupoId`, ordinal e quantidade; transferências têm duas pernas e identificador lógico. `bancos.saldo` é mantido e recalculável conforme âncora. `agendamentos`/`receitasFuturas` guardam previsões, `conciliacoesFaturas` guarda total/ajustes por cartão e ciclo. Essa modelagem é aproveitável, mas o nome compartilhado de campos e o armazenamento de coleções inteiras favorecem erros de vínculo e concorrência.

Há dois caminhos de escrita distintos:

1. `persistAtomically`/`commitTransactionMutation`: espera conclusão de transação IndexedDB, serializa mutações **naquela aba** e restaura estado em caso de falha. Funcionou na sonda de erro de quota para transação comum.
2. `persist`: dispara gravações por coleção, captura erro em console e emite atualização sem retornar confirmação durável ao chamador. Usado em cadastro de conta/cartão e conciliação, entre outros. `IDB.set` resolve no sucesso da requisição, não na conclusão da transação inteira.

### Falhas e comportamentos verificados

| Caso | Resultado atual | Consequência |
|---|---|---|
| Duas abas editam o mesmo banco de dados | **O:** aba A gravou `from-tab-a`; B, com estado antigo, gravou `from-tab-b`; ao recarregar restou apenas B, saldo R$ 990 | **Perda silenciosa de lançamento.** A fila de uma aba não protege a outra; substituir coleções inteiras sobrescreve alterações. |
| Falha de escrita ao criar conta | **O:** erro de quota injetado na operação IndexedDB; cadastro retornou `true` e existiu em memória; após reload desapareceu | O controlador exibe sucesso com resultado que não foi persistido. |
| Falha de escrita em transação comum | **O:** rejeição propagada; zero lançamentos e saldo inicial R$ 1.000 preservados | Mecanismo correto a estender às demais operações. |
| Pagamento sequencial repetido | **O:** primeiro aceito; segundo recusado; um pagamento; saldo R$ 900 | Defesa existe, mas não cobre simultaneidade. |
| Remoção de conta com movimentação/cartão | **O:** recusada, conta preservada | Regra protetora a manter, com mensagem explicando dependências. |
| Reload offline após cache do service worker | **O:** aplicação inicializou e exibiu Transações | Confirma bootstrap offline nessa instância, não sincronização, recuperação de cache corrompido ou durabilidade em todos os navegadores. |
| Bibliotecas externas indisponíveis | **O:** ícones/fontes/PDF indisponíveis; gráfico de relatórios lança erro sem Chart | Manter tabelas e tarefas essenciais, indicar indisponibilidade de exportação e impedir botões sem função. |
| Teste de contrato do build | **O:** `gitignore.txt` ausente | Falha conhecida do repositório; não corrigida durante auditoria. |

### Acessibilidade e mobile

axe-core encontrou: botão de notificações sem nome acessível em conteúdo auxiliar das 15 rotas; controle interativo dentro de outro controle na área de importação; região rolável de Planejamento sem acesso por teclado; e filhos incompatíveis com o papel ARIA do calendário. Não são 15 falhas independentes do mesmo botão: é um componente compartilhado repetido nas telas. O formulário de lançamento acrescentado ao exame apresentou a mesma violação compartilhada de nome de botão; não houve outra violação automática detectada nessa amostra.

Os modais recebem tratamento de foco, papéis e operação por teclado em `modal-design.js`; as abas de tipo de lançamento foram encontradas com foco e semântica interativa em runtime, mesmo quando o HTML original usava `div`. Não se deve concluir inacessibilidade apenas pelo template estático.

Há controles com dimensões inferiores a 24 px na amostra de algumas telas, além de ações “+” pequenas nos formulários. Isso é uma lista para inspeção: exceções de espaçamento/conjunto e área efetiva de clique precisam ser avaliadas antes de declarar violação de tamanho de alvo. Recomenda-se área de toque confortável, idealmente 44 × 44 CSS px para ações frequentes, com critério acessível aplicável explicitado. Teclado virtual, zoom, alto contraste, dark mode, leitor de tela e dispositivos reais continuam pendentes de avaliação dedicada.

### Erros que o produto deve tratar

Quota/armazenamento negado: não encerrar formulário nem informar sucesso; preservar rascunho e oferecer tentativa/backup. Interrupção: identificar operação pendente e verificar seu ID antes de repetir. Múltiplas abas: bloquear conflito ou resolver por revisão atômica, sem sobrescrever silenciosamente. Falha de CDN: preservar números/tabela e explicar indisponibilidade. Sessão expirada e timeout de API financeira não pertencem ao fluxo local atual; só entrarão na matriz técnica se autenticação/integração for aprovada.

## G. Auditoria de continuidade

| Elemento | Situação atual | Direção |
|---|---|---|
| Registros já salvos pelo caminho atômico | Persistência e recarga funcionam nas sondas; concorrência entre abas pode anulá-los | Unicidade e controle de revisão na própria fronteira de persistência. |
| Filtros de transações | **O:** busca definida por `App.setFilter` foi restaurada após reload; localStorage | Preservar; mostrar filtro ativo e oferecer limpar. Testar intervalo, conta e cartão no mesmo contrato. |
| Página da lista, período do Planejamento e abas/períodos de relatório | **C:** `view-context.js`/sessionStorage guardam parte do contexto | Diferenciar contexto da mesma sessão de preferência entre sessões. Não prometer persistência universal. |
| Período/cartão da Conciliação | **O:** valor de referência salvo permaneceu; mês/ano selecionados na workspace voltaram ao padrão no reload | Persistir contexto validado e oferecer retomar conferência identificada. |
| Rascunho de lançamento | **O:** descrição e valor não salvos ficaram vazios após reload e reabertura | Rascunho recuperável, claramente “não registrado”, com descartar e retenção definida. |
| Prévia OFX/CSV | **C:** linhas e arquivo bruto ficam em `App.viewState`; não encontrei checkpoint persistente da revisão | Retomar somente com política de privacidade/armazenamento; se não guardar arquivo, explicar necessidade de reanexar. |
| Histórico de alterações | **C:** timestamps globais, referências e alguns registros específicos; não há trilha uniforme de antes/depois nos caminhos de edição/exclusão auditados | Evento mínimo de alteração vinculado à entidade, impacto e revisão; acesso/exportação/eliminação planejados. |
| Continuidade entre meses | **O/C:** parcelas futuras são criadas e ciclos usam fechamento; filtro de mês mistura anos | Identidade da compra/fatura e mês/ano explícitos; alterações de ciclo não devem reescrever o passado silenciosamente. |
| Backup | **C + testes existentes:** formato versionado, validação de estrutura, restauração exata, proteção de dados anteriores | Continuar usando backup como portabilidade local, sem descrevê-lo como sincronização. Definir tratamento de arquivo sensível. |

Mensagens de retomada devem vir de dados persistidos: quantidade realmente não conferida, sessão identificada e próxima fatura com saldo devedor. A ausência de conferências registradas não pode virar “tudo em dia”. Não criar alertas ou números para induzir retorno.

## H. Proposta detalhada de melhorias — sujeita a aprovação

Cada ficha responde a problema, caminho atual, experiência proposta, simplificação, integridade, falha, retomada e validação. Estimativas de esforço e prioridade aparecem em I; nenhuma ficha é uma funcionalidade aprovada.

### H1. Escrita durável, unicidade e concorrência

1. **Problema:** perda entre abas, pagamentos duplicados e sucesso antes de persistir.
2. **Hoje:** arrays em memória por aba; validações anteriores à fila; `persist` sem confirmação ao controlador.
3. **Proposta:** operação lógica com ID único, checagem e escrita na mesma transação IndexedDB; estratégia explícita de revisão/conflito entre abas; confirmar somente `oncomplete`. Preferir migração compatível e incremental.
4. **Mais simples:** um contrato de salvamento e feedback para todos os formulários, com bloqueio enquanto processa.
5. **Integridade:** atualizar razão, saldo, obrigação, status e referência como unidade; distinguir duplicata de comando de despesas reais semelhantes.
6. **Falha:** abortar unidade inteira, restaurar memória, manter formulário e informar motivo.
7. **Retomada:** verificar ID da operação antes de repetir; informar conflito e recarregar dados sem perder rascunho.
8. **Validação:** duas abas, reexecução, duas confirmações simultâneas, quota e interrupção; exatamente uma aplicação ou conflito explícito.

### H2. Vocabulário financeiro e origem verificável

1. **Problema:** rótulos conciliados sem evidência e “saldo” com significados diferentes.
2. **Hoje:** status padrão no dashboard e resultado filtrado apresentado como saldo em Transações.
3. **Proposta:** remover estados inferidos indevidamente; mostrar registrado, informado e estimado com origem/data/definição. Identidade Avenera e slogan coerentes.
4. **Mais simples:** mesmo termo e explicação curta em todas as telas.
5. **Integridade:** badge depende de evidência persistida e revisão compatível; ausência vira “Não conferido”.
6. **Falha:** origem/data indisponíveis geram indicação honesta, sem selo verde automático.
7. **Retomada:** consultar referência e última conferência válida no detalhe do valor.
8. **Validação:** conta nova e lançamento manual nunca aparecem conciliados; usuário diferencia resultado do mês, dinheiro e crédito.

### H3. Compra, obrigação, pagamento e estorno separados

1. **Problema:** ajuste afeta caixa cedo, estorno vira renda e indicadores ignoram liquidação.
2. **Hoje:** parcelas no razão; ajuste pode criar receita/despesa bancária; pagamento de valor integral.
3. **Proposta:** compra com valor original/parcelas, obrigação por fatura, ajuste de obrigação, pagamentos independentes e crédito/estorno vinculado; política explícita de parcial e limite estimado.
4. **Mais simples:** detalhe de fatura responde “total, pago, restante, vencimento” e oferece ação correspondente.
5. **Integridade:** centavos; soma das parcelas exata; pagamento não duplica consumo; caixa só muda em movimentação efetiva; histórico de ciclo preservado.
6. **Falha:** nenhuma parcela/status de pagamento parcial; registrar erro e permitir repetir com mesmo ID.
7. **Retomada:** fatura mantém pagamentos, saldo devedor e alterações rastreáveis.
8. **Validação:** compra R$ 100/3, taxa, estorno, integral, dois parciais, pagamento repetido e edição com escopo explícito.

### H4. Conferência com referência, correspondências e conclusão explícita

1. **Problema:** conciliação atual compara totais, sem provar registros correspondentes ou cobrir contas.
2. **Hoje:** cartão/período, total informado e ajustes; igualdade define status.
3. **Proposta:** selecionar entidade e período, registrar referência manual/importada, apresentar itens dos dois lados, sugerir pares com razões, resolver diferenças e concluir explicitamente. Começar com os meios locais existentes; integração bancária não faz parte da proposta aprovada.
4. **Mais simples:** lista de pendências com “Revisar, Vincular, Registrar ausente, Manter pendente, Ignorar com motivo”.
5. **Integridade:** comparação usa direção, centavos, datas, identificadores e descrição; não autoaprova por valor; mudanças posteriores invalidam/reabrem o trecho afetado.
6. **Falha:** checkpoint durável do que foi confirmado; não marcar itens em processamento como concluídos.
7. **Retomada:** sessão, entidade, período, referência, decisões e pendências identificados; nunca só um aviso genérico.
8. **Validação:** totais iguais com itens diferentes continuam pendentes; justificativas e alterações são rastreáveis; refresh recupera progresso confirmado.

Estados candidatos, em dimensão própria da situação de pagamento: **Não conferido**, **Possível correspondência**, **Conciliado**, **Divergente** e **Ignorado com justificativa**. “Possível correspondência” é sugestão, “Conciliado” requer confirmação/evidência, “Ignorado” permanece contabilizado separadamente. Diferenciar conferência do total de conferência dos itens.

### H5. Registro adaptativo com feedback específico

1. **Problema:** esforço desnecessário e confirmação pouco informativa.
2. **Hoje:** formulário geral amplo, entrada dedicada de cartão com capacidades diferentes e sugestões locais de categoria.
3. **Proposta:** formulário por intenção, dados essenciais primeiro, detalhes progressivos e resumo do impacto; sugestões revisáveis sem gravação automática.
4. **Mais simples:** evitar escolher conta e depois cartão quando o cartão já define o contexto; manter opção explícita para conta de pagamento quando necessária.
5. **Integridade:** validadores compartilhados, categoria opcional claramente tratada, indicação de recorrência versus parcelamento, resumo de conta/cartão/valor/data/status.
6. **Falha:** estado processando/erro acessível; dados preservados; reenvio seguro.
7. **Retomada:** rascunho identificado como não registrado e retorno ao contexto de origem.
8. **Validação:** tarefas idênticas nos dois formulários produzem entidades equivalentes; comparar eficiência humana e erros, sem meta de redução inventada.

### H6. Histórico, importação e correção rastreável

1. **Problema:** mês ambíguo, vínculos quebráveis, falso candidato de duplicidade e escopo de edição/exclusão incerto.
2. **Hoje:** filtros existentes, heurísticas locais e edição de linha; importação converte ID de conta em número.
3. **Proposta:** mês/ano, conta/cartão e status de conferência; IDs preservados; identificador externo quando existir; duplicatas sugeridas com motivo; correção com escopo e prévia de impacto.
4. **Mais simples:** filtro ativo visível e detalhe central do lançamento/compra; evitar múltiplas telas para explicar diferença.
5. **Integridade:** preservar dado original do extrato e decisão do usuário; verificar vínculos e unicidade na transação de gravação.
6. **Falha:** lote inteiro aborta ou rejeições são explicitamente revisadas; não omitir linhas inválidas silenciosamente.
7. **Retomada:** filtros e revisão persistidos conforme política; trilha mínima de mudança e possibilidade de consultar origem.
8. **Validação:** conta de ID textual, receita/despesa de mesmo valor, reimportação, lançamento antigo, compra parcelada e exclusão de item conferido.

### H7. Rascunhos e sessões de conferência recuperáveis

1. **Problema:** refresh perde formulário e período da conferência.
2. **Hoje:** contexto parcial em sessionStorage; dados de formulário/prévia ficam em memória.
3. **Proposta:** rascunhos locais separados do razão e checkpoints de conferência; política de expiração/eliminação apresentada ao usuário.
4. **Mais simples:** “Continuar lançamento não salvo” e “Retomar conferência da Conta X, período Y”.
5. **Integridade:** rascunho nunca altera saldo, fatura ou relatório; validar entidade/revisão ao retomar.
6. **Falha:** avisar se não foi possível preservar; impedir falsa garantia de recuperação.
7. **Retomada:** recuperar ou descartar conscientemente, sem criar duplicata; arquivo importado pode precisar ser reanexado.
8. **Validação:** reload, fechamento/reabertura da aba, quota e alteração concorrente; tarefa recuperada no estado correto ou limitação explicitada.

### H8. Compreensão financeira e próxima ação

1. **Problema:** cards priorizam números sem prova e relatório de caixa usa consumo.
2. **Hoje:** patrimônio, receitas, despesas e taxa de economia abrem o dashboard; compromissos e revisão aparecem depois.
3. **Proposta:** hierarquia por perguntas; caixa real separado de consumo; previsão com horizonte, premissas e itens; próxima ação baseada em pendências reais.
4. **Mais simples:** menos indicadores concorrentes, com ligação aos registros e alternativa tabular aos gráficos.
5. **Integridade:** fonte única por definição; conciliar agregados da tela com os dados; não descontar fatura e compra duas vezes.
6. **Falha:** sem biblioteca gráfica, tabela e resumo permanecem; dados incompletos são identificados.
7. **Retomada:** preservar período e abrir o conjunto de registros que gerou a pendência.
8. **Validação:** usuário responde quanto tem, o que está comprometido e o que falta conferir; modelos de consumo/caixa divergem apenas quando a regra exige.

### H9. Acessibilidade, mobile e consistência visual

1. **Problema:** violações automáticas, controles pequenos e recursos visuais externos indisponíveis.
2. **Hoje:** layout adapta a amostra, há dock e modais com foco; defeitos compartilhados persistem.
3. **Proposta:** corrigir nome/semântica/foco, validar alvos e teclado virtual; tokens e componentes consistentes; ícones com alternativa textual e estratégia resiliente de recursos.
4. **Mais simples:** ações compreensíveis sem depender de cor ou ícone e formulários utilizáveis com uma mão e teclado.
5. **Integridade:** ações de salvar/confirmar continuam explícitas; acessibilidade não altera regras financeiras.
6. **Falha:** mensagens e recuperação anunciadas, sem foco perdido ou fechamento inesperado.
7. **Retomada:** foco retorna ao contexto e informa o registro salvo/rascunho recuperado.
8. **Validação:** axe, teclado, leitores de tela, zoom 200/400%, fontes ampliadas, mobile real, temas e regressão das ações.

### H10. Comunicação acolhedora, transparência e privacidade

1. **Problema:** texto prescritivo, falsa sensação de proteção/verificação e rotas legais incompletas.
2. **Hoje:** modo rigoroso contém “Corte imediatamente todas as despesas variáveis não essenciais”; páginas legais informam que são reservadas, não publicadas.
3. **Proposta:** mensagens factuais com período/base e ação; explicar armazenamento, exportação, retenção e limitações; preparar conteúdo legal com responsável definido.
4. **Mais simples:** mesmos termos e controles de sugestões/preferências; nenhuma avaliação moral ou urgência artificial.
5. **Integridade:** nenhuma recomendação altera finanças; não inferir juros/rentabilidade de uma reserva virtual nem conexão bancária inexistente.
6. **Falha:** declarar indisponibilidade ou informação insuficiente; nunca substituir dados ausentes por narrativa confiante.
7. **Retomada:** preferências e decisões persistidas de acordo com as escolhas de privacidade.
8. **Validação:** revisão editorial, tarefas de compreensão e inventário de dados/terceiros; avaliação jurídica e de segurança por responsáveis competentes, sem alegar conformidade já alcançada.

## I. Matriz de priorização

Severidade: **Crítica** = perda/duplicação/impacto financeiro indevido; **Alta** = informação financeira falsa ou garantia de persistência ausente; **Média** = obstáculo de tarefa, continuidade ou acesso; **Baixa** = ajuste editorial isolado. Esforço relativo: P/M/G, sem estimativa em dias. Prioridade considera risco financeiro e dependências; não é pontuação estatística.

| Prioridade | Entrega | Severidade / impacto | Esforço | Dependências | Risco e validação principal |
|---|---|---|---|---|---|
| P0 | Concorrência entre abas e unicidade na gravação | Crítica / preservação dos registros | G | H1, decisão de migração | Compatibilidade do histórico; testes de revisões e duas abas. |
| P0 | Pagamento idempotente e atomicamente vinculado à fatura | Crítica / impedir débito duplo | M | H1 | Corrida entre validação e gravação; duas confirmações geram uma aplicação. |
| P0 | Conta/cartão/conciliação com confirmação durável | Alta / impedir sucesso falso | M | H1 | Falha parcial; quota mantém dados e formulário coerentes. |
| P0 | Remover “Conciliada/Conciliado” sem evidência | Alta / confiança | P | Definição H2 | Não substituir por outro estado presumido; teste com cadastro novo. |
| P0 | Corrigir fronteira de caixa dos ajustes/estornos | Crítica / saldo e renda | G | Modelo H3 aprovado | Migração de ajustes já lançados exige diagnóstico e revisão, nunca correção silenciosa. |
| P1 | Separar consumo e fluxo de caixa | Alta / entendimento financeiro | M | H2/H3 | Relatórios históricos; compra e pagamento em meses diferentes. |
| P1 | Faturas, pagamentos e limite estimado coerentes | Alta / obrigação e crédito | G | H3/H1 | Política de emissor não observada; estimativa deve ser identificada. |
| P1 | Importação com vínculos preservados e candidatos corretos | Alta / registros e saldo | M | H1/H6 | Reimportação e falso positivo; manter decisão humana. |
| P1 | Conferência explícita, por referência e com progresso salvo | Alta / diferencial central | G | H1/H2/H3/H6/H7 | Total igual não prova itens corretos; testar pares compensatórios. |
| P1 | Corrigir acessibilidade compartilhada e das tarefas principais | Alta para usuários afetados / acesso | M | H9 | Automatizado não basta; teclado/leitor de tela/mobile. |
| P1 | Trilha de alterações e proteção de itens conferidos | Alta / rastreabilidade | G | H1/H3/H4 | Retenção e privacidade; reabrir conferência afetada. |
| P1 | Rascunhos e retomada | Média / recuperação | M | H1/H7 | Rascunho não pode virar lançamento; política de expiração. |
| P2 | Formulários adaptativos e feedback contextual | Média / eficiência | M | H3/H5, pesquisa | Não remover dados necessários; medir erros e compreensão. |
| P2 | Mês/ano, nomenclatura e arquitetura da informação | Média / encontrar e interpretar | M | H2/H6/H8 | Mudança de hábito; teste de encontrabilidade. |
| P2 | Dashboard orientado a pendências e gráficos com propósito | Média / clareza | M | H2/H3/H4/H8 | Não aumentar ruído; teste de compreensão. |
| P2 | Tom da Anora, identidade e transparência | Média / confiança | P–M | H10 | Frases antigas em caminhos alternativos; revisão editorial e casos de dados insuficientes. |
| Antes de distribuição pública | Política de privacidade, termos e suporte operantes | Alta para publicação / confiança | M, responsável externo | H10, modelo operacional | Não produzir política fictícia nem declarar conformidade sem avaliação. |

O contrato quebrado de `gitignore.txt` deve ser tratado no início do trabalho aprovado, para restabelecer uma linha de base de CI útil. Não é justificativa para ignorar testes financeiros nem um bloqueio para realizar esta auditoria.

## J. Plano de implementação com critérios de aceitação

**Todas as fases dependem da aprovação deste plano.** Não há mudança autorizada pelo relatório em si. Releases devem ser pequenas, com reversão e evidências.

| Fase | Escopo | Critérios de saída |
|---|---|---|
| 0 — Contratos e linha de base | Aprovar definições de caixa/consumo/obrigação/conferência; catalogar legado; resolver contrato de teste ausente; registrar cenários | Definições documentadas; suíte explicada e sem falha desconhecida; backup/restore com amostras legadas; nenhum dado real modificado para diagnosticar. |
| 1 — Preservação e confiança imediata | H1, status verdadeiros de H2 e correções essenciais de acessibilidade | Pagamento simultâneo aplica uma vez; duas abas conservam dados ou recebem conflito explícito; conta/cartão/conciliação só confirmam após commit; registro novo não recebe selo de conferência. |
| 2 — Modelo de cartões e caixa | H3, relatório de caixa, vínculos de importação | Compra não debita banco; pagamento reduz caixa e obrigação uma vez; estorno na fatura não cria depósito; parcial preserva restante; indicadores após pagamento coerentes; fechamento histórico preservado; centavos exatos. |
| 3 — Conferência e rastreabilidade | H4/H6/H7 na jornada de referência aprovada | Referência tem origem e data; sugestões não confirmam sozinhas; divergência é explicada sem causa inventada; alteração invalida trecho afetado; reload retoma progresso confirmado; sessão só conclui por ação explícita. |
| 4 — Eficiência e compreensão | H5/H8, filtros e hierarquia, continuidade | Lançamento pelas entradas equivalentes gera mesmo resultado; feedback informa impacto; filtros e período ficam claros; testes humanos comparam linha de base e proposta sem aumento de erros. |
| 5 — Consolidação e preparação de distribuição | H9/H10, dispositivos reais, recursos offline, privacidade e suporte | Sem violações críticas conhecidas nas tarefas principais; teclado/leitor de tela validados; dependência externa não derruba tarefas; retenção e conteúdo legal aprovados pelos responsáveis. |

Pesquisa proposta: tarefas com pessoas que usam conta e cartão e têm diferentes familiaridades financeiras; incluir usuários de tecnologia assistiva. Observar primeiro registro, identificação de saldo confiável, conferência com diferença, pagamento parcial e retomada após interrupção. Amostra e protocolo devem ser definidos antes de comparar resultados; não extrapolar a partir de poucos participantes.

## K. Plano de testes e métricas

### Cenários financeiros obrigatórios

“Regressão proposta” indica teste a acrescentar/ajustar na fase aprovada. Os roteiros exploratórios fora do checkout já registram os resultados observados; não substituem testes permanentes do produto.

| Cenário | Esperado / critério de aceitação | Evidência atual | Regressão proposta |
|---|---|---|---|
| 1. Cadastrar mesma despesa duas vezes | Mesmo ID de operação aplica uma vez; duas despesas reais semelhantes podem ser salvas mediante decisão explícita | Repositório aceitou duas linhas com mesmo ID e debitou R$ 20 | Duplo submit, dois controladores, retry e IDs distintos semelhantes. |
| 2. Alterar valor de compra parcelada | Mostrar escopo e preservar soma/total conforme escolha; não alterar fatura paga silenciosamente | Edição de uma parcela levou total de 100 a 106,66, sem total original registrado no caso | Edição desta parcela, futuras e compra completa; centavos, faturas pagas e cancelamento. |
| 3. Excluir transação conciliada | Informar impacto, registrar alteração e invalidar/reabrir conferência correspondente | Agregado voltou a diferença; não há trilha uniforme nos caminhos auditados | Individual, lote, desfazer após 8 s e após reload; não deixar conferência vigente indevida. |
| 4. Alterar fechamento do cartão | Efeito futuro explícito e histórico preservado; prévia das faturas afetadas | Função com novo dia mudou associação da compra; fluxo de edição pela UI não executado | Dias 28–31, fevereiro/bissexto, compra no fechamento, fatura paga e migração. |
| 5. Pagamento parcial | Valor pago reduz banco e devedor; restante continua pendente; consumo não duplica | Formulário atual não tem valor editável para parcial | R$ 40 + R$ 60, contas diferentes, repetição, excedente, cancelamento e concorrência. |
| 6. Estorno | Crédito na fatura não movimenta banco; restituição bancária requer fato separado | Postagem atual criou receita e aumentou banco em R$ 20 | Total/parcial, meses diferentes, compra parcelada, fatura paga e reexecução. |
| 7. Transferência entre contas | Duas pernas juntas; saldo consolidado e receita/despesa preservados | R$ 100,01 transferidos corretamente: 899,99 e 300,01, consolidado 1.200 | Editar, excluir uma perna, desfazer, quota e duas abas. |
| 8. Excluir conta com movimentações | Recusar exclusão destrutiva ou oferecer arquivamento com histórico preservado | Exclusão recusada na sonda | Cartão vinculado, reservas, previsões, histórico antigo e conta sem dependências. |
| 9. Interromper salvamento | Nada parcial, nenhum sucesso prematuro, rascunho preservado e retry idempotente | Falha injetada reverteu transação; conta retornou sucesso e sumiu no reload | Abort durante commit, fechar aba antes/depois, quota e erro na gravação de status de pagamento. Interrupção real no meio do commit ainda não foi validada. |
| 10. Atualizar página durante conciliação | Progresso confirmado e referência preservados; rascunho claramente identificado | Referência salva ficou; período selecionado foi perdido | Reload em cada etapa, encerramento de aba, referência alterada e sessão com conflito. |
| 11. Editar lançamentos antigos | Recalcular impacto conforme âncora/ciclo e registrar antes/depois sem corromper períodos | Suíte existente cobre parte de âncoras e edição; auditoria constatou ausência de trilha uniforme | Ano anterior, extrato ancorado, conta arquivada, compra paga e fechamento mensal. |
| 12. Decimais e arredondamento | Centavos inteiros nos cálculos; soma de parcelas conserva total; diferença de 1 centavo visível | 0,1 + 0,2 → 0,30; 100/3 correto; tolerância atual concilia diferença de 0,01 | Casos positivos/negativos, descontos, juros, limites de domínio e serialização/restore. |

### Verificações complementares necessárias

- **Concorrência:** pagamento integral em duas chamadas; escrita A/B em duas abas; revisão conflitante; interrupção entre lançamento e status da fatura. Não aceitar sucesso duplo ou perda silenciosa.
- **Importação:** OFX/CSV com ID textual/número; reimportação do mesmo arquivo; FITID repetido; receita e despesa de mesmo valor; datas inválidas, linhas rejeitadas, arquivo vazio, limite de tamanho, saldo final e undo; informar quantas linhas foram importadas, ignoradas e rejeitadas.
- **Cálculos e telas:** compra em outubro e pagamento em novembro; modelo de consumo e caixa têm expectativas distintas; conciliar cards com tabela e fonte; após liquidação saldo devedor não continua integralmente aberto.
- **Correspondências:** mesmo total com itens diferentes, valor igual em datas/direções distintas, múltiplos candidatos, compra não reconhecida e taxa ausente. Nenhuma causa deve ser fabricada.
- **Persistência/backup:** round-trip de snapshot com IDs textuais, esquema legado, referências quebradas, versão futura e falha na restauração; não mesclar backups duplicando dados; migração reversível a partir de backup validado.
- **Acessibilidade:** nome/papel/estado, hierarquia de títulos, calendário, importação, modais, erro de campo, anúncio de processamento/resultado; tabulação, Escape, retorno de foco, contrastes nos dois temas e leitura dos valores sem depender de gráfico/cor.
- **Responsividade:** larguras 320/375/400/768/1440, textos e valores longos, fonte ampliada, zoom, paisagem e teclado virtual; todas as ações essenciais acessíveis sem zoom ou rolagem lateral de formulário.
- **Continuidade:** filtros, período, ordenação definida, cartão, rascunho, sessão de conferência e importação; distinguir estado da sessão de preferência persistente.
- **Resiliência:** CDN bloqueada, cache vazio/parcial, atualização do service worker, IndexedDB indisponível/quota e offline; não apresentar conexão bancária/sincronização inexistentes.
- **Comunicação/privacidade:** nenhuma sugestão altera dados sem confirmação; perfil vazio não recebe identidade fictícia; indicadores com fonte/data; exportação contém dados sensíveis e controles de retenção são coerentes.

### Métricas, fórmulas e coleta

Não há linha de base humana disponível para declarar melhoria percentual. A telemetria atual é local, opcional e limitada a interações genéricas; não fornece automaticamente todos os tempos, acertos e resultados abaixo. Qualquer instrumentação adicional deve ser aprovada, minimizada e ter finalidade/retenção definidas. Não registrar descrições, valores ou arquivos em eventos de UX.

| Dimensão | Métrica e definição operacional | Coleta e cuidado |
|---|---|---|
| Eficiência | Tempo da tarefa = início definido da intenção até confirmação durável; apresentar mediana/p90. Etapas = navegações/expansões/confirmações sob protocolo fixo | Sessões observadas com mesmos dados e pré-requisitos antes/depois; separar digitação, validação e rede. |
| Conclusão | Tarefas corretas concluídas / tarefas iniciadas; registrar abandonos e erros críticos separadamente | Não contar “toast de sucesso” como prova de tarefa correta; verificar estado persistido. |
| Preenchimento | Tentativas com erro de validação / tentativas de submissão; correções e duplicidades acidentais por operação | Distinguir correção voluntária de erro induzido e despesas reais parecidas. |
| Organização | Tempo e acerto para localizar lançamento/fatura; filtros aplicados com conjunto esperado / tentativas | Incluir anos diferentes, várias contas e descrição semelhante. |
| Compreensão | Respostas corretas sobre saldo, comprometimento, origem e status / perguntas apresentadas | Avaliar linguagem e explicação, não só lembrança de números. |
| Sugestões de correspondência | Precisão = pares sugeridos realmente correspondentes / pares sugeridos avaliados; cobertura = pares corretos sugeridos / pares correspondentes conhecidos | Base de referência rotulada independentemente; definir como tratar um-para-muitos antes de medir. |
| Falsos positivos | Sugestões incorretas / sugestões avaliadas; se houver comparação de candidatos negativos, documentar denominador próprio | Não chamar esse valor de taxa de falsos positivos sobre todos os negativos sem ter esse universo. |
| Resolução | Tempo até resolver divergência; quantidade de divergências confirmadas; pendências ao fim do período | Separar sugestão, divergência confirmada, ignorada e resolvida. |
| Conferência | Itens conciliados / itens elegíveis do período; quando denominador = 0, mostrar “sem base” | Itens ignorados são contados à parte. Não substituir por cartões conciliados / cartões cadastrados, que é o indicador atual. |
| Diferenças | Diferença por entidade/período = referência − registrado, em centavos; magnitude total = soma dos valores absolutos das diferenças de unidades comparáveis | Não somar saldos de conta com obrigações de cartão como uma única “diferença financeira”. |
| Última conferência | Data/hora da última conclusão explícita válida e revisão/escopo cobertos | Timestamp de edição ou total coincidente não é última conferência. |
| Período completo | Referência e escopo definidos, sem divergências/itens pendentes, decisões justificadas e conclusão explícita | Itens ignorados precisam ser apresentados, não escondidos pelo percentual. |
| Estabilidade | Commits confirmados corretamente / operações válidas tentadas; falhas e perda/duplicação por operação | Verificar banco após reload, não apenas memória. Testes automatizados estabelecem garantias, não taxas de produção. |
| Retomada | Tarefas retomadas no estado correto / tarefas interrompidas recuperáveis; tempo para continuar | Separar rascunho, conferência confirmada e arquivo que precisa ser reanexado. |
| Consistência entre períodos | Casos de saldo, parcelas, pagamentos e referências corretos após troca/reload de período / casos avaliados | Usar datasets conhecidos, anos distintos e ciclos limítrofes. |

Metas numéricas serão definidas depois da linha de base e do risco aceitável. Perda silenciosa de dados, pagamento aplicado duas vezes e selo de conferência sem evidência são **critérios de bloqueio da versão**, não oportunidades de otimização por média.

## Evidências e reprodução

- `browser-results.json`: textos renderizados, dimensões, campos dos formulários, erros de página/rede e resultados axe; capturas em `evidence/`.
- `financial-results.json`: centavos, compra, conferência agregada, ajuste, transferência, duplicidade, quota, duas abas, rascunho e recarga de conciliação.
- `scenarios-results.json`: pagamento sequencial e concorrente, estorno, edição de parcela, fechamento, exclusão protegida, filtro, formulário e bootstrap offline.
- `import-report-results.json`: importação numérica/textual, candidato de direção oposta, caixa versus consumo e mês sem ano.
- `unit-run.log`: execução atual da suíte existente, incluindo a falha de `gitignore.txt`.
- Roteiros exploratórios: `browser-audit.cjs`, `financial-audit.cjs`, `scenarios-audit.cjs`, `import-report-audit.cjs`. Usam o servidor estático local e dependências da instância; dados sintéticos em contextos descartáveis. A varredura axe usou `/tmp/avenera-audit-tools/node_modules/axe-core`, instalado fora do repositório. Logs de execução acompanham os roteiros.

Referências principais no código: `cmp-dashboard.js:453`, `:474`; `reconciliation.js:26`, `:74`; `app.js:573`, `:1623`; `db.js:359`, `:410`, `:738`, `:793`, `:926`, `:968`; `cmp-pages.js:34`, `:123`, `:136`; `report-data.js:13`; `ofx.js:116`, `:294`; `rnd-pages.js:411`; `transaction-filters.js`; `view-context.js`; `money-math.js`; `invoice-provisioning.js`; `backup-format.js`; `schema-migrations.js`; `mnt-semantics.js:114`.

**Decisão solicitada:** aprovar ou ajustar o plano e suas definições financeiras antes de qualquer implementação. A recomendação é começar pelas fases 0 e 1, com a correção do modelo de ajustes e cartões em seguida. A arquitetura proposta, novas experiências e metas de pesquisa permanecem propostas.
