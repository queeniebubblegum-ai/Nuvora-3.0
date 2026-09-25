# Avenera — compactação do menu e das telas (v3 corrigido)

Este pacote integral reúne a revisão compacta v3 e os ajustes dos testes identificados na rodada local. Ele substitui o pacote v3 anterior; compare com alterações locais e faça cópia de segurança antes de substituir os arquivos.

## O que inclui

- Menu lateral agrupado por setinhas, com o destino atual expandido.
- Grupos de Categorias recolhidos por padrão; a busca abre resultados correspondentes e os recolhe ao limpar a busca.
- Ajustes de densidade e responsividade, inclusive largura do menu em telas estreitas e cores coerentes com os temas.
- Teste do CSS tolerante a espaços e ponto e vírgula final removidos pelo minificador; teste de navegação alinhado aos spans do novo menu.
- Cache atualizado para `avenera-app-shell-v14`.

## Validar no Windows

Após substituir os arquivos, rode `npm.cmd run build` e `npm.cmd test`. Confira o menu e Categorias em desktop e celular. Este pacote não faz commit nem push.

A preparação foi verificada estaticamente. Não foi possível executar build, Vitest ou validação visual no navegador deste ambiente.
