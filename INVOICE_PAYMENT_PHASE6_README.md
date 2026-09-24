# Avenera — Fase 6: acesso direto e registro seguro de pagamento de fatura

## O que mudou

- A barra lateral agora leva diretamente a **Agenda de contas**, **Metas** e **Orçamento**; as rotas e os renderizadores dessas telas já existiam.
- O registro de pagamento da fatura pode ser aberto tanto no detalhe da fatura em **Contas e cartões** quanto nas contas pendentes da **Agenda de contas**, inclusive nas ações do modal de um dia e no fechamento do mês.
- A ação é chamada **Registrar pagamento** e só aparece para agendamentos de fatura com estado `pendente`. Faturas pagas ou canceladas não podem iniciar outro registro.
- O modal exibe a descrição, o vencimento e o valor da fatura, pede a conta bancária usada e a data real do pagamento. Sugere primeiro a conta vinculada ao cartão; se essa conta não existir mais, pode sugerir a conta válida já associada ao agendamento. Sem vínculo válido, só pré-seleciona automaticamente se houver exatamente uma conta. Com várias contas, nenhuma é escolhida por conveniência: a pessoa precisa selecionar a conta usada.
- A confirmação valida a existência da conta e a data de calendário. O lançamento local é vinculado ao agendamento da fatura, tem identificador estável e é verificado antes de ser criado novamente. O saldo local é debitado apenas na conta escolhida; a data e a conta ficam guardadas no agendamento e são exibidas no detalhe quando disponíveis.
- O pagamento continua separado de despesa comum, receita e transferência entre contas: preserva o tratamento do livro-razão existente para pagamento de fatura.
- Cancelar/fechar o modal de registro não altera agendamento, lançamentos nem saldos. No fechamento do mês, abrir o modal de pagamento não marca visualmente a fatura como paga.

## Limitação importante: sem integração bancária

**Registrar pagamento não paga a fatura.** O Avenera não envia dinheiro nem inicia transferência para banco, cartão ou qualquer instituição. Essa ação serve exclusivamente para registrar dentro do aplicativo um pagamento que a pessoa já realizou por outro meio; por isso a conta e a data informadas devem refletir o que ocorreu na vida real.

## Arquivos principais

`index.html`, `app.js`, `cmp-modals.js`, `cmp-pages.js`, `evt-click.js`, `invoice-payment.js`, `service-worker.js`, os testes de pagamento/navegação e o contrato atualizado do modal, este README e `INVOICE_PAYMENT_PHASE6_MANUAL.md`.

## Validação automatizada

Os testes adicionados cobrem a escolha segura da conta, datas válidas, normalização para centavos, identificador/ligação estáveis, classificação do pagamento no livro-razão, rotas e renderizadores de navegação e contratos de integração da interface. Não se deve considerar o build ou os testes aprovados sem executar os comandos no projeto local:

```powershell
npm.cmd test
npm.cmd run build
```

A validação visual e o roteiro manual em `INVOICE_PAYMENT_PHASE6_MANUAL.md` também são necessários. Nenhum commit ou push deve ser feito como parte desta fase.
