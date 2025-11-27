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
import type { Annotation, AnnotationStatus, AnnotationVisibility } from '../data.js';

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/sets', (_req: Request, res: Response) => {
    res.json({ sets: getSets() });
});

app.get('/api/sets/:setid', (req: Request, res: Response) => {
    const set = getSetById(req.params.setid);
    if (!set) return res.status(404).json({ error: 'not found' });
    res.json({ set });
});

app.get('/api/sets/:setid/annotations', (req: Request, res: Response) => {
    const { setid } = req.params;
    const userId = req.query.userId as string | undefined;
    if (userId) {
        return res.json({ annotations: getUserAnnotationsForSet(userId, setid) });
    }
    return res.json({ annotations: getAnnotationsForSet(setid) });
});

app.get('/api/sets/:setid/visible', (req: Request, res: Response) => {
    const { setid } = req.params;
    const userId = req.query.userId as string | undefined;
    const anns = getVisibleAnnotationsForUserInSet(userId || '', setid);
    res.json({ annotations: anns });
});

app.post('/api/annotations', (req: Request, res: Response) => {
    const ann = req.body;
    if (!ann) return res.status(400).json({ error: 'missing body' });
    const result = saveAnnotation(ann);
    return res.status(ann.id ? 200 : 201).json({ annotation: result });
});

app.delete('/api/annotations/:id', (req: Request, res: Response) => {
    const ok = deleteAnnotation(req.params.id);
    if (!ok) return res.status(404).json({ error: 'not found' });
    return res.status(204).end();
});

app.post('/api/sets/:setid/request-review', (req: Request, res: Response) => {
    const { setid } = req.params;
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(400).json({ error: 'missing userId' });
    const changed = requestReviewForUserInSet(userId, setid);
    res.json({ changed });
});

app.post('/api/annotations/:id/visibility', (req: Request, res: Response) => {
    const { id } = req.params;
    const { visibility } = req.body as { visibility?: AnnotationVisibility };
    const updated = setAnnotationVisibility(id, visibility);
    if (!updated) return res.status(404).json({ error: 'not found' });
    res.json({ annotation: updated });
});

app.post('/api/annotations/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body as { status?: AnnotationStatus };
    const updated = setAnnotationStatus(id, status);
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

// If this file is executed directly, start the server.
// import.meta.main is set when the module is entrypoint in Node ESM
// @ts-ignore - import.meta.main may not be in TS lib typings
if ((import.meta as any).main) {
    start();
}
