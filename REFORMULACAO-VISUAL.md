# Reformulação visual da Avenera

## Direção

Menu em ameixa, superfície clara e tons de lavanda para navegação e ações.
Verde suave identifica a área de conferência; estados financeiros conservam
seus rótulos e não dependem apenas de cor. Fraunces nos títulos e Public Sans
na interface e nos valores, com números tabulares.

## Mudanças visíveis

- Visão geral com saldo registrado nas contas em destaque, separado dos números
  do período. A origem local e a exclusão do limite de crédito são explícitas.
- Área de conferência com quantidade real de registros pendentes no período e
  acesso à conciliação. Ausência de pendências não é apresentada como prova de
  que o saldo foi confirmado pelo banco.
- Resumo com receitas, consumo, resultado e despesas previstas de hoje ao fim
  do mês. A antiga taxa de economia cede espaço aos compromissos cadastrados.
  Esse último indicador mantém seu escopo anterior: agendamentos de despesas,
  incluindo faturas que já estejam provisionadas na agenda; não é uma soma
  adicional de todas as faturas.
- Transações recentes e agenda vêm antes do gráfico de seis meses e das contas.
  Orçamento, fatura e sugestões existentes ficam em “Planejamento e sugestões”.
- Menu com acesso direto a visão geral, lançamentos, contas e conferência.
  As demais rotas permanecem nos grupos de planejamento, organização e sistema.
- Contas com saldo registrado em destaque e crédito em um bloco distinto.
- Espaçamento, superfícies, cabeçalhos, controles e modais coordenados entre as
  rotas; composição adaptada a celular, tablet e desktop e ao tema escuro.
- Calendário compacto com a semana alinhada à segunda-feira e número de linhas
  suficiente para exibir todos os dias do mês.
- Menu rápido fechado fora da ordem de foco, região da agenda acessível por
  teclado, foco visível e respeito à preferência de movimento reduzido.

## Organização técnica

### Refinamento de densidade e consistência

- Espaçamento de referência de 20 px nos painéis e 16 px entre blocos, adaptado
  para 16 px e 14 px no celular. Cards vizinhos mantêm sua altura natural.
- Vencimentos usam duas colunas reais: descrição/data e valor. A coluna vazia
  que comprimia os nomes foi removida do layout.
- Cada dia da lista de transações tem um contêiner e separadores internos.
  A primeira data aparece também ao continuar um dia na próxima página.
  Valores e ações têm colunas próprias; editar/apagar não quebram palavras.
- Compras no crédito mostram o cartão e a parcela sem repetir a forma de
  pagamento. Ícones têm nomes acessíveis nos botões compactos do celular.
- Categorias e configurações usam colunas independentes, evitando buracos
  causados por cards com alturas diferentes. No celular, seguem em uma coluna.
- Ícones de categoria usam a mesma cor e fundo suave em categorias, transações,
  agenda, planejamento e dashboard. Os gráficos usam a mesma resolução de cor.
  As categorias padrão que tinham o rosa original uniforme recebem uma paleta
  por grupo apenas na apresentação. Cores personalizadas e registros salvos
  são preservados; a apresentação não altera tipos ou cálculos financeiros.
- Um período sem movimentações tem um único estado vazio compacto no relatório
  de fluxo de caixa, com acesso aos lançamentos, em vez de reservar gráfico e
  tabela vazios. Gráfico e tabela completos continuam disponíveis com dados.
- O botão de exportar PDF e o texto do destaque de planejamento recebem cores
  explícitas, evitando que estilos herdados ocultem seus rótulos.

O cache da versão refinada é `avenera-app-shell-v35`. Testes de layout exercitam
nomes longos, valores e datas, múltiplos lançamentos no mesmo dia e cores iguais
para a mesma categoria em telas diferentes, nas quatro larguras configuradas.

`avenera-visual.css` é a camada visual carregada após os estilos existentes.
`avenera-icons.css` associa os nomes de ícones da aplicação aos SVG locais.
`rnd-pages.js` organiza a visão geral e `cmp-dashboard.js` apresenta os componentes.
Os demais renderizadores recebem o estilo compartilhado.

As fontes ficam em `assets/fonts/`, com licenças SIL Open Font License.
Os ícones são Lucide 1.61.0, com licença em `assets/icons/LICENSE`. Um ícone de
etiqueta funciona como alternativa para nomes antigos sem correspondência local.
Fontes e ícones não dependem mais de Google Fonts ou Font Awesome em CDN.
Chart.js e a exportação PDF mantêm suas dependências externas existentes.

O service worker usa a versão `avenera-app-shell-v35` e inclui os novos estilos,
fontes e ícones no cache. Instalações anteriores precisam receber a atualização
normal do service worker para exibir o novo visual.

## Validação

Execute:

```sh
npm ci
npm run build
npm run build:v4
TZ=America/Manaus npm test -- --maxWorkers=2 --minWorkers=1
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:visual -- --workers=2
```

A variável do Chromium serve ao ambiente de nuvem. Em uma máquina com os
navegadores do Playwright instalados, use `npm run test:visual`.

Os testes de identidade visual foram atualizados para as fontes locais, a nova
paleta e o novo título da visão geral. Os testes financeiros mantêm suas
verificações de valores e persistência.

As evidências de navegação, contraste e responsividade acompanham o pacote de
entrega. As capturas usam dados fictícios em contextos de navegador isolados.
Verificação automática de acessibilidade não substitui avaliação com pessoas
e leitores de tela. A validação neste ambiente usa Chromium, incluindo as
larguras de celular; não representa teste de Safari nativo.
