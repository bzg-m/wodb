import { describe, it, expect, vi } from 'vitest';

describe('firebase isSignInLink awaiting init', () => {
    it('waits for dynamic auth module before returning result', async () => {
        // Reset module registry so we can control dynamic imports
        vi.resetModules();

        // Mock firebase/app synchronously (initializeApp used during init)
        vi.mock('firebase/app', () => ({
            initializeApp: () => ({}),
        }));

        // Mock firebase/auth but delay the module factory to simulate slow init.
        vi.mock('firebase/auth', async () => {
            // Delay resolution to simulate a late-loaded SDK or slow network.
            await new Promise((resolve) => setTimeout(resolve, 50));
            return {
                getAuth: () => ({}),
                onIdTokenChanged: (auth: any, cb: any) => { },
                sendSignInLinkToEmail: async () => { },
                isSignInWithEmailLink: (_auth: any, _url: string) => true,
                signInWithEmailLink: async () => { },
                signOut: async () => { },
                onAuthStateChanged: (_auth: any, cb: any) => {
                    return () => { };
                },
                connectAuthEmulator: (_auth: any, _host: string) => { },
            } as any;
        });

        // Import the real firebase helper after the mocks are in place.
        const firebase = await import('../src/firebase');

        const res = await firebase.isSignInLink('https://example.com/?link=1');
        expect(res).toBe(true);
    });
});
