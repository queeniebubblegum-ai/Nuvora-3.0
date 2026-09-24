# Projeção diária de fluxo de caixa — checklist manual

Rode `npm.cmd test` e `npm.cmd run build` antes de validar no navegador. Use dados de teste ou faça backup primeiro.

## 1. Projeção disponível

- Tenha uma conta bancária com saldo conhecido.
- Cadastre uma receita futura e uma conta pendente em datas distintas nos próximos 30 dias.
- Confirme que o Planejamento mostra a projeção estimada, as entradas/saídas por data e o saldo previsto ao fim do dia.
- Confira o saldo final manualmente: saldo bancário inicial + receitas previstas − despesas pendentes.

## 2. Estados e datas

- Marque uma conta como paga e uma receita como recebida; ambas devem deixar de afetar a projeção.
- Cadastre uma despesa pendente com vencimento anterior a hoje; ela deve aparecer como compromisso de hoje.
- Cadastre uma receita prevista com data anterior a hoje; ela não deve ser presumida como recebida.
- Cadastre uma previsão fora do horizonte de 30 dias; ela não deve aparecer.

## 3. Assinaturas, transferências e reservas

- Adicione uma assinatura ativa com periodicidade e próxima cobrança explícitas; confirme as ocorrências do período.
- Vincule uma cobrança a um agendamento; confirme que a mesma ocorrência não foi somada duas vezes.
- Confirme que transferências entre contas e pagamentos de fatura não aparecem como receita ou despesa comum.
- Com saldo bancário de R$ 2.700 e reserva de metas de R$ 1.500, confirme que o saldo inicial disponível usado pela projeção é R$ 2.700, não R$ 4.200.

## 4. Integridade e responsividade

- Compare os saldos bancários, receitas/despesas realizadas e progresso das metas antes e depois de abrir Planejamento; nenhum dado deve ser alterado.
- Confirme que, sem conta ou previsões datadas suficientes, aparece “Projeção indisponível”, sem saldo estimado inventado.
- Revise a tabela em desktop e celular; valores e descrições devem continuar legíveis.
