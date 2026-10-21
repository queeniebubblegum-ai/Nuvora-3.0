export const CURRENT_SCHEMA_VERSION = 3;

const arrayCollections = [
    'transacoes', 'bancos', 'cartoes', 'conciliacoesFaturas', 'metas', 'reservas',
    'orcamentos', 'notificacoes', 'agendamentos', 'categorias', 'contatos',
    'historicoMentoria', 'receitasFuturas', 'assinaturas', 'investimentos', 'fechamentosMes'
];

const clone = value => {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
    return value;
};

const defaults = {
    usuario: { nome: '', subtitulo: '', fotoUrl: 'assets/perfil.svg', mentorStyle: 'equilibrado' },
    configNotificacoes: {
        contasAtivo: true, contasDias: 3, orcamentoAtivo: true, orcamentoPct: 80,
        metasAtivo: true, lembretesVencimentoAtivo: true, sincronizacaoAutomaticaAtiva: true
    },
    metadados: { ultimaAtualizacao: null }
};

/**
 * Applies deterministic, backward-compatible migrations to a database snapshot.
 * It never writes to storage and never replaces existing user values.
 */
export const migrateDatabaseSnapshot = (input, { defaults: customDefaults = defaults } = {}) => {
    const source = input && typeof input === 'object' ? input : {};
    const database = clone(source);
    const changes = [];
    const fromVersion = Number(database.metadados?.schemaVersion || 0);

    arrayCollections.forEach(collection => {
        if (!Array.isArray(database[collection])) {
            database[collection] = [];
            changes.push(`${collection}: coleção criada`);
        }
        database[collection] = database[collection].filter(item => item !== null && item !== undefined).map((item, index) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
            if (item.id === undefined || item.id === null || String(item.id).trim() === '') {
                changes.push(`${collection}[${index}]: identificador legado criado`);
                return { ...item, id: `legacy-${collection}-${index + 1}` };
            }
            return item;
        });
    });
    Object.entries(customDefaults).forEach(([collection, value]) => {
        // Array collections were normalized above. Defaults are only merged
        // here for object-shaped records such as profile and metadata.
        if (Array.isArray(value)) return;
        const current = database[collection];
        if (!current || typeof current !== 'object' || Array.isArray(current)) {
            database[collection] = clone(value);
            changes.push(`${collection}: registro padrão criado`);
            return;
        }
        const merged = { ...clone(value), ...current };
        if (JSON.stringify(merged) !== JSON.stringify(current)) changes.push(`${collection}: campos ausentes preenchidos`);
        database[collection] = merged;
    });
    if (Number(database.metadados.schemaVersion || 0) !== CURRENT_SCHEMA_VERSION) {
        database.metadados.schemaVersion = CURRENT_SCHEMA_VERSION;
        changes.push(`schema: ${fromVersion} → ${CURRENT_SCHEMA_VERSION}`);
    }
    return { database, fromVersion, toVersion: CURRENT_SCHEMA_VERSION, changes, changed: changes.length > 0 };
};

export const isCurrentSchema = database => Number(database?.metadados?.schemaVersion || 0) === CURRENT_SCHEMA_VERSION;

