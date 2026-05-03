export const Modals = {
    getHTML: () => `
    <div id="modal-chat-anora" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="p-4 border-b border-border flex justify-between items-center bg-brand-deep rounded-t-[16px] text-white shrink-0">
                <div class="flex items-center gap-3">
                    <img src="assets/anora.png" class="w-10 h-10 rounded-full border-2 border-white/20 object-cover">
                    <div>
                        <h3 class="font-bold font-primary leading-tight">Anora</h3>
                        <p class="text-[10px] text-brand-soft flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-success inline-block"></span> Online</p>
                    </div>
                </div>
                <button data-action="closeModal" class="text-white/60 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <div class="flex-1 min-h-0 overflow-y-auto p-5 bg-bg space-y-4" id="chat-anora-messages">
                <div class="flex gap-3 max-w-[85%]">
                    <img src="assets/anora.png" class="w-8 h-8 rounded-full shadow-sm shrink-0 object-cover border border-white/10">
                    <div class="bg-surface border border-border p-3.5 rounded-[16px] rounded-tl-none shadow-sm text-sm text-text-primary leading-relaxed">
                        Olá! Estou analisando seus dados em tempo real. O que você gostaria de saber sobre suas finanças hoje?
                    </div>
                </div>
            </div>
            
            <div class="p-3 bg-surface border-t border-border rounded-b-[16px] shrink-0">
                <form data-submit="chatAnora" class="flex gap-2">
                    <input type="text" id="chat-anora-input" required placeholder="Ex: Quanto gastei com Uber?" class="flex-1 p-3 bg-bg border border-border rounded-[12px] text-sm focus:outline-none focus:border-brand-medium text-text-primary transition-colors">
                    <button type="submit" class="bg-brand-medium text-white w-12 h-12 rounded-[12px] shadow-soft flex items-center justify-center hover:bg-brand-dark transition-transform hover:-translate-y-0.5"><i class="fa-solid fa-paper-plane"></i></button>
                </form>
            </div>
        </div>
    </div>

    <div id="modal-historico-anora" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="flex justify-between items-center mb-4 shrink-0">
                <h3 class="text-lg font-bold font-primary text-text-primary">Histórico de Mentoria</h3>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <p class="text-[13px] text-text-secondary mb-5 shrink-0">Acompanhe a evolução do seu perfil financeiro.</p>
            <div class="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1 pb-2" id="lista-historico-anora">
                <div class="text-center py-8 text-text-secondary border border-dashed border-border rounded-[12px] bg-bg">
                    <i class="fa-solid fa-clock-rotate-left text-2xl mb-2 opacity-30"></i>
                    <p class="text-xs">Seu histórico será construído aqui.</p>
                </div>
            </div>
        </div>
    </div>

    <div id="modal-agendamento" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="flex justify-between items-center mb-5 shrink-0">
                <h3 class="text-lg font-bold font-primary text-text-primary">Nova Conta Agendada</h3>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form data-submit="agendamento" class="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Tipo</label>
                    <select id="agendamento-tipo" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm focus:border-brand-medium outline-none text-text-primary transition-all">
                        <option value="despesa">A Pagar (Despesa)</option>
                        <option value="receita">A Receber (Receita)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Descrição</label>
                    <input id="agendamento-desc" type="text" required placeholder="Ex: Aluguel..." class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm focus:border-brand-medium outline-none text-text-primary transition-all">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Valor (R$)</label>
                        <input id="agendamento-valor" type="number" step="0.01" required placeholder="0.00" class="w-full p-2.5 bg-surface font-mono border border-border rounded-[10px] text-sm focus:border-brand-medium outline-none text-text-primary transition-all">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Vencimento</label>
                        <input id="agendamento-data" type="date" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm focus:border-brand-medium outline-none text-text-primary transition-all">
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Categoria</label>
                    <select id="agendamento-categoria" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm focus:border-brand-medium outline-none text-text-primary transition-all"></select>
                </div>
                
                <div class="shrink-0 mt-3">
                    <button type="submit" class="w-full py-3 bg-brand-medium text-white font-bold rounded-[10px] shadow-soft hover:bg-brand-dark transition-all hover:-translate-y-0.5">Adicionar na Agenda</button>
                </div>
            </form>
        </div>
    </div>

    <div id="modal-editar-transacao" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="flex justify-between items-center mb-4 shrink-0">
                <div>
                    <h3 class="text-lg font-bold font-primary text-text-primary">Editar Lançamento</h3>
                    <p class="text-[10px] text-text-secondary font-mono mt-0.5" id="edit-codigo-ref">#TX-000000</p>
                </div>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <form data-submit="editarTransacao" class="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <input type="hidden" id="edit-id">
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Descrição</label>
                    <input id="edit-desc" type="text" required disabled class="w-full p-2.5 bg-bg opacity-70 cursor-not-allowed border border-border rounded-[10px] text-sm transition-all text-text-primary">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Valor (R$)</label>
                        <input id="edit-valor" type="number" step="0.01" required disabled class="w-full p-2.5 bg-bg opacity-70 cursor-not-allowed border border-border rounded-[10px] text-sm font-mono transition-all text-text-primary">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Data</label>
                        <input id="edit-data" type="date" required disabled class="w-full p-2.5 bg-bg opacity-70 cursor-not-allowed border border-border rounded-[10px] text-sm transition-all text-text-primary">
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Categoria</label>
                    <select id="edit-categoria" disabled class="w-full p-2.5 bg-bg opacity-70 border border-border rounded-[10px] text-sm transition-all text-text-primary"></select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Contato</label>
                    <select id="edit-contato" disabled class="w-full p-2.5 bg-bg opacity-70 border border-border rounded-[10px] text-sm transition-all text-text-primary"></select>
                </div>

                <div class="pt-3 border-t border-border mt-4 shrink-0">
                    <button type="button" data-action="toggleEditLock" id="btn-unlock-edit" class="w-full py-2.5 bg-bg text-text-primary text-sm font-bold rounded-[10px] hover:border-border border border-transparent transition-colors flex justify-center items-center gap-2">
                        <i class="fa-solid fa-lock"></i> Destravar Edição
                    </button>
                    <button type="submit" id="btn-save-edit" class="w-full py-2.5 bg-brand-medium text-white text-sm font-bold rounded-[10px] shadow-soft hidden justify-center items-center gap-2 hover:bg-brand-dark transition-colors">
                        <i class="fa-solid fa-check"></i> Salvar Alterações
                    </button>
                </div>
            </form>
        </div>
    </div>

    <div id="modal-contato" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="flex justify-between items-center mb-5 shrink-0">
                <h3 class="text-lg font-bold font-primary text-text-primary">Novo Contato</h3>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form data-submit="contato" class="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Nome / Razão Social</label>
                    <input id="contato-nome" placeholder="Ex: João da Silva" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] focus:border-brand-medium outline-none text-text-primary text-sm">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">CPF ou CNPJ</label>
                    <input id="contato-documento" placeholder="Apenas números" class="w-full p-2.5 bg-surface font-mono border border-border rounded-[10px] focus:border-brand-medium outline-none text-text-primary text-sm">
                </div>
                <div class="shrink-0 mt-3">
                    <button type="submit" class="w-full py-2.5 bg-brand-medium hover:bg-brand-dark text-white text-sm font-bold rounded-[10px] shadow-soft transition-all">Salvar Registro</button>
                </div>
            </form>
        </div>
    </div>

    <div id="modal-categoria" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="flex justify-between items-center mb-5 shrink-0">
                <h3 class="text-lg font-bold font-primary text-text-primary">Nova Categoria</h3>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form data-submit="categoria" class="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Nome da Categoria</label>
                    <input type="text" id="nova-categoria-nome" placeholder="Ex: Assinaturas..." required class="w-full p-2.5 bg-surface text-text-primary border border-border rounded-[10px] text-sm focus:outline-none focus:border-brand-medium transition-colors">
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Ícone</label>
                        <select id="nova-categoria-icone" class="w-full p-2.5 bg-surface text-text-primary border border-border rounded-[10px] text-sm focus:outline-none transition-colors">
                            <option value="fa-tag">🏷️ Genérico</option>
                            <option value="fa-cart-shopping">🛒 Compras</option>
                            <option value="fa-house">🏠 Moradia</option>
                            <option value="fa-car">🚗 Veículo</option>
                            <option value="fa-heart-pulse">❤️ Saúde</option>
                            <option value="fa-gamepad">🎮 Lazer</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Cor</label>
                        <input type="color" id="nova-categoria-cor" value="#3B82F6" class="w-full h-[42px] p-1 bg-surface border border-border rounded-[10px] cursor-pointer">
                    </div>
                </div>

                <div class="shrink-0 mt-3">
                    <button type="submit" class="w-full bg-brand-medium text-white px-5 py-2.5 rounded-[10px] font-bold text-sm hover:bg-brand-dark transition-colors shadow-soft">
                        Criar Categoria
                    </button>
                </div>
            </form>
        </div>
    </div>

    <div id="modal-transacao" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[90vh] overflow-hidden">
            
            <div class="flex justify-end items-center mb-3 shrink-0">
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary transition-colors"><i class="fa-solid fa-xmark text-lg"></i></button>
            </div>
            
            <div class="flex bg-bg p-1 rounded-[10px] mb-4 border border-border shrink-0">
                <div id="tab-despesa" data-action="setTransactionType" data-payload="despesa" class="flex-1 text-center py-1.5 bg-surface rounded-[8px] shadow-sm text-danger font-bold text-sm border border-border transition-all cursor-pointer">
                    Despesa
                </div>
                <div id="tab-receita" data-action="setTransactionType" data-payload="receita" class="flex-1 text-center py-1.5 text-text-secondary font-medium text-sm hover:text-success transition-all cursor-pointer">
                    Receita
                </div>
            </div>

            <form data-submit="transacao" class="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <input type="hidden" id="input-tipo" value="despesa">
                
                <div class="mb-3 text-center bg-bg p-3 rounded-[12px] border border-dashed border-border shrink-0">
                    <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Valor</label>
                    <div class="relative flex items-center justify-center">
                        <span class="text-xl text-text-secondary font-bold mr-1 font-mono">R$</span>
                        <input id="input-valor" type="number" step="0.01" placeholder="0.00" required class="w-3/4 bg-transparent text-4xl font-black text-text-primary text-center focus:outline-none placeholder-text-secondary/30 font-mono transition-all">
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Descrição</label>
                    <input id="input-desc" type="text" placeholder="Ex: Supermercado..." required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm focus:border-brand-medium outline-none transition-all text-text-primary">
                    <div id="smart-category-badge" class="hidden text-[10px] font-mentor bg-bg text-brand-medium border border-border px-3 py-1.5 mt-2 rounded-[8px] items-center gap-2 w-fit transition-all"></div>
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Data</label>
                        <input id="input-data-trans" type="date" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm focus:border-brand-medium outline-none transition-all text-text-primary">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Categoria</label>
                        <select id="input-categoria" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm focus:border-brand-medium outline-none transition-all text-text-primary"></select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div class="col-span-2">
                        <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Conta</label>
                        <select id="input-banco-trans" data-change="handleBancoChange" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm focus:border-brand-medium outline-none transition-all text-text-primary">
                            <option value="" disabled selected>Selecione a conta</option>
                        </select>
                    </div>
                    <div id="div-forma-pagamento" class="col-span-2">
                        <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Forma de Pagamento</label>
                        <select id="input-forma-pagamento" data-change="handleFormaPagamentoChange" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm focus:border-brand-medium outline-none transition-all text-text-primary">
                            <option value="Pix" selected>Pix</option>
                            <option value="Cartão de Débito">Cartão de Débito</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                        </select>
                    </div>
                    
                    <div id="div-selecao-cartao" class="col-span-2 hidden">
                        <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Cartão</label>
                        <select id="input-cartao-trans" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm focus:border-brand-medium outline-none transition-all text-text-primary"></select>
                    </div>

                    <div id="div-cartao-options" class="col-span-2 grid grid-cols-2 gap-3 hidden">
                        <div>
                            <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Parcelas</label>
                            <select id="input-parcelas-trans" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm focus:border-brand-medium outline-none transition-all text-text-primary">
                                <option value="1">1x</option><option value="2">2x</option><option value="12">12x</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Juros a.m. (%)</label>
                            <input id="input-juros-trans" type="number" step="0.01" value="0" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm font-mono text-text-primary">
                        </div>
                    </div>
                </div>
                
                <div>
                    <button type="button" onclick="document.getElementById('opcionais-transacao').classList.toggle('hidden')" class="text-[10px] font-bold text-brand-medium flex items-center justify-center gap-1 uppercase tracking-wider w-full py-2 bg-bg rounded-[8px] border border-border mt-1">
                        Detalhes Avançados <i class="fa-solid fa-caret-down"></i>
                    </button>
                    
                    <div id="opcionais-transacao" class="hidden mt-3 space-y-3 p-3 border border-border rounded-[10px] bg-bg">
                        <div>
                            <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Contato</label>
                            <select id="input-contato" class="w-full p-2.5 bg-surface border border-border rounded-[8px] text-sm focus:border-brand-medium outline-none transition-all text-text-primary"></select>
                        </div>

                        <div id="div-recorrente">
                            <label class="flex items-center gap-2 text-xs text-text-primary cursor-pointer p-1">
                                <input type="checkbox" id="input-recorrente" data-change="toggleRecorrente" class="w-4 h-4 text-brand-medium bg-surface border-border rounded"> Repetir mensalmente
                            </label>
                            <div id="div-meses-recorrente" class="hidden mt-2">
                                <select id="input-meses-recorrente" class="w-full p-2.5 bg-surface border border-border rounded-[8px] text-sm text-text-primary">
                                    <option value="2">2 meses</option><option value="6">6 meses</option><option value="12">12 meses</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="transacao-simulacao-resultado" class="hidden mt-3 shrink-0"></div>

                <div class="flex gap-2 pt-3 border-t border-border mt-3 shrink-0">
                    <button type="button" id="btn-simular-transacao" data-action="simularTransacaoGeral" class="hidden flex-1 py-3 bg-bg text-brand-medium rounded-[10px] font-bold text-sm hover:border-border border border-transparent transition-colors">Simular</button>
                    <button type="submit" id="btn-submit-transacao" class="w-full py-3 bg-brand-medium text-white rounded-[10px] text-sm font-bold shadow-soft hover:bg-brand-dark transition-all">Adicionar</button>
                </div>
            </form>
        </div>
    </div>
    <div id="modal-banco" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="flex justify-between items-center mb-5 shrink-0">
                <h3 class="text-lg font-bold font-primary text-text-primary">Nova Conta Bancária</h3>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form data-submit="banco" class="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Instituição</label>
                    <select id="banco-instituicao" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm outline-none text-text-primary">
                        <option value="Nubank">Nubank</option><option value="Itaú">Itaú</option><option value="Inter">Inter</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Nome da Conta</label>
                    <input id="banco-nome" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm outline-none text-text-primary">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Saldo Inicial (R$)</label>
                    <input id="banco-saldo" type="number" step="0.01" required class="w-full p-2.5 bg-surface font-mono border border-border rounded-[10px] text-sm outline-none text-text-primary">
                </div>
                <div class="shrink-0 mt-3">
                    <button type="submit" class="w-full py-2.5 bg-brand-medium hover:bg-brand-dark text-white text-sm font-bold rounded-[10px] shadow-soft transition-all">Criar Conta</button>
                </div>
            </form>
        </div>
    </div>

    <div id="modal-cartao" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="flex justify-between items-center mb-5 shrink-0">
                <h3 class="text-lg font-bold font-primary text-text-primary">Novo Cartão</h3>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form data-submit="cartao" class="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Conta Vinculada</label><select id="cartao-bancoId" data-change="handleCartaoBancoChange" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"></select></div>
                <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Modelo</label>
                    <select id="cartao-modelo" data-change="handleCartaoModelo" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary">
                        <option value="Nubank">Nubank</option><option value="Itaú">Itaú</option><option value="custom">Outro</option>
                    </select>
                </div>
                <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Nome</label><input type="text" id="cartao-nome" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"></div>
                <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Limite (R$)</label><input type="number" step="0.01" id="cartao-limite" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] font-mono text-sm text-text-primary"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Dia Fechamento</label><input type="number" min="1" max="31" id="cartao-dia-fech" required class="w-full p-2.5 bg-surface font-mono border border-border rounded-[10px] text-sm text-text-primary"></div>
                    <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Dia Vencimento</label><input type="number" min="1" max="31" id="cartao-dia-venc" required class="w-full p-2.5 bg-surface font-mono border border-border rounded-[10px] text-sm text-text-primary"></div>
                </div>
                <div class="shrink-0 mt-3">
                    <button type="submit" class="w-full py-2.5 bg-brand-medium text-white text-sm font-bold rounded-[10px] shadow-soft transition-all">Adicionar Cartão</button>
                </div>
            </form>
        </div>
    </div>

    <div id="modal-despesa-cartao" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="flex justify-between items-center mb-5 shrink-0">
                <div>
                    <h3 class="text-lg font-bold font-primary text-text-primary">Nova Compra</h3>
                    <p class="text-[10px] text-text-secondary" id="modal-card-name-display">Cartão</p>
                </div>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form data-submit="despesaCartao" class="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <input type="hidden" id="dc-cartao-id">
                <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Descrição</label><input type="text" id="dc-desc" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"></div>
                
                <div class="grid grid-cols-3 gap-2">
                    <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Valor (R$)</label><input type="number" step="0.01" id="dc-valor" required class="w-full p-2.5 bg-surface font-mono border border-border rounded-[10px] text-sm text-text-primary"></div>
                    <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Parcelas</label><select id="dc-parcelas" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"><option value="1">1x</option><option value="2">2x</option></select></div>
                    <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Juros (%)</label><input type="number" step="0.01" id="dc-juros" value="0" class="w-full p-2.5 bg-surface font-mono border border-border rounded-[10px] text-sm text-text-primary"></div>
                </div>

                <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Categoria</label><select id="dc-categoria" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"></select></div>
                <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Data</label><input type="date" id="dc-data" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"></div>
                
                <div id="dc-simulacao-resultado" class="hidden mt-3 shrink-0"></div>

                <div class="flex gap-2 pt-3 border-t border-border mt-3 shrink-0">
                    <button type="button" id="btn-simular-dc" data-action="simularDespesaCartao" class="flex-1 py-2.5 bg-bg border border-border text-text-secondary text-sm font-bold rounded-[10px]">Simular</button>
                    <button type="submit" class="flex-1 py-2.5 bg-brand-medium text-white text-sm font-bold rounded-[10px] shadow-soft">Lançar</button>
                </div>
            </form>
        </div>
    </div>

    <div id="modal-fatura-detalhes" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-md rounded-[16px] shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div id="modal-fatura-content" class="flex-1 min-h-0 overflow-y-auto rounded-[16px]"></div>
        </div>
    </div>

    <div id="modal-meta" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="flex justify-between items-center mb-5 shrink-0">
                <h3 class="text-lg font-bold font-primary text-text-primary">Nova Meta</h3>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form data-submit="meta" class="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Nome da Meta</label><input id="meta-nome" type="text" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"></div>
                <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Data Alvo</label><input id="meta-data" type="date" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Valor Alvo (R$)</label><input id="meta-alvo" type="number" step="0.01" required class="w-full p-2.5 bg-surface font-mono border border-border rounded-[10px] text-sm text-text-primary"></div>
                    <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Já Guardado</label><input id="meta-atual" type="number" step="0.01" value="0" required class="w-full p-2.5 bg-surface font-mono border border-border rounded-[10px] text-sm text-text-primary"></div>
                </div>
                <div class="shrink-0 mt-3">
                    <button type="submit" class="w-full py-2.5 bg-brand-medium text-white text-sm font-bold rounded-[10px] shadow-soft">Criar Meta</button>
                </div>
            </form>
        </div>
    </div>

    <div id="modal-depositar-meta" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-xs rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="flex justify-between items-center mb-3 shrink-0">
                <h3 class="text-lg font-bold font-primary text-text-primary">Depositar</h3>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <p class="text-xs text-text-secondary mb-4 shrink-0">Destinar para <strong id="deposito-meta-nome" class="text-investment">...</strong></p>
            <form data-submit="depositoMeta" class="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <input type="hidden" id="deposito-meta-id">
                <div>
                    <input id="deposito-meta-valor" type="number" step="0.01" required placeholder="0.00" class="w-full p-3 bg-bg border border-border rounded-[10px] text-center text-xl font-mono font-bold text-text-primary transition-all">
                </div>
                <div class="shrink-0 mt-3">
                    <button type="submit" class="w-full py-2.5 bg-brand-medium text-white text-sm font-bold rounded-[10px] shadow-soft">Confirmar</button>
                </div>
            </form>
        </div>
    </div>

    <div id="modal-orcamento" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="flex justify-between items-center mb-5 shrink-0">
                <h3 class="text-lg font-bold font-primary text-text-primary">Novo Limite</h3>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form data-submit="orcamento" class="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Categoria</label>
                    <select id="orcamento-categoria" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"></select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Limite (R$)</label>
                    <input id="orcamento-valor" type="number" step="0.01" required class="w-full p-2.5 bg-surface font-mono border border-border rounded-[10px] text-sm text-text-primary">
                </div>
                <div class="shrink-0 mt-3">
                    <button type="submit" class="w-full py-2.5 bg-brand-medium text-white text-sm font-bold rounded-[10px] shadow-soft">Definir Limite</button>
                </div>
            </form>
        </div>
    </div>

    <div id="modal-simulador" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="flex justify-between items-center mb-5 shrink-0">
                <h3 class="text-lg font-bold font-primary text-text-primary">Simulador</h3>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form data-submit="simulador" class="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <div class="col-span-2">
                    <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Cartão</label>
                    <select id="simulador-cartao-id" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"></select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Valor (R$)</label>
                        <input id="simulador-valor" type="number" step="0.01" required class="w-full p-2.5 bg-surface font-mono border border-border rounded-[10px] text-sm text-text-primary">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Data</label>
                        <input id="simulador-data" type="date" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Parcelas</label>
                        <select id="simulador-parcelas" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"><option value="1">1x</option><option value="12">12x</option></select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Juros (%)</label>
                        <input id="simulador-juros" type="number" step="0.01" value="0" class="w-full p-2.5 bg-surface font-mono border border-border rounded-[10px] text-sm text-text-primary">
                    </div>
                </div>
                <div id="simulador-resultado" class="hidden mt-3 shrink-0"></div>
                <div class="pt-3 border-t border-border mt-3 shrink-0">
                    <button type="submit" class="w-full py-2.5 bg-bg border border-border text-brand-medium text-sm font-bold rounded-[10px]">Simular Projeção</button>
                </div>
            </form>
        </div>
    </div>

    <div id="modal-revisao-ofx" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-lg rounded-[16px] shadow-2xl border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="p-5 border-b border-border flex justify-between items-center bg-surface shrink-0">
                <div>
                    <h3 class="text-lg font-bold font-primary text-text-primary">Conciliação OFX</h3>
                    <p id="ofx-header-datas" class="text-[11px] text-text-secondary mt-0.5 font-mono">Período: --/-- a --/--</p>
                </div>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <div class="p-3 bg-bg border-b border-border flex justify-between items-center shrink-0">
                <div class="flex gap-2">
                    <span class="text-[10px] font-bold px-2 py-1 bg-success/20 text-success rounded text-center"><i class="fa-solid fa-plus"></i> <span id="ofx-count-novos">0</span></span>
                    <span class="text-[10px] font-bold px-2 py-1 bg-warning/20 text-warning rounded text-center"><i class="fa-solid fa-triangle-exclamation"></i> <span id="ofx-count-duplicados">0</span></span>
                </div>
                <select id="ofx-banco-alvo-id" data-change="handleOfxBancoChange" class="bg-surface border border-border text-[10px] text-text-primary p-1.5 rounded-[6px] outline-none max-w-[150px] truncate"></select>
            </div>

            <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-bg scrollbar-hide" id="lista-revisao-ofx"></div>
            
            <div class="p-5 bg-surface border-t border-border shrink-0 flex flex-col gap-3">
                <div class="flex items-center justify-between bg-bg p-2.5 rounded-[10px] border border-border">
                    <div>
                        <span class="text-[9px] uppercase font-bold text-text-secondary block tracking-wider">Saldo Final</span>
                        <span id="ofx-saldo-final-lbl" class="text-sm font-bold font-mono text-text-primary">R$ 0,00</span>
                    </div>
                    <label class="flex items-center gap-2 cursor-pointer group bg-surface px-2 py-1.5 border border-border rounded-[6px]">
                        <input type="checkbox" id="ofx-confirmar-saldo" class="w-3.5 h-3.5 text-brand-medium bg-bg border-border rounded">
                        <span class="text-[10px] font-bold text-text-secondary">Atualizar conta</span>
                    </label>
                </div>

                <div class="flex gap-3">
                    <button data-action="closeModal" class="flex-1 py-2.5 bg-bg border border-border text-text-secondary text-sm font-bold rounded-[10px]">Cancelar</button>
                    <button id="btn-importar-ofx-aprovados" data-action="salvarOFXAprovado" class="flex-1 py-2.5 bg-brand-medium text-white text-sm font-bold rounded-[10px] shadow-soft flex justify-center items-center gap-2"><i class="fa-solid fa-check-double"></i> Importar</button>
                </div>
            </div>
        </div>
    </div>

    <div id="modal-orcamento-inteligente" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="flex justify-between items-center mb-5 shrink-0">
                <h3 class="text-lg font-bold font-primary text-text-primary flex items-center gap-2"><i class="fa-solid fa-wand-magic-sparkles text-brand-medium"></i> Inteligente</h3>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form data-submit="orcamentoInteligente" class="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Renda Mensal (R$)</label>
                    <input id="oi-renda" data-input="preview503020" type="number" step="0.01" required class="w-full p-2.5 bg-surface font-mono border border-border rounded-[10px] text-base text-text-primary">
                </div>

                <div class="bg-bg border border-border rounded-[10px] p-3 space-y-2">
                    <div>
                        <div class="flex justify-between text-xs mb-0.5"><span class="font-bold text-text-primary">50% Necessidades</span><span id="oi-prev-50" class="font-mono font-bold text-text-primary">R$ 0,00</span></div>
                    </div>
                    <div class="h-px w-full bg-border"></div>
                    <div>
                        <div class="flex justify-between text-xs mb-0.5"><span class="font-bold text-text-primary">30% Desejos</span><span id="oi-prev-30" class="font-mono font-bold text-text-primary">R$ 0,00</span></div>
                    </div>
                    <div class="h-px w-full bg-border"></div>
                    <div>
                        <div class="flex justify-between text-xs mb-0.5"><span class="font-bold text-text-primary">20% Futuro</span><span id="oi-prev-20" class="font-mono font-bold text-investment">R$ 0,00</span></div>
                    </div>
                </div>

                <div class="shrink-0 mt-3">
                    <button type="submit" class="w-full py-2.5 bg-brand-deep text-white text-sm font-bold rounded-[10px] shadow-soft">Aplicar Regra 50/30/20</button>
                </div>
            </form>
        </div>
    </div>
    
    <div id="modal-fechamento-mes" onclick="if(event.target === this) App.closeModal();" class="fixed inset-0 bg-brand-deep/80 hidden items-center justify-center backdrop-blur-md p-4 sm:p-6" style="z-index: 1000;">
        <div class="bg-surface w-full max-w-md rounded-[20px] shadow-2xl border border-border flex flex-col h-auto max-h-[85vh] overflow-hidden relative">
            
            <div class="h-1.5 w-full bg-border absolute top-0 left-0">
                <div id="fechamento-progress" class="h-full bg-brand-medium transition-all duration-500" style="width: 33%"></div>
            </div>
            
            <div class="flex justify-between items-center p-5 pb-1 shrink-0 mt-1">
                <div>
                    <h3 class="text-lg font-black font-primary text-text-primary tracking-tight">Fechamento Mensal</h3>
                </div>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary bg-bg border border-border w-7 h-7 rounded-[6px] flex items-center justify-center transition-colors"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <div id="fechamento-content" class="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
                </div>
            
            <div class="p-5 bg-bg border-t border-border shrink-0 flex gap-2">
                <button id="btn-fechamento-prev" class="px-4 py-2.5 bg-surface border border-border text-text-primary text-sm font-bold rounded-[10px] hidden">Voltar</button>
                <button id="btn-fechamento-next" class="flex-1 py-2.5 bg-brand-medium text-white text-sm font-bold rounded-[10px] shadow-soft hover:bg-brand-dark transition-all flex items-center justify-center gap-2">Continuar <i class="fa-solid fa-arrow-right"></i></button>
            </div>
        </div>
    </div>
    `
};