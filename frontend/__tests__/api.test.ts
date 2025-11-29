import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
    return {
        getSets: vi.fn(() => [{ id: 'set1', title: 'Set 1', description: '', objects: [] }]),
        saveAnnotation: vi.fn((a: any) => ({ id: 'm1', ...a })),
        getVisible: vi.fn((userId: string, setId: string) => []),
        getUserAnnotations: vi.fn((userId: string, setId: string) => []),
        deleteAnnotation: vi.fn(() => true),
        requestReviewForUserInSet: vi.fn(() => []),
        setAnnotationVisibility: vi.fn((id: string, v: any) => ({ id, visibility: v })),
        setAnnotationStatus: vi.fn((id: string, s: any) => ({ id, status: s })),
    } as const;
});

globalThis.fetch = vi.fn(async (input: any, init?: any) => {
    const urlString = typeof input === 'string' ? input : input.url;
    const url = new URL(urlString, 'http://localhost');
    const pathname = url.pathname;
    if (pathname === '/api/sets') {
        return { ok: true, json: async () => ({ sets: mocks.getSets() }) } as any;
    }
    if (pathname.includes('/api/annotations')) {
        const body = init && init.body ? JSON.parse(init.body) : {};
        return { ok: true, json: async () => ({ annotation: mocks.saveAnnotation(body) }) } as any;
    }
    if (pathname.endsWith('/visible')) {
        const parts = pathname.split('/');
        const setId = parts[3];
        const userId = url.searchParams.get('userId') || '';
        return { ok: true, json: async () => ({ annotations: mocks.getVisible(userId, setId) }) } as any;
    }
    return { ok: false, status: 404, text: async () => 'not found' } as any;
});

import * as api from '../src/api';

describe('api shim', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetchSets calls API', async () => {
        const sets = await api.fetchSets();
        expect(mocks.getSets).toHaveBeenCalled();
        expect(Array.isArray(sets)).toBe(true);
    });

    it('createOrUpdateAnnotation calls API', async () => {
        const payload = { setId: 'set1', objectId: 'o1', userId: 'u1', text: 'x', status: 'draft', visibility: 'private' };
        const res = await api.createOrUpdateAnnotation(payload as any);
        expect(mocks.saveAnnotation).toHaveBeenCalledWith(payload);
        expect(res.id).toBeTruthy();
    });

    it('fetchVisibleAnnotationsForUserInSet calls API', async () => {
        await api.fetchVisibleAnnotationsForUserInSet('u1', 'set1');
        expect(mocks.getVisible).toHaveBeenCalledWith('u1', 'set1');
    });
});
