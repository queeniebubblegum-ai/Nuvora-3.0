export const BACKUP_METADATA_KEY = '__aveneraBackup';
export const BACKUP_FORMAT_ID = 'avenera-backup';
export const BACKUP_SCHEMA_VERSION = 1;

const ARRAY_COLLECTIONS = [
    'transacoes', 'bancos', 'cartoes', 'conciliacoesFaturas', 'metas', 'reservas',
    'orcamentos', 'notificacoes', 'agendamentos', 'categorias', 'contatos',
    'historicoMentoria', 'receitasFuturas', 'assinaturas', 'investimentos',
];
const OBJECT_COLLECTIONS = ['usuario', 'configNotificacoes', 'metadados'];
const REQUIRED_COLLECTIONS = ['transacoes', 'bancos'];
const isRecord = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cloneJSON = value => {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (_error) {
        throw new Error('O backup contém dados que não podem ser serializados.');
    }
};

export const normalizeBackupDocument = document => {
    if (!isRecord(document)) throw new Error('O arquivo não contém um backup Avenera válido.');

    const metadata = document[BACKUP_METADATA_KEY];
    const isLegacy = metadata === undefined;
    if (!isLegacy) {
        if (!isRecord(metadata) || metadata.format !== BACKUP_FORMAT_ID) {
            throw new Error('O formato do backup não é reconhecido.');
        }
        if (metadata.schemaVersion !== BACKUP_SCHEMA_VERSION) {
            throw new Error('Esta versão do backup não é compatível com esta versão do Avenera.');
        }
    }

    const database = cloneJSON(document);
    delete database[BACKUP_METADATA_KEY];
    for (const collection of REQUIRED_COLLECTIONS) {
        if (!Array.isArray(database[collection])) {
            throw new Error(`O backup está incompleto: falta a coleção ${collection}.`);
        }
    }
    for (const collection of ARRAY_COLLECTIONS) {
        if (database[collection] === undefined) continue;
        if (!Array.isArray(database[collection]) || database[collection].some(item => !isRecord(item))) {
            throw new Error(`A coleção ${collection} está inválida no backup.`);
        }
    }
    for (const collection of OBJECT_COLLECTIONS) {
        if (database[collection] !== undefined && !isRecord(database[collection])) {
            throw new Error(`O registro ${collection} está inválido no backup.`);
        }
    }

    const totalRecords = ARRAY_COLLECTIONS.reduce((total, collection) => total + (database[collection]?.length || 0), 0);
    return { database, totalRecords, isLegacy, schemaVersion: isLegacy ? 0 : metadata.schemaVersion };
};

export const createBackupDocument = (database, exportedAt = new Date().toISOString()) => {
    if (!isRecord(database)) throw new Error('Não foi possível preparar os dados para backup.');
    const document = cloneJSON(database);
    document[BACKUP_METADATA_KEY] = {
        format: BACKUP_FORMAT_ID,
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: String(exportedAt),
    };
    normalizeBackupDocument(document);
    return document;
};
