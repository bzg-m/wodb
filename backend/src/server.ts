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
    requestReviewForUserInSet,
    setAnnotationStatus,
    setAnnotationVisibility,
    getVisibleAnnotationsForUserInSet,
} from './dataStore.js';
import type { Annotation, AnnotationStatus, AnnotationVisibility } from './data.js';
import { connectDB } from './db.js';
import { verifyFirebaseToken } from './middleware/auth.js';

const app = express();
app.use(cors());
app.use(express.json());

function getCurrentUser(req: Request): string | null {
    // TODO: remove fallback of getting user from request.
    // If auth middleware populated `req.user`, prefer that.
    const maybeUser = (req as any).user as { uid?: string } | undefined;
    if (maybeUser?.uid) return maybeUser.uid;
    let userId = req.query.userId as string | null;
    if (!userId) {
        userId = req.body?.userId || null;
    }
    return userId;
}

app.get('/api/sets', async (_req: Request, res: Response) => {
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

app.get('/api/sets/:setid/annotations', async (req: Request, res: Response) => {
    // TODO: implement pagination, filtering, etc.
    // TODO: only show visible annotations unless admin
    const { setid } = req.params;
    const userId = getCurrentUser(req);
    try {
        if (userId) {
            const anns = await getUserAnnotationsForSet(userId, setid);
            return res.json({ annotations: anns });
        }
        const anns = await getAnnotationsForSet(setid);
        return res.json({ annotations: anns });
    } catch (err: any) {
        return res.status(500).json({ error: String(err) });
    }
});

app.get('/api/sets/:setid/visible', async (req: Request, res: Response) => {
    // TODO: remove
    const { setid } = req.params;
    const userId = getCurrentUser(req);
    try {
        const anns = await getVisibleAnnotationsForUserInSet(userId || '', setid);
        res.json({ annotations: anns });
    } catch (err: any) {
        res.status(500).json({ error: String(err) });
    }
});

app.post('/api/annotations', verifyFirebaseToken, async (req: Request, res: Response) => {
    // TODO: since annotations belong to sets, consider making endpoint /api/sets/:setid/annotations:
    //   see https://google.aip.dev/122.
    const ann = req.body as Annotation | undefined;
    if (!ann) return res.status(400).json({ error: 'missing body' });
    try {
        const result = await saveAnnotation(ann as any);
        return res.status(ann.id ? 200 : 201).json({ annotation: result });
    } catch (err: any) {
        return res.status(500).json({ error: String(err) });
    }
});

app.delete('/api/annotations/:annotationId', verifyFirebaseToken, async (req: Request, res: Response) => {
    try {
        const ok = await deleteAnnotation(req.params.annotationId);
        if (!ok) return res.status(404).json({ error: 'not found' });
        return res.status(204).end();
    } catch (err: any) {
        return res.status(500).json({ error: String(err) });
    }
});

app.post('/api/sets/:setid/request-review', verifyFirebaseToken, async (req: Request, res: Response) => {
    const { setid } = req.params;
    const userId = getCurrentUser(req);
    if (!userId) return res.status(400).json({ error: 'missing userId' });
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
