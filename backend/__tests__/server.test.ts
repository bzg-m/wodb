import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock the data store before importing the server so tests are true unit tests.
vi.mock('../src/dataStore.js', () => {
    const sets = [
        { id: 'set1', title: 'Set 1', objects: [{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }, { id: 'o4' }] },
        { id: 'set2', title: 'Set 2', objects: [] },
    ];
    return {
        getSets: async () => sets,
        getSetById: async (id: string) => sets.find((s) => s.id === id),
    };
});

import { app } from '../src/server.js';
import type { WODBObject, WODBSet } from '../src/data.js';

describe('server routes', () => {
    it('GET /api/sets returns sets', async () => {
        const res = await request(app).get('/api/sets');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.sets)).toBe(true);
        expect(res.body.sets.map((s: WODBSet) => s.id)).toEqual(['set1', 'set2']);
    });

    it('GET /api/sets/:setId returns found set', async () => {
        const res = await request(app).get('/api/sets/set1');
        expect(res.status).toBe(200);
        expect(res.body.set).toBeDefined();
        expect(res.body.set.id).toBe('set1');
        expect(res.body.set.objects.map((o: WODBObject) => o.id)).toEqual(['o1', 'o2', 'o3', 'o4']);
    });

    it('GET /api/sets/:setId returns 404 for unfound set', async () => {
        const res = await request(app).get('/api/sets/nosuchset');
        expect(res.status).toBe(404);
        expect(res.body.set).not.toBeDefined();
        expect(res.body.error).toBeDefined();
    });
});
