export const IMPORT_ERROR_CODES = Object.freeze({
    EMPTY_FILE: 'IMPORT_EMPTY_FILE',
    INVALID_FORMAT: 'IMPORT_INVALID_FORMAT',
    CSV_INVALID_FORMAT: 'CSV_INVALID_FORMAT',
    OFX_INVALID_FORMAT: 'OFX_INVALID_FORMAT',
    PARSE_ERROR: 'IMPORT_PARSE_ERROR'
});

export const IMPORT_ERROR_MESSAGES = Object.freeze({
    [IMPORT_ERROR_CODES.EMPTY_FILE]: 'O arquivo está vazio ou não contém movimentações válidas.',
    [IMPORT_ERROR_CODES.CSV_INVALID_FORMAT]: 'O CSV precisa ter colunas de data e valor e pelo menos uma movimentação válida.',
    [IMPORT_ERROR_CODES.OFX_INVALID_FORMAT]: 'O arquivo OFX não está em um formato reconhecido.',
    [IMPORT_ERROR_CODES.PARSE_ERROR]: 'Não foi possível ler o arquivo. Verifique o formato e tente novamente.'
});

export class ImportError extends Error {
    constructor(code, message = IMPORT_ERROR_MESSAGES[code] || IMPORT_ERROR_MESSAGES[IMPORT_ERROR_CODES.PARSE_ERROR], cause = null) {
        super(message);
        this.name = 'ImportError';
        this.code = code;
        this.cause = cause;
    }
}

export const asImportError = (error, fallbackCode = IMPORT_ERROR_CODES.PARSE_ERROR) => {
    if (error instanceof ImportError) return error;
    return new ImportError(fallbackCode, IMPORT_ERROR_MESSAGES[fallbackCode], error);
};
