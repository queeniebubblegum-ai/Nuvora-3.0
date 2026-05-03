import { Utils } from './utils.js';
import { App } from './app.js';
import { ClickEvents } from './evt-click.js';
import { ChangeEvents } from './evt-change.js';
import { SubmitEvents } from './evt-submit.js';
import { Controllers } from './controllers.js';

export const EventManager = {
    setup: () => {
        ClickEvents.setup();
        ChangeEvents.setup();
        SubmitEvents.setup();

        const handleSearchInput = Utils.debounce((val) => {
            App.setFilter('desc', val);
        }, 300);

        document.body.addEventListener('input', (e) => {
            if (e.target.matches('[data-input="setFilterDesc"]')) { 
                handleSearchInput(e.target.value); 
            }
            if (e.target.matches('[data-input="preview503020"]')) {
                Controllers.preview503020(e.target.value);
            }
        });

        // =======================================================================
        // MOTOR FÍSICO DE SWIPE GESTURES (UX MOBILE NATIVA)
        // =======================================================================
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let activeCard = null;
        let isSwiping = false;

        const swipeThreshold = 80; // Pixels necessários para ativar a ação

        document.body.addEventListener('touchstart', (e) => {
            const container = e.target.closest('.swipe-container');
            if (!container) return;
            
            // Ignora se estiver a tentar clicar no checkbox
            if (e.target.tagName.toLowerCase() === 'input') return;

            activeCard = container.querySelector('.swipe-front');
            if (!activeCard) return;

            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwiping = false;
            
            // Remove a transição suave para que o cartão siga o dedo instantaneamente
            activeCard.style.transition = 'none';
        }, { passive: true });

        document.body.addEventListener('touchmove', (e) => {
            if (!activeCard) return;

            const x = e.touches[0].clientX;
            const y = e.touches[0].clientY;
            const diffX = x - startX;
            const diffY = Math.abs(y - startY);

            // Bloqueia o scroll horizontal se o utilizador estiver claramente a fazer swipe lateral
            if (!isSwiping && Math.abs(diffX) > diffY && Math.abs(diffX) > 10) {
                isSwiping = true;
            }

            if (isSwiping) {
                e.preventDefault(); // Impede o ecrã de saltar
                currentX = diffX;

                // Limita a física: Não deixa arrastar para fora do ecrã
                const maxDrag = window.innerWidth / 2;
                let resistanceX = currentX;
                if (currentX > maxDrag) resistanceX = maxDrag;
                if (currentX < -maxDrag) resistanceX = -maxDrag;

                activeCard.style.transform = `translateX(${resistanceX}px)`;

                // Feedback Visual de Intenção (Revela a cor por trás dependendo da direção)
                const txId = activeCard.parentElement.getAttribute('data-id');
                const btnEdit = document.getElementById(`swipe-edit-${txId}`);
                const btnDelete = document.getElementById(`swipe-delete-${txId}`);

                if (currentX > 0) {
                    if (btnEdit) btnEdit.style.opacity = Math.min(currentX / swipeThreshold, 1);
                    if (btnDelete) btnDelete.style.opacity = 0;
                } else {
                    if (btnDelete) btnDelete.style.opacity = Math.min(Math.abs(currentX) / swipeThreshold, 1);
                    if (btnEdit) btnEdit.style.opacity = 0;
                }
            }
        }, { passive: false }); // Falso para permitir o e.preventDefault() no scroll horizontal

        document.body.addEventListener('touchend', (e) => {
            if (!activeCard) return;

            const txId = activeCard.parentElement.getAttribute('data-id');
            const btnEdit = document.getElementById(`swipe-edit-${txId}`);
            const btnDelete = document.getElementById(`swipe-delete-${txId}`);

            // Restaura a física de mola (mola de volta ao sítio se não passar o limite)
            activeCard.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

            if (isSwiping) {
                if (currentX > swipeThreshold) {
                    // Completou o Swipe para a Direita (EDITAR)
                    activeCard.style.transform = `translateX(${window.innerWidth}px)`; // Empurra tudo
                    setTimeout(() => App.openEditModal(txId), 200);
                } else if (currentX < -swipeThreshold) {
                    // Completou o Swipe para a Esquerda (APAGAR COM SOFT DELETE)
                    activeCard.style.transform = `translateX(-${window.innerWidth}px)`; // Tira do ecrã
                    setTimeout(() => Controllers.deleteExpense(txId), 200);
                } else {
                    // Cancelou (Mola para o centro)
                    activeCard.style.transform = `translateX(0)`;
                    if (btnEdit) btnEdit.style.opacity = 0;
                    if (btnDelete) btnDelete.style.opacity = 0;
                }
            } else {
                activeCard.style.transform = `translateX(0)`;
            }

            // Limpa as variáveis físicas
            activeCard = null;
            currentX = 0;
            isSwiping = false;
        }, { passive: true });
    }
};