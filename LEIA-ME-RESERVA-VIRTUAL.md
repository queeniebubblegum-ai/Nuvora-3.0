# Correção: aportes em metas como reservas virtuais

## O que muda

- Um aporte registra uma alocação no histórico da reserva da meta, com valor, data e conta bancária associada.
- O saldo bancário não é debitado e nenhum lançamento de transferência é criado para novos aportes.
- Os totais distinguem saldo bancário, valor reservado e disponível após reservas; a reserva não é somada novamente como se fosse outro ativo.
- Aportes acima do valor disponível após reservas são recusados.
- Aportes antigos permanecem no histórico. Pares antigos de transferência que envolvem uma reserva de meta são identificados para que edição, exclusão e restauração ajustem o histórico/reserva sem alterar novamente o saldo bancário conciliado.
- Saldos bancários atuais são preservados exatamente; o pacote não soma de volta os aportes antigos. Se alguma conta ainda refletir o débito antigo, reconcilie/ajuste manualmente o saldo com base no extrato mais recente. Não faça uma correção automática, para evitar duplicidade após conciliação ou ajuste posterior.
- Há um método de domínio para resgate, mas a interface atual ainda não tem botão/fluxo visual para resgatar valores. Não considere o resgate disponível pela tela.

## Arquivos

Substitua estes arquivos pelos do pacote, mantendo os mesmos nomes e caminhos na raiz do projeto:

- `db.js`
- `cmp-pages.js`
- `cmp-modals.js`
- `ctrl-planeamento.js`
- `app.js`
- `cmp-core.js`
- `db.test.js`
- `account-portfolio.test.js`

O pacote não inclui dados do navegador e não faz commit nem push.

## Antes de aplicar

1. Exporte um backup pelo próprio Avenera e guarde-o em local privado.
2. Feche a aba do Avenera antes de substituir os arquivos.
3. Após substituir os arquivos, reabra o app e confira se os saldos das contas continuam iguais aos extratos mais recentes. A atualização não os reajusta automaticamente.

## Validação local

No PowerShell, na pasta do projeto:

1. Rode `npm.cmd test`.
2. Rode `npm.cmd run build`.
3. No app, confira um exemplo de saldo bancário de R$ 4.200,00 e reserva de R$ 1.500,00: total bancário R$ 4.200,00; reservado R$ 1.500,00; disponível R$ 2.700,00.
4. Faça um aporte de teste: o saldo bancário deve permanecer igual, o reservado deve aumentar e o disponível deve diminuir pelo mesmo valor. O aporte não deve aparecer como uma nova transferência em Lançamentos.
5. Confira um par de aporte antigo: editar, excluir e restaurar o par pode ajustar a reserva e o progresso da meta, mas não deve debitar nem creditar novamente o saldo bancário conciliado.
6. Confira a restauração de backup: o histórico de movimentos da reserva deve ser preservado sem duplicar a reserva, e cada saldo bancário deve permanecer como estava no backup.

Não faça o commit até os testes, o build e as validações manuais passarem.
