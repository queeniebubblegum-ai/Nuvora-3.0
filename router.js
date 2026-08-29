export const Router = {
    validPages: ['Dashboard', 'Transacoes', 'Relatorios', 'Planejamento', 'Agendamentos', 'Contas', 'Contatos', 'Metas', 'Orcamento', 'Categorias', 'Configuracoes'],
    
    init: (onNavigateCallback) => {
        const hash = window.location.hash.replace('#', '');
        const startPage = Router.validPages.find(p => p.toLowerCase() === hash.toLowerCase()) || 'Dashboard';
        
        history.replaceState({ page: startPage }, '', `#${startPage.toLowerCase()}`);

        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.page) {
                onNavigateCallback(event.state.page, true); 
            }
        });

        return startPage;
    },

    navigate: (page, skipHistory = false) => {
        if (!skipHistory) { 
            history.pushState({ page }, '', `#${page.toLowerCase()}`); 
        }
    }
};