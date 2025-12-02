import { describe, it, expect, vi } from 'vitest';
import { createGetIdTokenMock } from './utils/mockFirebase';

// Mock the firebase module before importing the api module.
vi.mock('../src/firebase', () => createGetIdTokenMock('test-token-123'));

// Provide a local fetch mock to assert the Authorization header is sent.
globalThis.fetch = vi.fn(async (input: any, init?: any) => {
    const urlString = typeof input === 'string' ? input : input.url;
    const url = new URL(urlString, 'http://localhost');
    const pathname = url.pathname;
    if (pathname.includes('/api/annotations')) {
        // Expect Authorization header with bearer token
        expect(init).toBeTruthy();
        const auth = init.headers && (init.headers.Authorization || init.headers.authorization);
        expect(auth).toBe(`Bearer test-token-123`);
        const body = init && init.body ? JSON.parse(init.body) : {};
        return { ok: true, json: async () => ({ annotation: { id: 'm1', ...body } }) } as any;
    }
    return { ok: false, status: 404, text: async () => 'not found' } as any;
});

import * as api from '../src/api';

describe('api auth', () => {
    it('sends Authorization header when token present', async () => {
        const payload = { setId: 'set1', objectId: 'o1', userId: 'u1', text: 'x' };
        const res = await api.createOrUpdateAnnotation(payload as any);
        expect(res.id).toBe('m1');
    });
});
