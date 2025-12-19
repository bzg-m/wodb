import { describe, expect, it } from 'vitest';

import { signInWithGoogle } from '../src/firebase';

describe('firebase API (wrapper)', () => {
    it('signInWithGoogle returns false when firebase is not configured (noop client)', async () => {
        const ok = await signInWithGoogle();
        expect(ok).toBe(false);
    });
});
