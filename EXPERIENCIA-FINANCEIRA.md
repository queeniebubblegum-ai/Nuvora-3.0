# Experiência financeira da Avenera

Implementação orientada à auditoria de 21/10/2026: **Registrar → Conferir → Compreender**.

## O que mudou

- Gravações financeiras aguardam o commit do IndexedDB. Conta, cartão, referências, previsões e demais mutações legadas usam a mesma fronteira durável, com rollback de memória em caso de falha.
- A revisão do banco é comparada dentro da própria transação de escrita. Uma aba desatualizada recebe um conflito explícito; não sobrescreve os registros confirmados pela outra. Há aviso para recarregar, sem transmissão dos dados financeiros entre abas.
- Pagamento de fatura grava lançamento, saldo e situação da obrigação juntos. O identificador da operação impede aplicação duplicada. Pagamentos parciais mantêm o restante pendente; valores acima do devedor são recusados para revisão.
- Tarifas e estornos novos pertencem ao cartão/fatura. Não são tratados como débito ou depósito bancário imediato. Ajuste explicativo e lançamento vinculado não entram duas vezes no total.
- Consumo e caixa têm definições separadas: comprar no cartão reconhece consumo; pagar a fatura movimenta caixa sem criar outro consumo. Limite de crédito permanece separado do dinheiro e é identificado como estimativa.
- A conciliação inclui contas e cartões, referência manual com origem/data, comparação de valores, revisão dos itens e conclusão explícita. Igualdade dos totais e diferenças de um centavo não aprovam a conferência automaticamente.
- OFX/CSV podem ser anexados **somente como referência de conferência**, sem criar transações. As sugestões consideram direção, centavos, identificadores, datas e descrição. O usuário escolhe o vínculo; referências não podem ser usadas duas vezes. Linhas sem correspondência precisam ser resolvidas ou ignoradas com justificativa.
- Referências, decisões e contexto da conferência ficam salvos. Alterações dos itens invalidam a evidência correspondente e liberam seus vínculos para nova revisão. Não se presume conexão bancária.
- Rascunhos de receitas/despesas, transferências, compras, contas e cartões podem ser retomados após recarga. Permanecem localmente por até 24 horas, podem ser descartados e não afetam saldos. Falha ao preservar o rascunho é informada.
- A lista e o CSV compartilham o mesmo filtro, incluindo ano, intervalo, conta/cartão e conferência. IDs textuais são preservados, inclusive com `_`.
- Edição de parcela explicita o escopo: uma parcela ou redistribuição do total a partir dela. A redistribuição preserva datas, parcelas anteriores e valor original; é bloqueada quando há pagamento em fatura afetada.
- Alterações relevantes guardam antes/depois/data na mesma operação. O detalhe de edição permite consultar o histórico local. Exclusões informam escopo e reabrem conferências afetadas.
- O dashboard prioriza uma ação real de conferência e explica saldo registrado, consumo e previsão. Foram retirados os selos automáticos de conciliação.
- Foram corrigidos nomes acessíveis, semântica do calendário, controles aninhados na importação e acesso por teclado à região rolável. A falta de Chart.js preserva a consulta aos valores e tabelas; PDF indisponível produz uma mensagem explícita.
- A comunicação da Anora apresenta fatos e ações de consulta, sem prescrição de cortes, classificação moral ou promessa de rendimento da reserva virtual.

## Modelo financeiro e integridade

Os cálculos monetários compartilhados usam centavos. Parcelas conservam a soma do total; o valor original da compra permanece consultável. Transferências afetam duas contas, sem criar receita/despesa consolidada. Reservas de metas continuam virtuais, dentro dos saldos bancários.

O saldo informado por uma instituição é uma **referência informada pelo usuário ou extraída de um arquivo**, com origem explícita. O saldo registrado é calculado a partir dos dados locais. Quando âncoras antigas de extrato não permitem reconstruir um saldo histórico, a conferência o apresenta como indisponível em vez de inventar uma base.

Na conferência de cartão, o período representa o ciclo de fechamento, que pode ter vencimento em outro mês. Na conferência de conta, o período e a data do saldo de referência delimitam os itens revisados.

O estado conciliado exige evidência ainda compatível com os itens atuais e conclusão explícita. Itens ignorados são tratados separadamente e mantêm sua justificativa. As possíveis correspondências são sugestões, não confirmações.

## Migração e proteção dos dados existentes

- IndexedDB passa da versão 2 para 3, mantendo o object store e seus dados. A atualização aguarda o fechamento de abas antigas, cujos gravadores não conhecem o protocolo de revisão. A tela oferece recuperação quando esse pré-requisito impede a abertura.
- O esquema de dados passa para 4, acrescentando conferências e histórico de alterações. Backups novos usam formato 2; o formato 1 e documentos legados continuam aceitos. Esquemas futuros são recusados para evitar rebaixamento silencioso.
- A limpeza integral substitui o armazenamento em uma transação, incluindo chaves legadas. Uma falha não pode deixar uma limpeza parcialmente aplicada.
- Ajustes antigos que já movimentaram contas não são revertidos automaticamente: sua natureza depende da movimentação real. A conferência sinaliza esses casos para revisão. Exporte um backup e compare com a referência antes de corrigir o histórico.
- Alterar fechamento preserva os ciclos registrados e aplica a regra às novas compras. Com histórico existente, mudanças de vencimento ou de fechamento que deslocariam o mês de cobrança ficam bloqueadas: exigem uma migração específica das obrigações, que esta versão não executa.

## Privacidade e retenção

Registros, referências importadas, rascunhos e histórico permanecem neste navegador. O arquivo bruto anexado à conferência não é guardado; são persistidas as linhas financeiras necessárias à revisão. Histórico e referências são retidos até limpeza dos dados ou substituição por backup. Rascunhos expiram em 24 horas.

O backup contém dados financeiros e o histórico local de alterações. Ele deve ser tratado como arquivo sensível. Armazenamento local não constitui sincronização entre dispositivos ou validação pela instituição. A telemetria genérica existente continua opcional e desativada por padrão.

## Executar e verificar

```sh
npm ci
npm run build
npm run build:v4
TZ=America/Manaus npm test -- --maxWorkers=2 --minWorkers=1
npm run serve:visual -- 4173
```

Em outra sessão:

```sh
# Navegador gerenciado pelo Playwright, conforme VISUAL_TESTING.md:
npm run test:visual -- --workers=2

# Alternativa com Chromium já instalado nesta máquina:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:visual -- --workers=2
```

O override seleciona Chromium para todos os viewports, inclusive a emulação mobile de 375 px. Ele não valida Safari/WebKit nativo. Não desabilita TLS, integridade de recursos ou verificação de pacotes.

`financial-confidence.test.js` cobre duplicidade, parciais, rollback, tarifas/estornos, conferência, centavos, ciclos, parcelas e rastreabilidade. `reference-matching.test.js` cobre ambiguidades e vínculos. `visual/financial-confidence.spec.js` exercita IndexedDB real, duas abas, rascunhos, falha de gravação, revisão com arquivo, pagamento, migração, edição e limpeza integral.

## Limites da entrega

Esta é uma implementação local e revisável. Não foi publicada ou implantada automaticamente. Não simula integração bancária.

Pesquisa com usuários, medição de ganho de tempo, avaliação com pessoas que usam tecnologia assistiva e testes em dispositivos/Safari reais continuam necessários. A ausência de violações em testes automáticos não certifica acessibilidade completa.

Nesta instância, recursos externos de fontes, ícones e PDF estiveram sujeitos à política de rede. A consulta financeira e os testes funcionais foram validados com esses limites; a aparência com todas as fontes e bibliotecas externas não foi certificada. As ações essenciais de abrir menu e novo lançamento têm símbolos locais.

Privacidade, termos e suporte ainda precisam de conteúdo e responsáveis reais antes de distribuição pública; as rotas reservadas permanecem honestamente identificadas. Não há promessa de conformidade jurídica ou ganho de UX sem validação.
