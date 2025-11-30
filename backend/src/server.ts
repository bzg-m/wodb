import express, { Request, Response } from 'express';
import cors from 'cors';
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

const app = express();
app.use(cors());
app.use(express.json());

function getCurrentUser(req: Request): string | null {
    // TODO: implement authentication to get current user.  For now, we trust the request.
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

app.post('/api/annotations', async (req: Request, res: Response) => {
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

app.delete('/api/annotations/:annotationId', async (req: Request, res: Response) => {
    try {
        const ok = await deleteAnnotation(req.params.annotationId);
        if (!ok) return res.status(404).json({ error: 'not found' });
        return res.status(204).end();
    } catch (err: any) {
        return res.status(500).json({ error: String(err) });
    }
});

app.post('/api/sets/:setid/request-review', async (req: Request, res: Response) => {
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

app.post('/api/annotations/:annotationId/visibility', async (req: Request, res: Response) => {
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

app.post('/api/annotations/:annotationId/status', async (req: Request, res: Response) => {
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
