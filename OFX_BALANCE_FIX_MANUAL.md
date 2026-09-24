# Validação manual — saldo final OFX

- [ ] Escolha uma conta e importe um OFX com saldo final conhecido e transações selecionadas. Ative “Atualizar conta”; o saldo deve terminar exatamente no saldo final do extrato, sem somar novamente os lançamentos.
- [ ] No importador OFX, deixe “Atualizar conta” desmarcado. Os lançamentos selecionados devem continuar alterando o saldo pela soma normal de receitas/despesas.
- [ ] Importar CSV deve continuar sem aplicar saldo final, mesmo após uma importação OFX anterior.
- [ ] Com saldo final confirmado, editar ou excluir uma linha OFX importada não deve aplicar/reverter a transação sobre o saldo ancorado.
- [ ] Use “Desfazer” após atualizar o saldo e importar linhas; o ajuste do extrato deve ser revertido junto, sem apagar uma movimentação independente posterior.
- [ ] Confirme que um OFX sem saldo final continua importável por transações e não oferece uma ancoragem inexistente.
