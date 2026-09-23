AVENERA — FASE 2: ARITMÉTICA MONETÁRIA EM CENTAVOS

Aplicação incremental sobre o projeto que já contém a Fase 1 validada.

Como aplicar:
1. Faça uma cópia de segurança da pasta atual do Avenera.
2. Extraia este ZIP e copie os arquivos incluídos para a raiz do projeto, substituindo os arquivos de mesmo nome.
3. Não substitua arquivos que não estejam neste pacote. Os arquivos incluídos preservam a implementação cumulativa da Fase 1 nesses módulos.
4. Siga MONEY_ARITHMETIC_PHASE2_MANUAL.md; execute npm.cmd test e npm.cmd run build no PowerShell.

Escopo: aritmética inteira em centavos, parcelamento, recorrência mensal por ocorrência, conciliação de faturas, orçamentos, metas, agregações monetárias de contas/cartões e precisão do saldo OFX/undo. Não altera o desenho de transferências, reserva de metas ou projeção diária de caixa.

Validação neste pacote sandbox: apenas inspeção estática. Os testes automatizados, build e conferência visual no navegador ainda precisam ser executados no Windows/local.
