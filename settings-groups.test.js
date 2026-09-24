import { describe, expect, it } from 'vitest';
import { PageComponents } from './cmp-pages.js';
import { settingsGroups } from './rnd-pages.js';

const database = {
    usuario: { nome: 'Maria', subtitulo: '', fotoUrl: 'assets/perfil.svg', mentorStyle: 'equilibrado' },
    bancos: [{ id: 'bank-1', nome: 'Conta' }],
    cartoes: [], transacoes: [], categorias: [], metas: [], orcamentos: [],
    agendamentos: [], receitasFuturas: [], assinaturas: [], investimentos: [], contatos: [], notificacoes: []
};

describe('grupos de Configurações', () => {
    it('renders the declarative groups as working navigation cards and target panels', () => {
        const html = PageComponents.settingsPage(database, settingsGroups);
        for (const group of settingsGroups) {
            expect(html).toContain(`data-action="openSettingsGroup" data-group="${group.id}"`);
            expect(html).toContain(`id="settings-group-${group.id}"`);
            expect(html).toContain(group.title);
            expect(html).toContain(group.description);
        }
        expect(html).toContain('data-action="toggleTheme"');
        expect(html).toContain('data-change="setReducedMotion"');
        expect(html).toContain('data-action="exportBackup"');
        expect(html).toContain('data-action="importBackupPicker"');
        expect(html).toContain('data-action="iniciarImportacaoCSV"');
        expect(html).toContain('data-action="iniciarImportacaoOFX"');
    });

    it('renders Anora preferences with local telemetry disabled by default', () => {
        const html = PageComponents.settingsPage(database, settingsGroups);
        expect(html).toContain('data-preference="style"');
        expect(html).toContain('data-preference="notifications"');
        expect(html).toMatch(/data-preference="localTelemetry"[^>]*aria-label="Ativar telemetria local"/);
        expect(html).not.toMatch(/data-preference="localTelemetry"[^>]*checked/);
        expect(html).toContain('Redução de movimento');
    });

    it('states clearly that whole-database cleanup is not exposed as a destructive control', () => {
        const html = PageComponents.settingsPage(database, settingsGroups);
        expect(html).toContain('A limpeza integral não está disponível nesta tela.');
        expect(html).toContain('Nenhum dado será apagado aqui.');
        expect(html).not.toContain('data-action="clearAllData"');
    });
});
