import type { Auth, NextOrObserver, User } from 'firebase/auth';
import { describe, expect, it, vi } from 'vitest';

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
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                onIdTokenChanged: (auth: Auth, cb: NextOrObserver<User>) => { },
                sendSignInLinkToEmail: async () => { },
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                isSignInWithEmailLink: (auth: Auth, url: string) => true,
                signInWithEmailLink: async () => { },
                signOut: async () => { },
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                onAuthStateChanged: (auth: Auth, cb: NextOrObserver<User>) => {
                    return () => { };
                },
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                connectAuthEmulator: (auth: Auth, host: string) => { },
            };
        });

        // Import the real firebase helper after the mocks are in place.
        const firebase = await import('../src/firebase');

        const res = await firebase.isSignInLink('https://example.com/?link=1');
        expect(res).toBe(true);
    });
});
