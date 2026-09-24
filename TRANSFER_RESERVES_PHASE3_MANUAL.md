# Integridade de transferências e reservas de metas — checklist manual

Conclua a checklist no navegador local depois que `npm.cmd test` e `npm.cmd run build` passarem. Use dados financeiros descartáveis/de teste ou faça um backup antes.

## 1. Transferência entre contas bancárias

- Cadastre duas contas com saldos conhecidos e faça uma transferência interna entre elas.
- Confirme que a conta de origem foi debitada e a de destino creditada pelo mesmo valor.
- Confirme que as duas linhas compartilham o mesmo ID/valor de transferência e identificam a conta de origem/destino como “De” / “Para” na lista de transações.
- Confirme que o dinheiro total entre contas e reservas não mudou e que as receitas/despesas comuns não mudaram.

## 2. Editar qualquer uma das pernas

- Edite a linha de origem e repita o teste editando a linha de destino.
- Altere descrição, valor, data e categoria.
- Confirme que as duas linhas são atualizadas juntas e que os saldos refletem o novo valor uma única vez. Se a edição falhar, ambas as linhas e os saldos devem permanecer inalterados.

## 3. Excluir e desfazer

- Exclua uma transferência por qualquer uma das linhas. Confirme que as duas linhas desaparecem e que os saldos voltam ao valor anterior à transferência.
- Clique em **Desfazer** antes de a notificação expirar. Confirme que as duas linhas e os dois saldos são restaurados juntos.
- Selecione também um lançamento comum e uma perna de transferência para exclusão em lote; confirme que a perna parceira também é removida e que o desfazer restaura todos os registros efetivamente removidos.

## 4. Depositar em uma reserva de meta

- Crie uma meta e confirme que ela começa com saldo reservado zero.
- Abra o fluxo de depósito, escolha a conta bancária de origem, informe um valor positivo e confirme.
- Confirme que a conta foi debitada, a reserva vinculada e o progresso da meta aumentaram, e duas linhas de transferência vinculadas foram registradas.
- Confirme que nenhuma despesa separada em “Investimentos” foi criada e que as receitas/despesas comuns permaneceram iguais.
- Sem conta bancária cadastrada, confirme que o modal explica o pré-requisito e impede o envio.

## 5. Resumo do dinheiro

- Com R$ 2.700 em contas bancárias e R$ 1.500 em reservas de metas, confirme nas telas Contas e Metas:
  - Total em contas e reservas: **R$ 4.200**
  - Reservado para metas: **R$ 1.500**
  - Disponível fora das metas: **R$ 2.700**
- Confirme que o limite de cartão continua separado desses valores e que o significado do saldo no Dashboard não mudou.

## 6. Reabertura sem conexão

- Com os dados do aplicativo já carregados, desconecte a rede e recarregue/reabra o aplicativo local.
- Confirme que as duas pernas da transferência, saldos bancários, reservas de metas e números de total/reservado/disponível continuam consistentes.
