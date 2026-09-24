# Avenera — integridade de transferências e reservas de metas (fase 3)

Esta fase conclui o fluxo de transferências internas e reservas sobre as Fases 1/2 já aprovadas. Não inclui projeções de fluxo de caixa nem novas telas financeiras.

## Alterações

- Uma transferência é representada por duas linhas vinculadas. Criar, editar, excluir e desfazer operam sobre o par; os saldos de contas/reservas e o progresso da meta são gravados juntos em uma única transação de escrita do IndexedDB.
- O aporte em uma meta agora transfere dinheiro de uma conta bancária selecionada para a reserva daquela meta. Não é mais criado como uma segunda despesa comum e, portanto, não infla receitas/despesas.
- Metas novas começam com saldo reservado zero. Metas existentes e backups antigos sem `reservas` são migrados a partir do progresso já registrado; reservas importadas são reconciliadas com suas metas vinculadas.
- As telas existentes de Contas e Metas distinguem dinheiro total, dinheiro reservado e dinheiro disponível fora das metas. O significado já existente de `saldo` no Dashboard (saldo das contas bancárias) foi mantido.
- As transferências identificam a conta ou reserva de origem/destino na lista de transações.
- Exclusões em lote que incluem transferências e lançamentos comuns usam uma única operação de persistência; o desfazer restaura o conjunto efetivamente removido.

## Validação local

Na pasta do projeto Avenera, pelo PowerShell do Windows, execute:

```powershell
npm.cmd test
npm.cmd run build
```

Esses comandos **não foram executados no ambiente de empacotamento**, pois Node.js/npm não estavam disponíveis. A validação visual no navegador também ainda precisa ser feita localmente. Não considere a fase validada no navegador até concluir a lista de `TRANSFER_RESERVES_PHASE3_MANUAL.md`.

## Aplicação do pacote

Copie os arquivos incluídos para os caminhos correspondentes na raiz do projeto, substituindo esses arquivos. Os arquivos JavaScript incluem as alterações de Fase 1/2 já aprovadas que estavam nesta cópia de trabalho; não restaure versões antigas dos arquivos sobrepostos. Faça um backup local antes de substituir os arquivos.

Consulte `TRANSFER_RESERVES_PHASE3_MANUAL.md` para a checklist específica desta fase.
