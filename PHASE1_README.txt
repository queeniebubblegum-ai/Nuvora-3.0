AVENERA — PACOTE CUMULATIVO DA FASE 1

O que contém
- Centralização das regras de receita, despesa, transferência e pagamento de fatura em financial-ledger.js.
- Adoção dessas regras em resumos, Dashboard, Planejamento, relatórios, gráficos/analytics, Anora, alertas e aplicação de variação no saldo.
- Correção da descrição das fontes dos relatórios.
- Testes unitários adicionados/atualizados e checklist manual da Fase 1.
- Também inclui a correção anterior de saldo final OFX, ainda não confirmada como aplicada/testada: ofx.js, ofx-balance.js, csv-manager.js, cmp-modals.js, db.js, service-worker.js e os respectivos testes/checklist no pacote.

Aplicação
1. Faça backup do projeto e dos dados locais.
2. Extraia os arquivos deste ZIP sobre a raiz do projeto Avenera, mantendo os diretórios/nomes. Autorize substituir os arquivos existentes.
3. No PowerShell, a partir da pasta do projeto, execute:
   npm.cmd test
   npm.cmd run build
4. Siga PHASE1_LEDGER_VALIDATION_MANUAL.md. Para a parte OFX, siga também OFX_BALANCE_FIX_MANUAL.md.

O pacote é cumulativo: inclui os arquivos do trabalho OFX anterior e as alterações da Fase 1, mesmo que o pacote OFX anterior ainda não tenha sido aplicado. Não inclui as fases de centavos inteiros, transferências/metas, projeção diária ou novas telas.

Limite desta entrega: testes automatizados, build e validação no navegador precisam ser executados no ambiente Windows do projeto antes de considerar esta fase validada. Não avance para a Fase 2 até revisar esses resultados.