# Avenera V4 — overlay de migração estrutural e visual

Este pacote substitui o overlay coordenado anterior; não é apenas um conjunto de tokens/CSS. A migração altera o renderer das rotas reais para compor cada tela em um canvas compartilhado e atualiza templates/componente reais para hierarquia, cabeçalhos e landmarks sem inserir as páginas, os dados ou as ações do mockup.

## Base e escopo

- Base esperada: snapshot `0cf2e850488556314b133a9840ccdee245161ed7` em `redesign-v4-fase1`.
- Referência visual: `media/1791913769333-fc05cc88.html`, usada somente para hierarquia, densidade, tipografia e composição.
- Escopo: as 14 rotas do router existente; nenhuma rota Investimentos foi criada.
- Dados locais/IndexedDB, schema, handlers delegados, modais, importação/exportação, cálculos e invariantes financeiros seguem sendo os reais.
- A matriz de rota → template → ações preservadas está em `REDESIGN-V4-ROADMAP.md`.

## O que mudou nesta entrega

1. `renderer.js` coloca o resultado de cada `PageRenderers[currentPage]` em `.nv-live-page`, com `data-live-route` e classe de rota; mantém o renderer da página e a delegação de ações existente. O canvas estabelece uma composição vertical responsiva compartilhada para os blocos da tela.
2. `rnd-pages.js` migra Metas, Orçamento e Configurações para o cabeçalho compartilhado `renderPageHeader`; seus botões continuam ligados aos `data-action` e aos modais reais.
3. `cmp-dashboard.js` estrutura os indicadores reais como artigos em um grupo semântico compartilhado, mantendo cálculos, rótulos de saldo global/período e valores existentes.
4. `cmp-reports.js` identifica o espaço de trabalho real como composição de análise; `rnd-anora.js` continua usando os dados e handlers reais. Nenhum HTML nem conteúdo demonstrativo foi copiado do mockup.
5. `redesign-v4-coordinated.css` recebe regras da nova estrutura viva; mantém tokens claros/escuros, tipografia e raios existentes, e a escala de sombras restrita. A URL versionada agora é `20261013-layout-v3`; cache do service worker `avenera-app-shell-v25`.
6. Testes de integração/contrato verificam o canvas real, as migrações de templates, o contrato dos eventos e as versões de assets. Testes existentes que fixavam o cache também foram atualizados.

## Aplicação

Extraia o ZIP na raiz do repositório-base preservando caminhos e substitua os arquivos correspondentes. Não extraia sobre uma cópia de outro overlay sem confirmar a versão-base. O pacote contém apenas arquivos-fonte, testes e documentação; não contém `node_modules`, bancos de dados, armazenamento do navegador nem CSS compilado.

No Windows PowerShell, na raiz do projeto:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd run build:v4
```

Depois execute `npm.cmd run test:visual` se Playwright e seus navegadores estiverem instalados. Revise todas as 14 rotas em desktop/tablet/celular, claro/escuro, estados vazios/preenchidos e os fluxos críticos de formulários, menus, faturas e importação. Build e testes automatizados não substituem inspeção visual/funcional no navegador.

## Limites de validação

Esta entrega foi montada a partir da fonte do snapshot e inspecionada estaticamente. Neste ambiente não há Node/npm nem navegador local ligado ao projeto, então Vitest, builds e Playwright não puderam ser executados. **Não é uma aprovação visual**, não é merge e não altera dados reais. Não houve commit, push, merge, reset destrutivo nem limpeza de storage.
