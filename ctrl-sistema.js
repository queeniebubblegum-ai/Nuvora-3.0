import { db, Database } from './db.js';
import { Utils } from './utils.js';
import { App } from './app.js';
import { AnoraNLP } from './anora-nlp.js';

export const SistemaController = {
    submitUsuario: (e) => {
        e.preventDefault();
        const nome = document.getElementById('input-usuario-nome').value;
        const subtitulo = document.getElementById('input-usuario-subtitulo').value;
        
        // UX ENG: Captura a escolha do estilo de mentoria para moldar a IA
        const mentorStyleEl = document.getElementById('input-usuario-mentor-style');
        const mentorStyle = mentorStyleEl ? mentorStyleEl.value : 'equilibrado';
        
        Database.updateUser({ nome, subtitulo, mentorStyle });
        
        Utils.showToast('Perfil atualizado com sucesso!', 'success');
    },

    processarFotoPerfil: (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) { 
            Utils.showToast('A imagem deve ter no máximo 2MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64String = event.target.result;
            Database.updateUser({ fotoUrl: base64String });
            Utils.showToast('Foto de perfil atualizada!', 'success');
            
            App.scheduleRender();
        };
        reader.readAsDataURL(file);
    },

    submitChatAnora: (e) => {
        e.preventDefault();
        const inputEl = document.getElementById('chat-anora-input');
        const msg = inputEl.value.trim();
        if(!msg) return;

        const container = document.getElementById('chat-anora-messages');
        
        container.innerHTML += `
        <div class="flex gap-3 max-w-[85%] ml-auto justify-end">
            <div class="bg-brand-medium text-white p-3.5 rounded-[16px] rounded-tr-none shadow-sm text-sm leading-relaxed">
                ${Utils.escapeHTML(msg)}
            </div>
            <img src="${db.usuario?.fotoUrl || 'assets/perfil.svg'}" class="w-8 h-8 rounded-full shadow-sm shrink-0 object-cover">
        </div>`;
        
        inputEl.value = '';
        container.scrollTop = container.scrollHeight;

        const idTyping = 'typing-' + Date.now();
        container.innerHTML += `
        <div id="${idTyping}" class="flex gap-3 max-w-[85%] mt-4">
            <img src="assets/anora.svg" class="w-8 h-8 rounded-full shadow-sm shrink-0 object-cover border border-white/10">
            <div class="bg-surface border border-border p-3.5 rounded-[16px] rounded-tl-none shadow-sm flex items-center gap-1.5 h-[44px]">
                <div class="w-1.5 h-1.5 bg-brand-medium rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                <div class="w-1.5 h-1.5 bg-brand-medium rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                <div class="w-1.5 h-1.5 bg-brand-medium rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
        </div>`;
        container.scrollTop = container.scrollHeight;

        setTimeout(() => {
            const typingEl = document.getElementById(idTyping);
            if (typingEl) typingEl.remove();

            const respostaAnora = AnoraNLP.processarMensagem(msg);

            const respostaFormatada = Utils.escapeHTML(respostaAnora)
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-primary font-bold font-mono tracking-tight">$1</strong>');

            container.innerHTML += `
            <div class="flex gap-3 max-w-[85%] mt-4">
                <img src="assets/anora.svg" class="w-8 h-8 rounded-full shadow-sm shrink-0 object-cover border border-white/10">
                <div class="bg-surface border border-border p-3.5 rounded-[16px] rounded-tl-none shadow-sm text-sm text-text-primary leading-relaxed">
                    ${respostaFormatada}
                </div>
            </div>`;
            container.scrollTop = container.scrollHeight;
            
        }, 600 + Math.random() * 800); 
    },

    delete: (col, id) => {
        if (confirm('Tem certeza que deseja apagar este registro?')) {
            const removido = Database.remove(col, id);
            if (removido === false) {
                Utils.showToast('Não é possível apagar: este registro ainda está sendo usado.', 'error');
                return;
            }
            Utils.showToast('Registro apagado.', 'success');
            if (col === 'bancos' || col === 'cartoes') App.updateBankSelect();
            if (col === 'categorias') {
                App.updateCategorySelects();
                App.scheduleRender();
            }
            if (col === 'contatos') App.updateContatoSelect();
        }
    }
};