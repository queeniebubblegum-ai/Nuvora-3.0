# Checklist manual — Fase 8

Faça estes testes em uma cópia local com dados fictícios; a restauração substitui os dados carregados no app.

## Exportação

- [ ] Clique em **Exportar dados** e confirme o download `avenera_backup_AAAA-MM-DD.json`.
- [ ] Confirme que o arquivo inclui `__aveneraBackup` com identificador, versão 1 e data de exportação.
- [ ] Recarregue o app sem clicar em exportar: o lembrete diário deve oferecer **Baixar backup**, sem iniciar um download sozinho.
- [ ] Clique no botão do lembrete e confirme que o download funciona e que a cópia manual do dia não gera outro lembrete na sessão seguinte.

## Restauração

- [ ] Com uma cópia de teste, exporte um backup; altere os dados fictícios no app; importe esse arquivo e confirme a substituição, sem duplicar transações.
- [ ] Confirme após o reload que saldos, transações, cartões, agendamentos, reservas e conciliações retornaram ao snapshot.
- [ ] Importe um backup legado sem metadados, mas com `bancos` e `transacoes`; confirme compatibilidade.
- [ ] Teste backup legado com metas sem a coleção `reservas`; confirme que reservas são reconstruídas uma única vez e sem manter reservas antigas órfãs.
- [ ] Tente importar `{"transacoes":[]}`: deve ser rejeitado antes da confirmação e os dados não devem mudar.
- [ ] Tente importar uma coleção com item `null` ou uma versão futura no metadado: deve ser rejeitada, sem substituir os dados.
- [ ] Simule falha de leitura do arquivo; confirme mensagem clara e que o seletor de arquivo possa ser usado novamente.

## Segurança e limite

- [ ] Guarde o JSON em um local privado: o conteúdo é legível e não está criptografado.
- [ ] Confirme que nenhum dado é enviado a um serviço externo durante exportação ou restauração.
