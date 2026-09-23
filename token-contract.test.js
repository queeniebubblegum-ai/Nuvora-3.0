import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
const tokenValue = (css, name) => css.match(new RegExp(`${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*:\\s*([^;]+);`))?.[1]?.trim();

const contract = {
    typography: ['--font-ui', '--font-mono', '--font-size-xs', '--font-size-sm', '--font-size-md', '--font-size-base', '--font-size-lg', '--font-size-xl', '--font-size-2xl', '--font-size-display', '--font-weight-regular', '--font-weight-medium', '--font-weight-semibold', '--font-weight-bold', '--line-height-tight', '--line-height-body', '--line-height-relaxed', '--tracking-label'],
    spacing: ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-7', '--space-8'],
    shape: ['--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-control', '--radius-pill', '--radius-panel-compact'],
    elevationAndSurfaces: ['--surface-page', '--surface-card', '--surface-muted', '--surface-overlay', '--surface-inverse', '--elevation-0', '--elevation-1', '--elevation-2', '--elevation-overlay'],
    semanticStates: ['--state-positive', '--state-positive-surface', '--state-negative', '--state-negative-surface', '--state-attention', '--state-attention-surface', '--state-informative', '--state-informative-surface', '--state-neutral']
};

describe('Avenera token contract', () => {
    it('defines every product token in source and generated runtime CSS', () => {
        const source = read('input.css');
        const runtime = read('styles.css');
        Object.values(contract).flat().forEach(name => {
            expect(tokenValue(source, name), `${name} missing in input.css`).toBeTruthy();
            expect(runtime, `${name} missing in styles.css`).toContain(name);
        });
    });

    it('keeps source and runtime values synchronized for non-theme tokens', () => {
        const source = read('input.css');
        const runtime = read('styles.css');
        [...contract.typography, ...contract.spacing, ...contract.shape].forEach(name => {
            expect(tokenValue(runtime, name), `${name} missing in styles.css`).toBe(tokenValue(source, name));
        });
    });

    it('keeps semantic state and surface aliases resolvable in both themes', () => {
        const source = read('input.css');
        expect(source.match(/\.dark\s*\{[\s\S]*?--surface-page:/)?.[0]).toBeTruthy();
        ['--state-positive', '--state-negative', '--state-attention', '--state-informative', '--surface-card', '--surface-overlay'].forEach(name => {
            expect(source).toContain(`${name}:`);
        });
        expect(source).toContain('.nv-dashboard-card');
        expect(source).toContain('var(--surface-card)');
        expect(source).toContain('.nv-modal-shell');
        expect(source).toContain('var(--elevation-overlay)');
    });
});

export { contract };
