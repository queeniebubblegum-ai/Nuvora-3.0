# Avenera — adaptação da página completa da Anora

Este pacote integra uma página dedicada da Anora ao app real, usando a arquitetura existente do Avenera. A interface mostra insights calculados pelos dados locais, conversa pelo mecanismo atual `AnoraNLP` e oferece os modos de atuação já suportados (`suave`, `equilibrado` e `rigoroso`). Não adiciona serviço de IA online nem valores financeiros de demonstração.

## O que foi integrado

- Página `Anora` no roteador, renderizador, menu lateral e menu do cabeçalho.
- Sugestões de perguntas conectadas ao formulário e ao controller de chat já existentes.
- Preferência de estilo salva pelas preferências locais da Anora e refletida no perfil de mentoria.
- Alvos de chat isolados por formulário, mantendo compatibilidade com o modal legado.
- Escape de conteúdo dinâmico e tratamento seguro de lançamentos antigos sem descrição ou categoria durante a busca de despesas.
- Estilos responsivos, estados de foco/redução de movimento, CSS compilado e cache offline atualizado para `avenera-app-shell-v16`.
- Testes de integração/segurança e checklist de validação visual local.

## Aplicar e validar

1. Faça backup do seu checkout e compare/substitua os arquivos do pacote mantendo os caminhos relativos.
2. No Windows, na pasta do projeto, execute `npm.cmd run build` e `npm.cmd test`.
3. Siga `ANORA_PAGE_PHASE5_MANUAL.md` para conferir navegação, conversa, persistência, temas e responsividade no navegador local. A aparência real em desktop/mobile e nos temas claro/escuro ainda depende dessa conferência no app da usuária.

Na preparação deste pacote, `npm run build` concluiu e Vitest passou: 51 arquivos e 247 testes. A validação visual no navegador não foi executada. Nenhum commit ou push foi realizado.
