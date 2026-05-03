import { UIRenderer } from './rnd-ui.js';
import { PageRenderers } from './rnd-pages.js';

export const Renderer = {
    ...UIRenderer,
    
    render: (appState, currentPage) => {
        try {
            // Atualizar o menu de navegação ativo
            document.querySelectorAll('.nav-item').forEach(el => {
                el.classList.remove('bg-white/10', 'text-white', 'font-bold');
                if(el.id === `nav-${currentPage}`) el.classList.add('bg-white/10', 'text-white', 'font-bold');
            });

            // Delegar a renderização para a estratégia correta baseada no nome da página
            if (PageRenderers[currentPage]) {
                PageRenderers[currentPage](appState);
            } else {
                console.warn('Página não encontrada no renderizador:', currentPage);
            }

        } catch (err) {
            console.error('Erro durante a renderização da página:', err);
            UIRenderer.renderErrorState(err);
        }
    }
};