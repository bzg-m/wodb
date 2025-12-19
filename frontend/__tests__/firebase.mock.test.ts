import { describe, expect, it } from 'vitest';

import { createGetIdTokenMock } from './utils/mockFirebase';

// This test validates our frontend test mock shape so other tests can rely
// on the exported functions when they `vi.mock('../src/firebase', ...)`.
describe('mockFirebase shape', () => {
    it('provides basic API functions', async () => {
        const api = createGetIdTokenMock('t');
        const a = api as {
            getIdToken: () => Promise<string | null>;
            isFirebaseConfigured: () => boolean;
            signInWithGoogle: () => Promise<boolean>;
        };
        expect(typeof a.getIdToken).toBe('function');
        expect(typeof a.isFirebaseConfigured).toBe('function');
        expect(typeof a.signInWithGoogle).toBe('function');

        const token = await a.getIdToken();
        expect(token).toBe('t');

        const google = await a.signInWithGoogle();
        expect(google).toBe(true);

    });
});
