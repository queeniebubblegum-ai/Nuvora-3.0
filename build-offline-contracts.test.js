import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const normalizeModule = value => path.posix.normalize(value.replace(/^\.\//, '')).split('?')[0];

const findLocalImports = source => {
    const imports = new Set();
    const patterns = [
        /\bfrom\s*['"](\.\/[^'"]+\.js(?:\?[^'"]*)?)['"]/g,
        /\bimport\s*['"](\.\/[^'"]+\.js(?:\?[^'"]*)?)['"]/g,
        /\bimport\s*\(\s*['"](\.\/[^'"]+\.js(?:\?[^'"]*)?)['"]\s*\)/g
    ];
    for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) imports.add(match[1]);
    }
    return [...imports];
};

const localAssets = source => {
    const block = source.match(/const LOCAL_ASSETS\s*=\s*\[([\s\S]*?)\];/)?.[1] || '';
    return new Set([...block.matchAll(/['"]\.\/([^'"]+)['"]/g)].map(([, value]) => normalizeModule(value)));
};

describe('clean-checkout build and offline module contracts', () => {
    it('tracks the Tailwind source and does not globally ignore JSON files', () => {
        const packageJson = JSON.parse(read('package.json'));
        const gitignore = read('.gitignore');
        expect(fs.existsSync(path.join(root, 'input.css'))).toBe(true);
        expect(packageJson.scripts.build).toContain('tailwindcss -i ./input.css');
        expect(packageJson.devDependencies.tailwindcss).toBeTruthy();
        expect(gitignore).not.toMatch(/^input\.css\s*$/m);
        expect(gitignore).not.toMatch(/^\*\.json\s*$/m);
        expect(read('gitignore.txt')).toBe(gitignore);
    });

    it('pre-caches every local module reachable from the application entry point', () => {
        const worker = read('service-worker.js');
        const html = read('index.html');
        const assets = localAssets(worker);
        const pending = findLocalImports(html).map(normalizeModule);
        const visited = new Set();

        while (pending.length) {
            const file = pending.pop();
            if (visited.has(file)) continue;
            visited.add(file);
            expect(fs.existsSync(path.join(root, file))).toBe(true);
            expect(assets.has(file)).toBe(true);
            for (const dependency of findLocalImports(read(file)).map(normalizeModule)) {
                if (!visited.has(dependency)) pending.push(dependency);
            }
        }
        expect(visited.size).toBeGreaterThan(20);
    });

    it('continues installing the shell when one optional cache asset returns 404', async () => {
        const worker = read('service-worker.js');
        const handlers = {};
        const stored = new Set();
        const warnings = [];
        const failingAsset = './financial-transfers.js';
        const cache = {
            async addAll(assets) {
                if (assets.includes(failingAsset)) throw new Error('simulated missing optional asset');
                assets.forEach(asset => stored.add(asset));
            },
            async add(asset) {
                if (asset === failingAsset) throw new Error('simulated missing optional asset');
                stored.add(asset);
            }
        };
        const self = {
            addEventListener: (type, callback) => { handlers[type] = callback; },
            skipWaiting: () => {},
            clients: { claim: async () => {} }
        };
        const caches = { open: async () => cache };
        const console = { log: () => {}, warn: (...args) => warnings.push(args) };
        runInNewContext(worker, { self, caches, console });

        let installPromise;
        handlers.install({ waitUntil: promise => { installPromise = promise; } });
        await expect(installPromise).resolves.toBeUndefined();
        expect(stored.has('./index.html')).toBe(true);
        expect(stored.has('./financial-transfers.js')).toBe(false);
        expect(warnings.length).toBeGreaterThan(0);
    });
});
