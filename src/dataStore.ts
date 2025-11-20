import type { WODBSet, Annotation, AnnotationStatus, AnnotationVisibility } from './data';
import { wodbSets, annotations } from './data';

export function getSets(): WODBSet[] {
    return wodbSets;
}

export function getSetById(id: string): WODBSet | undefined {
    return wodbSets.find((s) => s.id === id);
}

export function getAnnotationsForSet(setId: string): Annotation[] {
    return annotations.filter((a) => a.setId === setId);
}

export function getUserAnnotationsForSet(userId: string, setId: string): Annotation[] {
    return annotations.filter((a) => a.setId === setId && a.userId === userId);
}

export function getUserAnnotationForObject(userId: string, setId: string, objectId: string): Annotation | undefined {
    return annotations.find((a) => a.userId === userId && a.setId === setId && a.objectId === objectId);
}

export function saveAnnotation(a: Omit<Annotation, 'id'> & { id?: string }): Annotation {
    if (a.id) {
        const idx = annotations.findIndex((x) => x.id === a.id);
        if (idx !== -1) {
            annotations[idx] = { ...annotations[idx], ...a } as Annotation;
            return annotations[idx];
        }
    }
    const id = `ann_${Math.random().toString(36).slice(2, 9)}`;
    const newA: Annotation = { id, ...a } as Annotation;
    annotations.push(newA);
    return newA;
}

export function deleteAnnotation(annotationId: string): boolean {
    const idx = annotations.findIndex((x) => x.id === annotationId);
    if (idx === -1) return false;
    annotations.splice(idx, 1);
    return true;
}

export function requestReviewForUserInSet(userId: string, setId: string): Annotation[] {
    // mark all user's draft annotations in the set as pending
    const changed: Annotation[] = [];
    for (let a of annotations) {
        if (a.userId === userId && a.setId === setId && a.status === 'draft') {
            a.status = 'pending';
            changed.push(a);
        }
    }
    return changed;
}

export function setAnnotationStatus(annotationId: string, status: AnnotationStatus): Annotation | undefined {
    const a = annotations.find((x) => x.id === annotationId);
    if (!a) return undefined;
    a.status = status;
    return a;
}

export function setAnnotationVisibility(annotationId: string, visibility: AnnotationVisibility): Annotation | undefined {
    const a = annotations.find((x) => x.id === annotationId);
    if (!a) return undefined;
    a.visibility = visibility;
    return a;
}
