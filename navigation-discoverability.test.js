import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = file => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('navegação direta para agenda, metas e orçamento', () => {
    it('adds accessible sidebar actions for all requested destinations', () => {
        const html = read('index.html');
        const routes = ['Agendamentos', 'Metas', 'Orcamento'];
        for (const route of routes) {
            expect(html).toMatch(new RegExp(`data-action="navigate"[^>]*data-payload="${route}"[^>]*id="nav-${route}"`));
            expect(html).toContain(`nav-${route}`);
        }
        expect(html).toContain('Agenda de contas');
        expect(html).toContain('<span>Metas</span>');
        expect(html).toContain('<span>Orçamento</span>');
        expect(html).toContain('aria-label="Navegação principal"');
        expect(html).toContain('id="sidebar"');
        expect(html).toContain('overflow-y-auto');
    });

    it('keeps each sidebar route accepted and connected to a matching page renderer', () => {
        const router = read('router.js');
        const pages = read('rnd-pages.js');
        const renderer = read('renderer.js');
        for (const route of ['Agendamentos', 'Metas', 'Orcamento']) {
            expect(router).toMatch(new RegExp(`'${route}'`));
            expect(pages).toMatch(new RegExp(`^\\s*${route}: \\(appState\\) =>`, 'm'));
        }
        expect(renderer).toContain("import { PageRenderers } from './rnd-pages.js'");
        expect(renderer).toContain('if (PageRenderers[currentPage])');
    });

    it('preserves visible keyboard focus and the responsive mobile sidebar', () => {
        const css = read('input.css');
        const html = read('index.html');
        expect(css).toContain('.nv-sidebar__item:focus-visible');
        expect(html).toContain('lg:static');
        expect(html).toContain('lg:hidden');
        expect(html).toContain('toggleSidebar()');
    });

    it('groups sidebar destinations behind native arrows and expands the active route', () => {
        const html = read('index.html');
        const renderer = read('renderer.js');
        const css = read('input.css');
        for (const group of ['finance', 'organization', 'system']) {
            expect(html).toContain(`data-nav-group="${group}"`);
        }
        expect(html).toContain('nv-sidebar__group-chevron');
        expect(renderer).toContain("group.open = [...group.querySelectorAll('.nav-item')].some");
        expect(css).toContain('.nv-sidebar__group-toggle:focus-visible');
        expect(css).toContain('.nv-sidebar__group[open] .nv-sidebar__group-chevron');
    });
});
