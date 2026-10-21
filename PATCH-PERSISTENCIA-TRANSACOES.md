# Patch — persistência de transações financeiras

Base de aplicação: branch `redesign-v4-fase1`, snapshot `f330e412d028c15e3c29fa98ea72ea26faac5e31`.

Copie os arquivos deste pacote para a raiz do repositório, preservando a estrutura/nomes. O patch torna as gravações de lançamentos, edições, exclusões, compras de cartão, classificações e ajustes lançados aguardáveis; falhas de persistência propagam ao chamador e as alterações em memória/saldos são revertidas. Operações de ledger e transferências passam pela mesma fila. Importações OFX com linhas e saldo confirmado salvam em uma só gravação atômica.

Testes novos/atualizados cobrem rollback de transação e saldo após falha simulada, atualizações assíncronas existentes e a gravação em lote OFX. **A suíte Vitest e os builds ainda precisam ser executados num ambiente com Node/npm; não foram executados durante a preparação deste pacote.**
