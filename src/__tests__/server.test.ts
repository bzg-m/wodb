import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server/server';
import type { WODBObject, WODBSet } from '../data';

// TODO: add mock data instead of using data in data.js.

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
