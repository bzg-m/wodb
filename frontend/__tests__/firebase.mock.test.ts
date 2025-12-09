import { describe, it, expect } from 'vitest';
import { createGetIdTokenMock } from './utils/mockFirebase';

// This test validates our frontend test mock shape so other tests can rely
// on the exported functions when they `vi.mock('../src/firebase', ...)`.
describe('mockFirebase shape', () => {
    it('provides basic API functions', async () => {
        const api = createGetIdTokenMock('t') as any;
        expect(typeof api.getIdToken).toBe('function');
        expect(typeof api.isFirebaseConfigured).toBe('function');
        expect(typeof api.signInWithGoogle).toBe('function');
        expect(typeof api.sendSignInLink).toBe('function');
        expect(typeof api.isSignInLink).toBe('function');

        const token = await api.getIdToken();
        expect(token).toBe('t');

        const google = await api.signInWithGoogle();
        expect(google).toBe(true);

        const signinLink = await api.isSignInLink('http://example');
        expect(signinLink).toBe(false);
    });
});
