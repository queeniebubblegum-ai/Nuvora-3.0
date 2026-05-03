import { db, Database } from './db.js';
import { Utils } from './utils.js';
import { App } from './app.js';

export const NotifUI = {
    togglePanel: () => {
        const drawer = document.getElementById('notif-drawer');
        const overlay = document.getElementById('notif-overlay');
        const appState = App.viewState;

        if (appState.isNotifOpen) {
            drawer.classList.add('translate-x-full');
            overlay.classList.add('hidden');
            appState.isNotifOpen = false;
        } else {
            drawer.classList.remove('translate-x-full');
            overlay.classList.remove('hidden');
            appState.isNotifOpen = true;
            NotifUI.switchTab(appState.notifTab || 'alertas');
        }
    },

    switchTab: (tab) => {
        App.viewState.notifTab = tab;
        const tabAlertas = document.getElementById('tab-notif-alertas');
        const tabConfig = document.getElementById('tab-notif-config');
        
        if (tab === 'alertas') {
            tabAlertas.classList.replace('border-transparent', 'border-text-primary');
            tabAlertas.classList.replace('text-text-secondary', 'text-text-primary');
            tabConfig.classList.replace('border-text-primary', 'border-transparent');
            tabConfig.classList.replace('text-text-primary', 'text-text-secondary');
            NotifUI.renderList();
        } else {
            tabConfig.classList.replace('border-transparent', 'border-text-primary');
            tabConfig.classList.replace('text-text-secondary', 'text-text-primary');
            tabAlertas.classList.replace('border-text-primary', 'border-transparent');
            tabAlertas.classList.replace('text-text-primary', 'text-text-secondary');
            NotifUI.renderConfig();
        }
    },

    updateBadge: () => {
        const unreadCount = db.notificacoes.filter(n => !n.lida).length;
        const badgeTitle = document.getElementById('notif-count-title');
        const badgeMobile = document.getElementById('notif-badge-mobile');

        if (unreadCount > 0) {
            if(badgeTitle) { badgeTitle.innerText = unreadCount; badgeTitle.classList.remove('hidden'); }
            if(badgeMobile) { badgeMobile.innerText = unreadCount; badgeMobile.classList.remove('hidden'); }
        } else {
            if(badgeTitle) badgeTitle.classList.add('hidden');
            if(badgeMobile) badgeMobile.classList.add('hidden');
        }
    },

    renderList: () => {
        const container = document.getElementById('notif-content');
        if (!container) return;

        if (db.notificacoes.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center text-text-secondary flex flex-col items-center justify-center h-full">
                    <i class="fa-regular fa-bell-slash text-4xl mb-4 opacity-30"></i>
                    <p class="text-sm">Nenhum alerta financeiro no momento.</p>
                </div>
            `;
            return;
        }

        let html = `<div class="p-4 flex justify-end bg-surface sticky top-0 z-10 border-b border-border"><button onclick="Notifications.markAllRead()" class="text-xs font-bold text-brand-medium hover:text-brand-dark transition-colors">Marcar todas como lidas</button></div>`;
        
        html += `<div class="divide-y divide-border">`;
        db.notificacoes.forEach(n => {
            const dateObj = new Date(n.data);
            const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString('pt-BR');
            const bgClass = n.lida ? 'bg-surface opacity-70' : 'bg-bg/50';

            html += `
                <div class="p-4 hover:bg-bg transition-colors flex gap-4 ${bgClass} relative group">
                    ${!n.lida ? '<div class="absolute left-0 top-0 bottom-0 w-1 bg-brand-medium"></div>' : ''}
                    <div class="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center shadow-sm shrink-0 ${n.cor}">
                        <i class="fa-solid ${n.icone}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start mb-1">
                            <h4 class="text-sm font-bold text-text-primary font-primary truncate pr-2">${Utils.escapeHTML(n.titulo)}</h4>
                            <span class="text-[10px] text-text-secondary whitespace-nowrap">${dateStr} ${timeStr}</span>
                        </div>
                        <p class="text-xs text-text-secondary leading-relaxed">${Utils.escapeHTML(n.mensagem)}</p>
                        <div class="flex gap-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            ${!n.lida ? `<button onclick="Notifications.markRead('${n.id}')" class="text-[10px] font-bold text-brand-medium hover:text-brand-dark transition-colors"><i class="fa-solid fa-check"></i> Marcar como lida</button>` : ''}
                            <button onclick="Notifications.delete('${n.id}')" class="text-[10px] font-bold text-danger hover:text-red-700 transition-colors"><i class="fa-solid fa-trash-can"></i> Apagar</button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;

        container.innerHTML = html;
    },

    renderConfig: () => {
        const container = document.getElementById('notif-content');
        if (!container) return;

        const cfg = db.configNotificacoes;

        container.innerHTML = `
            <div class="p-6 space-y-6">
                <h4 class="text-sm font-bold text-text-primary mb-4 font-primary border-b border-border pb-2">Regras de Alerta Automático</h4>
                
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-bold text-text-primary">Contas a Pagar</p>
                            <p class="text-[10px] text-text-secondary">Avisar sobre vencimentos iminentes.</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="cfg-contas-ativo" data-config="contasAtivo" class="sr-only peer toggle-checkbox" ${cfg.contasAtivo ? 'checked' : ''}>
                            <div class="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all toggle-label"></div>
                        </label>
                    </div>
                    ${cfg.contasAtivo ? `
                    <div class="pl-4 border-l-2 border-border animate-fadeIn">
                        <label class="block text-[11px] font-bold text-text-secondary mb-1">Avisar com quantos dias de antecedência?</label>
                        <select id="cfg-contas-dias" data-config="contasDias" class="bg-surface border border-border text-sm rounded-[8px] px-3 py-2 outline-none focus:border-brand-medium text-text-primary">
                            <option value="1" ${cfg.contasDias === 1 ? 'selected' : ''}>1 dia</option>
                            <option value="3" ${cfg.contasDias === 3 ? 'selected' : ''}>3 dias</option>
                            <option value="5" ${cfg.contasDias === 5 ? 'selected' : ''}>5 dias</option>
                            <option value="7" ${cfg.contasDias === 7 ? 'selected' : ''}>7 dias</option>
                        </select>
                    </div>` : ''}
                </div>

                <div class="h-px bg-border my-4"></div>

                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-bold text-text-primary">Orçamentos Estourados</p>
                            <p class="text-[10px] text-text-secondary">Avisar quando os gastos se aproximarem do limite mensal.</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="cfg-orc-ativo" data-config="orcamentoAtivo" class="sr-only peer toggle-checkbox" ${cfg.orcamentoAtivo ? 'checked' : ''}>
                            <div class="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all toggle-label"></div>
                        </label>
                    </div>
                    ${cfg.orcamentoAtivo ? `
                    <div class="pl-4 border-l-2 border-border animate-fadeIn">
                        <label class="block text-[11px] font-bold text-text-secondary mb-1">Avisar ao atingir qual porcentagem?</label>
                        <select id="cfg-orc-pct" data-config="orcamentoPct" class="bg-surface border border-border text-sm rounded-[8px] px-3 py-2 outline-none focus:border-brand-medium text-text-primary">
                            <option value="50" ${cfg.orcamentoPct === 50 ? 'selected' : ''}>50% do limite</option>
                            <option value="70" ${cfg.orcamentoPct === 70 ? 'selected' : ''}>70% do limite</option>
                            <option value="80" ${cfg.orcamentoPct === 80 ? 'selected' : ''}>80% do limite</option>
                            <option value="90" ${cfg.orcamentoPct === 90 ? 'selected' : ''}>90% do limite</option>
                        </select>
                    </div>` : ''}
                </div>

                <div class="h-px bg-border my-4"></div>

                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-bold text-text-primary">Metas e Reservas</p>
                        <p class="text-[10px] text-text-secondary">Avisar quando prazos estiverem chegando ao fim.</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="cfg-metas-ativo" data-config="metasAtivo" class="sr-only peer toggle-checkbox" ${cfg.metasAtivo ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all toggle-label"></div>
                    </label>
                </div>
            </div>
        `;

        NotifUI.bindConfigEvents();
    },

    bindConfigEvents: () => {
        const container = document.getElementById('notif-content');
        if(!container) return;

        const inputs = container.querySelectorAll('input[data-config], select[data-config]');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const key = e.target.getAttribute('data-config');
                const value = e.target.type === 'checkbox' ? e.target.checked : parseInt(e.target.value);
                
                Database.updateConfig(key, value);
                Utils.showToast('Configuração de alerta atualizada.', 'success');
                NotifUI.renderConfig(); 
            });
        });
    }
};