# Avenera — correção isolada do conflito em db.js

Este pacote contém **somente uma substituição para `db.js`**, mais este checklist. A versão foi recuperada do primeiro pai limpo do merge, commit `a8eab684e2780935f1c5ef883755c498fd595b10` (mensagem “backup, datas e fatura”). Ela não contém marcadores de conflito e preserva os caminhos completos de transferências, reservas de metas, restauração de backup e parsing local de datas.

## Aplicação

1. Faça uma cópia do `db.js` atual, fora da pasta do projeto.
2. Extraia o ZIP e substitua **apenas** o `db.js` da raiz do projeto pelo arquivo do pacote.
3. Não substitua a pasta inteira nem reverta o merge completo: os demais arquivos das fases anteriores permanecem como estão.
4. No PowerShell, na pasta do projeto, rode:

```powershell
npm.cmd test
npm.cmd run build
```

5. Se ambos passarem, faça a validação manual de transferência entre contas, depósito em reserva/meta, edição/exclusão de transferência e restauração de backup antes de commitar.

## O que foi conferido

- O `db.js` do pacote não contém `<<<<<<<`, `=======` ou `>>>>>>>`.
- Foram preservados `TransferRepo` com persistência atômica/rollback, `GoalRepo` com reserva vinculada, `Database.replaceAll` com restauração em caso de falha, `addTransfer`, `depositGoal`, totais de reservas e `parseLocalDate`.
- O pacote não altera `app.js`, importadores, estilos, dados do navegador nem outros arquivos do projeto.

## Limite da validação

A revisão aqui foi estática. Não consegui executar Vitest nem o build neste ambiente, então só considere a correção confirmada após os dois comandos locais e a validação manual.
