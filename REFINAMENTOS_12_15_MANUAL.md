# Refinamentos 12–15 — contrato de validação

Pacote incremental para o dashboard, Contas e cartões, Planejamento e Relatórios. Não altera rotas, registros persistidos, cálculos de fatura, comprometido/disponível ou exportação.

## Dashboard

- [ ] Com período anterior zero ou ausente, confirmar `Sem comparação anterior`, ícone neutro e ausência de percentual inventado.
- [ ] Com período anterior não zero, confirmar percentual válido e direção positiva/negativa.

## Contas e cartões

- [ ] Confirmar no cartão de crédito o indicador acessível de limite comprometido: sucesso abaixo de 80%, atenção de 80% a 99,9% e perigo a partir de 100%.
- [ ] Confirmar que a largura visual nunca ultrapassa 100%, inclusive quando o comprometido excede o limite.
- [ ] Para limite ausente/zero, confirmar `Limite não informado`, estado neutro e `aria-valuetext` equivalente; não exibir 0% como se fosse uma comparação válida.
- [ ] Revalidar o strip de atenção existente em claro/escuro e em largura estreita; este pacote não muda seus seletores, prioridades ou ações.

## Planejamento

- [ ] Confirmar por categoria: `Limite ultrapassado` em 100% ou mais (perigo), `Próximo do limite` em 80% ou mais (atenção) e `Dentro do planejado` abaixo de 80% (sucesso).
- [ ] Para planejado zero/ausente, confirmar `Limite não informado`, barra neutra e nenhum planejado/restante inventado.
- [ ] Conferir a lista principal do Planejamento e o detalhe `Orçamento mensal`, que usam renderizadores distintos e preservam o seletor de mês.

## Relatórios

- [ ] Na aba Comparativo, conferir a leitura rápida de entradas, saídas e saldo contra o mês imediatamente anterior disponível.
- [ ] Confirmar variação assinada (por exemplo, `+20,0%`/`-20,0%`) com cor e ícone acessíveis.
- [ ] Sem histórico válido ou com base anterior zero, confirmar `Sem comparação anterior`; não preencher com estimativa.
- [ ] Confirmar abas, filtro, gráfico, detalhamento e exportação existentes sem alteração.

A validação automatizada está em `refinements-12-15.test.js`. Neste ambiente, dependências do projeto não estão instaladas; a checagem disponível é estática/sintática.
