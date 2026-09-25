# Avenera — compactação do menu e das telas (v3)

## O que muda

- O menu lateral mantém todos os destinos, agora agrupados em Finanças, Organização e Sistema com setas nativas de expandir/recolher. O grupo da tela atual abre automaticamente; os outros fecham ao navegar.
- Categorias abre com todos os grupos recolhidos. Ao pesquisar, os grupos correspondentes se abrem para mostrar os resultados; ao limpar a busca, só esses grupos retornam ao estado recolhido.
- Reduz espaços gerais, paddings, altura de linhas, cabeçalhos e cards de Dashboard, Lançamentos, Contas/cartões, Categorias, Pessoas, Configurações, Metas/Orçamento e Agenda. Mantém conteúdo e ações disponíveis.
- Planejamento e Relatórios continuam como referências visuais; seus componentes internos não foram redesenhados. O espaçamento externo comum foi reduzido moderadamente.
- Atualiza a URL do CSS e o cache offline para `avenera-app-shell-v14`.

## Arquivos incluídos

`index.html`, `renderer.js`, `app.js`, `cmp-pages.js`, `input.css`, `styles.css`, `service-worker.js`, `system-visual-consistency.test.js`, `navigation-discoverability.test.js`, `transactions-page.test.js`, `invoice-payment.test.js`, `invoice-modal.test.js` e `backup-format.test.js`.

## Aplicação

1. Faça uma cópia de segurança e compare os arquivos com sua versão local antes de substituí-los. O pacote parte do commit `91758ba55e2fe33b86bd560864ed65f1b9702665` e inclui as alterações visuais v2 previamente entregues.
2. Substitua os arquivos incluídos na raiz do repositório.
3. Execute `npm.cmd run build` e `npm.cmd test`.
4. Feche e reabra o app/aba para o service worker v14 ativar; confira menu, Categorias (inclusive busca) e páginas no desktop e celular.

Este pacote não faz commit nem push.

## Validação desta preparação

A suíte, o build e a inspeção no navegador não foram executados neste ambiente sem Node/npm. Foram conferidos estaticamente os destinos do menu, o recolhimento inicial das categorias, a abertura de resultados ao pesquisar, a preservação dos ganchos de navegação/ações, a sintaxe estrutural do HTML, o balanceamento de delimitadores CSS e a sincronização da camada v3 entre `input.css` e `styles.css`. A validação visual final ainda precisa ser feita no navegador local.
