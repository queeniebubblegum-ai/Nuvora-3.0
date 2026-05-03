// arquivo: store.js
export const createReactiveState = (initialState, defaultCallback = null) => {
    // Armazena os ouvintes granulares (listeners) organizados por propriedade
    const listeners = {};
    
    // Cache de proxies para evitar a recriação e vazamento de memória a cada leitura
    const proxyCache = new WeakMap();

    // Função para registrar um callback específico para uma propriedade
    const subscribe = (property, callback) => {
        if (!listeners[property]) {
            listeners[property] = [];
        }
        listeners[property].push(callback);
    };

    const handler = {
        set(target, property, value) {
            // Apenas atualiza se o valor realmente mudou (evita renders desnecessários)
            if (target[property] !== value) {
                target[property] = value;
                
                // 1. Notifica ouvintes granulares (apenas quem está escutando esta propriedade específica)
                if (listeners[property]) {
                    listeners[property].forEach(cb => cb(value, property));
                }

                // 2. Dispara o callback geral (mantém a compatibilidade com o App.scheduleRender existente)
                if (defaultCallback) {
                    defaultCallback(property, value);
                }
            }
            return true;
        },
        get(target, property) {
            // Permite acessar o método de inscrição diretamente do estado
            if (property === 'subscribe') {
                return subscribe;
            }

            const value = target[property];

            // Se a propriedade for um objeto (como os filtros), utiliza o cache de Proxy
            if (typeof value === 'object' && value !== null) {
                if (!proxyCache.has(value)) {
                    proxyCache.set(value, new Proxy(value, handler));
                }
                return proxyCache.get(value);
            }
            return value;
        }
    };

    return new Proxy(initialState, handler);
};