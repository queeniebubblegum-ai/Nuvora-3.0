import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const routes = [
    'Dashboard', 'Transacoes', 'Relatorios', 'Planejamento', 'Agendamentos',
    'Contas', 'Contatos', 'Metas', 'Orcamento', 'Categorias', 'Conciliacao',
    'Importacao', 'Anora', 'Configuracoes'
];

describe('Redesign v4 is the live Avenera shell, without replacing page renderers', () => {
    it('keeps production CSS intact while building a separate, scoped shell stylesheet', () => {
        const pkg = JSON.parse(read('package.json'));
        const ignore = read('.gitignore');
        const productionCss = read('input.css');
        const runtimeCss = read('styles.css');
        const shellCss = read('input-v4.css');
        const config = read('tailwind.config.v4.js');
        const app = read('index.html');
        const worker = read('service-worker.js');

        expect(pkg.scripts.build).toBe('tailwindcss -i ./input.css -o ./styles.css --minify');
        expect(pkg.scripts['build:v4']).toBe('tailwindcss -c ./tailwind.config.v4.js -i ./input-v4.css -o ./styles-v4.css --minify');
        expect(productionCss).toContain('.nv-anora-page');
        expect(runtimeCss).toContain('.nv-anora-page');
        expect(shellCss).toContain('--page:');
        expect(shellCss).not.toContain('hover:bg-border/60');
        expect(shellCss).toContain('.nv-v4-mobile-dock');
        expect(shellCss).toContain('#sidebar.nv-v4-sidebar .nv-v4-nav-link.active');
        expect(config).toContain("important: '.nv-v4-scope'");
        expect(config).toContain('corePlugins: { preflight: false }');
        expect(config).toContain('"./index.html"');
        expect(ignore).not.toMatch(/^styles-v4\.css\s*$/m);
        expect(app).toContain('styles-v4.css?v=20260925-v4-shell-1');
        expect(worker).toContain('./styles-v4.css?v=20260925-v4-shell-1');
        expect(worker).toContain("avenera-app-shell-v21");
    });

    it('integrates all valid destinations with the existing App navigation and active-state hooks', () => {
        const app = read('index.html');
        const clickEvents = read('evt-click.js');
        const renderer = read('renderer.js');
        const main = app.match(/<main\b[^>]*>/)?.[0] || '';

        for (const route of routes) {
            expect(app).toContain(`id="nav-${route}"`);
            expect(app).toContain(`data-payload="${route}"`);
        }
        expect(app).toContain('data-action="navigate"');
        expect(app).toContain('data-page-route="Dashboard"');
        expect(app).toContain('data-page-route="Transacoes"');
        expect(app).toContain('data-page-route="Agendamentos"');
        expect(app).toContain('data-page-route="Contas"');
        expect(app).toContain('id="main-content"');
        expect(app).not.toContain('id="content"');
        expect(main).not.toContain('nv-v4-scope');
        expect(clickEvents).toContain("'navigate': () => {");
        expect(clickEvents).toContain('App.navigate(btn.getAttribute(\'data-payload\'))');
        expect(clickEvents).toContain("'openTransactionSearch': () => {");
        expect(clickEvents).toContain("App.navigate('Transacoes')");
        expect(clickEvents).toContain("document.getElementById('transactions-search')");
        expect(renderer).toContain("el.getAttribute('data-page-route')");
        expect(renderer).toContain("el.classList.toggle('active', isActive)");
        expect(renderer).toContain("document.querySelectorAll('.nv-sidebar__group')");
        expect(renderer).toContain("el.setAttribute('aria-current', 'page')");
    });

    it('preserves working app chrome, account, notification, backup, modal, and quick-action hooks', () => {
        const app = read('index.html');
        const clickEvents = read('evt-click.js');
        const worker = read('service-worker.js');

        for (const hook of [
            'id="toast-container"', 'id="input-ofx-file"', 'id="input-csv-file"',
            'id="backup-input"', 'data-action="exportBackup"',
            'id="notif-badge-mobile"', 'id="notif-drawer"', 'id="notif-overlay"',
            'id="anora-menu"', 'id="anora-rigor-select"',
            'id="nav-Configuracoes-perfil"', 'id="modals-container"',
            'id="speed-dial-menu"', 'id="speed-dial-contextual"',
            'id="btn-flutuante-main"', 'data-modal="modal-transacao"',
            'data-modal="modal-transferencia"', 'id="mobile-overlay"',
            'function toggleSidebar()', 'function toggleSpeedDial()'
        ]) expect(app).toContain(hook);

        expect(clickEvents).toContain("'toggleTheme': () => App.toggleTheme()");
        expect(clickEvents).toContain("'openModal': () => {");
        expect(clickEvents).toContain("window.toggleSidebar?.()");
        expect(app).not.toContain('data-action="new-transaction"');
        expect(worker).toContain('./styles.css?v=20260925-anora-restoration-2');
        expect(worker).toContain('./styles-v4.css?v=20260925-v4-shell-1');
        expect(worker).toContain("avenera-app-shell-v21");
    });

    it('keeps the standalone prototype explicitly visual-only and usable with the scoped CSS', () => {
        const preview = read('app-shell-v4.html');
        expect(preview).toContain('<div class="nv-v4-scope nv-v4-preview-layout min-h-screen">');
        expect(preview).toContain('href="./styles-v4.css"');
        expect(preview).not.toContain('id="main-content"');
    });
});
