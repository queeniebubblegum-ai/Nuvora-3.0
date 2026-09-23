# Qualidade — validação por fase

Para cada fase, depois de substituir os arquivos:

```powershell
npm.cmd test
npm.cmd run build
```

A suíte Playwright é independente e opcional. Ela não faz parte de `npm.cmd test`:

```powershell
npm.cmd run test:visual
```

A suíte visual exige `@playwright/test` e Chromium instalados no projeto. Os testes unitários de Planejamento e Contas são contratos separados:

- `financial-refinements.test.js`: disponibilidade para gastar, compromissos e limite de orçamento.
- `account-portfolio.test.js`: separação entre saldo bancário e crédito disponível.

Execute os comandos dentro da pasta que contém `package.json`.
