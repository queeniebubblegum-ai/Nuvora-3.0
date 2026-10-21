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
        const form = e.target?.matches?.('form[data-submit="chatAnora"]') ? e.target : null;
        const chatRoot = form?.closest('[data-anora-chat]') || form?.closest('#modal-chat-anora');
        const inputEl = form?.querySelector('[data-anora-input], input[type="text"]');
        const container = chatRoot?.querySelector('[data-anora-messages]');
        const msg = inputEl?.value.trim();
        if (!msg || !container || !inputEl) return;
        const avatarUrl = Utils.escapeHTML(String(db.usuario?.fotoUrl || 'assets/perfil.svg'));
        
        container.innerHTML += `
        <div class="nv-anora-message nv-anora-message--user">
            <div class="nv-anora-bubble">${Utils.escapeHTML(msg)}</div>
            <img src="${avatarUrl}" alt="Sua mensagem" class="nv-anora-user-avatar">
        </div>`;
        
        inputEl.value = '';
        container.scrollTop = container.scrollHeight;

        const idTyping = 'typing-' + Date.now();
        container.innerHTML += `
        <div id="${idTyping}" class="nv-anora-message nv-anora-message--assistant nv-anora-typing" role="status" aria-label="A Anora está preparando uma resposta">
            <span class="nv-anora-avatar"><i class="ri-sparkling-line" aria-hidden="true"></i></span>
            <div class="nv-anora-bubble"><span></span><span></span><span></span></div>
        </div>`;
        container.scrollTop = container.scrollHeight;

        setTimeout(() => {
            const typingEl = container.querySelector(`#${idTyping}`);
            if (typingEl) typingEl.remove();

            const respostaAnora = AnoraNLP.processarMensagem(msg);

            const respostaFormatada = Utils.escapeHTML(respostaAnora)
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-primary font-bold font-mono tracking-tight">$1</strong>');

            container.innerHTML += `
            <div class="nv-anora-message nv-anora-message--assistant">
                <span class="nv-anora-avatar"><i class="ri-sparkling-line" aria-hidden="true"></i></span>
                <div class="nv-anora-bubble">${respostaFormatada}</div>
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