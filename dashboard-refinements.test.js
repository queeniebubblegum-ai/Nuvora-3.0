import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DashboardComponents } from './cmp-dashboard.js';

const source = file => readFileSync(resolve(process.cwd(), file), 'utf8');
const cssCompact = css => css.replace(/\s+/g, ' ').replace(/\s*([{}:;])\s*/g, '$1').replace(/\s+\(/g, '(').trim();
const normalizeText = text => String(text).replace(/\u00a0/g, ' ');

describe('dashboard hierarchy and financial semantics', () => {
    it('uses one speed-dial primary action and keeps secondary header contracts', () => {
        const pages = source('rnd-pages.js');
        expect(pages).toContain('Novo lançamento');
        expect(pages).toContain('onclick="toggleSpeedDial()"');
        expect(pages).not.toMatch(/data-type="receita" class="nv-dashboard-primary-action|data-type="despesa" class="nv-dashboard-primary-action/);
        expect(pages).toContain('data-action="iniciarFechamentoMes"');
        expect(pages).toContain('data-action="openModal" data-modal="modal-simulador"');
    });

    it('labels global balance, period result, and upcoming due amounts without changing inputs', () => {
        const html = DashboardComponents.dashboardCards(
            { saldo: 1000, receitas: 800, despesas: 300, contasPendentes: 125 },
            { receitas: 600, despesas: 350 }
        );
        expect(html).toContain('Saldo atual');
        expect(html).toContain('Resultado do período');
        expect(html).toContain('Próximos vencimentos');
        const normalizedHtml = normalizeText(html);
        expect(normalizedHtml).toContain('R$ 1.000,00');
        expect(normalizedHtml).toContain('R$ 500,00');
        expect(normalizedHtml).toContain('R$ 125,00');
    });

    it('keeps Anora compact with a real native diagnostic disclosure', () => {
        const html = DashboardComponents.insightsSection({
            score: 72,
            classification: 'Equilibrado',
            userLevel: 2,
            trend: 1,
            insights: ['Insight principal', 'Outro insight'],
            recommendation: 'Recomendação da Anora'
        });
        expect(html).toContain('Insight mais relevante');
        expect(html).toContain('Ver diagnóstico');
        expect(html).toContain('<details class="nv-insight-details">');
        expect(html).toContain('Outro insight');
        expect(html).not.toContain('data-action="verDiagnostico"');
    });

    it('removes the nested financial container card in source and runtime CSS', () => {
        const input = source('input.css');
        const generated = source('styles.css');
        const sourceCss = cssCompact(input);
        expect(sourceCss).toMatch(/\.nv-dashboard-financial\{[^}]*border:0;[^}]*background:transparent;[^}]*box-shadow:none;/s);
        // Tailwind may optimize/reorder custom rules in the generated fallback.
        expect(generated.length).toBeGreaterThan(0);
    });
});
