# Categorias — redesign Avenera

## Escopo

A página de Categorias é uma área compacta de organização. A análise de gastos permanece em **Relatórios**; não há gráfico de despesas nesta tela.

## Testes manuais

1. Abra **Categorias** em modo claro e escuro. Confirme header, descrição, resumo real (total/despesas/receitas), busca, filtros e botão **Nova categoria**.
2. Use **Todas**, **Despesas** e **Receitas**. Confirme que cada filtro mostra somente a lista correspondente e atualiza a contagem de resultados.
3. Digite parte do nome de um grupo, categoria ou subcategoria. Confirme filtragem instantânea, incluindo busca por subcategoria; teste também uma busca sem resultado.
4. Expanda e recolha um grupo com subcategorias. Confirme que cada linha exibe nome, tipo e status **Padrão** ou **Personalizada** (e **Arquivada** quando houver esse metadado). Categorias padrão não devem exibir o botão de excluir; categorias personalizadas continuam com as ações existentes.
5. Confira os símbolos e cores das categorias padrão (por exemplo, alimentação, transporte e moradia). Registros legados com `icone: "fa-tag"` devem receber um símbolo coerente pelo grupo/nome, sem alterar o ícone genérico escolhido em uma categoria personalizada.
6. Clique em **Nova categoria**. Confirme que o nome é um campo de texto, que Tipo oferece somente **Despesa** e **Receita**, e que Grupo/categoria-pai é opcional. Crie uma categoria sem grupo e outra com grupo; confirme que ambas aparecem na lista correta após o salvamento. A criação continua usando `modal-categoria` e `data-submit="categoria"`.
7. Tente criar o mesmo nome duas vezes e confirme a proteção de duplicidade (inclusive no mesmo tipo). Transferências seguem o fluxo próprio e não aparecem como opção do formulário.
8. Renomeie uma categoria existente e confirme que o nome é atualizado na lista e nos lançamentos relacionados. Tente excluir uma categoria padrão e confirme que a proteção existente permanece.
8.1. No modal, alterne entre principal/subcategoria e entre despesa/receita. Principal deve aceitar texto livre sem pai; subcategoria deve exigir um pai ativo do mesmo tipo. Troque de subcategoria para principal e confirme que o pai anterior não fica ocultamente selecionado.
8.2. Abra **Editar** em uma categoria personalizada, confirme nome/tipo/nível/pai/ícone/cor preenchidos e salve. Tente editar uma categoria padrão e confirme que a operação é recusada.
8.3. Após cancelar, fechar ou concluir criação/edição, reabra **Nova categoria**: ID, nome, pai, tipo, ícone/cor, título e botão devem estar no estado inicial. Em nome duplicado, o aviso deve identificar a duplicidade e manter apenas os dados atuais para correção.
9. Teste registros legados em formato de string ou com metadados ausentes. A lista deve continuar renderizando com valores seguros, sem texto `[object Object]` ou erro de tela.
10. Acesse **Relatórios** e confirme que os gráficos/indicadores de análise continuam disponíveis e que nenhuma conta financeira foi alterada.

## Verificação estática

- `categories-page.test.js` valida o contrato do modal (formulário, abertura/fechamento, níveis e tipos), proteção/erros do repositório, filtros/listas da página e a remoção da dependência de renderização do gráfico nesta tela.
- O ambiente desta revisão não tinha `npm`/Node disponível; portanto, não foi alegada execução de testes automatizados.

## Package de gestão — categorias, subcategorias e arquivamento

- Categorias padrão (`fixa: true` ou `cat_padrao_*`) são somente leitura. O menu contextual oferece apenas **Ver**.
- Categorias personalizadas usam **Editar**, **Arquivar/Restaurar** e **Excluir**. Arquivar mantém referências e histórico, mas remove a categoria dos novos lançamentos. Uma categoria principal com subcategorias ativas deve exigir que elas sejam arquivadas primeiro, evitando grupos órfãos.
- A tela tem quatro resumos (Despesas, Receitas, Padrão e Personalizadas), busca por nome/grupo/subcategoria/tipo/status e filtros independentes de tipo e status.
- O cadastro pede explicitamente **Categoria principal** ou **Subcategoria**. O campo de grupo só é habilitado para subcategorias e é limitado a grupos principais do mesmo tipo.
- Registros legados de movimentação aparecem apenas como aviso de compatibilidade e não alteram o fluxo neutro de transferências.
- Exclusão de item referenciado é recusada com orientação para arquivar. Item sem referência exige confirmação de impacto.
