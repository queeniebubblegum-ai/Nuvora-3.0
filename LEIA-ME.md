# Avenera — página completa da Anora

Este pacote adapta o design fornecido à implementação real do Avenera. Ele não substitui nem recria o app inteiro: integra a nova página aos módulos existentes de navegação, renderização, preferências e conversa local.

## Principais mudanças

- A Anora agora tem uma página própria acessível pelo menu lateral e pelo menu do cabeçalho; o grupo Sistema continua abrindo automaticamente para a página ativa.
- Os insights usam `MentorEngine` e os registros existentes. As sugestões chamam o controller já usado pelo chat, sem criar respostas ou movimentações financeiras fictícias.
- Os estilos disponíveis são `Suave`, `Equilibrado` e `Foco Extremo` (valores internos `suave`, `equilibrado` e `rigoroso`); a escolha é persistida nas preferências da Anora e sincronizada ao perfil de mentoria.
- A página e o modal legado usam alvos de chat separados. O conteúdo dinâmico é escapado, e a consulta de gastos tolera registros históricos sem descrição ou categoria.
- O CSS foi compilado para `styles.css?v=20260925-anora-phase5-1`; o service worker usa `avenera-app-shell-v16` e pré-carrega `rnd-anora.js`.

## Validação

Neste pacote, `npm run build` concluiu e `npm test -- --pool=forks --poolOptions.forks.singleFork` passou com 51 arquivos e 247 testes. Isso não substitui a validação do seu checkout nem a conferência visual no navegador. Desktop/mobile, tema claro/escuro e interação real permanecem no checklist `ANORA_PAGE_PHASE5_MANUAL.md`.

Faça uma cópia de segurança e compare os arquivos antes de aplicá-los à raiz do repositório. No Windows, execute `npm.cmd run build` e `npm.cmd test`. O pacote não faz commit nem push.
