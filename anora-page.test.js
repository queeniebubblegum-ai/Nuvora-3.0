import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('Anora full-page integration', () => {
    it('registers the page in the router, renderer, sidebar, header action, and offline shell', () => {
        const router = read('router.js');
        const pages = read('rnd-pages.js');
        const renderer = read('renderer.js');
        const index = read('index.html');
        const worker = read('service-worker.js');
        const css = read('styles.css');
        expect(router).toContain("'Anora'");
        expect(pages).toContain("import { renderAnoraPage } from './rnd-anora.js'");
        expect(pages).toContain('Anora: () => renderAnoraPage()');
        expect(renderer).toContain('PageRenderers[currentPage]');
        expect(index).toContain('id="nav-Anora"');
        expect(index).toContain('data-action="navigate" data-payload="Anora"');
        expect(index).not.toContain('data-action="openModal" data-modal="modal-chat-anora"');
        expect(worker).toContain("'./rnd-anora.js'");
        expect(index).toContain('styles.css?v=20260925-anora-phase5-1');
        expect(worker).toContain('./styles.css?v=20260925-anora-phase5-1');
        expect(worker).toContain("avenera-app-shell-v16");
        expect(css).toContain('.nv-anora-page');
        expect(css).toContain('.nv-anora-chat');
        expect(css).toContain('prefers-reduced-motion:reduce');
    });

    it('uses the real local mentor engine and saved preferences, with no sample financial claims', () => {
        const page = read('rnd-anora.js');
        const css = read('input.css');
        expect(page).toContain('MentorEngine.extrairDadosParaAnora(db, Database)');
        expect(page).toContain('MentorEngine.calculateMentorScore(data)');
        expect(page).toContain('loadAnoraPreferences()');
        expect(page).toContain('Análise local baseada em');
        expect(page).not.toContain('Delivery subiu 34%');
        expect(page).not.toContain('dados até 25/09');
        expect(page).not.toContain('window.Anora');
        expect(page).not.toContain('onclick=');
        expect(css).toContain('.nv-anora-page');
        expect(css).toContain('@media (max-width: 560px)');
        expect(css).toContain('prefers-reduced-motion: reduce');
    });

    it('reuses the existing local chat handler with per-form chat targets and escaped content', () => {
        const page = read('rnd-anora.js');
        const controller = read('ctrl-sistema.js');
        const submit = read('evt-submit.js');
        const click = read('evt-click.js');
        const app = read('app.js');
        const modal = read('cmp-modals.js');
        expect(page).toContain('data-anora-chat');
        expect(page).toContain('data-anora-messages');
        expect(page).toContain('data-anora-input');
        expect(page).toContain('data-submit="chatAnora"');
        expect(submit).toContain("'chatAnora': (evt) => Controllers.submitChatAnora(evt)");
        expect(controller).toContain('AnoraNLP.processarMensagem(msg)');
        expect(controller).toContain('Utils.escapeHTML(msg)');
        expect(controller).toContain('Utils.escapeHTML(respostaAnora)');
        expect(controller).toContain('form?.querySelector(\'[data-anora-input], input[type="text"]\')');
        expect(controller).toContain("form?.closest('[data-anora-chat]') || form?.closest('#modal-chat-anora')");
        expect(modal).toContain('Assistente local');
        expect(modal).not.toContain('Online');
        expect(modal).not.toContain('em tempo real');
        expect(click).toContain("'askAnoraQuestion': () => {");
        expect(click).toContain("'setAnoraStyle': () => {");
        expect(click).toContain("if (updated && App.currentPage === 'Anora') App.scheduleRender();");
        expect(app).toContain('const prefs = saveAnoraPreferences({ [key]: value });');
        expect(app).toContain('Database.updateUser({ mentorStyle: prefs.style });');
    });

    it('keeps quick questions within intents already supported by AnoraNLP', () => {
        const page = read('rnd-anora.js');
        const nlp = read('anora-nlp.js');
        expect(page).toContain('Qual é meu saldo?');
        expect(page).toContain('Quanto gastei com Uber este mês?');
        expect(page).toContain('Quanto gastei este mês?');
        expect(page).toContain('Como estão minhas metas?');
        expect(nlp).toContain('saldo|quanto eu tenho');
        expect(nlp).toContain('gastei|gasto|gastos|despesa|despesas');
        expect(nlp).toContain('meta|metas|reserva|reservas');
    });
});
