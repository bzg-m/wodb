import { describe, it, expect } from 'vitest';
import { signInWithGoogle, isSignInLink } from '../src/firebase';

describe('firebase API (wrapper)', () => {
    it('signInWithGoogle returns false when firebase is not configured (noop client)', async () => {
        const ok = await signInWithGoogle();
        expect(ok).toBe(false);
    });

    it('isSignInLink returns false when firebase is not configured', async () => {
        const ok = await isSignInLink('https://example.com');
        expect(ok).toBe(false);
    });
});
