import type { NextFunction, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedRequest } from '../src/middleware/auth.js';

describe('users endpoint', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('resolves known users and returns null for notFound entries, and caches results', async () => {
        // Mock auth middleware to attach a user
        vi.doMock('../src/middleware/auth.js', () => ({
            verifyFirebaseToken: (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
                req.user = { uid: 'caller-1', claims: { isAdmin: false } };
                return next();
            },
        }));

        // Spyable getUsers implementation
        const getUsersMock = vi.fn(async (idents: unknown[]) => {
            // Simulate returning one found user (u1) and one notFound (u2)
            return {
                users: [{ uid: 'u1', displayName: 'Alice' }],
                notFound: [{ uid: 'u2' }],
            };
        });

        vi.doMock('../src/firebaseAdmin.js', () => ({
            default: {
                auth: () => ({ getUsers: getUsersMock }),
            },
        }));

        const mod = await import('../src/server.js');
        const { app } = mod;

        // First request should call getUsersMock
        const res1 = await request(app).get('/api/users?ids=u1,u2');
        expect(res1.status).toBe(200);
        expect(res1.body.users).toBeDefined();
        expect(res1.body.users.u1.name).toBe('Alice');
        expect(res1.body.users.u2.name).toBeNull();
        expect(getUsersMock).toHaveBeenCalledTimes(1);

        // Second request should hit server cache and NOT call getUsers again
        const res2 = await request(app).get('/api/users?ids=u1,u2');
        expect(res2.status).toBe(200);
        expect(res2.body.users.u1.name).toBe('Alice');
        expect(res2.body.users.u2.name).toBeNull();
        expect(getUsersMock).toHaveBeenCalledTimes(1);
    });
});
