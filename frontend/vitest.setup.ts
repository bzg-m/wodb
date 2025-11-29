// Frontend test setup: include jest-dom matchers
import '@testing-library/jest-dom';

// Provide a minimal fetch mock if tests rely on global fetch (can be overridden in tests)
if (typeof globalThis.fetch === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    globalThis.fetch = (() => Promise.resolve({ json: () => Promise.resolve({}) })) as any;
}

// Ensure a working localStorage for tests (some test runners / jsdom setups may not provide it).
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
    (globalThis as any).localStorage = (() => {
        let store: Record<string, string> = {};
        return {
            getItem(key: string) {
                return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
            },
            setItem(key: string, value: string) {
                store[key] = String(value);
            },
            removeItem(key: string) {
                delete store[key];
            },
            clear() {
                store = {};
            },
        };
    })();
}
