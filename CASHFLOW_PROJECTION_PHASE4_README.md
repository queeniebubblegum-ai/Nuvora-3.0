# Avenera — projeção diária de fluxo de caixa (fase 4)

Esta fase acrescenta ao Planejamento uma projeção diária dos próximos 30 dias, sem alterar saldos, transações ou o relatório de fluxo realizado. A projeção mensal do Dashboard permanece separada.

## Regras do cálculo

- O saldo inicial usa somente o saldo somado das contas bancárias. Reservas de metas e limite de cartão não são dinheiro disponível.
- São considerados apenas registros futuros com data: receitas futuras ainda não recebidas, agendamentos ainda pendentes e assinaturas ativas com próxima cobrança ou data explícita.
- Despesas pendentes vencidas são posicionadas no dia de hoje; receitas previstas com data vencida não são presumidas como recebidas.
- Registros pagos, recebidos ou cancelados, transferências internas e pagamentos de fatura não são tratados como receitas/despesas comuns.
- Assinaturas com periodicidade conhecida podem gerar ocorrências até o horizonte; uma ocorrência já coberta por um agendamento não é contada novamente.
- Sem conta bancária ou sem previsões datadas suficientes, a interface mostra “Projeção indisponível” em vez de inventar saldo zero.
- A projeção é calculada em memória e não grava nem modifica dados financeiros.

## Arquivos do pacote

- `cashflow-projection.js` — motor puro da projeção diária.
- `cashflow-projection.test.js` — testes do horizonte, centavos, vencimentos, recorrências, duplicidade e estado sem dados.
- `rnd-pages.js` — exibe a projeção na tela existente de Planejamento.
- `CASHFLOW_PROJECTION_PHASE4_MANUAL.md` — checklist de validação visual e funcional.

Faça backup do projeto antes de substituir `rnd-pages.js`. Os testes e o build precisam ser executados localmente; não foram executados no ambiente de empacotamento, onde Node.js/npm não estão disponíveis.
