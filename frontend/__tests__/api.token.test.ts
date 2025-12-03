import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/firebase', () => ({
    getIdToken: async () => 'fake-token-123',
}));

import * as api from '../src/api';

describe('API token forwarding', () => {
    beforeEach(() => {
        (global as any).fetch = vi.fn(async (url: string, opts: any) => {
            return {
                ok: true,
                status: 200,
                json: async () => ({ annotations: [] }),
            } as any;
        });
    });

    it('sends Authorization header and does not include userId query', async () => {
        await api.fetchUserAnnotationsForSet('set1');
        expect((global as any).fetch).toHaveBeenCalled();
        const [url, opts] = (global as any).fetch.mock.calls[0];
        expect(url).toMatch(/\/api\/sets\/set1\/annotations$/);
        expect(url).not.toContain('userId=');
        expect(opts).toBeDefined();
        expect(opts.headers.Authorization).toBe('Bearer fake-token-123');
    });
});
