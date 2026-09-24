# Validação manual — Fase 1: regras centrais de movimentação

Use uma cópia de teste ou faça um backup antes de criar lançamentos. Os exemplos abaixo são para o mês atual; depois, restaure/remova os dados temporários.

## Testes automatizados e build (PowerShell)

Na pasta do projeto, execute:

```powershell
npm.cmd test
npm.cmd run build
```

## Conferência funcional

- [ ] Crie ou localize uma receita realizada de R$ 1.000, uma despesa comum de R$ 200 e uma compra no cartão de R$ 80 no período.
- [ ] Crie uma transferência interna de R$ 300 entre duas contas próprias (perna de saída e perna de entrada). Ela deve continuar visível na lista e no filtro de transferências, mas não somar às receitas nem às despesas.
- [ ] Marque como paga uma conta agendada de categoria **Fatura Cartão** (pagamento automático). O lançamento de pagamento da fatura não deve somar às despesas comuns nem às receitas. A compra original do cartão, se registrada, continua sendo a despesa.
- [ ] Se houver um registro legado de pagamento de fatura em formato de despesa com categoria **Pagamento de Fatura** e forma **Automático (Agendamento)**, confirme que também fica fora das despesas comuns.
- [ ] Compare Dashboard, Planejamento (orçamento/categorias), Relatórios (fluxo e comparativo), analytics/insights e Anora para o mesmo período: devem refletir receita de R$ 1.000 e despesas comuns de R$ 280, sem incluir os R$ 300 da transferência ou o pagamento da fatura. O fluxo líquido esperado para esse conjunto é R$ 720.
- [ ] Em Lançamentos, confira que as duas pernas da transferência aparecem com sinais/direções coerentes; o pagamento de fatura continua sendo uma saída de caixa e é identificado separadamente, sem virar uma despesa comum nos resumos.
- [ ] Exporte os lançamentos filtrados em CSV: a perna de saída da transferência deve ter sinal negativo, a entrada sinal positivo, receitas positivas e despesas/pagamentos de fatura negativos.
- [ ] Atualize ou reabra a aplicação após o novo cache do service worker e confirme que a versão carregada ainda mostra os totais acima.

## Dependência do pacote anterior

Este pacote inclui também a correção cumulativa de saldo final OFX. Se quiser validar essa parte, siga o checklist `OFX_BALANCE_FIX_MANUAL.md` incluído no ZIP.