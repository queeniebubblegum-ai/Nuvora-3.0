import { UIRenderer } from './rnd-ui.js';
import { PageRenderers } from './rnd-pages.js';

export const Renderer = {
    ...UIRenderer,
    
    render: (appState, currentPage) => {
        try {
            // Atualizar navegação desktop e dock mobile sem duplicar IDs.
            const v4Shell = Boolean(document.querySelector('.nv-v4-scope'));
            const routeForItem = el => el.id?.startsWith('nav-')
                ? el.id.slice(4)
                : (el.getAttribute('data-page-route') || '');
            document.querySelectorAll('.nav-item').forEach(el => {
                const isActive = routeForItem(el) === currentPage;
                el.classList.remove('bg-white/10', 'text-white', 'font-bold', 'nv-sidebar__item--active');
                if (v4Shell) {
                    el.classList.toggle('active', isActive);
                } else {
                    el.classList.remove('active');
                    if (isActive) el.classList.add('bg-white/10', 'text-white', 'font-bold', 'nv-sidebar__item--active');
                }
                el.removeAttribute('aria-current');
                if (isActive) el.setAttribute('aria-current', 'page');
            });
            // Native details/summary groups stay keyboard operable and expose the
            // active destination; mobile dock controls are not nested in a group.
            document.querySelectorAll('.nv-sidebar__group').forEach(group => {
                group.open = [...group.querySelectorAll('.nav-item')].some(item => routeForItem(item) === currentPage);
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