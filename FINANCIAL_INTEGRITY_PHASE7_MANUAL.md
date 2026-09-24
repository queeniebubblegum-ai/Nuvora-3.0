# Roteiro manual — Fase 7 de integridade financeira

Faça primeiro uma cópia de segurança dos dados locais. Para qualquer verificação que exija criar ou remover lançamentos, use registros temporários e confira o saldo antes e depois; não use dados reais de conta como massa de teste.

## 1. Testes e build locais

No PowerShell, na pasta do projeto:

```powershell
npm.cmd test
npm.cmd run build
```

- [ ] `npm.cmd test` terminou com sucesso.
- [ ] `npm.cmd run build` terminou com sucesso.
- [ ] O console não mostrou erros novos ao abrir o aplicativo.

## 2. Data no primeiro dia do mês

Use um lançamento temporário com data no dia 1º de um mês. Em uma configuração local UTC−4, confira também a regressão automatizada que força `America/Manaus`.

- [ ] A data exibida permanece no dia 1º; não aparece como último dia do mês anterior.
- [ ] O lançamento aparece no filtro e na exportação CSV do mês correto, e não no mês anterior.
- [ ] Se o lançamento for de um mês já exibido por um relatório/orçamento, confirme que as telas que usam o período local não o atribuem ao mês anterior.
- [ ] Remova o registro temporário e confirme que seu saldo volta ao valor inicial.

## 3. Pagamento de fatura (registro local)

Em uma base de teste, registre uma compra no cartão e simule o pagamento de uma fatura escolhendo explicitamente uma conta bancária.

- [ ] A compra permanece como despesa do cartão e não debita o saldo da conta bancária no momento da compra.
- [ ] O registro do pagamento debita apenas a conta selecionada; outras contas e o próprio cartão não recebem um débito duplicado.
- [ ] Os totais do razão não contam o pagamento como uma segunda despesa comum.
- [ ] Ao excluir o registro temporário de pagamento, o saldo da conta selecionada é restaurado.
- [ ] Confirme que a interface descreve o pagamento como registro local. **Nenhuma transferência bancária é iniciada.**

## 4. OFX com saldo final confirmado e desfazer

Use uma conta de teste com saldo conhecido e um OFX de teste que tenha saldo final confirmado e pelo menos uma transação selecionada. Depois do salvamento, crie uma movimentação de teste posterior antes de usar “Desfazer”.

- [ ] Após importar com o saldo final confirmado, o saldo da conta fica igual ao saldo final do extrato, sem somar de novo as linhas importadas.
- [ ] Uma movimentação posterior altera normalmente o saldo.
- [ ] “Desfazer” remove as linhas importadas e reverte somente o ajuste do extrato, preservando a movimentação posterior e seu efeito no saldo.

## 5. Transferências internas

- [ ] Rode a suíte completa e confirme a cobertura existente de criação, edição, exclusão, restauração e classificação das transferências internas.
- [ ] Não confunda transferências próprias com receita ou despesa; esta fase não altera essa regra.

Ao terminar, compare os saldos de teste, descarte somente os dados temporários e mantenha sua base real intacta. Não faça commit nem push antes de revisar os resultados localmente.
