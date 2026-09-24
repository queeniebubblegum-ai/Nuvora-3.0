# Refinamentos 16–20 — manual e limites

## 16 · Desfazer exclusão de transações

- A exclusão individual, de um grupo de parcelas de cartão e a exclusão em lote criam um único snapshot em memória por 8 segundos.
- O toast usa um botão real (`Desfazer`) com nome acessível e a delegação existente (`data-action="undoTransactions"`); não depende de HTML de ação dentro da mensagem.
- A restauração usa `Database.add('transacoes', registro)` para reaplicar os deltas de saldo. As duas pernas de uma transferência e todos os registros de um grupo de parcelas são restaurados com seus metadados originais.
- Uma exclusão nova substitui o snapshot anterior. O registro anterior continua excluído depois que seu período de undo termina.
- Em lote, o snapshot contém todos os registros efetivamente excluídos, inclusive as duas pernas de transferências selecionadas. Não há undo parcial; a restauração ignora um ID que já tenha sido recriado para evitar duplicidade.

## 17 · Filtros persistentes

- Chave: `avenera:transaction-filters`.
- Somente `desc`, `categoria`, `bancoId`, `mes`, `tipo`, `dataInicio` e `dataFim` são persistidos.
- JSON corrompido, coleção, tipos inválidos, datas impossíveis e valores fora dos conjuntos permitidos voltam ao default individual; estado selecionado e paginação não são persistidos.
- Alterar qualquer filtro e limpar filtros grava o estado imediatamente.

## 18 · Skeleton

`Components.loadingSkeleton()` e as classes `.nv-skeleton*` fornecem uma marcação acessível para futuras fronteiras assíncronas. As telas atuais são síncronas e não montam o skeleton, portanto não há atraso artificial ou flicker. A animação respeita `prefers-reduced-motion` e usa tokens de superfície/borda compatíveis com claro/escuro.

## 19 · Fonte dos relatórios

Os valores calculados exibem uma disclosure nativa **Fonte dos dados**. Fluxo e comparativo explicam a soma/média das transações do período selecionado, excluindo transferências; cartões e patrimônio descrevem suas fontes reais (parcelas, contas, metas e dívida de cartões). Não foram criadas ações sem handler.

## 20 · Estado das metas

Metas com alvo positivo exibem percentual e:

- `Concluída` a partir de 100%;
- `Quase lá` a partir de 75%;
- `Em progresso` abaixo de 75%.

Alvo zero ou negativo exibe `Alvo não informado` e `—`, sem percentual enganoso. O mesmo estado aparece nos cards da tela Metas e na visão compacta do Planejamento.

## Validação

O ambiente desta entrega não possui `npm`/`node`; não foi possível executar Vitest, build Tailwind ou navegador. Foram preservados os arquivos-fonte e o CSS runtime (`input.css` e `styles.css`) em paralelo para validação posterior.
