import type { WODBSet, Annotation, AnnotationVisibility } from './data';
import * as ds from './dataStore';

const SIM_DELAY = 150;

function delay(ms = SIM_DELAY) {
    return new Promise((res) => setTimeout(res, ms));
}

// Auth token param is included so signatures match future backend APIs.
export async function fetchSets(token?: string): Promise<WODBSet[]> {
    await delay();
    return ds.getSets();
}

export async function fetchSetById(id: string, token?: string): Promise<WODBSet | undefined> {
    await delay();
    return ds.getSetById(id);
}

export async function fetchUserAnnotationsForSet(userId: string, setId: string, token?: string): Promise<Annotation[]> {
    await delay();
    return ds.getUserAnnotationsForSet(userId, setId);
}

export async function createOrUpdateAnnotation(a: Omit<Annotation, 'id'> & { id?: string }, token?: string): Promise<Annotation> {
    await delay();
    return ds.saveAnnotation(a);
}

export async function removeAnnotation(annotationId: string, token?: string): Promise<boolean> {
    await delay();
    return ds.deleteAnnotation(annotationId);
}

export async function sendRequestReview(userId: string, setId: string, token?: string): Promise<Annotation[]> {
    await delay();
    return ds.requestReviewForUserInSet(userId, setId);
}

export async function fetchVisibleAnnotationsForUserInSet(userId: string, setId: string, token?: string): Promise<Annotation[]> {
    await delay();
    return ds.getVisibleAnnotationsForUserInSet(userId, setId);
}

export async function fetchAnnotationsForSet(setId: string, token?: string): Promise<Annotation[]> {
    await delay();
    return ds.getAnnotationsForSet(setId);
}

export async function updateAnnotationVisibility(annotationId: string, visibility: AnnotationVisibility, token?: string) {
    await delay();
    return ds.setAnnotationVisibility(annotationId, visibility);
}

export async function updateAnnotationStatus(annotationId: string, status: string, token?: string) {
    await delay();
    return ds.setAnnotationStatus(annotationId, status as any);
}

export default {
    fetchSets,
    fetchSetById,
    fetchUserAnnotationsForSet,
    createOrUpdateAnnotation,
    removeAnnotation,
    sendRequestReview,
    fetchVisibleAnnotationsForUserInSet,
    updateAnnotationVisibility,
    updateAnnotationStatus,
};
