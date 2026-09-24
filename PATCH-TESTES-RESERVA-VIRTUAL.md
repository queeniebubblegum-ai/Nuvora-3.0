# Correção pontual após a execução dos testes

O log local mostrou duas causas:

1. `db.js` usava a variável `data` ao criar o movimento, mas o parâmetro se chama `date`. A correção grava `data: date`.
2. `backup-restore.integration.test.js` ainda esperava o total antigo, somando a reserva ao saldo bancário. No modelo virtual, o total fica no saldo bancário; para saldo de R$ 1.000 e reserva de R$ 15, o disponível é R$ 985 e o total continua R$ 1.000.

## Aplicação

Substitua somente estes arquivos do pacote:

- `db.js`
- `backup-restore.integration.test.js`

Mantenha as outras alterações da reserva virtual já aplicadas. Não some valores antigos ao saldo bancário.

Depois rode no PowerShell, na pasta do projeto:

1. `npm.cmd test`
2. `npm.cmd run build`

O build anterior passou; os testes precisam ser executados novamente após essas duas correções. A busca visual/manual continua pendente.
