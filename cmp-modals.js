export const Modals = {
    getHTML: () => `
    <div id="modal-chat-anora" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="p-4 border-b border-border flex justify-between items-center bg-brand-deep rounded-t-[16px] text-white shrink-0">
                <div class="flex items-center gap-3">
                    <img src="assets/anora.svg" class="w-10 h-10 rounded-full border-2 border-white/20 object-cover">
                    <div>
                        <h3 class="font-bold font-primary leading-tight">Anora</h3>
                        <p class="text-[10px] text-brand-soft flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-success inline-block"></span> Online</p>
                    </div>
                </div>
                <button data-action="closeModal" class="text-white/60 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <div class="flex-1 min-h-0 overflow-y-auto p-5 bg-bg space-y-4" id="chat-anora-messages">
                <div class="flex gap-3 max-w-[85%]">
                    <img src="assets/anora.svg" class="w-8 h-8 rounded-full shadow-sm shrink-0 object-cover border border-white/10">
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

    <div id="modal-historico-anora" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
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

    <div id="modal-agenda-dia" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] shadow-medium border border-border flex flex-col max-h-[75vh] overflow-hidden">
            <div class="p-5 border-b border-border flex justify-between items-center"><div><h3 class="text-lg font-bold text-text-primary">Agenda do dia</h3><p id="agenda-dia-data" class="text-xs text-text-secondary"></p></div><button data-action="closeModal" class="text-text-secondary"><i class="fa-solid fa-xmark"></i></button></div>
            <div id="agenda-dia-lista" class="p-5 overflow-y-auto space-y-2"></div>
            <div class="p-4 border-t border-border"><button id="agenda-dia-adicionar" data-action="addAgendaOnDate" class="w-full py-2.5 rounded-lg bg-brand-medium text-white text-sm font-bold"><i class="fa-solid fa-plus mr-2"></i>Adicionar previsão neste dia</button></div>
        </div>
    </div>

    <div id="modal-agendamento" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="flex justify-between items-center mb-5 shrink-0">
                <h3 id="agendamento-titulo" class="text-lg font-bold font-primary text-text-primary">Nova previsão</h3>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form data-submit="agendamento" class="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <input type="hidden" id="agendamento-edit-id" value="">
                <input type="hidden" id="agendamento-edit-col" value="agendamentos">
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
                    <button id="agendamento-submit" type="submit" class="w-full py-3 bg-brand-medium text-white font-bold rounded-[10px] shadow-soft hover:bg-brand-dark transition-all hover:-translate-y-0.5">Adicionar na Agenda</button>
                </div>
            </form>
        </div>
    </div>

    <div id="modal-editar-transacao" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 1002;">
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

    <div id="modal-contato" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
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

    <div id="modal-categoria" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="flex justify-between items-center mb-5 shrink-0">
                <h3 class="text-lg font-bold font-primary text-text-primary">Nova Categoria</h3>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form data-submit="categoria" class="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Grupo principal</label>
                    <select id="nova-categoria-grupo" data-change="filterSubgroups" required class="w-full p-2.5 bg-surface text-text-primary border border-border rounded-[10px] text-sm focus:outline-none focus:border-brand-medium transition-colors"><option value="" disabled selected>Selecione um grupo</option><option value="Alimentação" data-type="despesa">Alimentação</option><option value="Compras" data-type="despesa">Compras</option><option value="Transporte" data-type="despesa">Transporte</option><option value="Moradia" data-type="despesa">Moradia</option><option value="Lazer e entretenimento" data-type="despesa">Lazer e entretenimento</option><option value="Saúde e bem-estar" data-type="despesa">Saúde e bem-estar</option><option value="Educação" data-type="despesa">Educação</option><option value="Serviços digitais" data-type="despesa">Serviços digitais</option><option value="Finanças" data-type="despesa">Finanças</option><option value="Seguros" data-type="despesa">Seguros</option><option value="Outros" data-type="despesa">Outros</option><option value="Renda" data-type="despesa">Renda</option></select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Subgrupo</label>
                    <select id="nova-categoria-nome" required class="w-full p-2.5 bg-surface text-text-primary border border-border rounded-[10px] text-sm focus:outline-none focus:border-brand-medium transition-colors"><option value="" disabled selected>Selecione um subgrupo</option><option value="Alimentação" data-type="despesa" data-group="Alimentação">Alimentação</option><option value="Supermercado" data-type="despesa" data-group="Alimentação">Supermercado</option><option value="Alimentos e bebidas" data-type="despesa" data-group="Alimentação">Alimentos e bebidas</option><option value="Restaurantes, bares e lanchonetes" data-type="despesa" data-group="Alimentação">Restaurantes, bares e lanchonetes</option><option value="Delivery de alimentos" data-type="despesa" data-group="Alimentação">Delivery de alimentos</option><option value="Compras" data-type="despesa" data-group="Compras">Compras</option><option value="Compras online" data-type="despesa" data-group="Compras">Compras online</option><option value="Eletrônicos" data-type="despesa" data-group="Compras">Eletrônicos</option><option value="Pet Shops e veterinários" data-type="despesa" data-group="Compras">Pet Shops e veterinários</option><option value="Vestuário" data-type="despesa" data-group="Compras">Vestuário</option><option value="Roupas" data-type="despesa" data-group="Compras">Roupas</option><option value="Artigos infantis" data-type="despesa" data-group="Compras">Artigos infantis</option><option value="Livraria" data-type="despesa" data-group="Compras">Livraria</option><option value="Artigos esportivos" data-type="despesa" data-group="Compras">Artigos esportivos</option><option value="Papelaria" data-type="despesa" data-group="Compras">Papelaria</option><option value="Presentes" data-type="despesa" data-group="Compras">Presentes</option><option value="Transporte" data-type="despesa" data-group="Transporte">Transporte</option><option value="Táxi e transporte privado urbano" data-type="despesa" data-group="Transporte">Táxi e transporte privado urbano</option><option value="Transporte público" data-type="despesa" data-group="Transporte">Transporte público</option><option value="Aluguel de veículos" data-type="despesa" data-group="Transporte">Aluguel de veículos</option><option value="Aluguel de bicicletas" data-type="despesa" data-group="Transporte">Aluguel de bicicletas</option><option value="Serviços automotivos" data-type="despesa" data-group="Transporte">Serviços automotivos</option><option value="Postos de gasolina" data-type="despesa" data-group="Transporte">Postos de gasolina</option><option value="Estacionamentos" data-type="despesa" data-group="Transporte">Estacionamentos</option><option value="Pedágios e pagamentos no veículo" data-type="despesa" data-group="Transporte">Pedágios e pagamentos no veículo</option><option value="Taxas e impostos sobre veículos" data-type="despesa" data-group="Transporte">Taxas e impostos sobre veículos</option><option value="Manutenção de veículos" data-type="despesa" data-group="Transporte">Manutenção de veículos</option><option value="Multas de trânsito" data-type="despesa" data-group="Transporte">Multas de trânsito</option><option value="Moradia" data-type="despesa" data-group="Moradia">Moradia</option><option value="Aluguel" data-type="despesa" data-group="Moradia">Aluguel</option><option value="Serviços de utilidade pública" data-type="despesa" data-group="Moradia">Serviços de utilidade pública</option><option value="Água" data-type="despesa" data-group="Moradia">Água</option><option value="Eletricidade" data-type="despesa" data-group="Moradia">Eletricidade</option><option value="Gás" data-type="despesa" data-group="Moradia">Gás</option><option value="Utensílios para casa" data-type="despesa" data-group="Moradia">Utensílios para casa</option><option value="Impostos sobre moradia" data-type="despesa" data-group="Moradia">Impostos sobre moradia</option><option value="Telecomunicação" data-type="despesa" data-group="Moradia">Telecomunicação</option><option value="Comunicação" data-type="despesa" data-group="Moradia">Comunicação</option><option value="Internet" data-type="despesa" data-group="Moradia">Internet</option><option value="Celular" data-type="despesa" data-group="Moradia">Celular</option><option value="TV" data-type="despesa" data-group="Moradia">TV</option><option value="Lazer" data-type="despesa" data-group="Lazer e entretenimento">Lazer</option><option value="Viagens" data-type="despesa" data-group="Lazer e entretenimento">Viagens</option><option value="Aeroportos e cias. aéreas" data-type="despesa" data-group="Lazer e entretenimento">Aeroportos e cias. aéreas</option><option value="Hospedagem" data-type="despesa" data-group="Lazer e entretenimento">Hospedagem</option><option value="Programas de milhagem" data-type="despesa" data-group="Lazer e entretenimento">Programas de milhagem</option><option value="Passagem de ônibus" data-type="despesa" data-group="Lazer e entretenimento">Passagem de ônibus</option><option value="Bilhetes" data-type="despesa" data-group="Lazer e entretenimento">Bilhetes</option><option value="Estádios e arenas" data-type="despesa" data-group="Lazer e entretenimento">Estádios e arenas</option><option value="Museus e pontos turísticos" data-type="despesa" data-group="Lazer e entretenimento">Museus e pontos turísticos</option><option value="Cinema, Teatro e Concertos" data-type="despesa" data-group="Lazer e entretenimento">Cinema, Teatro e Concertos</option><option value="Saúde" data-type="despesa" data-group="Saúde e bem-estar">Saúde</option><option value="Saúde e bem-estar" data-type="despesa" data-group="Saúde e bem-estar">Saúde e bem-estar</option><option value="Bem-estar" data-type="despesa" data-group="Saúde e bem-estar">Bem-estar</option><option value="Cuidados pessoais" data-type="despesa" data-group="Saúde e bem-estar">Cuidados pessoais</option><option value="Academia e centros de lazer" data-type="despesa" data-group="Saúde e bem-estar">Academia e centros de lazer</option><option value="Prática de esportes" data-type="despesa" data-group="Saúde e bem-estar">Prática de esportes</option><option value="Dentista" data-type="despesa" data-group="Saúde e bem-estar">Dentista</option><option value="Ótica" data-type="despesa" data-group="Saúde e bem-estar">Ótica</option><option value="Hospitais, clínicas e laboratórios" data-type="despesa" data-group="Saúde e bem-estar">Hospitais, clínicas e laboratórios</option><option value="Farmácia" data-type="despesa" data-group="Saúde e bem-estar">Farmácia</option><option value="Educação" data-type="despesa" data-group="Educação">Educação</option><option value="Cursos online" data-type="despesa" data-group="Educação">Cursos online</option><option value="Universidade" data-type="despesa" data-group="Educação">Universidade</option><option value="Escola" data-type="despesa" data-group="Educação">Escola</option><option value="Creche" data-type="despesa" data-group="Educação">Creche</option><option value="Serviços digitais" data-type="despesa" data-group="Serviços digitais">Serviços digitais</option><option value="Assinaturas" data-type="despesa" data-group="Serviços digitais">Assinaturas</option><option value="Streaming de música" data-type="despesa" data-group="Serviços digitais">Streaming de música</option><option value="Jogos e videogames" data-type="despesa" data-group="Serviços digitais">Jogos e videogames</option><option value="Streaming de vídeo" data-type="despesa" data-group="Serviços digitais">Streaming de vídeo</option><option value="Investimentos" data-type="despesa" data-group="Finanças">Investimentos</option><option value="Fundos multimercado" data-type="despesa" data-group="Finanças">Fundos multimercado</option><option value="Pagamento de cartão de crédito" data-type="despesa" data-group="Finanças">Pagamento de cartão de crédito</option><option value="Empréstimos e financiamento" data-type="despesa" data-group="Finanças">Empréstimos e financiamento</option><option value="Atraso no pagamento e custos de cheque especial" data-type="despesa" data-group="Finanças">Atraso no pagamento e custos de cheque especial</option><option value="Juros cobrados" data-type="despesa" data-group="Finanças">Juros cobrados</option><option value="Financiamento de veículos" data-type="despesa" data-group="Finanças">Financiamento de veículos</option><option value="Empréstimos" data-type="despesa" data-group="Finanças">Empréstimos</option><option value="Transferência entre contas" data-type="despesa" data-group="Finanças">Transferência entre contas</option><option value="Reserva/investimento" data-type="despesa" data-group="Finanças">Reserva/investimento</option><option value="Pagamento de cartão" data-type="despesa" data-group="Finanças">Pagamento de cartão</option><option value="Ajuste" data-type="despesa" data-group="Finanças">Ajuste</option><option value="Transferência mesma titularidade" data-type="despesa" data-group="Finanças">Transferência mesma titularidade</option><option value="Transferências" data-type="despesa" data-group="Finanças">Transferências</option><option value="Transferência - Boleto bancário" data-type="despesa" data-group="Finanças">Transferência - Boleto bancário</option><option value="Transferência - Dinheiro" data-type="despesa" data-group="Finanças">Transferência - Dinheiro</option><option value="Transferência - Câmbio" data-type="despesa" data-group="Finanças">Transferência - Câmbio</option><option value="Transferência - Mesma instituição" data-type="despesa" data-group="Finanças">Transferência - Mesma instituição</option><option value="Seguros" data-type="despesa" data-group="Seguros">Seguros</option><option value="Impostos e taxas" data-type="despesa" data-group="Outros">Impostos e taxas</option><option value="Dívidas e juros" data-type="despesa" data-group="Outros">Dívidas e juros</option><option value="Despesas gerais" data-type="despesa" data-group="Outros">Despesas gerais</option><option value="A classificar" data-type="despesa" data-group="Outros">A classificar</option><option value="Estorno" data-type="despesa" data-group="Outros">Estorno</option><option value="Renda" data-type="despesa" data-group="Renda">Renda</option><option value="Salário" data-type="despesa" data-group="Renda">Salário</option><option value="Freelance" data-type="despesa" data-group="Renda">Freelance</option><option value="Rendimentos" data-type="despesa" data-group="Renda">Rendimentos</option><option value="Reembolsos" data-type="despesa" data-group="Renda">Reembolsos</option><option value="Vendas" data-type="despesa" data-group="Renda">Vendas</option><option value="Outras receitas" data-type="despesa" data-group="Renda">Outras receitas</option><option value="Renda não-recorrente" data-type="despesa" data-group="Renda">Renda não-recorrente</option><option value="Juros de rendimentos de dividendos" data-type="despesa" data-group="Renda">Juros de rendimentos de dividendos</option><option value="Cashback" data-type="despesa" data-group="Renda">Cashback</option></select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-wider">Tipo</label>
                    <select id="nova-categoria-tipo" data-change="filterCategoryGroups" class="w-full p-2.5 bg-surface text-text-primary border border-border rounded-[10px] text-sm focus:outline-none transition-colors"><option value="despesa">Despesa</option><option value="receita">Receita</option><option value="movimentação">Movimentação</option></select>
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

    <div id="modal-transferencia" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 1001;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border">
            <div class="flex justify-between items-center mb-5"><div><h3 class="font-bold text-text-primary">Transferir entre contas</h3><p class="text-xs text-text-secondary mt-1">Não será contabilizada como receita ou despesa.</p></div><button data-action="closeModal" class="text-text-secondary"><i class="fa-solid fa-xmark"></i></button></div>
            <form data-submit="transferencia" class="space-y-3">
                <div><label class="block text-[10px] font-bold text-text-secondary uppercase mb-1">Conta de origem</label><select id="transfer-origem" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm"></select></div>
                <div><label class="block text-[10px] font-bold text-text-secondary uppercase mb-1">Conta de destino</label><select id="transfer-destino" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm"></select></div>
                <div class="grid grid-cols-2 gap-3"><div><label class="block text-[10px] font-bold text-text-secondary uppercase mb-1">Valor</label><input id="transfer-valor" type="number" min="0.01" step="0.01" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm"></div><div><label class="block text-[10px] font-bold text-text-secondary uppercase mb-1">Data</label><input id="transfer-data" type="date" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm"></div></div>
                <div><label class="block text-[10px] font-bold text-text-secondary uppercase mb-1">Descrição (opcional)</label><input id="transfer-desc" type="text" placeholder="Ex.: Reserva mensal" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm"></div>
                <button type="submit" class="w-full py-3 bg-brand-medium text-white rounded-[10px] text-sm font-bold">Registrar transferência</button>
            </form>
        </div>
    </div>

    <div id="modal-transacao" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-sm rounded-[16px] p-5 shadow-medium border border-border flex flex-col max-h-[90vh] overflow-hidden">
            
            <div class="flex justify-between items-center mb-3 shrink-0">
                <button type="button" data-action="closeModal" class="text-text-secondary hover:text-text-primary transition-colors"><i class="fa-solid fa-xmark text-lg"></i></button>
            </div>
            
            <div class="flex bg-bg p-1 rounded-[10px] mb-4 border border-border shrink-0">
                <div id="tab-despesa" data-action="setTransactionType" data-payload="despesa" class="flex-1 text-center py-1.5 bg-surface rounded-[8px] shadow-sm text-danger font-bold text-sm border border-border transition-all cursor-pointer">
                    Despesa
                </div>
                <div id="tab-receita" data-action="setTransactionType" data-payload="receita" class="flex-1 text-center py-1.5 text-text-secondary font-medium text-sm hover:text-success transition-all cursor-pointer">
                    Receita
                </div>
                <button type="button" id="tab-transferencia" data-action="setTransactionType" data-payload="transferencia" onclick="App.setTransactionType('transferencia');" class="flex-1 text-center py-1.5 text-text-secondary font-medium text-sm hover:text-brand-medium transition-all cursor-pointer">
                    Transferência
                </button>
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
                        <div class="flex items-center justify-between mb-1"><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider">Categoria</label><button type="button" onclick="App.openModal('modal-categoria'); event.stopPropagation()" title="Nova categoria" class="w-5 h-5 rounded-full bg-brand-medium/10 text-brand-medium text-[10px] font-bold">+</button></div>
                        <select id="input-categoria-grupo" data-change="filterTransactionSubgroups" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm mb-2 focus:border-brand-medium outline-none transition-all text-text-primary"><option value="">Grupo principal</option></select>
                        <select id="input-categoria-subgrupo" data-change="selectTransactionSubgroup" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm focus:border-brand-medium outline-none transition-all text-text-primary"><option value="">Subgrupo (opcional)</option></select>
                        <select id="input-categoria" aria-hidden="true" tabindex="-1" class="hidden"></select>
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
                            <div class="flex items-center justify-between mb-1"><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider">Contato</label><button type="button" onclick="App.openModal('modal-contato'); event.stopPropagation()" title="Novo contato" class="w-5 h-5 rounded-full bg-brand-medium/10 text-brand-medium text-[10px] font-bold">+</button></div>
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
            <div id="inline-transferencia" class="hidden flex-1 min-h-0 overflow-y-auto pr-1 pb-1 scrollbar-hide">
                <form data-submit="transferencia" class="space-y-3">
                    <div><label class="block text-[10px] font-bold text-text-secondary uppercase mb-1">Conta de origem</label><select id="inline-transfer-origem" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm"></select></div>
                    <div><label class="block text-[10px] font-bold text-text-secondary uppercase mb-1">Conta de destino</label><select id="inline-transfer-destino" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm"></select></div>
                    <div class="grid grid-cols-2 gap-3"><div><label class="block text-[10px] font-bold text-text-secondary uppercase mb-1">Valor</label><input id="inline-transfer-valor" type="number" min="0.01" step="0.01" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm"></div><div><label class="block text-[10px] font-bold text-text-secondary uppercase mb-1">Data</label><input id="inline-transfer-data" type="date" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm"></div></div>
                    <div><label class="block text-[10px] font-bold text-text-secondary uppercase mb-1">Descrição (opcional)</label><input id="inline-transfer-desc" type="text" placeholder="Ex.: Reserva mensal" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm"></div>
                    <button type="submit" class="w-full py-3 bg-brand-medium text-white rounded-[10px] text-sm font-bold">Registrar transferência</button>
                </form>
            </div>
        </div>
    </div>
    <div id="modal-banco" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
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

    <div id="modal-cartao" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
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

    <div id="modal-despesa-cartao" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
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
                    <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Parcelas</label><select id="dc-parcelas" data-change="handleCardInstallments" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"><option value="1">1x</option><option value="2">2x</option><option value="3">3x</option><option value="6">6x</option><option value="12">12x</option><option value="18">18x</option><option value="24">24x</option><option value="36">36x</option><option value="custom">Outro</option></select><input id="dc-parcelas-custom" type="number" min="1" max="120" step="1" placeholder="Nº" class="hidden w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary" aria-label="Número personalizado de parcelas"></div>
                    <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Juros (%)</label><input type="number" step="0.01" id="dc-juros" value="0" class="w-full p-2.5 bg-surface font-mono border border-border rounded-[10px] text-sm text-text-primary"></div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Grupo</label><select id="dc-categoria-grupo" data-change="handleCardCategoryGroup" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"><option value="">Grupo principal</option></select></div>
                    <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Subgrupo</label><select id="dc-categoria-subgrupo" data-change="handleCardCategorySubgroup" class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"><option value="">Subgrupo (opcional)</option></select></div>
                </div>
                <select id="dc-categoria" class="hidden" aria-hidden="true" tabindex="-1"></select>
                <div><label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Data</label><input type="date" id="dc-data" required class="w-full p-2.5 bg-surface border border-border rounded-[10px] text-sm text-text-primary"></div>
                
                <div id="dc-simulacao-resultado" class="hidden mt-3 shrink-0"></div>

                <div class="flex gap-2 pt-3 border-t border-border mt-3 shrink-0">
                    <button type="button" id="btn-simular-dc" data-action="simularDespesaCartao" class="flex-1 py-2.5 bg-bg border border-border text-text-secondary text-sm font-bold rounded-[10px]">Simular</button>
                    <button type="submit" class="flex-1 py-2.5 bg-brand-medium text-white text-sm font-bold rounded-[10px] shadow-soft">Lançar</button>
                </div>
            </form>
        </div>
    </div>

    <div id="modal-fatura-detalhes" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 1001;">
        <div class="bg-surface w-full max-w-md rounded-[16px] shadow-medium border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div id="modal-fatura-content" class="flex-1 min-h-0 overflow-y-auto rounded-[16px]"></div>
        </div>
    </div>

    <div id="modal-meta" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
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

    <div id="modal-depositar-meta" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
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

    <div id="modal-orcamento" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
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

    <div id="modal-simulador" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
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

    <div id="modal-revisao-ofx" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
        <div class="bg-surface w-full max-w-lg rounded-[16px] shadow-2xl border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div class="p-5 border-b border-border flex justify-between items-center bg-surface shrink-0">
                <div>
                    <h3 id="ofx-modal-title" class="text-lg font-bold font-primary text-text-primary">Conciliação OFX</h3>
                    <p id="ofx-header-datas" class="text-[11px] text-text-secondary mt-0.5 font-mono">Período: --/-- a --/--</p>
                </div>
                <button data-action="closeModal" class="text-text-secondary hover:text-text-primary"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <div class="p-3 bg-bg border-b border-border flex justify-between items-center shrink-0">
                <div class="flex gap-2">
                    <span class="text-[10px] font-bold px-2 py-1 bg-success/20 text-success rounded text-center"><i class="fa-solid fa-plus"></i> <span id="ofx-count-novos">0</span></span>
                    <span class="text-[10px] font-bold px-2 py-1 bg-warning/20 text-warning rounded text-center"><i class="fa-solid fa-triangle-exclamation"></i> <span id="ofx-count-duplicados">0</span></span>
                    <span class="text-[10px] font-bold px-2 py-1 bg-blue-500/20 text-blue-500 rounded text-center"><i class="fa-solid fa-clock-rotate-left"></i> <span id="ofx-count-retroativos">0</span></span>
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

    <div id="modal-orcamento-inteligente" class="fixed inset-0 bg-brand-deep/60 hidden items-center justify-center backdrop-blur-sm p-4 sm:p-6" style="z-index: 999;">
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
    
    <div id="modal-fechamento-mes" class="fixed inset-0 bg-brand-deep/80 hidden items-center justify-center backdrop-blur-md p-4 sm:p-6" style="z-index: 1000;">
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