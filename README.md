# Avenera — pacote incremental v20

Este pacote aplica-se **sobre o estado local v19 já aplicado** e parte da linha `main` pública no commit `c3c75aa6a8a85a52a24e1ca04f6cc88ca6145f86`, além das correções locais anteriores. Ele é isolado para reprodutibilidade do build e pré-cache offline; não altera regras financeiras.

## O que muda

- Inclui `input.css`, fonte do Tailwind para gerar `styles.css`, e remove as regras globais que ignoravam essa fonte e novos arquivos JSON.
- Atualiza o cache do service worker para `avenera-app-shell-v20`, acrescenta os módulos locais alcançáveis a partir do app e tenta pré-cachear recursos em lotes, sem abortar toda a instalação por uma falha isolada.
- Atualiza os testes do contrato do cache e adiciona verificações para build, `.gitignore`, grafo de módulos e instalação tolerante a recurso indisponível.
- Mantém o `.gitignore` sincronizado com `gitignore.txt`.

## Aplicação e validação

1. Faça uma cópia dos arquivos locais atuais.
2. Extraia os arquivos do pacote para a raiz do repositório, preservando os caminhos; não substitua outros arquivos fora do pacote.
3. Instale as dependências (`npm.cmd install`; em uma cópia limpa com `package-lock.json`, também é possível usar `npm.cmd ci`).
4. Rode `npm.cmd run build` e `npm.cmd test`.
5. Confira a navegação online/offline e valide visualmente o app local.

O pacote não faz commit nem push.
