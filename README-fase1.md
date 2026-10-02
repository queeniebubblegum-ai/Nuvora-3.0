# Avenera — integração do shell Redesign v4 (Fase 1)

Esta fase ativa o shell visual v4 no `index.html` da aplicação real. O shell usa a navegação já existente (`App.navigate`), preserva os renderizadores e deixa `#main-content` fora do escopo visual v4; não substitui páginas, dados, modais nem regras financeiras. A prévia `app-shell-v4.html` continua apenas como referência visual independente.

## Contratos preservados

- A fonte CSS principal continua sendo `input.css`; `npm.cmd run build` gera `styles.css` como antes.
- `input-v4.css` e `tailwind.config.v4.js` geram a camada de shell separada `styles-v4.css`, com utilitários Tailwind escopados em `.nv-v4-scope` e sem Preflight global.
- A navegação desktop mantém as 14 rotas existentes, os IDs `nav-<rota>`, grupos nativos `<details>` e a navegação real por `App.navigate`. A dock mobile usa `data-page-route` para atualizar estado ativo sem IDs duplicados.
- A área de renderização continua sendo exatamente `#main-content` e não recebe o escopo V4.
- Permanecem os hooks de perfil, tema, notificações, Anora, backup, importação OFX/CSV, modais, overlay mobile e `#btn-flutuante-main`/speed dial originais.
- A busca do cabeçalho é um botão funcional: abre Lançamentos e foca o filtro existente `#transactions-search` depois da renderização.
- O service worker pré-cacheia a nova folha de estilos e usa a geração `avenera-app-shell-v21`.
- Nenhuma lógica financeira, repositório de dados, IndexedDB ou fluxo de transações é alterado.

## Aplicar e validar no Windows

Extraia os arquivos do pacote ZIP na raiz do mesmo checkout/branch que já recebeu a etapa de isolamento v4. Em PowerShell, a partir da pasta do projeto:

```powershell
npm.cmd run build
npm.cmd run build:v4
npm.cmd test
```

O primeiro comando mantém o build CSS de produção; o segundo gera `styles-v4.css`, agora carregado pelo shell ativo e não ignorado pelo Git; o terceiro roda a suíte Vitest. Inclua `styles-v4.css` gerado ao preparar seu próprio commit se ele não for recriado no deploy. Não é necessário editar `input.css` ou `styles.css` manualmente.

Depois de gerar os dois CSS, abra/atualize a aplicação pelo **mesmo endereço/origem que já usa para o app e seus dados**. Não use o servidor estático da prévia `app-shell-v4.html` para seus dados reais: portas/origens diferentes isolam o armazenamento do navegador. A prévia continua disponível para comparação visual, mas a integração live está em `index.html`.

A alteração do cache do service worker está versionada para atualizar os arquivos locais. Se um browser instalado ainda exibir recursos anteriores após a atualização normal, recarregue o app pela origem habitual e deixe o service worker concluir a atualização.
