# Avenera — Fase 7: integridade de datas, pagamentos e importação OFX

## Objetivo

Esta fase corrige uma interpretação de datas que podia deslocar lançamentos do dia 1 para o mês anterior em fusos UTC−4 e acrescenta regressões de integração para situações financeiras sensíveis. O foco é estreito: preservar os saldos realizados e o mês local correto sem refazer fluxos já cobertos.

## O que mudou

- `parseLocalDate` foi adicionado em `util-date.js`. Datas estritas no formato `YYYY-MM-DD` são interpretadas como uma data local (ao meio-dia, para evitar a virada UTC) e datas impossíveis, como `2026-02-30`, são rejeitadas.
- O cálculo de dias entre datas e os caminhos de agrupamento/filtro mensal de transações passaram a usar essa interpretação local no cache mensal, nos filtros e períodos de lançamentos, na exportação CSV, no cálculo mensal de orçamento, no gráfico por categoria e nos caminhos mensais/recorrentes da Anora.
- A ordenação da migração de compras antigas também usa o parser comum, com posição determinística para datas inválidas.
- Foi adicionada uma regressão de integração para pagamento de fatura: a compra continua como despesa do cartão, apenas a conta bancária escolhida tem seu saldo debitado pelo registro local de pagamento, o livro-razão não duplica a despesa e a exclusão do registro restaura o saldo dessa conta.
- Foi adicionada uma regressão de integração para importação OFX com saldo final confirmado: o saldo do extrato é ancorado sem reaplicar as linhas importadas; uma receita posterior afeta o saldo; desfazer a importação remove as linhas e reverte apenas o ajuste do extrato, preservando o movimento posterior.
- Foi adicionada uma regressão UTC−4 para o dia 1º no cache mensal, além dos casos de parsing em `util-date.test.js`.
- O cache do service worker foi atualizado de `avenera-app-shell-v9` para `avenera-app-shell-v10`, para que os módulos alterados não fiquem presos a uma versão antiga instalada.

## Cobertura de transferências já existente

Esta fase não altera a implementação de transferências internas. A cobertura já existente em `db.test.js`, `financial-transfers.test.js` e `financial-ledger.test.js` exercita criação/classificação, efeito nos saldos, edição, exclusão, restauração e tratamento de linhas OFX ancoradas. A regressão OFX nova complementa essa cobertura com o caminho real de salvar e desfazer uma importação.

## Limite importante

O pagamento de fatura continua sendo **somente um registro no razão local**. O Avenera não envia dinheiro, não paga a instituição e não inicia uma transferência bancária. O registro apenas reflete um pagamento que já ocorreu por outro meio.

## Arquivos principais incluídos

`util-date.js`, `db.js`, `rnd-pages.js`, `app.js`, `chart-categorias.js`, `mentorEngine.js`, `service-worker.js`, `util-date.test.js`, `financial-integrity.test.js`, `invoice-payment.test.js`, `invoice-modal.test.js` e este README com o roteiro manual.

## Validação necessária

Os testes automatizados e o build **não foram executados neste ambiente**. No projeto local, rode no PowerShell:

```powershell
npm.cmd test
npm.cmd run build
```

Depois, complete `FINANCIAL_INTEGRITY_PHASE7_MANUAL.md`. Não considere a fase validada até os comandos terminarem sem falhas e os fluxos manuais relevantes serem conferidos. Esta entrega não cria commit nem faz push; a validação e o commit continuam sob controle da Maria.
