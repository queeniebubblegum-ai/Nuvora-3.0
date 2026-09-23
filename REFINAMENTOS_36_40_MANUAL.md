# Refinamentos 36–40

## Escopo

- Submissões delegadas usam `submit-guard.js`, um lock por formulário. Os controladores com `setTimeout` mantêm o lock com `SubmitGuard.hold()` e liberam ao terminar; validação inválida não entra em loading.
- `submit-feedback.js` expõe `idle`, `loading` e `success` no botão, com `aria-busy`. O fechamento/reset de modal restaura o botão e libera qualquer lock pendente.
- A lista de Transações mantém o filtro, a ordenação e a paginação. Apenas acrescenta um cabeçalho por grupo contíguo: `Hoje`, `Ontem`, data local, `Data inválida` ou `Data não informada`.
- A seção da Anora apresenta uma única ação navegável. Itens vencidos apontam para `Agendamentos`, orçamento excedido para `Planejamento`, e o fallback real é `Dashboard`. Ações de onboarding existentes continuam usando seus modais.
- `ui-tracking.js` é um hook local, desativado por padrão, sem rede. Só aceita `screen`, `source` e `action`; qualquer chave financeira/valor é descartada. Para depuração local, use `import('./ui-tracking.js').then(({ configureUITracking }) => configureUITracking(true))` no console.

## Limitações e caveats

- O lock cobre todos os formulários ligados ao contrato `data-submit` na delegação atual. Fluxos fora desse contrato (upload, ações de fatura e botões que não submetem formulário) não foram convertidos em formulários.
- A confirmação de sucesso é deliberadamente aplicada sobretudo às transações e compra no cartão; os demais formulários continuam com seus toasts existentes.
- Não há envio de analytics, persistência de eventos ou coleta de valores, descrições, contas, bancos, categorias ou dados financeiros.
- A validação realizada nesta revisão é estática/testes locais disponíveis; não inclui uma afirmação de execução em navegador.
