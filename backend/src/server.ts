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

app.get('/api/sets', (_req: Request, res: Response) => {
    // TODO: implement pagination, filtering, etc.
    res.json({ sets: getSets() });
});

app.get('/api/sets/:setid', (req: Request, res: Response) => {
    const set = getSetById(req.params.setid);
    if (!set) return res.status(404).json({ error: 'not found' });
    res.json({ set });
});

app.get('/api/sets/:setid/annotations', (req: Request, res: Response) => {
    // TODO: implement pagination, filtering, etc.
    // TODO: only show visible annotations unless admin
    const { setid } = req.params;
    const userId = getCurrentUser(req);
    if (userId) {
        return res.json({ annotations: getUserAnnotationsForSet(userId, setid) });
    }
    return res.json({ annotations: getAnnotationsForSet(setid) });
});

app.get('/api/sets/:setid/visible', (req: Request, res: Response) => {
    // TODO: remove
    const { setid } = req.params;
    const userId = getCurrentUser(req);
    const anns = getVisibleAnnotationsForUserInSet(userId || '', setid);
    res.json({ annotations: anns });
});

app.post('/api/annotations', (req: Request, res: Response) => {
    // TODO: since annotations belong to sets, consider making endpoint /api/sets/:setid/annotations:
    //   see https://google.aip.dev/122.
    const ann = req.body as Annotation | undefined;
    if (!ann) return res.status(400).json({ error: 'missing body' });
    const result = saveAnnotation(ann as any);
    return res.status(ann.id ? 200 : 201).json({ annotation: result });
});

app.delete('/api/annotations/:annotationId', (req: Request, res: Response) => {
    const ok = deleteAnnotation(req.params.annotationId);
    if (!ok) return res.status(404).json({ error: 'not found' });
    return res.status(204).end();
});

app.post('/api/sets/:setid/request-review', (req: Request, res: Response) => {
    const { setid } = req.params;
    const userId = getCurrentUser(req);
    if (!userId) return res.status(400).json({ error: 'missing userId' });
    const changed = requestReviewForUserInSet(userId, setid);
    res.json({ changed });
});

app.post('/api/annotations/:annotationId/visibility', (req: Request, res: Response) => {
    // TODO: replace with PATCH on main /api/annotations/:annotationId endpoint
    const { annotationId } = req.params;
    const { visibility } = req.body as { visibility?: AnnotationVisibility };
    const updated = setAnnotationVisibility(annotationId, visibility as any);
    if (!updated) return res.status(404).json({ error: 'not found' });
    res.json({ annotation: updated });
});

app.post('/api/annotations/:annotationId/status', (req: Request, res: Response) => {
    // TODO: replace with PATCH on main /api/annotations/:annotationId endpoint
    const { annotationId } = req.params;
    const { status } = req.body as { status?: AnnotationStatus };
    const updated = setAnnotationStatus(annotationId, status as any);
    if (!updated) return res.status(404).json({ error: 'not found' });
    res.json({ annotation: updated });
});

export function start(port = Number(process.env.PORT) || 4000) {
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
