import { CURRENT_SCHEMA_VERSION } from './schema-migrations.js';

export const BACKUP_METADATA_KEY = '__aveneraBackup';
export const BACKUP_FORMAT_ID = 'avenera-backup';
export const BACKUP_SCHEMA_VERSION = 2;

const ARRAY_COLLECTIONS = [
    'transacoes', 'bancos', 'cartoes', 'conciliacoesFaturas', 'historicoAlteracoes', 'conferencias', 'metas', 'reservas',
    'orcamentos', 'notificacoes', 'agendamentos', 'categorias', 'contatos',
    'historicoMentoria', 'receitasFuturas', 'assinaturas', 'investimentos', 'fechamentosMes',
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

const isValidDateValue = value => {
    if (value === undefined || value === null || value === '') return true;
    const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
    return !Number.isNaN(date.getTime());
};

const validateFinancialRecords = (collection, records) => {
    const ids = new Set();
    const moneyFields = new Set(['valor', 'saldo', 'saldoInicial', 'limite', 'alvo', 'atual', 'valorAtual', 'rendaMensalMedia']);
    const dateFields = new Set(['data', 'dataVencimento', 'dataPagamento', 'dataCriacao', 'proximaCobranca', 'dataProximaCobranca']);
    records.forEach((record, index) => {
        if (record.id !== undefined && record.id !== null) {
            const id = String(record.id);
            if (ids.has(id)) throw new Error(`A coleção ${collection} contém IDs duplicados (${id}).`);
            ids.add(id);
        }
        Object.entries(record).forEach(([key, value]) => {
            if (moneyFields.has(key) && value !== '' && value !== null && !Number.isFinite(Number(value))) {
                throw new Error(`O campo ${collection}[${index}].${key} precisa ser numérico.`);
            }
            if (dateFields.has(key) && !isValidDateValue(value)) {
                throw new Error(`A data ${collection}[${index}].${key} é inválida.`);
            }
        });
    });
};

export const normalizeBackupDocument = document => {
    if (!isRecord(document)) throw new Error('O arquivo não contém um backup Avenera válido.');

    const metadata = document[BACKUP_METADATA_KEY];
    const isLegacy = metadata === undefined;
    if (!isLegacy) {
        if (!isRecord(metadata) || metadata.format !== BACKUP_FORMAT_ID) {
            throw new Error('O formato do backup não é reconhecido.');
        }
        if (![1, BACKUP_SCHEMA_VERSION].includes(metadata.schemaVersion)) {
            throw new Error('Esta versão do backup não é compatível com esta versão do Avenera.');
        }
    }

    const database = cloneJSON(document);
    if (Number(database.metadados?.schemaVersion || 0) > CURRENT_SCHEMA_VERSION) throw new Error('O backup usa um esquema de dados mais recente. Atualize a Avenera antes de restaurar.');
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
        validateFinancialRecords(collection, database[collection]);
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
