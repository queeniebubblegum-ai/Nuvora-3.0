# Avenera — provisionamento correto de faturas de cartão (fase 5)

Esta fase corrige os agendamentos automáticos de fatura usados pela projeção de caixa. Antes, o cálculo agrupava parcelas pelo mês calendário; agora ele usa o ciclo real do cartão, definido pela data de fechamento.

## Regras aplicadas

- `mesReferencia` continua representando o mês de vencimento para manter compatibilidade com os agendamentos já salvos.
- Para cada mês de vencimento, o motor identifica o mês de fechamento correspondente e soma as transações dentro do ciclo, com datas inclusivas.
- Se o vencimento ocorrer depois do fechamento, a fatura vence no mesmo mês; se ocorrer no dia do fechamento ou antes, vence no mês seguinte.
- Dias de fechamento/vencimento são limitados ao último dia existente em cada mês (por exemplo, dia 31 em fevereiro vira dia 28 ou 29).
- Quando existe valor real informado na conciliação, ele prevalece. Sem ele, o cálculo usa as compras e os ajustes explicativos registrados.
- Só agendamentos com status explicitamente `pendente` podem ser atualizados, e apenas quando o valor ou a data mudou. Registros pagos, cancelados ou com outro status permanecem intocados; qualquer registro correspondente já existente também impede criar uma duplicata.
- A fase não cria transações de pagamento nem altera saldo de conta. Só cria ou atualiza agendamentos de fatura.

## Arquivos do pacote

- `invoice-provisioning.js` — cálculo puro e determinístico dos agendamentos.
- `invoice-provisioning.test.js` — testes de ciclos, datas, centavos, ajustes, atualização e idempotência.
- `reconciliation.js` — corrige os limites de ciclos em meses curtos.
- `app.js` — aplica o plano aos agendamentos existentes/cria os ausentes.
- `INVOICE_PROVISIONING_PHASE5_MANUAL.md` — checklist visual e funcional.

O provisionamento continua acontecendo na inicialização do app, como antes. Faça backup antes de substituir arquivos. Testes/build precisam ser executados localmente; não foram executados no ambiente de empacotamento, onde Node.js/npm não estão disponíveis.
