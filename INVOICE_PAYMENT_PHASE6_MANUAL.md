# Fase 6 — checklist manual de validação

Faça a validação no navegador usando uma cópia de teste/backup dos dados. Não use o fluxo para criar lançamentos fictícios na base real sem antes guardar um backup.

## A. Navegação e mobile

- [ ] Na barra lateral, abra **Agenda de contas** e confirme que a tela correta aparece.
- [ ] Na barra lateral, abra **Metas** e confirme a tela de metas/reservas.
- [ ] Na barra lateral, abra **Orçamento** e confirme a tela de orçamento.
- [ ] Em largura de celular, abra e feche o menu lateral e confirme que as três opções continuam acessíveis, com rolagem se necessária.
- [ ] Use Tab/Shift+Tab e Enter na navegação; o foco visível deve acompanhar os itens e a seleção ativa deve ser perceptível.

## B. Entrada no registro de pagamento

- [ ] Em **Contas e cartões**, abra uma fatura com agendamento pendente e confirme que aparece **Registrar pagamento** no detalhe.
- [ ] Em **Agenda de contas**, localize uma fatura pendente e confirme que a ação visível é **Registrar pagamento**, não uma baixa genérica. Repita a partir do modal de um dia e do fechamento do mês, se disponíveis.
- [ ] Reduza a janela para celular: a ação precisa continuar legível, visível e acionável sem depender de hover.
- [ ] Confirme que o modal mostra descrição/valor/vencimento, conta, data do pagamento e avisa que o formulário não inicia transferência bancária.

## C. Conta padrão e validação da escolha

Use registros de teste ou feche o modal sem confirmar para não alterar os saldos reais.

- [ ] Com cartão vinculado à Conta A e mais de uma conta cadastrada, abra o modal e confirme que Conta A vem selecionada.
- [ ] Escolha Conta B manualmente e confirme que a seleção permanece; a escolha pode ser alterada antes de confirmar.
- [ ] Com cartão sem conta vinculada e agendamento sem conta válida, mas com várias contas cadastradas, confirme que o seletor começa sem escolha. Não pode escolher silenciosamente a primeira conta.
- [ ] Com cartão sem conta válida e apenas uma conta cadastrada, confirme que essa única conta é sugerida.
- [ ] Sem contas cadastradas, confirme que a ação de registro fica indisponível e que o modal orienta cadastrar uma conta.
- [ ] Tente deixar conta ou data em branco e confirme que nenhum registro é criado. Uma data impossível como 31/04 também deve ser rejeitada.
- [ ] Confira a data de pagamento predefinida e teste alterá-la para a data real antes de registrar.

## D. Cancelamento, sucesso e proteção contra duplicidade

- [ ] Abra uma fatura pendente, altere conta/data e use **Cancelar** (e, separadamente, o X). Confirme que agenda, lançamentos e saldos não mudaram.
- [ ] Abra o fluxo de pagamento pelo fechamento do mês e confirme que apenas abrir o modal não muda a opacidade, desabilita o botão ou marca a fatura como paga.
- [ ] Em cópia de teste, registre uma fatura já paga externamente e confirme que o agendamento passa a pago e guarda a conta e a data escolhidas.
- [ ] Confirme que foi criado exatamente um lançamento local ligado ao agendamento (`invoicePaymentAgendamentoId`) e com tipo `pagamento-fatura`, distinto de despesa comum.
- [ ] Confirme que somente o saldo em aplicativo da conta escolhida foi debitado; nenhuma outra conta ou cartão teve saldo alterado.
- [ ] Abra novamente o detalhe e confirme que o estado de pagamento, a data e a conta são apresentados quando disponíveis.
- [ ] Reabra/repita a confirmação para o mesmo agendamento. O vínculo existente deve impedir novo lançamento e novo débito.
- [ ] Confirme que nenhum banco recebeu ordem, transferência ou pagamento real; esta fase só registra no Avenera o pagamento que já ocorreu fora dele.
- [ ] Confirme que uma fatura com estado cancelado não oferece ação de pagamento e que uma tentativa antiga de confirmar seu modal não cria lançamento nem altera saldo.

## E. Antes de concluir

- [ ] No diretório local do projeto, execute `npm.cmd test`.
- [ ] Execute `npm.cmd run build`.
- [ ] Revise as telas e o console do navegador após os testes/build. Não commite nem faça push automaticamente.
