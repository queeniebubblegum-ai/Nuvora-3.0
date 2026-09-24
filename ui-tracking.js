// Privacy-safe local UI event hook. Disabled by default and deliberately
// limited to non-financial interaction metadata; it never sends data anywhere.
const FORBIDDEN_KEYS = new Set([
    'value', 'values', 'amount', 'valor', 'description', 'desc', 'bank', 'banco',
    'account', 'conta', 'category', 'categoria', 'financial', 'transaction', 'transacao'
]);
let enabled = false;

const clean = value => String(value ?? '').slice(0, 80).replace(/[\r\n]/g, ' ').trim();

export const configureUITracking = value => { enabled = value === true; };
export const isUITrackingEnabled = () => enabled;

export const trackUIEvent = (metadata = {}) => {
    const event = {
        screen: clean(metadata.screen),
        source: clean(metadata.source),
        action: clean(metadata.action)
    };
    // Ignore malformed events and never forward arbitrary caller properties.
    if (!event.screen || !event.source || !event.action) return null;
    const forbidden = Object.keys(metadata).some(key => FORBIDDEN_KEYS.has(String(key).toLowerCase()));
    if (forbidden) return null;
    if (enabled && typeof console !== 'undefined' && typeof console.debug === 'function') {
        console.debug('[Nuvora UI]', event);
    }
    return event;
};

export const UI_TRACKING_FORBIDDEN_KEYS = FORBIDDEN_KEYS;
