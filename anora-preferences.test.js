import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ANORA_SETTINGS_KEY, DEFAULT_ANORA_PREFERENCES, loadAnoraPreferences, saveAnoraPreferences } from './anora-preferences.js';

const createStorage = () => {
    const data = new Map();
    return {
        getItem: key => data.has(key) ? data.get(key) : null,
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key),
        clear: () => data.clear(),
    };
};

describe('local Anora preferences', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', createStorage());
    });

    it('uses safe defaults and keeps telemetry disabled by default', () => {
        expect(loadAnoraPreferences()).toEqual(DEFAULT_ANORA_PREFERENCES);
        expect(DEFAULT_ANORA_PREFERENCES.localTelemetry).toBe(false);
    });

    it('persists supported preferences without accepting malformed values', () => {
        const saved = saveAnoraPreferences({ style: 'rigoroso', notifications: false, localTelemetry: true, unknown: 'ignored' });
        expect(saved).toEqual({ style: 'rigoroso', notifications: false, localTelemetry: true });
        expect(JSON.parse(localStorage.getItem(ANORA_SETTINGS_KEY))).toEqual(saved);
        expect(saveAnoraPreferences({ style: 'other' }).style).toBe('equilibrado');
    });

    it('recovers from invalid JSON and unavailable storage', () => {
        localStorage.setItem(ANORA_SETTINGS_KEY, '{bad');
        expect(loadAnoraPreferences()).toEqual(DEFAULT_ANORA_PREFERENCES);
        vi.stubGlobal('localStorage', undefined);
        expect(loadAnoraPreferences()).toEqual(DEFAULT_ANORA_PREFERENCES);
        expect(() => saveAnoraPreferences({ notifications: false })).not.toThrow();
    });
});
