import { db } from './db.js';
import { CSVImport } from './csv-import.js';
import { Utils } from './utils.js';
import { asImportError } from './import-errors.js';
import { isInvoicePayment, isTransfer } from './financial-ledger.js';

const normalizeDescription = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const movementType = item => isTransfer(item) ? (item.transferenciaEntrada ? 'receita' : 'despesa') : isInvoicePayment(item) ? 'despesa' : item.tipo;

export const buildCSVReviewRows = (rows, bancoId, { database = db, previous = [] } = {}) => {
    const existing = bancoId ? (database.transacoes || []).filter(item => !item.isCartao && String(item.bancoId) === String(bancoId)) : [];
    const bank = (database.bancos || []).find(item => String(item.id) === String(bancoId));
    const createdAt = bank?.dataCriacao ? new Date(bank.dataCriacao + 'T12:00:00') : null;
    const seen = [];
    return rows.map((item, index) => {
        const date = new Date(item.data + 'T12:00:00');
        const retroactive = createdAt && date <= createdAt;
        const description = normalizeDescription(item.desc);
        const duplicate = [...existing, ...seen].find(transaction => {
            if (item.identificador && String(transaction.codigoRef || transaction.identificador || '') === String(item.identificador)) return true;
            if (Math.abs(Math.abs(transaction.valor) - Math.abs(item.valor)) > 0.01 || movementType(transaction) !== item.tipo) return false;
            const delta = Math.abs((date - new Date(transaction.data + 'T12:00:00')) / 86400000);
            if (delta > 2) return false;
            const other = normalizeDescription(transaction.desc);
            return description && other && (other.split(' ').filter(word => word.length > 2).some(word => description.includes(word)) || description.includes(other) || other.includes(description));
        });
        const status = duplicate ? 'duplicada' : retroactive ? 'ignorada_saldo_inicial' : 'nova';
        const prior = previous.find(value => value.csvRowIndex === index);
        seen.push(item);
        return { ...item, csvRowIndex: index, idTemp: prior?.idTemp || 'csv-' + Date.now() + '-' + index, categoria: prior?.categoria ?? item.categoria, status, transacaoOriginal: duplicate || null, selecionado: prior?.status === status ? prior.selecionado : status === 'nova', formaPagamento: 'Importado CSV', observacao: 'Lançamento importado de CSV' };
    });
};

export const CSVManager = {
    iniciarImportacao: (bancoId, viewState) => {
        viewState.bancoAlvoOFX = bancoId || '';
        document.getElementById('input-csv-file')?.click();
    },
    prepareReview: (viewState, openModalCallback = null) => {
        const bancoId = viewState.bancoAlvoOFX || '';
        viewState.ofxPendente = buildCSVReviewRows(viewState.csvRawRows || [], bancoId, { previous: viewState.ofxPendente || [] });
        const select = document.getElementById('ofx-banco-alvo-id');
        if (select) select.innerHTML = '<option value="" disabled ' + (bancoId === '' ? 'selected' : '') + '>Selecione a conta...</option>' + (db.bancos || []).map(bank => '<option value="' + Utils.escapeHTML(String(bank.id)) + '" ' + (String(bank.id) === String(bancoId) ? 'selected' : '') + '>' + Utils.escapeHTML(Utils.formatBankName(bank)) + '</option>').join('');
        const label = (id, value) => { const element = document.getElementById(id); if (element) element.innerText = value; };
        label('ofx-count-novos', viewState.ofxPendente.filter(item => item.status === 'nova').length);
        label('ofx-count-duplicados', viewState.ofxPendente.filter(item => item.status === 'duplicada').length);
        label('ofx-count-retroativos', viewState.ofxPendente.filter(item => item.status === 'ignorada_saldo_inicial').length);
        label('ofx-modal-title', 'Conciliação CSV');
        label('ofx-header-datas', 'Revisão de lançamentos CSV');
        label('ofx-saldo-final-lbl', 'Não informado');
        const balanceConfirmation = document.getElementById('ofx-confirmar-saldo');
        if (balanceConfirmation) {
            balanceConfirmation.checked = false;
            balanceConfirmation.disabled = true;
            balanceConfirmation.title = 'Arquivos CSV não fornecem um saldo final de extrato.';
        }
        openModalCallback?.('modal-revisao-ofx');
        window.App?.renderOFXReviewList();
        return viewState.ofxPendente;
    },
    handleBancoChange: (bancoId, viewState, openModalCallback = null) => {
        viewState.bancoAlvoOFX = bancoId || '';
        viewState.rawOfxString = null;
        if (!Array.isArray(viewState.csvRawRows)) return false;
        return CSVManager.prepareReview(viewState, openModalCallback);
    },
    handleUpload: (event, viewState, openModalCallback) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const rows = CSVImport.parse(reader.result);
                viewState.tipoImportacao = 'CSV';
                viewState.rawOfxString = null;
                viewState.ofxPendenteSaldoFinal = null;
                viewState.csvRawRows = rows.map(item => ({ ...item }));
                viewState.ofxPendente = [];
                CSVManager.prepareReview(viewState, openModalCallback);
            } catch (error) {
                const importError = asImportError(error);
                Utils.showToast(importError.message, 'error', {
                    action: { action: 'iniciarImportacaoCSV', label: 'Escolher outro arquivo', payload: viewState.bancoAlvoOFX || '' }
                });
            }
            event.target.value = '';
        };
        reader.onerror = () => {
            Utils.showToast('Não foi possível ler o arquivo CSV.', 'error', {
                action: { action: 'iniciarImportacaoCSV', label: 'Escolher outro arquivo', payload: viewState.bancoAlvoOFX || '' }
            });
            event.target.value = '';
        };
        reader.readAsText(file);
    }
};
