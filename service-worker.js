// Increment when local application assets change so installed clients fetch
// the latest modules, including the shared cent-precision money helpers.
const APP_CACHE_NAME = 'avenera-app-shell-v35';
// Kept as an explicit migration marker so diagnostics can identify and remove
// the previous shell version after an update.
const LEGACY_APP_CACHE_NAME = 'avenera-app-shell-v26';
const PREVIOUS_APP_CACHE_NAME = 'avenera-app-shell-v27';
// Historical marker retained for diagnostics and older clients that still
// report the v25 shell during an update handshake.
const HISTORIC_APP_CACHE_NAME = 'avenera-app-shell-v25';
const CDN_CACHE_NAME = 'avenera-cdn-cache-v1';

// Ficheiros locais essenciais da sua aplicação (Mapeamento Completo e Atualizado)
const LOCAL_ASSETS = [

    './avenera-visual.css?v=20261021-refinements',
    './avenera-visual.css',
    './avenera-icons.css?v=20261021',
    './avenera-icons.css',
    './assets/fonts/fraunces-500.ttf',
    './assets/fonts/fraunces-600.ttf',
    './assets/fonts/public-sans-400.ttf',
    './assets/fonts/public-sans-500.ttf',
    './assets/fonts/public-sans-600.ttf',
    './assets/fonts/public-sans-700.ttf',
    './assets/icons/archive.svg',
    './assets/icons/arrow-down-left.svg',
    './assets/icons/arrow-left-right.svg',
    './assets/icons/arrow-right.svg',
    './assets/icons/arrow-up-right.svg',
    './assets/icons/baby.svg',
    './assets/icons/banknote-arrow-down.svg',
    './assets/icons/bed.svg',
    './assets/icons/bell-off.svg',
    './assets/icons/bell.svg',
    './assets/icons/book-open.svg',
    './assets/icons/brain.svg',
    './assets/icons/briefcase-business.svg',
    './assets/icons/brush-cleaning.svg',
    './assets/icons/bug.svg',
    './assets/icons/bus.svg',
    './assets/icons/calendar-check.svg',
    './assets/icons/calendar-clock.svg',
    './assets/icons/calendar-days.svg',
    './assets/icons/calendar-search.svg',
    './assets/icons/calendar.svg',
    './assets/icons/camera.svg',
    './assets/icons/car.svg',
    './assets/icons/chart-column-increasing.svg',
    './assets/icons/chart-no-axes-column.svg',
    './assets/icons/chart-no-axes-combined.svg',
    './assets/icons/chart-pie.svg',
    './assets/icons/check-check.svg',
    './assets/icons/check.svg',
    './assets/icons/chevron-down.svg',
    './assets/icons/chevron-left.svg',
    './assets/icons/chevron-right.svg',
    './assets/icons/circle-alert.svg',
    './assets/icons/circle-check.svg',
    './assets/icons/circle-question-mark.svg',
    './assets/icons/circle.svg',
    './assets/icons/clock-3.svg',
    './assets/icons/cloud-upload.svg',
    './assets/icons/contact-round.svg',
    './assets/icons/credit-card.svg',
    './assets/icons/database.svg',
    './assets/icons/download.svg',
    './assets/icons/droplet.svg',
    './assets/icons/dumbbell.svg',
    './assets/icons/ellipsis.svg',
    './assets/icons/eraser.svg',
    './assets/icons/external-link.svg',
    './assets/icons/eye.svg',
    './assets/icons/file-down.svg',
    './assets/icons/file-input.svg',
    './assets/icons/file-output.svg',
    './assets/icons/file-spreadsheet.svg',
    './assets/icons/file-up.svg',
    './assets/icons/film.svg',
    './assets/icons/flag.svg',
    './assets/icons/flame.svg',
    './assets/icons/flower-2.svg',
    './assets/icons/focus.svg',
    './assets/icons/fuel.svg',
    './assets/icons/gamepad-2.svg',
    './assets/icons/gift.svg',
    './assets/icons/git-merge.svg',
    './assets/icons/glasses.svg',
    './assets/icons/goal.svg',
    './assets/icons/graduation-cap.svg',
    './assets/icons/hand-coins.svg',
    './assets/icons/hard-drive.svg',
    './assets/icons/heart-pulse.svg',
    './assets/icons/history.svg',
    './assets/icons/hospital.svg',
    './assets/icons/house.svg',
    './assets/icons/info.svg',
    './assets/icons/landmark.svg',
    './assets/icons/languages.svg',
    './assets/icons/laptop.svg',
    './assets/icons/layers.svg',
    './assets/icons/layout-dashboard.svg',
    './assets/icons/lightbulb.svg',
    './assets/icons/list-checks.svg',
    './assets/icons/list-filter.svg',
    './assets/icons/loader-circle.svg',
    './assets/icons/lock-keyhole.svg',
    './assets/icons/mail.svg',
    './assets/icons/map-pin.svg',
    './assets/icons/minus.svg',
    './assets/icons/music-2.svg',
    './assets/icons/palette.svg',
    './assets/icons/panels-top-left.svg',
    './assets/icons/paw-print.svg',
    './assets/icons/pencil.svg',
    './assets/icons/percent.svg',
    './assets/icons/phone.svg',
    './assets/icons/piggy-bank.svg',
    './assets/icons/pill.svg',
    './assets/icons/plane.svg',
    './assets/icons/plus.svg',
    './assets/icons/receipt-text.svg',
    './assets/icons/receipt.svg',
    './assets/icons/refresh-cw.svg',
    './assets/icons/repeat-2.svg',
    './assets/icons/rocket.svg',
    './assets/icons/rotate-ccw.svg',
    './assets/icons/rotate-cw.svg',
    './assets/icons/route.svg',
    './assets/icons/save.svg',
    './assets/icons/scale.svg',
    './assets/icons/search.svg',
    './assets/icons/send.svg',
    './assets/icons/settings.svg',
    './assets/icons/shield-check.svg',
    './assets/icons/shirt.svg',
    './assets/icons/shopping-bag.svg',
    './assets/icons/shopping-cart.svg',
    './assets/icons/sliders-horizontal.svg',
    './assets/icons/smartphone.svg',
    './assets/icons/smile.svg',
    './assets/icons/sparkles.svg',
    './assets/icons/sprout.svg',
    './assets/icons/square-parking.svg',
    './assets/icons/star.svg',
    './assets/icons/stethoscope.svg',
    './assets/icons/sun-moon.svg',
    './assets/icons/tag.svg',
    './assets/icons/tags.svg',
    './assets/icons/target.svg',
    './assets/icons/ticket.svg',
    './assets/icons/trash-2.svg',
    './assets/icons/trending-down.svg',
    './assets/icons/trending-up.svg',
    './assets/icons/triangle-alert.svg',
    './assets/icons/tv.svg',
    './assets/icons/type.svg',
    './assets/icons/undo-2.svg',
    './assets/icons/upload.svg',
    './assets/icons/user-round.svg',
    './assets/icons/utensils.svg',
    './assets/icons/volleyball.svg',
    './assets/icons/wallet.svg',
    './assets/icons/wand-sparkles.svg',
    './assets/icons/wifi.svg',
    './assets/icons/wrench.svg',
    './assets/icons/x.svg',
    './assets/icons/zap.svg',

    './',
    './index.html',
    './styles.css?v=20260925-anora-restoration-2',
    './styles.css',
    './styles-v4.css?v=20260925-v4-shell-1',
    './styles-v4.css',
    './redesign-v4-coordinated.css?v=20261016-layout-v4',
    './redesign-fase2.css?v=20260925',
    './mockup-theme.css?v=20261016-v6',
    './mockup-theme.css',
    './design-system.css?v=20261016-mockups-1',
    './design-system.css',
    './modal-design.js',
    './cmp-experience.js',
    './experience.js',
    './cmp-workspaces.js',
    './ctrl-investimentos.js',
    './modal-shortcuts.js',
    './manifest.json',
    './privacidade/index.html',
    './termos/index.html',
    './suporte/index.html',
    
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
    './backup-format.js',
    './financial-integrity.js',
    './schema-migrations.js',
    
    // Módulos de Eventos
    './events.js',
    './evt-click.js',
    './evt-change.js',
    './evt-submit.js',
    './submit-guard.js',
    './submit-feedback.js',
    './ui-tracking.js',
    './anora-preferences.js',
    './ofx-balance.js',
    './financial-ledger.js',
    './invoice-model.js',
    './conferencing-model.js',
    './reference-matching.js',
    './conferencing.js',
    './financial-experience.css',
    './invoice-provisioning.js',
    './invoice-payment.js',
    './reconciliation.js',
    './money-math.js',

    // Módulos compartilhados importados pelas páginas e componentes
    './analytics.js',
    './cashflow-projection.js',
    './categorias-padrao.js',
    './classification.js',
    './financial-refinements.js',
    './financial-transfers.js',
    './import-errors.js',
    './report-data.js',
    './transaction-filters.js',
    './transaction-drafts.js',
    './transaction-type-menu.js',
    './view-context.js',
    
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
    './priority.js',
    './cmp-reports.js',
    './cmp-pages.js',
    './cmp-modals.js',
    
    // Renderização & UI
    './renderer.js',
    './rnd-ui.js',
    './rnd-pages.js',
    './rnd-anora.js',
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
    './csv-import.js',
    './csv-manager.js',
    
    // Assets & Imagens Base
    './assets/logo.svg',
    './assets/anora.svg',
    './assets/perfil.svg',
    './assets/icon-192.svg',
    './assets/icon-512.svg'
];

// Origens de CDNs externos que queremos guardar em cache
const CDN_ORIGINS = [
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://cdn.jsdelivr.net'
];

const CACHE_BATCH_SIZE = 12;

// Um recurso opcional com erro não deve impedir o cache dos demais módulos.
const cacheAssetsInBatches = async (cache, assets) => {
    for (let offset = 0; offset < assets.length; offset += CACHE_BATCH_SIZE) {
        const batch = assets.slice(offset, offset + CACHE_BATCH_SIZE);
        try {
            await cache.addAll(batch);
        } catch (_batchError) {
            const results = await Promise.allSettled(batch.map(asset => cache.add(asset)));
            const failedAssets = batch.filter((_, index) => results[index].status === 'rejected');
            if (failedAssets.length) {
                console.warn('[Service Worker] Recursos não pré-cacheados; serão buscados pela rede quando possível:', failedAssets);
            }
        }
    }
};

// INSTALAÇÃO: Guarda os ficheiros locais imediatamente
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_CACHE_NAME).then(async (cache) => {
            console.log('[Service Worker] Pré-cacheamento dos recursos vitais (App Shell).');
            await cacheAssetsInBatches(cache, LOCAL_ASSETS);
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

    // ESTRATÉGIA 1: Network-First para HTML/JS/CSS. SWR servia o shell antigo
    // durante a primeira navegação após uma instalação, exigindo F5 para receber
    // o modal corrigido. O cache continua sendo fallback offline.
    if (isLocal && event.request.method === 'GET') {
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(APP_CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                }
                return networkResponse;
            }).catch(() => caches.match(event.request).then(cached => cached || Response.error()))
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
                    return Response.error();
                });
            })
        );
    }
});
