import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

describe('V4 brand mark sizing', () => {
    it('keeps the high-resolution logo constrained even if utility CSS is stale or unavailable', () => {
        expect(indexHtml).toContain('src="assets/logo.svg" alt="Logo Avenera" width="32" height="32"');
        expect(indexHtml).toContain('style="width:32px;height:32px;max-width:32px;flex:0 0 32px;object-fit:contain"');
    });

    it('bumps the app-shell cache after changing the shell markup', () => {
        const serviceWorker = readFileSync(resolve(process.cwd(), 'service-worker.js'), 'utf8');
        expect(serviceWorker).toContain("avenera-app-shell-v22");
    });
});
