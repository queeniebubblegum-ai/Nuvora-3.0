# Fase 1 — Redesign v4: tokens & shell

Arquivos gerados a partir do mockup `avenera-mockup-completo-v4.html`.

## O que tem aqui

| Arquivo | O que faz | Onde colocar no repo |
|---|---|---|
| `input.css` | Entrada do Tailwind com tokens claro/escuro, fontes, componentes base (`.card`, `.btn`, `.input`, `.nav-item`, `.fab`, `.chip`). **Resolve o bug do build** (o `input.css` está gitignorado e faltando). | raiz (substitui o ausente) |
| `tailwind.config.v4.js` | Cores/raios/sombras/fontes mapeadas para as variáveis CSS. Dark mode por classe. | renomear para `tailwind.config.js` |
| `app-shell-v4.html` | Layout responsivo: sidebar (desktop) → drawer (mobile), topbar com busca/notificações/tema, dock inferior + FAB central. Já usa `data-page` do Router e `data-action` do `evt-click.js`. | recortar `<aside>`, `<header>`, `<nav dock>`, `<button fab>` e o script de cola para dentro do `index.html` |

## Passos de aplicação

1. **Backup**: `git checkout -b redesign-v4-fase1`
2. Copiar `input.css` para a raiz e `tailwind.config.v4.js` → `tailwind.config.js`.
3. No `index.html`: adicionar os `<link>` das fontes Google (Fraunces, Public Sans, Sora) que estão no topo de `app-shell-v4.html`.
4. Rodar `npm run build` → regenera `styles.css` com os tokens novos.
5. Substituir o shell antigo (sidebar/topbar) pelos blocos de `app-shell-v4.html`; manter o `<main id="content">` para o `renderer.js` continuar funcionando.
6. Em `evt-click.js`, adicionar handlers para `drawer`, `theme` (já existe persistência em `nuvora_theme`) e `new-transaction` (abre o modal de lançamento).
7. Rodar `npm test` — os testes `system-visual-consistency` e `repository-hygiene` devem continuar passando; validar no navegador claro/escuro e mobile.

## Tokens extraídos do mockup (já em input.css)

- Cores: `--brand #4C3C70`, `--action #5B3AA2`, violeta + 4 semânticas (success/warning/danger/info) cada uma com variante `*-soft`
- Raios: `--radius-1..5` (8/10/12/16/20px) + pill 999px
- Sombras: `--elevated` e `--shadow-soft` (diferentes em claro/escuro)
- Tipografia: Fraunces (display), Public Sans (body), Sora (numérica tabular — `font-num`)
- Tema escuro completo sob `.dark`

## Próximo (Fase 2)

- Modal de lançamento v4 com `#tx-preview` e `#tx-amount-error` (validação inline)
- Dropdown de categoria com busca (`#category-search`)
- Barra de filtros unificada (`filters`/`sort`/`period`)
