import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Annotation, AnnotationStatus, AnnotationVisibility } from '../../common/model';
import * as api from '../src/api';

const mocks = vi.hoisted(() => {
    return {
        getSets: vi.fn(() => [{ id: 'set1', title: 'Set 1', description: '', objects: [] }]),
        saveAnnotation: vi.fn((a: Omit<Annotation, 'id'> & { id?: string }) => ({ id: 'm1', ...a })),
        deleteAnnotation: vi.fn(() => true),
        requestReviewForUserInSet: vi.fn(() => []),
        setAnnotationVisibility: vi.fn((id: string, v: AnnotationVisibility) => ({ id, visibility: v })),
        setAnnotationStatus: vi.fn((id: string, s: AnnotationStatus) => ({ id, status: s })),
    } as const;
});

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
    if (pathname === '/api/sets') {
        return { ok: true, json: async () => ({ sets: mocks.getSets() }) } as Response;
    }
    if (pathname.includes('/api/annotations')) {
        const body = init && init.body ? JSON.parse(init.body as string) : {};
        return { ok: true, json: async () => ({ annotation: mocks.saveAnnotation(body) }) } as Response;
    }
    return { ok: false, status: 404, text: async () => 'not found' } as Response;
});

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
        const payload: Omit<Annotation, 'id'> = { setId: 'set1', objectId: 'o1', userId: 'u1', text: 'x', status: 'draft', visibility: 'private' };
        const res = await api.createOrUpdateAnnotation(payload);
        expect(mocks.saveAnnotation).toHaveBeenCalledWith(payload);
        expect(res.id).toBeTruthy();
    });
});
