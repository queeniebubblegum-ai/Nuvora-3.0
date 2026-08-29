import { db } from './db.js';
import { CSVImport } from './csv-import.js';
import { Utils } from './utils.js';

export const CSVManager = {
    iniciarImportacao: (bancoId, viewState) => {
        viewState.bancoAlvoOFX = bancoId || '';
        document.getElementById('input-csv-file')?.click();
    },
    handleUpload: (event, viewState, openModalCallback) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const rows = CSVImport.parse(reader.result);
                viewState.tipoImportacao = 'CSV';
                const bancoId = viewState.bancoAlvoOFX;
                const existentes = bancoId ? db.transacoes.filter(t => String(t.bancoId) === String(bancoId)) : [];
                const banco = db.bancos.find(b => String(b.id) === String(bancoId));
                const dataCriacao = banco?.dataCriacao ? new Date(`${banco.dataCriacao}T12:00:00`) : null;
                const vistosNoArquivo = [];
                viewState.ofxPendente = rows.map((item, index) => {
                    const dataCSV = new Date(`${item.data}T12:00:00`);
                    const retroativa = dataCriacao && dataCSV <= dataCriacao;
                    const descCSV = item.desc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    const duplicata = [...existentes, ...vistosNoArquivo].find(t => {
                        if (item.identificador && t.codigoRef === item.identificador) return true;
                        if (Math.abs(Math.abs(t.valor) - Math.abs(item.valor)) > 0.01 || t.tipo !== item.tipo) return false;
                        const diffDias = Math.abs((dataCSV - new Date(`${t.data}T12:00:00`)) / 86400000);
                        if (diffDias > 2) return false;
                        const descT = String(t.desc || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        return descT.split(' ').filter(p => p.length > 2).some(p => descCSV.includes(p)) || descCSV.includes(descT) || descT.includes(descCSV);
                    });
                    const status = duplicata ? 'duplicada' : retroativa ? 'ignorada_saldo_inicial' : 'nova';
                    vistosNoArquivo.push(item);
                    return { ...item, idTemp: `csv-${Date.now()}-${index}`, status, transacaoOriginal: duplicata || null, selecionado: status === 'nova', formaPagamento: 'Importado CSV', observacao: 'Lançamento importado de CSV' };
                });
                const select = document.getElementById('ofx-banco-alvo-id');
                if (select) select.innerHTML = '<option value="" disabled selected>Selecione a conta...</option>' + db.bancos.map(b => `<option value="${b.id}">${Utils.escapeHTML(Utils.formatBankName(b))}</option>`).join('');
                const countNovos = document.getElementById('ofx-count-novos');
                const countDuplicados = document.getElementById('ofx-count-duplicados');
                if (countNovos) countNovos.innerText = viewState.ofxPendente.filter(item => item.status === 'nova').length;
                if (countDuplicados) countDuplicados.innerText = viewState.ofxPendente.filter(item => item.status === 'duplicada').length;
                const countRetroativos = document.getElementById('ofx-count-retroativos');
                if (countRetroativos) countRetroativos.innerText = viewState.ofxPendente.filter(item => item.status === 'ignorada_saldo_inicial').length;
                const tituloModal = document.getElementById('ofx-modal-title');
                if (tituloModal) tituloModal.innerText = 'Conciliação CSV';
                const headerDatas = document.getElementById('ofx-header-datas');
                if (headerDatas) headerDatas.innerText = 'Revisão de lançamentos CSV';
                const saldoLabel = document.getElementById('ofx-saldo-final-lbl');
                if (saldoLabel) saldoLabel.innerText = 'Não informado';
                const confirmarSaldo = document.getElementById('ofx-confirmar-saldo');
                if (confirmarSaldo) confirmarSaldo.checked = false;
                openModalCallback('modal-revisao-ofx');
                window.App?.renderOFXReviewList();
            } catch (error) { Utils.showToast(error.message || 'CSV inválido.', 'error'); }
            event.target.value = '';
        };
        reader.readAsText(file);
    }
};
