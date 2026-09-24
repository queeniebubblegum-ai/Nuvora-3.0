# Complemento da Fase 6 — ação no cartão

Este complemento acrescenta a ação de registrar pagamento diretamente no cartão, além dos pontos de acesso já entregues na Agenda e nos detalhes da fatura.

## O que muda

- O botão **Registrar pagamento da fatura** aparece diretamente em todos os cartões, sem depender da lista de agendamentos estar carregada na tela.
- Quando há uma fatura pendente, o cartão também exibe o valor e o vencimento; o botão abre a pendência mais antiga.
- Ao clicar, o Avenera procura a pendência e tenta provisionar novamente se necessário. Se não houver fatura pendente, abre os detalhes e explica que não encontrou uma baixa disponível; não cria pagamento para fatura paga ou cancelada.
- O botão reutiliza o modal da Fase 6: escolha da conta e da data, sem registrar nada até a confirmação.
- O registro permanece local no Avenera e não inicia uma transferência bancária.

## Arquivos para substituir

Copie estes arquivos para a mesma pasta do projeto, preservando os nomes:

- `app.js`
- `cmp-pages.js`
- `evt-click.js`
- `rnd-pages.js`
- `service-worker.js`
- `account-portfolio.test.js`
- `invoice-modal.test.js`
- `invoice-payment.test.js`

## Validação

Foi acrescentado um teste cobrindo a exibição do botão no cartão e a exclusão de faturas não pendentes. A suíte completa havia sido reportada como aprovada antes deste complemento; não foi possível executá-la novamente neste ambiente. Depois de substituir os arquivos, rode `npm.cmd test` e `npm.cmd run build` e confira a tela **Contas e cartões** no navegador.
