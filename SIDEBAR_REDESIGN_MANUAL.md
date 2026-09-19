# Avenera sidebar information architecture — manual checklist

Use a local static server or the existing app shell to review the sidebar at desktop and mobile widths.

## Information architecture

- [ ] The sidebar presents the sections in this order: **VISÃO GERAL**, **FINANÇAS**, **ORGANIZAÇÃO**, and **SISTEMA** in the footer.
- [ ] **Visão geral** routes to the existing `Dashboard` page.
- [ ] **Lançamentos** routes to `Transacoes`; **Contas e cartões** routes to `Contas`; **Planejamento** routes to `Planejamento`; and **Relatórios** routes to `Relatorios`.
- [ ] **Categorias** routes to `Categorias`; **Pessoas** routes to `Contatos`.
- [ ] **Configurações** routes to `Configuracoes`; the sidebar footer contains only the system navigation item, while profile, theme, export, and import controls live in the header.
- [ ] There is intentionally no Help/Ajuda item: no real Help route or page exists, so the sidebar does not include a fake destination.

## Visual, interaction, and accessibility checks

- [ ] Desktop sidebar is a neutral surface approximately 248px wide with a restrained border and no purple full-height panel.
- [ ] Section labels, icons, item spacing, hover states, and keyboard focus rings use the existing sidebar redesign classes/tokens consistently.
- [ ] After navigation, only the current route item has the subtle purple active treatment and `aria-current="page"`; route payloads and existing IDs remain intact.
- [ ] In the header, export and import are the leftmost actions, followed by notifications, Anora, profile, and theme; the existing `exportBackup`, `backup-input`, `nav-Configuracoes-perfil`, and `toggleDarkMode()` hooks still work.
- [ ] Theme toggle changes the header/sidebar to the charcoal dark treatment and keeps text/icons legible.
- [ ] At a mobile viewport, the compact header keeps all six actions reachable without horizontal overflow; the hamburger opens the sidebar, the overlay appears, and clicking the overlay closes it.
- [ ] At a mobile viewport, main content is not permanently shifted to the right by the closed sidebar.
- [ ] Notification drawer, Anora menu, floating action menu, modals, and page renderer output remain unaffected.
- [ ] Check at least one narrow phone width and one wide desktop width for clipping or horizontal overflow.


## Header action relocation

- [ ] At a wide desktop width, the header order is export, import, notifications, Anora, profile, and theme from left to right within the right action group.
- [ ] At a narrow phone width, icon-only controls retain visible focus states, accessible labels, and the Anora menu remains reachable by click, Enter, and Space.
- [ ] At desktop and narrow/tablet widths, Anora keeps a compact 32px avatar (30px in the compact breakpoint up to 639px), with its label/avatar/chevron in one group; the separators and gaps before profile and theme remain visible and no controls overlap or shrink.
- [ ] Selecting **Exportar dados** downloads the existing JSON backup; selecting **Importar dados** opens the existing `.json` file picker and completes the existing restore flow.
- [ ] Selecting the profile navigates to `Configuracoes`, and the displayed name/photo still refresh from the existing user record.
