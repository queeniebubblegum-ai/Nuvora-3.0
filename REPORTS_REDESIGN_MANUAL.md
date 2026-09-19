# Relatórios Avenera — checklist manual

## Hierarquia e navegação
- [ ] Abrir **Relatórios** e confirmar a ordem visual: contexto do relatório selecionado fora de qualquer cartão (ícone opcional, eyebrow, título e descrição, com **Exportar PDF** compacto) → resumo recolhível **Análises financeiras** → cartão genérico **Relatórios** → conteúdo do relatório.
- [ ] No contexto selecionado, confirmar que a aba inicial mostra **Movimentação**, **Fluxo de Caixa** e sua descrição; o botão **Exportar PDF** fica alinhado à direita, usa roxo de ação saturado/escuro e mantém texto e ícone explicitamente brancos nos temas claro e escuro.
- [ ] Confirmar que o cartão genérico contém somente o título **Relatórios**, a descrição genérica e as quatro abas. O contexto selecionado, a ação de exportação, o contexto **Período analisado** e o seletor de período não podem estar dentro desse cartão.
- [ ] Confirmar que o cartão genérico tem presença visual de superfície primária, sem competir com o contexto selecionado: borda suave em roxo Avenera saturado, filete superior discreto, fundo levemente tonalizado, elevação macia e título claramente acima da descrição.
- [ ] Confirmar que a aba ativa é inequívoca em claro e escuro (fundo/borda roxos, texto e ícone legíveis e filete inferior), enquanto abas inativas preservam contraste e estados de hover/foco.
- [ ] Confirmar que **Análises financeiras** aparece imediatamente abaixo do contexto selecionado e antes do cartão genérico; o conteúdo do relatório aparece somente depois do cartão genérico.
- [ ] No resumo de **Análises financeiras**, confirmar quatro indicadores compactos — **Receitas no mês**, **Despesas reais**, **Resultado do mês** e **Faturas não duplicadas** — lado a lado no desktop, com valores alinhados, comparações curtas e status de faturas baseado nos pagamentos separados das despesas (sem duplicidade).
- [ ] Em telas estreitas, confirmar que os indicadores passam para duas colunas (e uma coluna em larguras muito pequenas), sem cortes de texto, mantendo os tokens de claro/escuro e a leitura por teclado/leitor de tela.
- [ ] Alternar entre Fluxo de Caixa, Comparativo, Cartões e Patrimônio; confirmar aba ativa, eyebrow, título, descrição e conteúdo correspondentes sem headings duplicados.
- [ ] Confirmar que o seletor do Fluxo de Caixa atualiza período, métricas, gráfico, tabela e linha de contexto sem outro seletor equivalente; os filtros de Comparativo, Cartões e Patrimônio continuam junto dos dados que afetam.
- [ ] Alternar tema claro/escuro e verificar contraste de cards, textos, bordas, seletores, gráfico, cores semânticas e botão de exportação.
- [ ] Em largura de desktop e celular, confirmar que a ordem permanece contexto selecionado → **Análises financeiras** → cartão **Relatórios** (título, descrição e abas) → conteúdo do relatório com período/controle no topo → métricas, gráfico e tabela; abas roláveis horizontalmente quando necessário.

## Fluxo de Caixa
- [ ] Com movimentos no mês atual, conferir que Entradas, Saídas e Fluxo líquido correspondem aos lançamentos reais (transferências internas não entram).
- [ ] Alternar “Mês atual”, “Últimos 3 meses”, “Últimos 6 meses” e “Últimos 12 meses”; confirmar que métricas, gráfico e tabela usam exatamente o mesmo intervalo.
- [ ] No mês atual, confirmar rótulos diários reduzidos no eixo X e valor preciso no tooltip.
- [ ] Em períodos longos, confirmar agregação mensal e que meses sem movimento não aparecem artificialmente na tabela.
- [ ] Com período sem receitas/despesas, confirmar estado vazio honesto tanto no gráfico quanto na tabela, sem linha ou valor sintético.
- [ ] Conferir valores negativos, entradas, saídas e fluxo líquido usando a formatação monetária em BRL.

## Integridade dos controles e exportação
- [ ] Confirmar que exportar PDF continua disponível em cada aba e que o relatório selecionado é o conteúdo exportado.
- [ ] Confirmar que o seletor de tipo de gráfico removido não fazia parte de nenhum fluxo funcional; os demais filtros reais permanecem operacionais.
- [ ] Conferir responsividade em largura de desktop e celular: contexto e ação não invadem o cartão genérico, abas com rolagem horizontal, tabela legível e filtros empilhados.
