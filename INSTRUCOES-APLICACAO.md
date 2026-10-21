# Aplicar o isolamento do protótipo V4

Este pacote é incremental e deve ser aplicado sobre o branch `redesign-v4-fase1` (commit `b77ba1cf942d86cfa45e3e734dc857ac6e611b5f`). Ele mantém o protótipo e restaura os arquivos CSS de produção da `main` v20.

1. Faça uma cópia dos arquivos atuais.
2. Extraia o conteúdo deste pacote na raiz do repositório, mantendo os caminhos.
3. Rode `npm.cmd run build` e `npm.cmd test` para validar o app ativo.
4. Rode `npm.cmd run build:v4` quando quiser gerar `styles-v4.css` para a prévia isolada.
5. Abra `app-shell-v4.html` pelo servidor local para revisar o protótipo.

O `index.html` de produção e os fluxos reais não são conectados ao V4. Não faça commit ou push antes de revisar build, testes e prévia visual.
