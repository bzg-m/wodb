import { describe, expect, it, vi } from 'vitest';

import type { Annotation } from '../../common/model';
import * as api from '../src/api';
import { createGetIdTokenMock } from './utils/mockFirebase';

// Mock the firebase module before importing the api module.
vi.mock('../src/firebase', () => createGetIdTokenMock('test-token-123'));

// Provide a local fetch mock to assert the Authorization header is sent.
globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    let urlString: string;
    if (typeof input === 'string') {
        urlString = input;
    } else if ((input as Request).url !== undefined) {
        urlString = (input as Request).url;
    } else {
        urlString = (input as URL).toString();
    }
    const url = new URL(urlString, 'http://localhost');
    const pathname = url.pathname;
    if (pathname.includes('/api/annotations')) {
        // Expect Authorization header with bearer token
        expect(init).toBeTruthy();
        const headers = new Headers(init?.headers as HeadersInit);
        const auth = headers.get('authorization') || headers.get('Authorization');
        expect(auth).toBe(`Bearer test-token-123`);
        const body = init && init.body ? JSON.parse(init.body as string) : {};
        return { ok: true, json: async () => ({ annotation: { id: 'm1', ...body } }) } as Response;
    }
    return { ok: false, status: 404, text: async () => 'not found' } as Response;
});

describe('api auth', () => {
    it('sends Authorization header when token present', async () => {
        const payload: Omit<Annotation, 'id'> = { setId: 'set1', objectId: 'o1', userId: 'u1', text: 'x', status: 'pending', visibility: 'private' };
        const res = await api.createOrUpdateAnnotation(payload);
        expect(res.id).toBe('m1');
    });
});
