# Pacote incremental v20 — build e pré-cache offline

Aplique este pacote **sobre o estado local v19 já aplicado**, preservando os demais arquivos do projeto. Ele torna `input.css` versionável, atualiza o pré-cache do service worker para v20 e acrescenta contratos de regressão para build e módulos offline. Não altera regras financeiras.

Extraia os arquivos para a raiz do repositório, mantendo os caminhos. Instale as dependências com `npm.cmd install` (ou `npm.cmd ci` em checkout limpo com `package-lock.json`) e rode `npm.cmd run build` e `npm.cmd test`. Depois, valide visualmente o app local e a navegação offline. Nenhum commit ou push foi feito.
