import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    BACKUP_FORMAT_ID,
    BACKUP_METADATA_KEY,
    BACKUP_SCHEMA_VERSION,
    createBackupDocument,
    normalizeBackupDocument,
} from './backup-format.js';

const read = file => readFileSync(resolve(process.cwd(), file), 'utf8');
const sampleDatabase = () => ({
    transacoes: [{ id: 'tx-1', valor: 12.5, data: '2026-09-24' }],
    bancos: [{ id: 'bank-1', saldo: 50 }],
    cartoes: [],
    conciliacoesFaturas: [{ chave: 'card-1:2026-09', valorFaturaReal: 12.5 }],
    reservas: [{ id: 'reserve-1', saldo: 7.5 }],
});

describe('formato e recuperação de backups', () => {
    it('exporta snapshot versionado sem perder campos e o normaliza para restauração', () => {
        const source = sampleDatabase();
        const document = createBackupDocument(source, '2026-09-24T12:00:00.000Z');
        const normalized = normalizeBackupDocument(document);

        expect(document[BACKUP_METADATA_KEY]).toEqual({
            format: BACKUP_FORMAT_ID,
            schemaVersion: BACKUP_SCHEMA_VERSION,
            exportedAt: '2026-09-24T12:00:00.000Z',
        });
        expect(normalized.database).toEqual(source);
        expect(normalized).toMatchObject({ totalRecords: 4, isLegacy: false, schemaVersion: 1 });
    });

    it('continua aceitando backup legado sem metadados, desde que tenha as coleções centrais', () => {
        const normalized = normalizeBackupDocument({ transacoes: [], bancos: [{ id: 'bank-legacy', saldo: 0 }] });
        expect(normalized).toMatchObject({ totalRecords: 1, isLegacy: true, schemaVersion: 0 });
        expect(normalized.database.bancos).toHaveLength(1);
    });

    it('rejeita backup incompleto, coleções inválidas, registros nulos e versões futuras', () => {
        expect(() => normalizeBackupDocument([])).toThrow('backup Avenera válido');
        expect(() => normalizeBackupDocument({ transacoes: [] })).toThrow('bancos');
        expect(() => normalizeBackupDocument({ transacoes: [], bancos: {} })).toThrow('falta a coleção bancos');
        expect(() => normalizeBackupDocument({ transacoes: [null], bancos: [] })).toThrow('transacoes está inválida');
        expect(() => normalizeBackupDocument({
            transacoes: [], bancos: [],
            [BACKUP_METADATA_KEY]: { format: BACKUP_FORMAT_ID, schemaVersion: 2 },
        })).toThrow('não é compatível');
        expect(() => normalizeBackupDocument({
            transacoes: [], bancos: [],
            [BACKUP_METADATA_KEY]: { format: 'outro-app', schemaVersion: 1 },
        })).toThrow('não é reconhecido');
    });

    it('usa download em Blob, valida o backup antes de restaurar e avisa em vez de disparar download automático', () => {
        const app = read('app.js');
        const worker = read('service-worker.js');
        const check = app.slice(app.indexOf('checkAutoBackup:'), app.indexOf('setupSmartCategories:'));
        expect(app).toContain('createBackupDocument(db');
        expect(app).toContain('normalizeBackupDocument(JSON.parse(event.target.result))');
        expect(app).toContain('URL.createObjectURL(blob)');
        expect(check).toContain("action: { action: 'exportBackup'");
        expect(check).not.toContain('App.exportBackup(true)');
        expect(worker).toContain("'./backup-format.js'");
        expect(worker).toContain('avenera-app-shell-v11');
    });
});
