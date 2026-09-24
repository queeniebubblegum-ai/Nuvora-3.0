# Checklist manual — Refinamentos 21–25

## Transações
- [ ] Digitar rapidamente na busca por descrição e confirmar que a lista só é aplicada após aproximadamente 250 ms, sem atrasar os demais filtros.
- [ ] Apagar o texto da busca e confirmar que todos os resultados voltam imediatamente e que a paginação retorna à página 1.
- [ ] Confirmar que o cabeçalho anuncia `1 movimentação encontrada` ou `N movimentações encontradas` com `aria-live="polite"`, sem duplicar a contagem visual.
- [ ] Iniciar uma busca, navegar para outra tela antes de 250 ms e confirmar que nenhum resultado atrasado altera a tela nova.

## Relatórios
- [ ] Alternar entre Fluxo de Caixa, Comparativo, Cartões e Patrimônio e confirmar que o cabeçalho mostra o período selecionado/projetado.
- [ ] No Fluxo de Caixa, confirmar que o cabeçalho usa o intervalo de datas real do modelo; em visões de vários meses, não deve inventar o nome de um mês.
- [ ] Exportar o relatório e confirmar que as abas, filtros e conteúdo continuam funcionando.

## Superfícies elevadas
- [ ] Abrir menus de ações, o menu de novo lançamento e qualquer modal em modo claro e escuro; confirmar contraste e elevação visível.
- [ ] Confirmar que cards comuns não receberam a sombra elevada e que `prefers-reduced-motion: reduce` remove transições.

## Planejamento mobile
- [ ] Em viewport de até 767 px, confirmar o resumo fixo/aderente com o valor real de Disponível no mês do orçamento selecionado.
- [ ] Ativar Adicionar despesa no resumo e confirmar que abre o modal de transação com tipo `despesa`.
- [ ] Em viewport acima de 767 px, confirmar que o resumo compacto não aparece.
