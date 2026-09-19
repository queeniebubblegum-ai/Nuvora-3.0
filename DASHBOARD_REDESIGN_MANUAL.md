# Dashboard redesign — manual checklist

Escopo: primeira passada visual do Dashboard. A mudança é visual e reversível; não altera cálculos, modelo de dados, rotas, nomes de eventos, `data-action`, `data-change` ou ações existentes.

## Checklist visual

- [ ] O resumo financeiro e a área de saúde financeira aparecem antes de Anora, pilares, agenda e categorias.
- [ ] Receita usa sage/sucesso; despesa mantém sinal de atenção; saldo livre positivo usa sage.
- [ ] Laranja aparece somente em estados de atenção (por exemplo, pilar em atenção e nível da jornada correspondente).
- [ ] Anora permanece contextual: painel claro, sem gradiente roxo dominante, sem competir com os valores financeiros.
- [ ] Os quatro filtros (`Este mês`, `Mês passado`, `Trimestre`, `Este ano`) continuam selecionáveis e o filtro por data continua funcionando.
- [ ] Contas, cartões, agenda financeira, categorias e pilares continuam visíveis e legíveis.
- [ ] `Hoje`, navegação de mês e clique em dia da agenda continuam funcionando.
- [ ] Receita, despesa, fechar mês e simulação continuam disponíveis no cabeçalho.
- [ ] Em viewport estreita, filtros podem rolar horizontalmente e os blocos empilham sem corte ou sobreposição.
- [ ] Modo escuro mantém contraste e usa os tokens sem depender de cor roxa hardcoded.

## Verificação técnica

- [ ] Conferir o diff de `rnd-pages.js`, `cmp-dashboard.js`, `cmp-core.js`, `input.css` e `styles.css`.
- [ ] Executar `npm run build` após instalar as dependências, se o ambiente de desenvolvimento estiver disponível.
- [ ] Abrir o Dashboard e testar as ações acima com dados reais ou de demonstração.

Esta checklist registra o que deve ser validado manualmente; não representa validação executada automaticamente.
