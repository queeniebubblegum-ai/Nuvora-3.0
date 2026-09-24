# Validação manual — Fase 2: aritmética monetária em centavos

Esta fase mantém valores BRL nas interfaces e usa centavos inteiros nos cálculos. A recorrência mensal repete o valor informado em cada ocorrência; parcelamento de compra divide um total.

## Verificações automatizadas locais

No PowerShell, na pasta do projeto:

```powershell
npm.cmd test
npm.cmd run build
```

## Fluxos manuais no navegador

1. **Compra parcelada no cartão:** lançar R$ 0,10 em 3 parcelas. Conferir R$ 0,04 + R$ 0,03 + R$ 0,03; a soma precisa continuar R$ 0,10.
2. **Repetição mensal:** lançar R$ 0,10 e marcar “Repetir mensalmente” por 6 meses. Conferir que a transação atual e cada agendamento futuro tenham R$ 0,10 — a recorrência não divide o valor entre os meses.
3. **Conciliação da fatura:** conferir compras de R$ 0,10 e R$ 0,20 contra fatura real de R$ 0,30. Testar também ajuste/estorno e conferir que o valor explicado e a diferença permaneçam exatos; postar um ajuste não deve duplicá-lo.
4. **Orçamentos:** definir dois limites de R$ 0,30; registrar duas despesas da mesma categoria, R$ 0,10 e R$ 0,20. Conferir limite total R$ 0,60, gasto R$ 0,30 e disponível geral R$ 0,30.
5. **Metas:** criar uma meta com alvo de R$ 2,345 e valor atual de R$ 0,10; conferir normalização para R$ 2,35 e, após depósito de R$ 0,20, valor atual de R$ 0,30.
6. **OFX com saldo final confirmado:** importar um extrato com saldo final informado, fazer depois uma movimentação de poucos centavos e usar “Desfazer”. Conferir que apenas o ajuste do saldo do extrato seja revertido e que a movimentação posterior permaneça.
7. **Cache do app:** atualizar o app conectado à rede e confirmar o carregamento; em seguida, conferir que o app shell inclua os módulos de dinheiro e conciliação para uso offline.

A Fase 1 já validada deve permanecer inalterada. Esta lista não valida redesenho de transferências, reservas de metas ou projeção diária de caixa.
