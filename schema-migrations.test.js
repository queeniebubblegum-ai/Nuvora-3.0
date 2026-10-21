import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, migrateDatabaseSnapshot } from './schema-migrations.js';

describe('migrações de schema do banco local', () => {
    it('preenche coleções, IDs legados e marca a versão atual sem apagar valores', () => {
        const result = migrateDatabaseSnapshot({
            transacoes: [{ desc: 'Legado', valor: 10 }],
            bancos: [{ id: 'bank-1', nome: 'Conta', saldo: 100 }],
            usuario: { nome: 'Maria' },
            metadados: { schemaVersion: 0 },
        });
        expect(result.changed).toBe(true);
        expect(result.database.transacoes[0].id).toBe('legacy-transacoes-1');
        expect(result.database.usuario.nome).toBe('Maria');
        expect(result.database.metadados.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        expect(result.database.configNotificacoes.lembretesVencimentoAtivo).toBe(true);
    });

    it('é idempotente depois da migração', () => {
        const first = migrateDatabaseSnapshot({ transacoes: [], bancos: [] });
        const second = migrateDatabaseSnapshot(first.database);
        expect(second.changed).toBe(false);
        expect(second.changes).toEqual([]);
    });
});

