import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/firebase', () => ({
    getIdToken: async () => 'fake-token-123',
}));

import * as api from '../src/api';

describe('API token forwarding', () => {
    beforeEach(() => {
        // Provide a typed global fetch mock for tests
        type FetchFn = (input: RequestInfo, init?: RequestInit) => Promise<Response>;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        globalThis.fetch = vi.fn(async (url: RequestInfo, opts?: RequestInit) => {
            const res = {
                ok: true,
                status: 200,
                json: async () => ({ annotations: [] }),
            };
            return res as unknown as Response;
        }) as unknown as FetchFn;
    });

    it('sends Authorization header and does not include userId query', async () => {
        await api.fetchUserAnnotationsForSet('set1');
        const fetchMock = vi.mocked(globalThis.fetch as unknown as (input: RequestInfo, init?: RequestInit) => Promise<Response>);
        expect(fetchMock).toHaveBeenCalled();
        const firstCall = fetchMock.mock.calls[0];
        const url = typeof firstCall[0] === 'string' ? firstCall[0] : String(firstCall[0]);
        const opts = firstCall[1] as RequestInit | undefined;
        expect(url).toMatch(/\/api\/sets\/set1\/annotations$/);
        expect(url).not.toContain('userId=');
        expect(opts).toBeDefined();
        const headers = new Headers(opts?.headers as HeadersInit);
        const auth = headers.get('authorization') || headers.get('Authorization');
        expect(auth).toBe('Bearer fake-token-123');
    });
});
