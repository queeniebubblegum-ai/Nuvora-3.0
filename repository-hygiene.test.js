import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const gitignore = readFileSync(resolve(process.cwd(), '.gitignore'), 'utf8');
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
const lockJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package-lock.json'), 'utf8'));

describe('repository hygiene and product identity', () => {
    it('ignores generated dependency, build, test, coverage, and log artifacts', () => {
        for (const pattern of ['node_modules/', '.vite/', 'vitest/results.json', 'coverage/', 'dist/']) {
            expect(gitignore).toContain(pattern);
        }
    });

    it('does not ignore source, tests, or the package lock', () => {
        expect(gitignore).not.toMatch(/(?:^|\n)(?:src\/|tests?\/|package-lock\.json|.*\.test\.js)/);
    });

    it('keeps the package and lockfile identity aligned with Avenera', () => {
        expect(packageJson.name).toBe('avenera');
        expect(lockJson.name).toBe('avenera');
        expect(lockJson.packages?.['']?.name).toBe('avenera');
        expect(lockJson.version).toBe(packageJson.version);
    });
});
