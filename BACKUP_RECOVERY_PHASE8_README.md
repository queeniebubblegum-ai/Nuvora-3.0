# Fase 8 — backup e recuperação

Esta fase endurece os caminhos de exportação/restauração sem alterar os dados financeiros existentes por iniciativa própria.

## Alterações

- Backups exportados agora incluem metadados do formato e da versão, preservando o conteúdo e as coleções da base local.
- A exportação usa um `Blob` e URL temporária, evitando montar todo o arquivo como uma URL `data:`.
- A importação aceita o formato atual e backups legados sem metadados, mas exige as coleções centrais `bancos` e `transacoes`; verifica formatos, versões, tipos das coleções e registros antes de pedir confirmação.
- Versões futuras ou estruturas inválidas são rejeitadas antes da substituição. A restauração usa o caminho atômico existente da base; erros não devem substituir os dados em memória.
- A cópia local anterior à importação é best-effort: se o navegador bloquear ou não tiver espaço no `localStorage`, a restauração ainda pode prosseguir e informa essa limitação.
- O lembrete diário oferece uma ação explícita para baixar o backup; não tenta iniciar um download automático em segundo plano. O arquivo contém dados financeiros pessoais e não é criptografado.
- O cache do service worker foi atualizado para carregar o novo módulo de formato.

## Arquivos

Veja o ZIP da Fase 8. Ele contém os arquivos de aplicação, testes e o checklist manual.

## Validação local

Rode `npm.cmd test` e `npm.cmd run build`, depois complete `BACKUP_RECOVERY_PHASE8_MANUAL.md`. A restauração substitui os dados atuais: faça o teste manual em uma cópia com dados fictícios e mantenha um backup seguro antes de importar.
