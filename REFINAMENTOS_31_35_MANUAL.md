# Refinamentos 31–35 · projeção, confiança e interação

## 31 · Projeção de fim do mês

O Dashboard mostra uma projeção somente quando existe saldo global e ao menos uma previsão datada persistida. A conta usa saldo atual + receitas futuras ainda não recebidas − agendamentos pendentes de despesa e recorrências ativas que tenham data explícita até o fim do mês. Transações realizadas não entram novamente. Sem dados futuros suficientes, o card usa **Projeção indisponível** e não inventa zero.

## 32 · Atualização dos dados

`db.metadados.ultimaAtualizacao` é gravado exclusivamente nos caminhos de persistência (`persist`/`replaceAll`), nunca durante renderização. O Dashboard só exibe o indicador relativo quando o timestamp existe, é válido e não está no futuro. O texto relativo é acompanhado por `title` e nome acessível com data e hora completas.

## 33 · Animação numérica

Somente nós com `data-currency-value` participam. A primeira pintura e valores inalterados são estáticos; uma mudança é interpolada uma vez, cancelando a anterior. `prefers-reduced-motion` desabilita a interpolação. A integração fica em `UIRenderer.updateDOM`, após o morph incremental.

## 34 · Tom financeiro

`financialValueClass` e as classes `financial-value--positive`, `financial-value--negative` e `financial-value--neutral` padronizam valores direcionais. Totais realizados sem interpretação de sinal permanecem neutros; cores estruturais de cartões (entradas, saídas, alertas) são preservadas.

## 35 · Alt + N

Em viewport desktop, quando o foco não está em campo editável e não há modal/menu conflitante, Alt + N aciona o seletor existente do Dashboard ou o speed dial existente. O navegador mantém o atalho em inputs, textareas, selects e contenteditable. A dica visual `Alt + N` é ocultada em telas móveis e também tem texto para leitores de tela.

### Verificação manual

- Criar uma receita futura e uma despesa pendente datadas no mês; conferir a soma no card.
- Confirmar que lançar/pagar uma transação realizada não a duplica na projeção.
- Verificar que uma base antiga sem `metadados.ultimaAtualizacao` não mostra falsa atualização.
- Alterar um valor e renderizar novamente; confirmar que só o valor alterado anima e que o modo de movimento reduzido fica estático.
- Conferir Dashboard, Planejamento e Relatórios em claro/escuro e com valores positivos, negativos e zero.
- Usar Alt + N fora de campos no desktop; confirmar que não interfere em formulário, modal ou menu aberto.
