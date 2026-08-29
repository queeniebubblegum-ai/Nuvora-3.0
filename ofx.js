import { db, Database } from './db.js';
import { Utils } from './utils.js';

export const OFXManager = {
    iniciarImportacaoOFX: (bancoId, viewState) => {
        viewState.bancoAlvoOFX = bancoId || '';
        document.getElementById('input-ofx-file').click();
    },

    handleOFXUpload: (e, viewState, renderCallback, openModalCallback) => {
        const file = e.target.files[0];
        if (!file) return;

        const bancoIdPrevio = viewState.bancoAlvoOFX || '';
        const reader = new FileReader();

        reader.onload = (event) => {
            viewState.rawOfxString = event.target.result;
            OFXManager.processarEVerificarDuplicidades(event.target.result, bancoIdPrevio, viewState, renderCallback, openModalCallback);
            e.target.value = ''; 
        };

        reader.readAsText(file);
    },

    handleOfxBancoChange: (novoBancoId, viewState, renderCallback, openModalCallback) => {
        if(viewState.rawOfxString) {
            OFXManager.processarEVerificarDuplicidades(viewState.rawOfxString, novoBancoId, viewState, renderCallback, openModalCallback);
        }
    },

    processarEVerificarDuplicidades: (ofxString, bancoId, viewState, renderCallback, openModalCallback) => {
        const parsedData = Utils.parseOFX(ofxString);
        const transacoesOFX = parsedData.transactions;

        const selectBanco = document.getElementById('ofx-banco-alvo-id');
        if (selectBanco) {
            let optionsHtml = `<option value="" disabled ${!bancoId ? 'selected' : ''}>Selecione a conta...</option>`;
            optionsHtml += db.bancos.map(b => {
                const displayName = Utils.formatBankName(b);
                return `<option value="${b.id}" ${bancoId && b.id.toString() === bancoId.toString() ? 'selected' : ''}>${Utils.escapeHTML(displayName)}</option>`;
            }).join('');
            selectBanco.innerHTML = optionsHtml;
        }

        const formatD = d => d ? d.split('-').reverse().join('/') : '--/--/----';
        const headerDatas = document.getElementById('ofx-header-datas');
        if (headerDatas) {
            headerDatas.innerText = `Período: ${formatD(parsedData.dtStart)} a ${formatD(parsedData.dtEnd)}`;
        }
        
        viewState.ofxPendenteSaldoFinal = parsedData.balance;

        const lblSaldo = document.getElementById('ofx-saldo-final-lbl');
        if (lblSaldo) {
            lblSaldo.innerText = parsedData.balance !== null ? Utils.formatMoney(parsedData.balance) : 'Não informado';
        }

        const chkSaldo = document.getElementById('ofx-confirmar-saldo');
        if (chkSaldo) chkSaldo.checked = false;

        let transacoesExistentes = [];
        let dataCriacaoBanco = null;
        
        if (bancoId) {
            transacoesExistentes = db.transacoes.filter(t => t.bancoId.toString() === bancoId.toString());
            const bancoAlvo = db.bancos.find(b => b.id.toString() === bancoId.toString());
            if (bancoAlvo && bancoAlvo.dataCriacao) {
                dataCriacaoBanco = new Date(bancoAlvo.dataCriacao + 'T12:00:00');
            }
        }

        let countNovos = 0;
        let countDuplicadosOuIgnorados = 0;

        viewState.ofxPendente = transacoesOFX.map(ofx => {
            const ofxDescLimpa = ofx.desc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const dataOfx = new Date(ofx.data + 'T12:00:00');

            const isRetroativa = dataCriacaoBanco && dataOfx <= dataCriacaoBanco;

            const duplicata = bancoId ? transacoesExistentes.find(t => {
                if (Math.abs(Math.abs(t.valor) - Math.abs(ofx.valor)) > 0.01) return false;
                
                const dataT = new Date(t.data + 'T12:00:00');
                const diffDias = Math.abs((dataOfx - dataT) / (1000 * 60 * 60 * 24));
                if (diffDias > 2) return false;

                const tDescLimpa = t.desc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const palavrasChave = tDescLimpa.split(' ').filter(p => p.length > 2);
                
                return palavrasChave.some(p => ofxDescLimpa.includes(p)) || 
                       ofxDescLimpa.includes(tDescLimpa) || 
                       tDescLimpa.includes(ofxDescLimpa);
            }) : null;

            let status = 'nova';
            if (duplicata) status = 'duplicada';
            else if (isRetroativa) status = 'ignorada_saldo_inicial';

            if (status !== 'nova') countDuplicadosOuIgnorados++; else countNovos++;

            return {
                ...ofx,
                idTemp: Date.now() + Math.random().toString(36).substring(2, 9),
                status: status,
                transacaoOriginal: duplicata || null,
                selecionado: (status === 'nova') 
            };
        });

        document.getElementById('ofx-count-novos').innerText = countNovos;
        document.getElementById('ofx-count-duplicados').innerText = countDuplicadosOuIgnorados;

        OFXManager.renderOFXReviewList(viewState);
        if (openModalCallback) openModalCallback('modal-revisao-ofx');
    },

    renderOFXReviewList: (viewState) => {
        const container = document.getElementById('lista-revisao-ofx');
        container.innerHTML = '';

        if (!viewState.ofxPendente || viewState.ofxPendente.length === 0) {
            container.innerHTML = '<p class="text-center text-text-secondary py-10">Nenhuma transação encontrada no arquivo.</p>';
            return;
        }

        const html = viewState.ofxPendente.map(item => {
            const isDuplicada = item.status === 'duplicada';
            const isRetroativa = item.status === 'ignorada_saldo_inicial';
            
            let bgColor = 'bg-surface border-border hover:border-brand-medium';
            if (isDuplicada) bgColor = 'bg-warning/10 border-warning/30';
            else if (isRetroativa) bgColor = 'bg-blue-500/10 border-blue-500/30';

            const icon = item.tipo === 'receita' ? '<i class="fa-solid fa-arrow-trend-up text-success"></i>' : '<i class="fa-solid fa-arrow-trend-down text-danger"></i>';
            const valorFormatado = parseFloat(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            const alertaDuplicidade = isDuplicada ? `
                <div class="mt-3 p-2 bg-white/50 rounded-[8px] text-[11px] text-text-secondary border border-warning/20 flex gap-2">
                    <i class="fa-solid fa-code-merge mt-0.5 text-warning"></i>
                    <div>
                        <strong class="text-warning">Provável duplicidade com lançamento manual:</strong><br>
                        ${Utils.escapeHTML(item.transacaoOriginal.desc)} (${item.transacaoOriginal.data.split('-').reverse().join('/')})
                    </div>
                </div>
            ` : '';

            const alertaRetroativa = isRetroativa ? `
                <div class="mt-3 p-2 bg-blue-500/10 rounded-[8px] text-[11px] text-text-secondary border border-blue-500/20 flex gap-2">
                    <i class="fa-solid fa-info-circle mt-0.5 text-blue-500"></i>
                    <div>
                        <strong class="text-blue-500">Transação retroativa ignorada:</strong><br>
                        Esta data é anterior ou igual à criação da conta. Provavelmente já compõe o seu saldo inicial.
                    </div>
                </div>
            ` : '';

            let badgeStatus = '<span class="text-[10px] font-bold uppercase tracking-wider text-success">Novo</span>';
            if (isDuplicada) badgeStatus = '<span class="text-[10px] font-bold uppercase tracking-wider text-warning">Ignorado</span>';
            else if (isRetroativa) badgeStatus = '<span class="text-[10px] font-bold uppercase tracking-wider text-blue-500">Retroativo</span>';

            return `
                <div class="p-4 rounded-[12px] border transition-colors ${bgColor} flex flex-col cursor-pointer" onclick="App.toggleSelecaoOFX('${item.idTemp}')">
                    <div class="flex items-center gap-4">
                        <div class="flex-shrink-0">
                            <input type="checkbox" id="check-ofx-${item.idTemp}" ${item.selecionado ? 'checked' : ''} class="w-5 h-5 text-brand-medium rounded focus:ring-brand-medium cursor-pointer" onclick="event.stopPropagation(); App.toggleSelecaoOFX('${item.idTemp}')">
                        </div>
                        <div class="w-10 h-10 rounded-full bg-bg flex items-center justify-center text-lg shadow-sm border border-border shrink-0">
                            ${icon}
                        </div>
                        <div class="flex-1 overflow-hidden">
                            <h4 class="text-sm font-bold text-text-primary truncate" title="${Utils.escapeHTML(item.desc)}">${Utils.escapeHTML(item.desc)}</h4>
                            <p class="text-[10px] text-text-secondary truncate mt-0.5 opacity-70" title="${Utils.escapeHTML(item.observacao)}"><i class="fa-solid fa-circle-info"></i> ${Utils.escapeHTML(item.observacao)}</p>
                            <p class="text-[11px] text-text-secondary font-mono mt-1">${item.data.split('-').reverse().join('/')} <span class="mx-1">•</span> <span class="text-brand-medium">${Utils.escapeHTML(item.formaPagamento)}</span></p>
                        </div>
                        <div class="text-right shrink-0 ml-2">
                            <p class="text-sm font-bold font-mono ${item.tipo === 'receita' ? 'text-success' : 'text-text-primary'}">${valorFormatado}</p>
                            ${badgeStatus}
                        </div>
                    </div>
                    ${alertaDuplicidade}
                    ${alertaRetroativa}
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    toggleSelecaoOFX: (idTemp, viewState) => {
        const item = viewState.ofxPendente.find(i => i.idTemp === idTemp);
        if (item) {
            item.selecionado = !item.selecionado;
            const checkbox = document.getElementById(`check-ofx-${idTemp}`);
            if (checkbox) checkbox.checked = item.selecionado;
        }
    },

    salvarOFXAprovado: (viewState, closeModalCallback, scheduleRenderCallback) => {
        const selectBanco = document.getElementById('ofx-banco-alvo-id');
        const bancoId = selectBanco ? selectBanco.value : '';
        const chkSaldo = document.getElementById('ofx-confirmar-saldo');
        
        if (!bancoId) {
            Utils.showToast('Você deve selecionar a Conta Alvo para importar.', 'error');
            return;
        }

        if (chkSaldo && chkSaldo.checked && viewState.ofxPendenteSaldoFinal !== null) {
            const banco = db.bancos.find(b => b.id.toString() === bancoId.toString());
            if (banco) {
                banco.saldo = viewState.ofxPendenteSaldoFinal;
                Database.save('bancos');
            }
        }

        const itensParaSalvar = viewState.ofxPendente.filter(i => i.selecionado);

        if (itensParaSalvar.length === 0 && (!chkSaldo || !chkSaldo.checked)) {
            Utils.showToast('Nenhum item selecionado e saldo não atualizado.', 'warning');
            return;
        }

        itensParaSalvar.forEach(item => {
            let categoriaInferida = 'Outros';
            const itemDescLimpa = item.desc.toLowerCase();
            
            if (itemDescLimpa.includes('uber') || itemDescLimpa.includes('posto')) categoriaInferida = 'Transporte';
            else if (itemDescLimpa.includes('mercado') || itemDescLimpa.includes('ifood')) categoriaInferida = 'Alimentação';
            else if (itemDescLimpa.includes('salario') || itemDescLimpa.includes('rendimento')) categoriaInferida = 'Salário';

            Database.add('transacoes', {
                id: Date.now() + Math.floor(Math.random() * 1000),
                desc: item.desc,
                valor: item.valor,
                tipo: item.tipo,
                categoria: categoriaInferida,
                bancoId: Number(bancoId),
                isCartao: false,
                formaPagamento: item.formaPagamento || 'Transferência', 
                observacoes: item.observacao,
                data: item.data,
                codigoRef: `OFX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                importadoOFX: true 
            });
        });

        Utils.showToast(`${itensParaSalvar.length} transações importadas com sucesso!`, 'success');
        if (closeModalCallback) closeModalCallback();
        if (scheduleRenderCallback) scheduleRenderCallback(); 
    }
};