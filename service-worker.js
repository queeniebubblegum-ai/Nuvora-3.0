const APP_CACHE_NAME = 'nuvora-app-shell-v3';
const CDN_CACHE_NAME = 'nuvora-cdn-cache-v1';

// Ficheiros locais essenciais da sua aplicação (Mapeamento Completo e Atualizado)
const LOCAL_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './manifest.json',
    
    // Core & Estado
    './app.js',
    './db.js',
    './store.js',
    './router.js',
    
    // Utilitários
    './utils.js',
    './util-finance.js',
    './util-date.js',
    './util-dom.js',
    
    // Módulos de Eventos
    './events.js',
    './evt-click.js',
    './evt-change.js',
    './evt-submit.js',
    
    // Controladores
    './controllers.js',
    './ctrl-transacoes.js',
    './ctrl-contas.js',
    './ctrl-planeamento.js',
    './ctrl-sistema.js',
    
    // Componentes & View
    './components.js',
    './cmp-core.js',
    './cmp-dashboard.js',
    './cmp-reports.js',
    './cmp-pages.js',
    './cmp-modals.js',
    
    // Renderização & UI
    './renderer.js',
    './rnd-ui.js',
    './rnd-pages.js',
    './ui.js',
    
    // Gráficos
    './charts.js',
    './chart-fluxo.js',
    './chart-compare.js',
    './chart-cartoes.js',
    './chart-patrimonio.js',
    './chart-categorias.js',
    
    // Notificações
    './notifications.js',
    './notif-engine.js',
    './notif-ui.js',
    
    // IA e Inteligência
    './mentorEngine.js',
    './mnt-math.js',
    './mnt-semantics.js',
    './anora-nlp.js',
    
    // Importação
    './ofx.js',
    
    // Assets & Imagens Base
];

// Origens de CDNs externos que queremos guardar em cache
const CDN_ORIGINS = [
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://cdn.jsdelivr.net'
];

// INSTALAÇÃO: Guarda os ficheiros locais imediatamente
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Pré-cacheamento dos recursos vitais (App Shell).');
            return cache.addAll(LOCAL_ASSETS);
        })
    );
    self.skipWaiting();
});

// ATIVAÇÃO: Limpa caches antigos de versões anteriores
self.addEventListener('activate', (event) => {
    const validCaches = [APP_CACHE_NAME, CDN_CACHE_NAME];
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!validCaches.includes(cacheName)) {
                        console.log(`[Service Worker] Limpando cache obsoleto: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// INTERCEPTAÇÃO: Roteamento de Estratégias de Cache
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const isLocal = LOCAL_ASSETS.some(asset => url.pathname.endsWith(asset.replace('./', ''))) || url.origin === location.origin;
    const isCDN = CDN_ORIGINS.some(origin => url.origin.startsWith(origin));

    // ESTRATÉGIA 1: Stale-While-Revalidate (Para ficheiros locais HTML/JS/CSS)
    if (isLocal && event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(APP_CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                }).catch((error) => {
                    console.warn('[Service Worker] Falha na rede para ficheiro local, servindo apenas cache:', event.request.url);
                });

                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // ESTRATÉGIA 2: Cache First, Network Fallback (Para bibliotecas externas e CDNs)
    if (isCDN && event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request).then((networkResponse) => {
                    if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
                        return networkResponse;
                    }

                    const responseToCache = networkResponse.clone();
                    caches.open(CDN_CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                }).catch(() => {
                    console.warn('[Service Worker] Falha de rede ao buscar CDN:', event.request.url);
                });
            })
        );
    }
});