import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

describe('annotations endpoints', () => {
    beforeEach(() => {
        // Ensure module cache is reset so each test may provide different
        // middleware behavior via doMock.
        vi.resetModules();
    });

    it('returns only the annotations of the authenticated user for the user endpoint', async () => {
        // Mock dataStore to return a single annotation for the user
        vi.doMock('../src/dataStore.js', () => ({
            getUserAnnotationsForSet: async (uid: string, setId: string) => [
                { id: 'u1', userId: uid, setId, objectId: 'o1', text: 'user-note', status: 'pending', visibility: 'group' },
            ],
            getAnnotationsForSet: async (setId: string) => [
                { id: 'a1', userId: 'user1', setId, objectId: 'o1', text: 'a1', status: 'pending', visibility: 'group' },
                { id: 'a2', userId: 'user2', setId, objectId: 'o2', text: 'a2', status: 'pending', visibility: 'group' },
            ],
        }));

        // Mock auth middleware to attach a non-admin user
        vi.doMock('../src/middleware/auth.js', () => ({
            verifyFirebaseToken: (req: any, _res: any, next: any) => {
                req.user = { uid: 'user-123', claims: { isAdmin: false } };
                return next();
            },
        }));

        const { app } = await import('../src/server.js');
        const res = await request(app).get('/api/sets/set-xyz/annotations');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.annotations)).toBe(true);
        expect(res.body.annotations).toHaveLength(1);
        expect(res.body.annotations[0].userId).toBe('user-123');
    });

    it('requires admin and returns all annotations for the admin endpoint', async () => {
        vi.doMock('../src/dataStore.js', () => ({
            getAnnotationsForSet: async (setId: string) => [
                { id: 'a1', userId: 'user1', setId, objectId: 'o1', text: 'a1', status: 'pending', visibility: 'group' },
                { id: 'a2', userId: 'user2', setId, objectId: 'o2', text: 'a2', status: 'accepted', visibility: 'public' },
            ],
        }));

        // First exercise that a non-admin gets forbidden
        vi.doMock('../src/middleware/auth.js', () => ({
            verifyFirebaseToken: (req: any, _res: any, next: any) => {
                req.user = { uid: 'user-123', claims: { isAdmin: false } };
                return next();
            },
        }));
        let mod = await import('../src/server.js');
        let r1 = await request(mod.app).get('/api/admin/sets/set-xyz/annotations');
        expect(r1.status).toBe(403);

        // Now mock as admin and verify all annotations are returned
        vi.resetModules();
        vi.doMock('../src/dataStore.js', () => ({
            getAnnotationsForSet: async (setId: string) => [
                { id: 'a1', userId: 'user1', setId, objectId: 'o1', text: 'a1', status: 'pending', visibility: 'group' },
                { id: 'a2', userId: 'user2', setId, objectId: 'o2', text: 'a2', status: 'accepted', visibility: 'public' },
            ],
        }));
        vi.doMock('../src/middleware/auth.js', () => ({
            verifyFirebaseToken: (req: any, _res: any, next: any) => {
                req.user = { uid: 'admin-1', claims: { isAdmin: true } };
                return next();
            },
        }));

        mod = await import('../src/server.js');
        const r2 = await request(mod.app).get('/api/admin/sets/set-xyz/annotations');
        expect(r2.status).toBe(200);
        expect(Array.isArray(r2.body.annotations)).toBe(true);
        expect(r2.body.annotations).toHaveLength(2);
    });
});
