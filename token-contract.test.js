import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = file => readFileSync(resolve(process.cwd(), file), 'utf8');
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/*
 * CSS custom properties are not limited to simple words: font stacks are
 * quoted, shadows contain nested functions, and Tailwind's runtime output may
 * be minified.  Keep the small parser here deliberately CSS-aware instead of
 * using a `[^;]+` expression that breaks on those forms or on a final
 * declaration without a semicolon.
 */
const withoutComments = css => css.replace(/\/\*[\s\S]*?\*\//g, match => ' '.repeat(match.length));

const findCssBlocks = (css, selector) => {
    const source = withoutComments(css);
    const openPattern = new RegExp(`${escapeRegExp(selector)}\\s*\\{`, 'g');
    const blocks = [];
    let match;

    while ((match = openPattern.exec(source))) {
        const openBrace = source.indexOf('{', match.index);
        let depth = 1;
        let quote = null;
        let escaped = false;

        for (let index = openBrace + 1; index < source.length; index += 1) {
            const character = source[index];
            if (quote) {
                if (escaped) escaped = false;
                else if (character === '\\') escaped = true;
                else if (character === quote) quote = null;
                continue;
            }
            if (character === '"' || character === "'") {
                quote = character;
            } else if (character === '{') {
                depth += 1;
            } else if (character === '}' && --depth === 0) {
                blocks.push(source.slice(openBrace + 1, index));
                openPattern.lastIndex = index + 1;
                break;
            }
        }
    }

    return blocks;
};

const normalizeOutsideQuotes = (value, transform) => {
    let output = '';
    let segment = '';
    let quote = null;
    let escaped = false;

    const flush = () => {
        output += transform(segment);
        segment = '';
    };

    for (const character of value) {
        if (quote) {
            output += character;
            if (escaped) escaped = false;
            else if (character === '\\') escaped = true;
            else if (character === quote) quote = null;
            continue;
        }
        if (character === '"' || character === "'") {
            flush();
            output += character;
            quote = character;
        } else {
            segment += character;
        }
    }
    flush();
    return output;
};

const normalizeCssValue = value => normalizeOutsideQuotes(value.trim(), segment => segment
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),\/])\s*/g, '$1')
    // CSS minifiers commonly shorten 0.08 to .08.
    .replace(/(^|[\s(,:\/])(-?)0+\.(\d+)/g, '$1$2.$3')
).trim();

const scanToDeclarationEnd = (css, start) => {
    let quote = null;
    let escaped = false;
    let parentheses = 0;
    for (let index = start; index < css.length; index += 1) {
        const character = css[index];
        if (quote) {
            if (escaped) escaped = false;
            else if (character === '\\') escaped = true;
            else if (character === quote) quote = null;
            continue;
        }
        if (character === '"' || character === "'") quote = character;
        else if (character === '(') parentheses += 1;
        else if (character === ')') parentheses = Math.max(0, parentheses - 1);
        else if ((character === ';' || character === '{' || character === '}') && parentheses === 0) return index;
    }
    return css.length;
};

const parseDeclarations = css => {
    const source = withoutComments(css);
    const declarations = new Map();
    let index = 0;

    while (index < source.length) {
        while (index < source.length && /[\s;]/.test(source[index])) index += 1;
        const nameMatch = source.slice(index).match(/^--[-\w]+/);
        if (!nameMatch) {
            index = scanToDeclarationEnd(source, index) + 1;
            continue;
        }

        const name = nameMatch[0];
        let colon = index + name.length;
        while (/\s/.test(source[colon] || '')) colon += 1;
        if (source[colon] !== ':') {
            index += name.length;
            continue;
        }

        const end = scanToDeclarationEnd(source, colon + 1);
        declarations.set(name, normalizeCssValue(source.slice(colon + 1, end)));
        index = end + 1;
    }
    return declarations;
};

const tokenValue = (css, name) => parseDeclarations(css).get(name);
const blockTokens = (css, selector) => parseDeclarations(findCssBlocks(css, selector)[0] || '');

const contract = {
    typography: ['--font-ui', '--font-mono', '--font-size-xs', '--font-size-sm', '--font-size-md', '--font-size-base', '--font-size-lg', '--font-size-xl', '--font-size-2xl', '--font-size-display', '--font-weight-regular', '--font-weight-medium', '--font-weight-semibold', '--font-weight-bold', '--line-height-tight', '--line-height-body', '--line-height-relaxed', '--tracking-label'],
    spacing: ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-7', '--space-8'],
    shape: ['--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-control', '--radius-pill', '--radius-panel-compact'],
    elevationAndSurfaces: ['--surface-page', '--surface-card', '--surface-muted', '--surface-overlay', '--surface-inverse', '--elevation-0', '--elevation-1', '--elevation-2', '--elevation-overlay'],
    semanticStates: ['--state-positive', '--state-positive-surface', '--state-negative', '--state-negative-surface', '--state-attention', '--state-attention-surface', '--state-informative', '--state-informative-surface', '--state-neutral']
};

const themeAliases = [
    '--surface-page', '--surface-card', '--surface-muted', '--surface-overlay', '--surface-inverse',
    '--state-positive', '--state-positive-surface', '--state-negative', '--state-negative-surface',
    '--state-attention', '--state-attention-surface', '--state-informative', '--state-informative-surface', '--state-neutral'
];

const nonThemeTokens = [...contract.typography, ...contract.spacing, ...contract.shape];
const normalizeForComparison = value => String(value || '').replace(/["']/g, '"');

const expectTokens = (tokens, names, context) => names.forEach(name => {
    expect(tokens.get(name), `${name} missing in ${context}`).toBeTruthy();
});

describe('Avenera token contract', () => {
    it('parses quoted, whitespace-heavy and minified custom-property declarations', () => {
        const css = `:root{--font-ui:'Inter; UI', ui-sans-serif;--font-size-md:14px}.dark{--surface-card:var(--c-surface)}`;
        expect(tokenValue(css, '--font-ui')).toBe("'Inter; UI',ui-sans-serif");
        expect(tokenValue(css, '--font-size-md')).toBe('14px');
        expect(blockTokens(css, '.dark').get('--surface-card')).toBe('var(--c-surface)');
    });

    it('defines every product token in source and generated runtime CSS', () => {
        const source = read('input.css');
        const runtime = read('styles.css');
        expectTokens(blockTokens(source, ':root'), Object.values(contract).flat(), 'input.css :root');
        expectTokens(blockTokens(runtime, ':root'), Object.values(contract).flat(), 'styles.css :root');
    });

    it('keeps source and runtime values synchronized for non-theme tokens', () => {
        const source = blockTokens(read('input.css'), ':root');
        const runtime = blockTokens(read('styles.css'), ':root');
        nonThemeTokens.forEach(name => {
            expect(normalizeForComparison(runtime.get(name)), `${name} missing in styles.css`).toBe(normalizeForComparison(source.get(name)));
        });
    });

    it('keeps semantic state and surface aliases resolvable in both themes', () => {
        const source = read('input.css');
        const runtime = read('styles.css');
        [
            ['input.css', source],
            ['styles.css', runtime]
        ].forEach(([file, css]) => {
            const root = blockTokens(css, ':root');
            const dark = blockTokens(css, '.dark');
            expect(root.size, `${file} :root token block missing`).toBeGreaterThan(0);
            expect(dark.size, `${file} .dark token block missing`).toBeGreaterThan(0);
            expectTokens(root, themeAliases, `${file} :root`);
            expectTokens(dark, themeAliases, `${file} .dark`);
        });

        expect(source).toContain('.nv-dashboard-card');
        expect(source).toContain('var(--surface-card)');
        expect(source).toContain('.nv-modal-shell');
        expect(source).toContain('var(--elevation-overlay)');
    });
});

export { contract, tokenValue };
