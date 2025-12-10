// Frontend test setup: include jest-dom matchers
import '@testing-library/jest-dom';

interface GlobalThis {
    fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
    localStorage: Storage;
};

// Provide a minimal fetch mock if tests rely on global fetch (can be overridden in tests)
if (typeof globalThis.fetch === 'undefined') {
    globalThis.fetch = (() => Promise.resolve({ json: () => Promise.resolve({}) })) as unknown as GlobalThis['fetch'];
}

// Ensure a working localStorage for tests (some test runners / jsdom setups may not provide it).
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
    (globalThis as unknown as GlobalThis).localStorage = (() => {
        let store: Record<string, string> = {};
        return {
            getItem(key: string): string | null {
                return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
            },
            setItem(key: string, value: string): void {
                store[key] = String(value);
            },
            removeItem(key: string): void {
                delete store[key];
            },
            clear(): void {
                store = {};
            },
            key(index: number): string | null {
                const keys = Object.keys(store);
                return keys[index] ?? null;
            },
            get length(): number {
                return Object.keys(store).length;
            },
        } as Storage;
    })();
}
