import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = file => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('preparação para beta', () => {
    it('defines the requested installable app identity and colors', () => {
        const manifest = JSON.parse(read('manifest.json'));
        expect(manifest).toMatchObject({
            name: 'Avenera',
            short_name: 'Avenera',
            description: 'Organize sua vida financeira com clareza.',
            start_url: '/',
            display: 'standalone',
            theme_color: '#4C3C70',
            background_color: '#F7F6F2'
        });
    });

    it('includes the requested search and social preview metadata without guessing a domain URL', () => {
        const html = read('index.html');
        expect(html).toContain('name="description" content="Avenera: organização financeira pessoal com planejamento, contas e insights claros."');
        expect(html).toContain('property="og:title" content="Avenera"');
        expect(html).toContain('property="og:description" content="Organize sua vida financeira com clareza."');
        expect(html).toContain('property="og:type" content="website"');
        expect(html).not.toMatch(/rel="canonical"/);
    });

    it('keeps the three legal/support paths visibly unpublished and non-indexable', () => {
        for (const path of ['privacidade/index.html', 'termos/index.html', 'suporte/index.html']) {
            const html = read(path);
            expect(html).toContain('name="robots" content="noindex, nofollow"');
            expect(html).toContain('Rota reservada · não publicada');
        }
        const routes = read('BETA_PUBLIC_ROUTES.md');
        expect(routes).toContain('responsável legal');
        expect(routes).toContain('e-mail/canal oficial de suporte');
        expect(routes).toContain('práticas reais de tratamento e retenção de dados');
    });
});
