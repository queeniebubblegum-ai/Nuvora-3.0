export const ANORA_SETTINGS_KEY = 'avenera:anora-preferences';

export const DEFAULT_ANORA_PREFERENCES = Object.freeze({
    style: 'equilibrado',
    notifications: true,
    localTelemetry: false,
});

const validStyles = new Set(['suave', 'equilibrado', 'rigoroso']);

const normalizePreferences = value => ({
    style: validStyles.has(value?.style) ? value.style : DEFAULT_ANORA_PREFERENCES.style,
    notifications: typeof value?.notifications === 'boolean' ? value.notifications : DEFAULT_ANORA_PREFERENCES.notifications,
    localTelemetry: typeof value?.localTelemetry === 'boolean' ? value.localTelemetry : DEFAULT_ANORA_PREFERENCES.localTelemetry,
});

export const loadAnoraPreferences = () => {
    try {
        const storage = globalThis.localStorage;
        if (!storage) return { ...DEFAULT_ANORA_PREFERENCES };
        return normalizePreferences(JSON.parse(storage.getItem(ANORA_SETTINGS_KEY) || 'null'));
    } catch {
        return { ...DEFAULT_ANORA_PREFERENCES };
    }
};

export const saveAnoraPreferences = preferences => {
    const next = normalizePreferences({ ...loadAnoraPreferences(), ...(preferences || {}) });
    try {
        globalThis.localStorage?.setItem(ANORA_SETTINGS_KEY, JSON.stringify(next));
    } catch {
        // Privacy settings stay usable in-memory even if storage is unavailable.
    }
    return next;
};
