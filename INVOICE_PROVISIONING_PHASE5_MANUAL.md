# Provisionamento de faturas de cartão — checklist manual

Faça backup antes de aplicar. Rode `npm.cmd test` e `npm.cmd run build` após aplicar os arquivos.

## 1. Ciclo de fechamento e vencimento

- Cadastre um cartão com fechamento dia 10 e vencimento dia 20. Crie compras em 11/08, 10/09 e 11/09: a fatura de setembro deve somar as duas primeiras; a compra de 11/09 entra na fatura seguinte.
- Com fechamento dia 20 e vencimento dia 10, confira que o vencimento fica no mês seguinte ao fechamento e que compras posteriores ao fechamento passam para a fatura seguinte.
- Em cartão com fechamento no dia 31, confira fevereiro e meses de 30 dias: o ciclo fecha no último dia existente, sem invadir o mês seguinte.

## 2. Persistência e idempotência

- Abra o app duas vezes sem mudar dados: não deve criar faturas duplicadas.
- Com um agendamento de fatura pendente cujo valor/data estejam desatualizados, abra o app e confirme que só esse agendamento é corrigido.
- Marque um agendamento de fatura como pago; reinicie o app e confirme que ele continua pago e não é recriado.
- Confira que o provisionamento não cria transações de pagamento nem altera os saldos bancários.

## 3. Conciliação e projeção

- Informe um valor real na conciliação de uma fatura; confirme que o agendamento usa esse valor. Sem valor real, confira compras mais ajustes explicativos.
- Abra Planejamento e confirme que a projeção diária usa a data e o valor corrigidos do agendamento.
- Revise o mês seguinte e meses curtos, em desktop e celular, com dados de teste ou backup.
