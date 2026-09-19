# Checklist manual — Planejamento Avenera

## Visão geral
- [ ] Abrir `Planejamento` com orçamento cadastrado e confirmar que Planejado, Gasto e Disponível usam os limites e despesas do mês exibido.
- [ ] Trocar o mês pelas setas do cabeçalho e confirmar que o contexto, resumo e progresso por categoria acompanham o período.
- [ ] Abrir sem limites cadastrados e confirmar estado vazio honesto (sem valores fictícios) e ação `Definir limite`.
- [ ] Confirmar que categorias acima de 80% mostram alerta de atenção e acima de 100% mostram excedente, com barra e texto legíveis.

## Faixa de sinais do planejamento
- [ ] Confirmar que `Receitas previstas`, `Contas pendentes` e `Compromissos` aparecem como três cards/superfícies independentes, sem uma barra contínua compartilhada.
- [ ] Confirmar em cada card que o rótulo fica acima do valor, com espaçamento, alinhamento e borda/raio próprios; valores `R$ 0,00` continuam legíveis.
- [ ] Confirmar as cores semânticas: receitas em positivo, contas pendentes em despesa/perigo e compromissos em cor neutra; alternar claro/escuro para conferir contraste.
- [ ] Reduzir a largura para confirmar que os cards quebram em duas colunas e depois empilham em uma coluna, sem cortar rótulos ou valores.

## Vencimentos e metas
- [ ] Confirmar previsões pendentes e receitas futuras com data, sinal e valor corretos; vencidos devem ser identificados.
- [ ] Testar dar baixa, editar e apagar um item de vencimento e confirmar que os handlers existentes continuam funcionando.
- [ ] Criar uma meta, confirmar progresso atual/alvo e testar o botão de depósito; abrir `Ver todas`.

## Ações e seções detalhadas
- [ ] Testar as ações rápidas de receita, despesa, novo lançamento, meta e limite; confirmar que os botões usam roxo escuro/saturado e permanecem legíveis no claro e no escuro.
- [ ] Abrir cada seção detalhada: receitas recorrentes, despesas recorrentes, assinaturas, investimentos, orçamento, metas e parcelamentos.
- [ ] Confirmar que `Detalhes do planejamento` é somente leitura: exibe listas, valores, status e progresso, sem formulários, botões de criar/adicionar, depósito, exclusão ou navegação duplicada.
- [ ] Confirmar que as ações principais acima continuam abrindo os modais corretos e que os registros atualizados aparecem nas seções detalhadas após salvar.
- [ ] Verificar que cada seção usa disclosure nativo acessível (teclado, foco e abertura/fechamento), cards com superfície suave, borda, raio e espaçamento consistentes.
- [ ] Verificar layout em viewport estreita e alternar claro/escuro; textos, barras, bordas e botões devem manter contraste.
- [ ] Confirmar que nenhum valor, categoria, meta ou vencimento é inventado e que o cálculo financeiro não foi alterado.

> Esta checklist é manual. Não foi executada por browser neste passe.
