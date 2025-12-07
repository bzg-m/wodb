import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
    getSets,
    getSetById,
    getAnnotationsForSet,
    getUserAnnotationsForSet,
    saveAnnotation,
    deleteAnnotation,
    getAnnotationById,
    requestReviewForUserInSet,
    setAnnotationStatus,
    setAnnotationVisibility,
    getVisibleAnnotationsForUserInSet,
} from './dataStore.js';
import type { Annotation, AnnotationStatus, AnnotationVisibility } from './data.js';
import { connectDB } from './db.js';
import { verifyFirebaseToken } from './middleware/auth.js';
import admin from './firebaseAdmin.js';

// Simple in-memory cache for resolved user display names. This keeps recent
// lookups available for a short TTL to avoid repeatedly hitting the Admin SDK
// for the same UIDs. It's intentionally small and naive (no LRU) because it's
// only intended to reduce duplicate work in moderate-traffic dev/prod usage.
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const userNameCache: Map<
    string,
    { name: string | null; fetchedAt: number }
> = new Map();

// TODO: Replace this process-local cache with a shared Redis (or similar)
// cache when running multiple server instances. Redis would allow TTLs,
// eviction, and cross-process sharing.

// Minimal type helpers for Firebase Admin SDK responses. We intentionally
// keep these narrow and defensive because the Admin SDK types vary between
// runtime shapes and the test environment.
type AdminUserRecord = { uid?: string; displayName?: string | null; email?: string | null; phoneNumber?: string | null };
type AdminGetUsersResult = { users?: AdminUserRecord[]; notFound?: AdminUserRecord[] };

function uidOfIdentifier(id: AdminUserRecord | any): string | undefined {
    if (!id) return undefined;
    if (typeof id.uid === 'string' && id.uid) return id.uid;
    if (typeof id.email === 'string' && id.email) return id.email;
    if (typeof id.phoneNumber === 'string' && id.phoneNumber) return id.phoneNumber;
    return undefined;
}

const app = express();
app.use(cors());
app.use(express.json());

// We apply `verifyFirebaseToken` only to protected routes below so public
// endpoints (like listing sets) remain accessible without a token.

function getCurrentUser(req: Request): string | null {
    // Only trust the user populated by the auth middleware.
    // The previous fallback to query/body was intentionally removed
    // to avoid spoofing user identity. Ensure `verifyFirebaseToken`
    // runs before handlers (it does via app.use('/api', ...)).
    const maybeUser = (req as any).user as { uid?: string } | undefined;
    return maybeUser?.uid ?? null;
}

// TODO: Implement XSRF/CSRF protection for state-changing endpoints (POST/PUT/PATCH/DELETE).

function isAdminUser(req: Request): boolean {
    const maybe = (req as any).user as { claims?: Record<string, any> } | undefined;
    return !!(maybe && maybe.claims && maybe.claims.isAdmin);
}

function requireUserOrSend401(req: Request, res: Response): string | null {
    const userId = getCurrentUser(req);
    if (!userId) {
        res.status(401).json({ error: 'unauthenticated' });
        return null;
    }
    return userId;
}

app.get('/api/sets', async (req: Request, res: Response) => {
    // TODO: implement pagination, filtering, etc.
    try {
        const sets = await getSets();
        res.json({ sets });
    } catch (err: any) {
        res.status(500).json({ error: String(err) });
    }
});

app.get('/api/sets/:setid', async (req: Request, res: Response) => {
    try {
        const set = await getSetById(req.params.setid);
        if (!set) return res.status(404).json({ error: 'not found' });
        res.json({ set });
    } catch (err: any) {
        res.status(500).json({ error: String(err) });
    }
});

app.get('/api/sets/:setid/annotations', verifyFirebaseToken, async (req: Request, res: Response) => {
    // TODO: implement pagination, filtering, etc.
    // TODO: only show visible annotations
    const { setid } = req.params;
    const userId = requireUserOrSend401(req, res);
    if (!userId) return;
    try {
        // Only return annotations for the authenticated user to avoid leaking
        // other users' private annotations.
        const anns = await getUserAnnotationsForSet(userId, setid);
        return res.json({ annotations: anns });
    } catch (err: any) {
        return res.status(500).json({ error: String(err) });
    }
});

app.get('/api/sets/:setid/visible', verifyFirebaseToken, async (req: Request, res: Response) => {
    // TODO: remove
    const { setid } = req.params;
    const userId = requireUserOrSend401(req, res);
    if (!userId) return;
    try {
        const anns = await getVisibleAnnotationsForUserInSet(userId, setid);
        res.json({ annotations: anns });
    } catch (err: any) {
        res.status(500).json({ error: String(err) });
    }
});

// Resolve user display names for a set of UIDs. Expects query param `ids` as
// comma-separated list of user IDs. Requires authentication.
app.get('/api/users', verifyFirebaseToken, async (req: Request, res: Response) => {
    const idsParam = req.query.ids as string | undefined;
    if (!idsParam) return res.status(400).json({ error: 'missing ids query parameter' });
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return res.status(400).json({ error: 'no ids provided' });
    try {
        // Consult cache first and only fetch missing ids from the Admin SDK.
        const now = Date.now();
        const users: Record<string, { name?: string | null }> = {};
        const missing: string[] = [];
        for (const id of ids) {
            const cached = userNameCache.get(id);
            if (cached && now - cached.fetchedAt < USER_CACHE_TTL) {
                users[id] = { name: cached.name };
            } else {
                missing.push(id);
            }
        }

        if (missing.length > 0) {
            // Admin SDK `getUsers` accepts up to 100 identifiers. Split if needed.
            const batchSize = 100;
            for (let i = 0; i < missing.length; i += batchSize) {
                const batch = missing.slice(i, i + batchSize);
                const identifiers = batch.map((uid) => ({ uid }));
                const raw = (await admin.auth().getUsers(identifiers as any)) as AdminGetUsersResult;
                const found = raw.users || [];
                const notFound = raw.notFound || [];
                for (const u of found) {
                    const uid = uidOfIdentifier(u);
                    const name = u && u.displayName ? u.displayName : null;
                    if (uid) {
                        userNameCache.set(uid, { name, fetchedAt: Date.now() });
                        users[uid] = { name };
                    }
                }
                for (const nf of notFound) {
                    const nfUid = uidOfIdentifier(nf);
                    if (nfUid) {
                        userNameCache.set(nfUid, { name: null, fetchedAt: Date.now() });
                        users[nfUid] = { name: null };
                    }
                }
            }
        }

        return res.json({ users });
    } catch (err: any) {
        return res.status(500).json({ error: String(err) });
    }
});

app.post('/api/annotations', verifyFirebaseToken, async (req: Request, res: Response) => {
    // TODO: since annotations belong to sets, consider making endpoint /api/sets/:setid/annotations:
    //   see https://google.aip.dev/122.
    const ann = req.body as Annotation | undefined;
    if (!ann) return res.status(400).json({ error: 'missing body' });
    // authenticate
    const userId = requireUserOrSend401(req, res);
    if (!userId) return;

    // If client provided a userId that doesn't match the authenticated user
    // then only allow it when the authenticated user is an admin.
    const clientUserId = ann.userId || null;
    if (clientUserId && clientUserId !== userId && !isAdminUser(req)) {
        return res.status(403).json({ error: 'forbidden' });
    }
    // If not admin, force ownership to the authenticated user.
    if (!isAdminUser(req)) ann.userId = userId;
    try {
        const result = await saveAnnotation(ann as any);
        return res.status(ann.id ? 200 : 201).json({ annotation: result });
    } catch (err: any) {
        return res.status(500).json({ error: String(err) });
    }
});

app.delete('/api/annotations/:annotationId', verifyFirebaseToken, async (req: Request, res: Response) => {
    const userId = requireUserOrSend401(req, res);
    if (!userId) return;
    try {
        const ann = await getAnnotationById(req.params.annotationId);
        if (!ann) return res.status(404).json({ error: 'not found' });
        // Only the owner or an admin may delete
        if (ann.userId !== userId && !isAdminUser(req)) {
            return res.status(403).json({ error: 'forbidden' });
        }
        const ok = await deleteAnnotation(req.params.annotationId);
        if (!ok) return res.status(404).json({ error: 'not found' });
        return res.status(204).end();
    } catch (err: any) {
        return res.status(500).json({ error: String(err) });
    }
});

app.post('/api/sets/:setid/request-review', verifyFirebaseToken, async (req: Request, res: Response) => {
    const { setid } = req.params;
    const userId = requireUserOrSend401(req, res);
    if (!userId) return;
    try {
        const changed = await requestReviewForUserInSet(userId, setid);
        res.json({ changed });
    } catch (err: any) {
        res.status(500).json({ error: String(err) });
    }
});

app.post('/api/annotations/:annotationId/visibility', verifyFirebaseToken, async (req: Request, res: Response) => {
    // TODO: replace with PATCH on main /api/annotations/:annotationId endpoint
    const { annotationId } = req.params;
    const { visibility } = req.body as { visibility?: AnnotationVisibility };
    const userId = requireUserOrSend401(req, res);
    if (!userId) return;
    try {
        const updated = await setAnnotationVisibility(annotationId, visibility as any);
        if (!updated) return res.status(404).json({ error: 'not found' });
        res.json({ annotation: updated });
    } catch (err: any) {
        res.status(500).json({ error: String(err) });
    }
});

app.post('/api/annotations/:annotationId/status', verifyFirebaseToken, async (req: Request, res: Response) => {
    // TODO: replace with PATCH on main /api/annotations/:annotationId endpoint
    const { annotationId } = req.params;
    const { status } = req.body as { status?: AnnotationStatus };
    const userId = requireUserOrSend401(req, res);
    if (!userId) return;
    try {
        const updated = await setAnnotationStatus(annotationId, status as any);
        if (!updated) return res.status(404).json({ error: 'not found' });
        res.json({ annotation: updated });
    } catch (err: any) {
        res.status(500).json({ error: String(err) });
    }
});

// Health endpoint for readiness checks
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

// ** ADMIN ENDPOINTS **

// These endpoints require the requester be authenticated and to have the
// `isAdmin` custom claim on their token.

app.get('/api/admin/sets/:setid/annotations', verifyFirebaseToken, async (req: Request, res: Response) => {
    // TODO: implement pagination, filtering, etc.
    // TODO: support query params like `includeInvisible` (maybe as default and
    // use filtering when not needed?)
    const { setid } = req.params;
    const userId = requireUserOrSend401(req, res);
    if (!userId) return;
    try {
        if (!isAdminUser(req)) return res.status(403).json({ error: 'forbidden' });
        const anns = await getAnnotationsForSet(setid);
        return res.json({ annotations: anns });
    } catch (err: any) {
        return res.status(500).json({ error: String(err) });
    }
});

// Resolve frontend build path relative to this file so static serving works
// regardless of the process CWD (nodemon runs from /backend during dev).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const indexHtmlPath = path.join(clientDist, 'index.html');

// In development we prefer the Vite dev server (HMR). Only serve the
// production-built frontend when NODE_ENV=production or SERVE_STATIC=1.
const shouldServeStatic = process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === '1';
if (shouldServeStatic) {
    // Register static serving. express.static will serve files if present
    // and otherwise call next(). We still check for index.html on each
    // request so the build can be updated without restarting the backend.
    app.use(express.static(clientDist));

    app.use((req: Request, res: Response, next) => {
        if (req.path.startsWith('/api') || req.path === '/api') return next();
        if (!fs.existsSync(indexHtmlPath)) return next();
        res.sendFile(indexHtmlPath, (err) => {
            if (err) {
                // eslint-disable-next-line no-console
                console.error('Error sending index.html:', err && err.message);
                return next(err);
            }
        });
    });
} else {
    // eslint-disable-next-line no-console
    console.log('Running in dev mode; skipping serving built frontend. Set SERVE_STATIC=1 to override.');
}

export async function start(port = Number(process.env.PORT) || 4000) {
    await connectDB();
    const server = app.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`Backend server running at http://localhost:${port}`);
    });
    return server;
}

export { app };

// Run if entrypoint
// @ts-ignore
if ((import.meta as any).main) {
    start();
}
